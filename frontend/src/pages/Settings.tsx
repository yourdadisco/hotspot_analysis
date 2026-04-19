import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Bell, Clock, Filter, Layout, Save, Moon, Globe } from 'lucide-react'
import { userSettingsApi } from '../services/api'

const Settings: React.FC = () => {
  const userId = localStorage.getItem('user_id') || ''
  const [settings, setSettings] = useState({
    updateSchedule: 'daily_2am',
    notifyOnEmergency: 'Y',
    notifyOnHigh: 'Y',
    notifyOnMedium: 'N',
    notifyOnLow: 'N',
    itemsPerPage: '20',
    defaultSort: 'relevance',
    defaultImportanceLevels: ['emergency', 'high', 'medium'],
    defaultSourceTypes: ['news', 'tech_blog'],
    theme: 'light',
    language: 'zh'
  })

  // 获取用户设置
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['user-settings', userId],
    queryFn: () => userSettingsApi.getSettings(userId),
    enabled: !!userId,
  })

  // 更新用户设置
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => userSettingsApi.updateSettings(userId, data),
    onSuccess: () => {
      alert('设置已保存！')
    },
    onError: (error: any) => {
      alert(`保存失败: ${error.response?.data?.detail || '未知错误'}`)
    }
  })

  // 当设置数据加载完成时，填充表单
  useEffect(() => {
    if (settingsData?.data) {
      const data = settingsData.data
      setSettings({
        updateSchedule: data.update_schedule || 'daily_2am',
        notifyOnEmergency: data.notify_on_emergency || 'Y',
        notifyOnHigh: data.notify_on_high || 'Y',
        notifyOnMedium: data.notify_on_medium || 'N',
        notifyOnLow: data.notify_on_low || 'N',
        itemsPerPage: data.items_per_page || '20',
        defaultSort: data.default_sort || 'relevance',
        defaultImportanceLevels: data.default_importance_levels ?
          data.default_importance_levels.split(',') : ['emergency', 'high', 'medium'],
        defaultSourceTypes: data.default_source_types ?
          data.default_source_types.split(',') : ['news', 'tech_blog'],
        theme: 'light', // 从API获取的主题字段可能不存在
        language: 'zh'  // 从API获取的语言字段可能不存在
      })
    }
  }, [settingsData])

  const updateSchedules = [
    { id: 'hourly', label: '每小时', description: '实时性最高，API消耗较大' },
    { id: 'daily_2am', label: '每天凌晨2点', description: '推荐设置，平衡实时性和资源' },
    { id: 'daily_6am', label: '每天早上6点', description: '适合白天工作时段查看' },
    { id: 'manual', label: '手动更新', description: '完全控制，节省资源' }
  ]

  const importanceLevels = [
    { id: 'emergency', label: '紧急', color: 'bg-red-500' },
    { id: 'high', label: '高', color: 'bg-orange-500' },
    { id: 'medium', label: '中', color: 'bg-yellow-500' },
    { id: 'low', label: '低', color: 'bg-blue-500' },
    { id: 'watch', label: '关注', color: 'bg-gray-500' }
  ]

  const sourceTypes = [
    { id: 'news', label: '新闻媒体' },
    { id: 'tech_blog', label: '技术博客' },
    { id: 'social_media', label: '社交媒体' },
    { id: 'academic', label: '学术论文' },
    { id: 'other', label: '其他来源' }
  ]

  const sortOptions = [
    { id: 'relevance', label: '相关度' },
    { id: 'importance', label: '重要性' },
    { id: 'date', label: '发布时间' },
    { id: 'collected_at', label: '收录时间' },
    { id: 'view_count', label: '浏览量' }
  ]

  const handleSave = () => {
    const settingsToSave = {
      update_schedule: settings.updateSchedule,
      notify_on_emergency: settings.notifyOnEmergency,
      notify_on_high: settings.notifyOnHigh,
      notify_on_medium: settings.notifyOnMedium,
      notify_on_low: settings.notifyOnLow,
      items_per_page: settings.itemsPerPage,
      default_sort: settings.defaultSort,
      default_importance_levels: settings.defaultImportanceLevels.join(','),
      default_source_types: settings.defaultSourceTypes.join(','),
      // 注意：theme和language当前未保存在后端API中
    }
    updateSettingsMutation.mutate(settingsToSave)
  }

  const toggleImportanceLevel = (level: string) => {
    const current = [...settings.defaultImportanceLevels]
    if (current.includes(level)) {
      setSettings({
        ...settings,
        defaultImportanceLevels: current.filter(l => l !== level)
      })
    } else {
      setSettings({
        ...settings,
        defaultImportanceLevels: [...current, level]
      })
    }
  }

  const toggleSourceType = (type: string) => {
    const current = [...settings.defaultSourceTypes]
    if (current.includes(type)) {
      setSettings({
        ...settings,
        defaultSourceTypes: current.filter(t => t !== type)
      })
    } else {
      setSettings({
        ...settings,
        defaultSourceTypes: [...current, type]
      })
    }
  }

  // 加载状态
  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载设置...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-gray-600 mt-1">个性化配置您的热点分析体验</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧设置 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 更新设置 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Clock className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">更新设置</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                设置热点信息的自动更新频率。更频繁的更新意味着更及时的信息，但也会消耗更多API资源。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {updateSchedules.map((schedule) => (
                  <label
                    key={schedule.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      settings.updateSchedule === schedule.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="radio"
                        name="updateSchedule"
                        value={schedule.id}
                        checked={settings.updateSchedule === schedule.id}
                        onChange={(e) => setSettings({ ...settings, updateSchedule: e.target.value })}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{schedule.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{schedule.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 通知设置 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">通知设置</h2>
            </div>
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                设置不同重要性级别的热点通知偏好。紧急通知会通过邮件和站内信发送，其他级别仅站内通知。
              </p>
              <div className="space-y-4">
                {importanceLevels.map((level) => (
                  <div key={level.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                      <span className="font-medium text-gray-900">{level.label}优先级热点</span>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSettings({ ...settings, [`notifyOn${level.id.charAt(0).toUpperCase() + level.id.slice(1)}` as keyof typeof settings]: 'Y' })}
                        className={`px-4 py-1.5 rounded-lg text-sm ${
                          settings[`notifyOn${level.id.charAt(0).toUpperCase() + level.id.slice(1)}` as keyof typeof settings] === 'Y'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        接收通知
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, [`notifyOn${level.id.charAt(0).toUpperCase() + level.id.slice(1)}` as keyof typeof settings]: 'N' })}
                        className={`px-4 py-1.5 rounded-lg text-sm ${
                          settings[`notifyOn${level.id.charAt(0).toUpperCase() + level.id.slice(1)}` as keyof typeof settings] === 'N'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}
                      >
                        不通知
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧设置 */}
        <div className="space-y-6">
          {/* 显示设置 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Layout className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">显示设置</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每页显示数量
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={settings.itemsPerPage}
                  onChange={(e) => setSettings({ ...settings, itemsPerPage: e.target.value })}
                >
                  <option value="10">10条</option>
                  <option value="20">20条</option>
                  <option value="50">50条</option>
                  <option value="100">100条</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  默认排序方式
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={settings.defaultSort}
                  onChange={(e) => setSettings({ ...settings, defaultSort: e.target.value })}
                >
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 筛选设置 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Filter className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">默认筛选</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">重要性级别筛选</h4>
                <div className="flex flex-wrap gap-2">
                  {importanceLevels.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => toggleImportanceLevel(level.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-2 ${
                        settings.defaultImportanceLevels.includes(level.id)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${level.color}`}></div>
                      <span>{level.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">来源类型筛选</h4>
                <div className="flex flex-wrap gap-2">
                  {sourceTypes.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => toggleSourceType(source.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm ${
                        settings.defaultSourceTypes.includes(source.id)
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {source.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 界面设置 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Moon className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">界面设置</h2>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  主题模式
                </label>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                    className={`px-4 py-2 rounded-lg flex-1 ${
                      settings.theme === 'light'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    浅色模式
                  </button>
                  <button
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                    className={`px-4 py-2 rounded-lg flex-1 ${
                      settings.theme === 'dark'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    深色模式
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  界面语言
                </label>
                <div className="flex items-center space-x-3">
                  <Globe className="text-gray-400" size={20} />
                  <select
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    value={settings.language}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  >
                    <option value="zh">简体中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">应用设置</h3>
                <p className="text-sm text-gray-600 mt-1">保存后立即生效</p>
              </div>
              <button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={20} />
                <span>{updateSettingsMutation.isPending ? '保存中...' : '保存设置'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings