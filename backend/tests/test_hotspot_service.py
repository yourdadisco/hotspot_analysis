import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call
import sys
import os
from datetime import datetime

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'src'))

from app.services.hotspot_service import HotspotService
from app.models.hotspot import Hotspot, HotspotAnalysis, ImportanceLevel, SourceType
from app.schemas.hotspot import HotspotResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, asc, func
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import Select


class TestHotspotService:
    """测试HotspotService类"""

    @pytest.fixture
    def mock_db(self):
        """模拟数据库session"""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.execute = AsyncMock()
        mock_session.scalar = AsyncMock()
        return mock_session

    @pytest.fixture
    def mock_hotspot(self):
        """模拟热点对象"""
        from datetime import datetime

        # 创建一个简单的对象来模拟Hotspot，避免Pydantic验证MagicMock的问题
        class MockHotspot:
            def __init__(self):
                # 主键和基本信息
                self.id = "550e8400-e29b-41d4-a716-446655440000"  # 有效的UUID格式
                self.title = "测试热点标题"
                self.summary = "测试热点摘要"
                self.content_url = "https://example.com/news/1"

                # 来源信息
                self.source_type = SourceType.NEWS
                self.source_name = "测试新闻源"
                self.source_url = "https://example.com/news/1"

                # 时间信息
                self.publish_date = datetime(2024, 1, 1, 0, 0, 0)
                self.collected_at = datetime(2024, 1, 1, 0, 0, 0)

                # 内容
                self.raw_content = "原始内容"
                self.processed_content = {"key": "value"}

                # 标签和分类
                self.tags = ["AI", "技术"]
                self.category = "科技"

                # 元数据
                self.language = "zh"
                self.author = "测试作者"
                self.raw_metadata = {"extra": "data"}

                # 统计信息（数据库中是String类型）
                self.view_count = "100"
                self.like_count = "50"
                self.share_count = "20"

                # 时间戳（来自TimestampMixin）
                self.created_at = datetime(2024, 1, 1, 0, 0, 0)
                self.updated_at = datetime(2024, 1, 1, 0, 0, 0)

        return MockHotspot()

    @pytest.fixture
    def mock_hotspots(self, mock_hotspot):
        """模拟热点列表"""
        from datetime import datetime

        # 创建第二个热点对象
        class MockHotspot2:
            def __init__(self):
                # 主键和基本信息
                self.id = "550e8400-e29b-41d4-a716-446655440001"  # 另一个有效的UUID
                self.title = "测试热点标题2"
                self.summary = "测试热点摘要2"
                self.content_url = "https://example.com/blog/1"

                # 来源信息
                self.source_type = SourceType.TECH_BLOG
                self.source_name = "测试技术博客"
                self.source_url = "https://example.com/blog/1"

                # 时间信息
                self.publish_date = datetime(2024, 1, 2, 0, 0, 0)
                self.collected_at = datetime(2024, 1, 2, 0, 0, 0)

                # 内容
                self.raw_content = "原始内容2"
                self.processed_content = {"key2": "value2"}

                # 标签和分类
                self.tags = ["AI", "博客"]
                self.category = "科技"

                # 元数据
                self.language = "zh"
                self.author = "测试作者2"
                self.raw_metadata = {"extra2": "data2"}

                # 统计信息
                self.view_count = "200"
                self.like_count = "80"
                self.share_count = "30"

                # 时间戳
                self.created_at = datetime(2024, 1, 2, 0, 0, 0)
                self.updated_at = datetime(2024, 1, 2, 0, 0, 0)

        return [mock_hotspot, MockHotspot2()]

    @pytest.mark.asyncio
    @patch('app.services.hotspot_service.cache')
    async def test_get_hotspots_basic(self, mock_cache, mock_db, mock_hotspots):
        """测试获取热点列表（基础查询）"""
        # 模拟缓存
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        # 模拟查询结果：第一次调用是总数查询，第二次是分页查询
        mock_count_result = MagicMock()
        mock_count_result.scalar = MagicMock(return_value=2)

        mock_result = MagicMock()
        mock_result.scalars = MagicMock()
        mock_result.scalars.return_value.all = MagicMock(return_value=mock_hotspots)

        # 设置mock_db.execute的返回值序列
        mock_db.execute.side_effect = [mock_count_result, mock_result]

        # 调用方法
        result = await HotspotService.get_hotspots(
            db=mock_db,
            page=1,
            limit=20,
            importance_levels=None,
            source_types=None,
            date_from=None,
            date_to=None,
            sort_by="collected_at",
            sort_order="desc"
        )

        # 验证结果
        assert result["total"] == 2
        assert result["page"] == 1
        assert result["limit"] == 20
        assert result["total_pages"] == 1
        assert len(result["items"]) == 2
        # items应该是字典列表（经过model_dump转换）
        assert all(isinstance(item, dict) for item in result["items"])
        # 检查字典包含必要的字段
        assert all("id" in item and "title" in item for item in result["items"])

        # 验证execute被调用2次
        assert mock_db.execute.call_count == 2

    @pytest.mark.asyncio
    @patch('app.services.hotspot_service.cache')
    async def test_get_hotspots_with_source_filter(self, mock_cache, mock_db, mock_hotspots):
        """测试带来源筛选的热点列表查询"""
        # 模拟缓存
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        # 模拟查询结果：第一次调用是总数查询，第二次是分页查询
        mock_count_result = MagicMock()
        mock_count_result.scalar = MagicMock(return_value=1)

        mock_result = MagicMock()
        mock_result.scalars = MagicMock()
        mock_result.scalars.return_value.all = MagicMock(return_value=mock_hotspots[:1])  # 只返回一个

        # 设置mock_db.execute的返回值序列
        mock_db.execute.side_effect = [mock_count_result, mock_result]

        # 调用方法，指定来源类型
        result = await HotspotService.get_hotspots(
            db=mock_db,
            page=1,
            limit=20,
            source_types="news,tech_blog",
            sort_by="collected_at",
            sort_order="asc"
        )

        assert result["total"] == 1
        assert len(result["items"]) == 1

        # 验证execute被调用2次
        assert mock_db.execute.call_count == 2

    @pytest.mark.asyncio
    @patch('app.services.hotspot_service.cache')
    async def test_get_hotspot_detail_found(self, mock_cache, mock_db, mock_hotspot):
        """测试获取热点详情（找到热点）"""
        # 模拟缓存
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        # 模拟查询热点
        mock_hotspot_result = MagicMock()
        mock_hotspot_result.scalar_one_or_none = MagicMock(return_value=mock_hotspot)
        mock_db.execute.return_value = mock_hotspot_result

        # 调用方法，不提供user_id
        result = await HotspotService.get_hotspot_detail(
            db=mock_db,
            hotspot_id=mock_hotspot.id,
            user_id=None
        )

        assert result is not None
        assert "id" in result
        assert str(result["id"]) == str(mock_hotspot.id)
        assert "analysis" in result
        assert result["analysis"] is None

        # 验证查询被正确调用
        mock_db.execute.assert_called_once()
        call_args = mock_db.execute.call_args[0][0]
        assert isinstance(call_args, Select)
        # 检查where条件
        assert call_args._where_criteria is not None and len(call_args._where_criteria) > 0

    @pytest.mark.asyncio
    async def test_get_hotspot_detail_not_found(self, mock_db):
        """测试获取热点详情（未找到热点）"""
        # 模拟查询返回None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_db.execute.return_value = mock_result

        result = await HotspotService.get_hotspot_detail(
            db=mock_db,
            hotspot_id="non_existent_id",
            user_id=None
        )

        assert result is None

    @pytest.mark.asyncio
    @patch('app.services.hotspot_service.cache')
    async def test_get_hotspot_detail_with_analysis(self, mock_cache, mock_db, mock_hotspot):
        """测试获取热点详情（包含用户分析）"""
        # 模拟缓存
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        # 模拟热点查询
        mock_hotspot_result = MagicMock()
        mock_hotspot_result.scalar_one_or_none = MagicMock(return_value=mock_hotspot)

        # 模拟分析查询 - 创建简单的分析对象，避免Pydantic验证MagicMock的问题
        class MockAnalysis:
            def __init__(self):
                from datetime import datetime
                import uuid

                self.id = str(uuid.uuid4())  # 有效的UUID格式
                self.relevance_score = 85
                self.importance_level = ImportanceLevel.HIGH
                self.business_impact = "测试业务影响分析"
                self.importance_reason = "测试重要性原因"
                self.action_suggestions = "测试行动建议"
                self.technical_details = "测试技术细节"
                # 使用有效的UUID格式
                self.hotspot_id = mock_hotspot.id  # mock_hotspot.id已经是有效的UUID字符串
                self.user_id = "550e8400-e29b-41d4-a716-446655440002"  # 有效的UUID字符串
                self.model_used = "deepseek-chat"
                self.tokens_used = 150
                self.analysis_metadata = {"key": "value"}
                self.analyzed_at = datetime(2024, 1, 1, 0, 0, 0)
                self.created_at = datetime(2024, 1, 1, 0, 0, 0)
                self.updated_at = datetime(2024, 1, 1, 0, 0, 0)

        mock_analysis = MockAnalysis()
        mock_analysis_result = MagicMock()
        mock_analysis_result.scalar_one_or_none = MagicMock(return_value=mock_analysis)

        # 设置execute的返回值序列：第一次热点查询，第二次分析查询
        mock_db.execute.side_effect = [mock_hotspot_result, mock_analysis_result]

        # 调用方法，提供user_id（使用有效的UUID格式）
        test_user_uuid = "550e8400-e29b-41d4-a716-446655440002"
        result = await HotspotService.get_hotspot_detail(
            db=mock_db,
            hotspot_id=mock_hotspot.id,
            user_id=test_user_uuid
        )

        assert result is not None
        assert "analysis" in result
        assert result["analysis"] is not None
        # 分析结果应该是字典
        assert isinstance(result["analysis"], dict)
        # 检查字典包含必要的字段
        assert "id" in result["analysis"]
        assert result["analysis"]["relevance_score"] == 85
        assert result["analysis"]["importance_level"] == "high"

        # 验证execute被调用2次
        assert mock_db.execute.call_count == 2

    @pytest.mark.asyncio
    @patch('app.services.hotspot_service.cache')
    async def test_get_hotspot_stats(self, mock_cache, mock_db):
        """测试获取热点统计信息"""
        from datetime import datetime

        # 模拟缓存
        mock_cache.get_json = AsyncMock(return_value=None)
        mock_cache.set_json = AsyncMock(return_value=True)

        # 模拟各种查询结果
        mock_total_result = MagicMock()
        mock_total_result.scalar = MagicMock(return_value=10)

        mock_source_result = MagicMock()
        # 创建具有source_type和count属性的模拟行对象
        rows = []
        for source_type, count in [(SourceType.NEWS, 5), (SourceType.TECH_BLOG, 3), (SourceType.SOCIAL_MEDIA, 2)]:
            row = MagicMock()
            row.source_type = source_type
            row.count = count
            rows.append(row)
        mock_source_result.all = MagicMock(return_value=rows)

        mock_importance_result = MagicMock()
        # 创建具有importance_level和count属性的模拟行对象
        rows = []
        for importance_level, count in [(ImportanceLevel.HIGH, 3), (ImportanceLevel.MEDIUM, 4), (ImportanceLevel.LOW, 2), (ImportanceLevel.EMERGENCY, 1)]:
            row = MagicMock()
            row.importance_level = importance_level
            row.count = count
            rows.append(row)
        mock_importance_result.all = MagicMock(return_value=rows)

        mock_last_update_result = MagicMock()
        mock_last_update_result.scalar = MagicMock(return_value=datetime(2024, 1, 10, 0, 0, 0))

        mock_all_ids_result = MagicMock()
        mock_all_ids_result.scalars = MagicMock()
        mock_all_ids_result.scalars.return_value.all = MagicMock(return_value=["id1", "id2", "id3", "id4", "id5"])

        mock_analyzed_ids_result = MagicMock()
        mock_analyzed_ids_result.scalars = MagicMock()
        mock_analyzed_ids_result.scalars.return_value.all = MagicMock(return_value=["id1", "id2", "id3"])

        # 设置execute的返回值序列（按照方法中的调用顺序）
        mock_db.execute.side_effect = [
            mock_total_result,      # 热点总数
            mock_source_result,     # 来源统计
            mock_importance_result, # 重要性统计
            mock_last_update_result, # 最后更新时间
            mock_all_ids_result,    # 所有热点ID
            mock_analyzed_ids_result # 已分析热点ID
        ]

        # 调用方法
        result = await HotspotService.get_hotspot_stats(mock_db)

        # 验证结果
        assert result["total_hotspots"] == 10
        assert result["by_source"]["news"] == 5
        assert result["by_source"]["tech_blog"] == 3
        assert result["by_source"]["social_media"] == 2
        assert result["by_importance"]["high"] == 3
        assert result["by_importance"]["medium"] == 4
        assert result["by_importance"]["low"] == 2
        assert result["by_importance"]["emergency"] == 1
        assert result["pending_analysis"] == 2  # 5个热点，3个已分析
        assert "last_update" in result
        assert result["last_update"] == "2024-01-10T00:00:00"
        assert "emergency_count" in result
        assert result["emergency_count"] == 1
        assert result["high_count"] == 3
        assert result["medium_count"] == 4
        assert result["low_count"] == 2
        assert result["watch_count"] == 0  # 没有watch级别

        # 验证execute被调用6次
        assert mock_db.execute.call_count == 6

    @pytest.mark.asyncio
    async def test_invalidate_hotspots_cache(self):
        """测试使热点缓存失效"""
        mock_cache = AsyncMock()
        mock_cache.delete_pattern = AsyncMock(return_value=5)

        with patch('app.services.hotspot_service.cache', mock_cache):
            await HotspotService.invalidate_hotspots_cache()

            # 验证delete_pattern被调用2次
            assert mock_cache.delete_pattern.call_count == 2
            # 验证调用了正确的模式
            calls = mock_cache.delete_pattern.call_args_list
            patterns = [call[0][0] for call in calls]
            assert "cache:hotspot:*" in patterns
            assert "cache:analysis:*" in patterns

    def test_generate_cache_key(self):
        """测试生成缓存键"""
        key = HotspotService._generate_cache_key(
            method="get_hotspots",
            page=1,
            limit=20,
            source_types="news,tech_blog",
            sort_by="collected_at"
        )

        assert key.startswith("hotspot:get_hotspots:")
        assert len(key) == len("hotspot:get_hotspots:") + 32  # MD5哈希长度

        # 相同参数生成相同键
        key2 = HotspotService._generate_cache_key(
            method="get_hotspots",
            page=1,
            limit=20,
            source_types="news,tech_blog",
            sort_by="collected_at"
        )
        assert key == key2

        # 不同参数生成不同键
        key3 = HotspotService._generate_cache_key(
            method="get_hotspots",
            page=2,  # 不同页码
            limit=20,
            source_types="news,tech_blog",
            sort_by="collected_at"
        )
        assert key != key3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])