import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase, SCENARIO_GROUPS } from '../lib/supabase'
import { getGroupStatistics, getGroupResults } from '../lib/groupingAlgorithm'

interface GroupStat {
  group_name: string
  max_capacity: number
  current_count: number
  remaining_slots: number
}

interface Participant {
  id: string
  participant_name: string
  first_choice: string
  second_choice: string
  registration_time: string
  assigned_group?: string
}

interface AssignmentResult {
  id: string
  participant_name: string
  first_choice: string
  second_choice: string
  assigned_group: string
  registration_time?: string
}

interface SessionConfig {
  id: string
  total_participants: number
  group_count: number
  per_group_capacity: number
}

// 颜色配置
const COLORS = ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16']

export default function AdminPanel() {
  const [stats, setStats] = useState<GroupStat[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [results, setResults] = useState<AssignmentResult[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; name: string; id: string } | null>(null)

  // 配置相关状态
  const [totalParticipants, setTotalParticipants] = useState(100)
  const [groupCount] = useState(10) // 固定10个组
  const [perGroupCapacity, setPerGroupCapacity] = useState(10)
  const [configSaved, setConfigSaved] = useState(false)

  useEffect(() => {
    loadData()
    loadConfig()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, participantsData, resultsData] = await Promise.all([
        getGroupStatistics(),
        supabase
          .from('workshop_participants')
          .select('id, participant_name, first_choice, second_choice, registration_time')
          .order('registration_time', { ascending: false }),
        getGroupResults()
      ])
      setStats(statsData || [])
      setParticipants(participantsData.data || [])
      setResults(resultsData || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      // 从数据库获取配置
      const { data, error } = await supabase
        .from('workshop_sessions')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // 忽略"没有结果"的错误
        console.error('加载配置失败:', error)
        return
      }

      if (data) {
        setTotalParticipants(data.total_participants)
        setPerGroupCapacity(data.max_per_group)
      } else {
        // 创建默认配置
        const defaultConfig = {
          session_name: '武汉工作坊',
          total_participants: 100,
          max_per_group: 10
        }
        await supabase.from('workshop_sessions').insert(defaultConfig)
        setTotalParticipants(100)
        setPerGroupCapacity(10)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }

  // 计算每组容量（取整数）
  const calculatePerGroupCapacity = (total: number, groups: number): number => {
    return Math.floor(total / groups)
  }

  // 保存配置并更新所有组的容量
  const handleSaveConfig = async () => {
    const newPerGroupCapacity = calculatePerGroupCapacity(totalParticipants, groupCount)
    setPerGroupCapacity(newPerGroupCapacity)

    try {
      // 更新 workshop_sessions 配置
      const { data: existing } = await supabase
        .from('workshop_sessions')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        await supabase
          .from('workshop_sessions')
          .update({
            total_participants: totalParticipants,
            max_per_group: newPerGroupCapacity
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('workshop_sessions').insert({
          session_name: '武汉工作坊',
          total_participants: totalParticipants,
          max_per_group: newPerGroupCapacity
        })
      }

      // 更新所有场景组的容量
      await supabase
        .from('scenario_groups')
        .update({ max_capacity: newPerGroupCapacity })
        .neq('id', 0)

      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 3000)
      await loadData()

      setMessage({ type: 'success', text: `配置已更新！每组最大人数设为 ${newPerGroupCapacity} 人` })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存配置失败' })
    }
  }

  const handleResetAll = async () => {
    if (!confirm('⚠️ 确定要重置所有分组数据吗？此操作将清空所有参与者的分组信息，并重置所有组的计数。这不可撤销！')) {
      return
    }

    try {
      await supabase
        .from('scenario_groups')
        .update({ current_count: 0 })
        .neq('id', 0)

      await supabase
        .from('workshop_participants')
        .update({ group_id: null })
        .not('group_id', 'is', null)

      setMessage({ type: 'success', text: '数据已重置' })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '重置失败' })
    }
  }

  // 删除单个参与者
  const handleDeleteParticipant = async () => {
    if (!confirmDelete) return

    const { id, name } = confirmDelete
    setDeletingId(id)
    setConfirmDelete(null)

    try {
      // 获取参与者的分组信息
      const { data: participant } = await supabase
        .from('workshop_participants')
        .select('group_id')
        .eq('id', id)
        .single()

      // 删除参与者
      const { error } = await supabase
        .from('workshop_participants')
        .delete()
        .eq('id', id)

      if (error) throw error

      // 如果有分组，减少组别计数
      if (participant?.group_id) {
        await supabase.rpc('decrement_group_count', {
          group_id_param: participant.group_id
        })
      }

      setMessage({ type: 'success', text: `已删除「${name}」的报名信息` })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '删除失败' })
    } finally {
      setDeletingId(null)
    }
  }

  // 打开删除确认对话框
  const openDeleteConfirm = (id: string, name: string) => {
    setConfirmDelete({ show: true, name, id })
  }

  const handleExportCSV = () => {
    if (results.length === 0) {
      alert('暂无数据可导出')
      return
    }

    const headers = ['姓名', '第一意向', '第二意向', '分配组别']
    const csvContent = [
      headers.join(','),
      ...results.map(r => [
        r.participant_name,
        r.first_choice,
        r.second_choice,
        r.assigned_group || '待分配'
      ].join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `工作坊分组_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 计算第一意向分布
  const firstChoiceData = useMemo(() => {
    const counts: Record<string, number> = {}
    participants.forEach(p => {
      counts[p.first_choice] = (counts[p.first_choice] || 0) + 1
    })
    return SCENARIO_GROUPS.map((group, index) => ({
      name: group,
      value: counts[group] || 0,
      color: COLORS[index % COLORS.length]
    })).filter(d => d.value > 0)
  }, [participants])

  // 计算第二意向分布
  const secondChoiceData = useMemo(() => {
    const counts: Record<string, number> = {}
    participants.forEach(p => {
      counts[p.second_choice] = (counts[p.second_choice] || 0) + 1
    })
    return SCENARIO_GROUPS.map((group, index) => ({
      name: group,
      value: counts[group] || 0,
      color: COLORS[index % COLORS.length]
    })).filter(d => d.value > 0)
  }, [participants])

  // 计算分配结果统计
  const assignmentStats = useMemo(() => {
    let firstMatch = 0
    let secondMatch = 0
    let reassigned = 0

    results.forEach(r => {
      if (!r.assigned_group) {
        reassigned++
      } else if (r.assigned_group === r.first_choice) {
        firstMatch++
      } else if (r.assigned_group === r.second_choice) {
        secondMatch++
      } else {
        reassigned++
      }
    })

    return [
      { name: '第一意向匹配', value: firstMatch, color: '#10B981' },
      { name: '第二意向匹配', value: secondMatch, color: '#F59E0B' },
      { name: '系统调剂', value: reassigned, color: '#EF4444' }
    ]
  }, [results])

  // 实际分组人数统计（使用当前配置）
  const actualGroupData = useMemo(() => {
    const counts: Record<string, number> = {}
    results.forEach(r => {
      if (r.assigned_group) {
        counts[r.assigned_group] = (counts[r.assigned_group] || 0) + 1
      }
    })
    return SCENARIO_GROUPS.map((group, index) => ({
      name: group,
      actual: counts[group] || 0,
      capacity: perGroupCapacity,
      color: COLORS[index % COLORS.length]
    }))
  }, [results, perGroupCapacity])

  // 数据概况
  const dataOverview = useMemo(() => {
    const total = participants.length
    const firstMatchRate = total > 0 ? ((assignmentStats[0]?.value || 0) / total * 100).toFixed(1) : '0'
    const secondMatchRate = total > 0 ? ((assignmentStats[1]?.value || 0) / total * 100).toFixed(1) : '0'
    const satisfactionRate = total > 0 ? (((assignmentStats[0]?.value || 0) + (assignmentStats[1]?.value || 0)) / total * 100).toFixed(1) : '0'

    return {
      total,
      firstMatchRate,
      secondMatchRate,
      satisfactionRate,
      firstChoiceMost: firstChoiceData.sort((a, b) => b.value - a.value)[0]?.name || '-',
      secondChoiceMost: secondChoiceData.sort((a, b) => b.value - a.value)[0]?.name || '-'
    }
  }, [participants, assignmentStats, firstChoiceData, secondChoiceData])

  // 渲染柱状图
  const renderBarChart = (data: { name: string; actual: number; capacity: number }[], title: string) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.actual, d.capacity)), perGroupCapacity)

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-20 text-sm text-gray-600 truncate">{item.name}</div>
              <div className="flex-1 relative">
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${(item.actual / maxValue) * 100}%` }}
                  ></div>
                </div>
                <div
                  className="absolute top-0 h-6 border-l-2 border-gray-400 rounded-full"
                  style={{ left: `${(item.capacity / maxValue) * 100}%` }}
                ></div>
              </div>
              <div className="w-16 text-right text-sm">
                <span className="font-medium">{item.actual}</span>
                <span className="text-gray-400">/{item.capacity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 返回入口 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">数据分析与管理</h2>
        <div className="flex gap-3">
          <Link
            to="/results"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            查看分组结果
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            返回报名页
          </Link>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 删除确认对话框 */}
      {confirmDelete?.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">确认删除</h3>
            <p className="text-gray-600 text-center mb-6">
              确定要删除「<span className="font-semibold text-red-600">{confirmDelete.name}</span>」的报名信息吗？
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              此操作不可撤销，删除后将释放该学员占用的分组名额。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleDeleteParticipant}
                disabled={!!deletingId}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:bg-red-300"
              >
                {deletingId === confirmDelete.id ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配置面板 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          分组容量配置
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 总参与人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              总参与人数
            </label>
            <input
              type="number"
              value={totalParticipants}
              onChange={(e) => setTotalParticipants(Math.max(1, parseInt(e.target.value) || 0))}
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* 场景组数量（固定10个） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              场景组数量
            </label>
            <input
              type="number"
              value={groupCount}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-1">固定10个场景组</p>
          </div>

          {/* 计算后的每组容量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每组最大人数
            </label>
            <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 font-semibold">
              {Math.floor(totalParticipants / groupCount)} 人
            </div>
            <p className="text-xs text-gray-400 mt-1">自动计算（取整数）</p>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-end">
            <button
              onClick={handleSaveConfig}
              className={`w-full py-2 rounded-lg font-medium transition-colors ${
                configSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {configSaved ? '✓ 已保存' : '保存配置'}
            </button>
          </div>
        </div>

        {/* 计算说明 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>计算公式：</strong>每组最大人数 = 总参与人数 ÷ 场景组数量 = {totalParticipants} ÷ {groupCount} = {Math.floor(totalParticipants / groupCount)}
          </p>
        </div>
      </div>

      {/* 数据概况卡片 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
        <h3 className="font-semibold text-lg mb-4">📊 数据概况分析</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold">{dataOverview.total}</div>
            <div className="text-indigo-200 text-sm mt-1">总报名人数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{dataOverview.firstMatchRate}%</div>
            <div className="text-indigo-200 text-sm mt-1">第一意向满足率</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{dataOverview.satisfactionRate}%</div>
            <div className="text-indigo-200 text-sm mt-1">总体满意度</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{perGroupCapacity}</div>
            <div className="text-indigo-200 text-sm mt-1">每组最大人数</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">{assignmentStats[2]?.value || 0}</div>
            <div className="text-indigo-200 text-sm mt-1">需调剂人数</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-indigo-400">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>🔥 第一意向最热门：<strong>{dataOverview.firstChoiceMost}</strong></span>
            <span>⭐ 第二意向最热门：<strong>{dataOverview.secondChoiceMost}</strong></span>
          </div>
        </div>
      </div>

      {/* 分配结果分析 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">分配结果分析</h3>
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center gap-2">
            {assignmentStats.map((stat, index) => (
              <div key={index} className="flex items-center">
                <div className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-sm text-gray-500 ml-1">/{stat.name}</div>
                {index < assignmentStats.length - 1 && <div className="text-gray-300 mx-4">|</div>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <div className="flex gap-4">
            {assignmentStats.map((stat, index) => {
              const total = assignmentStats.reduce((sum, s) => sum + s.value, 0)
              const percentage = total > 0 ? ((stat.value / total) * 100).toFixed(1) : '0'
              return (
                <div key={index} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{percentage}%</div>
                  <div className="text-sm text-gray-600 mt-1">{stat.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* 各组实际分配人数 */}
        {renderBarChart(actualGroupData, `各组实际分配人数（每组最大${perGroupCapacity}人）`)}

        {/* 第一意向分布 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-4">第一意向分布</h3>
          <div className="space-y-3">
            {firstChoiceData.sort((a, b) => b.value - a.value).map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 truncate">{item.name}</div>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(item.value / Math.max(...firstChoiceData.map(d => d.value), 1)) * 100}%`,
                      backgroundColor: item.color
                    }}
                  ></div>
                </div>
                <div className="w-12 text-right text-sm font-medium">{item.value}</div>
              </div>
            ))}
            {firstChoiceData.length === 0 && (
              <div className="text-center text-gray-400 py-8">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {/* 第二意向分布 */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">第二意向分布</h3>
        <div className="space-y-3">
          {secondChoiceData.sort((a, b) => b.value - a.value).map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-24 text-sm text-gray-600 truncate">{item.name}</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.value / Math.max(...secondChoiceData.map(d => d.value), 1)) * 100}%`,
                    backgroundColor: item.color
                  }}
                ></div>
              </div>
              <div className="w-12 text-right text-sm font-medium">{item.value}</div>
            </div>
          ))}
          {secondChoiceData.length === 0 && (
            <div className="text-center text-gray-400 py-8">暂无数据</div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 重置数据 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-2">重置数据</h3>
          <p className="text-gray-600 text-sm mb-4">
            清空所有分组信息，重新开始分配
          </p>
          <button
            onClick={handleResetAll}
            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            重置分组
          </button>
        </div>

        {/* 导出数据 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-2">导出数据</h3>
          <p className="text-gray-600 text-sm mb-4">
            导出分组结果为CSV文件，方便存档
          </p>
          <button
            onClick={handleExportCSV}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            导出CSV
          </button>
        </div>
      </div>

      {/* 详细名单 */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">报名人员详细名单</h3>
          <span className="text-sm text-gray-500">{results.length} 人</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">第一意向</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">第二意向</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分配结果</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    暂无报名数据
                  </td>
                </tr>
              ) : (
                results.map((result, index) => {
                  const status = result.assigned_group === result.first_choice
                    ? 'first'
                    : result.assigned_group === result.second_choice
                    ? 'second'
                    : 'reassigned'

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{result.participant_name}</td>
                      <td className="px-4 py-3 text-gray-600">{result.first_choice}</td>
                      <td className="px-4 py-3 text-gray-600">{result.second_choice}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
                          {result.assigned_group || '待分配'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {status === 'first' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            第一意向
                          </span>
                        )}
                        {status === 'second' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            第二意向
                          </span>
                        )}
                        {status === 'reassigned' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            系统调剂
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openDeleteConfirm(result.id, result.participant_name)}
                          disabled={deletingId === result.id}
                          className="inline-flex items-center px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="删除"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {deletingId === result.id ? '删除中' : '删除'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}