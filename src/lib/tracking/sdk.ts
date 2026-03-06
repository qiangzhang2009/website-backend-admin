/**
 * 数据采集SDK - 用于前端网站嵌入
 * 支持埋点、工具交互、表单提交数据采集
 */

export interface TrackingEvent {
  // 基础信息
  event_type: 'page_view' | 'tool_interaction' | 'form_submit' | 'click' | 'custom'
  tenant_slug: string
  website_url: string
  session_id: string
  visitor_id?: string
  
  // 时间戳
  timestamp: string
  
  // 页面信息
  page_url?: string
  page_title?: string
  referrer?: string
  
  // 用户信息
  user_agent?: string
  ip?: string
  geo_country?: string
  geo_city?: string
  
  // 事件数据
  event_data?: Record<string, unknown>
}

// 工具交互数据结构
export interface ToolInteractionData extends Record<string, unknown> {
  tool_name: string
  tool_section: string
  action: 'start' | 'input' | 'submit' | 'abandon' | 'save'
  input_params?: Record<string, unknown>
  output_result?: Record<string, unknown>
  duration_ms?: number
  step_completed?: number
  total_steps?: number
}

// 表单提交数据结构
export interface FormSubmitData extends Record<string, unknown> {
  form_name: string
  form_section: string
  fields: Record<string, unknown>
  submit_result?: 'success' | 'error' | 'abandon'
  time_to_complete_ms?: number
}

// 页面浏览数据结构
export interface PageViewData extends Record<string, unknown> {
  page_path: string
  page_title: string
  viewport_width?: number
  viewport_height?: number
  scroll_depth?: number
  time_on_page_ms?: number
  is_exit?: boolean
}

/**
 * 创建追踪SDK实例
 */
export function createTrackingSDK(tenantSlug: string, options?: { visitorId?: string }) {
  const sessionId = generateSessionId()
  const visitorId = options?.visitorId || generateVisitorId()
  
  // 获取基础信息
  const getBaseData = (): Partial<TrackingEvent> => ({
    tenant_slug: tenantSlug,
    session_id: sessionId,
    visitor_id: visitorId,
    timestamp: new Date().toISOString(),
    website_url: typeof window !== 'undefined' ? window.location.origin : '',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    page_url: typeof window !== 'undefined' ? window.location.href : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
  })
  
  return {
    // 页面浏览追踪
    trackPageView: (data: PageViewData) => {
      const event: TrackingEvent = {
        ...getBaseData(),
        event_type: 'page_view',
        page_url: data.page_path,
        page_title: data.page_title,
        event_data: data,
      } as TrackingEvent
      sendEvent(event)
    },
    
    // 工具交互追踪
    trackToolInteraction: (data: ToolInteractionData) => {
      const event: TrackingEvent = {
        ...getBaseData(),
        event_type: 'tool_interaction',
        event_data: data,
      } as TrackingEvent
      sendEvent(event)
    },
    
    // 表单提交追踪
    trackFormSubmit: (data: FormSubmitData) => {
      const event: TrackingEvent = {
        ...getBaseData(),
        event_type: 'form_submit',
        event_data: data,
      } as TrackingEvent
      sendEvent(event)
    },
    
    // 自定义事件追踪
    trackCustomEvent: (eventName: string, data?: Record<string, unknown>) => {
      const event: TrackingEvent = {
        ...getBaseData(),
        event_type: 'custom',
        event_data: { event_name: eventName, ...data },
      } as TrackingEvent
      sendEvent(event)
    },
    
    // 获取访问者ID
    getVisitorId: () => visitorId,
    
    // 获取会话ID
    getSessionId: () => sessionId,
  }
}

// 发送事件到服务端
function sendEvent(event: TrackingEvent) {
  if (typeof window === 'undefined') return
  
  // 使用 Beacon API 或 fetch 发送数据
  const endpoint = '/api/tracking'
  
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(event)], { type: 'application/json' })
    navigator.sendBeacon(endpoint, blob)
  } else {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {})
  }
}

// 生成会话ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 生成访问者ID (持久化存储)
function generateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  
  const STORAGE_KEY = 'zt_visitor_id'
  
  let visitorId = localStorage.getItem(STORAGE_KEY)
  if (!visitorId) {
    visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(STORAGE_KEY, visitorId)
  }
  return visitorId
}

// 前端嵌入代码示例
export const EMBED_CODE = `
<script>
(function() {
  var tenantSlug = 'YOUR_TENANT_SLUG';
  var visitorId = localStorage.getItem('zt_visitor_id') || 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  if (!localStorage.getItem('zt_visitor_id')) localStorage.setItem('zt_visitor_id', visitorId);
  
  var sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  function track(eventType, eventData) {
    var data = {
      event_type: eventType,
      tenant_slug: tenantSlug,
      session_id: sessionId,
      visitor_id: visitorId,
      timestamp: new Date().toISOString(),
      website_url: window.location.origin,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      event_data: eventData
    };
    
    fetch('/api/tracking', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
      keepalive: true
    }).catch(function() {});
  }
  
  // 页面浏览追踪
  track('page_view', {page_path: window.location.pathname, page_title: document.title});
  
  // 暴露全局函数
  window.zxqTrack = {
    tool: function(toolName, action, params) {
      track('tool_interaction', {tool_name: toolName, action: action, ...params});
    },
    form: function(formName, fields, result) {
      track('form_submit', {form_name: formName, fields: fields, submit_result: result});
    },
    custom: function(eventName, data) {
      track('custom', {event_name: eventName, ...data});
    }
  };
})();
</script>
`
