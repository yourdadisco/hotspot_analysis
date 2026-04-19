#!/usr/bin/env python3
"""
测试分析函数
"""

import asyncio
import sys
import os

# 添加src到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

async def test_analysis():
    try:
        from app.tasks.analysis_tasks import analyze_hotspot_for_user_async

        hotspot_id = "58b20efe-b08c-4485-9039-d24a96cbbbb1"
        user_id = "60cd5b4e-cbfe-4105-ae21-e085f5168505"

        print(f"测试分析: hotspot_id={hotspot_id}, user_id={user_id}")

        result = await analyze_hotspot_for_user_async(hotspot_id, user_id)

        print("分析结果:")
        print(result)

        if result.get("success"):
            print(f"✓ 分析成功: {result.get('message')}")
            print(f"  分析ID: {result.get('analysis_id')}")
            print(f"  相关性评分: {result.get('relevance_score')}")
            print(f"  重要性级别: {result.get('importance_level')}")
        else:
            print(f"✗ 分析失败: {result.get('error')}")

    except Exception as e:
        print(f"测试过程中发生异常: {e}")
        import traceback
        traceback.print_exc()

async def test_llm_connection():
    try:
        from app.core.llm import llm_client

        print("\n测试LLM连接...")
        connected = await llm_client.test_connection()

        if connected:
            print("✓ LLM连接成功")
        else:
            print("✗ LLM连接失败")

    except Exception as e:
        print(f"LLM连接测试异常: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("开始测试分析功能...")

    # 运行测试
    asyncio.run(test_llm_connection())
    asyncio.run(test_analysis())