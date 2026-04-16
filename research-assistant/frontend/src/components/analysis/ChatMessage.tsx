/**
 * 单条消息组件
 * 用户消息/AI消息/错误消息/来源引用展示
 */
import React from 'react';
import { Button, Tooltip } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  RedoOutlined,
  FileTextOutlined,
  RobotOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
export interface ChatMessageData {
  type: 'user' | 'ai' | 'error';
  content: string;
  sources?: Array<{
    report_id: string;
    report_title: string;
    excerpt: string;
  }>;
  isStreaming?: boolean;
  isStopped?: boolean;
  errorCode?: string;
}

interface ChatMessageProps {
  /** 消息数据 */
  message: ChatMessageData;
  /** 是否是最新一条消息 */
  isLatest?: boolean;
  /** 重试回调 */
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message: messageData,
  isLatest = false,
  onRetry,
}) => {
  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(messageData.content).then(() => {
      // 使用 antd 的 message 组件
      import('antd').then(({ message }) => {
        message.success('已复制到剪贴板');
      });
    });
  };

  // 导出为 Markdown
  const handleExport = () => {
    const content = `# AI 回答\n\n${messageData.content}\n\n${messageData.sources ? '## 来源引用\n\n' + messageData.sources.map(s => `- ${s.report_title}\n  > ${s.excerpt}`).join('\n\n') : ''}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI回答_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    import('antd').then(({ message }) => {
      message.success('导出成功');
    });
  };

  // 用户消息
  if (messageData.type === 'user') {
    return (
      <div className="chat-item user">
        <div className="meta-label flex items-center gap-1">
          <UserOutlined />
          我的问题
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">{messageData.content}</div>
      </div>
    );
  }

  // 错误消息
  if (messageData.type === 'error') {
    return (
      <div
        className="chat-item"
        style={{
          background: 'linear-gradient(180deg, #fff1f2, #fff5f5)',
          borderColor: 'var(--red)',
          maxWidth: '88%',
        }}
      >
        <div className="meta-label flex items-center gap-1 text-[var(--red)]">
          <WarningOutlined />
          错误
        </div>
        <div className="whitespace-pre-wrap leading-relaxed text-[var(--red)]">
          {messageData.content}
        </div>
        {messageData.errorCode && (
          <div className="text-[11px] text-[var(--text-faint)] mt-2">
            错误码: {messageData.errorCode}
          </div>
        )}
        {isLatest && onRetry && (
          <div className="mt-3">
            <Button
              type="primary"
              size="small"
              icon={<RedoOutlined />}
              onClick={onRetry}
              danger
              style={{ borderRadius: '8px' }}
            >
              重试
            </Button>
          </div>
        )}
      </div>
    );
  }

  // AI 消息
  return (
    <div className="chat-item" style={{ maxWidth: '88%' }}>
      <div className="meta-label flex items-center gap-1">
        <RobotOutlined />
        AI助手
        {messageData.isStreaming && (
          <span className="ml-2 text-[11px] text-[var(--blue-4)]">生成中...</span>
        )}
        {messageData.isStopped && (
          <span className="ml-2 text-[11px] text-[var(--orange)]">已停止</span>
        )}
      </div>
      
      <div className="whitespace-pre-wrap leading-relaxed">
        {messageData.content}
        {messageData.isStreaming && (
          <span
            className="typing-cursor"
            style={{
              display: 'inline-block',
              width: '2px',
              height: '14px',
              background: 'var(--blue-4)',
              marginLeft: '2px',
              verticalAlign: 'text-bottom',
              animation: 'blink 1s step-end infinite',
            }}
          />
        )}
      </div>

      {/* 来源引用 */}
      {messageData.sources && messageData.sources.length > 0 && (
        <div className="source-list mt-3" style={{ marginTop: '12px' }}>
          <div className="text-[11px] text-[var(--text-faint)] mb-2 flex items-center gap-1">
            <FileTextOutlined />
            来源引用 ({(messageData.sources || []).length})
          </div>
          {(messageData.sources || []).map((s, j) => (
            <div
              className="source-item"
              key={j}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--line)',
                borderLeft: '3px solid var(--gold-2)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,251,255,0.96))',
                marginBottom: '8px',
              }}
            >
              <h4 className="text-xs font-bold mb-1">{s.report_title || '未知研报'}</h4>
              <div className="report-desc text-[11px]">{s.excerpt || '-'}</div>
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮区 */}
      {!messageData.isStreaming && messageData.content && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--line)]">
          <Tooltip title="复制内容">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              className="text-[var(--text-faint)] hover:text-[var(--blue-4)]"
            />
          </Tooltip>
          <Tooltip title="导出为 Markdown">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExport}
              className="text-[var(--text-faint)] hover:text-[var(--blue-4)]"
            />
          </Tooltip>
          {(messageData.isStopped || isLatest) && onRetry && (
            <Tooltip title="重新生成">
              <Button
                type="text"
                size="small"
                icon={<RedoOutlined />}
                onClick={onRetry}
                className="text-[var(--text-faint)] hover:text-[var(--blue-4)]"
              >
                重试
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
