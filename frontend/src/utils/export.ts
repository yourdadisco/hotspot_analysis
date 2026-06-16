/**
 * 导出工具函数
 */

export function exportAsMarkdown(hotspot: any, analysis: any): string {
  const lines: string[] = []
  lines.push(`# ${hotspot.title}`)
  lines.push('')
  lines.push(`- **来源**: ${hotspot.source_name || hotspot.source_type || '未知'}`)
  lines.push(`- **发布日期**: ${hotspot.publish_date ? new Date(hotspot.publish_date).toLocaleDateString('zh-CN') : '未知'}`)
  lines.push(`- **相关度**: ${analysis?.relevance_score ?? 'N/A'}%`)
  lines.push(`- **重要性**: ${analysis?.importance_level ?? '未分析'}`)
  lines.push('')

  if (analysis?.business_impact) {
    lines.push('## 业务影响')
    lines.push('')
    lines.push(analysis.business_impact)
    lines.push('')
  }

  if (analysis?.importance_reason) {
    lines.push('## 重要性分析')
    lines.push('')
    lines.push(analysis.importance_reason)
    lines.push('')
  }

  if (analysis?.action_suggestions) {
    lines.push('## 行动建议')
    lines.push('')
    lines.push(analysis.action_suggestions)
    lines.push('')
  }

  if (analysis?.analysis_metadata?.content_summary) {
    lines.push('## 内容摘要')
    lines.push('')
    lines.push(analysis.analysis_metadata.content_summary)
    lines.push('')
  }

  if (analysis?.analysis_metadata?.analysis_conclusion) {
    lines.push('## 分析结论')
    lines.push('')
    lines.push(analysis.analysis_metadata.analysis_conclusion)
    lines.push('')
  }

  if (hotspot.content_url) {
    lines.push('---')
    lines.push(`原文链接: ${hotspot.content_url}`)
  }

  return lines.join('\n')
}

export function exportAsJson(hotspot: any, analysis: any): string {
  return JSON.stringify({ hotspot, analysis, exportedAt: new Date().toISOString() }, null, 2)
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
