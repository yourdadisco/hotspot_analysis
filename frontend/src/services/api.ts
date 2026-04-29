import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface Hotspot {
  id: string
  title: string
  summary: string
  content_url: string | null
  source_type: string
  source_name: string | null
  source_url: string | null
  publish_date: string
  language: string
  author: string | null
  tags: string[]
  category: string | null
  raw_content: string | null
  processed_content: Record<string, any> | null
  metadata: Record<string, any>
  collected_at: string
  created_at: string
  updated_at: string
  analysis?: HotspotAnalysis | null
  has_analysis?: boolean
  analysis_importance_level?: string
  analysis_relevance_score?: number
  analysis_content_summary?: string | null
  is_favorite?: boolean
  is_dismissed?: boolean
}

export interface HotspotAnalysis {
  id: string
  hotspot_id: string
  user_id: string
  relevance_score: number
  importance_level: 'emergency' | 'high' | 'medium' | 'low' | 'watch'
  business_impact: string
  importance_reason: string
  action_suggestions: string | null
  technical_details: string | null
  model_used: string | null
  tokens_used: number | null
  analysis_metadata: Record<string, any>
  analyzed_at: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  company_name: string | null
  industry: string | null
  business_description: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  update_schedule: string
  notify_on_emergency: string
  notify_on_high: string
  notify_on_medium: string
  notify_on_low: string
  items_per_page: string
  default_sort: string
  default_importance_levels: string
  default_source_types: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
}

export interface LoginResponse {
  user: User
  settings: UserSettings | null
  access_token?: string
}

// 认证API
export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
  getUser: (userId: string) => api.get<User>(`/auth/users/${userId}`),
  updateUserBusiness: (userId: string, data: any) =>
    api.put<User>(`/auth/users/${userId}/business`, data),
}

// 热点API
export const hotspotsApi = {
  getHotspots: (params?: {
    page?: number
    limit?: number
    importance_levels?: string
    source_types?: string
    date_from?: string
    date_to?: string
    sort_by?: string
    sort_order?: string
    user_id?: string
    is_favorite?: boolean
    is_dismissed?: boolean
  }) => api.get<PaginatedResponse<Hotspot>>('/hotspots', { params }),

  getHotspotDetail: (hotspotId: string, userId?: string) =>
    api.get<Hotspot & { analysis: HotspotAnalysis | null }>(
      `/hotspots/${hotspotId}`,
      { params: userId ? { user_id: userId } : undefined }
    ),

  refreshHotspots: () => api.post('/hotspots/refresh'),

  getStats: () => api.get('/hotspots/stats'),

  analyzeHotspot: (hotspotId: string, userId: string) =>
    api.post(`/hotspots/${hotspotId}/analyze`, null, { params: { user_id: userId } }),

  getAnalysis: (hotspotId: string, userId: string) =>
    api.get<HotspotAnalysis>(`/hotspots/${hotspotId}/analysis/${userId}`),
}

// 数据收集API
export const collectionApi = {
  triggerAsync: () =>
    api.post<{ task_id: string; status: string }>('/collection/async'),

  getProgress: (taskId: string) =>
    api.get<{
      task_id: string
      task_type: string
      title: string
      status: 'pending' | 'running' | 'completed' | 'failed'
      progress: number
      current_step: string
      steps: string[]
      error?: string
    }>(`/collection/progress/${taskId}`),
}

// 模型配置API
export interface UserModelConfig {
  id: string
  user_id: string
  provider: string
  api_key: string
  api_base_url: string
  model_name: string
  is_active: string
  created_at: string
  updated_at: string
}

export const modelConfigApi = {
  getConfig: (userId: string) =>
    api.get<UserModelConfig>(`/users/${userId}/model-config`),
  updateConfig: (userId: string, data: {
    provider?: string
    api_key?: string
    api_base_url?: string
    model_name?: string
    is_active?: string
  }) => api.put<UserModelConfig>(`/users/${userId}/model-config`, data),
  testConnection: (userId: string, data: {
    api_key?: string
    api_base_url?: string
    model_name?: string
  }) => api.post<{ success: boolean; message?: string; error?: string }>(
    `/users/${userId}/model-config/test`, data
  ),
}

// 用户设置API
export const userSettingsApi = {
  getSettings: (userId: string) => api.get<UserSettings>(`/users/${userId}/settings`),
  updateSettings: (userId: string, data: Partial<UserSettings>) =>
    api.put<UserSettings>(`/users/${userId}/settings`, data),
}

// 分析API
export const analysisApi = {
  triggerAnalysis: (hotspotId: string, userId: string, force: boolean = false) =>
    api.post(`/hotspots/${hotspotId}/analyze`, null, { params: { user_id: userId, force } }),

  triggerAnalysisAsync: (hotspotId: string, userId: string, force: boolean = false) =>
    api.post<{ task_id: string; status: string }>(
      `/hotspots/${hotspotId}/analyze-async`,
      null,
      { params: { user_id: userId, force } }
    ),

  getAnalysisProgress: (taskId: string) =>
    api.get<{
      task_id: string
      task_type: string
      title: string
      status: 'pending' | 'running' | 'completed' | 'failed'
      progress: number
      current_step: string
      steps: string[]
      error?: string
    }>(`/analysis/progress/${taskId}`),

  getTaskStatus: (taskId: string) => api.get(`/analysis/tasks/${taskId}/status`),

  analyzeLatest: (userId: string, limit: number = 10) =>
    api.post(`/users/${userId}/analyze-latest`, null, { params: { limit } }),

  analyzeLatestAsync: (userId: string, limit: number = 10) =>
    api.post<{ task_id: string; status: string }>(
      `/users/${userId}/analyze-latest-async?limit=${limit}`, null
    ),
}

// API使用统计
export const apiUsageApi = {
  getSummary: (days?: number) =>
    api.get('/api-usage/api-usage', { params: { days } }),

  getStats: (days?: number) =>
    api.get('/api-usage/api-usage/stats', { params: { days } }),

  getRecords: (params?: {
    page?: number
    limit?: number
    user_id?: string
    endpoint?: string
    success?: boolean
    date_from?: string
    date_to?: string
  }) => api.get('/api-usage/api-usage/records', { params }),
}

// 健康检查
export const healthApi = {
  check: () => api.get('/health'),
}

// 用户操作API（收藏、批量忽略）
export const userActionsApi = {
  toggleFavorite: (userId: string, hotspotId: string) =>
    api.post<{ is_favorite: boolean }>('/user-actions/toggle-favorite', null, {
      params: { user_id: userId, hotspot_id: hotspotId }
    }),

  batchDismiss: (data: {
    user_id: string
    importance_levels?: string[]
    date_from?: string
    date_to?: string
    is_favorite?: boolean | null
  }) => api.post<{ dismissed_count: number; message: string }>('/user-actions/batch-dismiss', data),

  getFavorites: (params: {
    user_id: string
    page?: number
    limit?: number
  }) => api.get<PaginatedResponse<Hotspot>>('/user-actions/favorites', { params }),

  getAction: (userId: string, hotspotId: string) =>
    api.get<{ is_favorite: boolean; is_dismissed: boolean }>(
      `/user-actions/${userId}/hotspot/${hotspotId}`
    ),
}

export default api