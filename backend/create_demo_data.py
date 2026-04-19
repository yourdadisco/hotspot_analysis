#!/usr/bin/env python3
"""
创建演示数据脚本
"""

import asyncio
import uuid
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# 导入模型
from src.app.models.user import User, UserSettings
from src.app.models.hotspot import Hotspot, HotspotAnalysis, SourceType, ImportanceLevel
from src.app.models.api_usage import APIUsage

async def create_demo_data():
    """创建演示数据"""

    # 创建异步引擎（使用SQLite）
    engine = create_async_engine(
        "sqlite+aiosqlite:///hotspot_analysis.db",
        echo=False
    )

    # 创建会话工厂
    AsyncSessionLocal = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with AsyncSessionLocal() as session:
        try:
            print("开始创建演示数据...")

            # 1. 创建测试用户
            print("创建测试用户...")
            test_user = User(
                id=str(uuid.uuid4()),
                email="demo@example.com",
                company_name="示例科技有限公司",
                industry="人工智能",
                business_description="专注于AI大模型研发和行业应用解决方案",
                last_login_at=datetime.utcnow()
            )
            session.add(test_user)

            # 2. 创建用户设置
            user_settings = UserSettings(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                update_schedule="daily_2am",
                notify_on_emergency="Y",
                notify_on_high="Y",
                notify_on_medium="N",
                items_per_page="20",
                default_sort="relevance",
                default_importance_levels="emergency,high,medium",
                default_source_types="news,tech_blog"
            )
            session.add(user_settings)

            await session.commit()
            await session.refresh(test_user)
            await session.refresh(user_settings)

            print(f"用户创建成功: {test_user.email} (ID: {test_user.id})")

            # 3. 创建测试热点
            print("创建测试热点...")
            hotspots = []

            # 热点1: OpenAI发布新模型
            hotspot1 = Hotspot(
                id=str(uuid.uuid4()),
                title="OpenAI发布GPT-4.5，在多模态理解方面有重大突破",
                summary="OpenAI最新发布的GPT-4.5在多模态理解、代码生成和推理能力上有显著提升，特别是对图像和视频的理解能力增强。",
                content_url="https://example.com/openai-gpt45",
                source_type=SourceType.NEWS,
                source_name="TechCrunch",
                source_url="https://techcrunch.com",
                publish_date=datetime.utcnow() - timedelta(days=1),
                raw_content="OpenAI today announced GPT-4.5...",
                processed_content={"key_points": ["多模态能力增强", "代码生成效率提升30%", "推理能力改进"]},
                tags=["OpenAI", "GPT-4.5", "大模型", "多模态"],
                category="技术突破",
                language="zh",
                author="John Smith",
                raw_metadata={"read_time": "5分钟", "sentiment": "positive"},
                view_count="1500",
                like_count="320",
                share_count="89"
            )
            hotspots.append(hotspot1)

            # 热点2: 中国AI政策
            hotspot2 = Hotspot(
                id=str(uuid.uuid4()),
                title="中国发布AI行业监管新规，强调数据安全和算法透明",
                summary="中国政府发布最新人工智能行业监管规定，要求企业加强数据安全保护，提高算法透明度，促进AI健康发展。",
                content_url="https://example.com/china-ai-regulation",
                source_type=SourceType.NEWS,
                source_name="新华社",
                source_url="https://xinhuanet.com",
                publish_date=datetime.utcnow() - timedelta(days=2),
                raw_content="中国相关部门今日发布人工智能监管新规...",
                processed_content={"key_points": ["数据安全要求", "算法透明化", "行业准入标准"]},
                tags=["AI监管", "数据安全", "政策", "中国"],
                category="政策法规",
                language="zh",
                author="李华",
                raw_metadata={"read_time": "8分钟", "sentiment": "neutral"},
                view_count="2300",
                like_count="450",
                share_count="120"
            )
            hotspots.append(hotspot2)

            # 热点3: 芯片技术突破
            hotspot3 = Hotspot(
                id=str(uuid.uuid4()),
                title="英伟达发布新一代AI芯片，性能提升3倍",
                summary="英伟达发布H200 AI芯片，在AI训练和推理性能上有显著提升，预计将推动大模型训练成本降低。",
                content_url="https://example.com/nvidia-h200",
                source_type=SourceType.TECH_BLOG,
                source_name="NVIDIA博客",
                source_url="https://blogs.nvidia.com",
                publish_date=datetime.utcnow() - timedelta(days=3),
                raw_content="NVIDIA announced the H200 GPU...",
                processed_content={"key_points": ["性能提升3倍", "能效提高", "成本降低"]},
                tags=["英伟达", "AI芯片", "H200", "硬件"],
                category="硬件技术",
                language="en",
                author="NVIDIA官方",
                raw_metadata={"read_time": "6分钟", "sentiment": "positive"},
                view_count="1800",
                like_count="380",
                share_count="95"
            )
            hotspots.append(hotspot3)

            for hotspot in hotspots:
                session.add(hotspot)

            await session.commit()
            for hotspot in hotspots:
                await session.refresh(hotspot)

            print(f"热点创建成功: 共{len(hotspots)}个")

            # 4. 创建热点分析
            print("创建热点分析...")
            analyses = []

            # 分析1: OpenAI热点
            analysis1 = HotspotAnalysis(
                id=str(uuid.uuid4()),
                hotspot_id=hotspot1.id,
                user_id=test_user.id,
                relevance_score=85,
                importance_level=ImportanceLevel.HIGH,
                business_impact="GPT-4.5的发布可能影响我们现有的产品竞争力，需要评估是否需要集成或对标。",
                importance_reason="OpenAI是行业领导者，其技术突破会推动整个行业标准提升。",
                action_suggestions="1. 技术团队评估GPT-4.5能力\n2. 产品团队研究竞争对策\n3. 考虑技术合作可能性",
                technical_details="多模态能力增强可能改变人机交互方式，代码生成效率提升影响开发工具市场。",
                analyzed_at=datetime.utcnow() - timedelta(hours=2),
                model_used="gpt-4",
                tokens_used=1250,
                analysis_metadata={"analysis_time": "15分钟", "confidence": "0.85"}
            )
            analyses.append(analysis1)

            # 分析2: 中国AI政策
            analysis2 = HotspotAnalysis(
                id=str(uuid.uuid4()),
                hotspot_id=hotspot2.id,
                user_id=test_user.id,
                relevance_score=90,
                importance_level=ImportanceLevel.EMERGENCY,
                business_impact="新规可能影响我们的数据收集和处理流程，需要合规审查。",
                importance_reason="法规变化直接影响业务运营，不及时应对可能面临处罚。",
                action_suggestions="1. 法务团队解读新规\n2. 技术团队评估合规影响\n3. 制定合规整改计划",
                technical_details="数据安全要求可能涉及加密标准、存储位置、访问控制等技术调整。",
                analyzed_at=datetime.utcnow() - timedelta(hours=5),
                model_used="gpt-4",
                tokens_used=980,
                analysis_metadata={"analysis_time": "12分钟", "confidence": "0.92"}
            )
            analyses.append(analysis2)

            # 分析3: 芯片技术
            analysis3 = HotspotAnalysis(
                id=str(uuid.uuid4()),
                hotspot_id=hotspot3.id,
                user_id=test_user.id,
                relevance_score=70,
                importance_level=ImportanceLevel.MEDIUM,
                business_impact="新一代芯片可能降低我们的AI训练成本，提升产品性能。",
                importance_reason="硬件进步直接影响研发效率和成本结构。",
                action_suggestions="1. 评估硬件升级计划\n2. 成本效益分析\n3. 测试新芯片性能",
                technical_details="H200在FP8精度下的性能提升显著，可能改变模型训练策略。",
                analyzed_at=datetime.utcnow() - timedelta(hours=8),
                model_used="gpt-4",
                tokens_used=1100,
                analysis_metadata={"analysis_time": "10分钟", "confidence": "0.78"}
            )
            analyses.append(analysis3)

            for analysis in analyses:
                session.add(analysis)

            await session.commit()

            # 5. 创建API使用记录
            print("创建API使用记录...")
            api_usage = APIUsage(
                id=str(uuid.uuid4()),
                user_id=test_user.id,
                endpoint="/api/v1/analysis",
                model_used="gpt-4",
                prompt_tokens=3200,
                completion_tokens=850,
                total_tokens=4050,
                cost_usd=0.12,
                estimated_cost_cny=0.85,
                response_time_ms=2450,
                success=True,
                request_summary="分析3个热点",
                response_summary="生成分析报告",
                requested_at=datetime.utcnow() - timedelta(hours=1),
                completed_at=datetime.utcnow() - timedelta(hours=1)
            )
            session.add(api_usage)

            await session.commit()

            print("演示数据创建完成！")
            print("\n数据摘要:")
            print(f"- 用户: {test_user.email} ({test_user.company_name})")
            print(f"- 热点: {len(hotspots)} 个")
            print(f"- 分析: {len(analyses)} 个")
            print(f"- API记录: 1 条")
            print(f"\n用户ID: {test_user.id}")
            print(f"测试热点ID: {hotspot1.id}")

        except Exception as e:
            await session.rollback()
            print(f"创建演示数据时出错: {e}")
            raise
        finally:
            await session.close()

if __name__ == "__main__":
    asyncio.run(create_demo_data())