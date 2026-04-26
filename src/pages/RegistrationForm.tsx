import { useState } from 'react'

interface Participant {
  id: string
  name: string
  company: string
  phone: string
}

export default function RegistrationForm() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [formData, setFormData] = useState({ name: '', company: '', phone: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    
    const newParticipant: Participant = {
      id: Date.now().toString(),
      ...formData
    }
    
    setParticipants([...participants, newParticipant])
    setFormData({ name: '', company: '', phone: '' })
  }

  const handleRemove = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">添加参与者</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="姓名 *"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <input
              type="text"
              placeholder="公司/单位"
              value={formData.company}
              onChange={e => setFormData({...formData, company: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <input
              type="tel"
              placeholder="手机号"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              添加
            </button>
            {participants.length >= 10 && (
              <a
                href="/results"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                开始分组 ({participants.length}人)
              </a>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          已报名 ({participants.length}人)
        </h2>
        {participants.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无报名者</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-600">姓名</th>
                  <th className="text-left py-3 px-4 text-gray-600">公司</th>
                  <th className="text-left py-3 px-4 text-gray-600">手机</th>
                  <th className="text-right py-3 px-4 text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {participants.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-gray-600">{p.company || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{p.phone || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRemove(p.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}