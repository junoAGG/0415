import { useState, useEffect, useCallback } from 'react';
import { message, Spin } from 'antd';
import type { Report, ReportListResponse, StockQuote, StockFinancial, StockHistory } from '../types';
import { reportApi, stockApi } from '../services/api';
import UploadModal from '../components/UploadModal';
import { CandlestickChart } from '../components/StockCharts';

interface ReportListProps {
  onDataChange?: () => void;
  onOpenStockPanel?: (code?: string) => void;
}

export default function ReportList({ onDataChange, onOpenStockPanel }: ReportListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('content');
  const [fetching, setFetching] = useState(false);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [stockFinancial, setStockFinancial] = useState<StockFinancial | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);

  const fetchReports = async (search = '') => {
    setLoading(true);
    try {
      const res: ReportListResponse = await reportApi.list({
        page_size: 100,
        search,
        sort_by: 'created_at',
      });
      setReports(res.items);
      if (!selectedReportId && res.items.length > 0) {
        setSelectedReportId(res.items[0].id);
      }
    } catch {
      message.error('获取研报列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchReports(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const handleDelete = async (id: string) => {
    try {
      await reportApi.delete(id);
      message.success('删除成功');
      fetchReports(searchKeyword);
      onDataChange?.();
    } catch { message.error('删除失败'); }
  };

  const handleReparse = async (id: string) => {
    try {
      await reportApi.reparse(id);
      message.success('重新解析已触发');
      fetchReports(searchKeyword);
      onDataChange?.();
    } catch { message.error('重新解析失败'); }
  };

  const handleFetchReports = async () => {
    setFetching(true);
    try {
      const result = await reportApi.fetch(5, false);
      message.success(`成功抓取 ${result.fetched} 份研报`);
      fetchReports(searchKeyword);
      onDataChange?.();
    } catch { message.error('抓取研报失败'); }
    finally { setFetching(false); }
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setStatusFilter('all');
    setSourceFilter('all');
    fetchReports('');
  };

  // 过滤研报
  const filteredReports = reports.filter(r => {
    const hitStatus = statusFilter === 'all' || r.status === statusFilter;
    // source filter: 简单按ID模式判断
    const isAuto = /^[0-9a-f]{8}-/.test(r.id);
    const hitSource = sourceFilter === 'all' ||
      (sourceFilter === 'auto' && isAuto) ||
      (sourceFilter === 'manual' && !isAuto);
    return hitStatus && hitSource;
  });

  const selectedReport = reports.find(r => r.id === selectedReportId) || filteredReports[0];

  // 当选中研报变化时，加载对应股票数据
  const loadStockData = useCallback(async (code: string) => {
    if (!code) {
      setStockQuote(null);
      setStockFinancial(null);
      return;
    }
    setStockLoading(true);
    try {
      const [quote, financial, fullData] = await Promise.all([
        stockApi.getQuote(code),
        stockApi.getFinancial(code),
        stockApi.getFullData(code).catch(() => null),
      ]);
      setStockQuote(quote);
      setStockFinancial(financial);
      setStockHistory(fullData?.history || []);
    } catch {
      // 数据加载失败，清空
      setStockQuote(null);
      setStockFinancial(null);
      setStockHistory([]);
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedReport?.company_code) {
      loadStockData(selectedReport.company_code);
    } else {
      setStockQuote(null);
      setStockFinancial(null);
    }
  }, [selectedReport?.id, selectedReport?.company_code, loadStockData]);

  const getStatusChipClass = (status: string) => {
    return { completed: 'completed', pending: 'pending', parsing: 'parsing', failed: 'failed' }[status] || 'pending';
  };

  const getStatusText = (status: string) => {
    return { completed: '已完成', pending: '待解析', parsing: '解析中', failed: '失败' }[status] || status;
  };

  const formatNumber = (value: number | undefined, digits = 1) => {
    if (value === undefined || value === null) return '-';
    return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  };

  const calcUpside = (r: Report) => {
    if (!r.target_price || !r.current_price) return null;
    return ((r.target_price - r.current_price) / r.current_price) * 100;
  };

  // 生成模拟图表SVG
  const buildLineChart = (report: Report) => {
    if (!report) return '';
    const seed = (report.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = report.current_price || 100;
    const values = Array.from({ length: 12 }, (_, i) => {
      const drift = (i - 5) * 0.006;
      const wave = Math.sin((seed + i * 17) / 8) * 0.018;
      return +(base * (1 + drift + wave)).toFixed(2);
    });
    const w = 252, h = 128, pad = 10;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (values.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return [x, y];
    });
    const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
    const area = [`${pad},${h - pad}`, ...pts.map(([x, y]) => `${x},${y}`), `${w - pad},${h - pad}`].join(' ');
    return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#1c63af"/><stop offset="100%" stop-color="#f2c75c"/></linearGradient>
        <linearGradient id="lf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="rgba(44,108,176,0.24)"/><stop offset="100%" stop-color="rgba(44,108,176,0.02)"/></linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#lf)"/>
      <polyline points="${polyline}" fill="none" stroke="url(#ls)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === values.length - 1 ? 4 : 2.5}" fill="${i === values.length - 1 ? '#f2c75c' : '#1c63af'}" opacity="${i === values.length - 1 ? 1 : 0.75}"/>`).join('')}
    </svg>`;
  };

  const buildBarChart = (report: Report) => {
    if (!report) return '';
    const seed = (report.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const values = Array.from({ length: 12 }, (_, i) => {
      const wave = Math.abs(Math.sin((seed + i * 11) / 5));
      return Math.round((wave * 1.8 + 0.6) * 10) / 10;
    });
    const w = 252, h = 128;
    const max = Math.max(...values) || 1;
    const bw = 14, gap = 6;
    return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="bf" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#7db8ff"/><stop offset="100%" stop-color="#215eaa"/></linearGradient></defs>
      ${values.map((v, i) => {
        const x = 12 + i * (bw + gap);
        const bh = (v / max) * 92;
        const y = h - 12 - bh;
        return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="url(#bf)" opacity="${i === values.length - 1 ? 1 : 0.82}"/>`;
      }).join('')}
    </svg>`;
  };

  // 渲染研报详情
  const renderDetail = () => {
    if (!selectedReport) {
      return (
        <div className="empty-state">
          <div>
            <h3>未选择研报</h3>
            <p className="report-desc">点击左侧研报查看详情。</p>
          </div>
        </div>
      );
    }

    const r = selectedReport;
    const upside = calcUpside(r);
    const summary = r.summary || { key_points: '', investment_highlights: '', risk_warnings: '' };
    const forecast = r.financial_forecast || {};
    const forecastEntries = [
      ['营收 2024E', forecast.revenue_2024 ? `${formatNumber(forecast.revenue_2024)} 亿元` : '-'],
      ['营收 2025E', forecast.revenue_2025 ? `${formatNumber(forecast.revenue_2025)} 亿元` : '-'],
      ['净利润 2024E', forecast.net_profit_2024 ? `${formatNumber(forecast.net_profit_2024)} 亿元` : '-'],
      ['净利润 2025E', forecast.net_profit_2025 ? `${formatNumber(forecast.net_profit_2025)} 亿元` : '-'],
      ['EPS 2024E', forecast.eps_2024 ? formatNumber(forecast.eps_2024, 2) : '-'],
      ['EPS 2025E', forecast.eps_2025 ? formatNumber(forecast.eps_2025, 2) : '-'],
    ];

    const tabs = [
      { key: 'content', label: '研报内容' },
      { key: 'financials', label: '财务指标' },
      { key: 'summary', label: '研报总结' },
      { key: 'abstract', label: '关键摘要' },
      { key: 'meta', label: '元数据' },
    ];

    const investRating = r.investment_rating;
    const profitability = r.profitability;
    const growth = r.growth;
    const valuation = r.valuation;
    const solvency = r.solvency;
    const cashflowData = r.cashflow;

    const isAuto = /^[0-9a-f]{8}-/.test(r.id);

    return (
      <div className="detail-wrap">
        <div className="detail-hero">
          <div className="tag-row" style={{ marginBottom: 14 }}>
            <span className={`chip ${isAuto ? 'auto' : 'upload'}`}>{isAuto ? '自动抓取' : '手工上传'}</span>
            <span className={`chip ${getStatusChipClass(r.status)}`}>{getStatusText(r.status)}</span>
            <span className="chip rating">{r.rating || '-'}</span>
          </div>
          <h2 className="detail-title">{r.title || '未命名研报'}</h2>
          <div className="detail-meta-grid">
            <div className="meta-box">
              <div className="meta-label">公司 / 代码</div>
              <div className="meta-value">{r.company || '-'}</div>
              <div className="report-desc">{r.company_code || '-'}</div>
            </div>
            <div className="meta-box">
              <div className="meta-label">券商 / 分析师</div>
              <div className="meta-value">{r.broker || '-'}</div>
              <div className="report-desc">{r.analyst || '-'}</div>
            </div>
            <div className="meta-box">
              <div className="meta-label">目标价 / 现价</div>
              <div className="meta-value">¥{formatNumber(r.target_price)} / ¥{formatNumber(r.current_price)}</div>
              <div className="report-desc" style={{ color: upside !== null && upside >= 0 ? 'var(--green)' : 'var(--red)' }}>
                潜在涨幅 {upside !== null ? `${upside.toFixed(1)}%` : '-'}
              </div>
            </div>
            <div className="meta-box">
              <div className="meta-label">投资建议</div>
              <div className="meta-value">{investRating?.recommendation || r.rating || '-'}</div>
              <div className="report-desc">{investRating?.change || '-'} · {investRating?.time_horizon || '-'}</div>
            </div>
          </div>
          {/* 下载/预览操作 */}
          {r.filename && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <a href={reportApi.getDownloadUrl(r.id)} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ fontSize: 12, padding: '4px 12px', textDecoration: 'none' }}>下载PDF</a>
              <a href={reportApi.getPreviewUrl(r.id)} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ fontSize: 12, padding: '4px 12px', textDecoration: 'none' }}>在线预览</a>
            </div>
          )}
        </div>

        <div className="detail-tabs">
          {tabs.map(t => (
            <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="tab-panel" style={{ display: activeTab === 'content' ? 'block' : 'none' }}>
          <div className="section-block">
            <div className="section-kicker">核心观点</div>
            <h3 className="section-title">投资逻辑概览</h3>
            <p className="section-copy">{r.core_views || '暂无核心观点'}</p>
          </div>
          <div className="section-block">
            <div className="section-kicker">正文摘录</div>
            <div className="info-box">
              <p className="section-copy">{r.content || '暂无正文内容'}</p>
            </div>
          </div>
          <div className="section-block">
            <div className="section-kicker">财务预测</div>
            <div className="forecast-grid">
              {forecastEntries.map(([label, value]) => (
                <div className="forecast-box" key={label}>
                  <div className="meta-label">{label}</div>
                  <div className="forecast-value">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 财务指标 Tab */}
        <div className="tab-panel" style={{ display: activeTab === 'financials' ? 'block' : 'none' }}>
          {/* 盈利能力 */}
          {profitability && Object.keys(profitability).length > 0 && (
            <div className="section-block">
              <div className="section-kicker">盈利能力</div>
              <div className="forecast-grid">
                <div className="forecast-box"><div className="meta-label">营业收入</div><div className="forecast-value">{profitability.revenue != null ? `${formatNumber(profitability.revenue)} 亿` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">净利润</div><div className="forecast-value">{profitability.net_profit != null ? `${formatNumber(profitability.net_profit)} 亿` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">毛利率</div><div className="forecast-value">{profitability.gross_margin != null ? `${formatNumber(profitability.gross_margin)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">净利率</div><div className="forecast-value">{profitability.net_margin != null ? `${formatNumber(profitability.net_margin)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">ROE</div><div className="forecast-value">{profitability.roe != null ? `${formatNumber(profitability.roe)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">ROA</div><div className="forecast-value">{profitability.roa != null ? `${formatNumber(profitability.roa)}%` : '-'}</div></div>
              </div>
            </div>
          )}
          {/* 成长性 */}
          {growth && Object.keys(growth).length > 0 && (
            <div className="section-block">
              <div className="section-kicker">成长性</div>
              <div className="forecast-grid">
                <div className="forecast-box"><div className="meta-label">营收增速</div><div className="forecast-value">{growth.revenue_growth != null ? `${formatNumber(growth.revenue_growth)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">利润增速</div><div className="forecast-value">{growth.profit_growth != null ? `${formatNumber(growth.profit_growth)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">归母净利润增速</div><div className="forecast-value">{growth.net_profit_growth != null ? `${formatNumber(growth.net_profit_growth)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">3年CAGR</div><div className="forecast-value">{growth.cagr_3y != null ? `${formatNumber(growth.cagr_3y)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">5年CAGR</div><div className="forecast-value">{growth.cagr_5y != null ? `${formatNumber(growth.cagr_5y)}%` : '-'}</div></div>
              </div>
            </div>
          )}
          {/* 估值 */}
          {valuation && Object.keys(valuation).length > 0 && (
            <div className="section-block">
              <div className="section-kicker">估值指标</div>
              <div className="forecast-grid">
                <div className="forecast-box"><div className="meta-label">PE-TTM</div><div className="forecast-value">{valuation.pe_ttm != null ? formatNumber(valuation.pe_ttm) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">PE(2024E)</div><div className="forecast-value">{valuation.pe_2024 != null ? formatNumber(valuation.pe_2024) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">PE(2025E)</div><div className="forecast-value">{valuation.pe_2025 != null ? formatNumber(valuation.pe_2025) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">PB</div><div className="forecast-value">{valuation.pb != null ? formatNumber(valuation.pb) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">PEG</div><div className="forecast-value">{valuation.peg != null ? formatNumber(valuation.peg) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">EV/EBITDA</div><div className="forecast-value">{valuation.ev_ebitda != null ? formatNumber(valuation.ev_ebitda) : '-'}</div></div>
              </div>
            </div>
          )}
          {/* 偿债能力 */}
          {solvency && Object.keys(solvency).length > 0 && (
            <div className="section-block">
              <div className="section-kicker">偿债能力</div>
              <div className="forecast-grid">
                <div className="forecast-box"><div className="meta-label">资产负债率</div><div className="forecast-value">{solvency.debt_to_asset != null ? `${formatNumber(solvency.debt_to_asset)}%` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">流动比率</div><div className="forecast-value">{solvency.current_ratio != null ? formatNumber(solvency.current_ratio) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">速动比率</div><div className="forecast-value">{solvency.quick_ratio != null ? formatNumber(solvency.quick_ratio) : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">利息保障倍数</div><div className="forecast-value">{solvency.interest_coverage != null ? formatNumber(solvency.interest_coverage) : '-'}</div></div>
              </div>
            </div>
          )}
          {/* 现金流 */}
          {cashflowData && Object.keys(cashflowData).length > 0 && (
            <div className="section-block">
              <div className="section-kicker">现金流</div>
              <div className="forecast-grid">
                <div className="forecast-box"><div className="meta-label">经营性现金流</div><div className="forecast-value">{cashflowData.operating_cashflow != null ? `${formatNumber(cashflowData.operating_cashflow)} 亿` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">自由现金流</div><div className="forecast-value">{cashflowData.free_cashflow != null ? `${formatNumber(cashflowData.free_cashflow)} 亿` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">每股现金流</div><div className="forecast-value">{cashflowData.cashflow_per_share != null ? `${formatNumber(cashflowData.cashflow_per_share, 2)} 元` : '-'}</div></div>
                <div className="forecast-box"><div className="meta-label">现金流利润率</div><div className="forecast-value">{cashflowData.operating_cashflow_margin != null ? `${formatNumber(cashflowData.operating_cashflow_margin)}%` : '-'}</div></div>
              </div>
            </div>
          )}
          {/* 无数据时的提示 */}
          {!profitability && !growth && !valuation && !solvency && !cashflowData && (
            <div className="empty-state" style={{ minHeight: 200 }}>
              <div>
                <h3>暂无财务指标数据</h3>
                <p className="report-desc">该研报未解析出多维度财务指标，请尝试重新解析。</p>
              </div>
            </div>
          )}
        </div>

        <div className="tab-panel" style={{ display: activeTab === 'summary' ? 'block' : 'none' }}>
          <div className="section-block">
            <h3 className="section-title">核心观点摘要</h3>
            <div className="info-box"><p className="section-copy">{summary.key_points || r.core_views || '暂无'}</p></div>
          </div>
          <div className="section-block">
            <h3 className="section-title">投资亮点</h3>
            <div className="info-box"><p className="section-copy">{summary.investment_highlights || '暂无'}</p></div>
          </div>
          <div className="section-block">
            <h3 className="section-title">风险提示</h3>
            <div className="info-box"><p className="section-copy">{summary.risk_warnings || '暂无'}</p></div>
          </div>
        </div>

        <div className="tab-panel" style={{ display: activeTab === 'abstract' ? 'block' : 'none' }}>
          <div className="section-block">
            <div className="brief-box">
              <div className="section-kicker">关键摘要</div>
              <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>一句话判断</h4>
              <p className="section-copy">{r.core_views || '暂无摘要'}</p>
            </div>
          </div>
        </div>

        <div className="tab-panel" style={{ display: activeTab === 'meta' ? 'block' : 'none' }}>
          <div className="forecast-grid">
            <div className="info-box"><div className="meta-label">文件路径</div><div className="section-copy">{r.file_path || '-'}</div></div>
            <div className="info-box"><div className="meta-label">创建时间</div><div className="section-copy">{r.created_at || '-'}</div></div>
            <div className="info-box"><div className="meta-label">更新时间</div><div className="section-copy">{r.updated_at || '-'}</div></div>
            <div className="info-box"><div className="meta-label">状态说明</div><div className="section-copy">{r.status === 'failed' ? r.parse_error : '字段提取完成，可继续进入分析链路。'}</div></div>
            <div className="info-box"><div className="meta-label">文件类型</div><div className="section-copy">{(r.file_type || '').toUpperCase()}</div></div>
            <div className="info-box"><div className="meta-label">来源</div><div className="section-copy">{isAuto ? '自动抓取 / 去重拉新' : '手工上传'}</div></div>
          </div>
        </div>
      </div>
    );
  };

  // 渲染股票侧栏
  const renderStockSidebar = () => {
    if (!selectedReport) return <div className="empty-state"><p>选择研报查看股票数据</p></div>;
    const r = selectedReport;
    const upside = calcUpside(r);

    if (stockLoading) {
      return <div className="empty-state"><Spin /><p style={{ marginTop: 12 }}>加载股票数据...</p></div>;
    }

    const q = stockQuote;
    const f = stockFinancial;

    return (
      <div className="side-stack" style={{ height: '100%', overflow: 'auto' }}>
        <div className="brief-box">
          <div className="section-kicker">标的概览</div>
          <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>{q?.name || r.company} · {q?.code || r.company_code}</h4>
          <p className="section-copy">{q?.industry || '-'}行业 · {r.rating}评级</p>
        </div>

        <div className="stock-overview">
          <div className="stock-kpi">
            <span className="report-desc">现价</span>
            <strong style={{ color: q && q.change_percent >= 0 ? 'var(--green)' : 'var(--red)' }}>
              ¥{q ? formatNumber(q.current_price) : formatNumber(r.current_price)}
            </strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">涨跌幅</span>
            <strong style={{ color: q && q.change_percent >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {q ? `${q.change_percent >= 0 ? '+' : ''}${formatNumber(q.change_percent)}%` : '-'}
            </strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">总市值</span>
            <strong>{q ? `${formatNumber(q.market_cap)} 亿` : '-'}</strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">目标涨幅</span>
            <strong style={{ color: upside !== null && upside >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {upside !== null ? `${upside.toFixed(1)}%` : '-'}
            </strong>
          </div>
        </div>

        {/* 行情详情 */}
        {q && (
          <div className="stock-overview">
            <div className="stock-kpi">
              <span className="report-desc">开盘价</span>
              <strong>¥{formatNumber(q.open)}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">昨收</span>
              <strong>¥{formatNumber(q.prev_close)}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">最高</span>
              <strong>¥{formatNumber(q.high)}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">最低</span>
              <strong>¥{formatNumber(q.low)}</strong>
            </div>
          </div>
        )}

        {/* 成交数据 */}
        {q && (
          <div className="stock-overview">
            <div className="stock-kpi">
              <span className="report-desc">成交量</span>
              <strong>{q.volume ? `${(q.volume / 10000).toFixed(1)}万手` : '-'}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">成交额</span>
              <strong>{q.turnover ? `${formatNumber(q.turnover)}万` : '-'}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">换手率</span>
              <strong>{q.turnover_rate != null ? `${formatNumber(q.turnover_rate)}%` : '-'}</strong>
            </div>
            <div className="stock-kpi">
              <span className="report-desc">股息率</span>
              <strong>{q.dividend_yield != null ? `${formatNumber(q.dividend_yield)}%` : '-'}</strong>
            </div>
          </div>
        )}

        {/* K线走势 */}
        <div style={{ marginTop: 8 }}>
          <CandlestickChart data={stockHistory} />
        </div>

        {/* 估值指标 */}
        <div className="stock-overview">
          <div className="stock-kpi">
            <span className="report-desc">PE(TTM)</span>
            <strong>{q?.pe_ratio != null ? `${formatNumber(q.pe_ratio)}x` : '-'}</strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">PB(MRQ)</span>
            <strong>{q?.pb_ratio != null ? `${formatNumber(q.pb_ratio)}x` : '-'}</strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">一致预期</span>
            <strong>{r.rating || '-'}</strong>
          </div>
          <div className="stock-kpi">
            <span className="report-desc">行业</span>
            <strong>{q?.industry || '-'}</strong>
          </div>
        </div>

        {/* 财务指标 */}
        {f && (
          <div style={{ marginTop: 8 }}>
            <div className="brief-box">
              <div className="section-kicker">核心财务指标</div>
              <div className="stock-overview" style={{ marginTop: 8 }}>
                <div className="stock-kpi">
                  <span className="report-desc">ROE</span>
                  <strong>{formatNumber(f.roe)}%</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">毛利率</span>
                  <strong>{formatNumber(f.gross_margin)}%</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">净利率</span>
                  <strong>{formatNumber(f.net_margin)}%</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">资产负债率</span>
                  <strong>{formatNumber(f.debt_ratio)}%</strong>
                </div>
              </div>
              <div className="stock-overview" style={{ marginTop: 4 }}>
                <div className="stock-kpi">
                  <span className="report-desc">营收增长</span>
                  <strong style={{ color: f.revenue_growth >= 0 ? 'var(--green)' : 'var(--red)' }}>{f.revenue_growth >= 0 ? '+' : ''}{formatNumber(f.revenue_growth)}%</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">利润增长</span>
                  <strong style={{ color: f.profit_growth >= 0 ? 'var(--green)' : 'var(--red)' }}>{f.profit_growth >= 0 ? '+' : ''}{formatNumber(f.profit_growth)}%</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">EPS</span>
                  <strong>{formatNumber(f.eps, 2)}</strong>
                </div>
                <div className="stock-kpi">
                  <span className="report-desc">每股净资产</span>
                  <strong>{formatNumber(f.bps)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 无数据提示 */}
        {!q && !f && !stockLoading && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-faint)', fontSize: 12 }}>
            未获取到股票数据，请确认股票代码是否正确
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 工具栏 */}
      <div className="panel toolbar">
        <div className="toolbar-left">
          <input
            className="toolbar-input"
            value={searchKeyword}
            onChange={handleSearch}
            placeholder="搜索标题 / 公司 / 代码 / 券商"
          />
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">全部状态</option>
            <option value="completed">已完成</option>
            <option value="pending">待解析</option>
            <option value="parsing">解析中</option>
            <option value="failed">解析失败</option>
          </select>
          <select
            className="toolbar-select"
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
          >
            <option value="all">全部来源</option>
            <option value="auto">自动抓取</option>
            <option value="manual">手工上传</option>
          </select>
        </div>
        <div className="toolbar-right">
          <button className="btn secondary" onClick={resetFilters}>重置</button>
          <button className="btn gold" onClick={handleFetchReports} disabled={fetching}>
            {fetching ? '抓取中...' : '抓取研报'}
          </button>
          <button className="btn primary" onClick={() => setUploadModalVisible(true)}>上传研报</button>
        </div>
      </div>

      {/* 三栏布局 */}
      <div className="workspace-grid">
        {/* 左栏：研报池 */}
        <section className="panel" style={{ height: 720 }}>
          <div className="panel-header">
            <div>
              <h3 className="panel-title">研报池</h3>
              <div className="panel-subtitle">左侧筛选 + 快速动作</div>
            </div>
            <strong>{filteredReports.length} 份</strong>
          </div>
          <div className="scroll-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredReports.map(r => {
                  const upside = calcUpside(r);
                  const isAuto = /^[0-9a-f]{8}-/.test(r.id);
                  return (
                    <article
                      key={r.id}
                      className={`report-card ${r.id === selectedReport?.id ? 'active' : ''}`}
                      onClick={() => setSelectedReportId(r.id)}
                      style={{ position: 'relative' }}
                    >
                      <div className="card-actions">
                        <button
                          className="card-icon-btn"
                          data-tip="重解析"
                          onClick={e => { e.stopPropagation(); handleReparse(r.id); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
                          </svg>
                        </button>
                        <button
                          className="card-icon-btn delete"
                          data-tip="删除"
                          onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                      <div className="tag-row">
                        <span className={`chip ${isAuto ? 'auto' : 'upload'}`}>{isAuto ? '自动' : '上传'}</span>
                        <span className={`chip ${getStatusChipClass(r.status)}`}>{getStatusText(r.status)}</span>
                        <span className="chip rating">{r.rating || '-'}</span>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div className="report-title">{r.title || '未命名研报'}</div>
                        <div className="report-desc" style={{ marginTop: 4 }}>{r.company} · {r.company_code} · {r.broker}</div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span className="meta-label">目标价</span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue-5)' }}>¥{formatNumber(r.target_price)}</span>
                          </div>
                          {upside !== null && (
                            <span className="report-desc" style={{ color: upside >= 0 ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                              目标涨幅 {upside.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="report-desc">分析师 {r.analyst || '-'}</div>
                    </article>
                  );
                })}
                {filteredReports.length === 0 && !loading && (
                  <div className="empty-state" style={{ minHeight: 200 }}>
                    <div>
                      <h3 style={{ fontSize: 18 }}>暂无匹配研报</h3>
                      <p className="report-desc">调整搜索词、状态或来源筛选后重试。</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 中栏：研报详情 */}
        <section className="panel" style={{ height: 720, overflow: 'hidden' }}>
          {renderDetail()}
        </section>

        {/* 右栏：股票数据 */}
        <aside className="panel" style={{ height: 720 }}>
          <div className="panel-header">
            <div>
              <h3 className="panel-title">股票数据</h3>
              <div className="panel-subtitle">跟随当前研报切换，展示行情概览</div>
            </div>
            {selectedReport?.company_code && (
              <button
                className="btn secondary"
                style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                onClick={() => onOpenStockPanel?.(selectedReport.company_code)}
              >
                查看完整数据
              </button>
            )}
          </div>
          <div style={{ height: 'calc(100% - 72px)', overflow: 'auto' }}>
            {renderStockSidebar()}
          </div>
        </aside>
      </div>

      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={() => {
          setUploadModalVisible(false);
          fetchReports(searchKeyword);
          onDataChange?.();
        }}
      />
    </>
  );
}
