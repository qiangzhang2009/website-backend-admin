/**
 * 数据采集 API 端点
 * 接收来自前端网站的追踪事件，存储到 Neon PostgreSQL
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  isDbConfigured,
  getTenantIdBySlug,
  insertTrackingEvent,
  upsertUser,
  insertInquiry,
  insertToolInteraction,
  insertChatMessage,
  sql,
} from '@/lib/db'

// Mock 租户数据（当数据库未配置时使用）
const mockTenants: Record<string, string> = {
  zxqconsulting: 'tenant_001',
  zero: 'tenant_002',
  demo: 'tenant_003',
  'import-website': 'tenant_004',
}

// 处理 CORS 预检请求
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function POST(request: NextRequest) {
  // 添加 CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const body = await request.json()

    const {
      event_type,
      tenant_slug,
      session_id,
      visitor_id,
      timestamp,
      website_url,
      page_url,
      page_title,
      referrer,
      user_agent,
      event_data,
    } = body

    // 验证必要字段
    if (!tenant_slug || !event_type || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders })
    }

    // 获取租户 ID
    let tenantId: string | null = null
    console.log('Tracking request:', { tenant_slug, isDbConfigured })
    if (isDbConfigured) {
      tenantId = await getTenantIdBySlug(tenant_slug)
    } else {
      tenantId = mockTenants[tenant_slug] ?? null
    }

    if (!tenantId) {
      console.log('Invalid tenant:', tenant_slug)
      return NextResponse.json({ error: 'Invalid tenant', tenant: tenant_slug }, { status: 400, headers: corsHeaders })
    }

    if (isDbConfigured) {
      // 存储追踪事件
      await insertTrackingEvent({
        tenant_id: tenantId,
        event_type,
        session_id,
        visitor_id,
        website_url,
        page_url,
        page_title,
        referrer,
        user_agent,
        event_data,
      })

      // 根据事件类型处理不同的业务逻辑
      switch (event_type) {
        case 'form_submit':
          if (event_data) {
            await handleFormSubmit(tenantId, event_data as Record<string, unknown>, visitor_id)
          }
          break

        case 'tool_interaction':
        case 'tool_start':
        case 'tool_input':
        case 'tool_output':
        case 'tool_complete':
        case 'tool_abandon':
        case 'ai_start':
        case 'ai_complete':
        case 'ai_abandon':
          if (event_data) {
            await handleToolInteraction(tenantId, { ...event_data, action: event_type } as Record<string, unknown>, visitor_id, session_id)
          }
          break

        case 'chat_message':
        case 'chat_start':
        case 'chat_end':
          if (event_data) {
            try {
              await handleChatMessage(tenantId, event_data as Record<string, unknown>, visitor_id, session_id)
            } catch (e) {
              console.error('handleChatMessage error:', e)
            }
          }
          break

        case 'profile_create':
        case 'profile_update':
        case 'profile_delete':
          if (event_data) {
            await handleUserProfile(tenantId, event_data as Record<string, unknown>, visitor_id, event_type)
          }
          break

        case 'module_select':
        case 'module_switch':
          if (event_data) {
            await handleModuleUsage(tenantId, event_data as Record<string, unknown>, visitor_id, session_id, event_type)
          }
          break

        case 'preference_update':
          if (event_data) {
            await handleUserPreference(tenantId, event_data as Record<string, unknown>, visitor_id)
          }
          break

        case 'page_leave':
        case 'scroll':
        case 'click':
          // 这些事件只存储追踪事件，不需要额外处理
          break

        case 'custom':
          // 自定义事件，可以根据 event_data 中的 event_name 进一步处理
          break

        default:
          console.log('[Unknown event type]', event_type)
      }
    } else {
      console.log('[Mock Mode] Tracking event:', { event_type, tenant_slug, visitor_id, event_data })
    }

    return NextResponse.json({ success: true, mock: !isDbConfigured }, { headers: corsHeaders })
  } catch (error) {
    console.error('Tracking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders })
  }
}

// 处理表单提交
async function handleFormSubmit(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string
) {
  const { form_name, fields, submit_result } = eventData

  if (submit_result !== 'success') return
  if (form_name !== 'inquiry' && form_name !== 'contact') return

  const f = (fields ?? {}) as Record<string, unknown>
  const name = String(f.name ?? f['姓名'] ?? '')
  const phone = String(f.phone ?? f['电话'] ?? f['联系电话'] ?? '')
  const email = String(f.email ?? f['邮箱'] ?? f['电子邮件'] ?? '')
  const company = String(f.company ?? f['公司名称'] ?? '')
  const productType = String(f.productType ?? f['产品类型'] ?? '')
  const targetMarket = String(f.targetMarket ?? f['目标区域'] ?? '')
  const message = String(f.message ?? f['需求'] ?? f['询价内容'] ?? '')

  if (!email && !phone && !name) return

  const userId = await upsertUser({
    tenant_id: tenantId,
    visitor_id: visitorId,
    name,
    phone,
    email,
    company,
    product_type: productType,
    target_market: targetMarket,
    source: 'website_form',
  })

  await insertInquiry({
    tenant_id: tenantId,
    user_id: userId ?? undefined,
    visitor_id: visitorId,
    name,
    phone,
    email,
    company,
    product_type: productType,
    target_market: targetMarket,
    message,
    source: 'website_form',
  })
}

// 处理工具交互
async function handleToolInteraction(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string,
  sessionId?: string
) {
  const { tool_name, tool_section, action, input_params, output_result, duration_ms, step_completed, total_steps, module_id, analysis_mode } = eventData

  // 如果没有 tool_name，使用 analysis_mode 或 module_id
  const finalToolName = String(tool_name ?? module_id ?? analysis_mode ?? 'ai-analysis')

  await insertToolInteraction({
    tenant_id: tenantId,
    visitor_id: visitorId,
    session_id: sessionId,
    tool_name: finalToolName,
    tool_section: tool_section ? String(tool_section) : undefined,
    action: String(action ?? ''),
    input_params,
    output_result,
    duration_ms: duration_ms ? Number(duration_ms) : undefined,
    step_completed: step_completed ? Number(step_completed) : undefined,
    total_steps: total_steps ? Number(total_steps) : undefined,
  })
}

// 处理 AI Chat 消息
async function handleChatMessage(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string,
  sessionId?: string
) {
  const { module, user_message, ai_message, action } = eventData

  // 如果 action 是 'start'，说明是开始新的对话，只记录用户消息
  // 如果 action 是 'response'，说明是 AI 回复，记录用户消息和 AI 回复
  if (action === 'response' && ai_message) {
    // AI 回复时：优先使用 user_message
    const userMsg = user_message ? String(user_message) : ''
    await insertChatMessage({
      tenant_id: tenantId,
      visitor_id: visitorId,
      session_id: sessionId,
      module: String(module ?? 'unknown'),
      user_message: userMsg,
      ai_message: String(ai_message),
    })
  } else if (action === 'start' && user_message) {
    // 开始新对话时也记录用户消息
    await insertChatMessage({
      tenant_id: tenantId,
      visitor_id: visitorId,
      session_id: sessionId,
      module: String(module ?? 'unknown'),
      user_message: String(user_message),
      ai_message: '',
    })
  }
}

// 处理用户档案事件
async function handleUserProfile(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string,
  eventType?: string
) {
  if (!sql) return

  const { profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, completeness } = eventData

  if (eventType === 'profile_create' || eventType === 'profile_update') {
    await sql`
      INSERT INTO public.user_profiles (tenant_id, visitor_id, profile_id, profile_type, name, avatar, birthday, birth_time, gender, profile_data, profile_completeness)
      VALUES (${tenantId}, ${visitorId ?? null}, ${String(profile_id ?? '')}, ${String(profile_type ?? 'default')}, ${String(name ?? '')}, ${String(avatar ?? '')}, ${String(birthday ?? '')}, ${String(birth_time ?? '')}, ${String(gender ?? '')}, ${JSON.stringify(profile_data ?? {})}, ${Number(completeness ?? 0)})
      ON CONFLICT (tenant_id, visitor_id, profile_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        birthday = EXCLUDED.birthday,
        birth_time = EXCLUDED.birth_time,
        gender = EXCLUDED.gender,
        profile_data = EXCLUDED.profile_data,
        profile_completeness = EXCLUDED.profile_completeness,
        updated_at = NOW()
    `
  }
}

// 处理模块使用事件
async function handleModuleUsage(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string,
  sessionId?: string,
  eventType?: string
) {
  if (!sql) return

  const { module_id, module_name, duration_seconds, conversation_turns, input_params, output_result, completed_steps, total_steps } = eventData

  await sql`
    INSERT INTO public.module_usage
      (tenant_id, visitor_id, session_id, module_id, module_name, event_type, duration_seconds, conversation_turns, input_params, output_result, completed_steps, total_steps)
    VALUES
      (${tenantId}, ${visitorId ?? null}, ${sessionId ?? null}, ${String(module_id ?? '')}, ${String(module_name ?? '')}, ${String(eventType ?? '')}, ${Number(duration_seconds ?? 0)}, ${Number(conversation_turns ?? 0)}, ${JSON.stringify(input_params ?? {})}, ${JSON.stringify(output_result ?? {})}, ${Number(completed_steps ?? 0)}, ${Number(total_steps ?? 0)})
  `
}

// 处理用户偏好更新
async function handleUserPreference(
  tenantId: string,
  eventData: Record<string, unknown>,
  visitorId?: string
) {
  if (!sql || !visitorId) return

  const { preference_key, preference_value } = eventData

  await sql`
    INSERT INTO public.user_preferences (tenant_id, visitor_id, preference_key, preference_value)
    VALUES (${tenantId}, ${visitorId}, ${String(preference_key ?? '')}, ${String(preference_value ?? '')})
    ON CONFLICT (tenant_id, visitor_id, preference_key)
    DO UPDATE SET
      preference_value = EXCLUDED.preference_value,
      updated_at = NOW()
  `
}

// GET 请求返回 SDK 嵌入代码
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'
  const baseUrl = request.url.split('/api/tracking')[0]

  return new NextResponse(getEmbedCode(tenantSlug, baseUrl), {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function getEmbedCode(tenantSlug: string, baseUrl: string): string {
  // 使用动态域名指向管理后台
  const trackingUrl = `${baseUrl}/api/tracking`
  return `
(function() {
  var tenantSlug = '${tenantSlug}';
  var trackingUrl = '${trackingUrl}';
  var visitorId = localStorage.getItem('zt_visitor_id') || 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  if (!localStorage.getItem('zt_visitor_id')) localStorage.setItem('zt_visitor_id', visitorId);
  
  var sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  var currentModule = null;
  var conversationTurns = 0;
  
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
    navigator.sendBeacon
      ? navigator.sendBeacon(trackingUrl, JSON.stringify(data))
      : fetch(trackingUrl, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data),
          keepalive: true
        }).catch(function() {});
  }
  
  // 页面浏览事件
  track('page_view', {page_path: window.location.pathname, page_title: document.title});
  
  // 页面离开事件
  var pageStartTime = Date.now();
  window.addEventListener('beforeunload', function() {
    var duration = Math.round((Date.now() - pageStartTime) / 1000);
    track('page_leave', {duration_seconds: duration, page_path: window.location.pathname});
  });
  
  // 滚动事件（每30秒记录一次）
  var maxScroll = 0;
  window.addEventListener('scroll', function() {
    var scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
    if (scrollPercent > maxScroll) maxScroll = scrollPercent;
  });
  setInterval(function() {
    if (maxScroll > 0) {
      track('scroll', {scroll_depth: maxScroll, page_path: window.location.pathname});
      maxScroll = 0;
    }
  }, 30000);
  
  // 统一追踪对象
  window.zxqTrack = {
    // 通用追踪方法（前端代码调用这个）
    track: function(eventType, eventData) {
      track(eventType, eventData || {});
    },
    
    // 页面浏览
    pageView: function(pageData) {
      track('page_view', pageData || {});
    },
    
    // 工具交互
    tool: function(toolName, action, params) {
      track('tool_interaction', {tool_name: toolName, action: action, ...params});
    },
    
    // 工具启动
    toolStart: function(toolName, params) {
      currentModule = toolName;
      conversationTurns = 0;
      track('tool_start', {module_id: toolName, module_name: toolName, ...params});
    },
    
    // 工具输入
    toolInput: function(toolName, inputParams) {
      track('tool_input', {module_id: toolName, input_params: inputParams});
    },
    
    // 工具输出
    toolOutput: function(toolName, outputResult, duration) {
      track('tool_output', {module_id: toolName, output_result: outputResult, duration_ms: duration});
    },
    
    // 工具完成
    toolComplete: function(toolName, result, duration, steps) {
      track('tool_complete', {module_id: toolName, output_result: result, duration_ms: duration, completed_steps: steps});
      currentModule = null;
    },
    
    // 工具放弃
    toolAbandon: function(toolName, completedSteps, totalSteps) {
      track('tool_abandon', {module_id: toolName, completed_steps: completedSteps, total_steps: totalSteps});
      currentModule = null;
    },
    
    // 表单提交
    form: function(formName, fields, result) {
      track('form_submit', {form_name: formName, fields: fields, submit_result: result});
    },
    
    // Chat 消息
    chat: function(module, userMsg, aiMsg, action) {
      if (action === 'start') {
        currentModule = module;
        conversationTurns = 1;
        track('chat_start', {module: module, user_message: userMsg});
      } else if (action === 'response') {
        conversationTurns++;
        track('chat_message', {module: module, user_message: userMsg, ai_message: aiMsg, action: action, conversation_turns: conversationTurns});
      }
    },
    
    // Chat 结束
    chatEnd: function(module, duration, messageCount) {
      track('chat_end', {module: module, duration_seconds: duration, message_count: messageCount});
      currentModule = null;
    },
    
    // 用户档案
    profile: function(profileData, action) {
      track('profile_' + (action || 'create'), {
        profile_id: profileData.profile_id || 'default',
        profile_type: profileData.profile_type || 'default',
        name: profileData.name,
        avatar: profileData.avatar,
        birthday: profileData.birthday,
        birth_time: profileData.birth_time,
        gender: profileData.gender,
        profile_data: profileData.profile_data || {},
        completeness: profileData.completeness || 0
      });
    },
    
    // 模块选择
    moduleSelect: function(moduleId, moduleName) {
      track('module_select', {module_id: moduleId, module_name: moduleName});
    },
    
    // 模块切换
    moduleSwitch: function(fromModule, toModule) {
      track('module_switch', {from_module: fromModule, to_module: toModule});
    },
    
    // 用户偏好
    preference: function(key, value) {
      track('preference_update', {preference_key: key, preference_value: value});
    },
    
    // 用户生命周期事件
    lifecycle: function(stage, data) {
      track('lifecycle_' + stage, data || {});
    },
    
    // 自定义事件
    custom: function(eventName, data) {
      track('custom', {event_name: eventName, ...data});
    }
  };
  
  // 自动表单追踪
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName !== 'FORM') return;
    var formName = form.name || form.id || 'anonymous';
    var formData = new FormData(form);
    var fields = {};
    formData.forEach(function(value, key) { fields[key] = value; });
    setTimeout(function() { window.zxqTrack.form(formName, fields, 'success'); }, 500);
  });
  
  // 点击事件追踪
  document.addEventListener('click', function(e) {
    var target = e.target;
    var dataAttr = target.getAttribute('data-track');
    if (dataAttr) {
      try {
        var trackData = JSON.parse(dataAttr);
        track('click', trackData);
      } catch(e) {
        track('click', {element: target.tagName, id: target.id, class: target.className, text: target.innerText.substring(0, 50)});
      }
    }
  });
})();
  `.trim()
}
