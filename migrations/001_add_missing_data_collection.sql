-- 数据库迁移：补充缺失的数据采集表
-- 运行前请确认数据库已创建

-- 1. 用户档案表（支持多档案，如 zero2 的命理档案）
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  profile_id VARCHAR(255) NOT NULL,  -- 前端生成的档案 ID
  profile_type VARCHAR(50) DEFAULT 'default',  -- 档案类型: default, bazi, fengshui, etc.
  name VARCHAR(255),
  avatar VARCHAR(255),
  birthday VARCHAR(20),  -- 出生日期
  birth_time VARCHAR(10),  -- 出生时辰
  gender VARCHAR(20),
  profile_data JSONB DEFAULT '{}',  -- 档案详细信息（八字、风水等）
  profile_completeness INTEGER DEFAULT 0,  -- 档案完整度 0-100
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 模块使用统计表
CREATE TABLE IF NOT EXISTS public.module_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  module_id VARCHAR(100) NOT NULL,  -- 模块 ID: bazi, fengshui, tarot, etc.
  module_name VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,  -- start, input, output, complete, abandon
  conversation_turns INTEGER DEFAULT 0,  -- 对话轮次
  duration_seconds INTEGER,  -- 使用时长
  input_params JSONB DEFAULT '{}',  -- 输入参数
  output_result JSONB DEFAULT '{}',  -- 输出结果
  completed_steps INTEGER DEFAULT 0,  -- 完成的步骤
  total_steps INTEGER,  -- 总步骤数
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 用户偏好设置表
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255) NOT NULL,
  preference_key VARCHAR(100) NOT NULL,  -- language, device_type, theme, etc.
  preference_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, visitor_id, preference_key)
);

-- 4. 用户生命周期表
CREATE TABLE IF NOT EXISTS public.user_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255) NOT NULL,
  lifecycle_stage VARCHAR(50) NOT NULL,  -- new, active, at_risk, dormant, churned
  first_visit_at TIMESTAMPTZ,
  last_visit_at TIMESTAMPTZ,
  visit_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  inactive_days INTEGER DEFAULT 0,  -- 距离最后访问的天数
  stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, visitor_id)
);

-- 5. RFM 分析表
CREATE TABLE IF NOT EXISTS public.rfm_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255) NOT NULL,
  r_score INTEGER,  -- Recency 分数 1-5 (5=最近)
  f_score INTEGER,  -- Frequency 分数 1-5 (5=高频)
  m_score INTEGER,  -- Monetary 分数 1-5 (5=高价值)
  rfm_score INTEGER,  -- 总分 3-15
  rfm_segment VARCHAR(50),  -- VIP, Regular, At_Risk, Lost, etc.
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, visitor_id)
);

-- 6. 对话历史增强表（支持更详细的对话分析）
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  module_id VARCHAR(100) NOT NULL,
  profile_id VARCHAR(255),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  message_count INTEGER DEFAULT 0,
  user_message_count INTEGER DEFAULT 0,
  ai_message_count INTEGER DEFAULT 0,
  contains_image BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  abandoned_at TIMESTAMPTZ
);

-- 7. 内容热度表（页面/工具访问排行）
CREATE TABLE IF NOT EXISTS public.content_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL,  -- page, tool, article, module
  content_id VARCHAR(255) NOT NULL,
  content_name VARCHAR(255),
  view_count INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, content_type, content_id)
);

-- 8. 用户行为漏斗表
CREATE TABLE IF NOT EXISTS public.funnel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  funnel_name VARCHAR(100) NOT NULL,
  step_name VARCHAR(100) NOT NULL,
  step_order INTEGER NOT NULL,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_visitor ON public.user_profiles(visitor_id);
CREATE INDEX IF NOT EXISTS idx_module_usage_tenant ON public.module_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_module_usage_visitor ON public.module_usage(visitor_id);
CREATE INDEX IF NOT EXISTS idx_module_usage_module ON public.module_usage(module_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant ON public.user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_visitor ON public.user_preferences(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_tenant ON public.user_lifecycle(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_visitor ON public.user_lifecycle(visitor_id);
CREATE INDEX IF NOT EXISTS idx_user_lifecycle_stage ON public.user_lifecycle(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_rfm_analysis_tenant ON public.rfm_analysis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rfm_analysis_segment ON public.rfm_analysis(rfm_segment);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_tenant ON public.conversation_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_visitor ON public.conversation_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_content_analytics_tenant ON public.content_analytics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_tenant ON public.funnel_analytics(tenant_id);

-- 添加新字段到现有表（如果不存在）
ALTER TABLE public.tool_interactions ADD COLUMN IF NOT EXISTS module VARCHAR(100);
ALTER TABLE public.tool_interactions ADD COLUMN IF NOT EXISTS user_message TEXT;
ALTER TABLE public.tool_interactions ADD COLUMN IF NOT EXISTS ai_message TEXT;
ALTER TABLE public.tool_interactions ADD COLUMN IF NOT EXISTS conversation_turns INTEGER DEFAULT 0;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_completeness INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_module VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'new';
