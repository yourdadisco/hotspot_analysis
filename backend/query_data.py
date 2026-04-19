#!/usr/bin/env python3
"""
查询数据库中的数据
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

async def query_database():
    """查询数据库"""

    # 创建异步引擎
    engine = create_async_engine(
        "sqlite+aiosqlite:///hotspot_analysis.db",
        echo=False
    )

    # 创建会话工厂
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as session:
        try:
            print("查询数据库...")

            # 查询用户
            from src.app.models.user import User
            stmt = select(User)
            result = await session.execute(stmt)
            users = result.scalars().all()

            print(f"\n用户数量: {len(users)}")
            for user in users:
                print(f"- ID: {user.id}, 邮箱: {user.email}, 公司: {user.company_name}")

            # 查询热点
            from src.app.models.hotspot import Hotspot
            stmt = select(Hotspot)
            result = await session.execute(stmt)
            hotspots = result.scalars().all()

            print(f"\n热点数量: {len(hotspots)}")
            for hotspot in hotspots[:3]:  # 只显示前3个
                print(f"- ID: {hotspot.id}, 标题: {hotspot.title[:50]}...")

            # 查询分析记录
            from src.app.models.hotspot import HotspotAnalysis
            stmt = select(HotspotAnalysis)
            result = await session.execute(stmt)
            analyses = result.scalars().all()

            print(f"\n分析记录数量: {len(analyses)}")
            for analysis in analyses[:3]:
                print(f"- ID: {analysis.id}, 热点ID: {analysis.hotspot_id}, 用户ID: {analysis.user_id}")

            if users:
                print(f"\n第一个用户ID: {users[0].id}")
            if hotspots:
                print(f"第一个热点ID: {hotspots[0].id}")

        except Exception as e:
            print(f"查询数据库时出错: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(query_database())