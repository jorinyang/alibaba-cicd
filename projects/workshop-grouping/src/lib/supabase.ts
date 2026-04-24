import { createClient } from '@supabase/supabase-js'
import * as api from './api'

// Mode detection: use Supabase in dev mode if URL is set, otherwise use REST API
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_SUPABASE_URL)

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = USE_SUPABASE ? createClient(supabaseUrl, supabaseAnonKey) : null

// Unified data access layer
export const dataLayer = {
  // Participants
  async getParticipants() {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('workshop_participants')
        .select('*')
        .order('registration_time', { ascending: false })
      if (error) throw error
      return data || []
    }
    return api.getParticipants()
  },

  async createParticipant(participant: {
    participant_name: string
    first_choice: string
    second_choice: string
    device_id?: string
    phone?: string
  }) {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('workshop_participants')
        .insert(participant)
        .select()
        .single()
      if (error) throw error
      return data
    }
    return api.createParticipant(participant)
  },

  async deleteParticipant(id: string) {
    if (USE_SUPABASE && supabase) {
      const { error } = await supabase
        .from('workshop_participants')
        .delete()
        .eq('id', id)
      if (error) throw error
      return
    }
    return api.deleteParticipant(id)
  },

  // Groups
  async getGroupStats() {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('scenario_groups')
        .select('id, group_name, max_capacity, current_count')
      if (error) throw error

      const statsMap = new Map<string, { id: number; count: number; max: number }>()
      data?.forEach((g: any) => {
        statsMap.set(g.group_name, {
          id: g.id,
          count: g.current_count,
          max: g.max_capacity
        })
      })
      return statsMap
    }
    // REST API mode - fetch from groups endpoint
    const groupData = await api.getGroups()
    const statsMap = new Map<string, { id: number; count: number; max: number }>()
    groupData.groups.forEach(g => {
      statsMap.set(g.group_name, {
        id: g.id,
        count: g.current_count,
        max: g.max_capacity
      })
    })
    return statsMap
  },

  async getGroupStatistics() {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('scenario_groups')
        .select('group_name, max_capacity, current_count')
        .order('current_count', { ascending: true })
      if (error) throw error

      return (data || []).map((g: any) => ({
        group_name: g.group_name,
        max_capacity: g.max_capacity,
        current_count: g.current_count,
        remaining_slots: Math.max(0, g.max_capacity - g.current_count),
        status: g.current_count >= g.max_capacity ? '已满' :
                g.current_count >= g.max_capacity * 0.8 ? '紧张' : '有位'
      }))
    }
    return api.getGroupStatistics()
  },

  async getGroupResults() {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('workshop_participants')
        .select('id, participant_name, first_choice, second_choice, registration_time, group_id')
        .order('registration_time', { ascending: false })
      if (error) throw error

      const { data: groups } = await supabase
        .from('scenario_groups')
        .select('id, group_name')

      const groupMap = new Map<number, string>()
      groups?.forEach((g: any) => groupMap.set(g.id, g.group_name))

      return (data || []).map((p: any) => ({
        id: p.id,
        participant_name: p.participant_name,
        first_choice: p.first_choice,
        second_choice: p.second_choice,
        assigned_group: p.group_id ? groupMap.get(p.group_id) || null : null,
        registration_time: p.registration_time
      }))
    }
    return api.getGroupResults()
  },

  // Check user registration
  async checkUserRegistration(deviceId: string): Promise<{ exists: boolean; data: any | null }> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('workshop_participants')
        .select('*')
        .eq('device_id', deviceId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return { exists: !!data, data }
    }
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/participants/check?device_id=${deviceId}`)
    const json = await res.json()
    return { exists: json.exists, data: json.data }
  },

  // Update participant by device_id (for returning users)
  async updateParticipantByDeviceId(deviceId: string, participant: {
    participant_name: string
    first_choice: string
    second_choice: string
    phone?: string
  }) {
    if (USE_SUPABASE && supabase) {
      const { data: existing } = await supabase
        .from('workshop_participants')
        .select('id, group_id')
        .eq('device_id', deviceId)
        .single()

      if (!existing) throw new Error('未找到报名记录')

      const { data, error } = await supabase
        .from('workshop_participants')
        .update({
          ...participant,
          update_time: new Date().toISOString()
        })
        .eq('device_id', deviceId)
        .select()
        .single()

      if (error) throw error
      return data
    }
    // REST mode: need participant ID - get from check first
    const checkRes = await this.checkUserRegistration(deviceId)
    if (!checkRes.exists || !checkRes.data?.id) throw new Error('未找到报名记录')

    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/participants/${checkRes.data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant)
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || '更新失败')
    return json.data
  },

  // Get real-time group status
  async getGroupStatus(): Promise<Array<{
    group_name: string
    max_capacity: number
    current_count: number
    remaining_slots: number
    status: 'available' | 'limited' | 'full'
  }>> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('scenario_groups')
        .select('group_name, max_capacity, current_count')
        .order('current_count', { ascending: true })

      if (error) {
        const { data: backupData } = await supabase
          .from('group_statistics')
          .select('*')
          .order('current_count', { ascending: true })
        return (backupData || []).map((g: any) => ({
          group_name: g.group_name,
          max_capacity: g.max_capacity || 10,
          current_count: g.current_count || 0,
          remaining_slots: Math.max(0, (g.max_capacity || 10) - (g.current_count || 0)),
          status: (g.current_count || 0) >= (g.max_capacity || 10) ? 'full' as const :
                  (g.current_count || 0) >= (g.max_capacity || 10) * 0.8 ? 'limited' as const : 'available' as const
        }))
      }

      const { data: sessionData } = await supabase
        .from('workshop_sessions')
        .select('max_per_group')
        .limit(1)
        .single()

      const maxCap = sessionData?.max_per_group || 10
      return (data || []).map((g: any) => {
        const capacity = g.max_capacity || maxCap
        let status: 'available' | 'limited' | 'full' = 'available'
        if (g.current_count >= capacity) status = 'full'
        else if (g.current_count >= capacity * 0.8) status = 'limited'
        return {
          group_name: g.group_name,
          max_capacity: capacity,
          current_count: g.current_count,
          remaining_slots: Math.max(0, capacity - g.current_count),
          status
        }
      })
    }
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/group-status`)
    const json = await res.json()
    if (!json.success) throw new Error(json.error || '获取分组状态失败')
    return json.data.map((g: any) => ({
      group_name: g.group_name,
      max_capacity: g.max_capacity,
      current_count: g.current_count,
      remaining_slots: g.remaining_slots,
      status: g.status
    }))
  },

  // Config
  async getPerGroupCapacity(): Promise<number> {
    if (USE_SUPABASE && supabase) {
      const { data, error } = await supabase
        .from('workshop_sessions')
        .select('max_per_group')
        .limit(1)
        .single()
      if (error) return 10
      return data?.max_per_group || 10
    }
    // REST mode: derive from groups
    const groupData = await api.getGroups()
    return groupData.groups[0]?.max_capacity || 10
  },

  async saveSessionConfig(config: { total_participants: number; max_per_group: number }) {
    if (USE_SUPABASE && supabase) {
      const { data: existing } = await supabase
        .from('workshop_sessions')
        .select('id')
        .limit(1)
        .single()

      if (existing) {
        await supabase
          .from('workshop_sessions')
          .update({
            total_participants: config.total_participants,
            max_per_group: config.max_per_group
          })
          .eq('id', existing.id)
      } else {
        await supabase.from('workshop_sessions').insert({
          session_name: '武汉工作坊',
          total_participants: config.total_participants,
          max_per_group: config.max_per_group
        })
      }

      // Update all groups capacity
      await supabase
        .from('scenario_groups')
        .update({ max_capacity: config.max_per_group })
        .neq('id', 0)
      return
    }
    return api.updateGroupConfig({ max_per_group: config.max_per_group })
  },

  // Assignment
  async autoAssignGroups() {
    if (USE_SUPABASE && supabase) {
      // Use local algorithm for Supabase mode
      const { data: participants, error: fetchError } = await supabase
        .from('workshop_participants')
        .select('id, first_choice, second_choice')
        .is('group_id', null)
        .order('registration_time', { ascending: true })

      if (fetchError) throw fetchError
      if (!participants || participants.length === 0) {
        return { success: true, message: '没有需要分配的参与者', count: 0 }
      }

      // Local algorithm (moved from groupingAlgorithm.ts)
      const { data: groupsData } = await supabase
        .from('scenario_groups')
        .select('id, group_name, max_capacity, current_count')

      const groupStats = new Map()
      groupsData?.forEach((g: any) => {
        groupStats.set(g.group_name, { id: g.id, count: g.current_count, max: g.max_capacity })
      })

      let count = 0
      for (const p of participants) {
        const assignment = calculateBestGroupLocal(
          p.first_choice,
          p.second_choice,
          groupStats
        )
        if (assignment) {
          await supabase
            .from('workshop_participants')
            .update({ group_id: assignment.groupId })
            .eq('id', p.id)

          const stats = groupStats.get(assignment.groupName)
          stats.count++
          groupStats.set(assignment.groupName, stats)

          await supabase
            .from('scenario_groups')
            .update({ current_count: stats.count })
            .eq('id', assignment.groupId)
          count++
        }
      }
      return { success: true, message: `成功分配 ${count} 名参与者`, count }
    }
    return api.assignGroups()
  },

  async resetAll() {
    if (USE_SUPABASE && supabase) {
      await supabase.from('scenario_groups').update({ current_count: 0 }).neq('id', 0)
      await supabase.from('workshop_participants').update({ group_id: null }).not('group_id', 'is', null)
      return
    }
    return api.resetGroups()
  }
}

// Local grouping algorithm helper
function calculateBestGroupLocal(
  firstChoice: string,
  secondChoice: string,
  groupStats: Map<string, { id: number; count: number; max: number }>
) {
  const first = groupStats.get(firstChoice)
  if (first && first.count < first.max) {
    return { groupId: first.id, groupName: firstChoice, isAuto: false }
  }

  const second = groupStats.get(secondChoice)
  if (second && second.count < second.max) {
    return { groupId: second.id, groupName: secondChoice, isAuto: true }
  }

  let minCount = Infinity
  let minGroup: any = null
  groupStats.forEach((stats, groupName) => {
    if (stats.count < stats.max && stats.count < minCount) {
      minCount = stats.count
      minGroup = { groupId: stats.id, groupName, isAuto: true }
    }
  })
  return minGroup
}

// 10个场景组
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

// 学员信息接口
export interface Participant {
  id: string
  participant_name: string
  first_choice: ScenarioGroup
  second_choice: ScenarioGroup
  group_id: number | null
  registration_time: string
}

// 场景组接口
export interface ScenarioGroupInfo {
  id: number
  group_name: string
  max_capacity: number
  current_count: number
}

