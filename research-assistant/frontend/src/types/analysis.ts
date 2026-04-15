// 智能分析相关类型

// 对比分析请求
export interface CompareRequest {
  report_ids: string[];
  compare_type: 'company' | 'industry' | 'custom';
}

// 对比分析响应
export interface CompareResponse {
  comparison_result: string;
  similarities: string[];
  differences: string[];
  recommendations: string[];
}

// AI问答请求
export interface AIQueryRequest {
  question: string;
  report_ids?: string[];
  context?: string;
}

// AI问答响应
export interface AIQueryResponse {
  answer: string;
  sources: Array<{
    report_id: string;
    report_title: string;
    excerpt: string;
  }>;
  confidence: number;
}

// 分析历史
export interface AnalysisHistory {
  id: string;
  type: 'compare' | 'query';
  title: string;
  created_at: string;
  result_summary: string;
}
