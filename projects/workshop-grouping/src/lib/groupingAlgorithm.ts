import { dataLayer, SCENARIO_GROUPS, type ScenarioGroup } from './supabase'

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
  isAuto?: boolean
}

// 获取所有组的当前状态（包括动态容量）
export async function getGroupStats(): Promise<Map<string, { id: number; count: number; max: number }>> {
  return dataLayer.getGroupStats()
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
    return { groupId: firstGroup.id, groupName: firstChoice, isAuto: false }
  }

  // 第二步：检查第二意向
  const secondGroup = groupStats.get(secondChoice)
  if (secondGroup && secondGroup.count < secondGroup.max) {
    return { groupId: secondGroup.id, groupName: secondChoice, isAuto: true }
  }

  // 第三步：找当前人数最少的组
  let minCount = Infinity
  let minGroup: GroupAssignment | null = null

  groupStats.forEach((stats, groupName) => {
    if (stats.count < stats.max && stats.count < minCount) {
      minCount = stats.count
      minGroup = { groupId: stats.id, groupName, isAuto: true }
    }
  })

  return minGroup
}

// 批量分配所有未分组的参与者
export async function autoAssignAllGroups(): Promise<{ success: boolean; message: string; count: number }> {
  return dataLayer.autoAssignGroups()
}

// 获取分组结果
export async function getGroupResults() {
  return dataLayer.getGroupResults()
}

// 获取分组统计
export async function getGroupStatistics() {
  return dataLayer.getGroupStatistics()
}

// 获取当前每组最大容量
export async function getPerGroupCapacity(): Promise<number> {
  return dataLayer.getPerGroupCapacity()
}
