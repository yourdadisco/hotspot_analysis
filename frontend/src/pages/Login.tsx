import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Mail, Activity, Building, Users, Bell } from 'lucide-react'
import { authApi } from '../services/api'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await authApi.login({ email })
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token)
        localStorage.setItem('user_id', response.user.id)
        localStorage.setItem('user_email', response.user.email)
        if (response.settings) {
          localStorage.setItem('user_settings', JSON.stringify(response.settings))
        }
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F4F1EA' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4"
            style={{ backgroundColor: 'rgba(245, 166, 35, 0.15)' }}>
            <Activity size={24} color="#F5A623" />
          </div>
          <h1 className="text-xl font-semibold" style={{ color: '#1B1B1A' }}>AI热点解析助手</h1>
          <p className="text-sm mt-1" style={{ color: '#5E6680' }}>为企业提供智能热点分析与决策支持</p>
        </div>

        {/* 登录卡片 */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <LogIn size={18} color="#F5A623" />
            <h2 className="text-base font-semibold" style={{ color: '#1B1B1A' }}>登录账户</h2>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-md text-sm"
              style={{ backgroundColor: '#FEF0F0', color: '#F23645', border: '1px solid rgba(242, 54, 69, 0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6680' }}>
                企业邮箱
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#8B95B0' }} />
                <input
                  type="email"
                  placeholder="your.name@company.com"
                  className="input pl-9 py-2.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: '#8B95B0' }}>
                首次使用输入邮箱即可自动注册
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="btn-primary w-full justify-center py-2.5"
            >
              <LogIn size={16} />
              <span>{isLoading ? '登录中...' : '登录 / 注册'}</span>
            </button>
          </form>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid #D8D2C2' }}>
            <h3 className="text-xs font-semibold mb-3" style={{ color: '#5E6680' }}>如何使用</h3>
            <ul className="space-y-2 text-xs" style={{ color: '#5E6680' }}>
              {[
                '首次使用输入邮箱即可自动注册',
                '登录后配置公司业务信息以启用个性化分析',
                '系统将定期为您分析最新的AI行业热点',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: '#F5A623' }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: <Building size={16} />, title: '业务驱动', desc: '定制分析' },
            { icon: <Users size={16} />, title: '智能分级', desc: '自动识别' },
            { icon: <Bell size={16} />, title: '及时通知', desc: '实时推送' },
          ].map((item) => (
            <div key={item.title} className="card p-3 text-center">
              <div className="mb-1.5" style={{ color: '#F5A623' }}>{item.icon}</div>
              <h4 className="text-xs font-semibold" style={{ color: '#1B1B1A' }}>{item.title}</h4>
              <p className="text-[11px]" style={{ color: '#8B95B0' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Login
