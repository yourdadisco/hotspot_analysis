from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI超级热点解析助手"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3005,http://localhost:8000,http://localhost:8001"

    @property
    def cors_origins_list(self) -> List[str]:
        """将CORS_ORIGINS字符串转换为列表"""
        if not self.CORS_ORIGINS:
            return []
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./hotspot_analysis.db?check_same_thread=false"  # 使用SQLite进行开发

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM API
    LLM_API_KEY: str = ""  # 部署时必须设置
    LLM_API_BASE: str = "https://api.deepseek.com"
    LLM_MODEL: str = "deepseek-chat"
    LLM_MOCK_MODE: bool = False

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Data Collection
    UPDATE_SCHEDULE: str = "0 2 * * *"  # Daily at 2 AM
    MAX_HOTSPOTS_PER_UPDATE: int = 100
    USE_MOCK_COLLECTOR: bool = False  # 不使用模拟数据收集器，使用真实数据源

    # Collector Configuration
    USE_BAIDU_SEARCH: bool = False  # 禁用百度搜索收集器（用户偏好Bing搜索）
    USE_WEIBO_API: bool = False  # 启用微博API收集器（用户选择继续使用RSS科技媒体源）
    COLLECTOR_RETRY_ATTEMPTS: int = 3  # 收集器重试次数
    COLLECTOR_RETRY_DELAY: int = 5  # 重试延迟（秒）
    COLLECTOR_TIMEOUT: int = 30  # 请求超时时间（秒）

    # Deduplication Configuration
    DEDUPLICATION_ENABLED: bool = True  # 启用去重功能
    DEDUPLICATION_WINDOW_HOURS: int = 24  # 去重时间窗口（小时）
    SIMILARITY_THRESHOLD: float = 0.8  # 相似度阈值（0-1）

    # Search Engine API - Baidu
    BAIDU_API_KEY: Optional[str] = None  # 百度API Key
    BAIDU_SECRET_KEY: Optional[str] = None  # 百度Secret Key
    BAIDU_SEARCH_ENDPOINT: str = "https://api.baidu.com/json/tongji/v1/ReportService/getData"
    BAIDU_SEARCH_MAX_RESULTS: int = 50  # 每次搜索最大结果数
    BAIDU_SEARCH_KEYWORDS: str = "AI最新技术,人工智能热点,大模型进展,AI芯片,机器学习,深度学习,自然语言处理,计算机视觉,生成式AI,Gemma 4,Gemma4,Harness Engineering,AI工程化,大模型部署,模型微调,强化学习,多模态AI,AI安全,AI伦理,AI for Science,AI基础设施"  # 搜索关键词

    # Search Engine API - Bing (Microsoft Azure Cognitive Services)
    USE_BING_SEARCH: bool = True  # 启用Bing搜索收集器
    BING_API_KEY: Optional[str] = None  # Bing API Key (Azure Cognitive Services)
    BING_SEARCH_ENDPOINT: str = "https://api.bing.microsoft.com/v7.0/search"
    BING_SEARCH_MAX_RESULTS: int = 50  # 每次搜索最大结果数
    BING_SEARCH_KEYWORDS: str = "Gemma 4,Harness Engineering,AI engineering,MLOps,large language model,LLM,AI chip,AI infrastructure,multimodal AI,AI safety,AI ethics,AI for Science"  # 搜索关键词（英文为主）

    # Social Media API - Weibo
    WEIBO_APP_KEY: Optional[str] = None  # 微博App Key
    WEIBO_APP_SECRET: Optional[str] = None  # 微博App Secret
    WEIBO_ACCESS_TOKEN: Optional[str] = None  # 微博Access Token
    WEIBO_REDIRECT_URI: str = "http://localhost:8001/auth/weibo/callback"
    WEIBO_TRENDING_ENDPOINT: str = "https://api.weibo.com/2/trends/hourly.json"
    WEIBO_SEARCH_ENDPOINT: str = "https://api.weibo.com/2/search/topics.json"

    # Social Media - Bilibili (B站)
    USE_BILIBILI: bool = False  # 禁用B站收集器（用户建议替换为科技媒体）
    BILIBILI_HOT_ENDPOINT: str = "https://api.bilibili.com/x/web-interface/ranking/v2"  # 热门榜单API
    BILIBILI_SEARCH_ENDPOINT: str = "https://api.bilibili.com/x/web-interface/search/all/v2"  # 搜索API
    BILIBILI_MAX_RESULTS: int = 20  # 最大结果数
    BILIBILI_SEARCH_KEYWORDS: str = "AI,人工智能,机器学习,深度学习,大模型,Gemma,Harness Engineering,AI工程化,LLM,GPT,Claude,多模态,AI芯片,强化学习"  # B站搜索关键词

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

# Create settings instance
settings = Settings()

# 用户偏好的覆盖设置（硬编码，不受环境变量影响）
settings.USE_BAIDU_SEARCH = False
settings.USE_WEIBO_API = False
settings.USE_BING_SEARCH = False