import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Heart, Settings, Briefcase, Cpu,
  Bell, LogOut, User, BookOpen, BarChart3, Activity
} from 'lucide-react'
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
    if (email) {
      setUserEmail(email)
    }
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
    { path: '/dashboard', icon: <BarChart3 size={18} />, label: '热点看板' },
    { path: '/favorites', icon: <Heart size={18} />, label: '我的收藏' },
    { path: '/business', icon: <Briefcase size={18} />, label: '业务配置' },
    { path: '/model-config', icon: <Cpu size={18} />, label: '模型配置' },
    { path: '/settings', icon: <Settings size={18} />, label: '设置' },
  ]

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F1EA' }}>
      {/* ===== 侧边栏 ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 fixed inset-y-0 z-30"
        style={{ backgroundColor: '#1A2332' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 166, 35, 0.15)' }}>
            <Activity size={18} color="#F5A623" />
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: '#E8ECF4' }}>AI热点解析</h1>
            <p className="text-[11px]" style={{ color: '#5E6680' }}>智能分析平台</p>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'nav-link-active' : 'nav-link'
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* 快速统计 */}
          <div className="pt-6 mt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="px-4 text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#5E6680' }}>
              今日概览
            </h3>
            <div className="space-y-2 px-4">
              {[
                { label: '新热点', value: statsData?.today_count ?? '-', color: '#E8ECF4' },
                { label: '待分析', value: statsData?.pending_analysis ?? '-', color: '#F5A623' },
                { label: '紧急', value: statsData?.emergency_count ?? '-', color: '#F23645' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: '#8B95B0' }}>{item.label}</span>
                  <span className="data-value font-semibold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 使用教程 */}
          <div className="pt-4 mt-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="nav-link w-full"
            >
              <BookOpen size={18} />
              <span>使用教程</span>
            </button>
          </div>
        </nav>

        {/* 用户区域 */}
        <div className="px-3 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowLogout(!showLogout)}
              className="nav-link w-full"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ backgroundColor: 'rgba(245, 166, 35, 0.15)' }}>
                <User size={14} color="#F5A623" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm truncate" style={{ color: '#E8ECF4' }}>
                  {userEmail || '用户'}
                </p>
              </div>
              <LogOut size={14} style={{ color: '#5E6680' }} />
            </button>

            {showLogout && (
              <div className="absolute bottom-full left-0 right-0 mb-2 rounded-md py-1 z-50"
                style={{
                  backgroundColor: '#232E45',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
                }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: '#E8ECF4' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245, 166, 35, 0.1)'}
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
      <div className="flex-1 flex flex-col lg:ml-60 min-h-screen">
        {/* 顶栏 */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md"
          style={{ borderBottom: '2px solid #F5A623' }}>
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            {/* 移动端 Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <Activity size={20} color="#F5A623" />
              <span className="text-sm font-semibold" style={{ color: '#1B1B1A' }}>AI热点解析</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <button className="btn-ghost p-2 rounded-md relative">
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: '#F23645' }}></span>
              </button>
            </div>
          </div>
        </header>

        {/* 内容 */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* 页脚 */}
        <footer className="py-4 px-4 sm:px-6 lg:px-8 text-center"
          style={{ borderTop: '1px solid #D8D2C2' }}>
          <p className="text-xs" style={{ color: '#8B95B0' }}>
            © 2024 AI超级热点解析助手
          </p>
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
