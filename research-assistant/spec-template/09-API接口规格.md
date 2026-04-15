# 09 — API接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-RA |
| 模块名称 | 投研助手（Research Assistant） |
| 版本 / 阶段 | v1.0 · API Spec（基于实际实现） |
| 追溯 | ← 08 系统架构 → 10 数据模型 |

---

## 1. 通用规范

### 1.1 基础信息

- **基础URL**: `http://localhost:5000/api/v1`
- **协议**: HTTP/1.1 (开发) / HTTPS (生产)
- **数据格式**: JSON
- **字符编码**: UTF-8
- **Swagger UI**: `http://localhost:5000/swagger`

### 1.2 请求规范

| 项目 | 规范 |
|------|------|
| Content-Type | `application/json`（文件上传除外） |
| 文件上传 | `multipart/form-data` |
| 时间格式 | ISO 8601: `2025-04-14T10:00:00` |
| 分页参数 | `page` (默认1), `page_size` (默认20, 最大100) |

### 1.3 响应规范

所有接口统一响应格式，包含追踪ID：

**成功响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "trace_id": "a1b2c3d4e5f6"
}
```

**错误响应**:
```json
{
  "code": "ERROR_CODE",
  "message": "错误描述",
  "data": null,
  "trace_id": "a1b2c3d4e5f6"
}
```

### 1.4 HTTP状态码

| 状态码 | 含义 | 使用场景 |
|--------|------|---------|
| 200 | OK | 请求成功 |
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 资源不存在 |
| 413 | Payload Too Large | 上传文件超过50MB |
| 415 | Unsupported Media Type | 文件格式不支持（仅支持PDF/HTML） |
| 422 | Unprocessable | 业务逻辑错误（如解析失败） |
| 500 | Server Error | 服务器内部错误（含AI调用失败） |

### 1.5 错误码枚举

| 错误码 | 说明 |
|--------|------|
| `EMPTY_FILE` | 未选择文件 |
| `TOO_MANY_FILES` | 单次上传超过10个文件 |
| `REPORT_NOT_FOUND` | 研报不存在或已删除 |
| `FILE_NOT_FOUND` | 文件不存在 |
| `PARSE_FAILED` | 研报解析失败 |
| `INVALID_PARAMS` | 参数校验不通过 |
| `EMPTY_QUESTION` | 问题不能为空 |
| `AI_ERROR` | AI服务调用失败 |

---

## 2. 研报管理接口 (`/api/v1/agent/reports`)

### 2.1 上传研报

```
POST /api/v1/agent/reports/upload
Content-Type: multipart/form-data
```

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| files | File[] | 是 | PDF/HTML文件，最多10个，单文件≤50MB |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "成功上传 2 个文件，失败 0 个",
  "data": {
    "uploaded": [
      {
        "id": "rep_abc123",
        "filename": "某证券_宁德时代_20250410.pdf",
        "status": "pending"
      }
    ],
    "failed": []
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

> **说明**: 上传后自动触发同步解析。解析完成后研报状态变为 `completed`，失败则为 `failed`。

### 2.2 获取研报列表

```
GET /api/v1/agent/reports?page=1&page_size=20&search=宁德时代&sort_by=created_at&filter_status=all
```

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| page | int | 否 | 1 | 页码，≥1 |
| page_size | int | 否 | 20 | 每页数量，1-100 |
| search | string | 否 | - | 搜索关键词（匹配标题/公司/代码/券商） |
| sort_by | string | 否 | created_at | 排序字段 |
| filter_status | string | 否 | all | 状态筛选：all/pending/parsing/completed/failed |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "rep_abc123",
        "title": "宁德时代深度报告：全球锂电龙头",
        "company": "宁德时代",
        "company_code": "300750.SZ",
        "broker": "某证券",
        "analyst": "张三",
        "rating": "买入",
        "target_price": 285.0,
        "current_price": 245.0,
        "file_type": "pdf",
        "file_size": 1024000,
        "status": "completed",
        "created_at": "2025-04-14T10:00:00",
        "updated_at": "2025-04-14T10:00:30"
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

### 2.3 获取研报详情

```
GET /api/v1/agent/reports/{report_id}
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "rep_abc123",
    "title": "宁德时代深度报告：全球锂电龙头",
    "company": "宁德时代",
    "company_code": "300750.SZ",
    "broker": "某证券",
    "analyst": "张三",
    "rating": "买入",
    "target_price": 285.0,
    "current_price": 245.0,
    "core_views": "全球动力电池龙头，市占率持续提升...",
    "financial_forecast": {
      "revenue_2024": 4500,
      "revenue_2025": 5200,
      "net_profit_2024": 450,
      "net_profit_2025": 520,
      "eps_2024": 18.5,
      "eps_2025": 21.3
    },
    "investment_rating": {
      "recommendation": "建议买入",
      "change": "维持",
      "time_horizon": "12个月"
    },
    "profitability": {
      "revenue": 1000.5,
      "net_profit": 150.3,
      "gross_margin": 35.5,
      "net_margin": 15.0,
      "roe": 18.5,
      "roa": 10.2,
      "roic": 12.8
    },
    "growth": {
      "revenue_growth": 25.5,
      "profit_growth": 30.2,
      "net_profit_growth": 28.5,
      "cagr_3y": 20.0,
      "cagr_5y": 18.5
    },
    "valuation": {
      "pe_ttm": 25.5,
      "pe_2024": 22.0,
      "pe_2025": 18.5,
      "pb": 3.2,
      "ps": 5.5,
      "peg": 1.2,
      "ev_ebitda": 15.5
    },
    "solvency": {
      "debt_to_asset": 45.5,
      "current_ratio": 1.8,
      "quick_ratio": 1.5,
      "interest_coverage": 12.5
    },
    "cashflow": {
      "operating_cashflow": 200.5,
      "free_cashflow": 120.3,
      "cashflow_per_share": 5.5,
      "operating_cashflow_margin": 25.0
    },
    "content": "研报原文内容...",
    "filename": "report_xxx.pdf",
    "file_path": "/data/uploads/report_xxx.pdf",
    "file_type": "pdf",
    "file_size": 1024000,
    "status": "completed",
    "parse_error": null,
    "created_at": "2025-04-14T10:00:00",
    "updated_at": "2025-04-14T10:00:30"
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 2.4 删除研报

```
DELETE /api/v1/agent/reports/{report_id}
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null,
  "trace_id": "a1b2c3d4e5f6"
}
```

### 2.5 重新解析研报

```
POST /api/v1/agent/reports/{report_id}/reparse
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "重新解析成功",
  "data": { "...研报详情..." },
  "trace_id": "a1b2c3d4e5f6"
}
```

**失败响应 (422)**:
```json
{
  "code": "PARSE_FAILED",
  "message": "解析错误详情",
  "data": null,
  "trace_id": "a1b2c3d4e5f6"
}
```

### 2.6 下载研报PDF

```
GET /api/v1/agent/reports/{report_id}/download
```

**成功响应 (200)**: 返回PDF文件流，`Content-Disposition: attachment`
**失败响应 (404)**: 研报或文件不存在

### 2.7 在线预览研报

```
GET /api/v1/agent/reports/{report_id}/preview
```

**成功响应 (200)**: 返回PDF文件流，`Content-Disposition: inline`（浏览器内嵌预览）
**失败响应 (404)**: 研报或文件不存在

### 2.8 抓取研报

```
POST /api/v1/agent/reports/fetch
Content-Type: application/json
```

**请求体**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|:---:|--------|------|
| count | int | 否 | 5 | 抓取数量，1-20 |
| use_ai | boolean | 否 | false | 是否使用AI生成 |
| company | string | 否 | - | 指定公司名称（配合use_ai使用） |

```json
{
  "count": 5,
  "use_ai": false,
  "company": "贵州茅台"
}
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "成功抓取 5 份研报",
  "data": {
    "fetched": 5,
    "reports": [ "...研报基础信息列表..." ]
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

> **说明**: 支持去重拉新机制，优先抓取未存在的公司。

---

## 3. 智能分析接口 (`/api/v1/agent/analysis`)

### 3.1 对比分析

```
POST /api/v1/agent/analysis/compare
Content-Type: application/json
```

**请求体**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| report_ids | string[] | 是 | 研报ID列表，至少2个 |
| compare_type | string | 是 | 对比类型：company/industry/custom |
| dimensions | string[] | 否 | 对比维度：rating/financial/views/analyst |

```json
{
  "report_ids": ["rep_001", "rep_002"],
  "compare_type": "company",
  "dimensions": ["rating", "financial", "views"]
}
```

**维度说明**:
| 维度 | 中文名 | 分析内容 |
|------|--------|----------|
| rating | 投资评级 | 评级、目标价、评级变化 |
| financial | 财务预测 | 营收/净利润/EPS预测、盈利能力、成长性、估值 |
| views | 核心观点 | 投资逻辑、核心观点异同、风险提示 |
| analyst | 券商分析师 | 不同券商视角差异、分歧焦点、推荐力度 |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "comparison_result": "两份研报均看好宁德时代的长期发展...",
    "similarities": [
      "均看好公司全球市占率提升前景",
      "一致认为公司技术壁垒深厚"
    ],
    "differences": [
      "目标价存在差异：A券商285元 vs B券商270元",
      "对短期盈利修复速度判断不同"
    ],
    "recommendations": [
      "建议中长期配置，关注产能释放节奏",
      "关注海外市场拓展进展"
    ],
    "dimension_results": [
      {
        "dimension": "rating",
        "dimension_label": "投资评级",
        "summary": "两家券商均给予买入评级，目标价差异约5%",
        "details": [
          "A券商维持买入评级，12个月目标价285元",
          "B券商首次覆盖给予增持，目标价270元",
          "评级分歧主要在于对短期业绩弹性的判断"
        ]
      }
    ]
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 3.2 AI智能问答

```
POST /api/v1/agent/analysis/query
Content-Type: application/json
```

**请求体**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| question | string | 是 | 问题内容 |
| report_ids | string[] | 否 | 参考研报ID列表（不传则使用最近5份已完成研报） |
| context | string | 否 | 额外上下文 |

```json
{
  "question": "宁德时代的核心竞争优势是什么？",
  "report_ids": ["rep_001", "rep_002"]
}
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "answer": "根据研报分析，宁德时代的核心竞争优势包括...",
    "sources": [
      {
        "report_id": "rep_001",
        "report_title": "宁德时代深度报告",
        "excerpt": "公司是全球动力电池龙头..."
      }
    ],
    "confidence": 0.85
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 3.3 流式AI问答（SSE）

```
POST /api/v1/agent/analysis/query-stream
Content-Type: application/json
```

**请求体**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| question | string | 是 | 问题内容 |
| report_ids | string[] | 否 | 参考研报ID列表 |
| session_id | string | 否 | 会话ID（续聊时使用） |

**响应**: `text/event-stream` (Server-Sent Events)

每个SSE事件格式：
```
data: {"content":"根据","done":false,"session_id":"sess_001"}

data: {"content":"研报分析，","done":false}

data: {"content":"","done":true,"sources":[{"report_id":"rep_001","report_title":"...","excerpt":"..."}]}
```

**SSE Chunk字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| content | string | 文本片段（done=true时可为空） |
| done | boolean | 是否结束 |
| error | string? | 错误信息 |
| session_id | string? | 会话ID（首个chunk返回） |
| sources | array? | 参考来源（done=true时返回） |

---

## 4. 会话管理接口 (`/api/v1/agent/sessions`)

### 4.1 获取会话列表

```
GET /api/v1/agent/sessions
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sessions": [
      {
        "id": "sess_001",
        "title": "宁德时代分析",
        "message_count": 5,
        "report_ids": ["rep_001"],
        "created_at": "2025-04-14T10:00:00",
        "updated_at": "2025-04-14T11:00:00"
      }
    ]
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 4.2 创建会话

```
POST /api/v1/agent/sessions
Content-Type: application/json
```

**请求体**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| title | string | 否 | 会话标题 |
| report_ids | string[] | 否 | 关联研报ID列表 |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "session": {
      "id": "sess_002",
      "title": "新会话",
      "messages": [],
      "report_ids": [],
      "created_at": "2025-04-14T10:00:00",
      "updated_at": "2025-04-14T10:00:00"
    }
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 4.3 获取会话消息

```
GET /api/v1/agent/sessions/{session_id}/messages
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "宁德时代核心竞争优势？",
        "timestamp": "2025-04-14T10:00:00"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "根据研报分析...",
        "sources": [...],
        "timestamp": "2025-04-14T10:00:05"
      }
    ]
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 4.4 删除会话

```
DELETE /api/v1/agent/sessions/{session_id}
```

### 4.5 重命名会话

```
PUT /api/v1/agent/sessions/{session_id}
Content-Type: application/json
```

**请求体**:
```json
{
  "title": "新标题"
}
```

---

## 5. 股票数据接口 (`/api/v1/stock`)

> 提供股票搜索、行情、财务指标和完整数据查询，数据来自模拟数据服务（包含约40只A股/港股标的，15个行业基准）。

### 5.1 搜索股票

```
GET /api/v1/stock/search?q=茅台
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| q | string | 否 | 搜索关键词（股票代码或名称），为空时返回全部股票池 |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      { "code": "600519.SH", "name": "贵州茅台", "industry": "白酒" }
    ],
    "total": 1
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 5.2 获取股票基本信息

```
GET /api/v1/stock/{code}
```

**路径参数**:
| 参数 | 说明 |
|------|------|
| code | 股票代码，如 `600519.SH`，支持省略后缀（自动识别市场） |

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519.SH",
    "name": "贵州茅台",
    "industry": "白酒"
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

### 5.3 获取股票行情

```
GET /api/v1/stock/{code}/quote
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519.SH",
    "name": "贵州茅台",
    "industry": "白酒",
    "current_price": 1688.88,
    "change_percent": 2.5,
    "change_amount": 41.22,
    "volume": 15000,
    "turnover": 25300.5,
    "market_cap": 21200.5,
    "pe_ratio": 28.5,
    "pb_ratio": 8.2,
    "high": 1700.0,
    "low": 1660.0,
    "open": 1665.0,
    "prev_close": 1647.66,
    "update_time": "2025-04-15 14:30:00",
    "circulating_cap": 18500.0,
    "turnover_rate": 0.85,
    "dividend_yield": 1.5,
    "amplitude": 2.43,
    "volume_ratio": 1.12,
    "52w_high": 1850.0,
    "52w_low": 1380.0
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

**行情字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| current_price | float | 当前价格 |
| change_percent | float | 涨跌幅(%) |
| change_amount | float | 涨跌额 |
| volume | int | 成交量(手) |
| turnover | float | 成交额(万元) |
| market_cap | float | 总市值(亿元) |
| pe_ratio | float | 市盈率(TTM) |
| pb_ratio | float | 市净率 |
| high / low | float | 最高/最低价 |
| open | float | 开盘价 |
| prev_close | float | 昨收价 |
| circulating_cap | float | 流通市值(亿元) |
| turnover_rate | float | 换手率(%) |
| dividend_yield | float | 股息率(%) |

### 5.4 获取财务指标

```
GET /api/v1/stock/{code}/financial
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "code": "600519.SH",
    "name": "贵州茅台",
    "roe": 18.5,
    "roa": 12.3,
    "gross_margin": 52.8,
    "net_margin": 28.5,
    "debt_ratio": 35.2,
    "current_ratio": 1.85,
    "quick_ratio": 1.52,
    "revenue_growth": 15.3,
    "profit_growth": 22.1,
    "eps": 42.5,
    "bps": 205.8,
    "dividend_yield": 2.1,
    "asset_turnover": 0.65,
    "fcf_yield": 3.2,
    "operating_margin": 45.0,
    "roic": 22.0,
    "eps_growth": 18.5,
    "pe_ratio": 28.5
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

**财务指标字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| roe | float | 净资产收益率(%) |
| roa | float | 总资产收益率(%) |
| gross_margin | float | 毛利率(%) |
| net_margin | float | 净利率(%) |
| debt_ratio | float | 资产负债率(%) |
| current_ratio | float | 流动比率 |
| quick_ratio | float | 速动比率 |
| revenue_growth | float | 营收增长率(%) |
| profit_growth | float | 净利润增长率(%) |
| eps | float | 每股收益 |
| bps | float | 每股净资产 |
| dividend_yield | float | 股息率(%) |

### 5.5 获取完整股票数据

```
GET /api/v1/stock/{code}/full
```

**成功响应 (200)**: 返回完整数据包含以下8个模块：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "basic": { "code": "600519.SH", "name": "贵州茅台", "industry": "白酒" },
    "quote": { "...行情数据(同5.3)..." },
    "financial": { "...财务指标(同5.4)..." },
    "company": {
      "full_name": "贵州茅台酒股份有限公司",
      "description": "公司主营业务为...",
      "founded_year": 1999,
      "listing_date": "2001-08-27",
      "headquarters": "贵州省仁怀市",
      "employees": 28000,
      "website": "www.moutai.com.cn",
      "chairman": "丁雄军",
      "ceo": "王莉",
      "business_scope": "白酒生产与销售",
      "core_products": ["飞天茅台", "茅台王子酒", "茅台迎宾酒"]
    },
    "technicals": {
      "ma5": 1680.0, "ma10": 1670.0, "ma20": 1650.0,
      "ma60": 1620.0, "ma120": 1580.0,
      "rsi14": 58.5, "macd": 12.3,
      "kdj_k": 65.0, "kdj_d": 58.0,
      "boll_upper": 1720.0, "boll_middle": 1680.0, "boll_lower": 1640.0,
      "volume_ma5": 12000, "volume_ma20": 10500
    },
    "holders": {
      "total_holders": 85000,
      "institutional_holders": 1200,
      "institutional_holdings": 65.5,
      "top10_holders": 72.3,
      "northbound_holdings": 8.5,
      "fund_holdings": 15.2,
      "insurance_holdings": 5.3,
      "qfii_holdings": 2.1
    },
    "history": [
      { "date": "2025-04-15", "open": 1665.0, "high": 1700.0, "low": 1660.0, "close": 1688.88, "volume": 15000, "turnover": 25300.5, "change_percent": 2.5 }
    ],
    "peer_comparison": [
      { "code": "000858.SZ", "name": "五粮液", "current_price": 145.0, "change_percent": 1.2, "pe_ratio": 22.0, "pb_ratio": 5.5, "market_cap": 5600.0, "roe": 20.0 }
    ]
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

**完整数据模块说明**:
| 模块 | 类型 | 说明 |
|------|------|------|
| basic | Stock | 股票基本信息（代码/名称/行业） |
| quote | StockQuote | 实时行情数据 |
| financial | StockFinancial | 财务指标 |
| company | CompanyInfo | 公司详细信息 |
| technicals | StockTechnical | 技术指标（MA/RSI/MACD/KDJ/BOLL等） |
| holders | StockHolders | 股东结构（机构/北向/基金/QFII持仓） |
| history | StockHistory[] | 近30日历史行情 |
| peer_comparison | StockPeer[] | 同业公司对比（最多4家） |

---

## 6. AI服务状态接口

### 6.1 检查AI连接状态

```
GET /api/v1/agent/ai-status
```

**成功响应 (200)**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "status": "connected",
    "connected": true,
    "message": "百炼API连接正常",
    "model": "qwen-turbo",
    "service": "百炼API"
  },
  "trace_id": "a1b2c3d4e5f6"
}
```

---

## 7. 健康检查

```
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "service": "research-assistant"
}
```

---

## 8. 数据模型参考

### 8.1 研报状态流转

```
pending → parsing → completed
                  ↘ failed
```

- `pending`: 上传后等待解析
- `parsing`: 解析中
- `completed`: 解析成功
- `failed`: 解析失败（可通过 reparse 重试）

### 8.2 研报多维度财务指标

| 维度 | 字段 | 说明 |
|------|------|------|
| **投资评级** investment_rating | recommendation | 投资建议（强烈建议买入/建议买入/建议观望/建议卖出） |
| | change | 评级变化（维持/上调/下调/首次覆盖） |
| | time_horizon | 投资期限（如：12个月） |
| **盈利能力** profitability | revenue | 营业收入（亿元） |
| | net_profit | 净利润（亿元） |
| | gross_margin | 毛利率（%） |
| | net_margin | 净利率（%） |
| | roe | ROE（%） |
| | roa | ROA（%） |
| | roic | ROIC（%） |
| **成长性** growth | revenue_growth | 营收增速（%） |
| | profit_growth | 净利润增速（%） |
| | net_profit_growth | 归母净利润增速（%） |
| | cagr_3y | 3年复合增速（%） |
| | cagr_5y | 5年复合增速（%） |
| **估值** valuation | pe_ttm | PE-TTM |
| | pe_2024 | 2024年PE |
| | pe_2025 | 2025年PE |
| | pb | PB |
| | ps | PS |
| | peg | PEG |
| | ev_ebitda | EV/EBITDA |
| **偿债能力** solvency | debt_to_asset | 资产负债率（%） |
| | current_ratio | 流动比率 |
| | quick_ratio | 速动比率 |
| | interest_coverage | 利息保障倍数 |
| **现金流** cashflow | operating_cashflow | 经营性现金流（亿元） |
| | free_cashflow | 自由现金流（亿元） |
| | cashflow_per_share | 每股现金流（元） |
| | operating_cashflow_margin | 现金流利润率（%） |

---

## 9. 参数校验汇总

| 端点 | 参数 | 类型 | 限制 | 违反错误码 |
|--------|------|------|------|----------------|
| `POST /reports/upload` | `files` | `File[]` | PDF/HTML，单文件≤50MB，一次最多10个 | `EMPTY_FILE` / `TOO_MANY_FILES` |
| `GET /reports` | `page` | `int` | 默认1，≥1 | 自动修正 |
| `GET /reports` | `page_size` | `int` | 默认20，1-100 | 自动修正为20 |
| `GET /reports` | `filter_status` | `string` | 枚举: all/pending/parsing/completed/failed | - |
| `GET /reports/{id}` | `report_id` | `string` | 非空 | `REPORT_NOT_FOUND` |
| `POST /reports/fetch` | `count` | `int` | 1-20 | 自动修正 |
| `POST /analysis/compare` | `report_ids` | `string[]` | 至少2个有效ID | `INVALID_PARAMS` |
| `POST /analysis/compare` | `compare_type` | `string` | 枚举: company/industry/custom | - |
| `POST /analysis/compare` | `dimensions` | `string[]` | 枚举: rating/financial/views/analyst | - |
| `POST /analysis/query` | `question` | `string` | 非空 | `EMPTY_QUESTION` |
| `POST /sessions` | `title` | `string` | 可选 | - |

*文档结束*
