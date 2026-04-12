-- =====================================================
-- Prismatic 追踪数据升级 v2
-- 新增 page_events / sessions / prismatic_events 表
-- 参考 Umami 数据模型设计
-- =====================================================

-- 1. sessions 表：访客会话信息
CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  session_id      TEXT UNIQUE NOT NULL,
  visitor_id      TEXT NOT NULL,
  browser         TEXT,
  os              TEXT,
  device_type     TEXT DEFAULT 'desktop',
  country         TEXT,
  subdivision1    TEXT,
  city            TEXT,
  ip_address      TEXT,

  -- 会话统计
  first_visit     TIMESTAMPTZ DEFAULT NOW(),
  last_visit      TIMESTAMPTZ DEFAULT NOW(),
  page_count      INTEGER DEFAULT 1,
  is_bounce       BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_session  ON public.sessions(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_visitor  ON public.sessions(tenant_id, visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_visit       ON public.sessions(last_visit DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id       ON public.sessions(visitor_id);

-- 2. page_events 表：页面事件（替代 tracking_events 的细分）
CREATE TABLE IF NOT EXISTS public.page_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  website_id      TEXT,
  session_id      TEXT NOT NULL,
  visitor_id      TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- 事件类型
  event_type      TEXT NOT NULL DEFAULT 'pageview',

  -- 页面信息
  url_path        TEXT,
  referrer_domain TEXT,
  url_query       TEXT,

  -- 浏览器信息
  browser         TEXT,
  os              TEXT,
  device_type     TEXT DEFAULT 'desktop',
  country         TEXT,
  subdivision1    TEXT,
  city            TEXT,

  -- 自定义事件
  event_name      TEXT,
  event_data      JSONB DEFAULT '{}',

  -- 性能指标
  page_load_time  INTEGER,
  ttfb            INTEGER,

  -- 会话上下文
  session_duration_ms INTEGER,
  is_first_visit     BOOLEAN DEFAULT FALSE,
  is_returning_visit BOOLEAN DEFAULT FALSE,
  first_visit_time   TIMESTAMPTZ,
  timezone         TEXT,
  traffic_source  TEXT,
  hostname        TEXT
);

CREATE INDEX IF NOT EXISTS idx_page_events_tenant_session ON public.page_events(tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_page_events_created       ON public.page_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_events_tenant_path   ON public.page_events(tenant_id, url_path);
CREATE INDEX IF NOT EXISTS idx_page_events_visitor       ON public.page_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_events_tenant_type   ON public.page_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_page_events_tenant_created ON public.page_events(tenant_id, created_at DESC);

-- 3. prismatic_events 表：蒸馏人物专属事件
CREATE TABLE IF NOT EXISTS public.prismatic_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,
  session_id      TEXT,
  visitor_id      TEXT,
  persona_id      TEXT,
  persona_name    TEXT,
  domain          TEXT,
  event_type      TEXT NOT NULL,
  event_data      JSONB DEFAULT '{}',

  -- AI 相关
  ai_latency_ms   INTEGER,
  model_used      TEXT,
  confidence_score REAL,
  conversation_turn INTEGER DEFAULT 0,

  -- 会话上下文
  mode            TEXT,  -- solo | prism | roundtable
  chat_start_time TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prismatic_tenant       ON public.prismatic_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prismatic_persona      ON public.prismatic_events(persona_id);
CREATE INDEX IF NOT EXISTS idx_prismatic_type         ON public.prismatic_events(event_type);
CREATE INDEX IF NOT EXISTS idx_prismatic_tenant_type  ON public.prismatic_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_prismatic_visitor      ON public.prismatic_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_prismatic_created      ON public.prismatic_events(created_at DESC);

-- 4. websites 表：支持多网站追踪（可从 tenants 表关联）
-- Prismatic 使用 website_id = 'prismatic'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'websites'
  ) THEN
    CREATE TABLE public.websites (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   UUID,
      website_id  TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      domain      TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO public.websites (website_id, name, domain)
    VALUES ('prismatic', 'Prismatic 蒸馏人物', 'prismatic.app')
    ON CONFLICT (website_id) DO NOTHING;
  END IF;
END $$;

COMMENT ON TABLE public.sessions IS '访客会话表，借鉴 Umami 数据模型';
COMMENT ON TABLE public.page_events IS '页面事件表，细分 tracking_events';
COMMENT ON TABLE public.prismatic_events IS 'Prismatic 蒸馏人物专属事件表';
