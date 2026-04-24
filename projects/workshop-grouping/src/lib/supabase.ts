import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://odrkcmogwtvgxmtqzaau.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcmtjbW9nd3R2Z3htdHF6YWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDgwOTMsImV4cCI6MjA4NTAyNDA5M30.nvPTY1jyfyo2YPZ-okGTDRYc_ZNiDCYW1EWDaunolJw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
