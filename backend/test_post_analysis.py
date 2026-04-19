#!/usr/bin/env python3
"""
测试POST分析端点
"""

import asyncio
import aiohttp

async def test_post_analysis():
    """测试POST分析端点"""

    base_url = "http://localhost:8001/api/v1"

    # 使用已有的热点和用户ID
    hotspot_id = "289b6d36-5571-424d-be94-83d382083f50"
    user_id = "ef7bdb90-6cd8-40b6-9293-65f528b6b4fd"

    print(f"Testing POST analysis endpoint...")
    print(f"Hotspot ID: {hotspot_id}")
    print(f"User ID: {user_id}")

    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/hotspots/{hotspot_id}/analyze"
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
                        return analysis_id, status_val
                    elif status_val == "completed":
                        print("[OK] Analysis completed successfully")
                        analysis_id = result.get("analysis_id")
                        relevance_score = result.get("relevance_score")
                        importance_level = result.get("importance_level")
                        print(f"  Analysis ID: {analysis_id}")
                        print(f"  Relevance score: {relevance_score}")
                        print(f"  Importance level: {importance_level}")
                        return analysis_id, status_val
                    elif status_val == "failed":
                        print(f"[ERROR] Analysis failed: {result.get('error')}")
                        return None, status_val
                    else:
                        print(f"[ERROR] Unknown status: {status_val}")
                        return None, status_val
                else:
                    print(f"[ERROR] Request failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response text: {text}")
                    return None, None

        except Exception as e:
            print(f"[ERROR] Exception during POST request: {e}")
            import traceback
            traceback.print_exc()
            return None, None

async def main():
    print("Testing POST analysis endpoint...")
    analysis_id, status_val = await test_post_analysis()

    if analysis_id:
        print(f"\n[OK] POST endpoint returned: {status_val}")
        print(f"Analysis ID: {analysis_id}")
    else:
        print(f"\n[ERROR] POST endpoint failed")

if __name__ == "__main__":
    asyncio.run(main())