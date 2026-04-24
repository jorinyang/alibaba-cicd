import { supabase, SCENARIO_GROUPS, type ScenarioGroup } from './supabase'

/**
 * 智能分组算法
 * 分配原则：
 * 1. 优先匹配第一意向
 * 2. 如果第一意向满了，匹配第二意向
 * 3. 如果两个意向都满了，匹配到当前人数最少的组
 */

interface GroupAssignment {
  groupId: number
  groupName: string
}

// 获取所有组的当前状态（包括动态容量）
export async function getGroupStats(): Promise<Map<string, { id: number; count: number; max: number }>> {
  const { data, error } = await supabase
    .from('scenario_groups')
    .select('id, group_name, max_capacity, current_count')

  if (error) throw error

  const statsMap = new Map<string, { id: number; count: number; max: number }>()
  data?.forEach(group => {
    statsMap.set(group.group_name, {
      id: group.id,
      count: group.current_count,
      max: group.max_capacity
    })
  })

  return statsMap
}

// 计算单个参与者的最佳分组
export function calculateBestGroup(
  firstChoice: ScenarioGroup,
  secondChoice: ScenarioGroup,
  groupStats: Map<string, { id: number; count: number; max: number }>
): GroupAssignment | null {
  // 第一步：检查第一意向
  const firstGroup = groupStats.get(firstChoice)
  if (firstGroup && firstGroup.count < firstGroup.max) {
    return { groupId: firstGroup.id, groupName: firstChoice }
  }

  // 第二步：检查第二意向
  const secondGroup = groupStats.get(secondChoice)
  if (secondGroup && secondGroup.count < secondGroup.max) {
    return { groupId: secondGroup.id, groupName: secondChoice }
  }

  // 第三步：找当前人数最少的组
  let minCount = Infinity
  let minGroup: GroupAssignment | null = null

  groupStats.forEach((stats, groupName) => {
    if (stats.count < stats.max && stats.count < minCount) {
      minCount = stats.count
      minGroup = { groupId: stats.id, groupName }
    }
  })

  return minGroup
}

// 批量分配所有未分组的参与者
export async function autoAssignAllGroups(): Promise<{ success: boolean; message: string; count: number }> {
  try {
    // 获取所有未分组的参与者
    const { data: participants, error: fetchError } = await supabase
      .from('workshop_participants')
      .select('id, first_choice, second_choice')
      .is('group_id', null)
      .order('registration_time', { ascending: true })

    if (fetchError) throw fetchError
    if (!participants || participants.length === 0) {
      return { success: true, message: '没有需要分配的参与者', count: 0 }
    }

    // 获取当前的组状态（包含动态容量）
    const groupStats = await getGroupStats()

    // 按报名顺序分配
    for (const participant of participants) {
      const assignment = calculateBestGroup(
        participant.first_choice as ScenarioGroup,
        participant.second_choice as ScenarioGroup,
        groupStats
      )

      if (assignment) {
        // 更新参与者组别
        await supabase
          .from('workshop_participants')
          .update({ group_id: assignment.groupId })
          .eq('id', participant.id)

        // 更新组计数
        const stats = groupStats.get(assignment.groupName)!
        stats.count++
        groupStats.set(assignment.groupName, stats)

        // 更新数据库中的组计数
        await supabase
          .from('scenario_groups')
          .update({ current_count: stats.count })
          .eq('id', assignment.groupId)
      }
    }

    return {
      success: true,
      message: `成功分配 ${participants.length} 名参与者`,
      count: participants.length
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '分配失败',
      count: 0
    }
  }
}

// 获取分组结果（直接从表查询，避免视图问题）
export async function getGroupResults() {
  const { data, error } = await supabase
    .from('workshop_participants')
    .select(`
      id,
      participant_name,
      first_choice,
      second_choice,
      registration_time,
      group_id
    `)
    .order('registration_time', { ascending: false })

  if (error) throw error

  // 获取所有分组名称映射
  const { data: groups } = await supabase
    .from('scenario_groups')
    .select('id, group_name')

  const groupMap = new Map<number, string>()
  groups?.forEach(g => groupMap.set(g.id, g.group_name))

  // 转换数据格式
  return data?.map(p => ({
    id: p.id,
    participant_name: p.participant_name,
    first_choice: p.first_choice,
    second_choice: p.second_choice,
    assigned_group: p.group_id ? groupMap.get(p.group_id) || null : null,
    registration_time: p.registration_time
  })) || []
}

// 获取分组统计（直接从表查询）
export async function getGroupStatistics() {
  const { data, error } = await supabase
    .from('scenario_groups')
    .select('group_name, max_capacity, current_count')
    .order('current_count', { ascending: true })

  if (error) throw error

  return data?.map(g => ({
    group_name: g.group_name,
    max_capacity: g.max_capacity,
    current_count: g.current_count,
    remaining_slots: Math.max(0, g.max_capacity - g.current_count),
    status: g.current_count >= g.max_capacity ? '已满' :
           g.current_count >= g.max_capacity * 0.8 ? '紧张' : '有位'
  })) || []
}

// 获取当前每组最大容量（从数据库配置获取）
export async function getPerGroupCapacity(): Promise<number> {
  const { data, error } = await supabase
    .from('workshop_sessions')
    .select('max_per_group')
    .limit(1)
    .single()

  if (error) {
    // 如果没有配置，返回默认值10
    return 10
  }

  return data?.max_per_group || 10
}