// 前端API封装 - 统一调用后端 node-api
// 开发模式：直接调用本地/FC API
// 生产模式：调用部署后的FC域名

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// 统一请求封装
async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

// ==================== 学员API ====================

// 获取所有学员
export async function getParticipants() {
  const data = await apiRequest('/api/participants')
  return data.participants || []
}

// 添加学员
export async function createParticipant(participant: {
  participant_name: string
  first_choice: string
  second_choice: string
  device_id?: string
  phone?: string
}) {
  return apiRequest('/api/participants', {
    method: 'POST',
    body: JSON.stringify(participant)
  })
}

// 删除学员
export async function deleteParticipant(id: string) {
  return apiRequest(`/api/participants/${id}`, { method: 'DELETE' })
}

// 检查用户是否已报名
export async function checkUserRegistration(deviceId: string) {
  const data = await apiRequest(`/api/participants/check?device_id=${deviceId}`)
  return { exists: data.exists, data: data.data }
}

// 更新学员信息
export async function updateParticipant(id: string, participant: {
  participant_name: string
  first_choice: string
  second_choice: string
  phone?: string
}) {
  return apiRequest(`/api/participants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(participant)
  })
}

// ==================== 分组API ====================

// 获取分组统计
export async function getGroups() {
  const data = await apiRequest('/api/groups')
  return data.groups || []
}

// 获取分组统计信息（带状态）
export async function getGroupStatistics() {
  const data = await apiRequest('/api/group-statistics')
  return data.statistics || []
}

// 获取分组结果
export async function getGroupResults() {
  const data = await apiRequest('/api/group-results')
  return data.results || []
}

// 执行分组算法
export async function assignGroups() {
  return apiRequest('/api/groups/assign', { method: 'POST' })
}

// 重置分组
export async function resetGroups() {
  return apiRequest('/api/groups/reset', { method: 'POST' })
}

// 更新分组配置
export async function updateGroupConfig(config: { max_per_group: number }) {
  return apiRequest('/api/group-config', {
    method: 'PUT',
    body: JSON.stringify(config)
  })
}

// 获取分组状态（实时）
export async function getGroupStatus() {
  const data = await apiRequest('/api/group-status')
  return data.groups || []
}

// ==================== 配置API ====================

// 获取每分组容量
export async function getPerGroupCapacity() {
  const data = await apiRequest('/api/config')
  return data.max_per_group || 10
}

// 保存会话配置
export async function saveSessionConfig(config: {
  total_participants: number
  max_per_group: number
}) {
  return apiRequest('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config)
  })
}

// ==================== 健康检查 ====================

export async function healthCheck() {
  return apiRequest('/health')
}

// ==================== 场景组常量 ====================

export const SCENARIO_GROUPS = [
  '线下销售',
  '线上销售',
  '行政管理',
  '客户服务',
  '制造管理',
  '财务管理',
  '人力资源',
  '项目管理',
  '经营分析',
  '生产管理'
] as const

export type ScenarioGroup = typeof SCENARIO_GROUPS[number]
