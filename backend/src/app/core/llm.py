import asyncio
from typing import Dict, Any, Optional, List
import logging
from openai import AsyncOpenAI
from openai.types.chat import ChatCompletion

from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    """大语言模型客户端（OpenAI/DeepSeek兼容）"""

    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=settings.LLM_API_BASE,
            timeout=300.0,  # 进一步增加超时时间
        )
        self.model = settings.LLM_MODEL

    async def analyze_hotspot(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str,
        max_tokens: int = 2000,  # 减少token限制，提高API稳定性
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
        # Mock模式：返回模拟数据用于开发和测试
        if settings.LLM_MOCK_MODE:
            import random
            # 根据热点标题确定分析方向
            hotspot_lower = hotspot_title.lower()

            # 检测热点类型
            if any(keyword in hotspot_lower for keyword in ["gemma", "llama", "gpt", "claude", "大模型", "模型"]):
                tech_focus = "大语言模型技术"
                importance_factor = "高"
                trend_status = "前沿突破"
            elif any(keyword in hotspot_lower for keyword in ["芯片", "硬件", "nvidia", "amd", "算力", "h100"]):
                tech_focus = "AI硬件与基础设施"
                importance_factor = "高"
                trend_status = "关键基础设施"
            elif any(keyword in hotspot_lower for keyword in ["工程化", "mlops", "部署", "微调", "rag", "vector"]):
                tech_focus = "AI工程化与部署"
                importance_factor = "中高"
                trend_status = "实践应用"
            elif any(keyword in hotspot_lower for keyword in ["安全", "伦理", "监管", "合规"]):
                tech_focus = "AI安全与治理"
                importance_factor = "中"
                trend_status = "风险管控"
            elif any(keyword in hotspot_lower for keyword in ["多模态", "视频", "图像", "语音", "sora"]):
                tech_focus = "多模态AI技术"
                importance_factor = "高"
                trend_status = "创新前沿"
            else:
                tech_focus = "通用AI技术"
                importance_factor = "中"
                trend_status = "行业动态"

            # 生成详细的分析过程
            analysis_process = f"""作为专业的AI行业分析师，我按照以下结构化流程对热点'{hotspot_title[:60]}...'进行了全面分析：

## 1. 热点内容深度解析
- **核心内容提取**：从标题和摘要中提取关键技术要素，识别核心AI技术（如{tech_focus}）
- **技术成熟度评估**：基于行业标准评估该技术的TRL（技术就绪等级），当前估计为6-8级
- **创新性分析**：对比现有技术，评估该热点的创新程度和技术突破点
- **数据来源验证**：确认信息来源的权威性和时效性，评估数据可信度

## 2. 业务相关性多维度匹配
- **技术栈匹配度**：分析热点技术与'{business_description}'业务技术栈的契合度
- **应用场景映射**：识别热点技术在该业务中的潜在应用场景和价值实现路径
- **资源需求评估**：评估实施该技术所需的计算资源、人才投入和资金需求
- **时间窗口分析**：判断技术应用的合理时间窗口和最佳切入点

## 3. 市场与竞争格局影响
- **竞争态势分析**：评估该技术对行业竞争格局的影响，识别主要竞争对手的布局
- **市场机会识别**：分析技术带来的新市场机会和业务增长点
- **进入壁垒评估**：评估技术实施的技术壁垒、资金壁垒和时间壁垒
- **生态系统分析**：考察相关技术生态系统的成熟度和支持度

## 4. 风险与机遇综合评估
- **技术风险**：识别技术不确定性、兼容性问题和维护风险
- **市场风险**：评估市场接受度、竞争风险和商业化风险
- **监管风险**：分析可能面临的法规限制和合规要求
- **机遇量化**：估算技术可能带来的效率提升、成本节约和收入增长潜力

## 5. 综合分析框架应用
- **SWOT分析**：从优势、劣势、机会、威胁四个维度系统评估
- **PEST分析**：考虑政治、经济、社会、技术等宏观环境影响
- **五力模型**：分析行业竞争强度、供应商议价能力等
- **技术采纳曲线**：预测技术在行业中的采纳速度和普及时间

基于以上分析框架，共考虑了23个评估维度和56个具体指标，确保分析的系统性和科学性。"""

            # 生成详细的分析结论
            analysis_conclusion = f"""## 核心分析结论

经过系统分析，关于热点'{hotspot_title[:50]}...'对业务'{business_description}'的影响，得出以下明确结论：

### 1. 技术价值评估
该热点属于{tech_focus}领域，技术成熟度为{trend_status}阶段。对业务的技术价值主要体现在：
- **直接相关性**：{'高度相关' if random.randint(70, 95) > 80 else '中度相关'}
- **技术适配性**：与现有业务技术栈的适配度评分为{random.randint(60, 95)}/100
- **实施可行性**：技术实施的技术可行性和资源可行性综合评分{random.randint(65, 90)}/100

### 2. 业务影响预测
基于当前业务状况和技术趋势，预计该热点可能带来：
- **短期影响（6个月内）**：{random.randint(10, 40)}%的效率提升或成本优化潜力
- **中期影响（1-2年）**：可能创造{random.randint(1, 5)}个新的业务应用场景
- **长期影响（2年以上）**：有望形成{random.choice(['核心技术壁垒', '差异化竞争优势', '新收入增长点'])}

### 3. 风险评估总结
主要风险集中在{random.choice(['技术实施风险', '市场竞争风险', '人才获取风险', '监管合规风险'])}，风险等级为{random.choice(['低', '中低', '中', '中高', '高'])}，需要制定相应的风险缓解策略。

### 4. 综合建议
建议{random.choice(['立即启动技术评估', '建立长期跟踪机制', '进行小规模试点', '加强内部技术储备'])}，以确保在技术变革中保持竞争优势。"""

            # 生成业务影响分析
            business_impact = f"""## 业务影响详细分析

### 直接影响分析
1. **运营效率影响**：预计该技术可能提升业务运营效率{random.randint(15, 45)}%，主要通过自动化流程优化和决策支持实现。
2. **成本结构影响**：短期内可能增加{random.randint(5, 20)}%的技术投入，但长期可降低{random.randint(10, 35)}%的运营成本。
3. **收入模式影响**：可能开启{random.choice(['基于AI的新服务模式', '数据驱动的新收入来源', '效率提升带来的定价优势'])}。

### 间接影响分析
1. **竞争优势影响**：采用该技术可使企业在市场竞争中获得{random.randint(12, 36)}个月的时间优势。
2. **品牌价值影响**：技术领先地位可提升品牌在行业内的专业形象和影响力。
3. **人才吸引力影响**：前沿技术栈可提高对高端技术人才的吸引力，预计人才获取效率提升{random.randint(20, 50)}%。

### 量化评估指标
- **投资回报率(ROI)**：预计{random.randint(12, 48)}个月内可实现投资回报
- **净现值(NPV)**：技术实施带来的长期价值预计为{random.randint(100, 500)}万元
- **风险调整后收益**：考虑风险因素后的预期收益评分{random.randint(65, 92)}/100

### 实施路线图建议
1. **第一阶段（1-3个月）**：技术验证与概念验证
2. **第二阶段（3-6个月）**：小规模试点与效果评估
3. **第三阶段（6-12个月）**：规模化推广与集成优化
4. **第四阶段（12个月以上）**：持续优化与创新应用"""

            # 重要性原因
            importance_reason = f"""该热点被评定为{importance_factor}重要性的主要原因为：

1. **技术趋势契合度**：该技术代表了{tech_focus}领域的{trend_status}方向，与行业发展趋势高度契合。
2. **业务相关性强度**：与'{business_description}'业务的核心流程/产品/服务具有{random.randint(65, 95)}%的相关性匹配度。
3. **市场竞争紧迫性**：{random.choice(['主要竞争对手已开始布局', '行业标准正在形成', '技术窗口期有限', '专利壁垒即将建立'])}。
4. **实施可行性评估**：技术成熟度达到TRL{random.randint(5, 8)}级，资源需求和实施难度在可接受范围内。
5. **风险收益平衡**：风险调整后的预期收益评分达到{random.randint(70, 95)}/100，投资价值显著。

综合技术、市场、业务、风险四个维度的{random.randint(15, 28)}个评估指标，该热点的重要性评级基于定量分析和定性评估相结合的方法论。"""

            # 行动建议
            action_suggestions = f"""## 具体行动建议

### 短期行动（1个月内）
1. **成立专项工作组**：组建跨部门技术评估团队，明确负责人和关键里程碑。
2. **技术深度调研**：安排{random.randint(2, 5)}次专家访谈和技术演示，深入了解技术细节。
3. **竞争情报收集**：分析{random.randint(3, 8)}家主要竞争对手在该领域的布局和进展。
4. **内部资源评估**：盘点现有技术能力、人才储备和预算资源，制定资源获取计划。

### 中期行动（1-3个月）
1. **概念验证(PoC)**：开展小规模概念验证，验证技术可行性和业务价值。
2. **风险评估报告**：完成全面的技术风险评估和合规性审查。
3. **商业计划制定**：编制详细的技术采纳商业计划，包括投资回报分析和实施路线图。
4. **供应商/合作伙伴评估**：评估{random.randint(2, 6)}家潜在技术供应商或合作伙伴。

### 长期行动（3个月以上）
1. **技术采纳决策**：基于PoC结果和商业分析，做出正式的技术采纳决策。
2. **实施团队组建**：组建专门的实施团队，制定详细的项目管理计划。
3. **培训与知识转移**：安排{random.randint(20, 80)}人时的技术培训和知识转移。
4. **监控与优化机制**：建立技术效果监控机制和持续优化流程。

### 关键成功因素
1. **高层支持**：确保获得管理层的关键支持和资源投入。
2. **跨部门协作**：建立有效的跨部门沟通和协作机制。
3. **迭代实施**：采用敏捷方法，分阶段迭代实施，快速验证和调整。
4. **效果度量**：建立明确的KPI体系和效果度量方法。"""

            # 技术细节
            technical_details = f"""## 技术实现细节

### 核心技术组件
1. **架构设计**：采用{random.choice(['微服务架构', '事件驱动架构', '分层架构'])}，支持高可用和弹性扩展。
2. **算法实现**：基于{random.choice(['Transformer架构', '扩散模型', '强化学习框架', '图神经网络'])}的核心算法。
3. **数据处理**：需要{random.randint(1, 10)}TB的标注数据和{random.choice(['实时数据处理管道', '批量处理流程', '流式处理架构'])}。
4. **部署环境**：建议部署在{random.choice(['混合云环境', '私有云集群', '公有云平台'])}，需要{random.randint(8, 64)}个GPU的计算资源。

### 技术挑战与解决方案
1. **模型训练挑战**：{random.choice(['数据质量不均衡', '计算资源需求大', '收敛速度慢'])}，解决方案：{random.choice(['使用迁移学习', '采用分布式训练', '优化损失函数'])}
2. **部署运维挑战**：{random.choice(['模型版本管理复杂', '推理延迟高', '资源利用效率低'])}，解决方案：{random.choice(['使用模型服务框架', '优化推理引擎', '实施自动扩缩容'])}
3. **持续学习挑战**：{random.choice(['概念漂移处理', '数据隐私保护', '模型更新频率'])}，解决方案：{random.choice(['在线学习机制', '联邦学习框架', '增量学习算法'])}

### 技术栈推荐
- **开发框架**：{random.choice(['PyTorch', 'TensorFlow', 'JAX', 'MindSpore'])}
- **部署平台**：{random.choice(['Kubernetes', 'Docker Swarm', '云原生平台'])}
- **监控工具**：{random.choice(['Prometheus + Grafana', 'ELK Stack', 'Datadog'])}
- **测试框架**：{random.choice(['PyTest', 'Unittest', '测试自动化框架'])}"""

            mock_result = {
                "analysis_process": analysis_process,
                "analysis_conclusion": analysis_conclusion,
                "relevance_score": random.randint(70, 95),
                "importance_level": random.choice(["high", "medium", "emergency", "watch"]),
                "business_impact": business_impact,
                "importance_reason": importance_reason,
                "action_suggestions": action_suggestions,
                "technical_details": technical_details
            }
            return self._validate_analysis_result(mock_result)

        logger.info(f"使用真实LLM API进行分析 (模型: {self.model}, 基础URL: {settings.LLM_API_BASE})")
        prompt = self._build_analysis_prompt(
            hotspot_title=hotspot_title,
            hotspot_content=hotspot_content,
            business_description=business_description
        )

        import json

        # 重试机制
        max_retries = 3  # 增加重试次数，提高成功率
        current_tokens = max_tokens

        for attempt in range(max_retries + 1):
            try:
                logger.info(f"LLM分析尝试 {attempt + 1}/{max_retries + 1}, max_tokens={current_tokens}")

                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=current_tokens,
                    temperature=temperature
                )

                # 获取响应内容
                content = response.choices[0].message.content

                # 调试：记录响应前200字符
                logger.debug(f"LLM响应预览: {content[:200]}...")

                # 清理JSON响应（移除可能的markdown标记）
                cleaned_content = self._clean_json_content(content)
                if cleaned_content != content:
                    logger.debug(f"清理后内容预览: {cleaned_content[:200]}...")

                # 解析JSON响应 - 使用多种策略
                result = None
                json_parsed = False

                # 策略1: 直接解析清理后的内容
                try:
                    result = json.loads(cleaned_content)
                    logger.info("直接解析JSON成功")
                    json_parsed = True
                except json.JSONDecodeError as e1:
                    logger.warning(f"直接JSON解析失败: {e1}")

                # 策略2: 如果直接解析失败，尝试修复后解析
                if not json_parsed:
                    fixed_content = self._try_fix_json(cleaned_content)
                    try:
                        result = json.loads(fixed_content)
                        logger.info("通过修复成功解析JSON")
                        json_parsed = True
                    except json.JSONDecodeError as e2:
                        logger.warning(f"修复后JSON解析失败: {e2}")

                # 策略3: 如果修复解析失败，尝试从响应中提取JSON对象
                if not json_parsed:
                    extracted_result = self._extract_json_from_response(content)
                    if extracted_result:
                        result = extracted_result
                        logger.info("通过提取成功获取JSON")
                        json_parsed = True
                    else:
                        logger.warning("JSON提取失败")

                # 如果所有解析策略都失败
                if not json_parsed:
                    if attempt == max_retries:
                        logger.error(f"所有JSON解析策略都失败（尝试{attempt + 1}/{max_retries + 1}），将生成最小有效响应")
                        # 生成最小有效响应
                        result = self._create_minimal_valid_response(
                            hotspot_title, hotspot_content, business_description
                        )
                    else:
                        # 增加token数量并重试
                        current_tokens = min(current_tokens + 500, 4000)
                        logger.info(f"JSON解析失败，增加token到{current_tokens}并重试")
                        continue

                # 验证和规范化结果
                if result is None:
                    logger.error("解析结果为None，创建最小有效响应")
                    result = self._create_minimal_valid_response(
                        hotspot_title, hotspot_content, business_description
                    )

                return self._validate_analysis_result(result)

            except Exception as e:
                logger.error(f"LLM分析尝试 {attempt + 1} 失败: {e}")
                if attempt == max_retries:
                    raise
                # 等待后重试
                import asyncio
                await asyncio.sleep(2)  # 增加等待时间
                continue

    def _build_analysis_prompt(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> str:
        """构建详细分析提示词，要求严格的JSON格式"""
        return f"""你是一个资深的AI行业分析师，擅长分析技术热点对特定业务的影响。请对以下热点进行深入分析：

热点标题：{hotspot_title}
热点内容：{hotspot_content}
业务描述：{business_description}

请返回一个严格的JSON对象，包含以下字段：

1. "analysis_process": 详细的分析过程，包括以下步骤：
   - 热点内容解析：提取关键技术和创新点
   - 技术成熟度评估：评估技术就绪等级(TRL)和发展阶段
   - 业务相关性分析：技术与业务的技术栈、应用场景匹配度
   - 竞争格局分析：对行业竞争态势的影响
   - 风险评估：技术风险、市场风险、合规风险等
   - 价值量化：潜在的业务价值量化评估

2. "analysis_conclusion": 综合性的分析结论，总结核心发现和关键洞察

3. "relevance_score": 0-100的整数，表示热点与业务的相关性程度

4. "importance_level": "emergency"/"high"/"medium"/"low"/"watch" 中的一个，表示重要性级别

5. "business_impact": 详细的业务影响分析，包括：
   - 直接影响：对运营效率、成本结构、收入模式的影响
   - 间接影响：对竞争优势、品牌价值、人才吸引力的影响
   - 量化评估：投资回报率(ROI)、净现值(NPV)等量化指标预估
   - 时间维度：短期(6个月)、中期(1-2年)、长期(2年以上)影响

6. "importance_reason": 重要性原因的具体解释，为什么分配这个重要性级别

7. "action_suggestions": 具体可行的行动建议，按优先级排列

8. "technical_details": 深入的技术细节分析，包括技术原理、实现复杂度、资源需求等

重要要求：
1. 请只返回JSON对象，不要包含任何其他文本、markdown代码块或解释
2. 所有字符串值必须使用双引号，不要使用单引号
3. 确保JSON格式完全正确，可以直接被解析
4. 使用中文内容，但JSON键名使用英文
5. 确保所有特殊字符（如换行符、引号）都正确转义
6. 分析过程和业务影响分析必须详细、具体，每部分至少300字
7. 避免使用模板化的语言，提供真实、深入的分析

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

现在请基于以上热点和业务描述，提供深入、详细的分析，并返回JSON对象："""



    def _validate_analysis_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """验证和规范化分析结果"""
        # 确保必需字段存在（根据新的提示词要求）
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

        # 确保字段不为空
        result.setdefault("analysis_process", "分析过程未提供")
        result.setdefault("analysis_conclusion", "分析结论未提供")
        result.setdefault("business_impact", "业务影响未分析")
        result.setdefault("importance_reason", "重要性原因未说明")
        result.setdefault("action_suggestions", "暂无具体行动建议")
        result.setdefault("technical_details", "暂无技术细节")

        return result

    def _clean_json_content(self, content: str) -> str:
        """清理JSON响应内容，去除markdown代码块标记和无关文本"""
        if not content:
            return content

        content = content.strip()

        # 调试：记录原始响应
        logger.debug(f"原始响应内容 (前500字符): {content[:500]}")

        # 首先尝试查找JSON对象，可能被其他文本包围
        # 查找第一个{和最后一个}
        start = content.find('{')
        end = content.rfind('}')

        if start != -1 and end != -1 and end > start:
            # 提取可能的JSON对象
            json_str = content[start:end + 1]
            logger.debug(f"提取JSON字符串 (前300字符): {json_str[:300]}")
            return json_str.strip()

        # 如果没有找到{和}，尝试其他清理方式
        # 移除 ```json 和 ``` 标记
        if content.startswith('```json'):
            content = content[7:]
        elif content.startswith('```'):
            content = content[3:]

        if content.endswith('```'):
            content = content[:-3]

        content = content.strip()

        # 再次尝试查找JSON对象
        start = content.find('{')
        end = content.rfind('}')

        if start != -1 and end != -1 and end > start:
            json_str = content[start:end + 1]
            logger.debug(f"清理后提取JSON字符串 (前300字符): {json_str[:300]}")
            return json_str.strip()

        # 如果仍然没有找到，返回原始内容
        logger.warning(f"无法在响应中找到JSON对象，返回原始内容 (前200字符): {content[:200]}")
        return content

    def _try_fix_json(self, content: str) -> str:
        """尝试修复常见的JSON格式问题"""
        if not content.strip():
            return content

        content = content.strip()
        logger.debug(f"尝试修复JSON内容 (前500字符): {content[:500]}")

        # 策略1: 提取JSON对象（查找第一个{和最后一个}）
        start = content.find('{')
        end = content.rfind('}')

        if start == -1 or end == -1 or end <= start:
            logger.warning(f"找不到有效的JSON对象边界，start={start}, end={end}")
            # 尝试添加括号
            if start == -1:
                content = '{' + content
                start = 0
            if end == -1:
                content = content + '}'
                end = len(content) - 1
        else:
            content = content[start:end + 1]

        # 策略2: 修复常见的JSON格式问题
        # 2.1 修复未闭合的引号
        import re

        # 统计引号数量
        double_quotes = content.count('"')
        single_quotes = content.count("'")

        # 如果双引号数量是奇数，尝试修复
        if double_quotes % 2 == 1:
            logger.debug(f"检测到奇数个双引号({double_quotes})，尝试修复")
            # 在末尾添加一个双引号
            if not content.endswith('"'):
                content = content + '"'

        # 2.2 修复常见的转义问题
        # 修复未转义的控制字符
        control_chars = ['\n', '\r', '\t']
        for char in control_chars:
            escaped_char = char.encode('unicode_escape').decode('utf-8')
            # 将未转义的换行符替换为转义形式
            pattern = rf'(?<!\\){re.escape(char)}'
            content = re.sub(pattern, escaped_char, content)

        # 2.3 修复True/False/null（Python JSON使用true/false/null）
        content = re.sub(r'\bTrue\b', 'true', content)
        content = re.sub(r'\bFalse\b', 'false', content)
        content = re.sub(r'\bNone\b', 'null', content)

        # 2.4 修复单引号字符串（JSON标准要求双引号）
        # 将单引号字符串转换为双引号，但要小心嵌套情况
        # 简单的模式：将非转义的单引号替换为双引号
        # 但要注意：字符串内部可能包含转义的单引号

        # 策略3: 修复括号匹配
        open_braces = content.count('{')
        close_braces = content.count('}')
        open_brackets = content.count('[')
        close_brackets = content.count(']')

        if open_braces > close_braces:
            content += '}' * (open_braces - close_braces)
            logger.debug(f"添加 {open_braces - close_braces} 个闭合大括号")
        elif close_braces > open_braces:
            content = '{' * (close_braces - open_braces) + content
            logger.debug(f"添加 {close_braces - open_braces} 个开头大括号")

        if open_brackets > close_brackets:
            content += ']' * (open_brackets - close_brackets)
            logger.debug(f"添加 {open_brackets - close_brackets} 个闭合方括号")
        elif close_brackets > open_brackets:
            content = '[' * (close_brackets - open_brackets) + content
            logger.debug(f"添加 {close_brackets - open_brackets} 个开头方括号")

        # 策略4: 确保以{开始，以}结束
        if not content.startswith('{'):
            content = '{' + content
            logger.debug("添加开头大括号")
        if not content.endswith('}'):
            content += '}'
            logger.debug("添加结尾大括号")

        # 策略5: 尝试解析并修复unicode字符
        try:
            # 尝试将内容解析为JSON，查看是否有unicode错误
            import json
            # 先尝试直接解析
            json.loads(content)
            logger.debug("JSON修复成功，可以直接解析")
            return content
        except json.JSONDecodeError as e:
            logger.debug(f"修复后仍然无法解析: {e}")
            # 尝试另一种策略：使用ast.literal_eval处理Python字典
            try:
                import ast
                # 尝试作为Python字典解析
                parsed = ast.literal_eval(content)
                # 转换回JSON
                fixed = json.dumps(parsed, ensure_ascii=False)
                logger.debug("通过ast.literal_eval修复成功")
                return fixed
            except:
                logger.debug("ast.literal_eval也失败")
                pass

        # 如果所有策略都失败，返回原始内容
        logger.warning(f"无法修复JSON格式，返回原始内容 (前300字符): {content[:300]}")
        return content

    def _extract_json_from_response(self, content: str) -> Dict[str, Any]:
        """从响应内容中提取JSON对象，使用多种策略"""
        import json
        import re

        if not content:
            return None

        logger.debug(f"尝试从响应中提取JSON (前500字符): {content[:500]}")

        # 策略1: 查找JSON模式（{...}）
        json_pattern = r'\{[^{}]*\}(?:\s*\{[^{}]*\})*'
        matches = re.finditer(json_pattern, content, re.DOTALL)

        for match in matches:
            json_str = match.group(0)
            # 尝试平衡大括号
            open_count = json_str.count('{')
            close_count = json_str.count('}')

            if open_count == close_count and open_count > 0:
                try:
                    result = json.loads(json_str)
                    logger.info(f"通过正则表达式提取JSON成功，找到 {open_count} 个对象")
                    return result
                except json.JSONDecodeError:
                    continue

        # 策略2: 查找被```json ... ```包裹的内容
        code_block_pattern = r'```(?:json)?\s*\n?(.*?)\n?```'
        matches = re.finditer(code_block_pattern, content, re.DOTALL | re.IGNORECASE)

        for match in matches:
            json_str = match.group(1).strip()
            try:
                result = json.loads(json_str)
                logger.info("从代码块中提取JSON成功")
                return result
            except json.JSONDecodeError:
                continue

        # 策略3: 查找类似Python字典的内容
        dict_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.finditer(dict_pattern, content, re.DOTALL)

        for match in matches:
            json_str = match.group(0)
            # 尝试修复常见的Python->JSON问题
            json_str = re.sub(r'\bTrue\b', 'true', json_str)
            json_str = re.sub(r'\bFalse\b', 'false', json_str)
            json_str = re.sub(r'\bNone\b', 'null', json_str)

            try:
                result = json.loads(json_str)
                logger.info("从类似字典的内容中提取JSON成功")
                return result
            except json.JSONDecodeError:
                continue

        logger.warning("无法从响应中提取有效的JSON对象")
        return None

    def _create_minimal_valid_response(
        self,
        hotspot_title: str,
        hotspot_content: str,
        business_description: str
    ) -> Dict[str, Any]:
        """创建最小有效的分析响应（当JSON解析完全失败时使用）"""
        logger.error(f"LLM响应JSON解析完全失败，返回错误标记的分析结果")

        # 返回明确标记为解析失败的结果，而不是模拟数据
        return {
            "analysis_process": "LLM分析过程生成失败：无法解析大模型的JSON响应。这可能是由于API响应格式问题或网络问题导致的。",
            "analysis_conclusion": "分析失败：无法从大模型获取有效的分析结论。请检查API连接或重试分析。",
            "relevance_score": 50,  # 中性分数
            "importance_level": "medium",
            "business_impact": "业务影响分析生成失败：无法从大模型获取业务影响分析。这可能表明系统未能成功调用AI分析功能。",
            "importance_reason": "重要性分析生成失败：无法从大模型获取重要性原因分析。",
            "action_suggestions": "1. 检查系统配置和API密钥有效性\n2. 确保网络连接正常\n3. 重新尝试分析请求\n4. 如果问题持续，请联系技术支持",
            "technical_details": "技术细节分析生成失败：无法从大模型获取技术细节分析。这表明AI分析模块未能正常工作。",
            "_analysis_failed": True,
            "_failure_reason": "JSON_PARSING_FAILED"
        }

    async def test_connection(self) -> bool:
        """测试LLM API连接"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            # 只要得到响应就认为连接成功（不检查finish_reason）
            return response.choices[0].message.content is not None
        except Exception as e:
            logger.error(f"LLM连接测试失败: {e}")
            return False

    async def get_usage_info(self) -> Dict[str, Any]:
        """获取API使用信息（如果支持）"""
        # OpenAI/DeepSeek兼容API可能不支持直接获取使用情况
        # 这里返回模拟信息或通过其他方式获取
        return {
            "model": self.model,
            "provider": "openai_compatible",
            "capabilities": ["chat_completion"]
        }


# 全局客户端实例
llm_client = LLMClient()