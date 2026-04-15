import { useState, useEffect } from 'react';
import { 
  Button, Input, Tag, Space, message, Popconfirm, 
  Card, Typography, Divider, Row, Col, Empty, Tabs, List, Tooltip, Badge
} from 'antd';
import { 
  UploadOutlined, DeleteOutlined, ReloadOutlined, FileTextOutlined,
  EyeOutlined, BarChartOutlined, FileSearchOutlined, CloudDownloadOutlined,
  MessageOutlined, TagsOutlined, RobotOutlined, CalendarOutlined,
  BankOutlined, DollarOutlined, RiseOutlined, SearchOutlined, FilePdfOutlined,
  InfoCircleOutlined, CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import type { Report, ReportListResponse } from '../types';
import { reportApi } from '../services/api';
import UploadModal from '../components/UploadModal';
import { colors, gradients, shadows, borderRadius, componentStyles } from '../styles/fintech-theme';

const { Search } = Input;
const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Meta } = Card;

export default function ReportList() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [fetching, setFetching] = useState(false);

  const fetchReports = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const res: ReportListResponse = await reportApi.list({
        page,
        page_size: pagination.pageSize,
        search,
        sort_by: 'created_at',
      });
      setReports(res.items);
      setPagination({
        current: res.page,
        pageSize: res.page_size,
        total: res.total,
      });
    } catch (error) {
      message.error('获取研报列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSearch = (value: string) => {
    setSearchKeyword(value);
    fetchReports(1, value);
  };

  const handleDelete = async (id: string) => {
    try {
      await reportApi.delete(id);
      message.success('删除成功');
      fetchReports(pagination.current, searchKeyword);
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleReparse = async (id: string) => {
    try {
      await reportApi.reparse(id);
      message.success('重新解析已触发');
      fetchReports(pagination.current, searchKeyword);
    } catch (error) {
      message.error('重新解析失败');
    }
  };

  // 抓取研报
  const handleFetchReports = async () => {
    setFetching(true);
    try {
      const result = await reportApi.fetch(5, false);
      message.success(`成功抓取 ${result.fetched} 份研报`);
      fetchReports(1, searchKeyword);
    } catch (error) {
      message.error('抓取研报失败');
    } finally {
      setFetching(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { style: React.CSSProperties; text: string; icon: React.ReactNode }> = {
      pending: { 
        style: { background: '#f1f5f9', color: colors.textSecondary, border: `1px solid ${colors.border}` },
        text: '待解析',
        icon: <InfoCircleOutlined />
      },
      parsing: { 
        style: { background: '#dbeafe', color: colors.info, border: `1px solid ${colors.info}` },
        text: '解析中',
        icon: <ReloadOutlined spin />
      },
      completed: { 
        style: { background: '#dcfce7', color: colors.success, border: `1px solid ${colors.success}` },
        text: '已完成',
        icon: <CheckCircleOutlined />
      },
      failed: { 
        style: { background: '#fee2e2', color: colors.danger, border: `1px solid ${colors.danger}` },
        text: '失败',
        icon: <CloseCircleOutlined />
      },
    };
    const { style, text, icon } = statusMap[status] || { 
      style: { background: '#f1f5f9', color: colors.textSecondary, border: `1px solid ${colors.border}` },
      text: status,
      icon: <InfoCircleOutlined />
    };
    return (
      <Tag style={{ ...style, borderRadius: borderRadius.full, fontSize: '11px', padding: '2px 8px' }}>
        <span style={{ marginRight: '4px' }}>{icon}</span>
        {text}
      </Tag>
    );
  };

  // 判断是否为自动抓取的研报
  const isAutoReport = (report: Report) => {
    // 自动抓取的研报ID是UUID格式，且文件路径包含日期格式
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.id);
    const isGeneratedPath = report.file_path?.match(/\d{8}\.pdf$/);
    return isUUID || isGeneratedPath;
  };

  // 渲染研报卡片
  const renderReportCard = (report: Report) => {
    const isSelected = selectedReport?.id === report.id;
    const isAuto = isAutoReport(report);
    
    return (
      <Card
        key={report.id}
        size="small"
        hoverable
        onClick={() => setSelectedReport(report)}
        style={{
          marginBottom: 12,
          borderRadius: borderRadius.lg,
          border: isSelected ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
          background: isSelected ? `linear-gradient(135deg, #fff 0%, #fefce8 100%)` : colors.surface,
          cursor: 'pointer',
          boxShadow: isSelected ? `${shadows.cardHover}, 0 0 0 1px ${colors.accent}20` : shadows.card,
          transition: 'all 0.25s ease',
        }}
        actions={[
          <Tooltip title="查看详情">
            <EyeOutlined 
              style={{ color: colors.primary }} 
              onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }} 
            />
          </Tooltip>,
          <Tooltip title="重新解析">
            <ReloadOutlined 
              onClick={(e) => { e.stopPropagation(); handleReparse(report.id); }}
              style={{ color: report.status === 'parsing' ? colors.textMuted : colors.info }}
            />
          </Tooltip>,
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，是否继续？"
            onConfirm={(e) => { e?.stopPropagation(); handleDelete(report.id); }}
            okText="删除"
            cancelText="取消"
          >
            <DeleteOutlined 
              style={{ color: colors.danger }} 
              onClick={(e) => e.stopPropagation()} 
            />
          </Popconfirm>,
        ]}
      >
        {/* 标签区域 */}
        <div style={{ marginBottom: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {isAuto && (
            <Tag style={{
              background: gradients.accent,
              color: colors.textPrimary,
              border: 'none',
              borderRadius: borderRadius.full,
              fontSize: '10px',
              padding: '2px 8px',
              fontWeight: 600,
            }}>
              <RobotOutlined style={{ marginRight: 4 }} />
              自动
            </Tag>
          )}
          {getStatusTag(report.status)}
          <Tag style={{
            background: colors.primary,
            color: '#fff',
            border: 'none',
            borderRadius: borderRadius.full,
            fontSize: '10px',
            padding: '2px 8px',
          }}>
            {report.rating || '-'}
          </Tag>
        </div>
        
        {/* 标题 */}
        <div style={{ 
          fontSize: 14, 
          fontWeight: isSelected ? 600 : 500,
          color: isSelected ? colors.primary : colors.textPrimary,
          lineHeight: 1.5,
          marginBottom: 10,
          minHeight: '42px',
        }}>
          {report.title || '未命名研报'}
        </div>
        
        {/* 公司信息 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: borderRadius.sm,
              background: gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <BankOutlined style={{ fontSize: '12px', color: '#fff' }} />
            </div>
            <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 500 }}>
              {report.company}
            </Text>
            {report.company_code && (
              <Tag style={{ 
                fontSize: '10px', 
                padding: '0 6px', 
                margin: 0,
                background: colors.background,
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
              }}>
                {report.company_code}
              </Tag>
            )}
          </div>
          
          <div style={{ fontSize: 12, color: colors.textMuted, marginLeft: '30px' }}>
            {report.broker || '-'} · {report.analyst || '-'}
          </div>
        </div>
        
        {/* 底部信息 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          paddingTop: 10,
          borderTop: `1px solid ${colors.divider}`,
          marginTop: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <DollarOutlined style={{ color: colors.danger, fontSize: '14px' }} />
            <span style={{ 
              color: colors.danger, 
              fontSize: 16, 
              fontWeight: 700,
              fontFamily: 'monospace',
            }}>
              ¥{report.target_price ? report.target_price.toFixed(2) : '-'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted }}>
            <CalendarOutlined style={{ marginRight: 4 }} />
            {new Date(report.created_at).toLocaleDateString('zh-CN', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </Card>
    );
  };

  // 渲染研报详情
  const renderReportDetail = () => {
    if (!selectedReport) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="点击左侧研报查看详情"
          style={{ marginTop: '100px' }}
        />
      );
    }

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 研报头部信息 - 金融科技风格 */}
        <div style={{ 
          padding: '20px 28px', 
          borderBottom: `1px solid ${colors.border}`, 
          background: gradients.card,
          boxShadow: shadows.sm,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <Title level={4} style={{ 
              margin: 0, 
              color: colors.textPrimary,
              fontWeight: 600,
              fontSize: '18px',
              lineHeight: 1.4,
              flex: 1,
              paddingRight: 20,
            }}>
              {selectedReport.title || '未命名研报'}
            </Title>
            <Tag style={{
              background: gradients.accent,
              color: colors.textPrimary,
              border: 'none',
              borderRadius: borderRadius.full,
              fontSize: '12px',
              padding: '4px 12px',
              fontWeight: 600,
            }}>
              {selectedReport.rating || '-'}
            </Tag>
          </div>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: borderRadius.sm,
                background: gradients.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BankOutlined style={{ fontSize: '14px', color: '#fff' }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>公司</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary }}>
                  {selectedReport.company || '-'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: borderRadius.sm,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileTextOutlined style={{ fontSize: '14px', color: colors.primary }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>代码</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary, fontFamily: 'monospace' }}>
                  {selectedReport.company_code || '-'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: borderRadius.sm,
                background: colors.background,
                border: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <BarChartOutlined style={{ fontSize: '14px', color: colors.primary }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>券商</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: colors.textSecondary }}>
                  {selectedReport.broker || '-'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: borderRadius.sm,
                background: `${colors.danger}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DollarOutlined style={{ fontSize: '14px', color: colors.danger }} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: colors.textMuted }}>目标价</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: colors.danger, fontFamily: 'monospace' }}>
                  ¥{selectedReport.target_price ? selectedReport.target_price.toFixed(2) : '-'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 标签页内容 */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ flex: 1, overflow: 'auto' }}
          tabBarStyle={{ 
            padding: '0 28px', 
            margin: 0, 
            background: colors.surface, 
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <TabPane 
            tab={<span><FileTextOutlined />研报内容</span>} 
            key="content"
          >
            <div style={{ padding: '24px' }}>
              {selectedReport.content ? (
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.8',
                  fontSize: '14px',
                  color: colors.textPrimary,
                  background: colors.surface,
                  padding: '20px',
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border}`,
                }}>
                  {selectedReport.content}
                </div>
              ) : (
                <div>
                  <Card 
                    title={<span style={{ color: colors.primary, fontWeight: 600 }}>核心观点摘要</span>} 
                    style={{ 
                      marginBottom: 16, 
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.border}`,
                      boxShadow: shadows.card,
                    }}
                    headStyle={{ borderBottom: `1px solid ${colors.divider}` }}
                  >
                    <Paragraph style={{ fontSize: '14px', lineHeight: '1.8', color: colors.textSecondary }}>
                      {selectedReport.core_views || '暂无核心观点'}
                    </Paragraph>
                  </Card>
                  <Card 
                    title={<span style={{ color: colors.primary, fontWeight: 600 }}>财务预测</span>} 
                    style={{ 
                      marginBottom: 16,
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.border}`,
                      boxShadow: shadows.card,
                    }}
                    headStyle={{ borderBottom: `1px solid ${colors.divider}` }}
                  >
                    {selectedReport.financial_forecast && Object.keys(selectedReport.financial_forecast).length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {Object.entries(selectedReport.financial_forecast).map(([key, value]) => (
                          <Col span={8} key={key}>
                            <Card 
                              size="small" 
                              style={{
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.border}`,
                                background: colors.background,
                              }}
                            >
                              <Text style={{ fontSize: '12px', color: colors.textMuted }}>{key}</Text>
                              <div><Text strong style={{ fontSize: '20px', color: colors.primary, fontFamily: 'monospace' }}>{value}</Text></div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Empty description="暂无财务预测数据" />
                    )}
                  </Card>
                </div>
              )}
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><BarChartOutlined />研报总结</span>} 
            key="summary"
          >
            <div style={{ padding: '24px' }}>
              {selectedReport.summary ? (
                <div>
                  <Card title="核心观点" size="small" style={{ marginBottom: 16 }}>
                    <Paragraph>{selectedReport.summary.key_points || '暂无核心观点'}</Paragraph>
                  </Card>
                  <Card title="投资亮点" size="small" style={{ marginBottom: 16 }}>
                    <Paragraph>{selectedReport.summary.investment_highlights || '暂无投资亮点'}</Paragraph>
                  </Card>
                  <Card title="风险提示" size="small">
                    <Paragraph>{selectedReport.summary.risk_warnings || '暂无风险提示'}</Paragraph>
                  </Card>
                </div>
              ) : (
                <div>
                  <Card title="核心观点" size="small" style={{ marginBottom: 16 }}>
                    <Paragraph>{selectedReport.core_views || '暂无核心观点'}</Paragraph>
                  </Card>
                  <Card title="投资评级" size="small" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <Text type="secondary">评级:</Text>
                        <div><Tag color="blue" style={{ fontSize: '16px' }}>{selectedReport.rating || '-'}</Tag></div>
                      </div>
                      <div>
                        <Text type="secondary">目标价:</Text>
                        <div><Text strong style={{ fontSize: '18px', color: '#f5222d' }}>¥{selectedReport.target_price || '-'}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">当前价:</Text>
                        <div><Text strong style={{ fontSize: '18px' }}>¥{selectedReport.current_price || '-'}</Text></div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><TagsOutlined />关键摘要</span>} 
            key="abstract"
          >
            <div style={{ padding: '24px' }}>
              <Card title="研报摘要" style={{ marginBottom: 16 }}>
                <Paragraph style={{ fontSize: '14px', lineHeight: '2' }}>
                  <strong>标题：</strong>{selectedReport.title}
                </Paragraph>
                <Paragraph style={{ fontSize: '14px', lineHeight: '2' }}>
                  <strong>公司：</strong>{selectedReport.company} ({selectedReport.company_code})
                </Paragraph>
                <Paragraph style={{ fontSize: '14px', lineHeight: '2' }}>
                  <strong>券商：</strong>{selectedReport.broker}
                </Paragraph>
                <Paragraph style={{ fontSize: '14px', lineHeight: '2' }}>
                  <strong>分析师：</strong>{selectedReport.analyst}
                </Paragraph>
                <Divider />
                <Paragraph style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <strong>核心观点：</strong>
                  <br />
                  {selectedReport.core_views}
                </Paragraph>
              </Card>
              
              <Card title="投资要点">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Card size="small" title="评级信息">
                      <Space direction="vertical">
                        <Text>投资评级: <Tag color="green">{selectedReport.rating}</Tag></Text>
                        <Text>目标价格: <Text strong type="danger">¥{selectedReport.target_price}</Text></Text>
                        <Text>当前价格: <Text strong>¥{selectedReport.current_price}</Text></Text>
                        <Text>上涨空间: <Text strong type={((selectedReport.target_price || 0) / (selectedReport.current_price || 1) - 1) > 0 ? 'success' : 'danger'}>
                          {selectedReport.current_price ? `${(((selectedReport.target_price || 0) / selectedReport.current_price - 1) * 100).toFixed(2)}%` : '-'}
                        </Text></Text>
                      </Space>
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small" title="财务预测概览">
                      <Space direction="vertical">
                        {selectedReport.financial_forecast ? (
                          <>
                            <Text>2024营收: <Text strong>{selectedReport.financial_forecast.revenue_2024}亿元</Text></Text>
                            <Text>2025营收: <Text strong>{selectedReport.financial_forecast.revenue_2025}亿元</Text></Text>
                            <Text>2024净利润: <Text strong>{selectedReport.financial_forecast.net_profit_2024}亿元</Text></Text>
                            <Text>2025净利润: <Text strong>{selectedReport.financial_forecast.net_profit_2025}亿元</Text></Text>
                          </>
                        ) : (
                          <Text type="secondary">暂无财务预测</Text>
                        )}
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </Card>
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><MessageOutlined />批注</span>} 
            key="annotations"
          >
            <div style={{ padding: '24px' }}>
              <Empty 
                description="暂无批注，批注功能开发中..." 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          </TabPane>
          
          <TabPane 
            tab={<span><FileSearchOutlined />元数据</span>} 
            key="metadata"
          >
            <div style={{ padding: '24px' }}>
              <Card>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text type="secondary">报告ID:</Text>
                    <div><Text copyable>{selectedReport.id}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">文件名:</Text>
                    <div><Text>{selectedReport.filename}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">文件类型:</Text>
                    <div><Text>{selectedReport.file_type}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">文件大小:</Text>
                    <div><Text>{selectedReport.file_size ? `${(selectedReport.file_size / 1024 / 1024).toFixed(2)} MB` : '-'}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">解析状态:</Text>
                    <div>{getStatusTag(selectedReport.status)}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">上传时间:</Text>
                    <div><Text>{new Date(selectedReport.created_at).toLocaleString()}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">分析师:</Text>
                    <div><Text>{selectedReport.analyst || '-'}</Text></div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">报告日期:</Text>
                    <div><Text>{selectedReport.report_date || '-'}</Text></div>
                  </Col>
                </Row>
              </Card>
            </div>
          </TabPane>
        </Tabs>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* 左侧：研报列表 */}
      <div style={{ 
        width: '320px', 
        minWidth: '320px',
        borderRight: `1px solid ${colors.border}`, 
        display: 'flex', 
        flexDirection: 'column',
        background: colors.surface,
        boxShadow: shadows.sm,
      }}>
        {/* 左侧头部 */}
        <div style={{ padding: '16px', borderBottom: `1px solid ${colors.border}`, background: colors.background }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: 12 }}>
            <Button
              icon={<CloudDownloadOutlined />}
              onClick={handleFetchReports}
              loading={fetching}
              style={{
                flex: 1,
                background: gradients.primary,
                border: 'none',
                color: '#fff',
                borderRadius: borderRadius.md,
                height: '38px',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: shadows.md,
              }}
            >
              抓取研报
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
              style={{
                flex: 1,
                background: gradients.accent,
                color: colors.textPrimary,
                border: 'none',
                borderRadius: borderRadius.md,
                height: '38px',
                fontWeight: 600,
                fontSize: '13px',
                boxShadow: `${shadows.md}, ${shadows.glow}`,
              }}
            >
              上传研报
            </Button>
          </div>
          <Search
            placeholder="搜索公司名称、股票代码、券商..."
            allowClear
            enterButton={<SearchOutlined />}
            onSearch={handleSearch}
            style={{ width: '100%' }}
          />
        </div>

        {/* 研报卡片列表 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <List
            loading={loading}
            dataSource={reports}
            renderItem={(report) => renderReportCard(report)}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page) => fetchReports(page, searchKeyword),
              size: 'small',
              style: { marginTop: 16, textAlign: 'center' }
            }}
          />
        </div>
      </div>

      {/* 中间/右侧：研报详情 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        background: colors.surface,
      }}>
        {renderReportDetail()}
      </div>

      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={() => {
          setUploadModalVisible(false);
          fetchReports(1, searchKeyword);
        }}
      />
    </div>
  );
}
