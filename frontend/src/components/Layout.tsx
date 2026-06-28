import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Home, Heart, Settings, Briefcase, Cpu, Bell, LogOut, User, BookOpen, BarChart3 } from 'lucide-react'
import { hotspotsApi } from '../services/api'
import UsageGuideModal from './UsageGuideModal'
import TutorialPrompt from './TutorialPrompt'
import NotificationPanel from './NotificationPanel'
import { useWebSocket } from '../hooks/useWebSocket'
import { t, getLang, setLang } from '../i18n'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const [showLogout, setShowLogout] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [showTutorialPrompt, setShowTutorialPrompt] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const userId = localStorage.getItem('user_id') || ''

  // 首次登录显示使用教程引导
  useEffect(() => {
    if (userId) {
      const dismissed = localStorage.getItem(`tutorial_dismissed_${userId}`)
      if (!dismissed) {
        // 延迟显示，等页面渲染完成
        const timer = setTimeout(() => setShowTutorialPrompt(true), 500)
        return () => clearTimeout(timer)
      }
    }
  }, [userId])

  // 获取统计信息（与Dashboard共享同一个queryKey，一方刷新另一方自动更新）
  const { data: statsData } = useQuery({
    queryKey: ['hotspots-stats'],
    queryFn: async () => {
      const response = await hotspotsApi.getStats(userId)
      return response as any
    },
    enabled: !!userId,
  })

  // WebSocket 实时通知
  useWebSocket(userId || null, (data) => {
    if (data?.type === 'notification') {
      setHasUnread(true)
    }
  })

  useEffect(() => {
    const email = localStorage.getItem('user_email')
    if (email) {
      setUserEmail(email)
    }
  }, [])

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowLogout(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_settings')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: <Home size={20} />, label: '热点看板' },
    { path: '/favorites', icon: <Heart size={20} />, label: '我的收藏' },
    { path: '/business', icon: <Briefcase size={20} />, label: '您的工作' },
    { path: '/model-config', icon: <Cpu size={20} />, label: '模型配置' },
    { path: '/api-usage', icon: <BarChart3 size={20} />, label: 'API 用量' },
    { path: '/settings', icon: <Settings size={20} />, label: '设置' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 50%, #F5F3FF 100%)' }}>
      {/* 顶部导航栏 */}
      <header className="header sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">AI热点解析助手</h1>
                <p className="text-xs text-gray-500">智能追踪AI行业动态</p>
              </div>
            </div>

            {/* 语言切换 */}
            <button onClick={() => { setLang(getLang() === 'zh' ? 'en' : 'zh'); window.location.reload() }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors" style={{ color: '#64748B' }}>
              {getLang() === 'zh' ? 'EN' : '中文'}
            </button>

            {/* 用户信息 */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button onClick={() => { setShowNotifications(!showNotifications); setHasUnread(false) }} className="p-2 rounded-full hover:bg-gray-100 relative">
                  <Bell size={20} />
                  {hasUnread && <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />}
                </button>
                {showNotifications && (
                  <NotificationPanel userId={userId} onClose={() => setShowNotifications(false)} />
                )}
              </div>
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowLogout(!showLogout)}
                  className="flex items-center space-x-3 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="text-blue-600" size={16} />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">{userEmail || '用户'}</p>
                    <p className="text-xs text-gray-500">产品经理</p>
                  </div>
                </button>

                {showLogout && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                    >
                      <LogOut size={16} />
                      <span>退出登录</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边栏 */}
          <aside className="lg:w-72">
            <nav className="card p-4 sticky top-24">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'nav-link-active'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>

              {/* 统计信息 */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{t('stats.today')}</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-indigo-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{statsData?.today_count ?? '-'}</p>
                    <p className="text-[11px] text-indigo-500 font-medium mt-0.5">{t('stats.new')}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{statsData?.pending_analysis ?? '-'}</p>
                    <p className="text-[11px] text-amber-500 font-medium mt-0.5">{t('stats.pending')}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{statsData?.emergency_count ?? '-'}</p>
                    <p className="text-[11px] text-red-500 font-medium mt-0.5">{t('stats.emergency')}</p>
                  </div>
                </div>
                {statsData && (
                  <div>
                    <h4 className="text-[11px] font-medium text-gray-500 mb-2.5">{t('stats.importance')}</h4>
                    {[
                      { label: '紧急', value: statsData.emergency_count ?? 0, color: '#EF4444', bg: '#FEF2F2' },
                      { label: '高', value: statsData.high_count ?? 0, color: '#F97316', bg: '#FFF7ED' },
                      { label: '中', value: statsData.medium_count ?? 0, color: '#EAB308', bg: '#FEFCE8' },
                      { label: '低', value: statsData.low_count ?? 0, color: '#22C55E', bg: '#F0FDF4' },
                    ].map(item => {
                      const max = Math.max(statsData.emergency_count ?? 0, statsData.high_count ?? 0, statsData.medium_count ?? 0, statsData.low_count ?? 0, 1)
                      return (
                        <div key={item.label} className="flex items-center gap-2.5 mb-1.5">
                          <span className="text-xs text-gray-500 w-6 text-right">{item.label}</span>
                          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: item.bg }}>
                            <div className="h-full rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-5 text-right">{item.value}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 使用教程 — 醒目标识 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  id="tutorial-btn"
                  onClick={() => setShowTutorial(true)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors w-full font-medium border border-blue-200"
                >
                  <BookOpen size={18} />
                  <span>使用教程</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* 主内容区 */}
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2024 AI超级热点解析助手. 保留所有权利.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <span className="text-gray-400 text-sm">帮助中心</span>
              <span className="text-gray-400 text-sm">隐私政策</span>
              <span className="text-gray-400 text-sm">服务条款</span>
            </div>
          </div>
        </div>
      </footer>

      <UsageGuideModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {showTutorialPrompt && (
        <TutorialPrompt
          userId={userId}
          onDismiss={() => setShowTutorialPrompt(false)}
          onOpenTutorial={() => setShowTutorial(true)}
        />
      )}
    </div>
  )
}

export default Layout