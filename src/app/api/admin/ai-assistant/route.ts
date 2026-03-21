import { NextRequest, NextResponse } from 'next/server'

// Simple AI response generator (in production, use OpenAI/Claude API)
function generateResponse(message: string, tenant: string, history: any[]): { response: string; speak: boolean } {
  const lowerMessage = message.toLowerCase()

  // Data overview queries
  if (lowerMessage.includes('今天') || lowerMessage.includes('今日') || lowerMessage.includes('今日数据')) {
    return {
      response: '今日数据概况：访客数 1,234 人，较昨日增长 12%；浏览量 5,678 次，转化率 3.2%，询盘数 28 条。其中美国访客占比最高，达到 35%。',
      speak: true
    }
  }

  if (lowerMessage.includes('昨天') || lowerMessage.includes('昨日')) {
    return {
      response: '昨日数据：访客数 1,102 人，浏览量 4,892 次，转化率 2.8%，询盘数 22 条。',
      speak: false
    }
  }

  if (lowerMessage.includes('本周') || lowerMessage.includes('这周')) {
    return {
      response: '本周数据：总访客数 8,765 人，较上周增长 15%；总浏览量 32,456 次，转化率 3.1%，新增询盘 156 条。',
      speak: true
    }
  }

  if (lowerMessage.includes('本月') || lowerMessage.includes('这个月')) {
    return {
      response: '本月数据：总访客数 35,678 人，总浏览量 156,789 次，转化率 2.9%，询盘总数 892 条，线索 234 条。',
      speak: true
    }
  }

  // Traffic and visitor queries
  if (lowerMessage.includes('流量') || lowerMessage.includes('访客')) {
    return {
      response: '流量分析：主要流量来源依次为直接访问（40%）、搜索引擎（35%）、社交媒体（15%）、外链（10%）。',
      speak: false
    }
  }

  if (lowerMessage.includes('来源') || lowerMessage.includes('地区') || lowerMessage.includes('国家')) {
    return {
      response: '访客地区分布：美国占比 35%、英国占比 20%、澳大利亚占比 15%、加拿大占比 10%、其他国家占比 20%。',
      speak: false
    }
  }

  // Conversion analysis
  if (lowerMessage.includes('转化') || lowerMessage.includes('漏斗')) {
    return {
      response: '转化漏斗分析：访问页面 100%，浏览产品 65%，加入询盘 35%，提交询盘 12%，最终转化 3.2%。整体转化率较上周提升 0.5 个百分点。',
      speak: true
    }
  }

  if (lowerMessage.includes('询盘')) {
    return {
      response: '询盘统计：本周新增询盘 42 条，其中有效询盘 28 条，高意向询盘 12 条。平均响应时间 2.3 小时。',
      speak: false
    }
  }

  if (lowerMessage.includes('线索')) {
    return {
      response: '线索统计：本周新增线索 56 条，其中高质量线索 23 条。线索转化率为 18.5%。',
      speak: false
    }
  }

  // RFM analysis
  if (lowerMessage.includes('rfm') || lowerMessage.includes('客户价值')) {
    return {
      response: 'RFM 分析结果：高价值客户 1,234 人（占比 15%），中等价值客户 4,567 人（占比 55%），低价值客户 2,456 人（占比 30%）。建议重点维护高价值客户群体。',
      speak: true
    }
  }

  // Content analysis
  if (lowerMessage.includes('内容') || lowerMessage.includes('热度')) {
    return {
      response: '内容热度分析：最受关注的内容依次为"中医药国际发展趋势"（阅读量 12,345）、"海外市场准入指南"（阅读量 8,901）、"成功案例分析"（阅读量 6,789）。',
      speak: false
    }
  }

  // Comparison queries
  if (lowerMessage.includes('增长') || lowerMessage.includes('下降') || lowerMessage.includes('变化')) {
    return {
      response: '数据变化趋势：访客数较上周增长 15%，浏览量增长 12%，转化率提升 0.5 个百分点。整体呈上升趋势。',
      speak: true
    }
  }

  if (lowerMessage.includes('对比') || lowerMessage.includes('比较')) {
    return {
      response: '数据对比：本周与上周相比，访客数增长 15%，询盘数增长 20%，但跳出率上升了 2 个百分点，需要关注落地页优化。',
      speak: true
    }
  }

  // Help
  if (lowerMessage.includes('帮助') || lowerMessage.includes('能做什么')) {
    return {
      response: '我可以帮您查询各类数据，包括：流量概况、访客来源、转化分析、询盘统计、线索分析、RFM 客户分层、内容热度等。您可以用自然语言提问。',
      speak: false
    }
  }

  // Default response
  return {
    response: '我理解您想了解数据，但您可以更具体地提问，例如："今天访客多少？"、"转化率怎么样？"、"本月询盘情况如何？"',
    speak: false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, tenant, history } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Generate AI response
    const result = generateResponse(message, tenant || 'zxqconsulting', history || [])

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI Assistant error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'AI Assistant API is running',
    capabilities: [
      '数据查询（流量、访客、转化）',
      '趋势分析（增长、下降、对比）',
      '询盘和线索统计',
      'RFM 客户分层',
      '内容热度分析'
    ]
  })
}
