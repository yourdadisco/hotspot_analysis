"""
内存进度跟踪器 - 用于跟踪异步任务的执行进度
支持收集和分析任务的进度报告，前端通过轮询获取进度
"""
import time
import logging
import threading
from typing import Dict, Optional, List
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class TaskProgress:
    task_id: str
    task_type: str  # "collection" | "analysis"
    title: str
    status: str  # "pending" | "running" | "completed" | "failed"
    progress: int = 0  # 0-100
    current_step: str = ""
    steps: List[str] = field(default_factory=list)
    error: Optional[str] = None
    created_at: float = 0.0
    updated_at: float = 0.0


class ProgressTracker:
    """内存进度跟踪器，单例模式"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._tasks: Dict[str, TaskProgress] = {}
                    cls._instance._data_lock = threading.Lock()
        return cls._instance

    def create_task(self, task_id: str, task_type: str, title: str) -> None:
        now = time.time()
        task = TaskProgress(
            task_id=task_id,
            task_type=task_type,
            title=title,
            status="running",
            progress=0,
            current_step="初始化...",
            created_at=now,
            updated_at=now,
        )
        with self._data_lock:
            self._cleanup_locked()
            self._tasks[task_id] = task
        logger.info(f"创建进度任务: {task_id} ({task_type}) - {title}")

    def update_progress(
        self, task_id: str, progress: int, current_step: Optional[str] = None
    ) -> None:
        with self._data_lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.progress = min(progress, 100)
            if current_step:
                task.current_step = current_step
            task.updated_at = time.time()

    def append_step(self, task_id: str, step_name: str) -> None:
        with self._data_lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            if step_name not in task.steps:
                task.steps.append(step_name)
            task.updated_at = time.time()

    def complete_task(self, task_id: str) -> None:
        with self._data_lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.status = "completed"
            task.progress = 100
            task.current_step = "完成"
            task.updated_at = time.time()
        logger.info(f"任务完成: {task_id}")

    def fail_task(self, task_id: str, error: str) -> None:
        with self._data_lock:
            task = self._tasks.get(task_id)
            if not task:
                return
            task.status = "failed"
            task.error = error
            task.updated_at = time.time()
        logger.warning(f"任务失败: {task_id} - {error}")

    def get_progress(self, task_id: str) -> Optional[dict]:
        with self._data_lock:
            task = self._tasks.get(task_id)
            if not task:
                return None
            return {
                "task_id": task.task_id,
                "task_type": task.task_type,
                "title": task.title,
                "status": task.status,
                "progress": task.progress,
                "current_step": task.current_step,
                "steps": task.steps,
                "error": task.error,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
            }

    def get_all_active_tasks(self) -> List[dict]:
        with self._data_lock:
            return [
                self.get_progress(tid)
                for tid, t in self._tasks.items()
                if t.status in ("pending", "running")
            ]

    def _cleanup_locked(self) -> None:
        """清理超过5分钟的已完成/失败任务"""
        now = time.time()
        expired = [
            tid
            for tid, t in self._tasks.items()
            if t.status in ("completed", "failed") and now - t.updated_at > 300
        ]
        for tid in expired:
            del self._tasks[tid]
        if expired:
            logger.debug(f"清理过期任务: {expired}")

    def cleanup(self) -> int:
        """手动触发清理，返回清理数量"""
        with self._data_lock:
            before = len(self._tasks)
            self._cleanup_locked()
            return before - len(self._tasks)


# 全局单例
progress_tracker = ProgressTracker()
