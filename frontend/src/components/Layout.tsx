import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Home, Heart, Settings, Briefcase, Cpu, Bell, LogOut, User, BookOpen } from 'lucide-react'
import { hotspotsApi } from '../services/api'
import UsageGuideModal from './UsageGuideModal'
import TutorialPrompt from './TutorialPrompt'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const [showLogout, setShowLogout] = useState(false)
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
    refetchInterval: 60000,
  })

  useEffect(() => {
    const email = localStorage.getItem('user_email')
    if (email) setUserEmail(email)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowLogout(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_settings')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: <Home size={18} />, label: '热点看板' },
    { path: '/favorites', icon: <Heart size={18} />, label: '我的收藏' },
    { path: '/business', icon: <Briefcase size={18} />, label: '业务配置' },
    { path: '/model-config', icon: <Cpu size={18} />, label: '模型配置' },
    { path: '/settings', icon: <Settings size={18} />, label: '设置' },
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0F0F11' }}>
      {/* ===== 左侧栏 ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 fixed inset-y-0 z-30 glass rounded-none border-l-0 border-t-0 border-b-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,99,99,0.15)' }}>
            <Brain size={18} color="#FF6363" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">AI热点解析</h1>
            <p className="text-[11px]" style={{ color: '#6B7280' }}>智能分析平台</p>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* 统计 */}
          <div className="pt-6 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="px-4 text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#6B7280' }}>
              今日概览
            </h3>
            <div className="space-y-2.5 px-4">
              {[
                { label: '新热点', value: statsData?.today_count ?? '-', color: '#B0B3B8' },
                { label: '待分析', value: statsData?.pending_analysis ?? '-', color: '#FF9F4A' },
                { label: '紧急', value: statsData?.emergency_count ?? '-', color: '#FF6363' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#6B7280' }}>{item.label}</span>
                  <span className="data-value font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 教程 */}
          <div className="pt-4 mt-2">
            <button onClick={() => setShowTutorial(true)} className="nav-link w-full">
              <BookOpen size={18} />
              <span>使用教程</span>
            </button>
          </div>
        </nav>

        {/* 用户 */}
        <div className="px-3 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="nav-link w-full"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,99,99,0.15)' }}>
                <User size={14} color="#FF6363" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm truncate text-white">{userEmail || '用户'}</p>
              </div>
              <LogOut size={14} style={{ color: '#6B7280' }} />
            </button>

            {showLogout && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg py-1 z-50"
                style={{
                  backgroundColor: '#1E1E24',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: '#B0B3B8' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={15} />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ===== 主区域 ===== */}
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen glass-backdrop">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20" style={{ backgroundColor: 'rgba(15,15,17,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Brain size={20} color="#FF6363" />
              <span className="text-sm font-semibold text-white">AI热点解析</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <button className="btn-ghost p-2 rounded-lg relative">
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#FF6363' }}></span>
              </button>
            </div>
          </div>
        </header>

        {/* 内容 */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-4 px-4 sm:px-6 lg:px-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: '#6B7280' }}>© 2024 AI超级热点解析助手</p>
        </footer>
      </div>

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
