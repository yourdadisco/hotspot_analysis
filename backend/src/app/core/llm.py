import asyncio
from typing import Dict, Any, Optional, List
import logging
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    """大语言模型客户端（OpenAI兼容）"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE,
        )
        self.model = settings.LLM_MODEL

    async def analyze_hotspot(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str,
        max_tokens: int = 1000,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        分析热点与业务的相关性

        返回:
        {
            "relevance_score": 85,  # 0-100
            "importance_level": "high",  # emergency/high/medium/low/watch
            "business_impact": "该技术可能降低公司30%的运营成本...",
            "importance_reason": "因为...",
            "action_suggestions": "建议...",
            "technical_details": "技术细节..."
        }
        """
        prompt = self._build_analysis_prompt(
            hotspot_title=hotspot_title,
            hotspot_content=hotspot_content,
            business_description=business_description
        )

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的AI行业分析师，擅长分析技术热点对特定业务的影响。"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=temperature,
                response_format={"type": "json_object"}
            )

            # 解析JSON响应
            import json
            result = json.loads(response.choices[0].message.content)

            # 验证和规范化结果
            return self._validate_analysis_result(result)

        except Exception as e:
            logger.error(f"LLM分析失败: {e}")
            raise

    def _build_analysis_prompt(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> str:
        """构建分析提示词"""
        return f"""
请分析以下AI热点对指定业务的影响，并以JSON格式返回分析结果。

## 热点信息
标题：{hotspot_title}
内容：{hotspot_content}

## 业务描述
{business_description}

## 分析要求
请从以下维度进行分析：

1. **相关性评分** (relevance_score)：0-100的整数，表示热点与业务的直接相关程度
2. **重要性级别** (importance_level)：紧急(emergency)/高(high)/中(medium)/低(low)/关注(watch)
3. **业务影响** (business_impact)：详细描述该热点对业务的具体影响（正面或负面），至少200字
4. **重要性原因** (importance_reason)：解释为什么这个热点具有该级别的重要性，至少100字
5. **行动建议** (action_suggestions)：针对该热点，给业务团队的具体建议，可选
6. **技术细节** (technical_details)：相关的技术实现细节或行业趋势分析，可选

## 输出格式
必须返回有效的JSON对象，包含以下字段：
{{
    "relevance_score": 85,
    "importance_level": "high",
    "business_impact": "详细影响描述...",
    "importance_reason": "重要性解释...",
    "action_suggestions": "建议文本...",
    "technical_details": "技术细节..."
}}

请确保：
1. 相关性评分基于技术相关性和业务影响程度
2. 重要性级别考虑技术成熟度、市场关注度、竞争态势
3. 业务影响描述具体、可操作
4. 使用中文进行所有分析
"""

    def _validate_analysis_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """验证和规范化分析结果"""
        # 确保必需字段存在
        required_fields = ["relevance_score", "importance_level", "business_impact", "importance_reason"]
        for field in required_fields:
            if field not in result:
                raise ValueError(f"分析结果缺少必需字段: {field}")

        # 验证相关性评分
        score = result.get("relevance_score", 50)
        if not isinstance(score, int):
            try:
                score = int(score)
            except:
                score = 50
        result["relevance_score"] = max(0, min(100, score))

        # 验证重要性级别
        valid_levels = ["emergency", "high", "medium", "low", "watch"]
        level = result.get("importance_level", "medium").lower()
        if level not in valid_levels:
            level = "medium"
        result["importance_level"] = level

        # 确保可选字段存在
        result.setdefault("action_suggestions", "")
        result.setdefault("technical_details", "")

        return result

    async def test_connection(self) -> bool:
        """测试LLM API连接"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return response.choices[0].finish_reason == "stop"
        except Exception as e:
            logger.error(f"LLM连接测试失败: {e}")
            return False

    async def get_usage_info(self) -> Dict[str, Any]:
        """获取API使用信息（如果支持）"""
        # OpenAI兼容API可能不支持直接获取使用情况
        # 这里返回模拟信息或通过其他方式获取
        return {
            "model": self.model,
            "provider": "openai_compatible",
            "capabilities": ["chat_completion"]
        }


# 全局客户端实例
llm_client = LLMClient()