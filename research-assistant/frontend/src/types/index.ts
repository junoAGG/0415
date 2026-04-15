// 研报总结
export interface ReportSummary {
  key_points: string;
  investment_highlights: string;
  risk_warnings: string;
}

// 投资评级
export interface InvestmentRating {
  recommendation?: string;  // 投资建议
  change?: string;          // 评级变化
  time_horizon?: string;    // 投资期限
}

// 盈利能力
export interface Profitability {
  revenue?: number;         // 营业收入(亿元)
  net_profit?: number;      // 净利润(亿元)
  gross_margin?: number;    // 毛利率(%)
  net_margin?: number;      // 净利率(%)
  roe?: number;             // ROE(%)
  roa?: number;             // ROA(%)
  roic?: number;            // ROIC(%)
}

// 成长性
export interface Growth {
  revenue_growth?: number;      // 营收增速(%)
  profit_growth?: number;       // 净利润增速(%)
  net_profit_growth?: number;   // 归母净利润增速(%)
  cagr_3y?: number;             // 3年复合增速(%)
  cagr_5y?: number;             // 5年复合增速(%)
}

// 估值
export interface Valuation {
  pe_ttm?: number;    // PE-TTM
  pe_2024?: number;   // 2024年PE
  pe_2025?: number;   // 2025年PE
  pb?: number;        // PB
  ps?: number;        // PS
  peg?: number;       // PEG
  ev_ebitda?: number; // EV/EBITDA
}

// 偿债能力
export interface Solvency {
  debt_to_asset?: number;      // 资产负债率(%)
  current_ratio?: number;      // 流动比率
  quick_ratio?: number;        // 速动比率
  interest_coverage?: number;  // 利息保障倍数
}

// 现金流
export interface Cashflow {
  operating_cashflow?: number;        // 经营性现金流(亿元)
  free_cashflow?: number;             // 自由现金流(亿元)
  cashflow_per_share?: number;        // 每股现金流(元)
  operating_cashflow_margin?: number; // 现金流利润率(%)
}

// 研报类型
export interface Report {
  id: string;
  title: string;
  company: string;
  company_code: string;
  broker: string;
  analyst: string;
  rating: string;
  target_price?: number;
  current_price?: number;
  core_views: string;
  financial_forecast: Record<string, number>;
  file_path: string;
  filename?: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'parsing' | 'completed' | 'failed';
  parse_error: string;
  created_at: string;
  updated_at: string;
  report_date?: string;
  // 解析后的内容
  content?: string;
  summary?: ReportSummary;
  // 多维度财务指标
  investment_rating?: InvestmentRating;
  profitability?: Profitability;
  growth?: Growth;
  valuation?: Valuation;
  solvency?: Solvency;
  cashflow?: Cashflow;
}

// 研报列表响应
export interface ReportListResponse {
  items: Report[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// 上传响应
export interface UploadResponse {
  uploaded: Array<{
    id: string;
    filename: string;
    status: string;
  }>;
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

// API响应
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  trace_id: string;
}

// 列表查询参数
export interface ReportListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  filter_status?: string;
}

// ============ 股票数据类型 ============

// 股票基础信息
export interface Stock {
  code: string;
  name: string;
  industry: string;
  sector?: string;
  market?: string;
}

// 股票行情数据
export interface StockQuote {
  code: string;
  name: string;
  industry: string;
  current_price: number;
  change_percent: number;
  change_amount: number;
  volume: number;
  turnover: number;
  market_cap: number;
  pe_ratio: number;
  pb_ratio: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  update_time: string;
  // 扩展字段
  circulating_cap?: number;
  turnover_rate?: number;
  dividend_yield?: number;
}

// 股票财务指标
export interface StockFinancial {
  code: string;
  name: string;
  roe: number;
  roa: number;
  gross_margin: number;
  net_margin: number;
  debt_ratio: number;
  current_ratio: number;
  quick_ratio: number;
  revenue_growth: number;
  profit_growth: number;
  eps: number;
  bps: number;
  dividend_yield: number;
  // 扩展字段
  asset_turnover?: number;
  fcf_yield?: number;
  pe_ratio?: number;
  operating_margin?: number;
  roic?: number;
  eps_growth?: number;
}

// 技术指标
export interface StockTechnical {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  ma120: number;
  rsi14: number;
  macd: number;
  kdj_k: number;
  kdj_d: number;
  boll_upper: number;
  boll_middle: number;
  boll_lower: number;
  volume_ma5: number;
  volume_ma20: number;
}

// 股东数据
export interface StockHolders {
  total_holders: number;
  institutional_holders: number;
  institutional_holdings: number;
  top10_holders: number;
  northbound_holdings: number;
  fund_holdings: number;
  insurance_holdings: number;
  qfii_holdings: number;
}

// 历史行情
export interface StockHistory {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
  change_percent: number;
}

// 同业对比
export interface StockPeer {
  code: string;
  name: string;
  current_price: number;
  change_percent: number;
  pe_ratio: number;
  pb_ratio: number;
  market_cap: number;
  roe: number;
}

// 公司信息
export interface CompanyInfo {
  full_name: string;
  description: string;
  founded_year: number;
  listing_date: string;
  headquarters: string;
  employees: number;
  website: string;
  chairman: string;
  ceo: string;
  business_scope: string;
  core_products: string[];
}

// 股票完整数据
export interface StockFullData {
  basic: Stock;
  quote: StockQuote;
  financial: StockFinancial;
  company: CompanyInfo;
  technicals: StockTechnical;
  holders: StockHolders;
  history: StockHistory[];
  peer_comparison: StockPeer[];
}

// 股票搜索结果
export interface StockSearchResponse {
  items: Stock[];
  total: number;
}
