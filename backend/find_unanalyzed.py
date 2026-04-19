#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

async def find_unanalyzed():
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.hotspot import Hotspot, HotspotAnalysis

    async with AsyncSessionLocal() as db:
        # 获取所有热点
        stmt = select(Hotspot).order_by(Hotspot.collected_at.desc())
        result = await db.execute(stmt)
        hotspots = result.scalars().all()

        # 获取已有分析的热点ID
        stmt = select(HotspotAnalysis.hotspot_id)
        result = await db.execute(stmt)
        analyzed_ids = set(result.scalars().all())

        print(f"总热点数: {len(hotspots)}")
        print(f"已分析热点数: {len(analyzed_ids)}")

        # 查找未分析的热点
        unanalyzed = []
        for hotspot in hotspots:
            if hotspot.id not in analyzed_ids:
                unanalyzed.append(hotspot)

        print(f"未分析热点数: {len(unanalyzed)}")
        if unanalyzed:
            print("前5个未分析热点:")
            for i, hotspot in enumerate(unanalyzed[:5]):
                print(f"  {i+1}. ID: {hotspot.id}, 标题: {hotspot.title[:50]}...")
                print(f"     收集时间: {hotspot.collected_at}")
        else:
            print("所有热点都已分析")

        return unanalyzed

if __name__ == "__main__":
    import asyncio
    asyncio.run(find_unanalyzed())