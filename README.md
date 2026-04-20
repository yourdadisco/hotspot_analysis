# AI超级热点解析助手

一个智能的AI行业热点分析工具，帮助B端企业了解AI领域最新动态，并根据业务需求提供个性化的热点分析和优先级排序。

## 项目概述

本项目旨在解决B端AI产品经理和业务人员获取和分析AI行业动态的痛点，通过自动收集、分析和分级AI热点信息，提供有针对性的业务洞察。

### 核心功能

- 🔍 **多源热点收集**：从主流新闻媒体、技术社区和社交媒体收集AI相关动态
- 🎯 **业务匹配分析**：根据用户公司业务进行相关性分析
- 📊 **五级重要性分级**：紧急/高/中/低/关注五级分类
- 📝 **智能分析报告**：包含重要性解释、业务影响和行动建议
- ⏰ **定时自动更新**：每日自动更新热点信息

## 技术架构

### 前端
- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand + React Query
- **构建工具**: Vite

### 后端
- **框架**: FastAPI (Python)
- **数据库**: PostgreSQL
- **任务队列**: Celery + Redis
- **大模型集成**: DeepSeek/OpenAI兼容API

### 部署
- **容器化**: Docker + Docker Compose
- **数据库**: PostgreSQL 15
- **缓存/队列**: Redis 7

## 快速开始

### 环境要求
- Docker & Docker Compose
- Node.js 18+ (仅前端开发需要)
- Python 3.11+ (仅后端开发需要)

### 使用Docker快速启动

1. **克隆项目**
   ```bash
   git clone https://github.com/yourdadisco/hotspot_analysis.git
   cd hotspot_analysis
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑.env文件，设置您的LLM API密钥
   ```

3. **启动所有服务**
   ```bash
   docker-compose up -d
   ```

4. **访问应用**
   - 前端: http://localhost:3000
   - 后端API文档: http://localhost:8000/docs
   - 数据库管理: PostgreSQL on port 5432

### 开发环境设置

#### 前端开发
```bash
cd frontend
npm install
npm run dev
```

#### 后端开发
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或 venv\Scripts\activate  # Windows
pip install -r requirements.txt

# 启动开发服务器
uvicorn src.main:app --reload
```

## 项目结构

```
hotspot_analysis/
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── components/ # React组件
│   │   ├── pages/      # 页面组件
│   │   ├── hooks/      # 自定义Hooks
│   │   ├── store/      # 状态管理
│   │   └── utils/      # 工具函数
│   └── package.json    # 前端依赖
├── backend/            # FastAPI后端
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/    # API路由
│   │   │   ├── core/   # 核心配置
│   │   │   ├── models/ # 数据模型
│   │   │   ├── services/# 业务逻辑
│   │   │   └── tasks/  # Celery任务
│   └── requirements.txt # Python依赖
├── docker/             # Docker配置
├── docs/               # 项目文档
├── docker-compose.yml  # 容器编排
└── .env.example        # 环境变量示例
```

## API文档

启动后端服务后，访问以下地址查看完整的API文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 主要API端点

- `GET /api/v1/hotspots` - 获取热点列表
- `GET /api/v1/hotspots/{id}` - 获取热点详情
- `PUT /api/v1/users/{id}/business` - 更新业务描述
- `POST /api/v1/hotspots/refresh` - 手动更新热点
- `GET /api/v1/health` - 健康检查

## 数据流

1. **数据收集**: Celery定时任务从预设信息源爬取AI热点
2. **内容解析**: 提取标题、摘要、来源等元数据
3. **业务匹配**: 根据用户业务描述进行相关性分析
4. **重要性分级**: 使用大模型进行五级重要性分类
5. **报告生成**: 生成包含分析内容的完整报告
6. **前端展示**: 用户在前端查看分级热点和分析报告

## 配置说明

### 环境变量

重要环境变量配置：

```env
# LLM API配置（必须）
LLM_API_KEY=sk-274f031095b04a6a90cbef3ec319281f

# 数据库配置
DATABASE_URL=postgresql+asyncpg://admin:password@postgres/hotspot_analysis

# Redis配置
REDIS_URL=redis://redis:6379/0

# 更新计划（Cron表达式）
UPDATE_SCHEDULE=0 2 * * *  # 每天凌晨2点
```

### 信息源配置

信息源在后台任务中配置，支持：
- 新闻媒体（TechCrunch, 36氪等）
- 技术社区（GitHub, Medium, Towards Data Science）
- 社交媒体（Twitter, Reddit, LinkedIn）

## 开发指南

### 添加新信息源

1. 在 `backend/src/app/tasks/crawlers/` 创建新的爬虫类
2. 实现数据采集和解析逻辑
3. 在任务调度器中注册新爬虫
4. 更新数据模型以支持新信息源类型

### 自定义分析逻辑

1. 修改 `backend/src/app/services/analysis/` 中的分析服务
2. 调整提示词模板以优化大模型输出
3. 更新重要性分类算法

### 扩展前端功能

1. 在 `frontend/src/components/` 创建新的React组件
2. 在 `frontend/src/pages/` 添加新页面
3. 更新路由配置和API调用

## 部署说明

### 生产环境部署

本系统提供了专门的生产环境Docker配置，包含安全加固、性能优化和健康检查。

#### 1. 准备工作

```bash
# 克隆项目
git clone https://github.com/yourdadisco/hotspot_analysis.git
cd hotspot_analysis

# 复制环境变量配置文件
cp .env.example .env
```

#### 2. 配置生产环境变量

编辑 `.env` 文件，设置以下关键变量：

```bash
# 必需配置
DB_PASSWORD=your_secure_postgres_password
REDIS_PASSWORD=your_secure_redis_password
LLM_API_KEY=sk-your-deepseek-api-key-here
SECRET_KEY=your-secret-key-change-in-production-with-minimum-32-chars

# 重要生产设置（必须设为False）
DEBUG=False
LLM_MOCK_MODE=False
USE_MOCK_COLLECTOR=False

# CORS配置（根据实际域名调整）
CORS_ORIGINS=https://yourdomain.com,http://localhost:3000
```

#### 3. 构建生产镜像

```bash
# 构建所有服务镜像
docker-compose -f docker-compose.prod.yml build
```

#### 4. 启动生产服务

```bash
# 启动所有服务（后台运行）
docker-compose -f docker-compose.prod.yml up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 5. 验证部署

- **前端应用**: http://yourdomain.com 或 http://localhost:80
- **后端API文档**: http://yourdomain.com:8001/docs 或 http://localhost:8001/docs
- **健康检查**: http://yourdomain.com:8001/api/v1/health

#### 6. 服务说明

生产环境包含以下服务：
- **前端**: Nginx服务静态文件 (端口80)
- **后端**: FastAPI应用 (端口8001)
- **PostgreSQL**: 数据库 (端口5432)
- **Redis**: 缓存和消息队列 (端口6379)
- **Celery Worker**: 异步任务处理
- **Celery Beat**: 定时任务调度

#### 7. 数据持久化

数据通过Docker卷持久化：
- `postgres_data_prod`: PostgreSQL数据
- `redis_data_prod`: Redis数据

### 监控和维护

- **日志查看**: `docker-compose logs -f [service_name]`
- **数据库备份**: 定期备份PostgreSQL数据
- **性能监控**: 配置Prometheus + Grafana
- **错误告警**: 设置异常监控和告警

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请通过GitHub Issues提交。

---

**开发状态**: 🚧 开发中 | **版本**: 0.1.0 | **最后更新**: 2026-04-19