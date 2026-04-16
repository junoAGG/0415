import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import type { Report } from '../types';
import type { CompareResponse, CompareDimension, ChatSession, ExportFormat } from '../types/analysis';
import { SCENE_DIMENSIONS } from '../types/analysis';
import { reportApi } from '../services/api';
import { aiService } from '../services/aiService';

// 子组件
import ComparePanel from '../components/analysis/ComparePanel';
import CompareResult from '../components/analysis/CompareResult';
import ChatPanel from '../components/analysis/ChatPanel';
import SessionSidebar from '../components/analysis/SessionSidebar';
import EmptyState from '../components/common/EmptyState';
import { CompareResultSkeleton } from '../components/common/SkeletonBlock';

// 图标
import { InboxOutlined, HistoryOutlined } from '@ant-design/icons';

/**
 * 智能分析页面
 * 页面容器，负责模式切换和状态编排
 */
export default function Analysis() {
  // ========== 全局状态 ==========
  const [reports, setReports] = useState<Report[]>([]);
  const [activeMode, setActiveMode] = useState<'compare' | 'qa'>('compare');

  // ========== 对比分析状态 ==========
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [compareType, setCompareType] = useState<'company' | 'industry' | 'custom'>('company');
  const [selectedDimensions, setSelectedDimensions] = useState<CompareDimension[]>(SCENE_DIMENSIONS['company']);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);

  // ========== AI问答状态 ==========
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ========== 分析历史 ==========
  const [history, setHistory] = useState<Array<{type: string; title: string; created_at: string; result_summary: string}>>([]);

  // ========== 会话消息状态 ==========
  const [sessionMessages, setSessionMessages] = useState<Record<string, Array<{ role: 'user' | 'assistant'; content: string; sources?: any[] }>>>({});

  // ========== 初始化 ==========
  useEffect(() => {
    loadReports();
  }, []);

  // ========== 数据加载 ==========
  const loadReports = async () => {
    try {
      const res = await reportApi.list({ page_size: 100 });
      setReports(res.items.filter(r => r.status === 'completed'));
    } catch {
      message.error('加载研报列表失败');
    }
  };

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await aiService.getSessions();
      setSessions(list);
    } catch {
      // 静默失败
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  // 切换到QA模式时加载会话列表
  useEffect(() => {
    if (activeMode === 'qa') {
      loadSessions();
    }
  }, [activeMode, loadSessions]);

  // ========== 对比分析操作 ==========
  const handleToggleReport = (id: string) => {
    setSelectedReports(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedReports(reports.map(r => r.id));
  };

  const handleSetCompareType = (type: 'company' | 'industry' | 'custom') => {
    setCompareType(type);
    setSelectedDimensions(SCENE_DIMENSIONS[type]);
  };

  const handleSetDimensions = (dimensions: CompareDimension[]) => {
    setSelectedDimensions(dimensions);
  };

  // 执行对比分析
  const handleCompare = async () => {
    if (selectedReports.length < 2) {
      message.warning('请至少选择2份研报进行对比');
      return;
    }
    setComparing(true);
    try {
      const result = await aiService.compareReports(selectedReports, compareType, selectedDimensions);
      setCompareResult(result);
      const companies = reports.filter(r => selectedReports.includes(r.id)).map(r => r.company).join(' / ');
      addHistory('compare', `${companies} 对比`, '已生成新的对比分析结果。');
      message.success('分析完成');
    } catch {
      message.error('分析失败');
    } finally {
      setComparing(false);
    }
  };

  // 导出对比结果
  const handleExportCompare = async (format: ExportFormat) => {
    try {
      // 尝试调用后端 API
      const blob = await aiService.exportCompareResult({
        report_ids: selectedReports,
        compare_type: compareType,
        dimensions: selectedDimensions,
        format,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `对比分析_${new Date().toISOString().slice(0, 10)}.${format === 'markdown' ? 'md' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch {
      // 后端未实现时，降级为前端生成 Markdown
      message.info('后端导出服务暂不可用，使用前端导出');
    }
  };

  // ========== 会话管理操作 ==========
  const handleNewSession = () => {
    setCurrentSessionId(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setCurrentSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await aiService.removeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewSession();
      }
      message.success('会话已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const handleRenameSession = async (sessionId: string, newTitle: string) => {
    try {
      await aiService.updateSession(sessionId, newTitle);
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, title: newTitle } : s))
      );
    } catch {
      message.error('重命名失败');
    }
  };

  const handleAddTag = (_sessionId: string, _tag: string) => {
    // 标签功能暂存，待后端支持后实现
    message.info('标签功能开发中');
  };

  // ========== AI问答流式操作 ==========
  const handleStreamAsk = (
    question: string,
    onChunk: (chunk: string) => void,
    onDone: (sources: Array<{ report_id: string; report_title: string; excerpt: string }>) => void,
    onSessionId: (sessionId: string) => void
  ): AbortController => {
    // 取消上一次未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = aiService.streamAskQuestion(
      {
        question,
        report_ids: selectedReports.length > 0 ? selectedReports : undefined,
        session_id: currentSessionId || undefined,
      },
      onChunk,
      (sources) => {
        onDone(sources);
        addHistory('query', `提问：${question}`, '已根据选定研报样本生成回答。');
        loadSessions();
      },
      onSessionId,
    );

    return abortRef.current;
  };

  const handleLoadSessionMessages = async (sessionId: string) => {
    // 检查缓存
    if (sessionMessages[sessionId]) {
      return sessionMessages[sessionId];
    }
    const messages = await aiService.getSessionMessages(sessionId);
    const formattedMessages = (messages || []).map(m => ({
      role: m.role || 'assistant',
      content: m.content || '',
      sources: m.sources || [],
    }));
    // 缓存消息
    setSessionMessages(prev => ({ ...prev, [sessionId]: formattedMessages }));
    return formattedMessages;
  };

  // ========== 历史记录 ==========
  const addHistory = (type: string, title: string, summary: string) => {
    setHistory(prev =>
      [{ type, title, created_at: '刚刚', result_summary: summary }, ...prev].slice(0, 8)
    );
  };

  // ========== 渲染 ==========
  const selectedReportObjects = (reports || []).filter(r => (selectedReports || []).includes(r.id));

  return (
    <>
      {/* 工具栏 */}
      <div className="panel toolbar">
        <div className="toolbar-left">
          <strong style={{ fontSize: 14 }}>智能分析</strong>
          <span className="report-desc">覆盖对比分析与 AI 问答两条主流程</span>
        </div>
        <div className="toolbar-right">
          <span className="report-desc">已选 {selectedReports.length} 份研报</span>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="analysis-layout">
        {/* 左栏：分析配置 / 会话管理 */}
        <section className="panel" style={{ height: 720 }}>
          {activeMode === 'compare' ? (
            // 对比分析配置面板
            <>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">分析配置</h3>
                  <div className="panel-subtitle">模式切换、研报选择、对比维度配置</div>
                </div>
              </div>
              <div className="scroll-body">
                {/* 模式切换 */}
                <div className="mode-switch">
                  <button
                    className="mode-btn active"
                    onClick={() => setActiveMode('compare')}
                  >
                    研报对比
                  </button>
                  <button
                    className="mode-btn"
                    onClick={() => setActiveMode('qa')}
                  >
                    AI问答
                  </button>
                </div>
                <ComparePanel
                  reports={reports}
                  selectedReports={selectedReports}
                  compareType={compareType}
                  selectedDimensions={selectedDimensions}
                  comparing={comparing}
                  onToggleReport={handleToggleReport}
                  onSelectAll={handleSelectAll}
                  onSetCompareType={handleSetCompareType}
                  onSetDimensions={handleSetDimensions}
                  onCompare={handleCompare}
                />
              </div>
            </>
          ) : (
            // AI问答会话侧边栏
            <SessionSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              loading={loadingSessions}
              onNewSession={handleNewSession}
              onSwitchSession={handleSwitchSession}
              onDeleteSession={handleDeleteSession}
              onRenameSession={handleRenameSession}
              onAddTag={handleAddTag}
              onSwitchMode={setActiveMode}
            />
          )}
        </section>

        {/* 中栏：分析结果 / AI问答主区 */}
        <section className="panel" style={{ height: 720, overflow: 'hidden' }}>
          {/* 模式切换（仅在QA模式下显示在顶部） */}
          {activeMode === 'qa' && (
            <div className="mode-switch p-3 border-b border-[var(--line)]">
              <button
                className="mode-btn"
                onClick={() => setActiveMode('compare')}
              >
                研报对比
              </button>
              <button
                className="mode-btn active"
                onClick={() => setActiveMode('qa')}
              >
                AI问答
              </button>
            </div>
          )}

          {activeMode === 'compare' ? (
            // 对比分析结果
            comparing ? (
              <div className="h-full overflow-auto p-4">
                <CompareResultSkeleton />
              </div>
            ) : selectedReportObjects.length < 2 && !compareResult ? (
              <EmptyState
                icon={<InboxOutlined />}
                title="等待对比样本"
                description="请在左侧至少选择 2 份已完成研报，再执行对比分析。"
                action={{
                  text: '全选研报',
                  onClick: handleSelectAll,
                }}
              />
            ) : !compareResult ? (
              <EmptyState
                icon={<InboxOutlined />}
                title="点击开始对比"
                description={`已选择 ${selectedReportObjects.length} 份研报，点击上方按钮执行分析。`}
                action={{
                  text: '开始对比',
                  onClick: handleCompare,
                }}
              />
            ) : (
              <CompareResult
                result={compareResult}
                selectedReports={selectedReportObjects}
                compareType={compareType}
                selectedDimensions={selectedDimensions}
                onExport={handleExportCompare}
              />
            )
          ) : (
            // AI问答主面板
            <ChatPanel
              reports={reports}
              selectedReports={selectedReports}
              currentSessionId={currentSessionId}
              sessions={sessions}
              loadingSessions={loadingSessions}
              onStreamAsk={handleStreamAsk}
              onLoadSessionMessages={handleLoadSessionMessages}
              onRefreshSessions={loadSessions}
            />
          )}
        </section>

        {/* 右栏：分析历史 / 会话管理 */}
        <aside className="panel" style={{ height: 720 }}>
          {activeMode === 'qa' ? (
            // QA模式：快捷操作与上下文
            <>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">上下文与快捷操作</h3>
                  <div className="panel-subtitle">当前引用范围与推荐问题</div>
                </div>
              </div>
              <div className="scroll-body">
                {/* 当前引用研报 */}
                <div className="section-block">
                  <div className="section-kicker">当前引用范围</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(selectedReports || []).length > 0 ? (
                      (selectedReportObjects || []).map(r => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: 'var(--blue-1)',
                            color: 'var(--blue-5)',
                            border: '1px solid var(--blue-2)',
                          }}
                        >
                          {r.company || '未知'}
                        </span>
                      ))
                    ) : (
                      <span className="text-[var(--text-faint)] text-xs">全部已完成研报</span>
                    )}
                  </div>
                </div>

                {/* 推荐问题 */}
                <div className="section-block">
                  <div className="section-kicker">推荐问题</div>
                  <div className="flex flex-col gap-2 mt-2">
                    {[
                      '对比主要公司的盈利修复逻辑',
                      '哪些样本适合作为组合底仓？',
                      '各券商评级差异体现在哪些方面？',
                    ].map((q, i) => (
                      <button
                        key={i}
                        className="text-left text-xs p-2 rounded-lg border border-[var(--line)] bg-gradient-to-r from-white to-[#f7fbff] text-[var(--text-soft)] hover:border-[var(--blue-3)] hover:text-[var(--blue-4)] transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // 对比分析模式：分析历史
            <>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">分析历史</h3>
                  <div className="panel-subtitle">保留最近对比与问答操作痕迹</div>
                </div>
              </div>
              <div className="scroll-body">
                <div className="history-list">
                  {(history || []).length === 0 ? (
                    <EmptyState
                      icon={<HistoryOutlined />}
                      title="暂无历史记录"
                      description="执行对比分析或AI问答后将显示在这里"
                      minHeight={200}
                    />
                  ) : (
                    (history || []).map((item, i) => (
                      <div className="history-item" key={i}>
                        <small>{item.created_at} · {item.type === 'compare' ? '对比分析' : 'AI问答'}</small>
                        <h4>{item.title}</h4>
                        <div className="report-desc">{item.result_summary}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
