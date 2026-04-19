import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn, Mail, Building, Users } from 'lucide-react'
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
      if (response.data.access_token) {
        // 保存token和用户信息到localStorage
        localStorage.setItem('access_token', response.data.access_token)
        localStorage.setItem('user_id', response.data.user.id)
        localStorage.setItem('user_email', response.data.user.email)
        if (response.data.settings) {
          localStorage.setItem('user_settings', JSON.stringify(response.data.settings))
        }

        // 跳转到仪表板
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Users className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI热点解析助手</h1>
          <p className="text-gray-600">为企业提供智能热点分析与决策支持</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-3 mb-6">
            <LogIn className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">登录账户</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                企业邮箱
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  placeholder="your.company@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                使用企业邮箱登录，系统将根据您的业务信息提供个性化分析
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center space-x-2"
            >
              <LogIn size={20} />
              <span>{isLoading ? '登录中...' : '登录 / 注册'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">如何使用？</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>首次使用输入邮箱即可自动注册</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>登录后配置公司业务信息以启用个性化分析</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>系统将定期为您分析最新的AI行业热点</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 功能介绍 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 text-center">
            <Building className="text-blue-600 mx-auto mb-2" size={24} />
            <h4 className="font-medium text-gray-900 mb-1">业务驱动</h4>
            <p className="text-xs text-gray-600">根据您的业务定制分析</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <Users className="text-blue-600 mx-auto mb-2" size={24} />
            <h4 className="font-medium text-gray-900 mb-1">智能分级</h4>
            <p className="text-xs text-gray-600">五级重要性自动识别</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <Mail className="text-blue-600 mx-auto mb-2" size={24} />
            <h4 className="font-medium text-gray-900 mb-1">及时通知</h4>
            <p className="text-xs text-gray-600">重要动态实时推送</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login