import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Brain, Home, Heart, Settings, Briefcase, Cpu, Bell, LogOut, User, BookOpen } from 'lucide-react'
import { hotspotsApi } from '../services/api'
import UsageGuideModal from './UsageGuideModal'

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const [showLogout, setShowLogout] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const userId = localStorage.getItem('user_id') || ''

  // 获取统计信息（与Dashboard共享同一个queryKey，一方刷新另一方自动更新）
  const { data: statsData } = useQuery({
    queryKey: ['hotspots-stats'],
    queryFn: async () => {
      const response = await hotspotsApi.getStats()
      return response as any
    },
    enabled: !!userId,
    refetchInterval: 60000, // 每分钟自动刷新
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
    { path: '/business', icon: <Briefcase size={20} />, label: '业务配置' },
    { path: '/model-config', icon: <Cpu size={20} />, label: '模型配置' },
    { path: '/settings', icon: <Settings size={20} />, label: '设置' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI热点解析助手</h1>
                <p className="text-xs text-gray-500">智能追踪AI行业动态</p>
              </div>
            </div>

            {/* 用户信息 */}
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边栏 */}
          <aside className="lg:w-64">
            <nav className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
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
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  今日统计
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">新热点</span>
                    <span className="font-semibold text-gray-900">{statsData?.today_count ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">待分析</span>
                    <span className="font-semibold text-amber-600">{statsData?.pending_analysis ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">紧急事项</span>
                    <span className="font-semibold text-red-600">{statsData?.emergency_count ?? '-'}</span>
                  </div>
                </div>
              </div>

              {/* 使用教程 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors w-full"
                >
                  <BookOpen size={18} className="text-gray-400" />
                  <span className="font-medium text-sm">使用教程</span>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600 text-sm">
              © 2024 AI超级热点解析助手. 保留所有权利.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
                帮助中心
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
                隐私政策
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 text-sm">
                服务条款
              </a>
            </div>
          </div>
        </div>
      </footer>

      <UsageGuideModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  )
}

export default Layout