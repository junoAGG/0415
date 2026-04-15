import type { AIQueryRequest, AIQueryResponse, CompareRequest, CompareResponse } from '../types/analysis';

const API_BASE = '/api/v1/agent';

// 统一请求处理
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(data.message);
  }

  return data.data;
}

// AI服务
export const aiService = {
  // 对比研报
  compareReports: async (reportIds: string[], compareType: string): Promise<CompareResponse> => {
    return request<CompareResponse>('/analysis/compare', {
      method: 'POST',
      body: JSON.stringify({
        report_ids: reportIds,
        compare_type: compareType,
      }),
    });
  },

  // AI问答
  askQuestion: async (params: AIQueryRequest): Promise<AIQueryResponse> => {
    return request<AIQueryResponse>('/analysis/query', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

export default aiService;
