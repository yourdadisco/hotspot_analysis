"""
用户操作端点：收藏、批量忽略等
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from datetime import datetime

from app.core.database import get_db
from app.models.hotspot import Hotspot, HotspotAnalysis
from app.models.user_action import UserHotspotAction
from app.schemas.hotspot import HotspotResponse, BatchDismissRequest
from app.schemas.base import PaginatedResponse
from app.services.hotspot_service import HotspotService

router = APIRouter()


@router.post("/user-actions/toggle-favorite")
async def toggle_favorite(
    user_id: str = Query(..., description="用户ID"),
    hotspot_id: str = Query(..., description="热点ID"),
    db: AsyncSession = Depends(get_db)
):
    """切换热点收藏状态"""
    # 检查热点是否存在
    hotspot_stmt = select(Hotspot).where(Hotspot.id == hotspot_id)
    hotspot_result = await db.execute(hotspot_stmt)
    if not hotspot_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="热点不存在")

    # 查找现有操作记录
    stmt = select(UserHotspotAction).where(
        UserHotspotAction.user_id == user_id,
        UserHotspotAction.hotspot_id == hotspot_id
    )
    result = await db.execute(stmt)
    action = result.scalar_one_or_none()

    if action:
        # 切换收藏状态
        action.is_favorite = not action.is_favorite
        action.updated_at = datetime.utcnow()
    else:
        # 新建收藏记录
        action = UserHotspotAction(
            user_id=user_id,
            hotspot_id=hotspot_id,
            is_favorite=True,
            is_dismissed=False,
        )
        db.add(action)

    await db.commit()
    await HotspotService.invalidate_hotspots_cache()

    return {"is_favorite": action.is_favorite}


@router.post("/user-actions/batch-dismiss")
async def batch_dismiss(
    request: BatchDismissRequest,
    db: AsyncSession = Depends(get_db)
):
    """批量忽略热点"""
    # 查询匹配条件的已分析热点
    hotspot_ids = set()

    # 有 importance_levels 时从 HotspotAnalysis 查询
    if request.importance_levels:
        stmt = select(HotspotAnalysis.hotspot_id).where(
            HotspotAnalysis.user_id == request.user_id
        )
        if request.importance_levels:
            stmt = stmt.where(
                HotspotAnalysis.importance_level.in_(request.importance_levels)
            )
        result = await db.execute(stmt)
        for row in result.all():
            hotspot_ids.add(str(row.hotspot_id))

    # 有日期范围时也从 Hotspot 查询
    if request.date_from or request.date_to:
        date_stmt = select(Hotspot.id)
        conditions = []
        if request.date_from:
            try:
                dt_from = datetime.strptime(request.date_from, "%Y-%m-%d")
                conditions.append(Hotspot.collected_at >= dt_from)
            except ValueError:
                pass
        if request.date_to:
            try:
                dt_to = datetime.strptime(request.date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                conditions.append(Hotspot.collected_at <= dt_to)
            except ValueError:
                pass
        if conditions:
            date_stmt = date_stmt.where(and_(*conditions))
            result = await db.execute(date_stmt)
            for row in result.all():
                hotspot_ids.add(str(row.id))

    # 如果没有筛选条件，不执行批量操作（防止误删全部）
    if not hotspot_ids and not request.importance_levels and not request.date_from and not request.date_to:
        return {"dismissed_count": 0, "message": "未指定筛选条件，不执行批量忽略"}

    # 如果没有 importance_levels 也没有日期条件，无法确定要忽略的热点
    if not hotspot_ids:
        # 退回到当前用户所有分析过的热点
        stmt = select(HotspotAnalysis.hotspot_id).where(
            HotspotAnalysis.user_id == request.user_id
        )
        result = await db.execute(stmt)
        for row in result.all():
            hotspot_ids.add(str(row.hotspot_id))

    # 根据收藏状态筛选
    if request.is_favorite is not None:
        filtered_ids = set()
        fav_stmt = select(UserHotspotAction).where(
            UserHotspotAction.user_id == request.user_id,
            UserHotspotAction.hotspot_id.in_(list(hotspot_ids)),
            UserHotspotAction.is_favorite == request.is_favorite,
        )
        result = await db.execute(fav_stmt)
        for action in result.scalars().all():
            filtered_ids.add(str(action.hotspot_id))
        # 如果是需要收藏的，没有记录的也视为未收藏
        if request.is_favorite:
            hotspot_ids = filtered_ids
        else:
            # 非收藏：包括没有记录的和明确标记为非收藏的
            favorite_ids = set()
            fav_all = await db.execute(
                select(UserHotspotAction).where(
                    UserHotspotAction.user_id == request.user_id,
                    UserHotspotAction.hotspot_id.in_(list(hotspot_ids)),
                )
            )
            for a in fav_all.scalars().all():
                if a.is_favorite:
                    favorite_ids.add(str(a.hotspot_id))
            hotspot_ids = hotspot_ids - favorite_ids

    # 执行忽略（upsert）
    dismissed_count = 0
    for hid in hotspot_ids:
        stmt = select(UserHotspotAction).where(
            UserHotspotAction.user_id == request.user_id,
            UserHotspotAction.hotspot_id == hid
        )
        result = await db.execute(stmt)
        action = result.scalar_one_or_none()

        if action:
            if not action.is_dismissed:
                action.is_dismissed = True
                action.updated_at = datetime.utcnow()
                dismissed_count += 1
        else:
            action = UserHotspotAction(
                user_id=request.user_id,
                hotspot_id=hid,
                is_favorite=False,
                is_dismissed=True,
            )
            db.add(action)
            dismissed_count += 1

    await db.commit()
    await HotspotService.invalidate_hotspots_cache()

    return {
        "dismissed_count": dismissed_count,
        "message": f"已忽略 {dismissed_count} 个热点"
    }


@router.get("/user-actions/favorites")
async def get_favorites(
    user_id: str = Query(..., description="用户ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """获取用户收藏的热点列表"""
    # 查询收藏的热点ID
    fav_stmt = select(UserHotspotAction.hotspot_id).where(
        UserHotspotAction.user_id == user_id,
        UserHotspotAction.is_favorite == True
    )
    fav_result = await db.execute(fav_stmt)
    fav_ids = [row[0] for row in fav_result.all()]

    if not fav_ids:
        return PaginatedResponse(items=[], total=0, page=page, limit=limit, total_pages=0)

    # 分页查询热点
    total = len(fav_ids)
    total_pages = (total + limit - 1) // limit

    stmt = select(Hotspot).where(Hotspot.id.in_(fav_ids)).order_by(
        Hotspot.collected_at.desc()
    ).offset((page - 1) * limit).limit(limit)

    result = await db.execute(stmt)
    hotspots = result.scalars().all()

    # 查询这些热点的分析数据（与 hotspot_service 保持一致）
    hid_list = [str(h.id) for h in hotspots]
    analysis_stmt = select(HotspotAnalysis).where(
        HotspotAnalysis.hotspot_id.in_(hid_list),
        HotspotAnalysis.user_id == user_id
    )
    analysis_result = await db.execute(analysis_stmt)
    analyses = analysis_result.scalars().all()
    analyzed_map = {str(a.hotspot_id): a for a in analyses}

    items = []
    for hotspot in hotspots:
        item = HotspotResponse.model_validate(hotspot).model_dump(mode='json')
        item['is_favorite'] = True
        hid = str(hotspot.id)
        info = analyzed_map.get(hid)
        item['has_analysis'] = hid in analyzed_map
        item['analysis_importance_level'] = info.importance_level.value if info else None
        item['analysis_relevance_score'] = info.relevance_score if info else None
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/user-actions/{user_id}/hotspot/{hotspot_id}")
async def get_hotspot_action(
    user_id: str,
    hotspot_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取用户对特定热点的操作状态"""
    stmt = select(UserHotspotAction).where(
        UserHotspotAction.user_id == user_id,
        UserHotspotAction.hotspot_id == hotspot_id
    )
    result = await db.execute(stmt)
    action = result.scalar_one_or_none()

    if not action:
        return {"is_favorite": False, "is_dismissed": False}

    return {
        "is_favorite": action.is_favorite,
        "is_dismissed": action.is_dismissed,
    }
