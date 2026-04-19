#!/usr/bin/env python3
"""
测试数据收集API端点
"""

import asyncio
import aiohttp
import sys

BASE_URL = "http://localhost:8001/api/v1"

async def test_collection_status():
    """测试收集状态端点"""
    print("Testing collection status endpoint...")

    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/collection/status"

        try:
            print(f"  GET {url}")
            async with session.get(url) as response:
                print(f"  Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print(f"  Success: {result.get('success')}")
                    print(f"  Collectors count: {result.get('collectors_count')}")
                    print(f"  Use mock mode: {result.get('use_mock_mode')}")

                    collectors = result.get('collectors', [])
                    for c in collectors:
                        print(f"    - {c.get('name')} ({c.get('type')})")
                    return True
                else:
                    text = await response.text()
                    print(f"  Error response: {text}")
                    return False

        except Exception as e:
            print(f"  Exception: {e}")
            return False

async def test_trigger_collection():
    """测试触发收集端点"""
    print("\nTesting trigger collection endpoint...")

    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/collection/trigger"

        try:
            print(f"  POST {url}")
            async with session.post(url) as response:
                print(f"  Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print(f"  Success: {result.get('success')}")
                    print(f"  Message: {result.get('message')}")

                    # 检查收集结果
                    collection_result = result.get('result', {})
                    if collection_result:
                        total_collected = collection_result.get('total_collected', 0)
                        total_updated = collection_result.get('total_updated', 0)
                        print(f"  Total collected: {total_collected}")
                        print(f"  Total updated: {total_updated}")

                    return True
                else:
                    text = await response.text()
                    print(f"  Error response: {text}")
                    return False

        except Exception as e:
            print(f"  Exception: {e}")
            return False

async def test_trigger_background_collection():
    """测试后台触发收集端点"""
    print("\nTesting background trigger collection endpoint...")

    async with aiohttp.ClientSession() as session:
        url = f"{BASE_URL}/collection/trigger-background"

        try:
            print(f"  POST {url}")
            async with session.post(url) as response:
                print(f"  Response status: {response.status}")

                if response.status == 200:
                    result = await response.json()
                    print(f"  Success: {result.get('success')}")
                    print(f"  Message: {result.get('message')}")
                    print(f"  Task ID: {result.get('task_id')}")
                    return True
                else:
                    text = await response.text()
                    print(f"  Error response: {text}")
                    return False

        except Exception as e:
            print(f"  Exception: {e}")
            return False

async def main():
    """主测试函数"""
    print("Testing collection API endpoints...")

    # 测试状态端点
    status_ok = await test_collection_status()

    # 测试触发收集（同步）
    trigger_ok = await test_trigger_collection()

    # 测试后台触发收集
    background_ok = await test_trigger_background_collection()

    # 汇总结果
    print("\n" + "="*50)
    print("Test Summary:")
    print(f"  Status endpoint: {'PASS' if status_ok else 'FAIL'}")
    print(f"  Trigger endpoint: {'PASS' if trigger_ok else 'FAIL'}")
    print(f"  Background trigger endpoint: {'PASS' if background_ok else 'FAIL'}")

    all_passed = status_ok and trigger_ok and background_ok
    print(f"\nOverall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")

    return 0 if all_passed else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)