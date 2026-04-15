# 09 — API接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-RA |
| 模块名称 | 投研助手（Research Assistant） |
| 版本 / 阶段 | v0.1 · API Spec |
| 追溯 | ← 08 系统架构 → 10 数据模型 |

---

## 1. 通用规范

### 1.1 基础信息

- **基础URL**: `http://localhost:5000/api/v1`
- **协议**: HTTP/1.1 (开发) / HTTPS (生产)
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 请求规范

| 项目 | 规范 |
|------|------|
| Content-Type | `application/json` |
| 时间格式 | ISO 8601: `2025-04-14T10:00:00Z` |
| 日期格式 | `YYYY-MM-DD` |
| 分页参数 | `page` (默认1), `per_page` (默认20, 最大100) |

### 1.3 响应规范

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "错误描述",
  "error": "ERROR_CODE"
}
```

### 1.4 HTTP状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | OK | GET/PUT/DELETE成功 |
| 201 | Created | POST创建成功 |
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未认证或Token过期 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 413 | Payload Too Large | 上传文件超过大小限制 |
| 415 | Unsupported Media Type | 文件格式不支持 |
| 422 | Unprocessable | 业务逻辑错误 |
| 429 | Too Many Requests | 请求频率超限（速率限制） |
| 500 | Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 下游服务不可用（LLM/股票数据源） |
| 504 | Gateway Timeout | 下游超时（研报解析等） |

---

## 2. 研报接口 (/reports)

### 2.1 上传研报

```
POST /reports/upload
Content-Type: multipart/form-data
```

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| files | File[] | 是 | PDF/HTML文件，最多10个 |

**成功响应 (201)**:
```json
{
  "code": 201,
  "message": "upload success",
  "data": {
    "uploaded": [
      {
        "report_id": "rpt_001",
        "filename": "xxx证券_宁德时代_20250410.pdf",
        "status": "pending",
        "created_at": "2025-04-14T10:00:00Z"
      }
    ],
    "failed": []
  }
}
```

### 2.2 获取研报列表

```
GET /reports?page=1&per_page=20&keyword=宁德时代&status=completed
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| page | int | 否 | 页码，默认1 |
| per_page | int | 否 | 每页数量，默认20 |
| keyword | string | 否 | 搜索关键词（公司/券商） |
| status | string | 否 | 状态筛选：pending/processing/completed/failed |
| company | string | 否 | 公司名称筛选 |
| broker | string | 否 | 券商名称筛选 |

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "report_id": "rpt_001",
        "title": "宁德时代深度报告：全球锂电龙头",
        "company_name": "宁德时代",
        "stock_code": "300750.SZ",
        "broker": "xxx证券",
        "analyst": "张三",
        "rating": "买入",
        "target_price": 285.0,
        "current_price": 245.0,
        "publish_date": "2025-04-10",
        "status": "completed",
        "page_count": 35,
        "created_at": "2025-04-14T10:00:00Z",
        "is_favorite": false
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 156,
      "total_pages": 8
    }
  }
}
```

### 2.3 获取研报详情

```
GET /reports/{report_id}
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "report_id": "rpt_001",
    "filename": "xxx证券_宁德时代_20250410.pdf",
    "title": "宁德时代深度报告：全球锂电龙头",
    "company_name": "宁德时代",
    "stock_code": "300750.SZ",
    "broker": "xxx证券",
    "analyst": "张三",
    "publish_date": "2025-04-10",
    "rating": "买入",
    "target_price": 285.0,
    "current_price": 245.0,
    "upside": 16.3,
    "key_points": [
      "公司是全球动力电池龙头，市占率持续提升",
      "2025年出货量预计增长30%，盈利能力稳定"
    ],
    "financial_forecast": {
      "revenue_2025": 450000000000,
      "profit_2025": 52000000000,
      "pe_2025": 18.5
    },
    "page_count": 35,
    "status": "completed",
    "file_url": "/api/v1/reports/rpt_001/file",
    "created_at": "2025-04-14T10:00:00Z",
    "parsed_at": "2025-04-14T10:00:30Z"
  }
}
```

### 2.4 获取研报原文

```
GET /reports/{report_id}/file
```

**响应**: 直接返回文件内容（PDF/HTML）

### 2.5 删除研报

```
DELETE /reports/{report_id}
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "deleted"
}
```

### 2.6 重新解析

```
POST /reports/{report_id}/reparse
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "reparse started",
  "data": {
    "report_id": "rpt_001",
    "status": "processing"
  }
}
```

---

## 3. 问答接口 (/chat)

### 3.1 创建会话

```
POST /chat/sessions
```

**请求体**:
```json
{
  "report_ids": ["rpt_001"],
  "title": "宁德时代分析"
}
```

**成功响应 (201)**:
```json
{
  "code": 201,
  "message": "session created",
  "data": {
    "session_id": "chat_001",
    "title": "宁德时代分析",
    "report_ids": ["rpt_001"],
    "created_at": "2025-04-14T10:00:00Z"
  }
}
```

### 3.2 获取会话列表

```
GET /chat/sessions?page=1&per_page=20
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "session_id": "chat_001",
        "title": "宁德时代分析",
        "report_ids": ["rpt_001"],
        "message_count": 5,
        "last_message_at": "2025-04-14T11:00:00Z",
        "created_at": "2025-04-14T10:00:00Z"
      }
    ],
    "pagination": { ... }
  }
}
```

### 3.3 发送消息

```
POST /chat/sessions/{session_id}/messages
```

**请求体**:
```json
{
  "content": "这家公司的核心竞争优势是什么？"
}
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "message_id": "msg_002",
    "role": "assistant",
    "content": "根据研报分析，宁德时代的核心竞争优势包括：\n\n1. **技术领先**：公司在动力电池领域拥有核心技术专利，能量密度行业领先[1]\n2. **规模效应**：全球产能布局完善，成本控制能力强[2]\n3. **客户优质**：与特斯拉、宝马等国际车企建立长期合作关系[3]",
    "citations": [
      {
        "index": 1,
        "chunk_id": "c015",
        "report_id": "rpt_001",
        "page": 8,
        "text": "公司拥有超过5000项动力电池相关专利，量产电芯能量密度达到300Wh/kg..."
      },
      {
        "index": 2,
        "chunk_id": "c023",
        "report_id": "rpt_001",
        "page": 12,
        "text": "公司全球产能超过500GWh，规模效应显著，单位成本较行业平均低15%..."
      }
    ],
    "created_at": "2025-04-14T11:05:00Z"
  }
}
```

### 3.4 获取会话消息

```
GET /chat/sessions/{session_id}/messages
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "session_id": "chat_001",
    "messages": [
      {
        "message_id": "msg_001",
        "role": "user",
        "content": "这家公司的核心竞争优势是什么？",
        "created_at": "2025-04-14T11:00:00Z"
      },
      {
        "message_id": "msg_002",
        "role": "assistant",
        "content": "...",
        "citations": [...],
        "created_at": "2025-04-14T11:05:00Z"
      }
    ]
  }
}
```

### 3.5 删除会话

```
DELETE /chat/sessions/{session_id}
```

---

## 4. 对比接口 (/compare)

### 4.1 创建对比

```
POST /compare
```

**请求体**:
```json
{
  "report_ids": ["rpt_001", "rpt_002", "rpt_003"]
}
```

**成功响应 (201)**:
```json
{
  "code": 201,
  "message": "compare created",
  "data": {
    "compare_id": "cmp_001",
    "company_name": "宁德时代",
    "stock_code": "300750.SZ",
    "current_price": 245.0,
    "reports": [
      {
        "report_id": "rpt_001",
        "broker": "xxx证券",
        "analyst": "张三",
        "publish_date": "2025-04-10",
        "rating": "买入",
        "target_price": 285.0,
        "upside": 16.3,
        "key_points": "全球龙头，技术领先"
      },
      {
        "report_id": "rpt_002",
        "broker": "yyy证券",
        "analyst": "李四",
        "publish_date": "2025-04-08",
        "rating": "增持",
        "target_price": 270.0,
        "upside": 10.2,
        "key_points": "业绩稳健，估值合理"
      }
    ],
    "summary": {
      "rating_distribution": {"买入": 2, "增持": 1},
      "target_price_range": {"min": 260, "max": 285, "avg": 271.7},
      "consensus": "普遍看好，目标价较现价有10-16%上涨空间"
    },
    "created_at": "2025-04-14T10:00:00Z"
  }
}
```

### 4.2 获取对比详情

```
GET /compare/{compare_id}
```

### 4.3 删除对比

```
DELETE /compare/{compare_id}
```

---

## 5. 股票接口 (/stock)

### 5.1 搜索股票

```
GET /stock/search?keyword=宁德
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "code": "300750.SZ",
        "name": "宁德时代",
        "pinyin": "NDSD"
      },
      {
        "code": "300751.SZ",
        "name": "迈为股份",
        "pinyin": "MWGF"
      }
    ]
  }
}
```

### 5.2 获取股票详情（完整）

```
GET /stock/{code}
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "300750.SZ",
    "name": "宁德时代",
    "industry": "电池",
    "price": {
      "current": 245.00,
      "change_percent": 2.35,
      "change_amount": 5.62,
      "open": 240.00,
      "high": 248.50,
      "low": 239.00,
      "pre_close": 239.38,
      "volume": 1250000,
      "turnover": 306250000,
      "turnover_rate": 1.25
    },
    "indicators": {
      "pe_ttm": 18.5,
      "pb": 3.2,
      "ps": 2.1,
      "roe": 15.2,
      "market_cap": 540000000000,
      " circulating_cap": 450000000000
    },
    "related_reports": {
      "count": 5,
      "items": [
        {"report_id": "rpt_001", "broker": "xxx证券", "rating": "买入", "target_price": 285}
      ]
    },
    "updated_at": "2025-04-14T10:30:00Z"
  }
}
```

### 5.3 获取股票快照（轻量）

```
GET /stock/{code}/snapshot
```

**成功响应 (200)**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "code": "300750.SZ",
    "name": "宁德时代",
    "price": 245.00,
    "change_percent": 2.35,
    "pe_ttm": 18.5,
    "market_cap": 540000000000,
    "related_report_count": 5
  }
}
```

---

## 6. 标注接口 (/annotations)

### 6.1 创建标注

```
POST /annotations
```

**请求体**:
```json
{
  "report_id": "rpt_001",
  "page": 5,
  "text": "选中的文本",
  "note": "我的笔记",
  "color": "yellow"
}
```

### 6.2 获取标注列表

```
GET /annotations?report_id=rpt_001
```

### 6.3 删除标注

```
DELETE /annotations/{annotation_id}
```

---

## 7. 收藏接口 (/favorites)

### 7.1 添加收藏

```
POST /favorites
```

**请求体**:
```json
{
  "report_id": "rpt_001",
  "tags": ["新能源", "重点跟踪"]
}
```

### 7.2 获取收藏列表

```
GET /favorites
```

### 7.3 取消收藏

```
DELETE /favorites/{favorite_id}
```

---

## 8. 参数校验汇总

> 对应 `11` 第4章接口安全输入校验要求，每个端点的关键参数均在服务端执行白名单校验。

| 端点 | 参数 | 类型 | 限制 | 违反错误码 |
|--------|------|------|------|----------------|
| `POST /reports/upload` | `files` | `File[]` | PDF/HTML，单文件≤ 50MB，一次最多 10 个 | `FILE_TOO_LARGE` / `INVALID_FILE_TYPE` |
| `GET /reports` | `page` | `integer` | 默认 1，必须 ≥ 1 | 400 |
| `GET /reports` | `per_page` | `integer` | 默认 20，最大 100 | 400 |
| `GET /reports` | `status` | `string` | 枚举: pending/processing/completed/failed | 400 |
| `GET /reports/{report_id}` | `report_id` | `string` | 非空 | `REPORT_NOT_FOUND` |
| `POST /chat/sessions` | `report_ids` | `array` | 非空，元素为存在的 report_id | `MISSING_FIELD` / `REPORT_NOT_FOUND` |
| `POST /chat/sessions` | `title` | `string` | 可选，默认“新会话”，≤ 23 字符 | 400 |
| `POST /chat/sessions/{id}/messages` | `content` | `string` | 1–500 字符，非空白 | `EMPTY_QUERY` / `INVALID_QUERY` |
| `POST /compare` | `report_ids` | `array` | 2–5 个，必须同一公司 | `COMPARE_LIMIT_EXCEEDED` / `COMPARE_SAME_COMPANY_ONLY` |
| `GET /stock/search` | `keyword` | `string` | 非空，≤ 50 字符 | 400 |
| `POST /annotations` | `page` | `integer` | 必须 ≥ 1 | 400 |
| `POST /annotations` | `text` | `string` | 非空，≤ 500 字符 | 400 |
| `POST /annotations` | `color` | `string` | 枚举: yellow/green/blue/pink | 400 |
| `POST /favorites` | `report_id` | `string` | 非空，已存在的 report_id | `MISSING_FIELD` / `REPORT_NOT_FOUND` |
| `POST /favorites` | `tags` | `array` | 可选，最多 5 个，每个≤ 10 字符 | 400 |

*文档结束*
