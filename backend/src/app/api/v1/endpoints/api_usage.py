from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, case
from decimal import Decimal

from app.core.database import get_db
from app.models.api_usage import APIUsage
from app.schemas.api_usage import APIUsageResponse, APIUsageStats

router = APIRouter()

@router.get("/api-usage", response_model=Dict[str, int])
async def get_api_usage_summary(
    days: Optional[int] = Query(7, ge=1, le=365, description="统计天数，默认为最近7天"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取API使用概览（简化版）

    返回最近N天的请求总数、成功数、失败数、总token数
    """
    # 计算日期范围
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # 构建查询条件
    stmt = select(
        func.count().label("total_requests"),
        func.sum(case((APIUsage.success == True, 1), else_=0)).label("successful_requests"),
        func.sum(case((APIUsage.success == False, 1), else_=0)).label("failed_requests"),
        func.coalesce(func.sum(APIUsage.total_tokens), 0).label("total_tokens")
    ).where(
        and_(
            APIUsage.requested_at >= start_date,
            APIUsage.requested_at <= end_date
        )
    )

    result = await db.execute(stmt)
    row = result.fetchone()

    if not row:
        return {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0
        }

    return {
        "total_requests": row.total_requests or 0,
        "successful_requests": row.successful_requests or 0,
        "failed_requests": row.failed_requests or 0,
        "total_tokens": row.total_tokens or 0
    }

@router.get("/api-usage/stats", response_model=APIUsageStats)
async def get_api_usage_stats(
    days: Optional[int] = Query(30, ge=1, le=365, description="统计天数，默认为最近30天"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取API使用详细统计

    返回完整的统计信息，包括成本、按端点/模型/用户的分布
    """
    # 计算日期范围
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # 基础统计
    base_stmt = select(
        func.count().label("total_requests"),
        func.sum(case((APIUsage.success == True, 1), else_=0)).label("successful_requests"),
        func.sum(case((APIUsage.success == False, 1), else_=0)).label("failed_requests"),
        func.coalesce(func.sum(APIUsage.total_tokens), 0).label("total_tokens"),
        func.coalesce(func.sum(APIUsage.cost_usd), Decimal('0')).label("total_cost_usd"),
        func.coalesce(func.sum(APIUsage.estimated_cost_cny), Decimal('0')).label("total_cost_cny"),
        func.coalesce(func.avg(APIUsage.response_time_ms), 0).label("avg_response_time_ms")
    ).where(
        and_(
            APIUsage.requested_at >= start_date,
            APIUsage.requested_at <= end_date
        )
    )

    base_result = await db.execute(base_stmt)
    base_row = base_result.fetchone()

    # 按端点统计
    endpoint_stmt = select(
        APIUsage.endpoint,
        func.count().label("count")
    ).where(
        and_(
            APIUsage.requested_at >= start_date,
            APIUsage.requested_at <= end_date
        )
    ).group_by(APIUsage.endpoint)

    endpoint_result = await db.execute(endpoint_stmt)
    by_endpoint = {row.endpoint: row.count for row in endpoint_result.all()}

    # 按模型统计
    model_stmt = select(
        APIUsage.model_used,
        func.count().label("count")
    ).where(
        and_(
            APIUsage.requested_at >= start_date,
            APIUsage.requested_at <= end_date,
            APIUsage.model_used.isnot(None)
        )
    ).group_by(APIUsage.model_used)

    model_result = await db.execute(model_stmt)
    by_model = {row.model_used: row.count for row in model_result.all()}

    # 按用户统计
    user_stmt = select(
        APIUsage.user_id,
        func.count().label("count")
    ).where(
        and_(
            APIUsage.requested_at >= start_date,
            APIUsage.requested_at <= end_date,
            APIUsage.user_id.isnot(None)
        )
    ).group_by(APIUsage.user_id)

    user_result = await db.execute(user_stmt)
    by_user = {str(row.user_id): row.count for row in user_result.all() if row.user_id}

    return APIUsageStats(
        total_requests=base_row.total_requests or 0,
        successful_requests=base_row.successful_requests or 0,
        failed_requests=base_row.failed_requests or 0,
        total_tokens=base_row.total_tokens or 0,
        total_cost_usd=base_row.total_cost_usd or Decimal('0'),
        total_cost_cny=base_row.total_cost_cny or Decimal('0'),
        avg_response_time_ms=float(base_row.avg_response_time_ms or 0),
        by_endpoint=by_endpoint,
        by_model=by_model,
        by_user=by_user
    )

@router.get("/api-usage/records")
async def get_api_usage_records(
    page: int = Query(1, ge=1, description="页码"),
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    user_id: Optional[str] = Query(None, description="用户ID筛选"),
    endpoint: Optional[str] = Query(None, description="端点筛选"),
    success: Optional[bool] = Query(None, description="成功状态筛选"),
    date_from: Optional[str] = Query(None, description="开始日期，格式: YYYY-MM-DD"),
    date_to: Optional[str] = Query(None, description="结束日期，格式: YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db)
):
    """
    获取API使用记录列表（分页+筛选）
    """
    stmt = select(APIUsage)

    # 筛选条件
    if user_id:
        stmt = stmt.where(APIUsage.user_id == user_id)
    if endpoint:
        stmt = stmt.where(APIUsage.endpoint == endpoint)
    if success is not None:
        stmt = stmt.where(APIUsage.success == success)
    if date_from:
        # 简化日期处理
        pass
    if date_to:
        pass

    # 按请求时间倒序排序
    stmt = stmt.order_by(desc(APIUsage.requested_at))

    # 总数查询
    total_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(total_stmt)
    total = total_result.scalar()

    # 分页
    stmt = stmt.offset((page - 1) * limit).limit(limit)

    # 执行查询
    result = await db.execute(stmt)
    records = result.scalars().all()

    # 计算总页数
    total_pages = (total + limit - 1) // limit

    # 转换为响应模型
    items = [APIUsageResponse.model_validate(record) for record in records]

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }