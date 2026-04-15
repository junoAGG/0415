import { useState, useEffect } from 'react';
import { Card, Tag, Row, Col, Statistic, Spin, Empty, Typography, Divider, message, Alert } from 'antd';
import { 
  StockOutlined, RiseOutlined, FallOutlined, 
  BarChartOutlined, LineChartOutlined,
  ReloadOutlined, InfoCircleOutlined, TeamOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { stockApi } from '../services/api';
import type { StockFullData } from '../types';
import { colors, gradients, shadows, borderRadius } from '../styles/fintech-theme';
import { 
  CandlestickChart, VolumeChart, FinancialRadar, 
  PeerComparisonChart, HolderStructureChart, TechnicalIndicators 
} from './StockCharts';

const { Text, Paragraph } = Typography;

const TAB_LIST = [
  { key: 'overview', icon: <BarChartOutlined />, label: '行情图表' },
  { key: 'financial', icon: <DollarOutlined />, label: '财务分析' },
  { key: 'holders', icon: <TeamOutlined />, label: '股东结构' },
  { key: 'peers', icon: <LineChartOutlined />, label: '同业对比' },
  { key: 'company', icon: <InfoCircleOutlined />, label: '公司资料' },
];

interface StockInfoCardProps {
  stockCode: string;
}

export default function StockInfoCard({ stockCode }: StockInfoCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StockFullData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!stockCode) return;
    
    fetchStockData();
  }, [stockCode]);

  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    try {
      const fullData = await stockApi.getFullData(stockCode);
      setData(fullData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '获取股票数据失败';
      console.error('获取股票数据失败:', err);
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number | undefined, decimals = 2) => {
    if (num === undefined || num === null) return '-';
    return num.toFixed(decimals);
  };

  const formatVolume = (num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万';
    }
    return num.toString();
  };

  const formatMarketCap = (num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '万亿';
    }
    return num.toFixed(2) + '亿';
  };

  const formatAmount = (num: number | undefined) => {
    if (num === undefined || num === null) return '-';
    if (num >= 10000) {
      return (num / 10000).toFixed(2) + '亿';
    }
    return num.toFixed(2) + '万';
  };

  if (loading) {
    return (
      <Card style={{ borderRadius: borderRadius.lg, boxShadow: shadows.card }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <p style={{ marginTop: 16, color: colors.textMuted }}>加载股票数据中...</p>
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card style={{ borderRadius: borderRadius.lg, boxShadow: shadows.card }}>
        {error ? (
          <Alert
            type="error"
            message="获取失败"
            description={error}
            showIcon
            action={
              <span
                style={{ cursor: 'pointer', color: colors.primary }}
                onClick={fetchStockData}
              >
                重试
              </span>
            }
          />
        ) : (
          <Empty description="暂无股票数据" />
        )}
      </Card>
    );
  }

  const quote = data.quote;
  const financial = data.financial;
  const company = data.company;
  const isUp = (quote?.change_percent || 0) >= 0;
  const changeColor = isUp ? colors.danger : colors.success;
  const ChangeIcon = isUp ? RiseOutlined : FallOutlined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 头部 - 股票基本信息 */}
      <Card 
        style={{ borderRadius: borderRadius.lg, boxShadow: shadows.card }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: borderRadius.md,
              background: gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <StockOutlined style={{ fontSize: '24px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: 600, 
                color: colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {data.basic.name}
                <Tag style={{ 
                  fontSize: '12px', 
                  background: colors.background,
                  border: `1px solid ${colors.border}`,
                  color: colors.textMuted,
                  borderRadius: borderRadius.sm,
                  margin: 0,
                }}>
                  {data.basic.code}
                </Tag>
              </div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>
                {data.basic.industry} · {data.basic.sector || '其他'}
              </div>
            </div>
          </div>
          <ReloadOutlined 
            style={{ color: colors.primary, cursor: 'pointer', fontSize: '18px' }}
            onClick={fetchStockData}
          />
        </div>

        {/* 价格区域 */}
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: isUp ? '#fff5f5' : '#f6ffed',
          borderRadius: borderRadius.md,
          border: `1px solid ${isUp ? '#ffccc7' : '#b7eb8f'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <span style={{ 
              fontSize: '36px', 
              fontWeight: 700, 
              color: changeColor,
              fontFamily: 'monospace'
            }}>
              ¥{formatNumber(quote?.current_price)}
            </span>
            <span style={{ 
              fontSize: '16px', 
              color: changeColor,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}>
              <ChangeIcon />
              {isUp ? '+' : ''}{formatNumber(quote?.change_percent)}%
            </span>
            <span style={{ 
              fontSize: '14px', 
              color: changeColor,
            }}>
              {isUp ? '+' : ''}{formatNumber(quote?.change_amount)}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '8px' }}>
            更新时间: {quote?.update_time || '-'} | 成交量: {formatVolume(quote?.volume)}手
          </div>
        </div>
      </Card>

      {/* 图表标签页 */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '10px 4px 0',
        overflowX: 'auto',
        borderBottom: `1px solid ${colors.border}`,
        background: 'rgba(255,255,255,0.74)',
      }}>
        {TAB_LIST.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              borderRadius: '10px 10px 0 0',
              border: activeTab === tab.key ? `1px solid ${colors.border}` : '1px solid transparent',
              borderBottom: activeTab === tab.key ? '1px solid #fff' : '1px solid transparent',
              background: activeTab === tab.key ? 'linear-gradient(180deg, #ffffff, #f6fbff)' : 'none',
              color: activeTab === tab.key ? colors.primary : colors.textMuted,
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: '0.2s ease',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* K线图 */}
            <CandlestickChart data={data.history || []} />
            
            {/* 成交量图 */}
            <VolumeChart data={data.history || []} />
            
            {/* 技术指标 */}
            <TechnicalIndicators data={data.technicals || { ma5: 0, ma10: 0, ma20: 0, ma60: 0, rsi14: 50, macd: 0 }} />
            
            {/* 行情数据表格 */}
            <Card title="详细行情" size="small" style={{ borderRadius: borderRadius.md }}>
              <Row gutter={[16, 16]}>
                <Col span={8}><Statistic title="今开" value={formatNumber(quote?.open)} prefix="¥" valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="最高" value={formatNumber(quote?.high)} prefix="¥" valueStyle={{ fontSize: 13, color: colors.danger }} /></Col>
                <Col span={8}><Statistic title="最低" value={formatNumber(quote?.low)} prefix="¥" valueStyle={{ fontSize: 13, color: colors.success }} /></Col>
                <Col span={8}><Statistic title="昨收" value={formatNumber(quote?.prev_close)} prefix="¥" valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="总市值" value={formatMarketCap(quote?.market_cap)} valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="成交额" value={formatAmount(quote?.turnover)} valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="市盈率(PE)" value={formatNumber(quote?.pe_ratio)} valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="市净率(PB)" value={formatNumber(quote?.pb_ratio)} valueStyle={{ fontSize: 13 }} /></Col>
                <Col span={8}><Statistic title="换手率" value={formatNumber(quote?.turnover_rate)} suffix="%" valueStyle={{ fontSize: 13 }} /></Col>
              </Row>
            </Card>
          </div>
      )}

      {activeTab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 财务雷达图 */}
            <FinancialRadar data={financial || {} as any} />
            
            {/* 盈利能力 */}
            <Card title="盈利能力" size="small" style={{ borderRadius: borderRadius.md }}>
              <Row gutter={[16, 16]}>
                <Col span={8}><Statistic title="ROE" value={formatNumber(financial?.roe)} suffix="%" valueStyle={{ color: colors.primary }} /></Col>
                <Col span={8}><Statistic title="ROA" value={formatNumber(financial?.roa)} suffix="%" /></Col>
                <Col span={8}><Statistic title="毛利率" value={formatNumber(financial?.gross_margin)} suffix="%" /></Col>
                <Col span={8}><Statistic title="净利率" value={formatNumber(financial?.net_margin)} suffix="%" /></Col>
                <Col span={8}><Statistic title="营业利润率" value={formatNumber(financial?.operating_margin)} suffix="%" /></Col>
                <Col span={8}><Statistic title="EPS" value={formatNumber(financial?.eps)} prefix="¥" /></Col>
              </Row>
            </Card>
            
            {/* 成长能力 */}
            <Card title="成长能力" size="small" style={{ borderRadius: borderRadius.md }}>
              <Row gutter={[16, 16]}>
                <Col span={8}><Statistic title="营收增长" value={formatNumber(financial?.revenue_growth)} suffix="%" valueStyle={{ color: (financial?.revenue_growth || 0) > 0 ? colors.danger : colors.success }} /></Col>
                <Col span={8}><Statistic title="净利润增长" value={formatNumber(financial?.profit_growth)} suffix="%" valueStyle={{ color: (financial?.profit_growth || 0) > 0 ? colors.danger : colors.success }} /></Col>
                <Col span={8}><Statistic title="ROIC" value={formatNumber(financial?.roic)} suffix="%" /></Col>
              </Row>
            </Card>
            
            {/* 资产负债 */}
            <Card title="资产负债" size="small" style={{ borderRadius: borderRadius.md }}>
              <Row gutter={[16, 16]}>
                <Col span={8}><Statistic title="资产负债率" value={formatNumber(financial?.debt_ratio)} suffix="%" /></Col>
                <Col span={8}><Statistic title="流动比率" value={formatNumber(financial?.current_ratio)} /></Col>
                <Col span={8}><Statistic title="速动比率" value={formatNumber(financial?.quick_ratio)} /></Col>
              </Row>
            </Card>
          </div>
      )}

      {activeTab === 'holders' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 股东结构饼图 */}
            <HolderStructureChart data={data.holders || { institutional_holdings: 0, northbound_holdings: 0, fund_holdings: 0, insurance_holdings: 0, qfii_holdings: 0 }} />
            
            {/* 持股详情 */}
            <Card title="持股详情" size="small" style={{ borderRadius: borderRadius.md }}>
              <Row gutter={[16, 16]}>
                <Col span={12}><Statistic title="总股东数" value={formatNumber(data.holders?.total_holders, 0)} suffix="户" /></Col>
                <Col span={12}><Statistic title="机构持股" value={formatNumber(data.holders?.institutional_holdings)} suffix="%" /></Col>
                <Col span={12}><Statistic title="北向资金" value={formatNumber(data.holders?.northbound_holdings)} suffix="%" /></Col>
                <Col span={12}><Statistic title="基金持股" value={formatNumber(data.holders?.fund_holdings)} suffix="%" /></Col>
                <Col span={12}><Statistic title="保险持股" value={formatNumber(data.holders?.insurance_holdings)} suffix="%" /></Col>
                <Col span={12}><Statistic title="QFII持股" value={formatNumber(data.holders?.qfii_holdings)} suffix="%" /></Col>
              </Row>
            </Card>
          </div>
      )}

      {activeTab === 'peers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 同业对比图 */}
            <PeerComparisonChart data={data.peer_comparison || []} currentStock={data.basic.name} />
            
            {/* 对比表格 */}
            <Card title="同业公司对比" size="small" style={{ borderRadius: borderRadius.md }}>
              {(data.peer_comparison || []).map((peer, index) => (
                <div key={peer.code} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: index < (data.peer_comparison?.length || 0) - 1 ? `1px solid ${colors.border}` : 'none'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{peer.name}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>{peer.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>¥{formatNumber(peer.current_price)}</div>
                    <div style={{ 
                      fontSize: 13, 
                      fontWeight: 500,
                      color: peer.change_percent >= 0 ? colors.danger : colors.success 
                    }}>
                      {peer.change_percent >= 0 ? '+' : ''}{formatNumber(peer.change_percent)}%
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
      )}

      {activeTab === 'company' && (
          <Card style={{ borderRadius: borderRadius.md }}>
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ fontSize: 16 }}>{company?.full_name}</Text>
            </div>
            <Paragraph style={{ color: colors.textSecondary, lineHeight: 1.8 }}>
              {company?.description}
            </Paragraph>
            <Divider style={{ margin: '16px 0' }} />
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>成立时间</div>
                <div style={{ fontWeight: 500 }}>{company?.founded_year}年</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>上市日期</div>
                <div style={{ fontWeight: 500 }}>{company?.listing_date}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>总部所在地</div>
                <div style={{ fontWeight: 500 }}>{company?.headquarters}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>员工人数</div>
                <div style={{ fontWeight: 500 }}>{company?.employees?.toLocaleString()}人</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>董事长</div>
                <div style={{ fontWeight: 500 }}>{company?.chairman}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12, color: colors.textMuted }}>CEO</div>
                <div style={{ fontWeight: 500 }}>{company?.ceo}</div>
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <div>
              <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: '8px' }}>核心产品</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(company?.core_products || []).map((product, index) => (
                  <Tag key={index} color="blue" style={{ borderRadius: borderRadius.sm }}>
                    {product}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
      )}
    </div>
  );
}
