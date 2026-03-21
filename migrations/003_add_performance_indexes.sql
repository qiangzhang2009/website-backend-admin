-- 添加性能优化索引
-- 评估报告建议的优化索引
-- 执行时间: 2026-03-14

-- =============================================
-- 追踪事件表复合索引
-- =============================================

-- 租户 + 会话 复合索引 - 用于按租户查询用户的访问会话
CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_session 
ON public.tracking_events(tenant_id, session_id);

-- 租户 + 事件类型 + 时间 复合索引 - 用于按事件类型分析
CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_type_time 
ON public.tracking_events(tenant_id, event_type, created_at DESC);

-- 租户 + 访客 复合索引 - 用于用户行为分析
CREATE INDEX IF NOT EXISTS idx_tracking_events_tenant_visitor 
ON public.tracking_events(tenant_id, visitor_id);

-- =============================================
-- 工具交互表复合索引
-- =============================================

-- 租户 + 创建时间 复合索引 - 用于按时间排序查询
CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_created 
ON public.tool_interactions(tenant_id, created_at DESC);

-- 租户 + 工具名称 + 时间 复合索引 - 用于工具使用分析
CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_tool_time 
ON public.tool_interactions(tenant_id, tool_name, created_at DESC);

-- 租户 + 会话 复合索引 - 用于会话内工具使用分析
CREATE INDEX IF NOT EXISTS idx_tool_interactions_tenant_session 
ON public.tool_interactions(tenant_id, session_id);

-- =============================================
-- 其他性能优化
-- =============================================

-- page_views 表租户 + 会话 + 时间索引
CREATE INDEX IF NOT EXISTS idx_page_views_tenant_session_time
ON public.page_views(tenant_id, session_id, created_at DESC);

-- visits 表租户 + 时间索引
CREATE INDEX IF NOT EXISTS idx_visits_tenant_time
ON public.visits(tenant_id, created_at DESC);

-- inquiries 表租户 + 状态 + 时间索引
CREATE INDEX IF NOT EXISTS idx_inquiries_tenant_status_time
ON public.inquiries(tenant_id, status, created_at DESC);

-- 验证索引创建
-- SELECT indexname, indexdef FROM pg_indexes 
-- WHERE tablename IN ('tracking_events', 'tool_interactions', 'page_views', 'visits', 'inquiries');
