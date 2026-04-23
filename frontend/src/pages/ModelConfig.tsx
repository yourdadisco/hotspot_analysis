import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Cpu, Key, Globe, Box, Save, Play, HelpCircle, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react'
import { modelConfigApi } from '../services/api'
import { useToastStore } from '../stores/toastStore'

const ModelConfig: React.FC = () => {
  const userId = localStorage.getItem('user_id') || ''
  const addToast = useToastStore((s) => s.addToast)

  const [provider, setProvider] = useState('deepseek')
  const [apiKey, setApiKey] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.deepseek.com')
  const [modelName, setModelName] = useState('deepseek-chat')
  const [showApiKey, setShowApiKey] = useState(false)

  const providers = [
    { id: 'deepseek', label: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
    { id: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
    { id: 'openai_compatible', label: 'OpenAI Compatible', defaultBaseUrl: '', defaultModel: '' },
  ]

  // 获取模型配置
  const { data: configData, isLoading } = useQuery({
    queryKey: ['model-config', userId],
    queryFn: () => modelConfigApi.getConfig(userId),
    enabled: !!userId,
  })

  // 保存模型配置
  const saveMutation = useMutation({
    mutationFn: (data: any) => modelConfigApi.updateConfig(userId, data),
    onSuccess: () => {
      addToast('模型配置已保存！', 'success')
    },
    onError: (error: any) => {
      addToast(`保存失败: ${error.response?.data?.detail || '未知错误'}`, 'error')
    }
  })

  // 测试连接
  const testMutation = useMutation({
    mutationFn: (data: any) => modelConfigApi.testConnection(userId, data),
    onSuccess: (result: any) => {
      if (result.success) {
        addToast('连接测试成功！', 'success')
      } else {
        addToast(`连接失败: ${result.error || '未知错误'}`, 'error')
      }
    },
    onError: (error: any) => {
      addToast(`测试请求失败: ${error.response?.data?.detail || '未知错误'}`, 'error')
    }
  })

  // 填充表单
  useEffect(() => {
    if (configData) {
      setProvider(configData.provider || 'deepseek')
      setApiKey(configData.api_key || '')
      setApiBaseUrl(configData.api_base_url || 'https://api.deepseek.com')
      setModelName(configData.model_name || 'deepseek-chat')
    }
  }, [configData])

  // 切换提供商时自动更新默认值
  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    const p = providers.find(p => p.id === newProvider)
    if (p) {
      if (p.defaultBaseUrl) setApiBaseUrl(p.defaultBaseUrl)
      if (p.defaultModel) setModelName(p.defaultModel)
    }
  }

  const handleSave = () => {
    if (!apiKey.trim()) {
      addToast('请填写 API 密钥', 'warning')
      return
    }
    if (!apiBaseUrl.trim()) {
      addToast('请填写 API 基础 URL', 'warning')
      return
    }
    if (!modelName.trim()) {
      addToast('请填写模型名称', 'warning')
      return
    }

    saveMutation.mutate({
      provider,
      api_key: apiKey,
      api_base_url: apiBaseUrl,
      model_name: modelName,
      is_active: 'Y',
    })
  }

  const handleTestConnection = () => {
    if (!apiKey.trim()) {
      addToast('请先填写 API 密钥', 'warning')
      return
    }
    testMutation.mutate({
      api_key: apiKey,
      api_base_url: apiBaseUrl,
      model_name: modelName,
    })
  }

  const isConfigured = apiKey.trim() && apiBaseUrl.trim() && modelName.trim()

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载模型配置...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">模型配置</h1>
        <p className="text-gray-600 mt-1">配置您的 AI 模型参数，使用自己的 API 密钥进行分析</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧表单 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Cpu className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">API 配置</h2>
            </div>

            <div className="space-y-6">
              {/* 提供商 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型提供商
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 密钥
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">密钥将安全存储，仅用于 AI 分析请求</p>
              </div>

              {/* API Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 基础 URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="https://api.deepseek.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称
                </label>
                <div className="relative">
                  <Box className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="deepseek-chat"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex space-x-4">
              <button
                onClick={handleTestConnection}
                disabled={testMutation.isPending || !apiKey.trim()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play size={20} />
                <span>{testMutation.isPending ? '测试中...' : '测试连接'}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save size={20} />
                <span>{saveMutation.isPending ? '保存中...' : '保存配置'}</span>
              </button>
            </div>
          </div>

          {/* 配置提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="text-blue-600 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">如何获取 API 密钥？</h3>
                <ul className="space-y-3 text-gray-700">
                  {provider === 'deepseek' && (
                    <>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>访问 <strong>platform.deepseek.com</strong> 并登录您的账号</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>左侧菜单 → API Keys → 创建新的 API Key</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>复制密钥并粘贴到上方输入框中</span>
                      </li>
                    </>
                  )}
                  {provider === 'openai' && (
                    <>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>访问 <strong>platform.openai.com</strong> 并登录您的账号</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>API → API Keys → Create new secret key</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>复制密钥并粘贴到上方输入框中</span>
                      </li>
                    </>
                  )}
                  {provider === 'openai_compatible' && (
                    <>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>使用任何兼容 OpenAI API 格式的服务商</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>填写服务商提供的 API Base URL 和 API Key</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <span>确保模型名称与服务商提供的名称一致</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧信息 */}
        <div className="space-y-6">
          {/* 提供商信息 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">提供商参考</h3>
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">DeepSeek</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>API: api.deepseek.com</p>
                  <p>模型: deepseek-chat</p>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">OpenAI</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>API: api.openai.com/v1</p>
                  <p>模型: gpt-4o / gpt-4o-mini</p>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">兼容服务</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>支持任何 OpenAI 兼容 API</p>
                  <p>自定义 Base URL 和模型名</p>
                </div>
              </div>
            </div>
          </div>

          {/* 配置状态 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">配置状态</h3>
            <div className="space-y-3">
              <div className={`flex items-center space-x-2 ${apiKey.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                {apiKey.trim() ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span className="text-sm">API 密钥 {apiKey.trim() ? '✓' : '未配置'}</span>
              </div>
              <div className={`flex items-center space-x-2 ${apiBaseUrl.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                {apiBaseUrl.trim() ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span className="text-sm">API 地址 {apiBaseUrl.trim() ? '✓' : '未配置'}</span>
              </div>
              <div className={`flex items-center space-x-2 ${modelName.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                {modelName.trim() ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                <span className="text-sm">模型名称 {modelName.trim() ? '✓' : '未配置'}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">配置完整度</span>
                <span className="text-sm font-medium text-gray-900">
                  {isConfigured ? '100%' : apiKey.trim() || apiBaseUrl.trim() || modelName.trim() ? '70%' : '0%'}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isConfigured ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: isConfigured ? '100%' : apiKey.trim() || apiBaseUrl.trim() || modelName.trim() ? '70%' : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* 生效说明 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">配置生效后</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>AI 分析将使用您自己的 API 密钥</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>每个用户独立配置，互不干扰</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>未配置时自动使用系统默认模型</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>建议先测试连接再保存配置</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModelConfig
