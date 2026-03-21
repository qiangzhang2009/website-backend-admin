/**
 * 系统设置页面
 * 租户配置、功能开关、嵌入代码
 */

'use client'

import { useState } from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Space, message, Alert, Table, Tag } from 'antd'
import { SaveOutlined, CopyOutlined, CheckCircleOutlined, ApiOutlined, CodeOutlined } from '@ant-design/icons'
import { useTheme } from '@/components/AdminLayout'

const { TextArea } = Input

// 租户配置数据
const mockTenantConfig = {
  name: '张小强企业咨询',
  slug: 'zxqconsulting',
  domain: 'www.zxqconsulting.com',
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  features: {
    userProfile: true,
    inquiry: true,
    analytics: true,
    tools: true,
    advancedAnalytics: true,
    mlPrediction: true,
  },
}

export default function SettingsPage() {
  const { textMuted, textPrimary, textSecondary, infoColor, successColor, isDark } = useTheme()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 嵌入代码
  const embedCode = `<script src="https://your-domain.com/api/tracking?tenant=zxqconsulting"></script>`

  // API 示例代码
  const apiExampleCode = `# 获取询盘列表
curl -X GET "https://your-domain.com/api/admin/inquiries?tenant=zxqconsulting" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# 获取统计数据
curl -X GET "https://your-domain.com/api/admin/stats?tenant=zxqconsulting" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# 提交询盘（客户表单提交）
curl -X POST "https://your-domain.com/api/inquiries" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant": "zxqconsulting",
    "name": "张三",
    "email": "zhangsan@example.com",
    "company": "某某公司",
    "product_type": "中医药出口",
    "message": "我想咨询中医药出口资质"
  }'

# 追踪工具使用
curl -X POST "https://your-domain.com/api/tracking" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant": "zxqconsulting",
    "visitor_id": "visitor_123",
    "event_type": "tool_complete",
    "tool_name": "market_analyzer",
    "input_data": {"country": "USA"},
    "output_data": {"feasibility": 85}
  }'`

  // JavaScript SDK 示例
  const jsSdkExample = `<!-- 1. 在网站 <head> 中引入追踪脚本 -->
<script src="https://your-domain.com/api/tracking?tenant=zxqconsulting"></script>

<!-- 2. 初始化（可选配置） -->
<script>
  window.zxqConfig = {
    debug: false,           // 开启调试模式
    autoPageView: true,    // 自动追踪页面浏览
    trackTools: true,      // 自动追踪工具使用
    userId: null           // 登录用户ID（可选）
  };
</script>

<!-- 3. 追踪自定义事件 -->
<script>
  // 追踪表单提交
  window.zxqTrack.form({
    formId: 'contact_form',
    formType: 'inquiry'
  });

  // 追踪工具使用
  window.zxqTrack.tool({
    toolName: 'market_analyzer',
    action: 'complete',
    input: { country: 'USA' },
    output: { score: 85 }
  });

  // 追踪页面事件
  window.zxqTrack.page({
    pageName: 'product_page',
    category: 'content'
  });
</script>`

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      message.success('设置已保存')
    }, 1000)
  }

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode)
    message.success('代码已复制到剪贴板')
  }

  const copyApiExample = () => {
    navigator.clipboard.writeText(apiExampleCode)
    message.success('API示例已复制到剪贴板')
  }

  const copyJsSdk = () => {
    navigator.clipboard.writeText(jsSdkExample)
    message.success('JavaScript SDK代码已复制到剪贴板')
  }

  const items = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <Form layout="vertical" initialValues={mockTenantConfig}>
          <Form.Item label="企业名称" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="租户标识" name="slug">
            <Input disabled />
          </Form.Item>
          <Form.Item label="绑定域名" name="domain">
            <Input placeholder="www.example.com" />
          </Form.Item>
          <Form.Item label="时区" name="timezone">
            <Input />
          </Form.Item>
          <Form.Item label="语言" name="language">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
              保存设置
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'features',
      label: '功能开关',
      children: (
        <div>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>用户画像</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启用户行为分析和标签管理</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.userProfile} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>询盘管理</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启询盘线索管理和跟进记录</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.inquiry} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>基础分析</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启流量分析和转化漏斗</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.analytics} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>工具数据</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启工具使用数据分析</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.tools} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>高级分析</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启高级数据可视化和自定义报表</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.advancedAnalytics} />
            </Space>
          </Card>
          <Card size="small">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>ML预测</div>
                <div style={{ fontSize: 12, color: textMuted }}>开启AI成交预测和智能推荐</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.mlPrediction} />
            </Space>
          </Card>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
              保存设置
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'embed',
      label: '接入代码',
      children: (
        <div>
          <Alert
            message="网站追踪接入"
            description="在您的网站中嵌入以下代码，即可自动采集用户访问行为数据。"
            type="info"
            showIcon
            icon={<CodeOutlined />}
            style={{ marginBottom: 16 }}
          />

          <Card title="追踪脚本代码" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <TextArea
                value={embedCode}
                readOnly
                style={{ flex: 1, fontFamily: 'monospace' }}
                rows={3}
              />
              <Button icon={<CopyOutlined />} onClick={copyEmbedCode} style={{ height: 70 }}>
                复制
              </Button>
            </div>
          </Card>

          <Card title="JavaScript SDK 使用示例" style={{ marginBottom: 16 }}>
            <TextArea
              value={jsSdkExample}
              readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
              rows={20}
            />
            <Button icon={<CopyOutlined />} onClick={copyJsSdk} style={{ marginTop: 8 }}>
              复制代码
            </Button>
          </Card>

          <Card title="功能说明">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircleOutlined style={{ color: successColor, marginTop: 4 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>自动追踪</div>
                  <div style={{ fontSize: 12, color: textMuted }}>
                    页面浏览、停留时长、跳出率等基础指标自动采集
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircleOutlined style={{ color: successColor, marginTop: 4 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>工具交互追踪</div>
                  <div style={{ fontSize: 12, color: textMuted }}>
                    调用 window.zxqTrack.tool() 追踪用户使用工具的行为和结果
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircleOutlined style={{ color: successColor, marginTop: 4 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>询盘表单追踪</div>
                  <div style={{ fontSize: 12, color: textMuted }}>
                    调用 window.zxqTrack.form() 追踪客户提交询盘的行为
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <CheckCircleOutlined style={{ color: successColor, marginTop: 4 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>访客识别</div>
                  <div style={{ fontSize: 12, color: textMuted }}>
                    自动识别回头客，关联同一访客的多次访问记录
                  </div>
                </div>
              </div>
            </Space>
          </Card>
        </div>
      ),
    },
    {
      key: 'api',
      label: 'API配置',
      children: (
        <div>
          <Alert
            message="API 接口说明"
            description="通过 API 可以程序化获取数据或提交询盘信息。"
            type="info"
            showIcon
            icon={<ApiOutlined />}
            style={{ marginBottom: 16 }}
          />

          <Card title="接口地址" style={{ marginBottom: 16 }}>
            <div style={{ color: textSecondary }}>
              <div style={{ marginBottom: 8 }}>
                <code style={{ background: isDark ? '#374151' : '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                  https://your-domain.com/api/admin/*
                </code>
                - 后台管理接口（需要管理员权限）
              </div>
              <div>
                <code style={{ background: isDark ? '#374151' : '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                  https://your-domain.com/api/inquiries
                </code>
                - 公开接口（提交询盘，无需认证）
              </div>
            </div>
          </Card>

          <Card title="API 使用示例" style={{ marginBottom: 16 }}>
            <TextArea
              value={apiExampleCode}
              readOnly
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
              rows={18}
            />
            <Button icon={<CopyOutlined />} onClick={copyApiExample} style={{ marginTop: 8 }}>
              复制示例代码
            </Button>
          </Card>

          <Card title="可用接口列表">
            <Table
              size="small"
              pagination={false}
              dataSource={[
                { method: 'GET', path: '/api/admin/inquiries', desc: '获取询盘列表' },
                { method: 'GET', path: '/api/admin/users', desc: '获取用户列表' },
                { method: 'GET', path: '/api/admin/leads', desc: '获取线索列表' },
                { method: 'GET', path: '/api/admin/stats', desc: '获取统计数据' },
                { method: 'GET', path: '/api/admin/traffic', desc: '获取流量数据' },
                { method: 'GET', path: '/api/admin/analytics', desc: '获取分析数据' },
                { method: 'GET', path: '/api/admin/export', desc: '导出数据CSV' },
                { method: 'POST', path: '/api/inquiries', desc: '提交询盘' },
                { method: 'POST', path: '/api/tracking', desc: '提交追踪事件' },
              ]}
              columns={[
                {
                  title: '方法',
                  dataIndex: 'method',
                  key: 'method',
                  render: (v: string) => (
                    <Tag color={v === 'GET' ? 'blue' : 'green'}>{v}</Tag>
                  ),
                },
                {
                  title: '接口路径',
                  dataIndex: 'path',
                  key: 'path',
                  render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code>,
                },
                {
                  title: '说明',
                  dataIndex: 'desc',
                  key: 'desc',
                },
              ]}
            />
          </Card>

          <Form layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item label="API密钥">
              <Input.Password defaultValue="sk_live_xxxxxxxxxxxxx" />
            </Form.Item>
            <Form.Item label="Webhook地址">
              <Input placeholder="https://your-domain.com/api/webhook" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24, color: textPrimary }}>系统设置</h2>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>
    </div>
  )
}
