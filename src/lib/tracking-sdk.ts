/**
 * ZxqTrack SDK 源码
 * 追踪SDK — 用于嵌入到客户网站收集访问和用户行为数据
 *
 * 此文件已从 tracking/route.ts 中拆分出来，便于独立维护和版本管理
 */

export const SDK_VERSION = '1.0.0'

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

export function createZxqTrack(tenantSlug: string, trackingUrl: string): Record<string, unknown> {
  const visitorId = localStorage.getItem('zt_visitor_id') || `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  if (!localStorage.getItem('zt_visitor_id')) localStorage.setItem('zt_visitor_id', visitorId)

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const deviceInfo = getDeviceInfo()
  const geoInfoPromise = getGeoInfo()
  let geoInfo: GeoInfo = { country: '', region: '', city: '', isp: '' }

  geoInfoPromise.then(info => { geoInfo = info })

  const buildData = (eventType: string, eventData?: Record<string, unknown>): TrackingData => ({
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

  let currentModule: string | null = null
  let conversationTurns = 0
  const pageStartTime = Date.now()

  window.addEventListener('beforeunload', () => {
    track('page_leave', { duration_seconds: Math.round((Date.now() - pageStartTime) / 1000), page_path: window.location.pathname })
  })

  let maxScroll = 0
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
    if (scrollPercent > maxScroll) maxScroll = scrollPercent
  })
  setInterval(() => {
    if (maxScroll > 0) {
      track('scroll', { scroll_depth: maxScroll, page_path: window.location.pathname })
      maxScroll = 0
    }
  }, 30000)

  // 自动表单追踪
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement
    if (form.tagName !== 'FORM') return
    const formName = form.name || form.id || 'anonymous'
    const formData = new FormData(form)
    const fields: Record<string, string> = {}
    formData.forEach((value, key) => { fields[key] = String(value) })
    setTimeout(() => track('form_submit', { form_name: formName, fields, submit_result: 'success' }), 500)
  })

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

  return {
    track: (eventType: string, eventData?: Record<string, unknown>) => track(eventType, eventData),
    pageView: (pageData?: Record<string, unknown>) => track('page_view', pageData || {}),
    tool: (toolName: string, action: string, params?: Record<string, unknown>) => track('tool_interaction', { tool_name: toolName, action, ...params }),
    toolStart: (toolName: string, params?: Record<string, unknown>) => {
      currentModule = toolName; conversationTurns = 0
      track('tool_start', { module_id: toolName, module_name: toolName, ...params })
    },
    toolInput: (toolName: string, inputParams: Record<string, unknown>) => track('tool_input', { module_id: toolName, input_params: inputParams }),
    toolOutput: (toolName: string, outputResult: Record<string, unknown>, duration?: number) => track('tool_output', { module_id: toolName, output_result: outputResult, duration_ms: duration }),
    toolComplete: (toolName: string, result: Record<string, unknown>, duration?: number, steps?: number) => {
      track('tool_complete', { module_id: toolName, output_result: result, duration_ms: duration, completed_steps: steps })
      currentModule = null
    },
    toolAbandon: (toolName: string, completedSteps?: number, totalSteps?: number) => {
      track('tool_abandon', { module_id: toolName, completed_steps: completedSteps, total_steps: totalSteps })
      currentModule = null
    },
    form: (formName: string, fields: Record<string, unknown>, result: string) => track('form_submit', { form_name: formName, fields, submit_result: result }),
    chat: (module: string, userMsg: string, aiMsg: string, action: string) => {
      if (action === 'start') {
        currentModule = module; conversationTurns = 1
        track('chat_start', { module, user_message: userMsg })
      } else if (action === 'response') {
        conversationTurns++
        track('chat_message', { module, user_message: userMsg, ai_message: aiMsg, action, conversation_turns: conversationTurns })
      }
    },
    chatEnd: (module: string, duration?: number, messageCount?: number) => {
      track('chat_end', { module, duration_seconds: duration, message_count: messageCount })
      currentModule = null
    },
    profile: (profileData: Record<string, unknown>, action: string) => {
      track(`profile_${action || 'create'}`, {
        profile_id: profileData.profile_id || 'default',
        profile_type: profileData.profile_type || 'default',
        name: profileData.name,
        avatar: profileData.avatar,
        birthday: profileData.birthday,
        birth_time: profileData.birth_time,
        gender: profileData.gender,
        profile_data: profileData.profile_data || {},
        completeness: profileData.completeness || 0,
      })
    },
    moduleSelect: (moduleId: string, moduleName: string) => track('module_select', { module_id: moduleId, module_name: moduleName }),
    moduleSwitch: (fromModule: string, toModule: string) => track('module_switch', { from_module: fromModule, to_module: toModule }),
    preference: (key: string, value: string) => track('preference_update', { preference_key: key, preference_value: value }),
    lifecycle: (stage: string, data?: Record<string, unknown>) => track(`lifecycle_${stage}`, data || {}),
    custom: (eventName: string, data?: Record<string, unknown>) => track('custom', { event_name: eventName, ...data }),
  }
}
