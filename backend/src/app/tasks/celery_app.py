from celery import Celery
from app.core.config import settings

# 创建Celery应用
celery_app = Celery(
    "hotspot_analysis",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.analysis_tasks", "app.tasks.collection_tasks"]
)

# 配置Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    worker_prefetch_multiplier=1,  # 防止内存占用过高
    task_acks_late=True,  # 任务执行完成后再确认
    worker_max_tasks_per_child=100,  # 每个worker子进程最大任务数
)

# 配置定时任务（Celery Beat）
celery_app.conf.beat_schedule = {
    "collect-hotspots-daily": {
        "task": "app.tasks.collection_tasks.collect_hotspots",
        "schedule": 86400.0,  # 每天一次（秒）
        "args": (),
    },
    "cleanup-old-records-weekly": {
        "task": "app.tasks.analysis_tasks.cleanup_old_analyses",
        "schedule": 604800.0,  # 每周一次
        "args": (30,),  # 保留30天内的记录
    },
}

# 创建应用上下文
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Celery配置完成后设置定时任务"""
    pass