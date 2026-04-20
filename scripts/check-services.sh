#!/bin/bash

set -e

echo "🔍 AI超级热点解析助手 - 服务状态检查"
echo "====================================="

# 检查Docker Compose文件
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ 未找到生产环境Docker Compose文件: $COMPOSE_FILE"
    exit 1
fi

# 检查服务运行状态
echo "📊 检查Docker服务状态..."
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "🔧 检查各服务健康状况..."

# 检查后端健康
echo "🌐 检查后端API健康..."
BACKEND_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v1/health || echo "curl_failed")
if [ "$BACKEND_HEALTH" = "200" ]; then
    echo "✅ 后端服务正常 (HTTP 200)"
else
    echo "❌ 后端服务异常 (HTTP $BACKEND_HEALTH)"
fi

# 检查前端访问
echo "🖥️  检查前端访问..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "curl_failed")
if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "302" ] || [ "$FRONTEND_STATUS" = "304" ]; then
    echo "✅ 前端服务正常 (HTTP $FRONTEND_STATUS)"
else
    echo "❌ 前端服务异常 (HTTP $FRONTEND_STATUS)"
fi

# 检查数据库连接
echo "🗄️  检查数据库连接..."
DB_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q postgres)
if [ -n "$DB_CONTAINER" ]; then
    if docker exec "$DB_CONTAINER" pg_isready -U admin; then
        echo "✅ 数据库连接正常"
    else
        echo "❌ 数据库连接异常"
    fi
else
    echo "⚠️  数据库容器未运行"
fi

# 检查Redis连接
echo "🔴 检查Redis连接..."
REDIS_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q redis)
if [ -n "$REDIS_CONTAINER" ]; then
    if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis连接正常"
    else
        echo "❌ Redis连接异常"
    fi
else
    echo "⚠️  Redis容器未运行"
fi

# 检查Celery Worker
echo "⚙️  检查Celery Worker..."
CELERY_WORKER_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q celery-worker)
if [ -n "$CELERY_WORKER_CONTAINER" ]; then
    CELERY_STATUS=$(docker exec "$CELERY_WORKER_CONTAINER" ps aux | grep celery | grep -v grep | wc -l)
    if [ "$CELERY_STATUS" -ge 1 ]; then
        echo "✅ Celery Worker运行正常 ($CELERY_STATUS 个进程)"
    else
        echo "❌ Celery Worker未运行"
    fi
else
    echo "⚠️  Celery Worker容器未运行"
fi

echo ""
echo "📈 系统资源使用情况："
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker-compose -f "$COMPOSE_FILE" ps -q)

echo ""
echo "📋 检查完成！"