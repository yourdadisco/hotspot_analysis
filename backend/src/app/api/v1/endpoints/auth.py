from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.user import User, UserSettings
from app.schemas.user import LoginRequest, LoginResponse, UserCreate, UserResponse, UserSettingsResponse

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    用户登录

    简化版登录：通过邮箱验证用户，如果用户不存在则创建
    """
    # 查询用户
    stmt = select(User).where(User.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        # 用户不存在，创建新用户（简化注册流程）
        user = User(email=login_data.email)
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # 创建默认用户设置
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    else:
        # 用户存在，更新最后登录时间
        user.last_login_at = func.now()
        await db.commit()
        await db.refresh(user)

        # 获取用户设置
        stmt = select(UserSettings).where(UserSettings.user_id == user.id)
        result = await db.execute(stmt)
        settings = result.scalar_one_or_none()

    # 转换为响应模型
    user_response = UserResponse.model_validate(user)
    settings_response = UserSettingsResponse.model_validate(settings) if settings else None

    return LoginResponse(
        user=user_response,
        settings=settings_response
    )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户信息
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    return UserResponse.model_validate(user)

@router.put("/users/{user_id}/business", response_model=UserResponse)
async def update_user_business(
    user_id: str,
    update_data: dict,  # 简化，实际应有具体schema
    db: AsyncSession = Depends(get_db)
):
    """
    更新用户业务描述
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    # 更新业务描述
    if "business_description" in update_data:
        user.business_description = update_data["business_description"]
    if "company_name" in update_data:
        user.company_name = update_data["company_name"]
    if "industry" in update_data:
        user.industry = update_data["industry"]

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)