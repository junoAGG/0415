/**
 * AI问答主面板
 * 对话流 + 输入区
 */
import React, { useState, useRef, useEffect } from 'react';
import { Button, Spin, message } from 'antd';
import type { Report } from '../../types';
import type { ChatSession } from '../../types/analysis';
import ChatMessage, { type ChatMessageData } from './ChatMessage';
import EmptyState from '../common/EmptyState';
import {
  SendOutlined,
  StopOutlined,
  RobotOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

interface ChatPanelProps {
  /** 可用研报列表 */
  reports: Report[];
  /** 已选研报ID */
  selectedReports: string[];
  /** 当前会话ID */
  currentSessionId: string | null;
  /** 会话列表 */
  sessions: ChatSession[];
  /** 是否正在加载会话 */
  loadingSessions?: boolean;
  /** 流式问答函数 */
  onStreamAsk: (
    question: string,
    onChunk: (chunk: string) => void,
    onDone: (sources: Array<{ report_id: string; report_title: string; excerpt: string }>) => void,
    onSessionId: (sessionId: string) => void
  ) => AbortController;
  /** 加载会话消息 */
  onLoadSessionMessages: (sessionId: string) => Promise<Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>;
  /** 刷新会话列表 */
  onRefreshSessions: () => void;
}

// 推荐问题
const RECOMMENDED_QUESTIONS = [
  '对比宁德时代和比亚迪的盈利修复逻辑',
  '当前哪些样本更适合作为组合底仓？',
  '这些研报中对明年业绩的一致预期是什么？',
  '各券商对这家公司的评级差异主要体现在哪些方面？',
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  reports,
  selectedReports,
  currentSessionId,
  sessions,
  loadingSessions: _loadingSessions,
  onStreamAsk,
  onLoadSessionMessages,
  onRefreshSessions,
}) => {
  // 输入框内容
  const [question, setQuestion] = useState('');
  // 聊天记录
  const [chatHistory, setChatHistory] = useState<ChatMessageData[]>([
    {
      type: 'ai',
      content: '你可以直接提问，例如：\'对比宁德时代和比亚迪的盈利修复逻辑\'，或 \'当前哪些样本更适合作为组合底仓？\'',
    },
  ]);
  // 是否正在生成
  const [isGenerating, setIsGenerating] = useState(false);
  // 是否已停止 - 使用 ref 避免不必要的重渲染
  const isStoppedRef = useRef(false);
  // 当前问题（用于重试）
  const [currentQuestion, setCurrentQuestion] = useState('');
  // AbortController
  const abortRef = useRef<AbortController | null>(null);
  // 聊天流容器 ref
  const chatStreamRef = useRef<HTMLDivElement>(null);

  // 上下文研报
  const safeReports = reports || [];
  const contextReports = selectedReports.length > 0
    ? safeReports.filter(r => selectedReports.includes(r.id))
    : safeReports;

  // 滚动到底部
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // 加载会话消息
  useEffect(() => {
    if (currentSessionId) {
      onLoadSessionMessages(currentSessionId).then(messages => {
        const safeMessages = messages || [];
        const history: ChatMessageData[] = safeMessages.map(m => ({
          type: m.role === 'user' ? 'user' : 'ai',
          content: m.content || '',
          sources: m.sources || [],
        }));
        setChatHistory(history);
      }).catch(() => {
        message.error('加载会话失败');
      });
    } else {
      // 新建会话，显示欢迎消息
      setChatHistory([
        {
          type: 'ai',
          content: '你可以直接提问，例如：\'对比宁德时代和比亚迪的盈利修复逻辑\'，或 \'当前哪些样本更适合作为组合底仓？\'',
        },
      ]);
    }
  }, [currentSessionId, onLoadSessionMessages]);

  // 停止生成
  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsGenerating(false);
      isStoppedRef.current = true;
      // 更新最后一条消息为已停止状态
      setChatHistory(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.type === 'ai') {
          updated[updated.length - 1] = { ...last, isStopped: true };
        }
        return updated;
      });
    }
  };

  // 发送问题
  const handleSend = () => {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion('');
    setCurrentQuestion(q);
    isStoppedRef.current = false;

    // 添加用户消息
    setChatHistory(prev => [...prev, { type: 'user', content: q }]);
    // 添加空的 AI 消息占位
    setChatHistory(prev => [...prev, { type: 'ai', content: '', isStreaming: true }]);
    setIsGenerating(true);

    // 取消上一次请求
    if (abortRef.current) {
      abortRef.current.abort();
    }

    // 发起流式请求
    abortRef.current = onStreamAsk(
      q,
      // onChunk
      (chunk: string) => {
        setChatHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'ai') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
      },
      // onDone
      (sources) => {
        setChatHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'ai') {
            updated[updated.length - 1] = {
              ...last,
              sources,
              isStreaming: false,
            };
          }
          return updated;
        });
        setIsGenerating(false);
        abortRef.current = null;
        onRefreshSessions();
      },
      // onSessionId - 使用 _ 表示未使用参数
      (_sessionId: string) => {
        // sessionId 由父组件处理
      }
    );
  };

  // 重试
  const handleRetry = () => {
    if (currentQuestion) {
      setQuestion(currentQuestion);
      // 移除最后一条 AI 消息（如果是错误/停止状态）
      setChatHistory(prev => {
        const last = prev[prev.length - 1];
        if (last && (last.type === 'ai' || last.type === 'error')) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      // 重新发送
      setTimeout(() => {
        handleSend();
      }, 0);
    }
  };

  // 处理推荐问题点击
  const handleRecommendedClick = (q: string) => {
    setQuestion(q);
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isGenerating) {
        handleSend();
      }
    }
  };

  // 是否有会话
  const hasSessions = (sessions || []).length > 0;

  return (
    <div className="detail-wrap">
      {/* 顶部 Hero */}
      <div className="detail-hero">
        <div className="section-kicker">AI Query</div>
        <h2 className="detail-title">研报问答工作台</h2>
        <div className="report-desc">
          当前知识范围：{(contextReports || []).map(r => r.company || '未知').join(' / ') || '全部已完成研报'}
        </div>
      </div>

      {/* 对话流 */}
      <div className="chat-stream" ref={chatStreamRef}>
        {chatHistory.length === 0 && !hasSessions ? (
          <EmptyState
            icon={<RobotOutlined />}
            title="开启第一轮研究问答"
            description="发送问题后将自动创建会话"
            footer={
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {RECOMMENDED_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecommendedClick(q)}
                    className="px-3 py-1.5 rounded-full text-xs border border-[var(--line)] bg-gradient-to-r from-white to-[#f7fbff] text-[var(--text-soft)] hover:border-[var(--blue-3)] hover:text-[var(--blue-4)] transition-colors"
                  >
                    {q.length > 20 ? q.slice(0, 20) + '...' : q}
                  </button>
                ))}
              </div>
            }
            minHeight={300}
          />
        ) : (
          <>
            {chatHistory.map((item, i) => (
              <ChatMessage
                key={i}
                message={item}
                isLatest={i === (chatHistory || []).length - 1}
                onRetry={handleRetry}
              />
            ))}
            {isGenerating && (chatHistory || [])[(chatHistory || []).length - 1]?.type !== 'ai' && (
              <div className="chat-item" style={{ opacity: 0.7, maxWidth: '88%' }}>
                <div className="meta-label flex items-center gap-1">
                  <RobotOutlined />
                  AI助手
                </div>
                <div className="flex items-center gap-2">
                  <Spin size="small" />
                  <span className="text-[13px] text-[var(--text-soft)]">正在思考...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 输入区 */}
      <div className="chat-input">
        {/* 推荐问题 */}
        {!isGenerating && (
          <div className="flex flex-wrap gap-2 mb-3">
            {RECOMMENDED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleRecommendedClick(q)}
                className="px-2.5 py-1 rounded-lg text-[11px] border border-[var(--line)] bg-gradient-to-r from-white to-[#f7fbff] text-[var(--text-soft)] hover:border-[var(--blue-3)] hover:text-[var(--blue-4)] transition-colors"
              >
                <QuestionCircleOutlined className="mr-1" />
                {q.length > 15 ? q.slice(0, 15) + '...' : q}
              </button>
            ))}
          </div>
        )}

        <div className="chat-input-row">
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入问题，例如：当前哪些样本更适合作为组合底仓？"
            disabled={isGenerating}
            style={{
              flex: 1,
              border: '1px solid var(--line)',
              borderRadius: '10px',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              color: 'inherit',
              outline: 'none',
              resize: 'none',
              lineHeight: 1.5,
              fontSize: '13px',
              fontFamily: 'inherit',
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
          {isGenerating ? (
            <Button
              danger
              onClick={handleStop}
              icon={<StopOutlined />}
              style={{
                flexShrink: 0,
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                fontWeight: 600,
                background: '#fff1f2',
                borderColor: '#cf4b5a',
                color: '#cf4b5a',
              }}
            >
              停止生成
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSend}
              disabled={!question.trim()}
              icon={<SendOutlined />}
              style={{
                flexShrink: 0,
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                fontWeight: 600,
                background: 'linear-gradient(135deg, var(--blue-4), var(--blue-5))',
              }}
            >
              发送
            </Button>
          )}
        </div>
        <div className="chat-hint">
          Enter 发送 · Shift+Enter 换行 · 基于已选研报回答，未选则使用全部
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
