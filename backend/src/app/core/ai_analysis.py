"""
AI分析核心模块 - 最终简化版本，解决上下文过长问题
替换原有的复杂实现，专注于生成简洁、可用的分析结果
"""
import json
import logging
from typing import Dict, Any
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """AI分析器 - 简化版本，避免上下文溢出"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE,
            timeout=30.0,  # 较短超时
        )
        self.model = settings.LLM_MODEL

    async def generate_analysis(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> Dict[str, Any]:
        """
        生成AI分析 - 简化实现，严格控制输出长度

        返回标准化字段：
        - analysis_process: 分析过程 (≤150字符)
        - analysis_conclusion: 结论 (≤80字符)
        - relevance_score: 相关度分数 (0-100)
        - importance_level: 重要性级别
        - business_impact: 业务影响 (≤120字符)
        - importance_reason: 原因 (≤80字符)
        - action_suggestions: 建议 (≤150字符)
        - technical_details: 技术细节 (≤100字符)
        """
        logger.info(f"生成AI分析: {hotspot_title[:50]}...")

        # 构建极简提示词
        prompt = self._build_minimal_prompt(
            hotspot_title=hotspot_title,
            hotspot_content=hotspot_content,
            business_description=business_description
        )

        try:
            # 调用API，严格限制输出
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "AI行业分析师，请提供简洁分析。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,  # 严格控制输出长度
                temperature=0.7,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            result = self._parse_response(content)

            logger.info(f"分析成功: 相关度{result.get('relevance_score')}, 级别{result.get('importance_level')}")
            return result

        except Exception as e:
            logger.warning(f"AI分析异常: {e}, 使用回退响应")
            return self._create_safe_response()

    def _build_minimal_prompt(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> str:
        """构建最小化提示词，避免过长输入"""
        # 截断输入，防止上下文过长
        title = hotspot_title[:80]
        content = (hotspot_content[:200] if hotspot_content else "")
        business = (business_description[:150] if business_description else "")

        return f"""分析热点对业务的影响，返回JSON：

标题：{title}
内容：{content}
业务：{business}

返回JSON格式（内容简洁）：
{{
  "analysis_process": "简要分析步骤",
  "analysis_conclusion": "核心结论",
  "relevance_score": 0-100整数,
  "importance_level": "emergency/high/medium/low/watch",
  "business_impact": "业务影响简述",
  "importance_reason": "重要性原因",
  "action_suggestions": "1-2条建议",
  "technical_details": "技术要点"
}}

要求：
- 每个文本字段≤150字符
- 直接返回JSON，不要其他内容"""

    def _parse_response(self, content: str) -> Dict[str, Any]:
        """解析API响应，确保格式正确"""
        # 尝试解析JSON
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = self._extract_json(content) or {}

        # 确保所有字段都存在
        fields = [
            ("analysis_process", "分析过程：热点评估→业务匹配→影响预测"),
            ("analysis_conclusion", "根据分析得出结论"),
            ("relevance_score", 50),
            ("importance_level", "medium"),
            ("business_impact", "可能对业务产生一定影响"),
            ("importance_reason", "基于相关度和潜在影响评估"),
            ("action_suggestions", "1. 继续关注\n2. 收集更多信息"),
            ("technical_details", "相关技术细节")
        ]

        result = {}
        for field, default in fields:
            result[field] = data.get(field, default)

        # 验证和清理
        result["relevance_score"] = self._clamp_score(result["relevance_score"])
        result["importance_level"] = self._validate_level(result["importance_level"])

        # 限制文本长度
        result = self._truncate_fields(result)

        return result

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """从文本中提取JSON"""
        import re
        # 查找可能的JSON对象
        patterns = [
            r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',  # 匹配平衡大括号
            r'\{"analysis_process".*?\}',  # 匹配从指定字段开始
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except:
                    continue
        return {}

    def _clamp_score(self, score) -> int:
        """将分数限制在0-100范围内"""
        try:
            score = int(score)
            if score < 0:
                return 0
            if score > 100:
                return 100
            return score
        except:
            return 50

    def _validate_level(self, level: str) -> str:
        """验证重要性级别"""
        valid = ["emergency", "high", "medium", "low", "watch"]
        level_str = str(level).lower().strip()
        return level_str if level_str in valid else "medium"

    def _truncate_fields(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """截断文本字段，避免过长"""
        limits = {
            "analysis_process": 150,
            "analysis_conclusion": 80,
            "business_impact": 120,
            "importance_reason": 80,
            "action_suggestions": 150,
            "technical_details": 100
        }

        for field, limit in limits.items():
            if field in result and isinstance(result[field], str):
                if len(result[field]) > limit:
                    result[field] = result[field][:limit] + "..."

        return result

    def _create_safe_response(self) -> Dict[str, Any]:
        """创建安全回退响应"""
        return {
            "analysis_process": "分析过程：初步评估→相关性分析→影响预测",
            "analysis_conclusion": "需要进一步分析以获得准确结论",
            "relevance_score": 50,
            "importance_level": "medium",
            "business_impact": "潜在业务影响需要进一步评估",
            "importance_reason": "基于初步分析的重要性评估",
            "action_suggestions": "1. 继续监控该热点\n2. 分析更多相关数据",
            "technical_details": "技术方面需要专业评估"
        }

    async def test_connection(self) -> bool:
        """测试API连接"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "测试"}],
                max_tokens=5
            )
            return response.choices[0].message.content is not None
        except Exception as e:
            logger.error(f"连接测试失败: {e}")
            return False


# 全局分析器实例（保持相同接口）
ai_analyzer = AIAnalyzer()