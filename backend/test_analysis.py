#!/usr/bin/env python3
"""
测试分析API
"""
import asyncio
import aiohttp
import json

async def test_analysis():
    # 获取第一个热点ID
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

    from app.core.database import AsyncSessionLocal
    from app.models.hotspot import Hotspot
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        stmt = select(Hotspot).limit(1)
        result = await db.execute(stmt)
        hotspot = result.scalar_one_or_none()
        if not hotspot:
            print("没有热点数据")
            return
        hotspot_id = str(hotspot.id)
        print(f"测试热点: {hotspot_id} - {hotspot.title[:50]}...")

    # 用户ID（从登录测试获取）
    user_id = "8b93c6d2-a65b-46b1-b92c-a4a211edd466"

    # 触发分析
    url = f"http://localhost:8001/api/v1/hotspots/{hotspot_id}/analyze"
    params = {"user_id": user_id}

    async with aiohttp.ClientSession() as session:
        async with session.post(url, params=params) as resp:
            print(f"分析请求状态: {resp.status}")
            response_text = await resp.text()
            print(f"分析响应: {response_text[:200]}...")
            try:
                json_data = await resp.json()
                print(f"JSON响应: {json.dumps(json_data, indent=2, ensure_ascii=False)}")
            except:
                print("响应不是JSON")

    # 等待几秒后获取分析结果
    await asyncio.sleep(3)

    # 获取热点详情（包含分析）
    detail_url = f"http://localhost:8001/api/v1/hotspots/{hotspot_id}"
    async with aiohttp.ClientSession() as session:
        async with session.get(detail_url, params={"user_id": user_id}) as resp:
            print(f"\n热点详情状态: {resp.status}")
            try:
                detail_data = await resp.json()
                analysis = detail_data.get("analysis")
                if analysis:
                    print(f"分析ID: {analysis.get('id')}")
                    print(f"重要性级别: {analysis.get('importance_level')}")
                    print(f"相关性评分: {analysis.get('relevance_score')}")

                    # 检查新字段
                    metadata = analysis.get("analysis_metadata", {})
                    print(f"分析过程字段存在: {'analysis_process' in metadata}")
                    print(f"分析结论字段存在: {'analysis_conclusion' in metadata}")

                    if 'analysis_process' in metadata:
                        print(f"分析过程预览: {metadata['analysis_process'][:100]}...")
                    if 'analysis_conclusion' in metadata:
                        print(f"分析结论预览: {metadata['analysis_conclusion'][:100]}...")
                else:
                    print("热点暂无分析结果")
            except Exception as e:
                print(f"解析响应失败: {e}")

if __name__ == "__main__":
    asyncio.run(test_analysis())