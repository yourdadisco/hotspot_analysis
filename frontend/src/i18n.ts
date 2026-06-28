/**
 * i18n — 国际化支持
 * 使用: t('key') 获取当前语言文案
 */

type Lang = 'zh' | 'en'
type Messages = Record<string, string>

const zh: Messages = {
  'app.name': 'AI热点解析助手',
  'app.tagline': '智能追踪AI行业动态',
  'nav.dashboard': '热点看板',
  'nav.favorites': '我的收藏',
  'nav.business': '业务配置',
  'nav.model': '模型配置',
  'nav.api': 'API 用量',
  'nav.settings': '设置',
  'nav.tutorial': '使用教程',
  'stats.today': '今日概览',
  'stats.new': '新热点',
  'stats.pending': '待分析',
  'stats.emergency': '紧急',
  'stats.importance': '重要性分布',
  'btn.search': '搜索',
  'btn.quick': '一键更新解析热点',
  'btn.update': '手动更新',
  'btn.batch': '批量分析',
  'btn.filter': '高级筛选',
  'btn.lang': 'EN',
  'search.placeholder': '搜索热点...',
  'hotlist.title': '最新热点',
  'hotlist.sort': '排序',
  'hotlist.sort_newest': '最新发布',
  'hotlist.sort_relevance': '相关度最高',
  'hotlist.sort_importance': '重要度最高',
  'hotlist.unanalyzed': '未分析',
  'hotlist.analyze': 'AI分析',
  'hotlist.restore': '恢复',
  'hotlist.relevance': '相关度',
  'hotlist.prompt': '一键更新解析',
  'empty.title': '暂无热点数据',
  'empty.filter': '当前有筛选条件',
  'empty.refresh': '刷新',
  'empty.update': '手动更新',
  'pagination.total': '共',
  'pagination.items': '个热点',
  'pagination.jump': '跳至',
  'lang.title': '切换语言',
  'lang.confirm': '是否切换至 English？界面文字将切换为英文。',
  'lang.cancel': '取消',
  'lang.confirm_btn': '切换',
  'user.logout': '退出登录',
}

const en: Messages = {
  'app.name': 'AI Hotspot Analyzer',
  'app.tagline': 'AI-powered tech trend tracking',
  'nav.dashboard': 'Dashboard',
  'nav.favorites': 'Favorites',
  'nav.business': 'Business',
  'nav.model': 'Model',
  'nav.api': 'API Usage',
  'nav.settings': 'Settings',
  'nav.tutorial': 'Tutorial',
  'stats.today': 'Today',
  'stats.new': 'New',
  'stats.pending': 'Pending',
  'stats.emergency': 'Urgent',
  'stats.importance': 'Importance',
  'btn.search': 'Search',
  'btn.quick': '⚡ Quick Analysis',
  'btn.update': 'Update',
  'btn.batch': 'Batch',
  'btn.filter': 'Filters',
  'btn.lang': '中文',
  'search.placeholder': 'Search hotspots...',
  'hotlist.title': 'Latest Hotspots',
  'hotlist.sort': 'Sort',
  'hotlist.sort_newest': 'Newest',
  'hotlist.sort_relevance': 'Relevance',
  'hotlist.sort_importance': 'Importance',
  'hotlist.unanalyzed': 'Unanalyzed',
  'hotlist.analyze': 'Analyze',
  'hotlist.restore': 'Restore',
  'hotlist.relevance': 'Relevance',
  'hotlist.prompt': 'Quick Analysis',
  'empty.title': 'No hotspots yet',
  'empty.filter': 'Filters are active',
  'empty.refresh': 'Refresh',
  'empty.update': 'Update',
  'pagination.total': 'Total',
  'pagination.items': 'items',
  'pagination.jump': 'Go to',
  'lang.title': 'Switch Language',
  'lang.confirm': 'Switch to 中文？All text will be in Chinese.',
  'lang.cancel': 'Cancel',
  'lang.confirm_btn': 'Switch',
  'user.logout': 'Logout',
}

let current: Lang = 'zh'

export function getLang(): Lang {
  if (typeof window !== 'undefined') {
    const s = localStorage.getItem('app_lang') as Lang | null
    if (s === 'en' || s === 'zh') return s
  }
  return 'zh'
}

export function setLang(lang: Lang) {
  current = lang
  try { localStorage.setItem('app_lang', lang) } catch {}
}

export function t(key: string): string {
  const m = current === 'en' ? en : zh
  return m[key] || zh[key] || key
}

// 初始化
current = getLang()
