import { useState, useEffect } from 'react'

interface Group {
  id: number
  name: string
  participants: string[]
}

export default function GroupResults() {
  const [groups, setGroups] = useState<Group[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 简单的分组算法：轮流转入不同组
  const generateGroups = (participants: string[], groupCount: number = 10) => {
    const shuffled = [...participants].sort(() => Math.random() - 0.5)
    const newGroups: Group[] = Array.from({ length: groupCount }, (_, i) => ({
      id: i + 1,
      name: `第${i + 1}组`,
      participants: []
    }))

    shuffled.forEach((name, index) => {
      const groupIndex = index % groupCount
      newGroups[groupIndex].participants.push(name)
    })

    return newGroups
  }

  const handleGenerate = () => {
    setIsLoading(true)
    setTimeout(() => {
      // 模拟已有一些参与者
      const mockParticipants = [
        '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
        '郑十一', '王十二', '冯十三', '陈十四', '褚十五', '卫十六',
        '蒋十七', '沈十八', '韩十九', '杨二十', '朱二十一', '秦二十二',
        '尤二十三', '许二十四', '何二十五', '吕二十六', '施二十七', '张二十八',
        '孔二十九', '曹三十', '严三十一', '华三十二', '金三十三', '魏三十四',
        '陶三十五', '姜三十六', '戚三十七', '谢三十八', '邹三十九', '喻四十'
      ]
      const newGroups = generateGroups(mockParticipants, 10)
      setGroups(newGroups)
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">分组结果</h2>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '分组中...' : '重新分组'}
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">暂无分组数据</p>
            <button
              onClick={handleGenerate}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              生成分组
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {groups.map(group => (
              <div key={group.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
                <h3 className="font-bold text-indigo-700 mb-3 text-center border-b border-indigo-200 pb-2">
                  {group.name}
                </h3>
                <ul className="space-y-1">
                  {group.participants.map((name, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="w-5 h-5 bg-indigo-200 rounded-full flex items-center justify-center text-xs text-indigo-700">
                        {idx + 1}
                      </span>
                      {name}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 pt-2 border-t border-indigo-200 text-center text-sm text-indigo-600 font-medium">
                  {group.participants.length}人
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">统计信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{groups.length}</div>
              <div className="text-sm text-gray-600">总分组数</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {groups.reduce((sum, g) => sum + g.participants.length, 0)}
              </div>
              <div className="text-sm text-gray-600">总人数</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(groups.reduce((sum, g) => sum + g.participants.length, 0) / groups.length)}
              </div>
              <div className="text-sm text-gray-600">每组平均</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.max(...groups.map(g => g.participants.length)) - Math.min(...groups.map(g => g.participants.length))}
              </div>
              <div className="text-sm text-gray-600">最大差异</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}