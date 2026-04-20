#!/bin/bash

set -e

echo "🚀 AI超级热点解析助手 - 生产环境部署脚本"
echo "=========================================="

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

echo "✅ Docker和Docker Compose已安装"

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "📋 未找到.env文件，正在从.env.example创建..."
    cp .env.example .env
    echo "⚠️  请编辑.env文件，配置生产环境变量"
    echo "   重要配置项："
    echo "   - DB_PASSWORD: PostgreSQL数据库密码"
    echo "   - REDIS_PASSWORD: Redis密码"
    echo "   - LLM_API_KEY: DeepSeek API密钥"
    echo "   - SECRET_KEY: 应用密钥（至少32字符）"
    echo "   - 确保DEBUG=False, LLM_MOCK_MODE=False, USE_MOCK_COLLECTOR=False"
    exit 1
fi

# 提示用户确认配置
echo "🔍 当前环境配置检查："
if grep -q "DEBUG=true" .env; then
    echo "⚠️  警告：DEBUG模式已启用，生产环境建议设置为False"
fi

if grep -q "LLM_MOCK_MODE=true" .env; then
    echo "⚠️  警告：LLM_MOCK_MODE已启用，将使用模拟数据"
fi

if grep -q "USE_MOCK_COLLECTOR=true" .env; then
    echo "⚠️  警告：USE_MOCK_COLLECTOR已启用，将使用模拟数据收集"
fi

echo ""
read -p "是否继续部署？(y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 部署已取消"
    exit 0
fi

# 构建镜像
echo "🔨 正在构建生产镜像..."
docker-compose -f docker-compose.prod.yml build

# 启动服务
echo "🚀 正在启动生产服务..."
docker-compose -f docker-compose.prod.yml up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📊 服务状态检查："
docker-compose -f docker-compose.prod.yml ps

# 显示访问信息
echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 访问地址："
echo "   前端应用: http://localhost"
echo "   API文档: http://localhost:8001/docs"
echo "   健康检查: http://localhost:8001/api/v1/health"
echo ""
echo "🔧 管理命令："
echo "   查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "   停止服务: docker-compose -f docker-compose.prod.yml down"
echo "   重启服务: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "📝 注意事项："
echo "   1. 首次启动会自动运行数据库迁移"
echo "   2. 请确保防火墙已开放端口：80, 8001, 5432, 6379"
echo "   3. 数据存储在Docker卷中，备份请备份对应卷"
echo "   4. 定期查看日志和监控系统状态"