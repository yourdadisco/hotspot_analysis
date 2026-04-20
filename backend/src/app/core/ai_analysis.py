"""
AI分析核心模块 - 重新设计以确保调用大模型生成分析过程和业务影响分析
"""
import asyncio
import json
import logging
import re
from typing import Dict, Any, Optional
from openai import AsyncOpenAI

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIAnalyzer:
    """AI分析器 - 专注于生成高质量的分析过程和业务影响分析"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE,
            timeout=300.0,
        )
        self.model = settings.LLM_MODEL

    async def generate_analysis(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> Dict[str, Any]:
        """
        生成完整的AI分析，包括分析过程和业务影响分析

        返回包含以下字段的字典：
        - analysis_process: 详细的分析过程
        - analysis_conclusion: 分析结论
        - relevance_score: 相关性分数 (0-100)
        - importance_level: 重要性级别
        - business_impact: 业务影响分析
        - importance_reason: 重要性原因
        - action_suggestions: 行动建议
        - technical_details: 技术细节
        """
        logger.info(f"开始生成AI分析 (模型: {self.model})")

        # 构建优化后的提示词
        prompt = self._build_optimized_prompt(
            hotspot_title=hotspot_title,
            hotspot_content=hotspot_content,
            business_description=business_description
        )

        # 尝试多次调用，使用不同的策略
        max_attempts = 3
        for attempt in range(max_attempts):
            try:
                logger.info(f"AI分析尝试 {attempt + 1}/{max_attempts}")

                # 调用LLM API - 减少token数量并优化参数以防止连接中断
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "你是一个资深的AI行业分析师，擅长分析技术热点对特定业务的影响。"},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1200,  # 减少token数量，防止响应过长导致连接中断
                    temperature=0.7,
                    response_format={"type": "json_object"},  # 要求返回JSON
                    timeout=60.0  # 设置更短的超时时间
                )

                content = response.choices[0].message.content

                # 解析响应
                analysis_result = self._parse_ai_response(content)

                # 验证结果
                validated_result = self._validate_analysis_result(analysis_result)

                # 记录成功
                logger.info(f"AI分析成功生成: relevance_score={validated_result.get('relevance_score')}, "
                          f"importance_level={validated_result.get('importance_level')}")

                # 检查是否是真正的AI生成内容
                if self._is_real_ai_content(validated_result):
                    return validated_result
                else:
                    logger.warning(f"分析结果可能是模拟数据或错误响应，尝试 {attempt + 1}")

            except Exception as e:
                logger.error(f"AI分析尝试 {attempt + 1} 失败: {e}")
                if attempt == max_attempts - 1:
                    logger.error("所有尝试都失败，返回最小有效响应")
                    return self._create_minimal_response()

                await asyncio.sleep(2)  # 等待后重试

        # 如果所有尝试都失败，返回最小响应
        return self._create_minimal_response()

    def _build_optimized_prompt(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> str:
        """构建优化的分析提示词"""
        return f"""请分析以下技术热点对指定业务的影响，并返回JSON格式的分析结果。

## 热点信息
标题：{hotspot_title}
内容：{hotspot_content}

## 业务信息
描述：{business_description}

## 分析要求
请提供详细、深入的分析，包括：

### 1. 分析过程 (analysis_process)
详细描述你的分析步骤和方法，包括：
- 热点内容解析：提取关键技术和创新点
- 技术成熟度评估：评估技术就绪等级(TRL)和发展阶段
- 业务相关性分析：技术与业务的技术栈、应用场景匹配度
- 竞争格局分析：对行业竞争态势的影响
- 风险评估：技术风险、市场风险、合规风险等
- 价值量化：潜在的业务价值量化评估

### 2. 分析结论 (analysis_conclusion)
总结核心发现和关键洞察

### 3. 相关性分数 (relevance_score)
0-100的整数，表示热点与业务的相关性程度

### 4. 重要性级别 (importance_level)
"emergency"/"high"/"medium"/"low"/"watch" 中的一个

### 5. 业务影响分析 (business_impact)
详细的业务影响分析，包括：
- 直接影响：对运营效率、成本结构、收入模式的影响
- 间接影响：对竞争优势、品牌价值、人才吸引力的影响
- 量化评估：投资回报率(ROI)、净现值(NPV)等量化指标预估
- 时间维度：短期(6个月)、中期(1-2年)、长期(2年以上)影响

### 6. 重要性原因 (importance_reason)
解释为什么分配这个重要性级别

### 7. 行动建议 (action_suggestions)
具体可行的行动建议，按优先级排列

### 8. 技术细节 (technical_details)
深入的技术细节分析，包括技术原理、实现复杂度、资源需求等

## 输出格式要求
请返回一个JSON对象，包含以上所有字段。确保：
1. 所有字符串值使用双引号
2. 使用中文内容（JSON键名使用英文）
3. 分析过程和业务影响分析每部分内容详实即可，不需要过于冗长
4. 避免模板化语言，提供真实、深入的分析

示例格式：
{{
  "analysis_process": "1. 热点内容解析：首先分析了热点中的关键技术要素...\\n2. 技术成熟度评估：该技术处于TRL 6-7阶段...",
  "analysis_conclusion": "综合来看，该热点技术对业务具有中等偏高的相关性...",
  "relevance_score": 75,
  "importance_level": "medium",
  "business_impact": "直接影响：预计可提升运营效率15-25%，主要通过...\\n间接影响：可能增强品牌在AI技术领域的专业形象...",
  "importance_reason": "该技术属于AI工程化领域，是当前企业AI落地的关键瓶颈...",
  "action_suggestions": "1. 立即组建技术评估小组...\\n2. 在3个月内进行小规模概念验证...",
  "technical_details": "该技术基于Transformer架构的改进版本，主要创新点在于..."
}}

现在请基于以上热点和业务描述，提供深入、详细的分析："""

    def _parse_ai_response(self, content: str) -> Dict[str, Any]:
        """解析AI响应，提取JSON内容"""
        if not content:
            raise ValueError("AI响应内容为空")

        logger.debug(f"AI响应内容 (前500字符): {content[:500]}")

        # 策略1: 直接解析为JSON
        try:
            result = json.loads(content)
            logger.info("直接JSON解析成功")
            return result
        except json.JSONDecodeError as e:
            logger.warning(f"直接JSON解析失败: {e}")

        # 策略2: 清理内容后解析
        cleaned = self._clean_json_content(content)
        try:
            result = json.loads(cleaned)
            logger.info("清理后JSON解析成功")
            return result
        except json.JSONDecodeError as e:
            logger.warning(f"清理后JSON解析失败: {e}")

        # 策略3: 提取JSON对象
        extracted = self._extract_json_object(content)
        if extracted:
            try:
                result = json.loads(extracted)
                logger.info("提取JSON对象解析成功")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"提取JSON解析失败: {e}")

        # 策略4: 使用正则表达式查找JSON
        json_match = self._find_json_with_regex(content)
        if json_match:
            try:
                result = json.loads(json_match)
                logger.info("正则表达式匹配JSON解析成功")
                return result
            except json.JSONDecodeError as e:
                logger.warning(f"正则表达式JSON解析失败: {e}")

        raise ValueError("无法解析AI响应内容")

    def _clean_json_content(self, content: str) -> str:
        """清理JSON内容，移除markdown代码块等"""
        content = content.strip()

        # 移除 ```json 和 ``` 标记
        if content.startswith('```json'):
            content = content[7:]
        elif content.startswith('```'):
            content = content[3:]

        if content.endswith('```'):
            content = content[:-3]

        content = content.strip()

        # 查找第一个{和最后一个}
        start = content.find('{')
        end = content.rfind('}')

        if start != -1 and end != -1 and end > start:
            return content[start:end + 1]

        return content

    def _extract_json_object(self, content: str) -> Optional[str]:
        """从内容中提取JSON对象"""
        # 查找平衡的大括号
        stack = []
        start = -1

        for i, char in enumerate(content):
            if char == '{':
                if not stack:
                    start = i
                stack.append(char)
            elif char == '}':
                if stack:
                    stack.pop()
                    if not stack and start != -1:
                        # 找到完整的JSON对象
                        return content[start:i+1]

        return None

    def _find_json_with_regex(self, content: str) -> Optional[str]:
        """使用正则表达式查找JSON对象"""
        # 尝试匹配JSON对象
        pattern = r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}'
        match = re.search(pattern, content, re.DOTALL)

        if match:
            # 验证大括号是否平衡
            json_str = match.group(0)
            if json_str.count('{') == json_str.count('}'):
                return json_str

        return None

    def _validate_analysis_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """验证和规范化分析结果"""
        # 必需字段
        required_fields = [
            "analysis_process",
            "analysis_conclusion",
            "relevance_score",
            "importance_level",
            "business_impact",
            "importance_reason",
            "action_suggestions",
            "technical_details"
        ]

        # 确保所有字段都存在
        for field in required_fields:
            if field not in result:
                result[field] = f"{field}字段缺失"
                logger.warning(f"分析结果缺少字段: {field}")

        # 验证相关性分数
        score = result.get("relevance_score", 50)
        try:
            score = int(score)
            score = max(0, min(100, score))
        except:
            score = 50
        result["relevance_score"] = score

        # 验证重要性级别
        valid_levels = ["emergency", "high", "medium", "low", "watch"]
        level = str(result.get("importance_level", "medium")).lower()
        if level not in valid_levels:
            level = "medium"
        result["importance_level"] = level

        # 检查字段内容质量
        for field in ["analysis_process", "business_impact"]:
            content = result.get(field, "")
            if len(content) < 100:  # 内容太短
                logger.warning(f"{field}字段内容过短: {len(content)}字符")
                result[field] = f"{content}\n\n注：AI生成内容可能不完整，建议重新分析。"

        return result

    def _is_real_ai_content(self, result: Dict[str, Any]) -> bool:
        """检查是否是真正的AI生成内容（而非模拟数据或错误信息）"""
        # 检查是否存在错误标记
        if result.get("_analysis_failed"):
            return False

        # 检查关键字段是否包含错误信息
        error_indicators = [
            "LLM分析过程生成失败",
            "分析失败：无法从大模型获取",
            "业务影响分析生成失败",
            "JSON解析失败",
            "由于LLM响应格式问题"
        ]

        analysis_process = result.get("analysis_process", "")
        business_impact = result.get("business_impact", "")

        for indicator in error_indicators:
            if indicator in analysis_process or indicator in business_impact:
                logger.warning(f"检测到错误指示器: {indicator}")
                return False

        # 检查内容长度（AI生成内容通常较长）
        if len(analysis_process) < 100 or len(business_impact) < 100:
            logger.warning(f"内容过短: analysis_process={len(analysis_process)}, business_impact={len(business_impact)}")
            return False

        return True

    def _create_minimal_response(self) -> Dict[str, Any]:
        """创建最小有效响应（当所有尝试都失败时）"""
        logger.error("创建最小有效响应，AI分析完全失败")

        return {
            "analysis_process": "AI分析过程生成失败。系统尝试调用大模型进行分析，但未能获取有效响应。请检查：\n1. API密钥有效性\n2. 网络连接状态\n3. 大模型服务可用性\n4. 热点内容和业务描述的清晰度",
            "analysis_conclusion": "无法完成分析。系统未能成功调用AI分析功能，建议检查配置后重试。",
            "relevance_score": 50,
            "importance_level": "medium",
            "business_impact": "业务影响分析生成失败。这表明AI分析模块未能正常工作，无法评估热点对业务的潜在影响。",
            "importance_reason": "重要性分析不可用。由于AI分析失败，无法确定该热点的重要性级别。",
            "action_suggestions": "1. 检查系统配置和API设置\n2. 验证网络连接\n3. 重新尝试分析请求\n4. 如果问题持续，考虑使用备用分析方案",
            "technical_details": "技术细节分析不可用。AI分析模块未能生成技术细节内容。",
            "_analysis_failed": True,
            "_failure_reason": "AI_ANALYSIS_COMPLETE_FAILURE"
        }

    async def test_connection(self) -> bool:
        """测试API连接"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello, respond with 'OK'"}],
                max_tokens=5
            )
            return response.choices[0].message.content is not None
        except Exception as e:
            logger.error(f"API连接测试失败: {e}")
            return False


# 全局分析器实例
ai_analyzer = AIAnalyzer()