#!/usr/bin/env python3
"""
测试导入hotspot模块
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from app.models.hotspot import Hotspot, HotspotAnalysis, SourceType, ImportanceLevel
    print("Import successful")
    print(f"HotspotAnalysis relevance_score column: {HotspotAnalysis.relevance_score}")
    print(f"Column type: {HotspotAnalysis.relevance_score.type}")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()