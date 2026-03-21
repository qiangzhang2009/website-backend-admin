import { NextResponse } from 'next/server';

// 追踪 SDK 源码 - 增强版
// 包含完整的 duration 字段采集
const SDK_SOURCE = `/**
 * 统一网站追踪 SDK - 增强版
 * 适用于: zxqconsulting-web1, zero2, import-website
 * 版本: 1.1.0
 * 包含完整的 duration 字段采集
 */
(function(global) {
  'use strict';
  
  var config = { 
    tenantSlug: '', 
    apiUrl: '/api/tracking', 
    sessionTimeout: 1800000, // 30分钟
    debug: false 
  };
  
  var visitorId = '', sessionId = '', sessionStartTime = 0, pageStartTime = 0;
  var toolStartTimes = {}; // 记录每个工具的开始时间
  
  // 生成唯一ID
  function generateId(prefix) { 
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); 
  }
  
  // 获取设备信息
  function getDeviceInfo() {
    if (typeof window === 'undefined') return {};
    var ua = navigator.userAgent, deviceType = 'desktop';
    if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet';
    else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) deviceType = 'mobile';
    var browser = 'unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    var os = 'unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return { deviceType: deviceType, browser: browser, os: os, screenWidth: window.screen.width, screenHeight: window.screen.height, language: navigator.language || 'unknown' };
  }
  
  // 获取流量来源
  function getTrafficSource() {
    if (typeof document === 'undefined') return 'direct';
    var referrer = document.referrer;
    if (!referrer) return 'direct';
    try {
      var refUrl = new URL(referrer), hostname = refUrl.hostname;
      var searchEngines = ['google', 'bing', 'yahoo', 'baidu', 'yandex', 'duckduckgo', 'sogou'];
      if (searchEngines.some(function(se) { return hostname.includes(se); })) return 'search';
      var socialMedia = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'weibo', 'zhihu'];
      if (socialMedia.some(function(sm) { return hostname.includes(sm); })) return 'social';
      return 'referral';
    } catch { return 'direct'; }
  }
  
  // 获取/创建访客ID
  function getVisitorId() {
    if (visitorId) return visitorId;
    var storageKey = 'zxq_visitor_id', id = global.localStorage && global.localStorage.getItem(storageKey);
    if (!id) { id = generateId('visitor'); global.localStorage && global.localStorage.setItem(storageKey, id); }
    visitorId = id;
    return id;
  }
  
  // 获取/创建会话ID
  function getSessionId() {
    if (sessionId) return sessionId;
    var storageKey = 'zxq_session_id', timeKey = 'zxq_session_time', now = Date.now();
    var id = global.sessionStorage && global.sessionStorage.getItem(storageKey);
    var sessionTime = parseInt((global.sessionStorage && global.sessionStorage.getItem(timeKey)) || '0');
    if (!id || (now - sessionTime > config.sessionTimeout)) {
      id = generateId('session');
      global.sessionStorage && global.sessionStorage.setItem(storageKey, id);
      global.sessionStorage && global.sessionStorage.setItem(timeKey, now.toString());
      sessionStartTime = now;
    } else { sessionStartTime = sessionTime; }
    sessionId = id;
    return id;
  }
  
  // 获取会话时长 (毫秒)
  function getSessionDuration() { return Date.now() - sessionStartTime; }
  
  // 获取页面停留时间 (毫秒)
  function getPageDuration() { return Date.now() - pageStartTime; }
  
  // 发送追踪数据
  function send(eventType, eventData) {
    if (typeof window === 'undefined') return;
    var deviceInfo = getDeviceInfo();
    var payload = {
      event_type: eventType,
      tenant_slug: config.tenantSlug,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      timestamp: new Date().toISOString(),
      website_url: window.location.origin,
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      // 设备信息
      device_type: deviceInfo.deviceType || 'unknown',
      browser: deviceInfo.browser || 'unknown',
      os: deviceInfo.os || 'unknown',
      screen_resolution: deviceInfo.screenWidth && deviceInfo.screenHeight ? deviceInfo.screenWidth + 'x' + deviceInfo.screenHeight : 'unknown',
      language: deviceInfo.language || 'unknown',
      // 访问来源
      traffic_source: getTrafficSource(),
      // 时长信息 (关键字段)
      session_duration_ms: getSessionDuration(),
      page_duration_ms: getPageDuration(),
      // 事件数据
      event_data: eventData || {}
    };
    if (config.debug) console.log('[ZxqTrack]', eventType, payload);
    if (navigator.sendBeacon) { var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' }); navigator.sendBeacon(config.apiUrl, blob); }
    else { fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(function() {}); }
  }
  
  // 页面浏览追踪
  function trackPageView(additionalData) {
    send('page_view', { 
      page_path: typeof window !== 'undefined' ? window.location.pathname : '', 
      page_title: typeof document !== 'undefined' ? document.title : '', 
      viewport_width: typeof window !== 'undefined' ? window.innerWidth : 0,
      viewport_height: typeof window !== 'undefined' ? window.innerHeight : 0,
      // 添加页面停留时间估算
      time_on_page_ms: getPageDuration(),
      ...additionalData 
    });
  }
  
  // 点击追踪
  function trackClick(label, category, data) { 
    send('click', { 
      element: 'link', 
      label: label, 
      category: category || 'general',
      click_duration_ms: pageStartTime ? Date.now() - pageStartTime : 0,
      ...data 
    }); 
  }
  
  // 表单提交追踪
  function trackFormSubmit(formName, success, fields) { 
    send('form_submit', { 
      form_name: formName, 
      submit_result: success ? 'success' : 'error', 
      fields: fields || {},
      // 从表单开始到提交的时间
      form_completion_time_ms: pageStartTime ? Date.now() - pageStartTime : 0,
      // 提取业务意向数据
      visitor_name: fields && (fields.name || fields['姓名'] || ''),
      visitor_email: fields && (fields.email || fields['邮箱'] || ''),
      visitor_phone: fields && (fields.phone || fields['电话'] || ''),
      company_name: fields && (fields.company || fields['公司名称'] || ''),
      product_type: fields && (fields.productType || fields['产品类型'] || ''),
      target_market: fields && (fields.targetMarket || fields['目标市场'] || ''),
      message: fields && (fields.message || fields['需求'] || fields['询价内容'] || '')
    }); 
  }
  
  // 工具交互追踪 - 增强版
  function trackToolInteraction(toolName, action, data) {
    var now = Date.now();
    var eventPayload = { 
      tool_name: toolName, 
      action: action,
      // 计算工具使用时长
      duration_ms: 0,
      duration_seconds: 0
    };
    
    // 记录工具开始时间
    if (action === 'start' || action === 'input') {
      toolStartTimes[toolName] = now;
    }
    
    // 计算工具使用时长
    if (toolStartTimes[toolName] && (action === 'complete' || action === 'abandon' || action === 'submit')) {
      var toolDuration = now - toolStartTimes[toolName];
      eventPayload.duration_ms = toolDuration;
      eventPayload.duration_seconds = Math.round(toolDuration / 1000);
      delete toolStartTimes[toolName];
    }
    
    // 添加步骤进度
    if (data) {
      if (data.completedSteps !== undefined || data.totalSteps !== undefined) {
        eventPayload.completed_steps = data.completedSteps || 0;
        eventPayload.total_steps = data.totalSteps || 1;
        eventPayload.progress_percent = data.totalSteps ? Math.round((data.completedSteps / data.totalSteps) * 100) : 0;
      }
      // 标记是否放弃
      if (action === 'abandon') {
        eventPayload.is_abandoned = true;
      }
      // 标记是否完成
      if (action === 'complete') {
        eventPayload.is_completed = true;
      }
    }
    
    send('tool_interaction', eventPayload);
  }
  
  // AI 分析追踪 - 专用方法
  function trackAIAnalysis(analysisType, action, params) {
    var now = Date.now();
    var payload = {
      tool_name: analysisType,
      action: action,
      // AI 分析特有字段
      analysis_mode: params && params.analysisMode,
      product_type: params && (params.productType || params.product_type),
      target_region: params && (params.targetRegion || params.target_market),
      user_role: params && (params.userRole || params.user_role),
      business_stage: params && (params.businessStage || params.business_stage),
      // 计算使用时长
      duration_ms: params && params.startTime ? now - params.startTime : 0,
      duration_seconds: params && params.startTime ? Math.round((now - params.startTime) / 1000) : 0,
      // 结果数据
      result_summary: params && params.resultSummary,
      ai_result_content: params && params.aiResultContent,
      ai_result_length: params && params.aiResultLength,
      // 步骤进度
      completed_steps: params && params.completedSteps,
      total_steps: params && params.totalSteps,
      // 标记状态
      is_abandoned: action === 'abandon',
      is_completed: action === 'complete'
    };
    send('tool_interaction', payload);
  }
  
  // 滚动追踪
  function trackScroll(depth) { 
    send('scroll', { 
      scroll_depth: depth, 
      page_path: typeof window !== 'undefined' ? window.location.pathname : '',
      scroll_duration_ms: pageStartTime ? Date.now() - pageStartTime : 0
    }); 
  }
  
  // 自定义事件
  function trackCustom(eventName, data) { 
    send('custom', { 
      event_name: eventName,
      custom_duration_ms: pageStartTime ? Date.now() - pageStartTime : 0,
      ...data 
    }); 
  }
  
  // 自动追踪初始化
  var autoTracked = false;
  function initAutoTracking() {
    if (autoTracked || typeof window === 'undefined') return;
    autoTracked = true;
    
    // 重置页面开始时间
    pageStartTime = Date.now();
    
    // 页面浏览追踪
    trackPageView();
    
    // 页面离开事件 - 记录完整页面停留时间
    global.addEventListener('beforeunload', function() {
      var duration = Math.round((Date.now() - pageStartTime) / 1000);
      send('page_leave', { 
        duration_seconds: duration,
        duration_ms: Date.now() - pageStartTime,
        page_path: window.location.pathname,
        is_bounce: sessionStartTime === pageStartTime // 如果会话开始时间等于页面开始时间，则为跳出
      });
    });
    
    // 滚动深度追踪
    var maxScroll = 0, trackedMilestones = {};
    global.addEventListener('scroll', function() {
      var scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) maxScroll = scrollPercent;
      [25, 50, 75, 100].forEach(function(m) { 
        if (maxScroll >= m && !trackedMilestones[m]) { 
          trackScroll(m); 
          trackedMilestones[m] = true; 
        } 
      });
    }, { passive: true });
    
    // 点击追踪
    document.addEventListener('click', function(e) { 
      var target = e.target || e.srcElement, trackData = target && target.getAttribute && target.getAttribute('data-track'); 
      if (trackData) { 
        try { var data = JSON.parse(trackData); trackClick(data.label || (target.textContent || ''), data.category, data); } 
        catch { trackClick(target.textContent || ''); } 
      } 
    });
    
    // 表单提交追踪
    document.addEventListener('submit', function(e) { 
      var form = e.target || e.srcElement; 
      if (form && form.tagName === 'FORM') { 
        var formName = form.name || form.id || 'anonymous', formData = new FormData(form), fields = {}; 
        formData.forEach(function(value, key) { fields[key] = value; }); 
        setTimeout(function() { trackFormSubmit(formName, true, fields); }, 500); 
      } 
    });
  }
  
  // 初始化
  function init(options) {
    config.tenantSlug = options.tenant;
    config.apiUrl = options.apiUrl || '/api/tracking';
    config.debug = options.debug || false;
    getVisitorId();
    getSessionId();
    if (options.autoTrack !== false) {
      if (document.readyState === 'complete') initAutoTracking();
      else global.addEventListener('load', initAutoTracking);
    }
  }
  
  // 导出 API
  var zxqTrack = {
    init: init,
    pageView: trackPageView,
    click: trackClick,
    form: trackFormSubmit,
    tool: trackToolInteraction,
    ai: trackAIAnalysis,
    scroll: trackScroll,
    custom: trackCustom,
    track: function(eventType, data) { send(eventType, data); },
    getVisitorId: getVisitorId,
    getSessionId: getSessionId,
    getPageDuration: getPageDuration,
    getSessionDuration: getSessionDuration,
    initAutoTracking: initAutoTracking,
    // 工具计时器辅助函数
    startToolTimer: function(toolName) { toolStartTimes[toolName] = Date.now(); },
    endToolTimer: function(toolName) { 
      var duration = toolStartTimes[toolName] ? Date.now() - toolStartTimes[toolName] : 0;
      delete toolStartTimes[toolName];
      return duration;
    }
  };
  
  global.zxqTrack = zxqTrack;
  if (typeof module !== 'undefined' && module.exports) module.exports = zxqTrack;
})(typeof window !== 'undefined' ? window : global);
`;

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenant = searchParams.get('tenant') || 'zxqconsulting';
  
  // 根据租户获取对应的 API URL（使用最新部署的版本）
  // 当前最新部署: website-backend-admin-3nghix1c7-johnzhangs-projects-50e83ec4.vercel.app
  const currentApiUrl = 'https://website-backend-admin-3nghix1c7-johnzhangs-projects-50e83ec4.vercel.app/api/tracking';
  const tenantApiUrls: Record<string, string> = {
    'zxqconsulting': currentApiUrl,
    'zero': currentApiUrl,
    'import-website': currentApiUrl,
    'global2china': currentApiUrl,
    'africa': currentApiUrl,
  };
  
  const apiUrl = tenantApiUrls[tenant] || tenantApiUrls['zxqconsulting'];
  
  // 注入配置
  const configuredSdk = SDK_SOURCE
    .replace("apiUrl: '/api/tracking'", `apiUrl: '${apiUrl}'`)
    .replace("tenantSlug: ''", `tenantSlug: '${tenant}'`);

  return new Response(configuredSdk, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
