/**
 * 国家/城市名称标准化映射
 * 将不同格式的国家/城市名称统一为中文
 */

// 国家名称映射表
const COUNTRY_MAPPING: Record<string, string> = {
  // 中国
  'china': '中国',
  'cn': '中国',
  'CN': '中国',
  'CHN': '中国',
  '中国': '中国',
  'PRC': '中国',
  
  // 美国
  'united states': '美国',
  'US': '美国',
  'us': '美国',
  'USA': '美国',
  'United States': '美国',
  'United States of America': '美国',
  
  // 日本
  'japan': '日本',
  'jp': '日本',
  'JP': '日本',
  'JPN': '日本',
  '日本': '日本',
  
  // 韩国
  'south korea': '韩国',
  'korea': '韩国',
  'kr': '韩国',
  'KR': '韩国',
  'KOR': '韩国',
  '韩国': '韩国',
  
  // 英国
  'united kingdom': '英国',
  'uk': '英国',
  'UK': '英国',
  'GBR': '英国',
  '英国': '英国',
  
  // 德国
  'germany': '德国',
  'de': '德国',
  'DE': '德国',
  'DEU': '德国',
  '德国': '德国',
  '德國': '德国',
  
  // 法国
  'france': '法国',
  'fr': '法国',
  'FR': '法国',
  'FRA': '法国',
  '法国': '法国',
  
  // 加拿大
  'canada': '加拿大',
  'ca': '加拿大',
  'CA': '加拿大',
  'CAN': '加拿大',
  '加拿大': '加拿大',
  
  // 澳大利亚
  'australia': '澳大利亚',
  'au': '澳大利亚',
  'AU': '澳大利亚',
  'AUS': '澳大利亚',
  '澳大利亚': '澳大利亚',
  
  // 新加坡
  'singapore': '新加坡',
  'sg': '新加坡',
  'SG': '新加坡',
  'SGP': '新加坡',
  '新加坡': '新加坡',
  
  // 印度
  'india': '印度',
  'in': '印度',
  'IN': '印度',
  'IND': '印度',
  '印度': '印度',
  
  // 巴西
  'brazil': '巴西',
  'br': '巴西',
  'BR': '巴西',
  'BRA': '巴西',
  '巴西': '巴西',
  
  // 俄罗斯
  'russia': '俄罗斯',
  'ru': '俄罗斯',
  'RU': '俄罗斯',
  'RUS': '俄罗斯',
  '俄罗斯': '俄罗斯',
  
  // 荷兰
  'netherlands': '荷兰',
  'nl': '荷兰',
  'NL': '荷兰',
  'NLD': '荷兰',
  '荷兰': '荷兰',
  
  // 意大利
  'italy': '意大利',
  'it': '意大利',
  'IT': '意大利',
  'ITA': '意大利',
  '意大利': '意大利',
  
  // 西班牙
  'spain': '西班牙',
  'es': '西班牙',
  'ES': '西班牙',
  'ESP': '西班牙',
  '西班牙': '西班牙',
  
  // 瑞士
  'switzerland': '瑞士',
  'ch': '瑞士',
  'CH': '瑞士',
  'CHE': '瑞士',
  '瑞士': '瑞士',
  
  // 瑞典
  'sweden': '瑞典',
  'se': '瑞典',
  'SE': '瑞典',
  'SWE': '瑞典',
  '瑞典': '瑞典',
  
  // 挪威
  'norway': '挪威',
  'no': '挪威',
  'NO': '挪威',
  'NOR': '挪威',
  '挪威': '挪威',
  
  // 丹麦
  'denmark': '丹麦',
  'dk': '丹麦',
  'DK': '丹麦',
  'DNK': '丹麦',
  '丹麦': '丹麦',
  
  // 芬兰
  'finland': '芬兰',
  'fi': '芬兰',
  'FI': '芬兰',
  'FIN': '芬兰',
  '芬兰': '芬兰',
  
  // 比利时
  'belgium': '比利时',
  'be': '比利时',
  'BE': '比利时',
  'BEL': '比利时',
  '比利时': '比利时',
  
  // 奥地利
  'austria': '奥地利',
  'at': '奥地利',
  'AT': '奥地利',
  'AUT': '奥地利',
  '奥地利': '奥地利',
  
  // 爱尔兰
  'ireland': '爱尔兰',
  'ie': '爱尔兰',
  'IE': '爱尔兰',
  'IRL': '爱尔兰',
  '爱尔兰': '爱尔兰',
  
  // 新西兰
  'new zealand': '新西兰',
  'nz': '新西兰',
  'NZ': '新西兰',
  'NZL': '新西兰',
  '新西兰': '新西兰',
  
  // 墨西哥
  'mexico': '墨西哥',
  'mx': '墨西哥',
  'MX': '墨西哥',
  'MEX': '墨西哥',
  '墨西哥': '墨西哥',
  
  // 印度尼西亚
  'indonesia': '印度尼西亚',
  'id': '印度尼西亚',
  'ID': '印度尼西亚',
  'IDN': '印度尼西亚',
  '印度尼西亚': '印度尼西亚',
  
  // 马来西亚
  'malaysia': '马来西亚',
  'my': '马来西亚',
  'MY': '马来西亚',
  'MYS': '马来西亚',
  '马来西亚': '马来西亚',
  
  // 泰国
  'thailand': '泰国',
  'th': '泰国',
  'TH': '泰国',
  'THA': '泰国',
  '泰国': '泰国',
  
  // 越南
  'vietnam': '越南',
  'vn': '越南',
  'VN': '越南',
  'VNM': '越南',
  '越南': '越南',
  
  // 菲律宾
  'philippines': '菲律宾',
  'ph': '菲律宾',
  'PH': '菲律宾',
  'PHL': '菲律宾',
  '菲律宾': '菲律宾',
  
  // 香港
  'hong kong': '香港',
  'hk': '香港',
  'HK': '香港',
  'HKG': '香港',
  '香港': '香港',
  'hong kong sar': '香港',
  
  // 澳门
  'macau': '澳门',
  'mo': '澳门',
  'MO': '澳门',
  'MAC': '澳门',
  '澳门': '澳门',
  
  // 台湾
  'taiwan': '台湾',
  'tw': '台湾',
  'TW': '台湾',
  'TWN': '台湾',
  '台湾': '台湾',
  'taiwan province': '台湾',
  
  // 阿联酋
  'united arab emirates': '阿联酋',
  'ae': '阿联酋',
  'AE': '阿联酋',
  'ARE': '阿联酋',
  '阿联酋': '阿联酋',
  
  // 沙特阿拉伯
  'saudi arabia': '沙特阿拉伯',
  'sa': '沙特阿拉伯',
  'SA': '沙特阿拉伯',
  'SAU': '沙特阿拉伯',
  '沙特阿拉伯': '沙特阿拉伯',
  
  // 以色列
  'israel': '以色列',
  'il': '以色列',
  'IL': '以色列',
  'ISR': '以色列',
  '以色列': '以色列',
  
  // 土耳其
  'turkey': '土耳其',
  'tr': '土耳其',
  'TR': '土耳其',
  'TUR': '土耳其',
  '土耳其': '土耳其',
  
  // 波兰
  'poland': '波兰',
  'pl': '波兰',
  'PL': '波兰',
  'POL': '波兰',
  '波兰': '波兰',
  
  // 捷克
  'czech republic': '捷克',
  'cz': '捷克',
  'CZ': '捷克',
  'CZE': '捷克',
  '捷克': '捷克',
  
  // 希腊
  'greece': '希腊',
  'gr': '希腊',
  'GR': '希腊',
  'GRC': '希腊',
  '希腊': '希腊',
  
  // 葡萄牙
  'portugal': '葡萄牙',
  'pt': '葡萄牙',
  'PT': '葡萄牙',
  'PRT': '葡萄牙',
  '葡萄牙': '葡萄牙',
  
  // 匈牙利
  'hungary': '匈牙利',
  'hu': '匈牙利',
  'HU': '匈牙利',
  'HUN': '匈牙利',
  '匈牙利': '匈牙利',
  
  // 阿根廷
  'argentina': '阿根廷',
  'ar': '阿根廷',
  'AR': '阿根廷',
  'ARG': '阿根廷',
  '阿根廷': '阿根廷',
  
  // 智利
  'chile': '智利',
  'cl': '智利',
  'CL': '智利',
  'CHL': '智利',
  '智利': '智利',
  
  // 哥伦比亚
  'colombia': '哥伦比亚',
  'co': '哥伦比亚',
  'CO': '哥伦比亚',
  'COL': '哥伦比亚',
  '哥伦比亚': '哥伦比亚',
  
  // 南非
  'south africa': '南非',
  'za': '南非',
  'ZA': '南非',
  'ZAF': '南非',
  '南非': '南非',
  
  // 埃及
  'egypt': '埃及',
  'eg': '埃及',
  'EG': '埃及',
  'EGY': '埃及',
  '埃及': '埃及',
  
  // 尼日利亚
  'nigeria': '尼日利亚',
  'ng': '尼日利亚',
  'NG': '尼日利亚',
  'NGA': '尼日利亚',
  '尼日利亚': '尼日利亚',
}

// 城市名称映射表
const CITY_MAPPING: Record<string, string> = {
  // 中国城市
  'beijing': '北京',
  'shanghai': '上海',
  'guangzhou': '广州',
  'shenzhen': '深圳',
  'chengdu': '成都',
  'hangzhou': '杭州',
  'nanjing': '南京',
  'wuhan': '武汉',
  'xian': '西安',
  'chongqing': '重庆',
  'tianjin': '天津',
  'suzhou': '苏州',
  'dalian': '大连',
  'qingdao': '青岛',
  'changsha': '长沙',
  'zhengzhou': '郑州',
  'shijiazhuang': '石家庄',
  'fuzhou': '福州',
  'xiamen': '厦门',
  'kunming': '昆明',
  'shenyang': '沈阳',
  'harbin': '哈尔滨',
  'changchun': '长春',
  'jinan': '济南',
  'ningbo': '宁波',
  'wuxi': '无锡',
  'foshan': '佛山',
  'dongguan': '东莞',
  'wenzhou': '温州',
  'baoding': '保定',
  'tangshan': '唐山',
  'yantai': '烟台',
  'weifang': '潍坊',
  'luoyang': '洛阳',
  'kaifeng': '开封',
  'zhuhai': '珠海',
  'huizhou': '惠州',
  'zhongshan': '中山',
  'jiangmen': '江门',
  'taizhou': '台州',
  'daqing': '大庆',
  'hohhot': '呼和浩特',
  'baotou': '包头',
  'urumqi': '乌鲁木齐',
  'lanzhou': '兰州',
  'xining': '西宁',
  'yinchuan': '银川',
  'lhasa': '拉萨',
  'guiyang': '贵阳',
  'nanning': '南宁',
  'haikou': '海口',
  'sanya': '三亚',
  
  // 美国城市
  'new york': '纽约',
  'los angeles': '洛杉矶',
  'chicago': '芝加哥',
  'houston': '休斯顿',
  'phoenix': '凤凰城',
  'philadelphia': '费城',
  'san antonio': '圣安东尼奥',
  'san diego': '圣迭戈',
  'dallas': '达拉斯',
  'san jose': '圣何塞',
  'austin': '奥斯汀',
  'jacksonville': '杰克逊维尔',
  'san francisco': '旧金山',
  'columbus': '哥伦布',
  'indianapolis': '印第安纳波利斯',
  'fort worth': '沃斯堡',
  'charlotte': '夏洛特',
  'seattle': '西雅图',
  'denver': '丹佛',
  'boston': '波士顿',
  'detroit': '底特律',
  'nashville': '纳什维尔',
  'portland': '波特兰',
  'las vegas': '拉斯维加斯',
  'memphis': '孟菲斯',
  'louisville': '路易斯维尔',
  'baltimore': '巴尔的摩',
  'milwaukee': '密尔沃基',
  'albuquerque': '阿尔伯克基',
  'tucson': '图森',
  'fresno': '弗雷斯诺',
  'sacramento': '萨克拉门托',
  'mesa': '梅萨',
  'kansas city': '堪萨斯城',
  'atlanta': '亚特兰大',
  'miami': '迈阿密',
  'oakland': '奥克兰',
  'minneapolis': '明尼阿波利斯',
  'tulsa': '塔尔萨',
  'wichita': '威奇托',
  'arlington': '阿灵顿',
  
  // 日本城市
  'tokyo': '东京',
  'osaka': '大阪',
  'yokohama': '横滨',
  'nagoya': '名古屋',
  'sapporo': '札幌',
  'kyoto': '京都',
  'kobe': '神户',
  'fukuoka': '福冈',
  ' Hiroshima': '广岛',
  'sendai': '仙台',
  'kitakyushu': '北九州',
  'chiba': '千叶',
  'saitama': '埼玉',
  'kawasaki': '川崎',
  
  // 韩国城市
  'seoul': '首尔',
  'busan': '釜山',
  'incheon': '仁川',
  'daegu': '大邱',
  'daejeon': '大田',
  'gwangju': '光州',
  'ulsan': '蔚山',
  
  // 英国城市
  'london': '伦敦',
  'birmingham': '伯明翰',
  'manchester': '曼彻斯特',
  'glasgow': '格拉斯哥',
  'liverpool': '利物浦',
  'leeds': '利兹',
  'sheffield': '谢菲尔德',
  'edinburgh': '爱丁堡',
  'bristol': '布里斯托',
  'cardiff': '卡迪夫',
  
  // 德国城市
  'berlin': '柏林',
  'munich': '慕尼黑',
  'hamburg': '汉堡',
  'frankfurt': '法兰克福',
  'cologne': '科隆',
  'stuttgart': '斯图加特',
  'dusseldorf': '杜塞尔多夫',
  'dortmund': '多特蒙德',
  'essen': '埃森',
  'leipzig': '莱比锡',
  
  // 法国城市
  'paris': '巴黎',
  'marseille': '马赛',
  'lyon': '里昂',
  'toulouse': '图卢兹',
  'nice': '尼斯',
  'nancy': '南锡',
  'montpellier': '蒙彼利埃',
  'strasbourg': '斯特拉斯堡',
  
  // 澳大利亚城市
  'sydney': '悉尼',
  'melbourne': '墨尔本',
  'brisbane': '布里斯班',
  'perth': '珀斯',
  'adelaide': '阿德莱德',
  'canberra': '堪培拉',
  'gold coast': '黄金海岸',
  
  // 加拿大城市
  'toronto': '多伦多',
  'vancouver': '温哥华',
  'montreal': '蒙特利尔',
  'calgary': '卡尔加里',
  'ottawa': '渥太华',
  'edmonton': '埃德蒙顿',
  
  // 新加坡
  'singapore': '新加坡',
  
  // 香港
  'hong kong': '香港',
  
  // 台湾城市
  'taipei': '台北',
  'kaohsiung': '高雄',
  'taichung': '台中',
  'tainan': '台南',
  
  // 印度城市
  'mumbai': '孟买',
  'delhi': '德里',
  'bangalore': '班加罗尔',
  'hyderabad': '海得拉巴',
  'chennai': '金奈',
  'kolkata': '加尔各答',
  'pune': '浦那',
  
  // 巴西城市
  'sao paulo': '圣保罗',
  'rio de janeiro': '里约热内卢',
  'brasilia': '巴西利亚',
  'salvador': '萨尔瓦多',
  'fortaleza': '福塔莱萨',
  
  // 俄罗斯城市
  'moscow': '莫斯科',
  'saint petersburg': '圣彼得堡',
  'novosibirsk': '新西伯利亚',
  'yekaterinburg': '叶卡捷琳堡',
  
  // 西班牙城市
  'madrid': '马德里',
  'barcelona': '巴塞罗那',
  'valencia': '瓦伦西亚',
  'seville': '塞维利亚',
  'bilbao': '毕尔巴鄂',
  
  // 意大利城市
  'rome': '罗马',
  'milan': '米兰',
  'naples': '那不勒斯',
  'turin': '都灵',
  'palermo': '巴勒莫',
  
  // 荷兰城市
  'amsterdam': '阿姆斯特丹',
  'rotterdam': '鹿特丹',
  'the hague': '海牙',
  'utrecht': '乌得勒支',
  
  // 瑞士城市
  'zurich': '苏黎世',
  'geneva': '日内瓦',
  'basel': '巴塞尔',
  'bern': '伯尔尼',
  
  // 瑞典城市
  'stockholm': '斯德哥尔摩',
  'gothenburg': '哥德堡',
  'malmo': '马尔默',
  
  // 挪威城市
  'oslo': '奥斯陆',
  'bergen': '卑尔根',
  'trondheim': '特隆赫姆',
  
  // 丹麦城市
  'copenhagen': '哥本哈根',
  'aarhus': '奥胡斯',
  
  // 芬兰城市
  'helsinki': '赫尔辛基',
  'espoo': '埃斯波',
  'tampere': '坦佩雷',
  
  // 泰国城市
  'bangkok': '曼谷',
  'phuket': '普吉岛',
  'chiang mai': '清迈',
  
  // 马来西亚城市
  'kuala lumpur': '吉隆坡',
  'penang': '槟城',
  'johor bahru': '新山',
  
  // 越南城市
  'ho chi minh city': '胡志明市',
  'hanoi': '河内',
  'da nang': '岘港',
  
  // 菲律宾城市
  'manila': '马尼拉',
  'cebu': '宿务',
  'davao': '达沃',
  
  // 印度尼西亚城市
  'jakarta': '雅加达',
  'surabaya': '泗水',
  'bandung': '万隆',
  'bali': '巴厘岛',
  
  // 墨西哥城市
  'mexico city': '墨西哥城',
  'guadalajara': '瓜达拉哈拉',
  'monterrey': '蒙特雷',
  
  // 阿联酋城市
  'dubai': '迪拜',
  'abu dhabi': '阿布扎比',
  'sharjah': '沙迦',
  
  // 以色列城市
  'tel aviv': '特拉维夫',
  'jerusalem': '耶路撒冷',
  'haifa': '海法',
  
  // 土耳其城市
  'istanbul': '伊斯坦布尔',
  'ankara': '安卡拉',
  'izmir': '伊兹密尔',
  
  // 南非城市
  'johannesburg': '约翰内斯堡',
  'cape town': '开普敦',
  'durban': '德班',
}

/**
 * 标准化国家名称
 * @param name 原始国家名称
 * @returns 标准化后的中文名称
 */
export function normalizeCountryName(name: string | null | undefined): string {
  if (!name) return '未知'
  
  const trimmed = name.trim().toLowerCase()
  
  return COUNTRY_MAPPING[trimmed] || name
}

/**
 * 标准化城市名称
 * @param name 原始城市名称
 * @returns 标准化后的中文名称
 */
export function normalizeCityName(name: string | null | undefined): string {
  if (!name) return '未知'
  
  const trimmed = name.trim().toLowerCase()
  
  return CITY_MAPPING[trimmed] || name
}

/**
 * 批量标准化国家名称
 * @param items 包含 name 字段的对象数组
 * @returns 标准化后的数组
 */
export function normalizeCountryData<T extends { name?: string | null }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    name: item.name ? normalizeCountryName(item.name) : item.name
  }))
}

/**
 * 批量标准化城市名称
 * @param items 包含 name 字段的对象数组
 * @returns 标准化后的数组
 */
export function normalizeCityData<T extends { name?: string | null }>(items: T[]): T[] {
  return items.map(item => ({
    ...item,
    name: item.name ? normalizeCityName(item.name) : item.name
  }))
}
