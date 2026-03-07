/**
 * 用户档案管理页面
 */
'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Profile {
  id: string
  visitorId: string
  profileId: string
  profileType: string
  name: string | null
  avatar: string | null
  birthday: string | null
  birthTime: string | null
  gender: string | null
  profileData: Record<string, unknown>
  profileCompleteness: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const PROFILE_TYPES: Record<string, string> = {
  default: '默认档案',
  bazi: '八字档案',
  fengshui: '风水档案',
  tarot: '塔罗档案',
  palm: '手相档案',
  dream: '梦境档案',
  zodiac: '星座档案',
  mbti: 'MBTI档案',
}

export default function ProfilesPage() {
  const searchParams = useSearchParams()
  const tenant = searchParams.get('tenant') || 'zxqconsulting'
  
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    fetchProfiles()
  }, [tenant, selectedType])

  async function fetchProfiles() {
    setLoading(true)
    try {
      const url = new URL(`/api/admin/profiles?tenant=${tenant}`)
      if (selectedType) url.searchParams.append('profile_type', selectedType)
      
      const res = await fetch(url.toString())
      const data = await res.json()
      
      if (data.data) {
        setProfiles(data.data)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProfiles = profiles.filter(p => 
    !filter || 
    p.name?.includes(filter) || 
    p.visitorId?.includes(filter) ||
    p.profileId?.includes(filter)
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户档案管理</h1>
        <div className="text-sm text-gray-500">
          共 {total} 条档案记录
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="搜索档案..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg w-64"
        />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">全部类型</option>
          {Object.entries(PROFILE_TYPES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* 档案列表 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无档案数据</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">档案ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">出生日期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">性别</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">完整度</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {profile.profileId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {PROFILE_TYPES[profile.profileType] || profile.profileType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {profile.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.birthday || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {profile.gender || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            profile.profileCompleteness >= 80 ? 'bg-green-500' :
                            profile.profileCompleteness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${profile.profileCompleteness}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{profile.profileCompleteness}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(profile.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{total}</div>
          <div className="text-sm text-gray-500">总档案数</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {profiles.filter(p => p.profileCompleteness >= 80).length}
          </div>
          <div className="text-sm text-gray-500">完整档案</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-yellow-600">
            {profiles.filter(p => p.profileCompleteness >= 50 && p.profileCompleteness < 80).length}
          </div>
          <div className="text-sm text-gray-500">中等完整</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">
            {profiles.filter(p => p.profileCompleteness < 50).length}
          </div>
          <div className="text-sm text-gray-500">不完整</div>
        </div>
      </div>
    </div>
  )
}
