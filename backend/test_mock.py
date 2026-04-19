#!/usr/bin/env python3
"""
测试Mock模式下的分析功能
"""

import asyncio
import sys
import os

# 添加src到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

async def test_mock_analysis():
    try:
        from app.tasks.analysis_tasks import analyze_hotspot_for_user_async

        hotspot_id = "58b20efe-b08c-4485-9039-d24a96cbbbb1"
        user_id = "60cd5b4e-cbfe-4105-ae21-e085f5168505"

        print(f"Testing analysis with mock mode: hotspot_id={hotspot_id}, user_id={user_id}")

        result = await analyze_hotspot_for_user_async(hotspot_id, user_id)

        print("Analysis result:")
        print(result)

        if result.get("success"):
            print(f"SUCCESS: {result.get('message')}")
            print(f"  Analysis ID: {result.get('analysis_id')}")
            print(f"  Relevance score: {result.get('relevance_score')}")
            print(f"  Importance level: {result.get('importance_level')}")
        else:
            print(f"FAILED: {result.get('error')}")

    except Exception as e:
        print(f"Exception during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting mock analysis test...")
    asyncio.run(test_mock_analysis())