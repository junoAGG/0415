import type { Report, ReportListResponse, UploadResponse, ApiResponse, ReportListParams, Stock, StockQuote, StockFinancial, StockFullData, StockSearchResponse, StockHistory } from '../types';

const API_BASE = '/api/v1/agent';
const STOCK_API_BASE = '/api/v1';

// 统一请求处理
async function request<T>(url: string, options?: RequestInit, baseUrl: string = API_BASE): Promise<T> {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (data.code !== 0) {
    throw new Error(data.message);
  }

  return data.data;
}

// 研报服务
export const reportApi = {
  // 上传研报
  upload: async (files: FileList): Promise<UploadResponse> => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    const response = await fetch(`${API_BASE}/reports/upload`, {
      method: 'POST',
      body: formData,
    });

    const data: ApiResponse<UploadResponse> = await response.json();
    if (data.code !== 0) {
      throw new Error(data.message);
    }
    return data.data;
  },

  // 获取研报列表
  list: async (params: ReportListParams = {}): Promise<ReportListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.page_size) queryParams.set('page_size', params.page_size.toString());
    if (params.search) queryParams.set('search', params.search);
    if (params.sort_by) queryParams.set('sort_by', params.sort_by);
    if (params.filter_status) queryParams.set('filter_status', params.filter_status);

    return request<ReportListResponse>(`/reports?${queryParams.toString()}`);
  },

  // 获取研报详情
  get: async (id: string): Promise<Report> => {
    return request<Report>(`/reports/${id}`);
  },

  // 删除研报
  delete: async (id: string): Promise<void> => {
    await request<void>(`/reports/${id}`, { method: 'DELETE' });
  },

  // 重新解析
  reparse: async (id: string): Promise<Report> => {
    return request<Report>(`/reports/${id}/reparse`, { method: 'POST' });
  },

  // 拓取研报
  fetch: async (count: number = 5, useAi: boolean = false, company?: string): Promise<{ fetched: number; reports: Report[] }> => {
    return request<{ fetched: number; reports: Report[] }>('/reports/fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count, use_ai: useAi, company }),
    });
  },

  // 下载研报PDF
  getDownloadUrl: (id: string): string => {
    return `${API_BASE}/reports/${id}/download`;
  },

  // 在线预览研报
  getPreviewUrl: (id: string): string => {
    return `${API_BASE}/reports/${id}/preview`;
  },
};

// AI状态服务
export interface AIStatusResponse {
  status: 'connected' | 'disconnected';
  connected: boolean;
  message: string;
  model: string | null;
  service: string;
}

export const aiApi = {
  // 检查AI服务状态
  checkStatus: async (): Promise<AIStatusResponse> => {
    return request<AIStatusResponse>('/ai-status');
  },
};

// 股票数据服务
export const stockApi = {
  // 搜索股票
  search: async (keyword: string): Promise<StockSearchResponse> => {
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    return request<StockSearchResponse>(`/stock/search?${params.toString()}`, undefined, STOCK_API_BASE);
  },

  // 获取股票详情
  getDetail: async (code: string): Promise<Stock> => {
    return request<Stock>(`/stock/${code}`, undefined, STOCK_API_BASE);
  },

  // 获取股票行情
  getQuote: async (code: string): Promise<StockQuote> => {
    return request<StockQuote>(`/stock/${code}/quote`, undefined, STOCK_API_BASE);
  },

  // 获取财务指标
  getFinancial: async (code: string): Promise<StockFinancial> => {
    return request<StockFinancial>(`/stock/${code}/financial`, undefined, STOCK_API_BASE);
  },

  // 获取完整股票数据（行情+财务）
  getFullData: async (code: string): Promise<StockFullData> => {
    return request<StockFullData>(`/stock/${code}/full`, undefined, STOCK_API_BASE);
  },
};

export default {
  report: reportApi,
  ai: aiApi,
  stock: stockApi,
};
