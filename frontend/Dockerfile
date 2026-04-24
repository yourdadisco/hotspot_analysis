# ---- Build stage ----
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码
COPY . .

# 构建时传入生产环境 API 地址
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-https://your-backend.zeabur.app/api/v1}

# 构建
RUN npm run build

# ---- Serve stage ----
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 配置 — SPA 路由回退到 index.html
# 注：使用 heredoc 避免 $uri 被 shell 展开
RUN cat > /etc/nginx/conf.d/default.conf << 'EOF'
server {
    listen      8080;
    server_name  _;
    root         /usr/share/nginx/html;
    index        index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}
EOF

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
