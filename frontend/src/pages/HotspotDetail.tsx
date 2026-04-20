import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft, ExternalLink, Calendar, User, Eye, ThumbsUp,
  Share2, AlertTriangle, BarChart3, Target, Lightbulb,
  RefreshCw, Download, MessageSquare
} from 'lucide-react'
import ImportanceBadge from '../components/ImportanceBadge'
import { hotspotsApi, analysisApi } from '../services/api'
import { renderSafeSummary, stripHtmlTags } from '../utils/sanitize'

const HotspotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [showFullContent, setShowFullContent] = useState(false)

  const userId = localStorage.getItem('user_id') || ''

  // 获取热点详情和分析
  const { data: hotspotData, isLoading, refetch } = useQuery({
    queryKey: ['hotspot', id, userId],
    queryFn: () => hotspotsApi.getHotspotDetail(id!, userId),
    enabled: !!id,
  })

  // 触发分析
  const analyzeMutation = useMutation({
    mutationFn: () => analysisApi.triggerAnalysis(id!, userId),
    onSuccess: () => {
      alert('分析请求已提交，请稍后查看结果')
      refetch()
    },
    onError: (error: any) => {
      alert(`分析失败: ${error.response?.data?.detail || '未知错误'}`)
    }
  })

  const hotspot = hotspotData
  const analysis = hotspot?.analysis

  // 兼容性处理：支持新旧数据结构
  const getAnalysisProcess = () => {
    if (analysis?.analysis_metadata?.analysis_process) {
      return analysis.analysis_metadata.analysis_process
    }
    // 新数据结构：analysis_process在根级别
    return analysis?.analysis_process || ''
  }

  const getAnalysisConclusion = () => {
    if (analysis?.analysis_metadata?.analysis_conclusion) {
      return analysis.analysis_metadata.analysis_conclusion
    }
    // 新数据结构：analysis_conclusion在根级别
    return analysis?.analysis_conclusion || ''
  }

  const handleAnalyze = () => {
    if (!analysis) {
      analyzeMutation.mutate()
    } else {
      alert('该热点已有分析结果，如需重新分析请点击"重新分析"按钮')
    }
  }

  const handleRefreshAnalysis = () => {
    analyzeMutation.mutate()
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载热点详情...</p>
        </div>
      </div>
    )
  }

  // 数据为空状态
  if (!hotspot) {
    return (
      <div className="space-y-6">
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>返回热点列表</span>
        </Link>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-500 text-lg">热点不存在或加载失败</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回和操作 */}
      <div className="flex justify-between items-center">
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span>返回热点列表</span>
        </Link>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
            <Download size={16} />
            <span>导出分析</span>
          </button>
          <button
            onClick={handleRefreshAnalysis}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} />
            <span>重新分析</span>
          </button>
          <button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Target size={16} />
            <span>{analyzeMutation.isPending ? '分析中...' : analysis ? '重新分析' : '立即分析'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：热点详情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 热点标题和元信息 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <ImportanceBadge level={analysis?.importance_level || 'medium'} size="lg" />
                  <span className="text-sm font-medium px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
                    {hotspot.category || '未分类'}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {hotspot.title}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {analysis?.relevance_score || 0}<span className="text-lg text-gray-600">%</span>
                </div>
                <div className="text-sm text-gray-600">业务相关度</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>发布时间：{hotspot.publish_date ? new Date(hotspot.publish_date).toLocaleString('zh-CN') : '未知'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User size={16} />
                <span>来源：{hotspot.source_name || hotspot.source_type || '未知'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Eye size={16} />
                <span>浏览：{hotspot.view_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ThumbsUp size={16} />
                <span>点赞：{hotspot.like_count}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Share2 size={16} />
                <span>分享：{hotspot.share_count}</span>
              </div>
            </div>

            {/* 标签 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {hotspot.tags?.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 摘要和全文 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">内容摘要</h3>
              <p className="text-gray-700 leading-relaxed">
                {renderSafeSummary(hotspot.summary) || '暂无摘要'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">详细内容</h3>
                <button
                  onClick={() => setShowFullContent(!showFullContent)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showFullContent ? '收起内容' : '展开全文'}
                </button>
              </div>
              {showFullContent && (
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                  {stripHtmlTags(hotspot.raw_content || hotspot.summary || '暂无详细内容')}
                </div>
              )}
            </div>

            {hotspot.source_url && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href={hotspot.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink size={16} />
                  <span>查看原始来源</span>
                </a>
              </div>
            )}
          </div>

          {/* 分析过程 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="text-orange-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">AI分析过程</h2>
            </div>
            {analysis?.analysis_metadata?.analysis_process ? (
              <div className="prose max-w-none text-gray-700">
                {analysis.analysis_metadata.analysis_process.split('\n').map((line, index) => (
                  <p key={index} className="mb-3">{line}</p>
                ))}
              </div>
            ) : analysis?.business_impact ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">分析过程详情不可用（旧版本分析）</p>
                <button
                  onClick={handleRefreshAnalysis}
                  disabled={analyzeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? '分析中...' : '重新分析以获取详细过程'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">尚未进行AI分析</p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? '分析中...' : '立即分析'}
                </button>
              </div>
            )}
          </div>

          {/* 业务影响分析 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="text-orange-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">业务影响分析</h2>
            </div>
            {analysis?.business_impact ? (
              <div className="prose max-w-none text-gray-700">
                {analysis.business_impact.split('\n').map((line, index) => (
                  <p key={index} className="mb-3">{line}</p>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">尚未进行业务影响分析</p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? '分析中...' : '立即分析'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：分析详情 */}
        <div className="space-y-6">
          {/* 重要性分析 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">重要性分析</h2>
            </div>
            {analysis?.importance_level ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">重要性级别</h4>
                  <ImportanceBadge level={analysis.importance_level} size="lg" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">重要性原因</h4>
                  <div className="text-gray-700 text-sm leading-relaxed">
                    {analysis.importance_reason?.split('\n').map((line, index) => (
                      <p key={index} className="mb-2">{line}</p>
                    )) || <p className="text-gray-500">暂无重要性原因分析</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">尚未进行重要性分析</p>
              </div>
            )}
          </div>

          {/* 分析结论 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Lightbulb className="text-green-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">分析结论</h2>
            </div>
            {analysis?.analysis_metadata?.analysis_conclusion ? (
              <div className="prose max-w-none text-gray-700">
                {analysis.analysis_metadata.analysis_conclusion.split('\n').map((line, index) => (
                  <p key={index} className="mb-3">{line}</p>
                ))}
              </div>
            ) : analysis?.business_impact ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">分析结论不可用（旧版本分析）</p>
                <button
                  onClick={handleRefreshAnalysis}
                  disabled={analyzeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? '分析中...' : '重新分析以获取详细结论'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">尚未进行分析</p>
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeMutation.isPending ? '分析中...' : '立即分析'}
                </button>
              </div>
            )}
          </div>

          {/* 行动建议 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Lightbulb className="text-green-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">行动建议</h2>
            </div>
            {analysis?.action_suggestions ? (
              <ol className="space-y-3">
                {analysis.action_suggestions.split('\n').map((line, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className="text-gray-700 text-sm">{line.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无行动建议</p>
              </div>
            )}
          </div>

          {/* 技术细节 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-6">
              <MessageSquare className="text-purple-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-900">技术细节</h2>
            </div>
            {analysis?.technical_details ? (
              <div className="text-gray-700 text-sm leading-relaxed">
                {analysis.technical_details.split('\n').map((line, index) => (
                  <p key={index} className="mb-2">{line}</p>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无技术细节</p>
              </div>
            )}
          </div>

          {/* 分析元数据 */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">分析信息</h3>
            {analysis?.analyzed_at ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">分析时间</span>
                  <span className="text-gray-900">
                    {analysis.analyzed_at ? new Date(analysis.analyzed_at).toLocaleString('zh-CN') : '未知'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">使用模型</span>
                  <span className="text-gray-900">{analysis.model_used || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token消耗</span>
                  <span className="text-gray-900">{analysis.tokens_used?.toLocaleString() || '未知'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">分析状态</span>
                  <span className="text-green-600 font-medium">已完成</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无分析信息</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotspotDetail