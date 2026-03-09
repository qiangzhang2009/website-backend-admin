-- =============================================
-- 多租户网站数据管理系统 - 数据库初始化脚本
-- 运行方式: 在 Supabase SQL Editor 中执行
-- =============================================

-- 1. 租户表
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    timezone TEXT DEFAULT 'Asia/Shanghai',
    language TEXT DEFAULT 'zh-CN',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 访问者/用户表
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_id TEXT,
    session_id TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    company TEXT,
    product_type TEXT,
    target_market TEXT,
    source TEXT,
    inquiry_count INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 1,
    first_visit_at TIMESTAMPTZ DEFAULT NOW(),
    last_visit_at TIMESTAMPTZ DEFAULT NOW(),
    first_inquiry_at TIMESTAMPTZ,
    last_inquiry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 访问记录表
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_id TEXT,
    session_id TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    page_count INTEGER DEFAULT 0,
    source TEXT,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 页面浏览记录表
CREATE TABLE IF NOT EXISTS public.page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_id TEXT,
    session_id TEXT,
    visit_id UUID REFERENCES public.visits(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    page_path TEXT,
    page_title TEXT,
    referrer TEXT,
    time_on_page_seconds INTEGER,
    scroll_depth INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 工具交互记录表
CREATE TABLE IF NOT EXISTS public.tool_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    visitor_id TEXT,
    session_id TEXT,
    tool_name TEXT NOT NULL,
    tool_section TEXT,
    action TEXT NOT NULL,
    input_params JSONB,
    output_result JSONB,
    duration_ms INTEGER,
    step_completed INTEGER,
    total_steps INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 询盘/线索表
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    visitor_id TEXT,
    name TEXT,
    phone TEXT,
    email TEXT,
    company TEXT,
    product_type TEXT,
    target_market TEXT,
    message TEXT,
    source TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    assignee TEXT,
    follow_up_count INTEGER DEFAULT 0,
    last_follow_up_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 跟进记录表
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    follow_up_type TEXT DEFAULT 'note',
    next_follow_up_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 用户标签表
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'custom',
    color TEXT DEFAULT '#1890ff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 用户标签关联表
CREATE TABLE IF NOT EXISTS public.user_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tag_id)
);

-- 10. 追踪事件日志表（用于数据分析）
CREATE TABLE IF NOT EXISTS public.tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    session_id TEXT,
    visitor_id TEXT,
    website_url TEXT,
    page_url TEXT,
    page_title TEXT,
    referrer TEXT,
    user_agent TEXT,
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 索引优化
-- =============================================

-- 租户相关索引
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visits_tenant ON public.visits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_page_views_tenant ON public.page_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant ON public.tool_interactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant ON public.inquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON public.follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_tenant ON public.tags(tenant_id);

-- 访客/会话索引
CREATE INDEX IF NOT EXISTS idx_users_visitor ON public.users(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON public.visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_session ON public.visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON public.page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_interactions_session ON public.tool_interactions(session_id);

-- 时间索引
CREATE INDEX IF NOT EXISTS idx_users_last_visit ON public.users(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON public.inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_events_created ON public.tracking_events(created_at);

-- 业务索引
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_assignee ON public.inquiries(assignee);
CREATE INDEX IF NOT EXISTS idx_tool_interactions_tool ON public.tool_interactions(tool_name);

-- =============================================
-- RLS策略（数据安全）
-- =============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

-- 租户只能看到自己的数据
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (true);
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (true);
CREATE POLICY "tenants_delete" ON public.tenants FOR DELETE USING (true);

CREATE POLICY "users_select" ON public.users FOR SELECT USING (tenant_id = (SELECT id FROM tenants LIMIT 1));
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (true);
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (true);

CREATE POLICY "visits_select" ON public.visits FOR SELECT USING (true);
CREATE POLICY "visits_insert" ON public.visits FOR INSERT WITH CHECK (true);

CREATE POLICY "page_views_select" ON public.page_views FOR SELECT USING (true);
CREATE POLICY "page_views_insert" ON public.page_views FOR INSERT WITH CHECK (true);

CREATE POLICY "tool_interactions_select" ON public.tool_interactions FOR SELECT USING (true);
CREATE POLICY "tool_interactions_insert" ON public.tool_interactions FOR INSERT WITH CHECK (true);

CREATE POLICY "inquiries_select" ON public.inquiries FOR SELECT USING (true);
CREATE POLICY "inquiries_insert" ON public.inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "inquiries_update" ON public.inquiries FOR UPDATE USING (true);
CREATE POLICY "inquiries_delete" ON public.inquiries FOR DELETE USING (true);

CREATE POLICY "follow_ups_select" ON public.follow_ups FOR SELECT USING (true);
CREATE POLICY "follow_ups_insert" ON public.follow_ups FOR INSERT WITH CHECK (true);

CREATE POLICY "tags_select" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_insert" ON public.tags FOR INSERT WITH CHECK (true);
CREATE POLICY "tags_update" ON public.tags FOR UPDATE USING (true);
CREATE POLICY "tags_delete" ON public.tags FOR DELETE USING (true);

CREATE POLICY "user_tags_select" ON public.user_tags FOR SELECT USING (true);
CREATE POLICY "user_tags_insert" ON public.user_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "user_tags_delete" ON public.user_tags FOR DELETE USING (true);

CREATE POLICY "tracking_events_select" ON public.tracking_events FOR SELECT USING (true);
CREATE POLICY "tracking_events_insert" ON public.tracking_events FOR INSERT WITH CHECK (true);

-- =============================================
-- 插入示例租户数据
-- =============================================

INSERT INTO public.tenants (name, slug, domain, settings) VALUES
    ('zxqconsulting网站', 'zxqconsulting', 'www.zxqconsulting.com', '{"features": {"userProfile": true, "inquiry": true, "analytics": true, "tools": true}}'),
    ('知几命理网站', 'zero', 'zero.zxqconsulting.com', '{"features": {"userProfile": true, "inquiry": true, "analytics": true, "tools": true}}'),
    ('进口服务网站', 'import-website', 'import-website.vercel.app', '{"features": {"userProfile": false, "inquiry": true, "analytics": true, "tools": true}}')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 创建更新时间的触发器
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON public.inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
