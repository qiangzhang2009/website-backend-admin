'use client'

import { useEffect } from 'react'
import { Alert, Button, Space, Badge } from 'antd'
import { useAnomalyDetection, AnomalyAlert } from '@/hooks/useAnomalyDetection'
import { speakText } from '@/components/VoiceCommandPanel'

interface AnomalyAlertPanelProps {
  metrics: {
    visitors?: number
    pageViews?: number
    conversionRate?: number
    bounceRate?: number
    inquiries?: number
    leads?: number
    yesterdayVisitors?: number
    yesterdayPageViews?: number
    yesterdayConversionRate?: number
    yesterdayBounceRate?: number
    yesterdayInquiries?: number
    yesterdayLeads?: number
  }
  onAlertClick?: (alert: AnomalyAlert) => void
  autoSpeak?: boolean
}

export default function AnomalyAlertPanel({
  metrics,
  onAlertClick,
  autoSpeak = true
}: AnomalyAlertPanelProps) {
  const { alerts, dismissAlert, clearAlerts } = useAnomalyDetection(metrics)

  // Auto-speak alerts when they appear
  useEffect(() => {
    if (autoSpeak && alerts.length > 0) {
      const criticalAlerts = alerts.filter(a => a.type === 'error')
      if (criticalAlerts.length > 0) {
        const message = criticalAlerts.map(a => a.message).join('，')
        speakText(`数据预警：${message}`)
      }
    }
  }, [alerts, autoSpeak])

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <Space>
          <Badge count={alerts.length} />
          <span className="font-medium">数据异常提醒</span>
        </Space>
        <Button size="small" onClick={clearAlerts}>
          全部清除
        </Button>
      </div>

      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          message={alert.message}
          type={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
          showIcon
          closable
          onClose={() => dismissAlert(alert.id)}
          action={
            onAlertClick && (
              <Button size="small" onClick={() => onAlertClick(alert)}>
                查看详情
              </Button>
            )
          }
        />
      ))}
    </div>
  )
}
