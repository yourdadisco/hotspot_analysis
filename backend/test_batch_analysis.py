#!/usr/bin/env python3
"""
测试批量分析端点
"""

import asyncio
import aiohttp

async def test_batch_analysis():
    """测试批量分析端点"""

    base_url = "http://localhost:8001/api/v1"

    user_id = "ef7bdb90-6cd8-40b6-9293-65f528b6b4fd"

    print(f"Testing batch analysis endpoint...")
    print(f"User ID: {user_id}")

    async with aiohttp.ClientSession() as session:
        url = f"{base_url}/users/{user_id}/analyze-latest"
        params = {"limit": 5}

        try:
            print(f"Sending POST to: {url}")
            async with session.post(url, params=params) as response:
                print(f"Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print("Response JSON:")
                    print(result)

                    status_val = result.get("status")
                    if status_val == "completed":
                        print("[OK] Batch analysis completed")
                        analyzed_count = result.get("analyzed_count")
                        total_hotspots = result.get("total_hotspots")
                        print(f"  Analyzed count: {analyzed_count}")
                        print(f"  Total hotspots: {total_hotspots}")
                        return True
                    elif status_val == "failed":
                        print(f"[ERROR] Batch analysis failed: {result.get('error')}")
                        return False
                    elif status_val == "error":
                        print(f"[ERROR] Batch analysis error: {result.get('error')}")
                        return False
                    else:
                        print(f"[ERROR] Unknown status: {status_val}")
                        return False
                else:
                    print(f"[ERROR] Request failed with status: {response.status}")
                    text = await response.text()
                    print(f"Response text: {text}")
                    return False

        except Exception as e:
            print(f"[ERROR] Exception during POST request: {e}")
            import traceback
            traceback.print_exc()
            return False

async def main():
    print("Testing batch analysis endpoint...")
    success = await test_batch_analysis()

    if success:
        print("\n[OK] Batch analysis test passed")
    else:
        print("\n[ERROR] Batch analysis test failed")

if __name__ == "__main__":
    asyncio.run(main())