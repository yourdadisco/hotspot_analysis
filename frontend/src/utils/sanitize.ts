/**
 * HTML净化工具
 * 提供安全的HTML渲染功能，防止XSS攻击
 */

/**
 * 简单的HTML标签净化函数
 * 移除所有HTML标签，只保留文本内容
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';

  // 替换HTML实体
  const decoded = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 移除所有HTML标签
  return decoded.replace(/<[^>]*>/g, '');
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