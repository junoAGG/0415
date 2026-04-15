import { Card, Row, Col, Empty } from 'antd';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import type { StockHistory, StockPeer, StockFinancial } from '../types';
import { colors, borderRadius } from '../styles/fintech-theme';

// K线图组件
interface CandlestickChartProps {
  data: StockHistory[];
}

export function CandlestickChart({ data }: CandlestickChartProps) {
  // 空数据检查
  if (!data || data.length === 0) {
    return (
      <Card title="K线走势" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  // 转换数据为K线格式
  const chartData = data.map(item => ({
    date: item.date.slice(5), // 只显示月-日
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume / 10000, // 转换为万手
    change: item.change_percent,
  }));

  return (
    <Card title="K线走势" size="small" style={{ borderRadius: borderRadius.md }} bodyStyle={{ padding: '6px 2px 2px' }}>
      <ResponsiveContainer width="100%" height={170}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 9 }}
            interval="preserveStartEnd"
            tickMargin={2}
          />
          <YAxis 
            yAxisId="price"
            domain={['auto', 'auto']}
            tick={{ fontSize: 8 }}
            width={32}
            tickFormatter={(v) => String(v)}
          />
          <YAxis 
            yAxisId="volume"
            orientation="right"
            tick={{ fontSize: 8 }}
            width={28}
            tickFormatter={(v) => `${v.toFixed(0)}`}
          />
          <Tooltip 
            formatter={(value: any, name: string) => {
              const numValue = Number(value);
              if (name === 'volume') return [`${numValue.toFixed(2)}万手`, '成交量'];
              return [`¥${numValue.toFixed(2)}`, name];
            }}
            labelStyle={{ fontSize: 12 }}
          />
          <Bar 
            yAxisId="volume"
            dataKey="volume" 
            fill={colors.primary + '40'}
            barSize={6}
          />
          <Line 
            yAxisId="price"
            type="monotone" 
            dataKey="close" 
            stroke={colors.primary}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

// 成交量图
interface VolumeChartProps {
  data: StockHistory[];
}

export function VolumeChart({ data }: VolumeChartProps) {
  // 空数据检查
  if (!data || data.length === 0) {
    return (
      <Card title="成交量趋势" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  const chartData = data.map(item => ({
    date: item.date.slice(5),
    volume: item.volume / 10000,
    turnover: item.turnover / 10000,
  }));

  return (
    <Card title="成交量趋势" size="small" style={{ borderRadius: borderRadius.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.accent} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colors.accent} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickMargin={4} />
          <YAxis tick={{ fontSize: 9 }} width={45} tickFormatter={(v) => `${v.toFixed(0)}万`} />
          <Tooltip 
            formatter={(value: any) => [`${Number(value).toFixed(2)}万手`, '成交量']}
            labelStyle={{ fontSize: 12 }}
          />
          <Area 
            type="monotone" 
            dataKey="volume" 
            stroke={colors.accent}
            fillOpacity={1} 
            fill="url(#volumeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

// 财务指标雷达图
interface FinancialRadarProps {
  data: StockFinancial;
}

export function FinancialRadar({ data }: FinancialRadarProps) {
  // 空数据检查
  if (!data) {
    return (
      <Card title="财务能力雷达" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  const radarData = [
    { subject: '盈利能力', A: Math.min(data.roe * 2, 100), fullMark: 100 },
    { subject: '成长能力', A: Math.min(Math.max(data.revenue_growth + 50, 0), 100), fullMark: 100 },
    { subject: '运营效率', A: Math.min((data.asset_turnover || 0.5) * 80, 100), fullMark: 100 },
    { subject: '偿债能力', A: Math.min(data.current_ratio * 40, 100), fullMark: 100 },
    { subject: '现金流', A: Math.min((data.fcf_yield || 3) * 10, 100), fullMark: 100 },
    { subject: '估值优势', A: Math.min((50 - (data.pe_ratio || 20)) * 2, 100), fullMark: 100 },
  ];

  return (
    <Card title="财务能力雷达" size="small" style={{ borderRadius: borderRadius.md }}>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
          <Radar
            name="财务指标"
            dataKey="A"
            stroke={colors.primary}
            fill={colors.primary}
            fillOpacity={0.4}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// 同业对比柱状图
interface PeerComparisonProps {
  data: StockPeer[];
  currentStock: string;
}

export function PeerComparisonChart({ data, currentStock }: PeerComparisonProps) {
  // 空数据检查
  if (!data || data.length === 0) {
    return (
      <Card title="同业估值对比" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  const chartData = data.map(peer => ({
    name: peer.name,
    pe: peer.pe_ratio,
    pb: peer.pb_ratio,
    roe: peer.roe,
    isCurrent: peer.name === currentStock,
  }));

  const barHeight = Math.max(180, chartData.length * 52);

  // 自定义Tooltip，展示公司名+ROE
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload;
    return (
      <div style={{
        background: '#fff', border: `1px solid ${colors.border}`,
        borderRadius: 8, padding: '10px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{label}</div>
        <div style={{ color: colors.accent, fontSize: 12 }}>ROE : {item?.roe?.toFixed(2)}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ fontSize: 12, color: colors.textPrimary, marginTop: 2 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />
            {p.name} : {Number(p.value).toFixed(2)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card title="同业估值对比" size="small" style={{ borderRadius: borderRadius.md }}>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: colors.textPrimary, fontWeight: 500 }}
            width={68}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          <Bar dataKey="pb" name="市净率" fill={colors.accent} radius={[0, 4, 4, 0]} barSize={14} />
          <Bar dataKey="pe" name="市盈率" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// 股东结构饼图
interface HolderStructureProps {
  data: {
    institutional_holdings: number;
    northbound_holdings: number;
    fund_holdings: number;
    insurance_holdings: number;
    qfii_holdings: number;
  };
}

export function HolderStructureChart({ data }: HolderStructureProps) {
  // 空数据检查
  if (!data) {
    return (
      <Card title="股东结构" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  const pieData = [
    { name: '机构持股', value: data.institutional_holdings, color: colors.primary },
    { name: '北向资金', value: data.northbound_holdings, color: colors.accent },
    { name: '基金持股', value: data.fund_holdings, color: colors.success },
    { name: '保险持股', value: data.insurance_holdings, color: colors.warning },
    { name: 'QFII', value: data.qfii_holdings, color: colors.info },
    { name: '其他', value: Math.max(0, 100 - data.institutional_holdings - data.northbound_holdings - data.fund_holdings - data.insurance_holdings - data.qfii_holdings), color: '#e0e0e0' },
  ].filter(item => item.value > 0);

  return (
    <Card title="股东结构" size="small" style={{ borderRadius: borderRadius.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)}%`, '占比']} />
          <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// 技术指标图
interface TechnicalChartProps {
  data: {
    ma5: number;
    ma10: number;
    ma20: number;
    ma60: number;
    rsi14: number;
    macd: number;
  };
}

export function TechnicalIndicators({ data }: TechnicalChartProps) {
  // 空数据检查
  if (!data) {
    return (
      <Card title="均线系统" size="small" style={{ borderRadius: borderRadius.md }}>
        <Empty description="暂无数据" style={{ padding: '40px 0' }} />
      </Card>
    );
  }

  const chartData = [
    { name: 'MA5', value: data.ma5, type: '均线' },
    { name: 'MA10', value: data.ma10, type: '均线' },
    { name: 'MA20', value: data.ma20, type: '均线' },
    { name: 'MA60', value: data.ma60, type: '均线' },
  ];

  return (
    <Card title="均线系统" size="small" style={{ borderRadius: borderRadius.md }}>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value: any) => [`¥${Number(value).toFixed(2)}`, '价格']} />
          <Bar dataKey="value" fill={colors.primary} radius={[4, 4, 0, 0]} barSize={30} />
        </BarChart>
      </ResponsiveContainer>
      <Row gutter={8} style={{ marginTop: 12 }}>
        <Col span={12}>
          <div style={{ textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: '#666' }}>RSI(14)</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: data.rsi14 > 70 ? colors.danger : data.rsi14 < 30 ? colors.success : colors.textPrimary }}>
              {data.rsi14.toFixed(2)}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ textAlign: 'center', padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: '#666' }}>MACD</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: data.macd > 0 ? colors.danger : colors.success }}>
              {data.macd > 0 ? '+' : ''}{data.macd.toFixed(2)}
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
