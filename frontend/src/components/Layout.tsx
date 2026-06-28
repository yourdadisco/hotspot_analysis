import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Home, Heart, Settings, Briefcase, Cpu, Bell, LogOut, User, BookOpen, BarChart3 } from 'lucide-react'
import { hotspotsApi } from '../services/api'
import UsageGuideModal from './UsageGuideModal'
import TutorialPrompt from './TutorialPrompt'
import NotificationPanel from './NotificationPanel'
import { useWebSocket } from '../hooks/useWebSocket'

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

  useEffect(() => {
    if (userId) {
      const dismissed = localStorage.getItem(`tutorial_dismissed_${userId}`)
      if (!dismissed) {
        const timer = setTimeout(() => setShowTutorialPrompt(true), 500)
        return () => clearTimeout(timer)
      }
    }
  }, [userId])

  const { data: statsData } = useQuery({
    queryKey: ['hotspots-stats'],
    queryFn: async () => {
      const response = await hotspotsApi.getStats(userId)
      return response as any
    },
    enabled: !!userId,
  })

  useWebSocket(userId || null, (data) => {
    if (data?.type === 'notification') setHasUnread(true)
  })

  useEffect(() => {
    const email = localStorage.getItem('user_email')
    if (email) setUserEmail(email)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowLogout(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token'); localStorage.removeItem('user_id')
    localStorage.removeItem('user_email'); localStorage.removeItem('user_settings')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: <Home size={18} />, label: '热点看板' },
    { path: '/favorites', icon: <Heart size={18} />, label: '我的收藏' },
    { path: '/business', icon: <Briefcase size={18} />, label: '业务配置' },
    { path: '/model-config', icon: <Cpu size={18} />, label: '模型配置' },
    { path: '/api-usage', icon: <BarChart3 size={18} />, label: 'API 用量' },
    { path: '/settings', icon: <Settings size={18} />, label: '设置' },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#08090A' }}>
      {/* 顶栏 */}
      <header className="glass-header sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(94,106,210,0.15)' }}>
              <Brain size={18} color="#5E6AD2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold" style={{ fontFamily: '"Inter Tight", Inter, sans-serif', letterSpacing: '-0.02em', color: '#F7F8F8' }}>AI热点解析</h1>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>智能分析平台</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => { setShowNotifications(!showNotifications); setHasUnread(false) }}
                className="p-2 rounded-ui hover:bg-white/5 transition-colors relative">
                <Bell size={17} style={{ color: '#6B7280' }} />
                {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: '#5E6AD2' }} />}
              </button>
              {showNotifications && <NotificationPanel userId={userId} onClose={() => setShowNotifications(false)} />}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setShowLogout(!showLogout)}
                className="flex items-center gap-2 p-1.5 rounded-ui hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(94,106,210,0.15)' }}>
                  <User size={14} color="#5E6AD2" />
                </div>
                <span className="text-sm font-medium hidden md:block truncate max-w-[100px]" style={{ color: '#9CA3AF' }}>{userEmail || '用户'}</span>
              </button>
              {showLogout && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg py-1 z-50"
                  style={{ backgroundColor: '#1E1F25', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                  <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-sm font-medium" style={{ color: '#F7F8F8' }}>{userEmail || '用户'}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors" style={{ color: '#9CA3AF' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <LogOut size={15} /> <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主体 */}
      <div className="flex px-4 sm:px-6 lg:px-8 py-6 gap-6" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* 侧栏 */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="card p-3 sticky" style={{ top: '80px' }}>
            <ul className="space-y-1">
              {navItems.map(item => (
                <li key={item.path}>
                  <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="px-4 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>今日概览</h3>
              <div className="space-y-2.5 px-4">
                {[
                  { label: '新热点', value: statsData?.today_count ?? '-', color: '#9CA3AF' },
                  { label: '待分析', value: statsData?.pending_analysis ?? '-', color: '#F97316' },
                  { label: '紧急', value: statsData?.emergency_count ?? '-', color: '#5E6AD2' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: '#6B7280' }}>{item.label}</span>
                    <span className="text-xs font-semibold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setShowTutorial(true)} className="nav-link w-full"><BookOpen size={18} /> <span>使用教程</span></button>
            </div>
          </nav>
        </aside>

        {/* 主内容 */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <UsageGuideModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
      {showTutorialPrompt && <TutorialPrompt userId={userId} onDismiss={() => setShowTutorialPrompt(false)} onOpenTutorial={() => setShowTutorial(true)} />}
    </div>
  )
}

export default Layout
