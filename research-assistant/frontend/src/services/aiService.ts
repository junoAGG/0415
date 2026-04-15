import type { AIQueryRequest, AIQueryResponse, CompareResponse, ChatSession, ChatMessage, AIStreamRequest, SSEChunk } from '../types/analysis';

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
  compareReports: async (reportIds: string[], compareType: string, dimensions?: string[]): Promise<CompareResponse> => {
    return request<CompareResponse>('/analysis/compare', {
      method: 'POST',
      body: JSON.stringify({
        report_ids: reportIds,
        compare_type: compareType,
        dimensions: dimensions,
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

  // ========== 流式问答 ==========

  // 流式AI问答（SSE）
  streamAskQuestion(
    params: AIStreamRequest,
    onChunk: (chunk: string) => void,
    onDone: (sources: Array<{ report_id: string; report_title: string; excerpt: string }>) => void,
    onSessionId?: (sessionId: string) => void,
  ): AbortController {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/analysis/query-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMsg = `请求失败 (${response.status})`;
          try {
            const errData = await response.json();
            if (errData.message) errMsg = errData.message;
          } catch { /* ignore */ }
          onChunk(`\n\n[错误] ${errMsg}`);
          onDone([]);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onChunk('\n\n[错误] 无法读取响应流');
          onDone([]);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 按换行拆分，处理可能的多行粘连
          const lines = buffer.split('\n');
          // 最后一段可能不完整，保留到下次
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const jsonStr = trimmed.slice(6); // 去掉 "data: "
            try {
              const chunk: SSEChunk = JSON.parse(jsonStr);

              if (chunk.session_id && onSessionId) {
                onSessionId(chunk.session_id);
              }

              // 如果服务端标记了错误，展示错误并结束
              if (chunk.error) {
                onChunk(`\n\n⚠️ ${chunk.error}`);
                onDone([]);
                return;
              }

              if (!chunk.done && chunk.content) {
                onChunk(chunk.content);
              }

              if (chunk.done) {
                onDone(chunk.sources || []);
              }
            } catch {
              // 忽略无法解析的行
            }
          }
        }

        // 处理 buffer 中可能残留的最后一行
        if (buffer.trim().startsWith('data: ')) {
          const jsonStr = buffer.trim().slice(6);
          try {
            const chunk: SSEChunk = JSON.parse(jsonStr);
            if (chunk.session_id && onSessionId) {
              onSessionId(chunk.session_id);
            }
            if (chunk.error) {
              onChunk(`\n\n⚠️ ${chunk.error}`);
              onDone([]);
              return;
            }
            if (!chunk.done && chunk.content) {
              onChunk(chunk.content);
            }
            if (chunk.done) {
              onDone(chunk.sources || []);
            }
          } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // 用户主动取消，不报错
          return;
        }
        const message = err instanceof Error ? err.message : '未知错误';
        onChunk(`\n\n[错误] 网络连接失败，请检查网络: ${message}`);
        onDone([]);
      }
    })();

    return controller;
  },

  // ========== 会话管理（新端点） ==========

  // 获取会话列表
  getSessions: async (): Promise<ChatSession[]> => {
    const data = await request<{ sessions: ChatSession[] }>('/sessions');
    return data.sessions;
  },

  // 创建新会话
  createNewSession: async (title?: string, reportIds?: string[]): Promise<ChatSession> => {
    const data = await request<{ session: ChatSession }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, report_ids: reportIds }),
      signal: AbortSignal.timeout(30000),
    });
    return data.session;
  },

  // 获取会话消息历史
  getSessionMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const data = await request<{ messages: ChatMessage[] }>(`/sessions/${sessionId}/messages`, {
      signal: AbortSignal.timeout(30000),
    });
    return data.messages;
  },

  // 删除会话
  removeSession: async (sessionId: string): Promise<void> => {
    await request<void>(`/sessions/${sessionId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(30000),
    });
  },

  // 重命名会话
  updateSession: async (sessionId: string, title: string): Promise<any> => {
    return request('/sessions/' + sessionId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
  },
};

export default aiService;
