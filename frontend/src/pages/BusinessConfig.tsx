import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Briefcase, Building, Globe, Save, HelpCircle } from 'lucide-react'
import { authApi } from '../services/api'

const BusinessConfig: React.FC = () => {
  const userId = localStorage.getItem('user_id') || ''
  const [businessDescription, setBusinessDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')

  const industries = [
    '科技/互联网',
    '金融/保险',
    '医疗/健康',
    '教育/培训',
    '制造业',
    '零售/电商',
    '媒体/娱乐',
    '其他'
  ]

  const exampleDescriptions = [
    {
      title: 'AI产品开发公司',
      description: '我们开发基于大模型的智能客服系统，主要服务金融和电商行业客户。关注自然语言处理、多模态交互和行业定制化解决方案。'
    },
    {
      title: '企业数字化转型服务商',
      description: '为企业提供AI驱动的数字化转型解决方案，包括数据分析、自动化流程和智能决策系统。重点关注制造业和零售业的效率提升。'
    },
    {
      title: 'AI研究实验室',
      description: '专注于前沿AI技术研究，包括强化学习、生成式AI和边缘智能。与高校合作，进行基础算法创新和产业应用探索。'
    }
  ]

  // 获取用户信息
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => authApi.getUser(userId),
    enabled: !!userId,
  })

  // 更新用户业务信息
  const updateBusinessMutation = useMutation({
    mutationFn: (data: { company_name: string; industry: string; business_description: string }) =>
      authApi.updateUserBusiness(userId, data),
    onSuccess: () => {
      alert('业务配置已保存！')
    },
    onError: (error: any) => {
      alert(`保存失败: ${error.response?.data?.detail || '未知错误'}`)
    }
  })

  // 当用户数据加载完成时，填充表单
  useEffect(() => {
    if (userData?.data) {
      setCompanyName(userData.data.company_name || '')
      setIndustry(userData.data.industry || '')
      setBusinessDescription(userData.data.business_description || '')
    }
  }, [userData])

  const handleSave = () => {
    if (!companyName.trim() || !industry.trim() || !businessDescription.trim()) {
      alert('请填写所有必填字段')
      return
    }

    updateBusinessMutation.mutate({
      company_name: companyName,
      industry: industry,
      business_description: businessDescription
    })
  }

  // 加载状态
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载用户信息...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">业务配置</h1>
        <p className="text-gray-600 mt-1">配置您的业务信息，让AI更精准地分析热点对您的影响</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧表单 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Briefcase className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">业务基本信息</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  公司/组织名称
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="请输入公司或组织名称"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属行业
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <select
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    <option value="">请选择行业</option>
                    {industries.map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    业务描述
                  </label>
                  <span className="text-sm text-gray-500">
                    {businessDescription.length}/1000
                  </span>
                </div>
                <textarea
                  placeholder="请详细描述您的业务：主要产品/服务、目标客户、技术栈、关注领域等。越详细的分析越精准。"
                  className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  maxLength={1000}
                />
                <p className="mt-2 text-sm text-gray-500">
                  提示：描述应包括业务模式、技术依赖、竞争态势、发展目标等关键信息。
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={updateBusinessMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save size={20} />
                <span>{updateBusinessMutation.isPending ? '保存中...' : '保存配置'}</span>
              </button>
            </div>
          </div>

          {/* 配置建议 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <HelpCircle className="text-blue-600 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">如何写出好的业务描述？</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span><strong>具体化</strong>：避免笼统描述，具体说明业务范围、客户群体、技术栈</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span><strong>关注点</strong>：明确您最关心的技术领域（如NLP、CV、芯片、框架等）</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span><strong>痛点</strong>：描述当前业务面临的挑战或希望改进的方向</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span><strong>目标</strong>：短期和长期的发展目标，以便分析技术趋势的影响</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧示例 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">配置示例</h3>
            <div className="space-y-4">
              {exampleDescriptions.map((example, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => setBusinessDescription(example.description)}
                >
                  <h4 className="font-medium text-gray-900 mb-2">{example.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">{example.description}</p>
                  <div className="mt-3">
                    <span className="text-xs text-blue-600 font-medium">点击使用此示例</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">当前配置状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">配置完整度</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${companyName.trim() && industry.trim() && businessDescription.trim() ? '100' :
                          companyName.trim() || industry.trim() || businessDescription.trim() ? '70' : '0'}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {companyName.trim() && industry.trim() && businessDescription.trim() ? '100' :
                     companyName.trim() || industry.trim() || businessDescription.trim() ? '70' : '0'}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className={`flex items-center space-x-2 ${companyName.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${companyName.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">公司名称 {companyName.trim() ? '✓' : ''}</span>
                </div>
                <div className={`flex items-center space-x-2 ${industry.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${industry.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">行业选择 {industry.trim() ? '✓' : ''}</span>
                </div>
                <div className={`flex items-center space-x-2 ${businessDescription.trim() ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${businessDescription.trim() ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className="text-sm">业务描述 {businessDescription.trim() ? '✓' : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">配置生效后</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>AI将根据您的业务分析热点相关性</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>获得个性化的热点重要性分级</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>收到针对性的行动建议和技术分析</span>
              </li>
              <li className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                <span>系统自动过滤无关信息，聚焦关键动态</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessConfig