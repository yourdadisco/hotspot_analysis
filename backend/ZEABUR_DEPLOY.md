# Zeabur 部署指南

## 第一步：部署后端

1. 打开 https://zeabur.com ，GitHub 登录
2. **创建项目 → 部署新服务 → 导入 GitHub 仓库**
3. 选择 `hotspot_analysis`
4. 类型选 **Web 服务**，会自动检测 Dockerfile
5. 点 **部署**（此时会失败，因为还没环境变量）

## 第二步：添加 PostgreSQL

1. 在项目中点 **新建服务 → Database → PostgreSQL**
2. 等它部署完成（约 1 分钟）
3. 部署好后，PostgreSQL 服务页面会显示 **连接方式**
4. 找到 `DATABASE_URL`（格式如 `postgresql://user:pass@host:5432/db`）
5. **复制这个值**

## 第三步：配置后端环境变量

1. 回到后端 Web 服务 → **Environment Variables**
2. 添加以下变量：

| 变量 | 值 |
|------|-----|
| `DATABASE_URL` | 粘贴刚复制的 PostgreSQL 连接串 |
| `CORS_ORIGINS` | 先填 `*`，前端部署后再改 |
| `LLM_API_KEY` | 你的 DeepSeek API Key |
| `DEBUG` | `false` |

3. 系统会自动重新部署

## 第四步：部署前端

1. **新建服务 → 导入 GitHub 仓库**（还是 `hotspot_analysis`）
2. 类型选 **静态网站**
3. **Root directory** 填 `frontend`
4. **Build command** 填 `npm run build`
5. **Output directory** 填 `dist`
6. 添加环境变量：

| 变量 | 值 |
|------|-----|
| `VITE_API_BASE_URL` | `https://后端域名.zeabur.app/api/v1` |

7. 部署完成后，复制前端域名（`xxx.zeabur.app`）

## 第五步：更新 CORS

1. 回到后端服务 → **Environment Variables**
2. 把 `CORS_ORIGINS` 改为 `https://xxx.zeabur.app`（你前端的域名）
3. 自动重新部署，完成
