import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getGroupStatistics, getGroupResults } from '../lib/groupingAlgorithm'

interface GroupStat {
  group_name: string
  max_capacity: number
  current_count: number
  remaining_slots: number
  status: string
}

interface GroupResult {
  participant_name: string
  first_choice: string
  second_choice: string
  assigned_group: string
}

export default function GroupResults() {
  const [stats, setStats] = useState<GroupStat[]>([])
  const [results, setResults] = useState<GroupResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'detail'>('overview')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, resultsData] = await Promise.all([
        getGroupStatistics(),
        getGroupResults()
      ])
      setStats(statsData || [])
      setResults(resultsData || [])
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '已满':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">已满</span>
      case '紧张':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">紧张</span>
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">有位</span>
    }
  }

  const filteredResults = selectedGroup
    ? results.filter(r => r.assigned_group === selectedGroup)
    : results

  const totalParticipants = stats.reduce((sum, s) => sum + s.current_count, 0)
  const totalCapacity = stats.reduce((sum, s) => sum + s.max_capacity, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">分组结果</h2>
          <p className="text-gray-600 text-sm mt-1">
            总计 {totalParticipants} / {totalCapacity} 人已分配
          </p>
        </div>
        <Link
          to="/"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          返回报名
        </Link>
      </div>

      {/* 标签页 */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          分组概览
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'detail'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          详细名单
        </button>
      </div>

      {activeTab === 'overview' ? (
        /* 分组概览视图 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map(group => (
            <div
              key={group.group_name}
              onClick={() => setSelectedGroup(selectedGroup === group.group_name ? null : group.group_name)}
              className={`bg-white rounded-xl shadow-lg p-4 cursor-pointer transition-all ${
                selectedGroup === group.group_name
                  ? 'ring-2 ring-indigo-500'
                  : 'hover:shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">{group.group_name}</h3>
                {getStatusBadge(group.status)}
              </div>

              {/* 进度条 */}
              <div className="mb-2">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      group.current_count >= group.max_capacity
                        ? 'bg-red-500'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${(group.current_count / group.max_capacity) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-800">{group.current_count}</span> / {group.max_capacity}
                </span>
                <span className="text-gray-500">
                  剩余 {group.remaining_slots}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 详细名单视图 */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* 筛选器 */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedGroup(null)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedGroup === null
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                全部
              </button>
              {stats.map(group => (
                <button
                  key={group.group_name}
                  onClick={() => setSelectedGroup(group.group_name)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedGroup === group.group_name
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {group.group_name} ({group.current_count})
                </button>
              ))}
            </div>
          </div>

          {/* 名单表格 */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">第一意向</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">第二意向</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">分配组别</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{result.participant_name}</td>
                      <td className="px-4 py-3 text-gray-600">{result.first_choice}</td>
                      <td className="px-4 py-3 text-gray-600">{result.second_choice}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
                          {result.assigned_group}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 管理员入口 */}
      <div className="mt-6 text-center">
        <Link
          to="/admin"
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          管理入口 →
        </Link>
      </div>
    </div>
  )
}
