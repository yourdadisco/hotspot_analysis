# CLAUDE.md

本文档为 Claude Code（claude.ai/code）在本仓库中工作时提供指导。

## 项目概述

本仓库包含 **AI 超级热点解析助手** — 一个用于分析热点话题并提供 AI 驱动洞察的全栈应用。系统从多个来源收集 AI 相关新闻和动态，分析其与用户业务的相关性，并给出重要性分级和详细说明。

## 开发环境

### 前置条件
- Node.js 18+（前端开发）
- Python 3.11+（后端 / AI 服务）
- PostgreSQL 15+（或 SQLite 用于开发）
- Redis（用于 Celery 任务队列）

### 初始化设置
```bash
# 后端设置
cd backend
pip install -r requirements.txt

# 前端设置
cd frontend
npm install

# 环境配置
# 根据需要调整 .env.example 文件
```

## 项目结构

```
├── frontend/           # React + TypeScript + Tailwind CSS 前端
│   ├── src/           # 源代码
│   ├── public/        # 静态资源
│   └── package.json   # 依赖配置
├── backend/           # FastAPI + SQLAlchemy + Celery 后端
│   ├── src/app/       # 应用代码
│   ├── src/app/models/       # 数据库模型
│   ├── src/app/schemas/      # Pydantic 模式
│   ├── src/app/api/v1/       # API 端点
│   ├── src/app/services/     # 业务逻辑
│   ├── src/app/tasks/        # Celery 任务
│   └── requirements.txt      # Python 依赖
└── CLAUDE.md          # 本文件
```

## 构建与运行

### 后端开发服务器
```bash
cd backend
python src/main.py
```
服务运行在 http://localhost:8001
API 文档: http://localhost:8001/docs

### 前端开发服务器
```bash
cd frontend
npm run dev
```
前端运行在 http://localhost:3001（若不可用则为 3000）

### 数据库设置
```bash
# 开发环境使用 SQLite（自动创建）
# 如需使用 PostgreSQL，更新 backend/.env 中的 DATABASE_URL
```

## 测试

### 后端测试
```bash
cd backend
pytest
```

### 前端测试
```bash
cd frontend
npm test
```

### API 测试
```bash
# 测试采集端点
python test_collection_api.py

# 测试采集服务
python test_collection_service.py
```

## 关键环境变量

### 后端（.env）
- `DATABASE_URL`: PostgreSQL/SQLite 连接字符串
- `REDIS_URL`: Redis 连接 URL
- `LLM_API_KEY`: DeepSeek/OpenAI 兼容 API 密钥
- `LLM_MOCK_MODE`: 设为 True 以在开发中不使用真实 API
- `USE_MOCK_COLLECTOR`: 设为 True 以使用模拟数据采集

### 前端（.env）
- `VITE_API_BASE_URL`: 后端 API 基础 URL（默认 http://localhost:8001/api/v1）

---

## 开发守则（强制）

### 守则1：Plan Mode 先行
对于任何非平凡的开发任务（新增功能、重构、修改多处代码），必须在编写代码之前调用 EnterPlanMode 进入计划模式。先输出计划给用户确认，获得批准后再实施。简单的单文件修复、bug 修复可以不经过此流程。

### 守则2：上下文窗口管控 — 自主压缩，不打扰用户
需求收集完成后、正式写代码之前，先确认模型型号及上下文窗口大小（问用户或自查）。确认之后自己把控，不要因为这个事来问用户。具体做法：
  - 每次回复前估算当前上下文消耗，**自行判断何时接近上限**，不要设定固定百分比，而是根据对话内容量、已读文件大小、剩余可用轮次综合判断
  - 接近上限时**自主压缩**：主动总结已完成的对话内容、丢弃非关键细节、用子代理做探索而非把大文件拉入主上下文
  - 优先使用 Grep/Glob/Agent(Explore) 等聚焦工具代替全文读取
  - 大任务主动拆分为多个独立子任务、分次完成
  - 如果无论如何都装不下，才在回复末尾简短提一句「建议新会话继续」，不要专门停下来问

---

## 更新本文件

随着项目发展，请更新此 CLAUDE.md 文件：

1. **实际的构建命令**（`npm run dev`、`python app.py` 等）
2. **测试命令**（`npm test`、`pytest` 等）
3. **项目专属架构说明**
4. **环境变量及配置要求**
5. **部署说明**

*最后更新: 2026-04-24*