import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Brain, Bell, LogOut, User, Settings as SettingsIcon,
  Briefcase, Cpu, BarChart3, ChevronRight
} from 'lucide-react'
import { modelConfigApi, apiUsageApi } from '../services/api'
import NotificationPanel from './NotificationPanel'
import { useWebSocket } from '../hooks/useWebSocket'

type DropdownKey = 'business' | 'model' | 'api' | null

const Layout: React.FC = () => {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const [showLogout, setShowLogout] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null)
  const dropdownTimer = useRef<ReturnType<typeof setTimeout>>()
  const userMenuRef = useRef<HTMLDivElement>(null)

  const userId = localStorage.getItem('user_id') || ''

  // WebSocket 通知
  useWebSocket(userId || null, (data) => {
    if (data?.type === 'notification') setHasUnread(true)
  })

  useEffect(() => {
    const email = localStorage.getItem('user_email')
    if (email) setUserEmail(email)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowLogout(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user_settings')
    navigate('/login')
  }

  // 下拉预览数据
  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const res = await import('../services/api').then(m => m.authApi.getUser(userId))
      return res
    },
    enabled: activeDropdown === 'business' && !!userId,
  } as any)

  const { data: modelData } = useQuery({
    queryKey: ['model-dropdown'],
    queryFn: () => modelConfigApi.getConfig(userId),
    enabled: activeDropdown === 'model' && !!userId,
  })

  const { data: apiData } = useQuery({
    queryKey: ['api-dropdown'],
    queryFn: () => apiUsageApi.getSummary(1) as Promise<any>,
    enabled: activeDropdown === 'api' && !!userId,
  })

  const user: any = userData || {}
  const model: any = modelData || {}
  const api: any = apiData || {}

  const navItems: {
    key: DropdownKey
    label: string
    path: string
    icon: React.ReactNode
    preview: React.ReactNode
  }[] = [
    {
      key: 'business', label: '业务配置', path: '/business',
      icon: <Briefcase size={16} />,
      preview: (
        <div className="p-4 min-w-[220px]">
          <p className="text-sm font-medium text-gray-900">{user.company_name || '未设置'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user.industry || '未选择行业'}</p>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full"
                style={{ width: `${user.company_name && user.industry && user.business_description ? 100 : user.company_name ? 40 : 0}%` }} />
            </div>
            <span className="text-xs text-gray-500">
              {user.company_name && user.industry && user.business_description ? '100%' : user.company_name ? '40%' : '0%'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              进入配置 <ChevronRight size={12} />
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'model', label: '模型配置', path: '/model-config',
      icon: <Cpu size={16} />,
      preview: (
        <div className="p-4 min-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500">供应商</span>
            <span className="text-sm font-semibold text-gray-900">{model.provider || '未配置'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">模型</span>
            <span className="text-sm font-semibold text-gray-900">{model.model_name || '-'}</span>
          </div>
          {model.is_active === 'Y' && (
            <div className="mt-2">
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">已激活</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              进入配置 <ChevronRight size={12} />
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'api', label: 'API 用量', path: '/api-usage',
      icon: <BarChart3 size={16} />,
      preview: (
        <div className="p-4 min-w-[220px]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] text-gray-500">今日请求</p>
              <p className="text-lg font-bold text-gray-900">{api.total_requests ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">成功</p>
              <p className="text-lg font-bold text-green-600">{api.successful_requests ?? '-'}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">Token</p>
              <p className="text-lg font-bold text-gray-900">{(api.total_tokens ?? 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">失败</p>
              <p className="text-lg font-bold text-red-500">{api.failed_requests ?? '-'}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              查看详情 <ChevronRight size={12} />
            </span>
          </div>
        </div>
      ),
    },
  ]

  const handleDropdownEnter = (key: DropdownKey) => {
    clearTimeout(dropdownTimer.current)
    setActiveDropdown(key)
  }

  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150)
  }

  const handleDropdownClick = (path: string) => {
    setActiveDropdown(null)
    navigate(path)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-14 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-8 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900 hidden sm:block">AI热点解析</span>
          </div>

          {/* 导航项 */}
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(item => (
              <div key={item.key} className="relative"
                onMouseEnter={() => handleDropdownEnter(item.key)}
                onMouseLeave={handleDropdownLeave}>
                <button
                  onClick={() => handleDropdownClick(item.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {item.icon}
                  <span className="hidden md:inline">{item.label}</span>
                </button>

                {/* 下拉预览 */}
                {activeDropdown === item.key && (
                  <div
                    onMouseEnter={() => handleDropdownEnter(item.key)}
                    onMouseLeave={handleDropdownLeave}
                    onClick={() => handleDropdownClick(item.path)}
                    className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 cursor-pointer"
                  >
                    {item.preview}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* 右侧操作 */}
          <div className="flex items-center gap-2">
            {/* 设置快捷入口 */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="设置"
            >
              <SettingsIcon size={18} className="text-gray-500" />
            </button>

            {/* 通知 */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setHasUnread(false) }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              >
                <Bell size={18} className="text-gray-500" />
                {hasUnread && <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />}
              </button>
              {showNotifications && (
                <NotificationPanel userId={userId} onClose={() => setShowNotifications(false)} />
              )}
            </div>

            {/* 用户 */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowLogout(!showLogout)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:block max-w-[100px] truncate">
                  {userEmail || '用户'}
                </span>
              </button>

              {showLogout && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">{userEmail || '用户'}</p>
                  </div>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <LogOut size={15} />
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
