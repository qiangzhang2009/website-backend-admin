/**
 * 工具数据页面 - 支持日期筛选、导出、趋势图表
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { Card, Row, Col, Table, Tag, Space, Select, Spin, Progress, Empty, Modal, Button, Pagination, DatePicker, Dropdown, Statistic, message } from 'antd'
import { Column, Line } from '@ant-design/charts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { RangePicker } = DatePicker

// 从 URL 参数获取当前租户
function useTenantFromURL() {
  const searchParams = useSearchParams()
  return searchParams.get('tenant') || 'zxqconsulting'
}

interface ToolStat {
  tool: string
  total: number
  completed: number
  abandoned: number
  avgTime: string
  completionRate: number
}

interface RecentInteraction {
  tool_name: string
  action: string
  visitor_id: string
  created_at: string
  input_params?: Record<string, any>
  output_result?: Record<string, any>
  duration_ms?: number
}

interface TrendData {
  date: string
  tool: string
  count: number
  completed: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 工具名称映射
const TOOL_NAMES: Record<string, string> = {
  ai_chat: 'AI智能对话',
  bazi: '八字算命',
  zhanbu: '占卜问卦',
  tarot: '塔罗牌',
  fengshui: '风水布局',
  dream: '周公解梦',
  zodiac: '星座运势',
  mbti: 'MBTI测试',
  palm: '手相分析',
  draw: '抽签',
  naming: '宝宝起名',
  company_naming: '公司起名',
  marriage: '婚配配对',
  huangdi: '黄帝内经',
  lifenumber: '生命灵数',
  ziwei: '紫微斗数',
  zhouyi: '周易预测',
  luckyday: '吉日选择',
  digital: '数字命理',
  daodejing: '道德经',
  question: '问卦',
  market: '市场选择器',
  cost: '成本计算器',
  policy: '政策查询',
  decision: '决策工作台',
  import: '进口商品分析',
  export: '出口市场分析',
  analysis_tab: '市场分析',
  feasibility_analysis: '可行性分析',
  full_analysis: '完整分析',
  home: '首页',
  about: '关于我们',
  contact: '联系我们',
  tools: '工具列表',
}

// 日期快捷选项
const DATE_PRESETS = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '最近7天', value: '7d' },
  { label: '最近30天', value: '30d' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
]

function getDateRange(preset: string): [dayjs.Dayjs, dayjs.Dayjs] {
  const now = dayjs()
  switch (preset) {
    case 'today':
      return [now, now]
    case 'yesterday':
      return [now.subtract(1, 'day'), now.subtract(1, 'day')]
    case '7d':
      return [now.subtract(6, 'day'), now]
    case '30d':
      return [now.subtract(29, 'day'), now]
    case 'thisMonth':
      return [now.startOf('month'), now]
    case 'lastMonth':
      return [now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')]
    default:
      return [now.subtract(6, 'day'), now]
  }
}

export default function ToolsPage() {
  const TENANT = useTenantFromURL()
  const [toolStats, setToolStats] = useState<ToolStat[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [recentInteractions, setRecentInteractions] = useState<RecentInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<RecentInteraction | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  const [selectedTool, setSelectedTool] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('7d')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(getDateRange('7d'))

  // 加载数据
  const loadData = async (page: number = 1, tool: string = selectedTool, dates?: [dayjs.Dayjs, dayjs.Dayjs]) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tenant: TENANT,
        page: page.toString(),
        pageSize: '20',
      })
      if (tool && tool !== 'all') {
        params.set('tool', tool)
      }
      if (dates) {
        params.set('startDate', dates[0].format('YYYY-MM-DD'))
        params.set('endDate', dates[1].format('YYYY-MM-DD'))
      }

      const res = await fetch(`/api/admin/tools?${params}`)
      const data = await res.json()
      setToolStats(data.toolStats ?? [])
      setTrendData(data.trendData ?? [])
      setRecentInteractions(data.recentInteractions ?? [])
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (e) {
      console.error('Tools load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!TENANT) return
    loadData(1, selectedTool, dateRange)
  }, [TENANT])

  // 日期快捷选择
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset)
    const range = getDateRange(preset)
    setDateRange(range)
    loadData(1, selectedTool, range)
  }

  // 自定义日期选择
  const handleDateRangeChange = (dates: any) => {
    if (dates) {
      setDatePreset('')
      setDateRange(dates)
      loadData(1, selectedTool, dates)
    }
  }

  // 分页变化
  const handlePageChange = (page: number) => {
    loadData(page)
  }

  // 工具筛选变化
  const handleToolChange = (tool: string) => {
    setSelectedTool(tool)
    loadData(1, tool, dateRange)
  }

  // 导出功能
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        tenant: TENANT,
        export: format,
      })
      if (selectedTool && selectedTool !== 'all') {
        params.set('tool', selectedTool)
      }
      if (dateRange) {
        params.set('startDate', dateRange[0].format('YYYY-MM-DD'))
        params.set('endDate', dateRange[1].format('YYYY-MM-DD'))
      }

      const response = await fetch(`/api/admin/tools?${params}`)

      if (format === 'json') {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tool_data_${dayjs().format('YYYYMMDD')}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tool_data_${dayjs().format('YYYYMMDD')}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      message.success(`导出${format.toUpperCase()}成功`)
    } catch (e) {
      console.error('Export error:', e)
      message.error('导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 导出菜单
  const exportMenu = {
    items: [
      { key: 'csv', label: '导出 CSV', onClick: () => handleExport('csv') },
      { key: 'json', label: '导出 JSON', onClick: () => handleExport('json') },
    ]
  }

  // 工具选项
  const toolOptions = useMemo(() => [
    { value: 'all', label: '全部工具' },
    ...toolStats.map(t => ({
      value: t.tool,
      label: TOOL_NAMES[t.tool] || t.tool
    }))
  ], [toolStats])

  // 统计卡片数据
  const totalStats = useMemo(() => {
    const totals = toolStats.reduce((acc, t) => ({
      total: acc.total + t.total,
      completed: acc.completed + t.completed,
      abandoned: acc.abandoned + t.abandoned,
    }), { total: 0, completed: 0, abandoned: 0 })
    return totals
  }, [toolStats])

  // 趋势图表配置
  const trendChartData = useMemo(() => {
    // 按日期汇总
    const dateMap = new Map<string, number>()
    trendData.forEach(d => {
      const key = dayjs(d.date).format('MM-DD')
      dateMap.set(key, (dateMap.get(key) || 0) + d.count)
    })
    return Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse()
  }, [trendData])

  const trendConfig = {
    data: trendChartData,
    xField: 'date',
    yField: 'count',
    height: 200,
    smooth: true,
    areaStyle: { fill: 'l(270) 0:#fff 1:#1890ff' },
  }

  const columnConfig = {
    data: toolStats.map(t => ({ ...t, tool: TOOL_NAMES[t.tool] || t.tool })),
    xField: 'tool',
    yField: 'total',
    height: 250,
    label: { position: 'top' as const },
  }

  if (loading && recentInteractions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>
  }

  return (
    <div>
      {/* 顶部筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Select
              value={datePreset}
              style={{ width: 120 }}
              onChange={handleDatePresetChange}
              options={DATE_PRESETS}
              placeholder="日期范围"
            />
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              allowClear={false}
            />
            <Select
              value={selectedTool}
              style={{ width: 150 }}
              onChange={handleToolChange}
              options={toolOptions}
              placeholder="选择工具"
            />
          </div>
          <Space>
            <Button onClick={() => loadData(1, selectedTool, dateRange)} loading={loading}>
              刷新
            </Button>
            <Dropdown menu={exportMenu} trigger={['click']}>
              <Button loading={exporting}>
                导出数据
              </Button>
            </Dropdown>
          </Space>
        </div>
      </Card>

      {/* 统计概览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总使用次数"
              value={totalStats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="完成次数"
              value={totalStats.completed}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="放弃次数"
              value={totalStats.abandoned}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 趋势图表 */}
        <Col xs={24}>
          <Card title="使用趋势（按天统计）">
            {trendChartData.length > 0 ? (
              <Line {...trendConfig} />
            ) : (
              <Empty description="暂无趋势数据" />
            )}
          </Card>
        </Col>

        {/* 工具使用图表 */}
        <Col xs={24}>
          <Card title="各工具使用次数">
            {toolStats.length > 0 ? (
              <Column {...columnConfig} />
            ) : (
              <Empty description="暂无工具使用数据" />
            )}
          </Card>
        </Col>

        {/* 工具详情表格 */}
        <Col xs={24}>
          <Card title="工具使用详情">
            {toolStats.length > 0 ? (
              <Table
                dataSource={toolStats}
                rowKey="tool"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '工具名称',
                    dataIndex: 'tool',
                    key: 'tool',
                    render: (t: string) => <Tag color="blue">{TOOL_NAMES[t] || t}</Tag>,
                  },
                  { title: '总使用次数', dataIndex: 'total', key: 'total', sorter: (a: ToolStat, b: ToolStat) => a.total - b.total },
                  {
                    title: '完成次数',
                    dataIndex: 'completed',
                    key: 'completed',
                    render: (v: number) => <span style={{ color: '#52c41a' }}>{v}</span>,
                  },
                  {
                    title: '放弃次数',
                    dataIndex: 'abandoned',
                    key: 'abandoned',
                    render: (v: number) => <span style={{ color: '#ff4d4f' }}>{v}</span>,
                  },
                  { title: '平均用时', dataIndex: 'avgTime', key: 'avgTime' },
                  {
                    title: '完成率',
                    dataIndex: 'completionRate',
                    key: 'completionRate',
                    render: (rate: number) => (
                      <Progress
                        percent={rate}
                        size="small"
                        status={rate > 70 ? 'success' : rate > 40 ? 'normal' : 'exception'}
                        style={{ width: 120 }}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>

        {/* 使用记录表格 */}
        <Col xs={24}>
          <Card
            title={`工具使用记录（${pagination.total}条）`}
            extra={
              <span style={{ fontSize: 12, color: '#999' }}>
                第 {pagination.page} / {pagination.totalPages} 页
              </span>
            }
          >
            {loading && <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>}

            {!loading && recentInteractions.length > 0 && (
              <>
                <Table
                  dataSource={recentInteractions}
                  rowKey={(r, i) => `${r.tool_name}-${r.created_at}-${i}`}
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: '工具',
                      dataIndex: 'tool_name',
                      key: 'tool_name',
                      render: (v: string) => <Tag color="blue">{TOOL_NAMES[v] || v}</Tag>,
                    },
                    {
                      title: '动作',
                      dataIndex: 'action',
                      key: 'action',
                      render: (v: string) => {
                        const colorMap: Record<string, string> = {
                          complete: 'green', submit: 'green', view: 'green', done: 'green',
                          start: 'blue', switch: 'blue', select: 'blue',
                          abandon: 'red', cancel: 'red', reset: 'red',
                          input: 'orange'
                        }
                        return <Tag color={colorMap[v] || 'default'}>{v}</Tag>
                      },
                    },
                    {
                      title: '访客ID',
                      dataIndex: 'visitor_id',
                      key: 'visitor_id',
                      render: (v: string) => <span style={{ fontSize: 12, color: '#999' }}>{v?.slice(0, 10) || '-'}</span>,
                    },
                    {
                      title: '时间',
                      dataIndex: 'created_at',
                      key: 'created_at',
                      render: (v: string) => dayjs(v).format('MM-DD HH:mm:ss'),
                    },
                    {
                      title: '操作',
                      key: 'detail',
                      render: (_: any, record: RecentInteraction) => (
                        <Button type="link" size="small" onClick={() => {
                          setSelectedRecord(record)
                          setModalVisible(true)
                        }}>
                          详情
                        </Button>
                      ),
                    },
                  ]}
                />

                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Pagination
                    current={pagination.page}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={handlePageChange}
                    showSizeChanger={false}
                    showTotal={(total) => `共 ${total} 条记录`}
                  />
                </div>
              </>
            )}

            {!loading && recentInteractions.length === 0 && (
              <Empty description="暂无记录" />
            )}
          </Card>
        </Col>
      </Row>

      {/* 详情弹窗 */}
      <Modal
        title={`工具使用详情 - ${TOOL_NAMES[selectedRecord?.tool_name || ''] || selectedRecord?.tool_name}`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={[<Button key="close" onClick={() => setModalVisible(false)}>关闭</Button>]}
      >
        {selectedRecord && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="基本信息">
                  <p><strong>访客ID:</strong> {selectedRecord.visitor_id || '-'}</p>
                  <p><strong>动作:</strong> <Tag color={selectedRecord.action === 'complete' ? 'green' : 'red'}>{selectedRecord.action}</Tag></p>
                  <p><strong>时间:</strong> {dayjs(selectedRecord.created_at).format('YYYY-MM-DD HH:mm:ss')}</p>
                  <p><strong>用时:</strong> {selectedRecord.duration_ms ? `${selectedRecord.duration_ms}ms` : '-'}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="输入参数">
                  <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                    {JSON.stringify(selectedRecord.input_params || {}, null, 2)}
                  </pre>
                </Card>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={24}>
                <Card size="small" title="输出结果">
                  <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
                    {JSON.stringify(selectedRecord.output_result || {}, null, 2)}
                  </pre>
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  )
}
