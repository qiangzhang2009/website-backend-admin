/**
 * 系统设置页面
 * 租户配置、功能开关、嵌入代码
 */

'use client'

import { useState } from 'react'
import { Card, Tabs, Form, Input, Button, Switch, Space, message } from 'antd'
import { SaveOutlined, CopyOutlined } from '@ant-design/icons'

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
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')

  // 嵌入代码
  const embedCode = `<script src="https://your-domain.com/api/tracking?tenant=zxqconsulting"></script>`

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
                <div style={{ fontSize: 12, color: '#888' }}>开启用户行为分析和标签管理</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.userProfile} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>询盘管理</div>
                <div style={{ fontSize: 12, color: '#888' }}>开启询盘线索管理和跟进记录</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.inquiry} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>基础分析</div>
                <div style={{ fontSize: 12, color: '#888' }}>开启流量分析和转化漏斗</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.analytics} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>工具数据</div>
                <div style={{ fontSize: 12, color: '#888' }}>开启工具使用数据分析</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.tools} />
            </Space>
          </Card>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>高级分析</div>
                <div style={{ fontSize: 12, color: '#888' }}>开启高级数据可视化和自定义报表</div>
              </div>
              <Switch defaultChecked={mockTenantConfig.features.advancedAnalytics} />
            </Space>
          </Card>
          <Card size="small">
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <div>
                <div>ML预测</div>
                <div style={{ fontSize: 12, color: '#888' }}>开启AI成交预测和智能推荐</div>
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
          <div style={{ marginBottom: 16 }}>
            <p>在您的网站中嵌入以下代码即可开始采集数据：</p>
          </div>
          <Card>
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
          <Card style={{ marginTop: 16 }} title="使用说明">
            <ol style={{ paddingLeft: 20 }}>
              <li>将上述代码复制到您网站HTML的 <code>&lt;head&gt;</code> 标签中</li>
              <li>将 <code>your-domain.com</code> 替换为实际域名</li>
              <li>如需追踪工具交互，在工具事件触发时调用 <code>window.zxqTrack.tool()</code></li>
              <li>如需追踪表单提交，在表单提交成功时调用 <code>window.zxqTrack.form()</code></li>
            </ol>
          </Card>
        </div>
      ),
    },
    {
      key: 'api',
      label: 'API配置',
      children: (
        <Form layout="vertical">
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
      ),
    },
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>系统设置</h2>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
      </Card>
    </div>
  )
}
