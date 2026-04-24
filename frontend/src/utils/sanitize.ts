/**
 * HTML净化工具
 * 提供安全的HTML渲染功能，防止XSS攻击
 */

/**
 * 将HTML内容转换为可读的纯文本
 * 处理HTML实体、换行、段落等
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  // 块级标签和换行标签替换为换行符（在移除标签前处理）
  let text = html
    // 常见的块级结束标签前加换行
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|table|dl|ol|ul)>/gi, '\n')
    // 换行标签替换为换行符
    .replace(/<br\s*\/?>/gi, '\n')
    // 列表项前加换行
    .replace(/<li[^>]*>/gi, '\n')
    // 段落前加换行
    .replace(/<(p|div|h[1-6]|blockquote)[^>]*>/gi, '\n');

  // 解码常见HTML实体
  text = decodeHtmlEntities(text);

  // 移除所有剩余HTML标签
  text = text.replace(/<[^>]*>/g, '');

  // 规范化换行：多个连续换行合并为最多两个
  text = text.replace(/\n{3,}/g, '\n\n');

  // 去除每行首尾空格，但保留行间空行
  text = text.split('\n').map(line => line.trim()).join('\n');

  // 去除首尾空白
  return text.trim();
}

/**
 * 解码HTML实体
 */
function decodeHtmlEntities(text: string): string {
  const entityMap: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&middot;': '·',
    '&bull;': '•',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&nbsp;': ' ',
    '&laquo;': '«',
    '&raquo;': '»',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&deg;': '°',
    '&plusmn;': '±',
    '&times;': '×',
    '&divide;': '÷',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entityMap)) {
    result = result.split(entity).join(char);
  }

  // 处理数字实体 &#xxx;
  result = result.replace(/&#(\d+);/g, (_: string, code: string) => {
    return String.fromCharCode(parseInt(code, 10));
  });

  return result;
}

/**
 * 简单的HTML标签净化函数（向后兼容）
 * 移除所有HTML标签，只保留文本内容
 */
export function stripHtmlTags(html: string): string {
  return htmlToText(html);
}

/**
 * 安全地渲染HTML内容
 * 只允许安全的标签和属性
 */
export function createSafeHtml(html: string): string {
  if (!html) return '';

  // 简化处理：移除脚本和其他危险标签
  let safeHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  // 对于生产环境，建议使用DOMPurify库
  return safeHtml;
}

/**
 * 检查字符串是否包含HTML标签
 */
export function containsHtmlTags(text: string): boolean {
  if (!text) return false;
  return /<[^>]+>/i.test(text);
}

/**
 * 安全地渲染摘要内容
 * 如果包含HTML，则进行清理；否则直接返回
 */
export function renderSafeSummary(summary: string): string {
  if (!summary) return '';

  if (containsHtmlTags(summary)) {
    // 对于摘要，通常应该只显示纯文本
    return stripHtmlTags(summary);
  }

  return summary;
}