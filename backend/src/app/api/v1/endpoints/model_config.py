import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import AsyncOpenAI

from app.core.database import get_db
from app.models.model_config import UserModelConfig
from app.schemas.user import UserModelConfigResponse, UserModelConfigUpdate

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/users/{user_id}/model-config", response_model=UserModelConfigResponse)
async def get_user_model_config(
    user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取用户的模型配置，不存在则返回默认值"""
    stmt = select(UserModelConfig).where(UserModelConfig.user_id == user_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        # 返回默认配置
        return UserModelConfigResponse(
            id=str(uuid.uuid4()),
            user_id=uuid.UUID(user_id),
            provider="deepseek",
            api_key="",
            api_base_url="https://api.deepseek.com",
            model_name="deepseek-chat",
            is_active="Y",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

    return UserModelConfigResponse.model_validate(config)


@router.put("/users/{user_id}/model-config", response_model=UserModelConfigResponse)
async def update_user_model_config(
    user_id: str,
    update_data: UserModelConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """创建或更新用户的模型配置（upsert）"""
    stmt = select(UserModelConfig).where(UserModelConfig.user_id == user_id)
    result = await db.execute(stmt)
    config = result.scalar_one_or_none()

    if not config:
        config = UserModelConfig(user_id=user_id)
        db.add(config)
        await db.flush()

    # 仅更新提供的字段
    update_dict = update_data.model_dump(exclude_unset=True)

    # api_key 为空时跳过（避免覆盖）
    if "api_key" in update_dict and not update_dict["api_key"]:
        del update_dict["api_key"]

    for field, value in update_dict.items():
        setattr(config, field, value)

    await db.commit()
    await db.refresh(config)
    return UserModelConfigResponse.model_validate(config)


@router.post("/users/{user_id}/model-config/test")
async def test_model_config(
    user_id: str,
    config_data: UserModelConfigUpdate,
    db: AsyncSession = Depends(get_db)
):
    """测试模型连接"""
    api_key = config_data.api_key
    api_base = config_data.api_base_url or "https://api.deepseek.com"
    model = config_data.model_name or "deepseek-chat"

    if not api_key:
        # 尝试从数据库加载
        stmt = select(UserModelConfig).where(UserModelConfig.user_id == user_id)
        result = await db.execute(stmt)
        db_config = result.scalar_one_or_none()
        if db_config and db_config.api_key:
            api_key = db_config.api_key
            api_base = db_config.api_base_url or api_base
            model = db_config.model_name or model

    if not api_key:
        return {"success": False, "error": "请先配置 API 密钥"}

    try:
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=api_base,
            timeout=10.0
        )
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        if response.choices and response.choices[0].message.content is not None:
            return {"success": True, "message": "连接成功！"}
        return {"success": False, "error": "返回内容为空"}
    except Exception as e:
        logger.warning(f"模型连接测试失败: {e}")
        return {"success": False, "error": str(e)}
