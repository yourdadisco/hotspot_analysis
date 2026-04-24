import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import UserSettings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

UPDATE_SCHEDULE_MAP = {
    "hourly": CronTrigger(hour="*", minute=5),
    "daily_2am": CronTrigger(hour=2, minute=0),
    "daily_6am": CronTrigger(hour=6, minute=0),
}


async def collect_for_all_users():
    """Run global hotspot collection for all users with auto-update enabled."""
    from app.tasks.collection_tasks import collect_hotspots_async

    logger.info("Scheduler: Running auto collection for all users")
    try:
        result = await collect_hotspots_async()
        success = result.get("success", False)
        if success:
            logger.info(
                f"Scheduler: Collection completed — "
                f"new={result.get('collected', 0)}, updated={result.get('updated', 0)}"
            )
        else:
            logger.warning(f"Scheduler: Collection returned non-success: {result.get('error')}")
    except Exception as e:
        logger.error(f"Scheduler: Collection failed: {e}", exc_info=True)


async def init_scheduler():
    """Load user settings and schedule collection jobs accordingly."""
    async with AsyncSessionLocal() as db:
        stmt = select(UserSettings).where(
            UserSettings.update_schedule.in_(UPDATE_SCHEDULE_MAP.keys())
        )
        result = await db.execute(stmt)
        user_settings = result.scalars().all()

    schedules_needed = set()
    for us in user_settings:
        schedules_needed.add(us.update_schedule)

    for schedule in schedules_needed:
        trigger = UPDATE_SCHEDULE_MAP[schedule]
        job_id = f"auto_collect_{schedule}"
        scheduler.add_job(
            collect_for_all_users,
            trigger=trigger,
            id=job_id,
            replace_existing=True,
            name=f"Auto hotspot collection ({schedule})",
        )
        logger.info(f"Scheduler: Scheduled auto collection — {schedule}")

    if not schedules_needed:
        logger.info("Scheduler: No auto-update schedules configured — collection disabled")
    else:
        logger.info(f"Scheduler: Active schedules — {', '.join(sorted(schedules_needed))}")

    scheduler.start()


async def reschedule():
    """Reload user settings and rebuild scheduler jobs."""
    for job in list(scheduler.get_jobs()):
        if job.id and job.id.startswith("auto_collect_"):
            scheduler.remove_job(job.id)
    await init_scheduler()


async def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
