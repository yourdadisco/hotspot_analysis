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
    """批量忽略热点（基于 Hotspot 主表查询，覆盖已分析和未分析热点）"""
    has_criteria = bool(request.importance_levels or request.date_from or request.date_to or request.source_types or request.is_favorite is not None)
    if not has_criteria:
        return {"dismissed_count": 0, "message": "未指定筛选条件，不执行批量忽略"}

    # 以 Hotspot 为主表查询（与列表查询一致，覆盖所有热点）
    stmt = select(Hotspot.id).distinct()

    # 重要性级别筛选：子查询方式与 GET /hotspots 保持一致
    if request.importance_levels:
        has_unanalyzed = "unanalyzed" in request.importance_levels
        other_levels = [l for l in request.importance_levels if l != "unanalyzed"]
        conditions = []

        if other_levels:
            analysis_sub = select(HotspotAnalysis.hotspot_id).where(
                HotspotAnalysis.user_id == request.user_id,
                HotspotAnalysis.importance_level.in_(other_levels)
            )
            conditions.append(Hotspot.id.in_(analysis_sub))

        if has_unanalyzed:
            no_analysis_sub = select(HotspotAnalysis.hotspot_id).where(
                HotspotAnalysis.user_id == request.user_id
            )
            conditions.append(Hotspot.id.notin_(no_analysis_sub))

        if conditions:
            from sqlalchemy import or_
            stmt = stmt.where(or_(*conditions))

    # 日期范围筛选
    date_conditions = []
    if request.date_from:
        try:
            dt_from = datetime.strptime(request.date_from, "%Y-%m-%d")
            date_conditions.append(Hotspot.collected_at >= dt_from)
        except ValueError:
            pass
    if request.date_to:
        try:
            dt_to = datetime.strptime(request.date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            date_conditions.append(Hotspot.collected_at <= dt_to)
        except ValueError:
            pass
    if date_conditions:
        stmt = stmt.where(and_(*date_conditions))

    # 来源类型筛选
    if request.source_types:
        types = [s.strip() for s in request.source_types.split(",") if s.strip()]
        if types:
            stmt = stmt.where(Hotspot.source_type.in_(types))

    # 来源名称筛选
    if hasattr(request, 'source_names') and request.source_names:
        names = [n.strip() for n in request.source_names.split(",") if n.strip()]
        if names:
            stmt = stmt.where(Hotspot.source_name.in_(names))

    result = await db.execute(stmt)
    hotspot_ids = set(str(row.id) for row in result.all())

    if not hotspot_ids:
        return {"dismissed_count": 0, "message": "未找到匹配条件的热点"}

    # 根据收藏状态筛选
    if request.is_favorite is not None:
        filtered_ids = set()
        fav_stmt = select(UserHotspotAction).where(
            UserHotspotAction.user_id == request.user_id,
            UserHotspotAction.hotspot_id.in_(list(hotspot_ids)),
            UserHotspotAction.is_favorite == request.is_favorite,
        )
        fav_result = await db.execute(fav_stmt)
        for action in fav_result.scalars().all():
            filtered_ids.add(str(action.hotspot_id))
        if request.is_favorite:
            hotspot_ids = filtered_ids
        else:
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

    if not hotspot_ids:
        return {"dismissed_count": 0, "message": "未找到匹配条件的热点"}

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
    analyzed_map = {}
    for a in analyses:
        imp = a.importance_level.value if hasattr(a.importance_level, 'value') else a.importance_level
        meta = a.analysis_metadata or {}
        analyzed_map[str(a.hotspot_id)] = {
            'importance_level': imp,
            'relevance_score': a.relevance_score,
            'content_summary': meta.get('content_summary') if isinstance(meta, dict) else None,
        }

    items = []
    for hotspot in hotspots:
        item = HotspotResponse.model_validate(hotspot).model_dump(mode='json')
        item['is_favorite'] = True
        hid = str(hotspot.id)
        info = analyzed_map.get(hid)
        item['has_analysis'] = hid in analyzed_map
        item['analysis_importance_level'] = info['importance_level'] if info else None
        item['analysis_relevance_score'] = info['relevance_score'] if info else None
        item['analysis_content_summary'] = info['content_summary'] if info else None
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
