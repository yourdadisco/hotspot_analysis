FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE 8001

# 启动命令 - 使用 $PORT 环境变量（Zeabur 自动分配）
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8001}
