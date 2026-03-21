'use client';

import { useState, useEffect } from 'react';

interface RealtimeData {
  summary: {
    todayVisitors: number;
    todayPageViews: number;
    todayTools: number;
    todayInquiries: number;
    todayEngaged: number;
    todayToolUsers: number;
    visitors24h: number;
    visitors7d: number;
    visitors30d: number;
    activeVisitors: number;
    trend7d?: Array<{ date: string; visitors: number; pageViews: number }>;
  };
  metrics: {
    engagementRate: number;
    toolUsageRate: number;
    conversionRate: number;
    avgPageViewsPerVisitor: number;
  };
  realtime: {
    activeVisitors: number;
    lastUpdate: string;
    recentEvents: Array<{
      type: string;
      page: string;
      visitor: string;
      time: string;
      country: string;
      source: string;
    }>;
    status: string;
  };
}

export default function RealtimeDashboardPage() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState('zxqconsulting');

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/realtime-dashboard?tenant=${tenant}`);
      const result = await response.json();
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 每30秒刷新一次
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [tenant]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载实时数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          错误: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 头部 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">实时数据大屏</h1>
          <p className="text-gray-500 mt-1">实时监控网站运营数据</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="zxqconsulting">主站</option>
            <option value="zero">知几命理</option>
            <option value="global2china">Global2China</option>
            <option value="africa">AfricaZero</option>
          </select>
          <button
            onClick={fetchData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 实时状态 */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100">当前在线访客</p>
            <p className="text-5xl font-bold mt-2">{data?.realtime.activeVisitors || 0}</p>
            <p className="text-green-100 mt-2">🟢 实时更新</p>
          </div>
          <div className="text-right">
            <p className="text-green-100">最后更新</p>
            <p className="text-xl font-mono mt-2">
              {data?.realtime.lastUpdate 
                ? new Date(data.realtime.lastUpdate).toLocaleTimeString('zh-CN')
                : '--'}
            </p>
          </div>
        </div>
      </div>

      {/* 今日数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="今日访客"
          value={data?.summary.todayVisitors || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="今日浏览"
          value={data?.summary.todayPageViews || 0}
          icon="📄"
          color="indigo"
        />
        <StatCard
          title="工具使用"
          value={data?.summary.todayTools || 0}
          icon="🔧"
          color="purple"
        />
        <StatCard
          title="今日询盘"
          value={data?.summary.todayInquiries || 0}
          icon="💬"
          color="green"
        />
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="参与度"
          value={`${data?.metrics.engagementRate || 0}%`}
          description="浏览超过3页的用户占比"
          color="orange"
        />
        <MetricCard
          title="工具使用率"
          value={`${data?.metrics.toolUsageRate || 0}%`}
          description="使用工具的用户占比"
          color="cyan"
        />
        <MetricCard
          title="转化率"
          value={`${data?.metrics.conversionRate || 0}%`}
          description="提交询盘的用户占比"
          color="rose"
        />
        <MetricCard
          title="平均浏览"
          value={data?.metrics.avgPageViewsPerVisitor?.toFixed(1) || '0'}
          description="每访客平均页面浏览数"
          color="amber"
        />
      </div>

      {/* 时间维度数据 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-gray-500">24小时访客</p>
          <p className="text-3xl font-bold mt-2">{data?.summary.visitors24h || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-gray-500">7天访客</p>
          <p className="text-3xl font-bold mt-2">{data?.summary.visitors7d || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-gray-500">30天访客</p>
          <p className="text-3xl font-bold mt-2">{data?.summary.visitors30d || 0}</p>
        </div>
      </div>

      {/* 最近活动 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">最近活动</h2>
        <div className="space-y-3">
          {data?.realtime.recentEvents?.slice(0, 5).map((event, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {event.type === 'page_view' ? '📄' : 
                   event.type === 'click' ? '👆' : 
                   event.type === 'tool_interaction' ? '🔧' : '📝'}
                </span>
                <div>
                  <p className="font-medium">{event.page || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">
                    {event.country} • {event.source} • {event.visitor}
                  </p>
                </div>
              </div>
              <span className="text-sm text-gray-400">
                {event.time ? new Date(event.time).toLocaleTimeString('zh-CN') : '--'}
              </span>
            </div>
          ))}
          {(!data?.realtime.recentEvents || data.realtime.recentEvents.length === 0) && (
            <p className="text-gray-500 text-center py-8">暂无活动数据</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { 
  title: string; 
  value: number; 
  icon: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
        </div>
        <span className={`text-3xl p-3 rounded-xl ${colors[color]}`}>{icon}</span>
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, color }: { 
  title: string; 
  value: string | number; 
  description: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className={`text-2xl font-bold ${colors[color].split(' ')[1]}`}>{value}</div>
      <p className="font-medium mt-1">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
  );
}
