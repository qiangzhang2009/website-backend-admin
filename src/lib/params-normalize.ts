/**
 * 输入参数中英文标准化
 * 将输入参数中的英文字段名转换为中文
 */

// 字段名中英文映射表
const FIELD_NAME_MAPPING: Record<string, string> = {
  // 通用字段
  'target_market': '目标市场',
  'target_markets': '目标市场',
  'product_type': '产品类型',
  'product_types': '产品类型',
  'budget': '预算',
  'budget_range': '预算区间',
  'country': '国家',
  'city': '城市',
  'name': '名称',
  'email': '邮箱',
  'phone': '电话',
  'company': '公司',
  'industry': '行业',
  'region': '地区',
  'source': '来源',
  'medium': '媒介',
  'campaign': '营销活动',
  'page': '页面',
  'url': '网址',
  'title': '标题',
  'content': '内容',
  'action': '操作',
  'type': '类型',
  'status': '状态',
  'created_at': '创建时间',
  'updated_at': '更新时间',
  'id': '编号',
  'user_id': '用户编号',
  'visitor_id': '访客编号',
  'session_id': '会话编号',
  'tenant_id': '租户编号',

  // 动作字段
  'complete': '完成',
  'completed': '已完成',
  'submit': '提交',
  'view': '查看',
  'done': '完成',
  'start': '开始',
  'switch': '切换',
  'select': '选择',
  'abandon': '放弃',
  'cancel': '取消',
  'reset': '重置',
  'input': '输入',

  // 市场相关
  'market': '市场',
  'markets': '市场',
  'japan': '日本',
  'europe': '欧洲',
  'southeast_asia': '东南亚',
  'usa': '美国',
  'us': '美国',
  'uk': '英国',
  'germany': '德国',
  'france': '法国',
  'singapore': '新加坡',
  'australia': '澳大利亚',
  'canada': '加拿大',
  'india': '印度',
  'brazil': '巴西',
  'mexico': '墨西哥',
  'russia': '俄罗斯',
  'korea': '韩国',
  'taiwan': '台湾',
  'hong_kong': '香港',
  'macau': '澳门',

  // 产品类型
  'health_food': '保健食品',
  'herbal_medicine': '本草产品',
  'medical_device': '医疗器械',
  'cosmetics': '化妆品',
  'supplement': '膳食补充剂',
  'traditional_chinese_medicine': '中医药',
  'organic_product': '有机产品',

  // 预算相关
  'low_budget': '低预算',
  'medium_budget': '中等预算',
  'high_budget': '高预算',
  'min_budget': '最低预算',
  'max_budget': '最高预算',

  // 代理相关
  'need_agent': '需要代理',
  'agent_required': '需要代理商',
  'direct_sale': '直销',

  // 认证相关
  'certification': '认证',
  'certification_needed': '需要认证',
  'pmda': 'PMDA认证',
  'fda': 'FDA认证',
  'ce_mark': 'CE认证',

  // 用户意向
  'intention': '意向',
  'inquiry_type': '咨询类型',
  'message': '留言',
  'requirements': '需求',
  'interest_level': '感兴趣程度',
  'high_intent': '高意向',
  'medium_intent': '中等意向',
  'low_intent': '低意向',

  // AI 工具相关
  'tool_name': '工具名称',
  'tool_type': '工具类型',
  'input_params': '输入参数',
  'output_result': '输出结果',
  'output_data': '输出数据',
  'input_data': '输入数据',
  'duration_ms': '耗时',
  'duration_seconds': '耗时(秒)',
  'abandoned': '放弃',

  // 分析相关
  'analysis_type': '分析类型',
  'market_analysis': '市场分析',
  'competitor_analysis': '竞争分析',
  'feasibility_analysis': '可行性分析',
  'cost_analysis': '成本分析',
  'risk_analysis': '风险分析',

  // 地区相关
  'asia': '亚洲',
  'european_union': '欧盟',
  'north_america': '北美洲',
  'south_america': '南美洲',
  'africa': '非洲',
  'oceania': '大洋洲',
  'middle_east': '中东',

  // 语言相关
  'language': '语言',
  'primary_language': '主要语言',
  'target_language': '目标语言',

  // 其他
  'experience': '经验',
  'years_experience': '工作经验',
  'company_size': '公司规模',
  'employees': '员工数量',
  'annual_revenue': '年营收',
  'export_experience': '出口经验',
  'timeline': '时间计划',
  'priority': '优先级',
  'notes': '备注',

  // 算命相关
  'birth_year': '出生年',
  'birth_month': '出生月',
  'birth_day': '出生日',
  'birth_hour': '出生时',
  'gender': '性别',
  'male': '男',
  'female': '女',
  'name_input': '姓名',
  'birth_date': '出生日期',
  'birth_time': '出生时间',

  // 咨询相关
  'question': '问题',
  'inquiry': '咨询',
  'description': '描述',
  'category': '类别',
  'subcategory': '子类别',

  // 结果相关
  'result': '结果',
  'analysis': '分析',
  'recommendation': '建议',
  'summary': '摘要',
  'details': '详情',

}

// 国家/地区值的中文映射
const VALUE_MAPPING: Record<string, string> = {
  // 国家
  'china': '中国',
  'CN': '中国',
  'cn': '中国',
  'japan': '日本',
  'JP': '日本',
  'jp': '日本',
  'usa': '美国',
  'US': '美国',
  'us': '美国',
  'uk': '英国',
  'UK': '英国',
  'germany': '德国',
  'DE': '德国',
  'france': '法国',
  'FR': '法国',
  'singapore': '新加坡',
  'SG': '新加坡',
  'australia': '澳大利亚',
  'AU': '澳大利亚',
  'canada': '加拿大',
  'CA': '加拿大',
  'india': '印度',
  'IN': '印度',
  'brazil': '巴西',
  'BR': '巴西',
  'mexico': '墨西哥',
  'MX': '墨西哥',
  'russia': '俄罗斯',
  'RU': '俄罗斯',
  'korea': '韩国',
  'KR': '韩国',
  'south_korea': '韩国',
  'taiwan': '台湾',
  'TW': '台湾',
  'hong_kong': '香港',
  'HK': '香港',
  'macau': '澳门',
  'MO': '澳门',
  'thailand': '泰国',
  'TH': '泰国',
  'vietnam': '越南',
  'VN': '越南',
  'indonesia': '印度尼西亚',
  'ID': '印度尼西亚',
  'malaysia': '马来西亚',
  'MY': '马来西亚',
  'philippines': '菲律宾',
  'PH': '菲律宾',
  'netherlands': '荷兰',
  'NL': '荷兰',
  'switzerland': '瑞士',
  'CH': '瑞士',
  'sweden': '瑞典',
  'SE': '瑞典',
  'norway': '挪威',
  'NO': '挪威',
  'denmark': '丹麦',
  'DK': '丹麦',
  'finland': '芬兰',
  'FI': '芬兰',
  'italy': '意大利',
  'IT': '意大利',
  'spain': '西班牙',
  'ES': '西班牙',
  'portugal': '葡萄牙',
  'PT': '葡萄牙',
  'greece': '希腊',
  'GR': '希腊',
  'poland': '波兰',
  'PL': '波兰',
  'ireland': '爱尔兰',
  'IE': '爱尔兰',
  'new_zealand': '新西兰',
  'NZ': '新西兰',
  'uae': '阿联酋',
  'AE': '阿联酋',
  'united_arab_emirates': '阿联酋',
  'saudi_arabia': '沙特阿拉伯',
  'SA': '沙特阿拉伯',
  'israel': '以色列',
  'IL': '以色列',
  'turkey': '土耳其',
  'TR': '土耳其',
  'egypt': '埃及',
  'EG': '埃及',
  'south_africa': '南非',
  'ZA': '南非',
  
  // 产品类型
  'health_food': '保健食品',
  'herbal_product': '本草产品',
  'herbal_medicine': '本草产品',
  'medical_device': '医疗器械',
  'medical_equipment': '医疗设备',
  'cosmetics': '化妆品',
  'supplement': '膳食补充剂',
  'dietary_supplement': '膳食补充剂',
  'traditional_chinese_medicine': '中医药',
  'tcm': '中医药',
  'organic_product': '有机产品',
  'food': '食品',
  ' beverage': '饮料',
  
  // 布尔值
  'true': '是',
  'false': '否',
  'yes': '是',
  'no': '否',
  
  // 是/否
  'needed': '需要',
  'not_needed': '不需要',
  'required': '必需',
  'optional': '可选',

  // 操作/动作
  'start': '开始',
  'complete': '完成',
  'submit': '提交',
  'save': '保存',
  'share': '分享',
  'abandon': '放弃',
  'switch': '切换',
  'select': '选择',
  'view': '查看',
  'generate': '生成',
  'analyze': '分析',
  'search': '搜索',
  'filter': '筛选',
  'export': '导出',
  'import': '导入',
  'delete': '删除',
  'edit': '编辑',
  'update': '更新',
  'create': '创建',

  // 运动类型
  'running': '跑步',
  'swimming': '游泳',
  'cycling': '骑行',
  'football': '足球',
  'basketball': '篮球',
  'tennis': '网球',
  'badminton': '羽毛球',
  'baseball': '棒球',
  'volleyball': '排球',
  'golf': '高尔夫',
  'yoga': '瑜伽',
  'fitness': '健身',
  'hiking': '徒步',
  'climbing': '登山',
  'skiing': '滑雪',
  'snowboarding': '单板滑雪',
  'surfing': '冲浪',
  'boxing': '拳击',
  'martial_arts': '武术',
  'gymnastics': '体操',

  // 阶段
  'exploration': '探索阶段',
  'consideration': '考虑阶段',
  'decision': '决策阶段',
  'purchase': '购买阶段',
  'retention': '留存阶段',
}

/**
 * 标准化字段名称
 * @param key 原始字段名
 * @returns 中文字段名
 */
export function normalizeFieldName(key: string): string {
  const lowerKey = key.toLowerCase().trim()
  return FIELD_NAME_MAPPING[lowerKey] || FIELD_NAME_MAPPING[key] || key
}

/**
 * 标准化字段值
 * @param value 原始值
 * @returns 中文值
 */
export function normalizeFieldValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }
  
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim()
    return VALUE_MAPPING[lowerValue] || VALUE_MAPPING[value] || value
  }
  
  if (Array.isArray(value)) {
    return value.map(v => normalizeFieldValue(v))
  }
  
  if (typeof value === 'object') {
    return normalizeInputParams(value as Record<string, unknown>)
  }
  
  return value
}

/**
 * 标准化输入参数对象
 * 将所有字段名和部分字段值转换为中文
 * @param params 输入参数对象
 * @returns 标准化后的对象
 */
export function normalizeInputParams(params: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!params) return null
  
  const result: Record<string, unknown> = {}
  
  for (const [key, value] of Object.entries(params)) {
    const chineseKey = normalizeFieldName(key)
    result[chineseKey] = normalizeFieldValue(value)
  }
  
  return result
}

/**
 * 格式化输入参数为易读的中文JSON字符串
 * @param params 输入参数
 * @returns 格式化的中文JSON字符串
 */
export function formatInputParams(params: Record<string, unknown> | null | undefined): string {
  const normalized = normalizeInputParams(params)
  if (!normalized) return '{}'
  
  return JSON.stringify(normalized, null, 2)
}
