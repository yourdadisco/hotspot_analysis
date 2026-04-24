import React from 'react'
import { X, BookOpen } from 'lucide-react'

interface UsageGuideModalProps {
  isOpen: boolean
  onClose: () => void
}

const sections = [
  {
    title: '1. 业务配置',
    icon: '🏢',
    content: '在「业务配置」页面填写您的公司名称、所属行业和业务描述。AI将根据您的业务背景，分析热点与您的相关性，提供更有针对性的影响评估。',
    example: '示例：填写"我们是一家专注于AI芯片的创业公司"，系统将优先推送芯片、硬件相关的热点。',
  },
  {
    title: '2. 模型配置',
    icon: '⚙️',
    content: '在「模型配置」页面设置您的API密钥和模型参数。系统默认使用DeepSeek模型，您也可以选择其他兼容OpenAI接口的模型。配置完成后可点击"测试连接"验证是否可用。',
  },
  {
    title: '3. 手动更新热点',
    icon: '🔄',
    content: '在「热点看板」页面点击"手动更新"按钮，系统将从RSS订阅、搜索引擎等渠道获取最新的AI行业热点信息。更新过程中可查看实时进度，完成后列表将自动刷新。',
  },
  {
    title: '4. 批量AI分析',
    icon: '🎯',
    content: '在「热点看板」页面点击"批量分析"按钮，选择需要分析的热点数量。系统将对选中的热点逐一进行AI分析，生成重要性级别、相关度评分和业务影响说明。',
  },
  {
    title: '5. 收藏热点',
    icon: '❤️',
    content: '在热点列表中点击心形图标即可收藏感兴趣的热点。所有收藏的热点可在侧边栏「我的收藏」中集中查看和管理，再次点击心形图标可取消收藏。',
  },
  {
    title: '6. 批量忽略',
    icon: '🗑️',
    content: '使用「高级筛选」功能按重要性级别、日期范围和收藏状态筛选出不需要的热点，然后点击"批量忽略"按钮一键清除。忽略后的热点将从列表中消失，帮助您聚焦真正重要的信息。',
  },
]

const UsageGuideModal: React.FC<UsageGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <BookOpen className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">使用教程</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <p className="text-sm text-gray-500 leading-relaxed">
            欢迎使用AI热点解析助手！以下指南将帮助您快速上手各项功能。
          </p>

          {sections.map((section, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed mb-2">{section.content}</p>
              {section.example && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">{section.example}</p>
              )}
            </div>
          ))}

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600">
              有任何问题或建议，欢迎反馈！
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UsageGuideModal
