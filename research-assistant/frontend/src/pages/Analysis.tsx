import { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  Select, 
  Button, 
  Input, 
  List, 
  Typography, 
  Tag, 
  Space, 
  message, 
  Spin,
  Empty,
  Divider,
  Badge,
  Checkbox,
  Row,
  Col
} from 'antd';
import { 
  BarChartOutlined, 
  SendOutlined,
  FileTextOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  DiffOutlined,
  LineChartOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { Report } from '../types';
import type { AIQueryResponse, CompareResponse } from '../types/analysis';
import { reportApi } from '../services/api';
import { aiService } from '../services/aiService';
import { colors, gradients, shadows, borderRadius } from '../styles/fintech-theme';

const { TabPane } = Tabs;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

export default function Analysis() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'compare' | 'qa'>('compare');
  
  // 对比分析状态
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [compareType, setCompareType] = useState<'company' | 'industry' | 'custom'>('company');
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  
  // AI问答状态
  const [question, setQuestion] = useState('');
  const [selectedContextReports, setSelectedContextReports] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{type: 'user' | 'ai', content: string, sources?: any[]}>>([]);
  const [asking, setAsking] = useState(false);

  // 加载研报列表
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await reportApi.list({ page_size: 100 });
      setReports(res.items.filter(r => r.status === 'completed'));
    } catch (error) {
      message.error('加载研报列表失败');
    }
  };

  // 切换研报选择
  const toggleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  // 执行对比分析
  const handleCompare = async () => {
    if (selectedReports.length < 2) {
      message.warning('请至少选择2份研报进行对比');
      return;
    }
    
    setComparing(true);
    try {
      const result = await aiService.compareReports(selectedReports, compareType);
      setCompareResult(result);
      message.success('分析完成');
    } catch (error) {
      message.error('分析失败');
    } finally {
      setComparing(false);
    }
  };

  // 执行AI问答
  const handleAsk = async () => {
    if (!question.trim()) {
      message.warning('请输入问题');
      return;
    }
    
    const userQuestion = question.trim();
    setChatHistory(prev => [...prev, { type: 'user', content: userQuestion }]);
    setQuestion('');
    setAsking(true);
    
    try {
      const result = await aiService.askQuestion({
        question: userQuestion,
        report_ids: selectedContextReports.length > 0 ? selectedContextReports : undefined,
      });
      
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: result.answer,
        sources: result.sources
      }]);
    } catch (error) {
      message.error('获取回答失败');
      setChatHistory(prev => [...prev, { 
        type: 'ai', 
        content: '抱歉，我暂时无法回答这个问题，请稍后重试。'
      }]);
    } finally {
      setAsking(false);
    }
  };

  // 渲染左侧选择面板
  const renderLeftPanel = () => {
    if (activeMode === 'compare') {
      return (
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>选择研报进行对比</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>已选择 {selectedReports.length} 份研报</Text>
          </div>
          
          {/* 对比维度和按钮放在同一行 */}
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

          <Divider style={{ margin: '16px 0' }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 12 }}>研报列表</Text>
            <List
              dataSource={reports}
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

    // QA 模式
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>选择参考研报</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>不选择则使用全部研报作为知识库</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button 
            type="default"
            size="small"
            onClick={() => setSelectedContextReports([])}
            style={{ marginRight: 8 }}
          >
            清空选择
          </Button>
          <Button 
            type="default"
            size="small"
            onClick={() => setSelectedContextReports(reports.map(r => r.id))}
          >
            全选
          </Button>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <List
          dataSource={reports}
          renderItem={(report) => (
            <List.Item 
              style={{ 
                padding: '8px 0',
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
    );
  };

  // 渲染中间/右侧内容区
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
          </Space>
        </div>
      );
    }

    // QA 模式
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 对话历史 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {chatHistory.length === 0 ? (
            <Empty 
              description="开始提问，获取AI智能分析"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ marginTop: '100px' }}
            />
          ) : (
            <List
              dataSource={chatHistory}
              renderItem={(item, index) => (
                <List.Item key={index} style={{ backgroundColor: item.type === 'user' ? '#f5f5f5' : 'transparent', padding: '16px 0' }}>
                  <div style={{ width: '100%' }}>
                    <Space align="start">
                      {item.type === 'user' ? (
                        <>
                          <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '50%', 
                            backgroundColor: '#1890ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold'
                          }}>
                            我
                          </div>
                          <div>
                            <Text strong>我的问题</Text>
                            <Paragraph style={{ marginBottom: 0 }}>{item.content}</Paragraph>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ 
                            width: 32, 
                            height: 32, 
                            borderRadius: '50%', 
                            backgroundColor: '#52c41a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}>
                            AI
                          </div>
                          <div style={{ flex: 1 }}>
                            <Text strong type="success">AI助手</Text>
                            <Paragraph style={{ marginBottom: 8 }}>{item.content}</Paragraph>
                            {item.sources && item.sources.length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>参考来源：</Text>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                                  {item.sources.map((source, idx) => (
                                    <Tag key={idx} icon={<FileTextOutlined />}>
                                      {source.report_title}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </Space>
                  </div>
                </List.Item>
              )}
            />
          )}
          {asking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#999', marginTop: 16 }}>
              <LoadingOutlined />
              <Text type="secondary">AI正在思考...</Text>
            </div>
          )}
        </div>
        
        {/* 输入框 */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff' }}>
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入您的问题，例如：对比茅台和五粮液的盈利能力"
              autoSize={{ minRows: 2, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <Button 
              type="primary" 
              onClick={handleAsk}
              loading={asking}
              icon={<SendOutlined />}
              style={{ height: 'auto' }}
            >
              发送
            </Button>
          </Space.Compact>
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
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
        {/* 模式切换 - 金融科技风格 */}
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
    </div>
  );
}
