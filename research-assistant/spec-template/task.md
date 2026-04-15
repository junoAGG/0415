# 投研助手（Research Assistant）开发任务清单

> 基于spec-template文档生成的可执行任务，按里程碑S1~S4拆分

---

## 📋 任务总览

| 里程碑 | 交付内容 | 满足US | 预计工期 |
|--------|----------|--------|----------|
| **S1** | 研报管理：上传/解析/列表/详情 | US-001, US-002 | 2周 |
| **S2** | 智能问答：单篇问答+原文引用 | US-003, US-004 | 2周 |
| **S3** | 对比与联动：多研报对比+股票数据 | US-005, US-006, US-007 | 2周 |
| **S4** | 增值功能：收藏/标注/历史 | US-008, US-009, US-010 | 1周 |

---

## 🎯 S1 里程碑：研报管理（MVP基础）

### S1-T1: 项目初始化与环境搭建
- [ ] **S1-T1.1** 创建项目目录结构
  - 前端: `frontend/` (React + Vite + TypeScript)
  - 后端: `backend/` (Flask + Python)
  - 数据: `data/` (JSON存储)
  - 文档: `docs/`
- [ ] **S1-T1.2** 初始化前端项目
  - 安装依赖: React 18, Vite 5, Tailwind CSS, Ant Design
  - 配置开发服务器端口 5173
  - 配置代理到后端 5000
- [ ] **S1-T1.3** 初始化后端项目
  - 安装依赖: Flask, flask-cors, python-dotenv
  - 创建 `wsgi.py` 入口文件
  - 配置 `.env` 文件模板
- [ ] **S1-T1.4** 创建基础目录结构
  - 后端: `routes/`, `services/`, `storage/`, `models/`
  - 前端: `pages/`, `components/`, `services/`, `types/`, `store/`

### S1-T2: 存储层实现 (W2)
- [ ] **S1-T2.1** 创建 `storage.py` 基础类
  - 实现 JSON 文件 CRUD 操作
  - 数据校验方法
  - 文件路径管理
- [ ] **S1-T2.2** 实现研报存储 `ReportStorage`
  - 存储路径: `data/reports.json`
  - 方法: `create()`, `get()`, `list()`, `update()`, `delete()`
  - 字段: id, title, company, broker, date, status, file_path, extracted_data
- [ ] **S1-T2.3** 实现文件存储 `FileStorage`
  - 存储路径: `data/uploads/`
  - 方法: `save()`, `get()`, `delete()`
  - 文件名生成: UUID + 原始文件名

### S1-T3: 路由层实现 (W1)
- [ ] **S1-T3.1** 创建 `agent_bp.py` Blueprint
  - 注册路由前缀 `/api/v1/agent`
  - 统一错误处理
  - traceId 生成
- [ ] **S1-T3.2** 实现研报上传 API
  - `POST /reports/upload`
  - 支持单文件/批量上传（最多10个）
  - 文件校验: PDF/HTML, ≤50MB
  - 返回: report_id, upload_status
- [ ] **S1-T3.3** 实现研报列表 API
  - `GET /reports`
  - 参数: page, page_size, search, sort_by, filter_status
  - 返回: 研报列表 + 分页信息
- [ ] **S1-T3.4** 实现研报详情 API
  - `GET /reports/{id}`
  - 返回: 完整研报信息 + 解析状态
- [ ] **S1-T3.5** 实现研报删除 API
  - `DELETE /reports/{id}`
  - 级联删除关联文件和数据

### S1-T4: 研报解析服务
- [ ] **S1-T4.1** 创建 `parser.py` 解析模块
  - PDF 解析: 使用 PyPDF2/pdfplumber
  - HTML 解析: 使用 BeautifulSoup
  - 提取文本内容
- [ ] **S1-T4.2** 实现信息提取
  - 提取字段: 标题、分析师、券商、评级、目标价、核心观点
  - 使用正则表达式 + 关键词匹配
  - 返回结构化数据
- [ ] **S1-T4.3** 实现异步解析流程
  - 上传后自动触发解析
  - 状态流转: pending → parsing → completed/failed
  - 失败时记录错误原因

### S1-T5: 前端页面实现 (W4)
- [ ] **S1-T5.1** 创建基础布局组件
  - `Layout.tsx`: Header + Sidebar + Main + StockPanel
  - `Header.tsx`: Logo + 股票搜索栏
  - `Sidebar.tsx`: 上传按钮 + 研报列表 + 收藏入口
- [ ] **S1-T5.2** 实现研报上传组件
  - `UploadArea.tsx`: 拖拽上传区
  - 进度条显示
  - 批量上传支持
  - 格式/大小校验提示
- [ ] **S1-T5.3** 实现研报列表页面
  - `ReportList.tsx`: 列表展示
  - 搜索框: 按公司/代码/券商搜索
  - 筛选器: 按状态筛选
  - 排序: 按日期排序
  - 分页组件
- [ ] **S1-T5.4** 实现研报阅读页面
  - `ReportViewer.tsx`: PDF/HTML 预览
  - `ReportInfoCard.tsx`: 提取的关键信息展示
  - 解析状态显示
- [ ] **S1-T5.5** 实现状态管理 (W5)
  - `useReportStore`: 研报列表状态
  - `useUploadStore`: 上传进度状态
  - 状态持久化

### S1-T6: 前端服务层
- [ ] **S1-T6.1** 创建 API 客户端
  - `api.ts`: 封装 fetch
  - 统一错误处理
  - 请求/响应拦截器
- [ ] **S1-T6.2** 实现研报服务
  - `reportService.ts`: upload, list, get, delete
  - 类型定义: `Report`, `ReportListParams`

### S1-T7: 测试与验收
- [ ] **S1-T7.1** 后端单元测试
  - storage.py 测试
  - parser.py 测试
- [ ] **S1-T7.2** API 集成测试
  - 上传/列表/详情/删除 端到端测试
- [ ] **S1-T7.3** 前端 E2E 测试
  - 上传流程测试
  - 列表筛选测试
- [ ] **S1-T7.4** 验收验证
  - [ ] AC-001-1: 支持拖拽和点击上传
  - [ ] AC-001-2: 支持PDF/HTML, ≤50MB
  - [ ] AC-001-3: 批量上传最多10个
  - [ ] AC-001-4: 自动触发解析，显示进度
  - [ ] AC-001-5: 展示提取的关键信息
  - [ ] AC-001-6: 解析失败显示原因，支持重试
  - [ ] AC-002-1~6: 列表展示、搜索、排序、筛选、分页

---

## 🎯 S2 里程碑：智能问答（核心功能）

### S2-T1: 会话存储层 (W2)
- [ ] **S2-T1.1** 实现会话存储 `SessionStorage`
  - 存储路径: `data/sessions.json`
  - 字段: id, report_id, title, created_at, updated_at
  - 方法: CRUD
- [ ] **S2-T1.2** 实现消息存储 `MessageStorage`
  - 存储路径: `data/messages/{session_id}.json`
  - 字段: id, role, content, citations, created_at
  - 方法: add, list

### S2-T2: Agent 编排层 (W3)
- [ ] **S2-T2.1** 创建 `agent.py` Agent 类
  - 三级降级编排: CoPaw → 百炼 → Demo
  - 配置检测逻辑
- [ ] **S2-T2.2** 实现 CoPaw 桥接
  - `copaw_bridge.py`: 调用 CoPaw API
  - 超时: 20s
  - 错误静默降级
- [ ] **S2-T2.3** 实现百炼 QA
  - `bailian_qa.py`: 调用 DashScope API
  - 超时: 120s
  - 错误分类处理
- [ ] **S2-T2.4** 实现 Demo 模式
  - 纯字符串拼接返回
  - 始终可用
- [ ] **S2-T2.5** 实现 RAG 检索
  - 文档分块 (Chunk)
  - 向量嵌入 (简单实现或模拟)
  - 语义检索

### S2-T3: 问答路由 API (W1)
- [ ] **S2-T3.1** 实现会话管理 API
  - `GET /sessions`: 获取会话列表
  - `POST /sessions`: 创建新会话
  - `DELETE /sessions/{id}`: 删除会话
- [ ] **S2-T3.2** 实现问答 API
  - `POST /chat/sessions/{id}/messages`
  - 参数: query, report_ids (单篇/多篇)
  - 返回: answer, citations, source
  - 5秒内响应
- [ ] **S2-T3.3** 实现消息历史 API
  - `GET /chat/sessions/{id}/messages`
  - 返回: 消息列表

### S2-T4: 前端问答组件 (W4)
- [ ] **S2-T4.1** 实现问答输入区
  - `ChatInput.tsx`: textarea + 发送按钮
  - 单篇/多篇切换
  - 加载状态显示
- [ ] **S2-T4.2** 实现消息列表
  - `MessageList.tsx`: 用户消息 + AI 消息
  - 打字动画效果
  - 时间戳显示
- [ ] **S2-T4.3** 实现原文引用组件
  - `CitationTag.tsx`: 引用编号标签
  - `CitationModal.tsx`: 原文弹窗
  - 点击跳转原文位置
  - 高亮显示
- [ ] **S2-T4.4** 实现常见问题网格
  - `QuickQuestions.tsx`: 预设问题卡片
  - 点击自动发送
- [ ] **S2-T4.5** 实现会话管理 UI
  - Sidebar 会话列表
  - 新建/删除会话
  - 会话切换

### S2-T5: 状态管理扩展 (W5)
- [ ] **S2-T5.1** 实现会话状态
  - `useSessionStore`: 会话列表、当前会话
  - `useChatStore`: 消息列表、加载状态

### S2-T6: 测试与验收
- [ ] **S2-T6.1** Agent 单元测试
  - 三级降级测试
  - RAG 检索测试
- [ ] **S2-T6.2** API 集成测试
  - 问答流程测试
- [ ] **S2-T6.3** 前端 E2E 测试
  - 问答交互测试
- [ ] **S2-T6.4** 验收验证
  - [ ] AC-003-1~6: 问答输入、单/多篇切换、5秒响应、多轮对话
  - [ ] AC-004-1~5: 引用编号、跳转原文、高亮、页码摘要
  - [ ] AC-010-1~5: 历史会话、继续对话、删除会话

---

## 🎯 S3 里程碑：对比与联动

### S3-T1: 股票数据服务
- [ ] **S3-T1.1** 实现股票数据源对接
  - Tushare API 集成
  - 数据缓存 (30秒)
- [ ] **S3-T1.2** 实现股票快照服务
  - 轻量数据: 名称、代码、最新价、涨跌幅、PE、市值
  - 本地缓存
- [ ] **S3-T1.3** 实现股票详情服务
  - 完整行情: K线、成交量
  - 财务指标: PE、PB、ROE、营收、利润
  - 相关研报列表

### S3-T2: 股票数据 API (W1)
- [ ] **S3-T2.1** 实现股票搜索 API
  - `GET /stock/search?keyword={code/name}`
  - 返回: 匹配股票列表
- [ ] **S3-T2.2** 实现股票快照 API
  - `GET /stock/{code}/snapshot`
  - 返回: 轻量行情数据
- [ ] **S3-T2.3** 实现股票详情 API
  - `GET /stock/{code}`
  - 返回: 完整行情 + 财务 + 相关研报

### S3-T3: 多研报对比 (W3)
- [ ] **S3-T3.1** 实现对比存储
  - `data/compare.json`
  - 存储对比结果
- [ ] **S3-T3.2** 实现对比服务
  - 字段对齐: 评级、目标价、核心观点
  - 差异计算
  - 颜色标识
- [ ] **S3-T3.3** 实现对比 API
  - `POST /compare`
  - 参数: report_ids (2-5篇)
  - 校验: 同一公司
  - 返回: 对比表数据
  - 异步生成，轮询获取

### S3-T4: 前端股票组件 (W4)
- [ ] **S3-T4.1** 实现股票面板
  - `StockPanel.tsx`: 右侧股票信息
  - 展示: 名称、价格、涨跌幅、PE、市值
  - 相关研报数
- [ ] **S3-T4.2** 实现股票详情页
  - `StockDetail.tsx`: 完整行情
  - K线图 (使用 ECharts)
  - 财务指标表格
  - 相关研报列表
- [ ] **S3-T4.3** 实现顶部搜索栏
  - `StockSearch.tsx`: 股票搜索
  - 输入建议列表
  - 跳转详情页

### S3-T5: 前端对比组件 (W4)
- [ ] **S3-T5.1** 实现对比选择
  - 研报列表中选择 2-5 篇
  - 同公司校验
  - 对比按钮
- [ ] **S3-T5.2** 实现对比表
  - `CompareTable.tsx`: 表格展示
  - 字段对齐
  - 差异高亮
  - 颜色标识 (绿色/红色)
- [ ] **S3-T5.3** 实现对比结果导出
  - 导出 Excel
  - 导出图片

### S3-T6: 测试与验收
- [ ] **S3-T6.1** 股票数据测试
  - API 测试
  - 缓存测试
- [ ] **S3-T6.2** 对比功能测试
  - 对比生成测试
- [ ] **S3-T6.3** 前端 E2E 测试
  - 股票联动测试
  - 对比流程测试
- [ ] **S3-T6.4** 验收验证
  - [ ] AC-005-1~6: 2-5篇选择、同公司校验、对比表、颜色标识、1分钟生成
  - [ ] AC-006-1~6: 股票面板、关键指标、相关研报、2秒加载
  - [ ] AC-007-1~6: 股票搜索、建议列表、详情页、行情财务数据

---

## 🎯 S4 里程碑：增值功能

### S4-T1: 收藏功能 (W2/W4/W5)
- [ ] **S4-T1.1** 实现收藏存储
  - `data/favorites.json`
  - 字段: id, report_id, created_at, tags
- [ ] **S4-T1.2** 实现收藏 API
  - `POST /favorites`: 添加收藏
  - `DELETE /favorites/{id}`: 取消收藏
  - `GET /favorites`: 获取收藏列表
- [ ] **S4-T1.3** 实现收藏 UI
  - 收藏按钮 (列表/详情页)
  - 收藏状态显示
  - 收藏夹页面
  - 分类标签

### S4-T2: 标注功能 (W2/W4/W5)
- [ ] **S4-T2.1** 实现标注存储
  - `data/annotations.json`
  - 字段: id, report_id, page, text, note, created_at
- [ ] **S4-T2.2** 实现标注 API
  - `POST /annotations`: 添加标注
  - `GET /annotations?report_id={id}`: 获取标注列表
  - `DELETE /annotations/{id}`: 删除标注
- [ ] **S4-T2.3** 实现标注 UI
  - 文本高亮选择
  - 添加笔记弹窗
  - 标注列表页
  - 点击跳转原文

### S4-T3: 测试与验收
- [ ] **S4-T3.1** 功能测试
  - 收藏/标注 API 测试
- [ ] **S4-T3.2** 前端 E2E 测试
  - 收藏流程测试
  - 标注流程测试
- [ ] **S4-T3.3** 验收验证
  - [ ] AC-008-1~5: 收藏按钮、收藏状态、收藏夹、取消收藏、数据持久化
  - [ ] AC-009-1~5: 文本高亮、添加笔记、标注列表、跳转原文、删除标注

---

## 📊 任务执行矩阵

### 按里程碑查看

| 任务ID | 任务名称 | 负责人 | 状态 | 开始日期 | 完成日期 |
|--------|----------|--------|------|----------|----------|
| S1-T1 | 项目初始化 | - | ⏳ 待开始 | - | - |
| S1-T2 | 存储层实现 | - | ⏳ 待开始 | - | - |
| S1-T3 | 路由层实现 | - | ⏳ 待开始 | - | - |
| S1-T4 | 研报解析服务 | - | ⏳ 待开始 | - | - |
| S1-T5 | 前端页面实现 | - | ⏳ 待开始 | - | - |
| S1-T6 | 前端服务层 | - | ⏳ 待开始 | - | - |
| S1-T7 | 测试与验收 | - | ⏳ 待开始 | - | - |
| S2-T1 | 会话存储层 | - | ⏳ 待开始 | - | - |
| S2-T2 | Agent编排层 | - | ⏳ 待开始 | - | - |
| S2-T3 | 问答路由API | - | ⏳ 待开始 | - | - |
| S2-T4 | 前端问答组件 | - | ⏳ 待开始 | - | - |
| S2-T5 | 状态管理扩展 | - | ⏳ 待开始 | - | - |
| S2-T6 | 测试与验收 | - | ⏳ 待开始 | - | - |
| S3-T1 | 股票数据服务 | - | ⏳ 待开始 | - | - |
| S3-T2 | 股票数据API | - | ⏳ 待开始 | - | - |
| S3-T3 | 多研报对比 | - | ⏳ 待开始 | - | - |
| S3-T4 | 前端股票组件 | - | ⏳ 待开始 | - | - |
| S3-T5 | 前端对比组件 | - | ⏳ 待开始 | - | - |
| S3-T6 | 测试与验收 | - | ⏳ 待开始 | - | - |
| S4-T1 | 收藏功能 | - | ⏳ 待开始 | - | - |
| S4-T2 | 标注功能 | - | ⏳ 待开始 | - | - |
| S4-T3 | 测试与验收 | - | ⏳ 待开始 | - | - |

### 状态图例
- ⏳ 待开始
- 🔄 进行中
- ✅ 已完成
- ⏸️ 暂停
- ❌ 阻塞

---

## 🔗 依赖关系

```
S1 研报管理
  ├── 基础: 项目初始化 (S1-T1)
  ├── 数据: 存储层 (S1-T2)
  ├── 接口: 路由层 (S1-T3)
  ├── 业务: 解析服务 (S1-T4)
  └── 界面: 前端页面 (S1-T5)
      
S2 智能问答 (依赖 S1)
  ├── 数据: 会话存储 (S2-T1)
  ├── 核心: Agent编排 (S2-T2)
  ├── 接口: 问答API (S2-T3)
  └── 界面: 问答组件 (S2-T4)
      
S3 对比与联动 (依赖 S1, S2)
  ├── 数据: 股票服务 (S3-T1)
  ├── 接口: 股票API (S3-T2)
  ├── 核心: 对比服务 (S3-T3)
  └── 界面: 股票/对比组件 (S3-T4, S3-T5)
      
S4 增值功能 (依赖 S1, S2)
  ├── 收藏功能 (S4-T1)
  └── 标注功能 (S4-T2)
```

---

## 📝 备注

1. **技术栈确认**:
   - 后端: Flask + Python (根据08架构文档)
   - 前端: React + Vite + TypeScript + Tailwind CSS + Ant Design
   - 存储: JSON文件 (P0阶段)

2. **关键配置**:
   - 前端端口: 5173
   - 后端端口: 5000
   - API前缀: `/api/v1/agent`

3. **外部依赖**:
   - CoPaw API (可选)
   - 百炼 DashScope API (可选)
   - Tushare API (股票数据)

4. **降级策略**:
   - CoPaw → 百炼 → Demo (三级降级)

---

*任务清单生成时间: 2026-04-14*
*基于spec-template v0.1*
