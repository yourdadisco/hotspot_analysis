#!/usr/bin/env python3
"""
测试API分析端点
"""

import asyncio
import aiohttp
import sys

async def test_analysis_endpoint():
    """测试分析端点"""

    base_url = "http://localhost:8001/api/v1"

    # 从数据库获取现有的热点ID和用户ID
    # 这里我们使用已知的测试数据ID
    hotspot_id = "289b6d36-5571-424d-be94-83d382083f50"  # 测试中的热点ID
    user_id = "ef7bdb90-6cd8-40b6-9293-65f528b6b4fd"      # 测试中的用户ID

    print(f"Testing POST analysis endpoint...")
    print(f"Hotspot ID: {hotspot_id}")
    print(f"User ID: {user_id}")

    async with aiohttp.ClientSession() as session:
        # 1. 测试POST分析端点
        url = f"{base_url}/hotspots/{hotspot_id}/analyze"

        # 对于POST请求，我们需要发送JSON数据
        # 根据API定义，user_id作为查询参数或请求体
        # 查看analysis.py，user_id是查询参数吗？实际上是路径参数？不，看第18行：user_id: str
        # 在router.post("/hotspots/{hotspot_id}/analyze")中，user_id是路径参数吗？不是，是查询参数或请求体字段
        # 看函数定义：async def trigger_hotspot_analysis(hotspot_id: str, user_id: str, ...)
        # 这是FastAPI，user_id应该是查询参数

        params = {"user_id": user_id}

        try:
            print(f"Sending POST to: {url}")
            async with session.post(url, params=params) as response:
                print(f"Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print("Response JSON:")
                    print(result)

                    status_val = result.get("status")
                    if status_val == "already_exists":
                        print("[OK] Analysis already exists (expected)")
                        analysis_id = result.get("analysis_id")
                        return analysis_id
                    elif status_val == "completed":
                        print("[OK] Analysis completed successfully")
                        analysis_id = result.get("analysis_id")
                        relevance_score = result.get("relevance_score")
                        importance_level = result.get("importance_level")
                        print(f"  Analysis ID: {analysis_id}")
                        print(f"  Relevance score: {relevance_score}")
                        print(f"  Importance level: {importance_level}")
                        return analysis_id
                    elif status_val == "failed":
                        print(f"[ERROR] Analysis failed: {result.get('error')}")
                        return None
                    else:
                        print(f"Unknown status: {status_val}")
                        return None
                else:
                    print(f"[ERROR] Request failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response text: {text}")
                    return None

        except Exception as e:
            print(f"[ERROR] Exception during POST request: {e}")
            import traceback
            traceback.print_exc()
            return None

async def test_get_analysis_endpoint(hotspot_id, user_id):
    """测试获取分析端点"""

    base_url = "http://localhost:8001/api/v1"

    print(f"\nTesting GET analysis endpoint...")
    print(f"Hotspot ID: {hotspot_id}")
    print(f"User ID: {user_id}")

    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/hotspots/{hotspot_id}/analysis/{user_id}"

        try:
            print(f"Sending GET to: {url}")
            async with session.get(url) as response:
                print(f"Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print("Response JSON:")
                    print(result)
                    return result
                elif response.status == 404:
                    print("[OK] Analysis not found (expected if no analysis exists)")
                    return None
                else:
                    print(f"[ERROR] Request failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response text: {text}")
                    return None

        except Exception as e:
            print(f"[ERROR] Exception during GET request: {e}")
            import traceback
            traceback.print_exc()
            return None

async def main():
    print("Testing API analysis endpoints...")

    # 先测试GET端点，查看是否有现有分析
    hotspot_id = "289b6d36-5571-424d-be94-83d382083f50"
    user_id = "ef7bdb90-6cd8-40b6-9293-65f528b6b4fd"

    # 测试GET端点
    analysis_data = await test_get_analysis_endpoint(hotspot_id, user_id)

    if analysis_data:
        print(f"\n[OK] Analysis already exists:")
        print(f"  Analysis ID: {analysis_data.get('id')}")
        print(f"  Relevance score: {analysis_data.get('relevance_score')}")
        print(f"  Importance level: {analysis_data.get('importance_level')}")
    else:
        print(f"\nNo existing analysis found, testing POST endpoint...")

        # 测试POST端点
        analysis_id = await test_analysis_endpoint()

        if analysis_id:
            print(f"\n[OK] Analysis triggered successfully")
            print(f"  Analysis ID: {analysis_id}")

            # 等待片刻后再次获取分析结果
            print("\nWaiting 2 seconds before checking analysis result...")
            await asyncio.sleep(2)

            analysis_data = await test_get_analysis_endpoint(hotspot_id, user_id)
            if analysis_data:
                print(f"[OK] Analysis completed and retrieved successfully")
            else:
                print(f"[ERROR] Could not retrieve analysis after creation")
        else:
            print(f"\n[ERROR] Failed to trigger analysis")

if __name__ == "__main__":
    asyncio.run(main())