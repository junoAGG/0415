import { useState, useEffect, useRef, useCallback } from 'react';
import { message, Spin } from 'antd';
import type { Report } from '../types';
import type { CompareResponse, CompareDimension, ChatSession } from '../types/analysis';
import { SCENE_DIMENSIONS, DIMENSION_LIST } from '../types/analysis';
import { reportApi } from '../services/api';
import { aiService } from '../services/aiService';

export default function Analysis() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeMode, setActiveMode] = useState<'compare' | 'qa'>('compare');
  
  // 对比分析状态
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [compareType, setCompareType] = useState<'company' | 'industry' | 'custom'>('company');
  const [selectedDimensions, setSelectedDimensions] = useState<CompareDimension[]>(SCENE_DIMENSIONS['company']);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  
  // AI问答状态
  const [question, setQuestion] = useState('');
  const defaultWelcome = { type: 'ai' as const, content: '你可以直接提问，例如：\'对比宁德时代和比亚迪的盈利修复逻辑\'\uff0c或 \'当前哪些样本更适合作为组合底仓？\'', sources: [] };
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', content: string, sources?: any[]}>>([
    defaultWelcome
  ]);
  const [asking, setAsking] = useState(false);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  // 会话管理状态
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 分析历史
  const [history, setHistory] = useState<Array<{type: string, title: string, created_at: string, result_summary: string}>>([]);

  useEffect(() => { loadReports(); }, []);

  // 加载会话列表
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await aiService.getSessions();
      setSessions(list);
    } catch { /* ignore */ }
    finally { setLoadingSessions(false); }
  }, []);

  // 切换到QA模式时加载会话列表
  useEffect(() => {
    if (activeMode === 'qa') { loadSessions(); }
  }, [activeMode, loadSessions]);

  // 新建会话
  const handleNewSession = () => {
    setCurrentSessionId(null);
    setChatHistory([defaultWelcome]);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setAsking(false);
  };

  // 切换会话
  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setAsking(false);
    setCurrentSessionId(sessionId);
    try {
      const messages = await aiService.getSessionMessages(sessionId);
      const history = messages.map(m => ({
        type: (m.role === 'user' ? 'user' : 'ai') as 'user' | 'ai',
        content: m.content,
        sources: m.sources,
      }));
      setChatHistory(history.length > 0 ? history : [defaultWelcome]);
    } catch {
      message.error('加载会话失败');
    }
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.removeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewSession();
      }
      message.success('会话已删除');
    } catch { message.error('删除失败'); }
  };

  const loadReports = async () => {
    try {
      const res = await reportApi.list({ page_size: 100 });
      setReports(res.items.filter(r => r.status === 'completed'));
    } catch { message.error('加载研报列表失败'); }
  };

  const toggleReportSelection = (id: string) => {
    setSelectedReports(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedReports(reports.map(r => r.id));
  };

  const addHistory = (type: string, title: string, summary: string) => {
    setHistory(prev => [{ type, title, created_at: '刚刚', result_summary: summary }, ...prev].slice(0, 8));
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
    } catch { message.error('分析失败'); }
    finally { setComparing(false); }
  };

  // 执行AI问答（流式）
  const handleAsk = () => {
    if (!question.trim()) return;
    const q = question.trim();
    setChatHistory(prev => [...prev, { type: 'user', content: q }]);
    setQuestion('');
    setAsking(true);

    // 先插入一条空的 AI 消息作为占位，后续流式追加内容
    setChatHistory(prev => [...prev, { type: 'ai', content: '' }]);

    // 取消上一次未完成的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = aiService.streamAskQuestion(
      {
        question: q,
        report_ids: selectedReports.length > 0 ? selectedReports : undefined,
        session_id: currentSessionId || undefined,
      },
      // onChunk: 逐步追加内容到最后一条 AI 消息
      (chunk: string) => {
        setChatHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'ai') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      },
      // onDone: 流结束，补充 sources
      (sources) => {
        setChatHistory(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.type === 'ai') {
            updated[updated.length - 1] = { ...last, sources };
          }
          return updated;
        });
        setAsking(false);
        abortRef.current = null;
        addHistory('query', `提问：${q}`, '已根据选定研报样本生成回答。');
        // 刷新会话列表
        loadSessions();
      },
      // onSessionId: 接收服务端返回的 session_id
      (sessionId: string) => {
        if (sessionId && !currentSessionId) {
          setCurrentSessionId(sessionId);
        }
      },
    );
  };

  useEffect(() => {
    if (chatStreamRef.current) chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
  }, [chatHistory]);

  // 渲染对比结果
  const renderCompareView = () => {
    const selected = reports.filter(r => selectedReports.includes(r.id));
    if (selected.length < 2 && !compareResult) {
      return (
        <div className="empty-state">
          <div>
            <h3>等待对比样本</h3>
            <p className="report-desc">请在左侧至少选择 2 份已完成研报，再执行对比分析。</p>
          </div>
        </div>
      );
    }

    if (!compareResult) {
      return (
        <div className="empty-state">
          <div>
            <h3>点击"开始对比"</h3>
            <p className="report-desc">已选择 {selected.length} 份研报，点击上方按钮执行分析。</p>
          </div>
        </div>
      );
    }

    const titles = selected.map(r => r.company).join(' / ');
    return (
      <div className="detail-wrap">
        <div className="detail-hero">
          <div className="section-kicker">Compare Result</div>
          <h2 className="detail-title">{titles} 对比分析</h2>
          <div className="report-desc">
            对比维度：{compareType === 'company' ? '公司对比' : compareType === 'industry' ? '行业对比' : '自定义对比'} · 样本 {selected.length} 份
          </div>
        </div>
        <div className="tab-panel" style={{ display: 'block', height: 'calc(100% - 130px)', overflow: 'auto' }}>
          <div className="brief-box">
            <div className="section-kicker">分析总结</div>
            <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>核心结论</h4>
            <p className="section-copy">{compareResult.comparison_result}</p>
          </div>
          <div className="compare-grid">
            <div className="compare-box">
              <h4>共同点</h4>
              <ul className="bullet-list">
                {compareResult.similarities?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
            <div className="compare-box">
              <h4>差异点</h4>
              <ul className="bullet-list">
                {compareResult.differences?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
          <div className="compare-box" style={{ marginTop: 14 }}>
            <h4>投资建议</h4>
            <ul className="bullet-list">
              {compareResult.recommendations?.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          {/* 维度分析结果 */}
          {compareResult.dimension_results && compareResult.dimension_results.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="section-kicker">维度详细分析</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                {compareResult.dimension_results.map((dr, i) => (
                  <div className="compare-box" key={i}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ background: 'var(--accent, #3b82f6)', color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: 11 }}>
                        {dr.dimension_label}
                      </span>
                    </h4>
                    {dr.summary && <p className="section-copy" style={{ margin: '6px 0 8px' }}>{dr.summary}</p>}
                    <ul className="bullet-list">
                      {dr.details?.map((d, j) => <li key={j}>{d}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="source-list">
            {selected.map(r => (
              <div className="source-item" key={r.id}>
                <h4>{r.company} · {r.rating}</h4>
                <div className="report-desc">{r.core_views?.split('\n')[0] || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染问答视图
  const renderQAView = () => {
    const contextReports = selectedReports.length > 0
      ? reports.filter(r => selectedReports.includes(r.id))
      : reports;

    return (
      <div className="detail-wrap">
        <div className="detail-hero">
          <div className="section-kicker">AI Query</div>
          <h2 className="detail-title">研报问答工作台</h2>
          <div className="report-desc">当前知识范围：{contextReports.map(r => r.company).join(' / ') || '全部已完成研报'}</div>
        </div>
        <div className="chat-stream" ref={chatStreamRef}>
          {chatHistory.map((item, i) => (
            <div key={i} className={`chat-item ${item.type}`}>
              <div className="meta-label">{item.type === 'user' ? '我的问题' : 'AI助手'}</div>
              <div style={{ lineHeight: 1.8, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {item.content || (asking && i === chatHistory.length - 1 ? '' : item.content)}
                {asking && item.type === 'ai' && i === chatHistory.length - 1 && (
                  <span className="typing-cursor" style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent, #3b82f6)', marginLeft: 2, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                )}
              </div>
              {item.sources && item.sources.length > 0 && (
                <div className="source-list" style={{ marginTop: 8 }}>
                  {item.sources.map((s: any, j: number) => (
                    <div className="source-item" key={j}>
                      <h4>{s.report_title}</h4>
                      <div className="report-desc">{s.excerpt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {asking && chatHistory[chatHistory.length - 1]?.type !== 'ai' && (
            <div className="chat-item" style={{ opacity: 0.7 }}>
              <div className="meta-label">AI助手</div>
              <Spin size="small" /> <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-soft)' }}>正在思考...</span>
            </div>
          )}
        </div>
        <div className="chat-input">
          <div className="chat-input-row">
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              rows={1}
              placeholder="输入问题，例如：当前哪些样本更适合作为组合底仓？"
            />
            <button className="btn primary" onClick={handleAsk} disabled={asking}>
              {asking ? '思考中...' : '发送'}
            </button>
          </div>
          <div className="chat-hint">Enter 发送 · Shift+Enter 换行 · 基于已选研报回答，未选则使用全部</div>
        </div>
      </div>
    );
  };

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
        {/* 左栏：分析配置 */}
        <section className="panel" style={{ height: 720 }}>
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
                className={`mode-btn ${activeMode === 'compare' ? 'active' : ''}`}
                onClick={() => setActiveMode('compare')}
              >
                研报对比
              </button>
              <button
                className={`mode-btn ${activeMode === 'qa' ? 'active' : ''}`}
                onClick={() => setActiveMode('qa')}
              >
                AI问答
              </button>
            </div>

            {/* 对比模式配置 */}
            {activeMode === 'compare' && (
              <div>
                <div className="section-block">
                  <div className="section-kicker">对比维度</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      className="toolbar-select"
                      value={compareType}
                      onChange={e => {
                        const t = e.target.value as 'company' | 'industry' | 'custom';
                        setCompareType(t);
                        setSelectedDimensions(SCENE_DIMENSIONS[t]);
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="company">公司对比</option>
                      <option value="industry">行业对比</option>
                      <option value="custom">自定义对比</option>
                    </select>
                    <button className="btn primary" onClick={handleCompare} disabled={comparing} style={{ whiteSpace: 'nowrap' }}>
                      {comparing ? '分析中...' : '开始对比'}
                    </button>
                  </div>
                </div>
                <div className="section-block">
                  <div className="section-kicker">分析维度</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {DIMENSION_LIST.filter(d => d.scenes.includes(compareType)).map(dim => (
                      <label
                        key={dim.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                          background: selectedDimensions.includes(dim.id) ? 'var(--accent-bg, #e6f0ff)' : 'transparent',
                          border: `1px solid ${selectedDimensions.includes(dim.id) ? 'var(--accent, #3b82f6)' : 'var(--line, #e5e7eb)'}`,
                          fontSize: 13, transition: 'all .15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDimensions.includes(dim.id)}
                          onChange={() => {
                            setSelectedDimensions(prev =>
                              prev.includes(dim.id) ? prev.filter(x => x !== dim.id) : [...prev, dim.id]
                            );
                          }}
                          style={{ marginTop: 1 }}
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{dim.label}</div>
                          <div className="report-desc" style={{ fontSize: 11 }}>{dim.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="section-block">
                  <div className="section-kicker">已选研报</div>
                  <p className="section-copy">
                    {selectedReports.length >= 2
                      ? `当前已选 ${selectedReports.length} 份研报，可直接执行${compareType === 'company' ? '公司' : compareType === 'industry' ? '行业' : '自定义'}对比。`
                      : '请至少选择 2 份已完成研报进行对比分析。'
                    }
                  </p>
                </div>
                <div style={{ marginTop: 4 }}>
                  <button className="btn secondary" onClick={selectAll} style={{ width: '100%' }}>全选研报</button>
                </div>
              </div>
            )}

            {/* 问答模式配置 */}
            {activeMode === 'qa' && (
              <div className="section-block">
                <div className="section-kicker">参考范围</div>
                <p className="section-copy">不选时默认使用全部已完成研报；已选时仅基于所选内容回答。</p>
              </div>
            )}

            {/* 研报选择列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {reports.map(r => (
                <label
                  key={r.id}
                  className={`selector-item ${selectedReports.includes(r.id) ? 'selected' : ''}`}
                  onClick={() => toggleReportSelection(r.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(r.id)}
                    onChange={() => {}}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div className="report-title" style={{ marginBottom: 6 }}>{r.title}</div>
                    <div className="report-desc">{r.company} · {r.broker}</div>
                    <div className="report-desc">评级 {r.rating}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* 中栏：分析结果 */}
        <section className="panel" style={{ height: 720, overflow: 'hidden' }}>
          {comparing ? (
            <div className="empty-state"><Spin size="large" /><p style={{ marginTop: 16 }}>分析中，请稍候...</p></div>
          ) : activeMode === 'compare' ? renderCompareView() : renderQAView()}
        </section>

        {/* 右栏：分析历史 / 会话管理 */}
        <aside className="panel" style={{ height: 720 }}>
          {activeMode === 'qa' ? (
            <>
              <div className="panel-header">
                <div style={{ flex: 1 }}>
                  <h3 className="panel-title">对话会话</h3>
                  <div className="panel-subtitle">管理会话记录，支持多轮对话</div>
                </div>
                <button
                  className="btn primary"
                  onClick={handleNewSession}
                  style={{ fontSize: 12, padding: '4px 12px', whiteSpace: 'nowrap' }}
                >
                  + 新建会话
                </button>
              </div>
              <div className="scroll-body">
                {loadingSessions ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin size="small" /></div>
                ) : sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>
                    暂无会话记录，发送第一条消息即可自动创建
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sessions.map(s => (
                      <div
                        key={s.id}
                        className="history-item"
                        onClick={() => handleSwitchSession(s.id)}
                        style={{
                          cursor: 'pointer',
                          borderLeft: currentSessionId === s.id ? '3px solid var(--accent, #2b6cb0)' : '3px solid transparent',
                          background: currentSessionId === s.id ? 'var(--accent-bg, #e6f0ff)' : 'transparent',
                          transition: 'all .15s',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.title || '新对话'}
                            </h4>
                            <div className="report-desc" style={{ fontSize: 11, marginTop: 2 }}>
                              {s.message_count || 0} 条消息 · {s.updated_at ? new Date(s.updated_at).toLocaleDateString('zh-CN') : ''}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSession(s.id, e)}
                            style={{
                              border: 'none', background: 'none', cursor: 'pointer',
                              color: 'var(--text-faint)', fontSize: 14, padding: '0 4px',
                              lineHeight: 1, opacity: 0.6, transition: 'opacity .15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                            title="删除会话"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">分析历史</h3>
                  <div className="panel-subtitle">保留最近对比与问答操作痕迹</div>
                </div>
              </div>
              <div className="scroll-body">
                <div className="history-list">
                  {history.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)' }}>暂无历史记录</div>
                  ) : (
                    history.map((item, i) => (
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
