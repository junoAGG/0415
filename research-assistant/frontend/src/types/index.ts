// 研报总结
export interface ReportSummary {
  key_points: string;
  investment_highlights: string;
  risk_warnings: string;
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
