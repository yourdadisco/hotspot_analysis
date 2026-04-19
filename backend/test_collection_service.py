#!/usr/bin/env python3
"""
测试数据收集服务
"""

import asyncio
import sys
import os

# 添加src目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from app.services.collector_service import collector_service

async def test_collector_service():
    """测试收集服务"""
    print("Testing collector service...")
    print(f"Number of collectors: {len(collector_service.collectors)}")

    for i, collector in enumerate(collector_service.collectors):
        print(f"  Collector {i+1}: {collector.name} ({collector.__class__.__name__})")

    # 测试收集
    print("\nStarting collection...")
    result = await collector_service.collect_all()

    print("\nCollection result:")
    print(f"  Success: {result.get('success')}")
    print(f"  Total collected: {result.get('total_collected')}")
    print(f"  Total updated: {result.get('total_updated')}")
    print(f"  Message: {result.get('message')}")

    # 打印每个收集器的结果
    print("\nCollector results:")
    for collector_name, collector_result in result.get('results', {}).items():
        print(f"  {collector_name}:")
        if collector_result.get('success'):
            collected = collector_result.get('collected', 0)
            total_items = collector_result.get('total_items', 0)
            print(f"    Success: True, Collected: {collected}/{total_items}")
        else:
            print(f"    Success: False, Error: {collector_result.get('error')}")

async def main():
    """主函数"""
    try:
        await test_collector_service()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)