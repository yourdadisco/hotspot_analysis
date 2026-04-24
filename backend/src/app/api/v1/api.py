from fastapi import APIRouter

from app.api.v1.endpoints import health, auth, hotspots, user_settings, api_usage, analysis, collection, model_config, user_actions

api_router = APIRouter()

# 注册各个模块的路由
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(hotspots.router, tags=["hotspots"])
api_router.include_router(user_settings.router, tags=["user-settings"])
api_router.include_router(api_usage.router, tags=["api-usage"])
api_router.include_router(analysis.router, tags=["analysis"])
api_router.include_router(collection.router, tags=["collection"])
api_router.include_router(model_config.router, tags=["model-config"])
api_router.include_router(user_actions.router, tags=["user-actions"])