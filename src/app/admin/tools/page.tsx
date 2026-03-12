/**
 * 工具数据页面 - 真实数据版 - 支持分页
 */

'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, Row, Col, Table, Tag, Space, Select, Spin, Progress, Empty, message, Modal, Button, Pagination, DatePicker } from 'antd'
import { Column } from '@ant-design/charts'
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
  // 出海工具
  market: '市场选择器',
  cost: '成本计算器',
  policy: '政策查询',
  decision: '决策工作台',
  import: '进口商品分析',
  export: '出口市场分析',
  // 分析工具
  analysis_tab: '市场分析',
  feasibility_analysis: '可行性分析',
  full_analysis: '完整分析',
  // 页面
  home: '首页',
  about: '关于我们',
  contact: '联系我们',
  tools: '工具列表',
}

export default function ToolsPage() {
  const TENANT = useTenantFromURL()
  const [toolStats, setToolStats] = useState<ToolStat[]>([])
  const [recentInteractions, setRecentInteractions] = useState<RecentInteraction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState<RecentInteraction | null>(null)
  const [modalVisible, setModalVisible] = useState(false)

  // 分页状态
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })

  // 筛选状态
  const [selectedTool, setSelectedTool] = useState<string>('all')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)

  // 加载数据
  const loadData = async (page: number = 1, tool: string = selectedTool) => {
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

      const res = await fetch(`/api/admin/tools?${params}`)
      const data = await res.json()
      setToolStats(data.toolStats ?? [])
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
    loadData(1)
  }, [TENANT])

  // 分页变化
  const handlePageChange = (page: number) => {
    loadData(page)
  }

  // 工具筛选变化
  const handleToolChange = (tool: string) => {
    setSelectedTool(tool)
    loadData(1, tool)
  }

  // 获取工具选项
  const toolOptions = [
    { value: 'all', label: '全部工具' },
    ...toolStats.map(t => ({
      value: t.tool,
      label: TOOL_NAMES[t.tool] || t.tool
    }))
  ]

  const columnConfig = {
    data: toolStats.map(t => ({ ...t, tool: TOOL_NAMES[t.tool] || t.tool })),
    xField: 'tool',
    yField: 'total',
    height: 300,
    label: { position: 'top' as const },
  }

  if (loading && recentInteractions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '80px 0' }}><Spin size="large" /></div>
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>工具数据</h2>
        <Space wrap>
          <Select
            value={selectedTool}
            style={{ width: 150 }}
            onChange={handleToolChange}
            options={toolOptions}
            placeholder="选择工具"
          />
          <Button onClick={() => loadData(1)} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card title="各工具使用次数">
            {toolStats.length > 0
              ? <Column {...columnConfig} />
              : <Empty description="暂无工具使用数据，等待用户与工具互动后自动记录" />}
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="工具使用详情">
            {toolStats.length > 0 ? (
              <Table
                dataSource={toolStats}
                rowKey="tool"
                pagination={false}
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
                        style={{ width: 140 }}
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
