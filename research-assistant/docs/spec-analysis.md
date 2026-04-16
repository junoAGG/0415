# 智能分析模块功能规格文档

## 文档信息

| 项 | 值 |
|---|---|
| 模块名称 | 智能分析模块（Analysis Module） |
| 文档版本 | v1.0 |
| 上游文档 | `ui-ux-design.md` |

---

## 1. 后端 API 变更规格

### 1.1 统一错误响应格式

```json
{
  "code": "ERROR_CODE",
  "message": "用户可见的错误描述",
  "details": {
    "field": "问题字段名",
    "hint": "修复建议",
    "retryable": true
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 1.2 错误码定义

| 错误码 | HTTP | 说明 | 用户可见消息 |
|--------|------|------|--------------|
| `STREAM_INTERRUPTED` | 499 | 客户端主动中断流式请求 | "生成已停止" |
| `EXPORT_TIMEOUT` | 504 | 导出操作超时 | "导出耗时较长，请稍后重试" |
| `EXPORT_FORMAT_INVALID` | 400 | 导出格式不支持 | "不支持的导出格式" |
| `SESSION_TAG_LIMIT` | 422 | 会话标签数量超限 | "每个会话最多添加 10 个标签" |
| `TAG_NAME_INVALID` | 400 | 标签名称不合法 | "标签名称长度需在 1-20 字符之间" |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI 服务不可用 | "AI服务暂不可用，请稍后重试" |

### 1.3 数据导出 API

#### POST /api/v1/agent/analysis/export

导出对比结果。

**请求体：**
```json
{
  "report_ids": ["rep_001", "rep_002"],
  "format": "markdown",
  "scope": "full",
  "include_sources": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `report_ids` | `string[]` | 是 | 研报ID列表，至少2个 |
| `format` | `string` | 是 | 枚举: `markdown`/`json`/`csv` |
| `scope` | `string` | 否 | 枚举: `full`/`summary`/`differences`，默认 `full` |
| `include_sources` | `boolean` | 否 | 默认 `true` |

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "download_url": "/api/v1/agent/exports/exp_abc123",
    "filename": "对比分析_宁德时代_20250415.md",
    "expires_at": "2025-04-15T12:00:00Z",
    "size_bytes": 15420
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

#### GET /api/v1/agent/sessions/{id}/export

导出会话记录。

**查询参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `format` | `string` | 否 | `markdown` | `markdown`/`json` |
| `include_sources` | `boolean` | 否 | `true` | 是否包含引用来源 |

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "download_url": "/api/v1/agent/exports/exp_def456",
    "filename": "会话_宁德时代分析_20250415.md",
    "expires_at": "2025-04-15T12:00:00Z",
    "size_bytes": 8934,
    "message_count": 12
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 1.4 会话增强 API

#### GET /api/v1/agent/sessions

增加搜索和标签过滤参数。

**查询参数：**
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `search` | `string` | 否 | - | 搜索关键词（匹配标题） |
| `tags` | `string` | 否 | - | 标签过滤，多个标签用逗号分隔 |
| `page` | `int` | 否 | 1 | 页码，≥1 |
| `page_size` | `int` | 否 | 20 | 每页数量，1-100 |

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "sess_001",
        "title": "宁德时代分析",
        "tags": ["股票主题", "跟踪中"],
        "message_count": 5,
        "report_ids": ["rep_001"],
        "created_at": "2025-04-14T10:00:00",
        "updated_at": "2025-04-14T11:00:00"
      }
    ],
    "total": 156,
    "page": 1,
    "page_size": 20,
    "total_pages": 8
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

#### PUT /api/v1/agent/sessions/{id}

支持标签更新。

**请求体：**
```json
{
  "title": "宁德时代深度分析",
  "tags": ["股票主题", "跟踪中", "高优先级"]
}
```

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `title` | `string` | 条件 | ≤50字符 |
| `tags` | `string[]` | 条件 | 最多10个，每个≤20字符 |

**成功响应 (200)：** 返回更新后的完整会话对象。

**错误响应：**
| HTTP | 错误码 | 说明 |
|------|--------|------|
| 404 | `SESSION_NOT_FOUND` | 会话不存在 |
| 422 | `SESSION_TAG_LIMIT` | 标签数量超过10个限制 |
| 400 | `TAG_NAME_INVALID` | 标签名称不合法 |

---

## 2. 数据模型变更规格

### 2.1 ChatSession 模型扩展

**新增字段：**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `tags` | `string[]` | 最多10个，每个≤20字符 | 会话标签列表 |

**存储层模型：**
```python
{
    "id": "sess_xxx",
    "title": "会话标题",
    "tags": ["标签1", "标签2"],  # NEW
    "report_ids": ["rep_001"],
    "messages": [...],
    "created_at": "2025-04-14T10:00:00",
    "updated_at": "2025-04-14T11:00:00",
}
```

### 2.2 导出记录模型（新增）

**用途：** 跟踪导出任务状态

```python
{
    "id": "exp_xxx",
    "type": "compare" | "session",
    "source_id": "sess_xxx" | ["rep_001"],
    "format": "markdown" | "json" | "csv",
    "status": "pending" | "processing" | "completed" | "failed",
    "file_path": "/exports/xxx.md",
    "file_size": 15420,
    "expires_at": "2025-04-15T12:00:00",
    "created_at": "2025-04-14T10:00:00",
    "updated_at": "2025-04-14T10:00:01",
}
```

**存储位置：** `{DATA_DIR}/exports.json`

---

## 3. 前端类型定义变更

### 3.1 analysis.ts 新增类型

```typescript
// 会话标签
export interface ChatSession {
  id: string;
  title: string;
  tags?: string[];                    // NEW
  messages: ChatMessage[];
  message_count?: number;
  report_ids?: string[];
  created_at: string;
  updated_at: string;
}

// 导出相关
export type ExportFormat = 'markdown' | 'json' | 'csv';
export type ExportScope = 'full' | 'summary' | 'differences';

export interface ExportCompareRequest {
  report_ids: string[];
  format: ExportFormat;
  scope?: ExportScope;
  include_sources?: boolean;
}

export interface ExportResponse {
  download_url: string;
  filename: string;
  expires_at: string;
  size_bytes: number;
}

// 会话列表查询
export interface SessionListQuery {
  search?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
}

export interface UpdateSessionRequest {
  title?: string;
  tags?: string[];
}
```

### 3.2 aiService.ts 新增方法

```typescript
export const aiService = {
  // 获取会话列表（增强版）
  getSessions: async (query?: SessionListQuery): Promise<SessionListResponse>,
  
  // 更新会话（支持标签）
  updateSession: async (sessionId: string, data: UpdateSessionRequest): Promise<ChatSession>,
  
  // 导出对比结果
  exportCompareResult: async (params: ExportCompareRequest): Promise<ExportResponse>,
  
  // 导出会话记录
  exportSession: async (sessionId: string, params: { format: string; include_sources?: boolean }): Promise<ExportResponse>,
}
```

---

## 4. 前端组件状态流（简要）

### 4.1 组件层次

```
Analysis (Page)
├── CompareConfigPanel (对比配置)
├── CompareResultPanel (对比结果)
├── ChatWorkspace (问答工作区)
├── SessionSidebar (会话侧边栏)
└── HistoryPanel (历史面板)
```

### 4.2 关键状态

| 状态 | 位置 | 说明 |
|------|------|------|
| `selectedReports` | Page | 已选研报ID（跨模式共享） |
| `sessions` | Page | 会话列表 |
| `currentSessionId` | Page | 当前会话ID |
| `streamingState` | Page | 流式生成状态 |
| `expandedDimensions` | CompareResultPanel | 已展开的维度ID |

---

## 5. 提示词模板管理（简要）

**配置文件：** `backend/config/prompts.yaml`

**结构：**
```yaml
compare_analysis:
  base_prompt: "..."
  dimension_templates:
    rating: { label: "投资评级", prompt: "..." }
    financial: { label: "财务预测", prompt: "..." }
    views: { label: "核心观点", prompt: "..." }
    analyst: { label: "券商分析师", prompt: "..." }

query_analysis:
  base_prompt: "..."
  context_injection: "..."
```

---

## 6. 错误处理规格（简要）

### 6.1 前端错误类型

```typescript
export enum AnalysisErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  STREAM_INTERRUPTED = 'STREAM_INTERRUPTED',
  EXPORT_TIMEOUT = 'EXPORT_TIMEOUT',
  SESSION_TAG_LIMIT = 'SESSION_TAG_LIMIT',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
}
```

### 6.2 重试策略

| 错误类型 | 自动重试 | 最大重试次数 |
|----------|----------|--------------|
| NETWORK_ERROR | 是 | 3 |
| TIMEOUT_ERROR | 是 | 2 |
| AI_SERVICE_UNAVAILABLE | 否 | - |
| EXPORT_TIMEOUT | 是 | 2 |

---

## 7. 需求追踪矩阵

| REQ-ID | 需求描述 | API 端点 | 优先级 |
|--------|----------|----------|--------|
| REQ-001 | 对比结果卡片化展示 | `POST /analysis/compare` | P0 |
| REQ-002 | 维度折叠面板 | `POST /analysis/compare` | P0 |
| REQ-003 | 流式停止生成 | `POST /analysis/query-stream` | P0 |
| REQ-004 | 错误状态统一 | 全局错误处理 | P0 |
| REQ-005 | 会话搜索 | `GET /sessions` | P1 |
| REQ-006 | 会话标签系统 | `PUT /sessions/{id}` | P1 |
| REQ-007 | 导出功能 | `POST /analysis/export` | P1 |
| REQ-008 | 会话导出 | `GET /sessions/{id}/export` | P1 |
