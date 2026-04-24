import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, SCENARIO_GROUPS, type ScenarioGroup } from '../lib/supabase'
import { calculateBestGroup, getGroupStats } from '../lib/groupingAlgorithm'

interface GroupStatus {
  group_name: string
  max_capacity: number
  current_count: number
  remaining_slots: number
  status: 'available' | 'limited' | 'full'
}

interface UserIdentity {
  deviceId: string
  isReturningUser: boolean
  existingRecord: any | null
}

// 生成或获取用户设备ID
function getUserDeviceId(): string {
  const storageKey = 'workshop_user_id'
  let deviceId = localStorage.getItem(storageKey)

  if (!deviceId) {
    deviceId = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
    localStorage.setItem(storageKey, deviceId)
  }

  return deviceId
}

// 检查用户是否已有报名记录
async function checkUserRegistration(deviceId: string): Promise<UserIdentity> {
  const { data } = await supabase
    .from('workshop_participants')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  return {
    deviceId,
    isReturningUser: !!data,
    existingRecord: data
  }
}

export default function RegistrationForm() {
  const navigate = useNavigate()
  const [deviceId, setDeviceId] = useState<string>('')
  const [userIdentity, setUserIdentity] = useState<UserIdentity | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [firstChoice, setFirstChoice] = useState<ScenarioGroup | ''>('')
  const [secondChoice, setSecondChoice] = useState<ScenarioGroup | ''>('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [previewGroup, setPreviewGroup] = useState<string | null>(null)
  const [groupStatuses, setGroupStatuses] = useState<GroupStatus[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [perGroupCapacity, setPerGroupCapacity] = useState(10)
  const [isAutoAssigned, setIsAutoAssigned] = useState(false)

  // 检查用户身份和已有记录
  useEffect(() => {
    const initUser = async () => {
      const id = getUserDeviceId()
      setDeviceId(id)

      const identity = await checkUserRegistration(id)
      setUserIdentity(identity)

      // 如果是老用户，预填表单
      if (identity.existingRecord) {
        setName(identity.existingRecord.participant_name || '')
        setPhone(identity.existingRecord.phone || '')
        setFirstChoice(identity.existingRecord.first_choice || '')
        setSecondChoice(identity.existingRecord.second_choice || '')
        setIsAutoAssigned(identity.existingRecord.is_auto_assigned || false)
      }

      setChecking(false)
    }

    initUser()
  }, [])

  // 加载分组实时状态
  const loadGroupStatuses = async () => {
    setRefreshing(true)
    try {
      // 直接从 scenario_groups 表获取最新数据，而不是通过视图
      const { data, error } = await supabase
        .from('scenario_groups')
        .select('group_name, max_capacity, current_count')
        .order('current_count', { ascending: true })

      if (error) {
        console.error('加载分组状态失败:', error)
        // 尝试备用查询方式
        const { data: backupData } = await supabase
          .from('group_statistics')
          .select('*')
          .order('current_count', { ascending: true })
        if (backupData) {
          setGroupStatuses(backupData.map((g: any) => ({
            group_name: g.group_name,
            max_capacity: g.max_capacity || 10,
            current_count: g.current_count || 0,
            remaining_slots: Math.max(0, (g.max_capacity || 10) - (g.current_count || 0)),
            status: (g.current_count || 0) >= (g.max_capacity || 10) ? 'full' :
                   (g.current_count || 0) >= (g.max_capacity || 10) * 0.8 ? 'limited' : 'available'
          })))
        }
        setRefreshing(false)
        return
      }

      // 获取每组最大容量配置
      const { data: sessionData } = await supabase
        .from('workshop_sessions')
        .select('max_per_group')
        .limit(1)
        .single()

      let maxCap = sessionData?.max_per_group || 10

      const statuses: GroupStatus[] = (data || []).map((g) => {
        const capacity = g.max_capacity || maxCap
        let status: 'available' | 'limited' | 'full' = 'available'
        if (g.current_count >= capacity) {
          status = 'full'
        } else if (g.current_count >= capacity * 0.8) {
          status = 'limited'
        }
        return {
          group_name: g.group_name,
          max_capacity: capacity,
          current_count: g.current_count,
          remaining_slots: Math.max(0, capacity - g.current_count),
          status
        }
      })

      setGroupStatuses(statuses)
      if (sessionData?.max_per_group) {
        setPerGroupCapacity(sessionData.max_per_group)
      }
    } catch (error) {
      console.error('加载分组状态失败:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // 初始化加载和定时刷新
  useEffect(() => {
    loadGroupStatuses()
  }, []) // 只在组件挂载时执行一次

  // 定时刷新 - 每5秒刷新一次
  useEffect(() => {
    const interval = setInterval(() => {
      loadGroupStatuses()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // 监听第一/第二意向变化，预览分组结果
  const handleSecondChoiceChange = async (value: ScenarioGroup) => {
    setSecondChoice(value)

    if (firstChoice && value) {
      try {
        const stats = await getGroupStats()
        const assignment = calculateBestGroup(firstChoice, value, stats)
        setPreviewGroup(assignment?.groupName || '待分配')
      } catch {
        setPreviewGroup(null)
      }
    } else {
      setPreviewGroup(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setMessage({ type: 'error', text: '请输入您的姓名' })
      return
    }

    // 手机号格式验证（如果填写了）
    if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
      setMessage({ type: 'error', text: '请输入正确的手机号码' })
      return
    }

    if (!firstChoice || !secondChoice) {
      setMessage({ type: 'error', text: '请选择第一和第二意向' })
      return
    }

    if (firstChoice === secondChoice) {
      setMessage({ type: 'error', text: '第一意向和第二意向不能相同' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const groupStats = await getGroupStats()
      const assignment = calculateBestGroup(firstChoice, secondChoice, groupStats)

      if (!assignment) {
        setMessage({ type: 'error', text: '抱歉，所有分组都已满员，请联系管理员' })
        setLoading(false)
        return
      }

      // 检查是否是自动分配（意向都满了）
      const firstChoiceFull = (groupStats.get(firstChoice)?.count || 0) >= (groupStats.get(firstChoice)?.max || 10)
      const secondChoiceFull = (groupStats.get(secondChoice)?.count || 0) >= (groupStats.get(secondChoice)?.max || 10)
      const isAuto = firstChoiceFull || secondChoiceFull

      if (userIdentity?.existingRecord) {
        // 更新现有记录
        const { error } = await supabase
          .from('workshop_participants')
          .update({
            participant_name: name.trim(),
            phone: phone || null,
            first_choice: firstChoice,
            second_choice: secondChoice,
            group_id: assignment.groupId,
            is_auto_assigned: isAuto,
            update_time: new Date().toISOString()
          })
          .eq('device_id', deviceId)

        if (error) throw error

        // 如果修改了分组，更新组计数
        if (userIdentity.existingRecord.group_id !== assignment.groupId) {
          // 原组计数-1
          await supabase.rpc('decrement_group_count', {
            group_id_param: userIdentity.existingRecord.group_id
          })
          // 新组计数+1
          await supabase.rpc('increment_group_count', {
            group_id_param: assignment.groupId
          })
        }

        setMessage({
          type: 'success',
          text: `更新成功！您已被分配到「${assignment.groupName}」组`
        })
      } else {
        // 新增记录
        const { error } = await supabase
          .from('workshop_participants')
          .insert({
            participant_name: name.trim(),
            phone: phone || null,
            first_choice: firstChoice,
            second_choice: secondChoice,
            group_id: assignment.groupId,
            device_id: deviceId,
            is_auto_assigned: isAuto
          })

        if (error) {
          if (error.code === '23505') {
            setMessage({ type: 'error', text: '检测到您已经提交过报名信息' })
          } else {
            throw error
          }
          setLoading(false)
          return
        }

        // 更新组计数
        const currentStats = groupStats.get(assignment.groupName)!
        await supabase
          .from('scenario_groups')
          .update({ current_count: currentStats.count + 1 })
          .eq('id', assignment.groupId)

        setMessage({
          type: 'success',
          text: `报名成功！您已被分配到「${assignment.groupName}」组`
        })

        // 更新本地身份状态
        setUserIdentity(prev => prev ? {
          ...prev,
          isReturningUser: true,
          existingRecord: {
            participant_name: name.trim(),
            first_choice: firstChoice,
            second_choice: secondChoice,
            group_id: assignment.groupId,
            is_auto_assigned: isAuto
          }
        } : null)
        setIsAutoAssigned(isAuto)
      }

      // 清空预览
      setPreviewGroup(null)

      // 刷新分组状态
      await loadGroupStatuses()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '提交失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  // 获取状态标签样式
  const getStatusBadge = (status: GroupStatus) => {
    if (status.status === 'full') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          已满
        </span>
      )
    } else if (status.status === 'limited') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          紧张
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          有位
        </span>
      )
    }
  }

  // 加载中
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检查您的报名状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 实时分组状态展示 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">实时分组状态</h2>
          <button
            onClick={loadGroupStatuses}
            disabled={refreshing}
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {groupStatuses.map(group => (
            <div
              key={group.group_name}
              className={`p-3 rounded-lg border-2 transition-colors ${
                group.status === 'full'
                  ? 'bg-red-50 border-red-200'
                  : group.status === 'limited'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800 text-sm">{group.group_name}</span>
                {getStatusBadge(group)}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <span className={`font-bold ${group.status === 'full' ? 'text-red-600' : 'text-gray-800'}`}>
                    {group.current_count}
                  </span>
                  <span className="text-gray-400">/{group.max_capacity}</span>
                </span>
                <span className={`font-medium ${
                  group.status === 'full' ? 'text-red-600' :
                  group.status === 'limited' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {group.status === 'full' ? '已满' : `剩${group.remaining_slots}`}
                </span>
              </div>
              <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    group.status === 'full' ? 'bg-red-500' :
                    group.status === 'limited' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((group.current_count / group.max_capacity) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 老用户提醒 */}
      {userIdentity?.isReturningUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-amber-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-medium text-amber-800">
                {isAutoAssigned ? '您被系统自动分配到某个分组' : '您已完成报名'}
              </h3>
              <p className="text-amber-700 text-sm mt-1">
                {isAutoAssigned
                  ? '您的第一、第二意向分组均已满，系统已将您分配到当前人数最少的分组。您可以修改意向重新匹配。'
                  : '您已提交过报名信息，可以修改您的意向场景并重新提交。'}
              </p>
              {userIdentity.existingRecord?.group_id && (
                <p className="text-amber-800 font-medium mt-2">
                  当前分组：「{groupStatuses.find(g => g.group_name === SCENARIO_GROUPS[userIdentity.existingRecord.group_id - 1])?.group_name || '未知'}」
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 报名表单卡片 */}
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {userIdentity?.isReturningUser ? '修改报名信息' : '填写报名信息'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {userIdentity?.isReturningUser
            ? '修改后系统将自动重新匹配最适合您的分组'
            : '请填写您的个人信息，每个手机号/设备仅限报名一次'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 姓名输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>

          {/* 手机号输入（可选） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              手机号 <span className="text-gray-400 font-normal">(可选，用于加强身份识别)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入手机号（11位数字）"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading}
            />
          </div>

          {/* 第一意向选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              第一意向场景 <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-2">(优先分配)</span>
            </label>
            <select
              value={firstChoice}
              onChange={(e) => setFirstChoice(e.target.value as ScenarioGroup)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading}
            >
              <option value="">请选择第一意向场景</option>
              {SCENARIO_GROUPS.map(group => {
                const status = groupStatuses.find(g => g.group_name === group)
                const isFull = status?.status === 'full'
                return (
                  <option key={group} value={group} disabled={isFull}>
                    {group} {isFull ? '(已满)' : status ? `(${status.current_count}/${status.max_capacity})` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* 第二意向选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              第二意向场景 <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-2">(第一意向满员时分配)</span>
            </label>
            <select
              value={secondChoice}
              onChange={(e) => handleSecondChoiceChange(e.target.value as ScenarioGroup)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              disabled={loading || !firstChoice}
            >
              <option value="">请先选择第一意向</option>
              {firstChoice && SCENARIO_GROUPS.filter(g => g !== firstChoice).map(group => {
                const status = groupStatuses.find(g => g.group_name === group)
                const isFull = status?.status === 'full'
                return (
                  <option key={group} value={group} disabled={isFull}>
                    {group} {isFull ? '(已满)' : status ? `(${status.current_count}/${status.max_capacity})` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* 预览分组结果 */}
          {previewGroup && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-indigo-800 font-medium">
                    预计分配：「{previewGroup}」组
                  </p>
                  <p className="text-indigo-600 text-sm mt-1">
                    （最终分配以提交后的确认信息为准）
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.type === 'info'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 disabled:bg-indigo-400 transition-colors"
          >
            {loading ? '提交中...' : userIdentity?.isReturningUser ? '更新报名' : '提交报名'}
          </button>
        </form>
      </div>

      {/* 查看结果入口 */}
      <div className="mt-6 text-center">
        <Link
          to="/results"
          className="text-indigo-600 hover:text-indigo-800 font-medium"
        >
          查看分组结果 →
        </Link>
      </div>
    </div>
  )
}