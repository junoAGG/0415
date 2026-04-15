// 智能分析相关类型

// 对比维度
export type CompareDimension = 'rating' | 'financial' | 'views' | 'analyst';

// 维度元数据
export interface DimensionMeta {
  id: CompareDimension;
  label: string;
  icon: string;          // antd icon 名
  description: string;
  scenes: Array<'company' | 'industry' | 'custom'>;  // 适用场景
}

// 预定义维度列表
export const DIMENSION_LIST: DimensionMeta[] = [
  { id: 'rating',    label: '投资评级', icon: 'StarOutlined',       description: '评级、目标价对比',     scenes: ['company','industry','custom'] },
  { id: 'financial', label: '财务预测', icon: 'DollarOutlined',     description: '营收/净利润/EPS预测',  scenes: ['company','custom'] },
  { id: 'views',     label: '核心观点', icon: 'FileTextOutlined',   description: '核心观点异同分析',     scenes: ['company','industry','custom'] },
  { id: 'analyst',   label: '券商分析师', icon: 'TeamOutlined',     description: '不同券商视角对比',     scenes: ['company','custom'] },
];

// 场景 → 推荐维度映射
export const SCENE_DIMENSIONS: Record<string, CompareDimension[]> = {
  company:  ['rating', 'financial', 'views', 'analyst'],
  industry: ['rating', 'views'],
  custom:   ['rating', 'views'],
};

// 对比分析请求
export interface CompareRequest {
  report_ids: string[];
  compare_type: 'company' | 'industry' | 'custom';
  dimensions?: CompareDimension[];   // 对比维度
}

// 单维度分析结果
export interface DimensionResult {
  dimension: CompareDimension;
  dimension_label: string;
  summary: string;
  details: string[];
}

// 对比分析响应
export interface CompareResponse {
  comparison_result: string;
  similarities: string[];
  differences: string[];
  recommendations: string[];
  dimension_results?: DimensionResult[];   // 按维度分析结果
}

// 会话消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    report_id: string;
    report_title: string;
    excerpt: string;
  }>;
  citations?: Array<{
    report_id: string;
    report_title: string;
    page?: number;
    content: string;
  }>;
  timestamp?: string;
}

// 会话
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  message_count?: number;  // 会话消息数量（列表接口返回）
  report_ids?: string[];   // 关联的研报ID列表
  created_at: string;
  updated_at: string;
}

// AI问答请求
export interface AIQueryRequest {
  question: string;
  session_id?: string;
  report_ids?: string[];
}

// AI问答响应
export interface AIQueryResponse {
  answer: string;
  session_id?: string;
  sources: Array<{
    report_id: string;
    report_title: string;
    excerpt: string;
  }>;
  citations?: Array<{
    report_id: string;
    report_title: string;
    page?: number;
    content: string;
  }>;
  confidence: number;
}

// 创建会话请求
export interface CreateSessionRequest {
  title?: string;
  report_ids?: string[];
}

// 分析历史
export interface AnalysisHistory {
  id: string;
  type: 'compare' | 'query';
  title: string;
  created_at: string;
  result_summary: string;
}

// 流式问答请求
export interface AIStreamRequest {
  question: string;
  report_ids?: string[];
  session_id?: string;
}

// SSE chunk 数据
export interface SSEChunk {
  content: string;
  done: boolean;
  error?: string;
  session_id?: string;
  sources?: Array<{
    report_id: string;
    report_title: string;
    excerpt: string;
  }>;
}
