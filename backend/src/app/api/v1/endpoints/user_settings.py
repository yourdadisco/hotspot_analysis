from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import UserSettings
from app.schemas.user import UserSettingsResponse, UserSettingsUpdate
from app.services.scheduler_service import reschedule

router = APIRouter()

@router.get("/users/{user_id}/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户设置
    """
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户设置不存在"
        )

    return UserSettingsResponse.model_validate(settings)

@router.put("/users/{user_id}/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    user_id: str,
    update_data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    更新用户设置
    """
    stmt = select(UserSettings).where(UserSettings.user_id == user_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()

    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户设置不存在"
        )

    # 更新设置字段
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    await db.commit()
    await db.refresh(settings)

    # Reschedule auto-update jobs since settings have changed
    await reschedule()

    return UserSettingsResponse.model_validate(settings)