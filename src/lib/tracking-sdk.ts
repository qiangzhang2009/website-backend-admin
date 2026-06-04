/**
 * ZxqTrack SDK v2 — 追踪SDK
 *
 * 用于嵌入到客户网站收集访问和用户行为数据
 *
 * v2 Changes from v1:
 * - 统一使用 zxq_visitor_id 作为访客标识
 * - 添加 page_view 事件数据（time_on_page, scroll_depth）
 * - 添加 heartbeat 心跳机制保持会话活跃
 * - 修复 tool_complete/abandon 步骤追踪
 */

export const SDK_VERSION = '2.0.0'

export interface DeviceInfo {
  deviceType: string
  browser: string
  os: string
  screenWidth: number
  screenHeight: number
  language: string
}

export interface GeoInfo {
  country: string
  region: string
  city: string
  isp: string
}

export interface TrackingData {
  event_type: string
  tenant_slug: string
  session_id: string
  visitor_id: string
  timestamp: string
  website_url: string
  page_url: string
  page_title: string
  referrer: string
  user_agent: string
  device_type: string
  browser: string
  os: string
  screen_resolution: string
  language: string
  traffic_source: string
  geo_country: string
  geo_region: string
  geo_city: string
  geo_isp: string
  event_data?: Record<string, unknown>
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent || ''
  let deviceType = 'desktop'
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) deviceType = 'mobile'

  let browser = 'unknown'
  if (ua.indexOf('Firefox') > -1) browser = 'Firefox'
  else if (ua.indexOf('Chrome') > -1) browser = 'Chrome'
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari'
  else if (ua.indexOf('Edge') > -1) browser = 'Edge'

  let os = 'unknown'
  if (ua.indexOf('Windows') > -1) os = 'Windows'
  else if (ua.indexOf('Mac') > -1) os = 'macOS'
  else if (ua.indexOf('Linux') > -1) os = 'Linux'
  else if (ua.indexOf('Android') > -1) os = 'Android'
  else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS'

  return {
    deviceType,
    browser,
    os,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language || 'unknown',
  }
}

function getTrafficSource(): string {
  const referrer = document.referrer || ''
  if (!referrer) return 'direct'
  try {
    const refUrl = new URL(referrer)
    const hostname = refUrl.hostname
    const searchEngines = ['google', 'bing', 'yahoo', 'baidu', 'yandex', 'duckduckgo', 'sogou']
    if (searchEngines.some(se => hostname.indexOf(se) > -1)) return 'search'
    const socialMedia = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'weibo', 'zhihu']
    if (socialMedia.some(sm => hostname.indexOf(sm) > -1)) return 'social'
    return 'referral'
  } catch {
    return 'direct'
  }
}

function getGeoInfo(): Promise<GeoInfo> {
  return new Promise((resolve) => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data && data.country_name) {
          resolve({ country: data.country_name || data.country || '', region: data.region || '', city: data.city || '', isp: data.org || '' })
          return
        }
        fetch('https://ipwho.is/')
          .then(r => r.json())
          .then(data2 => {
            if (data2 && data2.country) {
              resolve({ country: data2.country || '', region: data2.region || '', city: data2.city || '', isp: data2.connection?.isp || '' })
            } else {
              resolve({ country: '', region: '', city: '', isp: '' })
            }
          })
          .catch(() => resolve({ country: '', region: '', city: '', isp: '' }))
      })
      .catch(() => resolve({ country: '', region: '', city: '', isp: '' }))
  })
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

export function createZxqTrack(tenantSlug: string, trackingUrl: string): Record<string, unknown> {
  // v2: 统一使用 zxq_visitor_id，消除 SDK v1 遗留的 zt_visitor_id 漂移
  let visitorId = localStorage.getItem('zxq_visitor_id')
  if (!visitorId) {
    // 迁移：如果存在旧 ID，迁移到新 ID
    const oldId = localStorage.getItem('zt_visitor_id')
    visitorId = oldId || `visitor_${generateId()}`
    localStorage.setItem('zxq_visitor_id', visitorId)
    // 清除旧键
    if (oldId) localStorage.removeItem('zt_visitor_id')
  }

  const sessionId = `session_${generateId()}`
  const deviceInfo = getDeviceInfo()

  // 地理信息异步获取
  let geoInfo: GeoInfo = { country: '', region: '', city: '', isp: '' }
  getGeoInfo().then(info => { geoInfo = info })

  // 会话活跃状态
  let sessionStartTime = Date.now()
  let isSessionActive = true
  let maxScrollDepth = 0
  let timeOnPage = 0
  let pageLoadTime = 0

  const buildData = (eventType: string, eventData?: Record<string, unknown>): TrackingData => ({
    event_type: eventType,
    tenant_slug: tenantSlug,
    session_id: sessionId,
    visitor_id: visitorId!,
    timestamp: new Date().toISOString(),
    website_url: window.location.origin,
    page_url: window.location.href,
    page_title: document.title,
    referrer: document.referrer,
    user_agent: navigator.userAgent,
    device_type: deviceInfo.deviceType,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    screen_resolution: `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`,
    language: deviceInfo.language,
    traffic_source: getTrafficSource(),
    geo_country: geoInfo.country,
    geo_region: geoInfo.region,
    geo_city: geoInfo.city,
    geo_isp: geoInfo.isp,
    event_data: eventData,
  })

  const track = (eventType: string, eventData?: Record<string, unknown>) => {
    const data = buildData(eventType, eventData)
    const body = JSON.stringify(data)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(trackingUrl, body)
    } else {
      fetch(trackingUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
        .catch(() => {})
    }
  }

  // === 滚动追踪 ===
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
    if (scrollPercent > maxScrollDepth) maxScrollDepth = scrollPercent
  })

  // === 页面活跃心跳：每 30 秒上报一次，保持会话数据完整 ===
  setInterval(() => {
    if (isSessionActive) {
      timeOnPage = Math.round((Date.now() - sessionStartTime) / 1000)
      track('heartbeat', {
        session_duration_ms: Date.now() - sessionStartTime,
        time_on_page_seconds: timeOnPage,
        scroll_depth: maxScrollDepth,
        page_path: window.location.pathname,
      })
    }
  }, 30000)

  // === 滚动上报：每 30 秒 ===
  setInterval(() => {
    if (maxScrollDepth > 0) {
      track('scroll', {
        scroll_depth: maxScrollDepth,
        page_path: window.location.pathname,
        scroll_duration_ms: Date.now() - sessionStartTime,
      })
      maxScrollDepth = 0
    }
  }, 30000)

  // === 表单追踪 ===
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    if (form.tagName !== 'FORM') return
    const formName = form.name || form.id || 'anonymous'
    const formData = new FormData(form)
    const fields: Record<string, string> = {}
    formData.forEach((value, key) => { fields[key] = String(value) })
    setTimeout(() => track('form_submit', { form_name: formName, fields, submit_result: 'success' }), 500)
  })

  // === 点击追踪（data-track 属性）===
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const dataAttr = target.getAttribute('data-track')
    if (dataAttr) {
      try {
        track('click', JSON.parse(dataAttr))
      } catch {
        track('click', { element: target.tagName, id: target.id, class: target.className, text: target.innerText.substring(0, 50) })
      }
    }
  })

  // === 页面可见性变化（用户切换标签页）===
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      timeOnPage = Math.round((Date.now() - sessionStartTime) / 1000)
      track('page_leave', {
        duration_seconds: timeOnPage,
        page_path: window.location.pathname,
        scroll_depth: maxScrollDepth,
        visibility_state: 'hidden',
      })
    } else if (document.visibilityState === 'visible') {
      // 用户切回页面，重置计时
      sessionStartTime = Date.now()
      pageLoadTime = 0
    }
  })

  // === 页面离开（beforeunload）===
  window.addEventListener('beforeunload', () => {
    if (!isSessionActive) return
    timeOnPage = Math.round((Date.now() - sessionStartTime) / 1000)
    track('page_leave', {
      duration_seconds: timeOnPage,
      page_path: window.location.pathname,
      scroll_depth: maxScrollDepth,
      visibility_state: 'unload',
    })
    isSessionActive = false
  })

  return {
    // 通用追踪
    track: (eventType: string, eventData?: Record<string, unknown>) => track(eventType, eventData),

    // 页面浏览（v2: 携带丰富 event_data）
    pageView: (pageData?: Record<string, unknown>) => {
      pageLoadTime = Date.now()
      track('page_view', {
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        time_on_page_seconds: 0,
        scroll_depth: 0,
        is_first_pageview: pageLoadTime - sessionStartTime < 1000,
        ...pageData,
      })
    },

    // 工具追踪（v2: 步骤信息写入 event_data）
    tool: (toolName: string, action: string, params?: Record<string, unknown>) => track('tool_interaction', { tool_name: toolName, action, ...params }),

    toolStart: (toolName: string, params?: Record<string, unknown>) => {
      track('tool_start', { module_id: toolName, module_name: toolName, completed_steps: 0, total_steps: null, ...params })
    },

    toolInput: (toolName: string, inputParams: Record<string, unknown>) => track('tool_input', { module_id: toolName, input_params: inputParams }),

    toolOutput: (toolName: string, outputResult: Record<string, unknown>, duration?: number) => track('tool_output', { module_id: toolName, output_result: outputResult, duration_ms: duration }),

    // v2: toolComplete 和 toolAbandon 现在正确传递 completed_steps 和 total_steps
    toolComplete: (toolName: string, result: Record<string, unknown>, duration?: number, completedSteps?: number, totalSteps?: number) => {
      track('tool_complete', {
        module_id: toolName,
        output_result: result,
        duration_ms: duration,
        completed_steps: completedSteps ?? null,
        total_steps: totalSteps ?? null,
      })
    },

    toolAbandon: (toolName: string, completedSteps?: number, totalSteps?: number) => {
      track('tool_abandon', {
        module_id: toolName,
        completed_steps: completedSteps ?? null,
        total_steps: totalSteps ?? null,
      })
    },

    // 表单
    form: (formName: string, fields: Record<string, unknown>, result: string) => track('form_submit', { form_name: formName, fields, submit_result: result }),

    // Chat
    chat: (module: string, userMsg: string, aiMsg: string, action: string) => {
      if (action === 'start') {
        track('chat_start', { module, user_message: userMsg })
      } else if (action === 'response') {
        track('chat_message', { module, user_message: userMsg, ai_message: aiMsg, action })
      }
    },

    chatEnd: (module: string, duration?: number, messageCount?: number) => track('chat_end', { module, duration_seconds: duration, message_count: messageCount }),

    // 画像
    profile: (profileData: Record<string, unknown>, action: string) => track(`profile_${action || 'create'}`, {
      profile_id: profileData.profile_id || 'default',
      profile_type: profileData.profile_type || 'default',
      name: profileData.name,
      avatar: profileData.avatar,
      birthday: profileData.birthday,
      birth_time: profileData.birth_time,
      gender: profileData.gender,
      profile_data: profileData.profile_data || {},
      completeness: profileData.completeness || 0,
    }),

    // 模块
    moduleSelect: (moduleId: string, moduleName: string) => track('module_select', { module_id: moduleId, module_name: moduleName }),
    moduleSwitch: (fromModule: string, toModule: string) => track('module_switch', { from_module: fromModule, to_module: toModule }),

    // 偏好
    preference: (key: string, value: string) => track('preference_update', { preference_key: key, preference_value: value }),

    // 生命周期
    lifecycle: (stage: string, data?: Record<string, unknown>) => track(`lifecycle_${stage}`, data || {}),

    // 自定义事件
    custom: (eventName: string, data?: Record<string, unknown>) => track('custom', { event_name: eventName, ...data }),

    // 获取当前访客 ID（用于外部调用）
    getVisitorId: () => visitorId,
    getSessionId: () => sessionId,
  }
}
