# 投研助手 - Agent 开发指南

## 项目概述

投研助手是一款面向证券分析师的AI驱动投研工具，支持研报上传、智能解析、对比分析和AI问答等功能。

## 技术栈

### 后端
- **框架**: Flask + Flask-RESTX
- **Python**: 3.11+
- **AI服务**: 百炼API (阿里云DashScope)
- **存储**: JSON文件存储 (P0阶段)

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI组件**: Ant Design 5.x
- **样式**: Tailwind CSS

## 项目结构

```
research-assistant/
├── backend/                    # 后端服务
│   ├── routes/                # API路由
│   │   └── agent_ns.py        # 研报管理API命名空间
│   ├── services/              # 业务服务
│   │   ├── ai_service.py      # 百炼AI服务
│   │   ├── parser.py          # 研报解析服务
│   │   └── report_fetcher.py  # 研报抓取服务
│   ├── storage/               # 数据存储
│   │   ├── base.py            # 基础存储类
│   │   ├── report_storage.py  # 研报存储
│   │   └── file_storage.py    # 文件存储
│   ├── data/                  # 数据目录
│   │   ├── reports.json       # 研报数据
│   │   └── uploads/           # 上传文件
│   ├── .env                   # 环境变量
│   ├── requirements.txt       # Python依赖
│   └── wsgi.py                # 应用入口
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── AIStatus.tsx   # AI状态显示
│   │   │   └── UploadModal.tsx # 上传弹窗
│   │   ├── pages/             # 页面
│   │   │   ├── ReportList.tsx # 研报列表页(左中布局)
│   │   │   └── Analysis.tsx   # 智能分析页(左中布局)
│   │   ├── services/          # API服务
│   │   │   ├── api.ts         # 研报API
│   │   │   └── aiService.ts   # AI服务
│   │   ├── types/             # TypeScript类型
│   │   │   ├── index.ts       # 基础类型
│   │   │   └── analysis.ts    # 分析相关类型
│   │   ├── App.tsx            # 应用入口(顶部导航)
│   │   └── main.tsx           # 渲染入口
│   ├── package.json
│   └── vite.config.ts
│
└── AGENTS.md                  # 本文件
```

## 核心功能模块

### 1. 研报管理 (S1)
**布局**: 左侧研报列表 + 中间研报详情(三标签页)

- **研报抓取**: 通过百炼API自动抓取/生成研报数据，支持去重拉新
- 研报上传 (PDF/HTML)
- 左侧：研报卡片列表(320px宽度，带【自动】标签)
- 中间：研报详情展示
  - 研报内容标签页(核心观点摘要、财务预测)
  - 研报总结标签页(核心观点、投资评级)
  - 关键摘要标签页(研报摘要、投资要点)
  - 批注标签页(预留)
  - 元数据标签页
- 研报解析状态跟踪
- 删除和重新解析

**API端点**:
- `GET /api/v1/agent/reports` - 获取研报列表
- `POST /api/v1/agent/reports/upload` - 上传研报
- `POST /api/v1/agent/reports/fetch` - 抓取研报(百炼生成)
- `GET /api/v1/agent/reports/{id}` - 获取研报详情
- `DELETE /api/v1/agent/reports/{id}` - 删除研报
- `POST /api/v1/agent/reports/{id}/reparse` - 重新解析

### 2. 智能分析 (S2)
**布局**: 左侧选择面板 + 中间核心内容(双模式切换)

- **研报对比模式**:
  - 左侧：研报选择列表(Checkbox) + 对比维度选择
  - 中间：对比分析结果(共同点、差异点、投资建议)
  
- **AI问答模式**:
  - 左侧：参考研报选择列表
  - 中间：对话历史 + 输入框

**API端点**:
- `POST /api/v1/agent/analysis/compare` - 对比分析
- `POST /api/v1/agent/analysis/query` - AI问答

### 3. AI服务集成
- 百炼API连接检测
- 文本生成

**API端点**:
- `GET /api/v1/agent/ai-status` - AI服务状态

## 环境配置

### 后端环境变量 (.env)
```bash
# 百炼API配置
BAILIAN_API_KEY=sk-f47c2e9de62c4375800379e938e2c25b
BAILIAN_API_URL=https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation

# Flask配置
SECRET_KEY=dev-secret-key
FLASK_ENV=development
```

### 前端代理配置 (vite.config.ts)
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:5002',
      changeOrigin: true,
    },
  },
}
```

## 开发规范

### API开发规范
1. 所有API响应使用统一格式:
```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "trace_id": "xxx"
}
```

2. 错误码规范:
   - `0`: 成功
   - `4xx`: 客户端错误
   - `5xx`: 服务端错误

3. 使用Flask-RESTX自动生成Swagger文档，访问 `/swagger`

### 前端开发规范
1. 组件使用函数式组件 + Hooks
2. 类型定义放在 `types/` 目录
3. API调用封装在 `services/` 目录
4. 使用Tailwind CSS进行样式开发

## 启动服务

### 后端
```bash
cd backend
pip3 install -r requirements.txt
PORT=5002 python3 wsgi.py
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

## 研报数据来源

### 1. 自动抓取
通过百炼API自动抓取/生成研报数据：
- 支持批量抓取(1-20份)
- **去重拉新**: 自动跳过已抓取的公司，优先抓取新研报
- 支持AI智能生成研报分析
- 预定义12家上市公司数据池
- 自动研报带【自动】标签标识

### 2. 手动上传
支持上传PDF/HTML格式的研报文件

### 数据覆盖公司
- 贵州茅台 (600519.SH)
- 宁德时代 (300750.SZ)
- 比亚迪 (002594.SZ)
- 腾讯控股 (00700.HK)
- 招商银行 (600036.SH)
- 美团 (03690.HK)
- 中芯国际 (00981.HK)
- 药明康德 (603259.SH)
- 中国平安 (601318.SH)
- 五粮液 (000858.SZ)
- 隆基绿能 (601012.SH)
- 海康威视 (002415.SZ)

## 开发注意事项

### Python开发
1. 使用 `pip3` 而非 `pip`
2. 安装包时使用清华镜像: `-i https://pypi.tuna.tsinghua.edu.cn/simple`
3. 字典字面量必须完整书写，不能截断
4. f-string注意括号闭合

### 前端开发
1. Ant Design组件属性参考官方文档
2. 图标使用 `@ant-design/icons`
3. 响应式布局使用Tailwind的响应式类
4. **页面布局规范**:
   - 顶部固定Header(64px高度)：Logo + 水平导航菜单 + AI状态
   - 主内容区：`height: calc(100vh - 64px)`
   - 左右分栏布局：左侧固定宽度(320-45%)，中间flex:1自适应
   - 使用 `overflow: auto` 处理内容滚动

### AI服务
1. 所有AI能力统一接入百炼API
2. 默认使用 `qwen-turbo` 模型
3. API密钥存储在 `.env` 文件

## 后续开发计划

### S3 待开发
- 股票数据集成 (Tushare)
- 多研报对比可视化
- 研报收藏和标注

### S4 待开发
- 智能摘要生成
- 风险预警提示
- 估值模型计算

## 常见问题

### 端口占用
后端默认使用5000端口，如被占用可更换:
```bash
PORT=5002 python3 wsgi.py
```

### 前端代理
修改 `vite.config.ts` 中的 `target` 为实际后端端口

### AI连接失败
检查 `.env` 文件中的 `BAILIAN_API_KEY` 是否配置正确

## 联系

如有问题，请参考项目文档或联系开发团队。
