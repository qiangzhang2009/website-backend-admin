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
} from '@/lib/db'

// Mock 租户数据（当数据库未配置时使用）
const mockTenants: Record<string, string> = {
  zxqconsulting: 'tenant_001',
  demo: 'tenant_002',
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
    if (isDbConfigured) {
      tenantId = await getTenantIdBySlug(tenant_slug)
    } else {
      tenantId = mockTenants[tenant_slug] ?? null
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 400, headers: corsHeaders })
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

      // 表单提交 → 更新用户 + 插入询盘
      if (event_type === 'form_submit' && event_data) {
        await handleFormSubmit(tenantId, event_data as Record<string, unknown>, visitor_id)
      }

      // 工具交互 → 插入工具交互表
      if (event_type === 'tool_interaction' && event_data) {
        await handleToolInteraction(tenantId, event_data as Record<string, unknown>, visitor_id, session_id)
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
  const { tool_name, tool_section, action, input_params, output_result, duration_ms, step_completed, total_steps } = eventData

  await insertToolInteraction({
    tenant_id: tenantId,
    visitor_id: visitorId,
    session_id: sessionId,
    tool_name: String(tool_name ?? ''),
    tool_section: tool_section ? String(tool_section) : undefined,
    action: String(action ?? ''),
    input_params,
    output_result,
    duration_ms: duration_ms ? Number(duration_ms) : undefined,
    step_completed: step_completed ? Number(step_completed) : undefined,
    total_steps: total_steps ? Number(total_steps) : undefined,
  })
}

// GET 请求返回 SDK 嵌入代码
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantSlug = searchParams.get('tenant') || 'zxqconsulting'

  return new NextResponse(getEmbedCode(tenantSlug), {
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

function getEmbedCode(tenantSlug: string): string {
  // 使用绝对路径指向管理后台
  const trackingUrl = 'https://website-backend-admin.vercel.app/api/tracking'
  return `
(function() {
  var tenantSlug = '${tenantSlug}';
  var trackingUrl = '${trackingUrl}';
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
    navigator.sendBeacon
      ? navigator.sendBeacon(trackingUrl, JSON.stringify(data))
      : fetch(trackingUrl, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data),
          keepalive: true
        }).catch(function() {});
  }
  
  track('page_view', {page_path: window.location.pathname, page_title: document.title});
  
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
  
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.tagName !== 'FORM') return;
    var formName = form.name || form.id || 'anonymous';
    var formData = new FormData(form);
    var fields = {};
    formData.forEach(function(value, key) { fields[key] = value; });
    setTimeout(function() { window.zxqTrack.form(formName, fields, 'success'); }, 500);
  });
})();
  `.trim()
}
