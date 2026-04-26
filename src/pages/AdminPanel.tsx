import { useState } from 'react'

interface Config {
  groupCount: number
  strategy: 'random' | 'company' | 'balance'
  enableExport: boolean
}

export default function AdminPanel() {
  const [config, setConfig] = useState<Config>({
    groupCount: 10,
    strategy: 'random',
    enableExport: true
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // 保存配置到本地存储
    localStorage.setItem('workshop-config', JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">管理面板</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分组数量
            </label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.groupCount}
              onChange={e => setConfig({...config, groupCount: parseInt(e.target.value) || 10})}
              className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              分组策略
            </label>
            <select
              value={config.strategy}
              onChange={e => setConfig({...config, strategy: e.target.value as Config['strategy']})}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="random">随机分配</option>
              <option value="company">按公司分组</option>
              <option value="balance">均衡分配</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableExport"
              checked={config.enableExport}
              onChange={e => setConfig({...config, enableExport: e.target.checked})}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="enableExport" className="text-sm font-medium text-gray-700">
              启用导出功能
            </label>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              保存配置
            </button>
            {saved && (
              <span className="ml-4 text-green-600 font-medium">✓ 配置已保存</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">数据管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors">
            导出分组结果
          </button>
          <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors">
            清空所有数据
          </button>
          <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors">
            重置系统
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">系统信息</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>版本: 1.0.0</p>
          <p>最后更新: 2026-04-27</p>
          <p>数据库: Supabase</p>
        </div>
      </div>
    </div>
  )
}