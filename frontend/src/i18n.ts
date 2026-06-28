/**
 * 简易 i18n — 只覆盖界面文案，数据内容不受影响
 */
const messages: Record<string, Record<string, string>> = {
  zh: {
    'app.name': 'AI热点解析助手',
    'app.tagline': '智能追踪AI行业动态',
    'nav.dashboard': '热点看板',
    'nav.favorites': '我的收藏',
    'nav.business': '业务配置',
    'nav.model': '模型配置',
    'nav.api': 'API 用量',
    'nav.settings': '设置',
    'stats.today': '新热点',
    'stats.pending': '待分析',
    'stats.emergency': '紧急',
    'btn.quick': '一键更新解析热点',
    'btn.update': '手动更新',
    'btn.batch': '批量分析',
    'btn.filter': '高级筛选',
    'search.placeholder': '搜索热点...',
    'empty.title': '暂无热点数据',
    'empty.filter': '当前有筛选条件',
    'empty.refresh': '刷新',
    'hotlist.title': '最新热点',
    'hotlist.sort_newest': '最新发布',
    'hotlist.sort_relevance': '相关度最高',
    'hotlist.sort_importance': '重要度最高',
    'hotlist.unanalyzed': '未分析',
    'hotlist.analyze': 'AI分析',
    'hotlist.quick_update': '一键更新解析',
    'hotlist.restore': '恢复',
    'hotlist.relevance': '相关度',
    'lang.switch_to_en': 'Switch to English / 切换至国际版',
    'lang.switch_to_zh': '切换至中文版',
    'lang.warning': '切换语言将同时切换信息源为海外AI媒体(TechCrunch/MIT/Ars等)，是否继续？',
    'pagination.total': '共',
    'pagination.items': '个热点',
    'pagination.jump': '跳至',
  },
  en: {
    'app.name': 'AI Hotspot Analyzer',
    'app.tagline': 'AI-powered tech trend tracking',
    'nav.dashboard': 'Dashboard',
    'nav.favorites': 'Favorites',
    'nav.business': 'Business Config',
    'nav.model': 'Model Config',
    'nav.api': 'API Usage',
    'nav.settings': 'Settings',
    'stats.today': 'Today',
    'stats.pending': 'Pending',
    'stats.emergency': 'Emergency',
    'btn.quick': '⚡ Quick Analysis',
    'btn.update': 'Manual Update',
    'btn.batch': 'Batch Analysis',
    'btn.filter': 'Filters',
    'search.placeholder': 'Search hotspots...',
    'empty.title': 'No hotspots yet',
    'empty.filter': 'Filters are active',
    'empty.refresh': 'Refresh',
    'hotlist.title': 'Latest Hotspots',
    'hotlist.sort_newest': 'Newest',
    'hotlist.sort_relevance': 'Relevance',
    'hotlist.sort_importance': 'Importance',
    'hotlist.unanalyzed': 'Unanalyzed',
    'hotlist.analyze': 'Analyze',
    'hotlist.quick_update': 'Quick Analysis',
    'hotlist.restore': 'Restore',
    'hotlist.relevance': 'Relevance',
    'lang.switch_to_en': 'Switch to English / 切换至国际版',
    'lang.switch_to_zh': '切换至中文版',
    'lang.warning': 'Switching language will also switch data sources to international AI media (TechCrunch/MIT/Ars etc). Continue?',
    'pagination.total': 'Total',
    'pagination.items': 'hotspots',
    'pagination.jump': 'Jump to',
  },
}

export type Lang = 'zh' | 'en'

let currentLang: Lang = 'zh'

export function setLang(lang: Lang) {
  currentLang = lang
  try { localStorage.setItem('app_lang', lang) } catch {}
}

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app_lang') as Lang | null
    if (saved === 'zh' || saved === 'en') return saved
  }
  return 'zh'
}

export function t(key: string): string {
  return messages[currentLang]?.[key] || messages['zh']?.[key] || key
}

// 初始化
currentLang = getLang()
