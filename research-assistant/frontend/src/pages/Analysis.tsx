import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Card, 
  Select, 
  Button, 
  Input, 
  List, 
  Typography, 
  Tag, 
  Space, 
  message, 
  Empty,
  Divider,
  Badge,
  Checkbox,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  Drawer,
  Descriptions,
  Spin,
  Table,
} from 'antd';
import { 
  BarChartOutlined, 
  SendOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  DiffOutlined,
  LineChartOutlined,
  RobotOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  ReloadOutlined,
  StopOutlined,
  StarOutlined,
  DollarOutlined,
  TeamOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { Report } from '../types';
import type { CompareResponse, CompareDimension, ChatSession } from '../types/analysis';
import { DIMENSION_LIST, SCENE_DIMENSIONS } from '../types/analysis';
import { reportApi } from '../services/api';
import { aiService } from '../services/aiService';
import { colors, gradients, shadows, borderRadius } from '../styles/fintech-theme';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export default function Analysis() {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeMode, setActiveMode] = useState<'compare' | 'qa'>('compare');
  
  // 对比分析状态
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [compareType, setCompareType] = useState<'company' | 'industry' | 'custom'>('company');
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState<CompareDimension[]>(['rating', 'views']);
  
  // AI问答状态
  const [question, setQuestion] = useState('');
  const [selectedContextReports, setSelectedContextReports] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', content: string, sources?: any[]}>>([]);

  // 会话管理状态
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 会话重命名状态
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // 研报预览状态
  const [previewReport, setPreviewReport] = useState<Report | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 搜索筛选状态
  const [searchKeyword, setSearchKeyword] = useState('');

  // 流式对话状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 按关键词筛选研报
  const filteredReports = useMemo(() => {
    if (!searchKeyword.trim()) return reports;
    const kw = searchKeyword.trim().toLowerCase();
    return reports.filter(r =>
      (r.title && r.title.toLowerCase().includes(kw)) ||
      (r.company && r.company.toLowerCase().includes(kw)) ||
      (r.broker && r.broker.toLowerCase().includes(kw))
    );
  }, [reports, searchKeyword]);

  // 缓存选中研报详情
  const selectedReportDetails = useMemo(() => 
    reports.filter(r => selectedReports.includes(r.id)),
    [reports, selectedReports]
  );

  // 自动滚动
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // 加载研报列表
  useEffect(() => {
    loadReports();
  }, []);

  // QA模式时加载会话列表
  useEffect(() => {
    if (activeMode === 'qa') {
      loadSessions();
    }
  }, [activeMode]);

  // 场景联动维度
  useEffect(() => {
    const recommended = SCENE_DIMENSIONS[compareType] || ['rating', 'views'];
    setSelectedDimensions(recommended);
  }, [compareType]);

  // 消息变化时自动滚动到底部
  useEffect(() => {
    if (autoScroll && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, autoScroll]);

  const loadReports = async () => {
    try {
      const res = await reportApi.list({ page_size: 100 });
      setReports(res.items.filter(r => r.status === 'completed'));
    } catch (error) {
      message.error('加载研报列表失败');
    }
  };

  // 加载会话列表
  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const list = await aiService.getSessions();
      setSessions(list);
    } catch (e) { /* 静默处理 */ }
    finally { setLoadingSessions(false); }
  };

  // 切换会话 - 加载历史消息
  const switchSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    try {
      const messages = await aiService.getSessionMessages(sessionId);
      setChatHistory(messages.map(m => ({
        type: m.role === 'user' ? 'user' as const : 'ai' as const,
        content: m.content,
        sources: m.sources,
      })));
    } catch (e) { message.error('加载会话失败'); }
  };

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      await aiService.removeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setChatHistory([]);
      }
    } catch (e) { message.error('删除会话失败'); }
  };

  // 新建会话
  const createNewSession = () => {
    setCurrentSessionId(null);
    setChatHistory([]);
  };

  // 重命名会话
  const handleRenameSession = async (sessionId: string) => {
    const newTitle = editingTitle.trim();
    if (!newTitle) {
      setEditingSessionId(null);
      return;
    }
    try {
      await aiService.updateSession(sessionId, newTitle);
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ));
    } catch (e) {
      message.error('重命名失败');
    }
    setEditingSessionId(null);
  };

  // 预览研报详情
  const handlePreviewReport = async (reportId: string) => {
    setPreviewVisible(true);
    setPreviewLoading(true);
    try {
      const report = await reportApi.get(reportId);
      setPreviewReport(report);
    } catch (e) {
      message.error('加载研报失败');
    }
    setPreviewLoading(false);
  };

  // 切换研报选择
  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // 切换维度
  const toggleDimension = (dim: CompareDimension) => {
    setSelectedDimensions(prev => 
      prev.includes(dim) 
        ? prev.filter(d => d !== dim)
        : [...prev, dim]
    );
  };

  // 执行对比分析
  const handleCompare = async () => {
    if (selectedReports.length < 2) {
      message.warning('请至少选择2份研报进行对比');
      return;
    }
    if (selectedDimensions.length < 1) {
      message.warning('请至少选择1个分析维度');
      return;
    }
    
    setComparing(true);
    try {
      const result = await aiService.compareReports(selectedReports, compareType, selectedDimensions);
      setCompareResult(result);
      message.success('分析完成');
    } catch (error) {
      message.error('分析失败');
    } finally {
      setComparing(false);
    }
  };

  // 流式AI问答
  const handleAsk = async () => {
    if (!question.trim() || isStreaming) return;
    
    const userQuestion = question.trim();
    setQuestion('');
    
    // 添加用户消息
    setChatHistory(prev => [...prev, { type: 'user', content: userQuestion }]);
    
    // 添加空的AI消息占位
    setChatHistory(prev => [...prev, { type: 'ai', content: '' }]);
    setIsStreaming(true);
    setAutoScroll(true);
    
    let fullContent = '';
    
    const controller = aiService.streamAskQuestion(
      {
        question: userQuestion,
        report_ids: selectedContextReports.length > 0 ? selectedContextReports : undefined,
        session_id: currentSessionId || undefined,
      },
      // onChunk
      (chunk) => {
        fullContent += chunk;
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
          return updated;
        });
      },
      // onDone
      (sources) => {
        setChatHistory(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], sources };
          return updated;
        });
        setIsStreaming(false);
        setAbortController(null);
        loadSessions();
      },
      // onSessionId
      (sessionId) => {
        setCurrentSessionId(sessionId);
      }
    );
    
    setAbortController(controller);
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  // 复制消息内容
  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    message.success('已复制到剪贴板');
  };

  // 重新生成
  const handleRegenerate = () => {
    if (chatHistory.length < 2) return;
    const lastUserMsg = [...chatHistory].reverse().find(m => m.type === 'user');
    if (lastUserMsg) {
      setChatHistory(prev => prev.slice(0, -1));
      setQuestion(lastUserMsg.content);
    }
  };

  // 监听滚动
  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  // ==================== 渲染左侧面板 ====================
  const renderLeftPanel = () => {
    if (activeMode === 'compare') {
      return (
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>选择研报进行对比</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedReports.length} 份研报</Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>对比维度</Text>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Select
                value={compareType}
                onChange={setCompareType}
                style={{ flex: 1 }}
                options={[
                  { label: '公司对比', value: 'company' },
                  { label: '行业对比', value: 'industry' },
                  { label: '自定义对比', value: 'custom' },
                ]}
              />
              <Button 
                type="primary" 
                onClick={handleCompare}
                loading={comparing}
                disabled={selectedReports.length < 2}
                icon={<BarChartOutlined />}
                style={{ 
                  background: selectedReports.length < 2 ? undefined : gradients.primary,
                  border: 'none',
                  boxShadow: selectedReports.length < 2 ? undefined : shadows.md,
                  color: '#fff',
                  fontWeight: 500,
                }}
              >
                开始对比
              </Button>
            </div>
          </div>

          {/* 分析维度选择 */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>分析维度</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {DIMENSION_LIST.map(dim => {
                const isSelected = selectedDimensions.includes(dim.id);
                const isApplicable = dim.scenes.includes(compareType);
                return (
                  <Tooltip key={dim.id} title={!isApplicable ? '该维度不适用于当前对比场景' : dim.description}>
                    <Tag
                      style={{
                        cursor: isApplicable ? 'pointer' : 'not-allowed',
                        opacity: isApplicable ? 1 : 0.4,
                        backgroundColor: isSelected && isApplicable ? colors.primary : 'transparent',
                        color: isSelected && isApplicable ? '#fff' : colors.textSecondary,
                        border: `1px solid ${isSelected && isApplicable ? colors.primary : colors.border}`,
                        borderRadius: borderRadius.md,
                        padding: '4px 12px',
                        fontSize: '13px',
                        fontWeight: isSelected ? 600 : 400,
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => {
                        if (isApplicable) toggleDimension(dim.id);
                      }}
                    >
                      {dim.label}
                    </Tag>
                  </Tooltip>
                );
              })}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
              已选 {selectedDimensions.length} 个维度 · 切换场景自动推荐
            </Text>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>研报列表</Text>
            <Input
              placeholder="搜索研报标题/公司/券商"
              prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
              allowClear
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{ marginBottom: 12, borderRadius: borderRadius.md }}
            />
            <List
              dataSource={filteredReports}
              renderItem={(report) => (
                <List.Item 
                  style={{ 
                    padding: '8px 0',
                    cursor: 'pointer',
                    backgroundColor: selectedReports.includes(report.id) ? '#e6f7ff' : 'transparent'
                  }}
                  onClick={() => toggleReportSelection(report.id)}
                >
                  <Checkbox 
                    checked={selectedReports.includes(report.id)}
                    onChange={() => toggleReportSelection(report.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginRight: 8 }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {report.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {report.company} | {report.broker}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
        </div>
      );
    }

    // QA 模式 - 会话列表 + 研报选择
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 新建会话按钮 */}
        <Button type="primary" icon={<PlusOutlined />} block onClick={createNewSession}
          style={{ background: gradients.primary, border: 'none', boxShadow: shadows.md, fontWeight: 500 }}
        >
          新建对话
        </Button>
        
        {/* 会话列表 */}
        <div style={{ marginTop: 12, flex: 1, overflow: 'auto', minHeight: 0 }}>
          {loadingSessions ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#999' }}>
              <LoadingOutlined style={{ marginRight: 8 }} />加载中...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>
              暂无对话记录
            </div>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => switchSession(session.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: currentSessionId === session.id ? '#e6f4ff' : 'transparent',
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  {editingSessionId === session.id ? (
                    <Input
                      size="small"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onPressEnter={() => handleRenameSession(session.id)}
                      onBlur={() => handleRenameSession(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      autoFocus
                      style={{ fontSize: 13 }}
                    />
                  ) : (
                    <div
                      onDoubleClick={() => {
                        setEditingSessionId(session.id);
                        setEditingTitle(session.title);
                      }}
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        cursor: 'text',
                      }}
                      title="双击编辑名称"
                    >
                      {session.title}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {session.message_count ?? session.messages?.length ?? 0}条消息
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.id);
                      setEditingTitle(session.title);
                    }}
                    style={{ color: '#999' }}
                  />
                  <Popconfirm
                    title="确定删除此对话？"
                    description="删除后不可恢复"
                    onConfirm={(e) => { e?.stopPropagation(); deleteSession(session.id); }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="删除"
                    cancelText="取消"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Popconfirm>
                </div>
              </div>
            ))
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 参考研报选择 */}
        <div style={{ maxHeight: '40%', overflow: 'auto' }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>参考研报</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>不选择则使用全部研报</Text>
          </div>
          <div style={{ marginBottom: 8 }}>
            <Button type="default" size="small" onClick={() => setSelectedContextReports([])} style={{ marginRight: 8 }}>
              清空
            </Button>
            <Button type="default" size="small" onClick={() => setSelectedContextReports(reports.map(r => r.id))}>
              全选
            </Button>
          </div>
          <Input
            placeholder="搜索研报标题/公司/券商"
            prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
            allowClear
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ marginBottom: 8, borderRadius: borderRadius.md }}
          />
          <List
            size="small"
            dataSource={filteredReports}
            renderItem={(report) => (
              <List.Item 
                style={{ 
                  padding: '6px 0',
                  cursor: 'pointer',
                  backgroundColor: selectedContextReports.includes(report.id) ? '#e6f7ff' : 'transparent'
                }}
                onClick={() => {
                  setSelectedContextReports(prev => 
                    prev.includes(report.id) 
                      ? prev.filter(id => id !== report.id)
                      : [...prev, report.id]
                  );
                }}
              >
                <Checkbox 
                  checked={selectedContextReports.includes(report.id)}
                  onChange={() => {
                    setSelectedContextReports(prev => 
                      prev.includes(report.id) 
                        ? prev.filter(id => id !== report.id)
                        : [...prev, report.id]
                    );
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginRight: 8 }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {report.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>
                    {report.company} | {report.broker}
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    );
  };

  // ==================== 渲染主内容区 ====================
  const renderMainContent = () => {
    if (activeMode === 'compare') {
      if (!compareResult) {
        return (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <p>请选择至少2份研报进行对比分析</p>
                <Text type="secondary">支持公司对比、行业对比和自定义对比</Text>
              </div>
            }
            style={{ marginTop: '100px' }}
          />
        );
      }

      return (
        <div style={{ padding: '24px', height: '100%', overflow: 'auto' }}>
          <Title level={4} style={{ marginBottom: 24 }}>
            <DiffOutlined style={{ marginRight: 8 }} />
            对比分析结果
          </Title>
          
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card title="分析总结" size="small">
              <Paragraph>{compareResult.comparison_result}</Paragraph>
            </Card>
            
            <Row gutter={16}>
              <Col span={12}>
                <Card 
                  title={<><CheckCircleOutlined style={{ color: '#52c41a' }} /> 共同点</>} 
                  size="small"
                >
                  <List
                    dataSource={compareResult.similarities}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Badge count={index + 1} style={{ backgroundColor: '#52c41a' }} />
                        <Text style={{ marginLeft: 8 }}>{item}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  title={<><LineChartOutlined style={{ color: '#faad14' }} /> 差异点</>} 
                  size="small"
                >
                  <List
                    dataSource={compareResult.differences}
                    renderItem={(item, index) => (
                      <List.Item>
                        <Badge count={index + 1} style={{ backgroundColor: '#faad14' }} />
                        <Text style={{ marginLeft: 8 }}>{item}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
            
            <Card 
              title="投资建议" 
              size="small"
              headStyle={{ backgroundColor: '#e6f7ff' }}
            >
              <List
                dataSource={compareResult.recommendations}
                renderItem={(item, index) => (
                  <List.Item>
                    <Badge count={index + 1} style={{ backgroundColor: '#1890ff' }} />
                    <Text style={{ marginLeft: 8 }} type="success">{item}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {compareResult.dimension_results && compareResult.dimension_results.length > 0 && (
              <>
                <Divider titlePlacement="left">维度详细分析</Divider>
                <Row gutter={[16, 16]}>
                  {compareResult.dimension_results.map((dr) => (
                    <Col span={compareResult.dimension_results!.length === 1 ? 24 : 12} key={dr.dimension}>
                      <Card
                        title={
                          <Space>
                            {dr.dimension === 'rating' && <StarOutlined style={{ color: colors.accent }} />}
                            {dr.dimension === 'financial' && <DollarOutlined style={{ color: colors.success }} />}
                            {dr.dimension === 'views' && <FileTextOutlined style={{ color: colors.info }} />}
                            {dr.dimension === 'analyst' && <TeamOutlined style={{ color: colors.primary }} />}
                            <span>{dr.dimension_label}</span>
                          </Space>
                        }
                        size="small"
                        style={{ height: '100%' }}
                      >
                        {dr.summary && (
                          <Paragraph type="secondary" style={{ marginBottom: 12, fontStyle: 'italic' }}>
                            {dr.summary}
                          </Paragraph>
                        )}

                        {/* 评级维度 - 数据表格 + 目标价柱状图 */}
                        {dr.dimension === 'rating' && selectedReportDetails.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Table
                              dataSource={selectedReportDetails.map((r, i) => ({
                                key: r.id,
                                index: i + 1,
                                company: r.company,
                                broker: r.broker,
                                rating: r.rating || '-',
                                target_price: r.target_price,
                                current_price: r.current_price,
                                upside: r.target_price && r.current_price 
                                  ? ((r.target_price - r.current_price) / r.current_price * 100).toFixed(1) + '%'
                                  : '-',
                              }))}
                              columns={[
                                { title: '公司', dataIndex: 'company', key: 'company', width: 100 },
                                { title: '券商', dataIndex: 'broker', key: 'broker', width: 100 },
                                { title: '评级', dataIndex: 'rating', key: 'rating', width: 80,
                                  render: (val: string) => (
                                    <Tag color={val.includes('买入') || val.includes('推荐') || val.includes('增持') ? 'green' : val.includes('减持') || val.includes('卖出') ? 'red' : 'orange'}>
                                      {val}
                                    </Tag>
                                  )
                                },
                                { title: '目标价', dataIndex: 'target_price', key: 'target_price', width: 90,
                                  render: (val: number) => val ? `¥${val.toFixed(2)}` : '-'
                                },
                                { title: '现价', dataIndex: 'current_price', key: 'current_price', width: 90,
                                  render: (val: number) => val ? `¥${val.toFixed(2)}` : '-'
                                },
                                { title: '上涨空间', dataIndex: 'upside', key: 'upside', width: 90,
                                  render: (val: string) => {
                                    const num = parseFloat(val);
                                    return <Text style={{ color: num > 0 ? colors.success : colors.danger, fontWeight: 600 }}>{val}</Text>;
                                  }
                                },
                              ]}
                              pagination={false}
                              size="small"
                              bordered
                              style={{ marginBottom: 16 }}
                            />
                            <div style={{ height: 220 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={selectedReportDetails.map(r => ({
                                  name: r.company,
                                  '目标价': r.target_price || 0,
                                  '现价': r.current_price || 0,
                                }))}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <RechartsTooltip />
                                  <Legend />
                                  <Bar dataKey="目标价" fill={colors.primary} radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="现价" fill={colors.accent} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* 财务维度 - 财务预测表格 + 营收/净利润柱状图 */}
                        {dr.dimension === 'financial' && selectedReportDetails.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Table
                              dataSource={selectedReportDetails.map((r) => {
                                const ff = (r.financial_forecast as any) || {};
                                return {
                                  key: r.id,
                                  company: r.company,
                                  broker: r.broker,
                                  revenue_2024: ff.revenue_2024,
                                  revenue_2025: ff.revenue_2025,
                                  net_profit_2024: ff.net_profit_2024,
                                  net_profit_2025: ff.net_profit_2025,
                                  eps_2024: ff.eps_2024,
                                  eps_2025: ff.eps_2025,
                                };
                              })}
                              columns={[
                                { title: '公司', dataIndex: 'company', key: 'company', width: 100, fixed: 'left' as const },
                                { title: '券商', dataIndex: 'broker', key: 'broker', width: 80 },
                                { title: '营收2024(亿)', dataIndex: 'revenue_2024', key: 'revenue_2024', width: 110,
                                  render: (v: number) => v ? v.toFixed(1) : '-'
                                },
                                { title: '营收2025(亿)', dataIndex: 'revenue_2025', key: 'revenue_2025', width: 110,
                                  render: (v: number) => v ? v.toFixed(1) : '-'
                                },
                                { title: '净利润2024(亿)', dataIndex: 'net_profit_2024', key: 'net_profit_2024', width: 120,
                                  render: (v: number) => v ? v.toFixed(1) : '-'
                                },
                                { title: '净利润2025(亿)', dataIndex: 'net_profit_2025', key: 'net_profit_2025', width: 120,
                                  render: (v: number) => v ? v.toFixed(1) : '-'
                                },
                                { title: 'EPS2024', dataIndex: 'eps_2024', key: 'eps_2024', width: 90,
                                  render: (v: number) => v ? v.toFixed(2) : '-'
                                },
                                { title: 'EPS2025', dataIndex: 'eps_2025', key: 'eps_2025', width: 90,
                                  render: (v: number) => v ? v.toFixed(2) : '-'
                                },
                              ]}
                              pagination={false}
                              size="small"
                              bordered
                              scroll={{ x: 820 }}
                              style={{ marginBottom: 16 }}
                            />
                            <div style={{ height: 220 }}>
                              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>营收与净利润对比（亿元）</Text>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={selectedReportDetails.map(r => {
                                  const ff = (r.financial_forecast as any) || {};
                                  return {
                                    name: r.company,
                                    '营收2024': ff.revenue_2024 || 0,
                                    '营收2025': ff.revenue_2025 || 0,
                                    '净利润2024': ff.net_profit_2024 || 0,
                                    '净利润2025': ff.net_profit_2025 || 0,
                                  };
                                })}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                  <YAxis tick={{ fontSize: 12 }} />
                                  <RechartsTooltip />
                                  <Legend />
                                  <Bar dataKey="营收2024" fill={colors.primary} radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="营收2025" fill={colors.primaryLight} radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="净利润2024" fill={colors.success} radius={[4, 4, 0, 0]} />
                                  <Bar dataKey="净利润2025" fill={colors.successLight} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* 分析师维度 - 对比表格 */}
                        {dr.dimension === 'analyst' && selectedReportDetails.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <Table
                              dataSource={selectedReportDetails.map((r) => ({
                                key: r.id,
                                company: r.company,
                                broker: r.broker || '-',
                                analyst: r.analyst || '-',
                                rating: r.rating || '-',
                                report_date: r.report_date || r.created_at?.split('T')[0] || '-',
                              }))}
                              columns={[
                                { title: '公司', dataIndex: 'company', key: 'company' },
                                { title: '券商', dataIndex: 'broker', key: 'broker' },
                                { title: '分析师', dataIndex: 'analyst', key: 'analyst' },
                                { title: '评级', dataIndex: 'rating', key: 'rating' },
                                { title: '报告日期', dataIndex: 'report_date', key: 'report_date' },
                              ]}
                              pagination={false}
                              size="small"
                              bordered
                            />
                          </div>
                        )}

                        <List
                          dataSource={dr.details}
                          renderItem={(item, index) => (
                            <List.Item style={{ padding: '6px 0' }}>
                              <Badge count={index + 1} style={{ backgroundColor: colors.primary }} />
                              <Text style={{ marginLeft: 8 }}>{item}</Text>
                            </List.Item>
                          )}
                        />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Space>
        </div>
      );
    }

    // QA 模式
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 对话历史 */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}
        >
          {chatHistory.length === 0 ? (
            // 空状态引导
            <div style={{ textAlign: 'center', paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>投研AI助手</div>
              <div style={{ color: '#999', marginBottom: 24 }}>选择研报，开始提问获取AI智能分析</div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['这些研报的核心观点是什么？', '对比各券商的目标价和评级', '未来盈利预测如何？'].map(q => (
                  <div
                    key={q}
                    onClick={() => { setQuestion(q); }}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #e8e8e8',
                      cursor: 'pointer',
                      fontSize: 14,
                      maxWidth: 200,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1890ff'; e.currentTarget.style.color = '#1890ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = 'inherit'; }}
                  >
                    {q}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 消息列表
            chatHistory.map((msg, index) => (
              <div key={index} style={{ marginBottom: 20 }}>
                {/* 用户消息 */}
                {msg.type === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                    <div style={{
                      maxWidth: '70%',
                      background: colors.primary,
                      color: '#fff',
                      padding: '10px 16px',
                      borderRadius: '16px 16px 4px 16px',
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                )}
                
                {/* AI消息 */}
                {msg.type === 'ai' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{
                        background: '#f5f5f5',
                        padding: '12px 16px',
                        borderRadius: '16px 16px 16px 4px',
                        fontSize: 14,
                        lineHeight: 1.8,
                      }}>
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.content || (isStreaming && index === chatHistory.length - 1 ? '思考中...' : '')}
                          {isStreaming && index === chatHistory.length - 1 && msg.content && (
                            <span className="blink-cursor">▊</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 来源引用 */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {msg.sources.map((src: any, i: number) => (
                            <Tag
                              key={i}
                              color="blue"
                              style={{ fontSize: 12, cursor: 'pointer' }}
                              onClick={() => handlePreviewReport(src.report_id)}
                            >
                              📄 {src.report_title}
                            </Tag>
                          ))}
                        </div>
                      )}
                      
                      {/* 消息操作按钮 */}
                      {!(isStreaming && index === chatHistory.length - 1) && msg.content && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyMessage(msg.content)}
                            style={{ fontSize: 12, color: '#999' }}
                          >
                            复制
                          </Button>
                          {index === chatHistory.length - 1 && (
                            <Button
                              type="text"
                              size="small"
                              icon={<ReloadOutlined />}
                              onClick={handleRegenerate}
                              style={{ fontSize: 12, color: '#999' }}
                            >
                              重新生成
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* 滚动锚点 */}
          <div ref={chatEndRef} />
        </div>

        {/* 回到最新按钮 */}
        {!autoScroll && chatHistory.length > 0 && (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <Button
              size="small"
              onClick={() => {
                setAutoScroll(true);
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              ↓ 回到最新
            </Button>
          </div>
        )}
        
        {/* 输入区域 */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的问题..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              disabled={isStreaming}
              style={{ borderRadius: 8 }}
            />
            {isStreaming ? (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleStopGeneration}
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAsk}
                disabled={!question.trim()}
                style={{
                  background: !question.trim() ? undefined : gradients.primary,
                  border: 'none',
                }}
              >
                发送
              </Button>
            )}
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
            提示：Shift + Enter 换行，Enter 发送
          </Text>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* 左侧：模式切换 + 选择面板 */}
      <div style={{ 
        width: '320px', 
        minWidth: '320px',
        borderRight: `1px solid ${colors.border}`, 
        display: 'flex', 
        flexDirection: 'column',
        background: colors.surface,
        boxShadow: shadows.sm,
      }}>
        {/* 模式切换 */}
        <div style={{ 
          display: 'flex', 
          borderBottom: `1px solid ${colors.border}`,
          background: colors.background,
        }}>
          <div
            onClick={() => setActiveMode('compare')}
            style={{
              flex: 1,
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: activeMode === 'compare' ? colors.surface : colors.background,
              borderBottom: activeMode === 'compare' ? `3px solid ${colors.accent}` : '3px solid transparent',
              fontWeight: activeMode === 'compare' ? 600 : 500,
              color: activeMode === 'compare' ? colors.primary : colors.textMuted,
              transition: 'all 0.25s ease',
            }}
          >
            <BarChartOutlined style={{ marginRight: 8, fontSize: '16px' }} />
            <span style={{ fontSize: '14px' }}>研报对比</span>
          </div>
          <div
            onClick={() => setActiveMode('qa')}
            style={{
              flex: 1,
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: activeMode === 'qa' ? colors.surface : colors.background,
              borderBottom: activeMode === 'qa' ? `3px solid ${colors.accent}` : '3px solid transparent',
              fontWeight: activeMode === 'qa' ? 600 : 500,
              color: activeMode === 'qa' ? colors.primary : colors.textMuted,
              transition: 'all 0.25s ease',
            }}
          >
            <RobotOutlined style={{ marginRight: 8, fontSize: '16px' }} />
            <span style={{ fontSize: '14px' }}>AI问答</span>
          </div>
        </div>

        {/* 选择面板 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {renderLeftPanel()}
        </div>
      </div>

      {/* 中间/右侧：核心内容区 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: colors.surface,
      }}>
        {renderMainContent()}
      </div>

      {/* 研报预览 Drawer */}
      <Drawer
        title={previewReport?.title || '研报预览'}
        open={previewVisible}
        onClose={() => { setPreviewVisible(false); setPreviewReport(null); }}
        width={520}
        destroyOnClose
      >
        {previewLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="加载中..." />
          </div>
        ) : previewReport ? (
          <div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="标题">{previewReport.title}</Descriptions.Item>
              <Descriptions.Item label="公司">{previewReport.company}</Descriptions.Item>
              <Descriptions.Item label="券商">{previewReport.broker || '-'}</Descriptions.Item>
              <Descriptions.Item label="评级">
                <Tag color={previewReport.rating === '买入' ? 'green' : previewReport.rating === '增持' ? 'blue' : 'default'}>
                  {previewReport.rating || '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="目标价">{previewReport.target_price ? `¥${previewReport.target_price}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="日期">{previewReport.report_date || previewReport.created_at || '-'}</Descriptions.Item>
            </Descriptions>
            
            {previewReport.core_views && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>核心观点</Title>
                <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {previewReport.core_views}
                </Paragraph>
              </div>
            )}
            
            {previewReport.financial_forecast && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>财务预测</Title>
                <Paragraph style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {typeof previewReport.financial_forecast === 'string' 
                    ? previewReport.financial_forecast 
                    : JSON.stringify(previewReport.financial_forecast, null, 2)}
                </Paragraph>
              </div>
            )}
          </div>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Drawer>
    </div>
  );
}
