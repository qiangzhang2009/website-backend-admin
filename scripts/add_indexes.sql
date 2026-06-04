/**
 * 数据库索引迁移脚本
 * 执行时机：在 Vercel 部署后通过数据库管理工具（如 Supabase Dashboard、psql、Neon Console）手动执行
 * 或者在应用启动时通过管理接口调用（见 /api/admin/migrate）
 */

-- ================================================================
-- 多租户追踪事件表索引优化
-- 目标表: tracking_events
-- ================================================================

-- 复合索引：按租户+会话分组（覆盖大部分分析查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_session
  ON public.tracking_events(tenant_id, session_id);

-- 复合索引：按租户+时间降序（用于趋势图、最近活动）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_created
  ON public.tracking_events(tenant_id, created_at DESC);

-- 复合索引：按租户+访客（用于用户详情、用户行为分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_visitor
  ON public.tracking_events(tenant_id, visitor_id);

-- 复合索引：按租户+事件类型（用于工具使用统计、事件分布）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_event_type
  ON public.tracking_events(tenant_id, event_type);

-- 索引：按租户+地理位置（用于地域分布分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_country
  ON public.tracking_events(tenant_id, geo_country);

-- 索引：按租户+流量来源（用于来源分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracking_events_tenant_source
  ON public.tracking_events(tenant_id, traffic_source);

-- ================================================================
-- 工具交互表索引优化
-- 目标表: tool_interactions
-- ================================================================

-- 复合索引：按租户+时间降序（用于工具使用排行、最近使用记录）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_interactions_tenant_created
  ON public.tool_interactions(tenant_id, created_at DESC);

-- 复合索引：按租户+工具名称（用于工具使用统计）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_interactions_tenant_tool
  ON public.tool_interactions(tenant_id, tool_name);

-- 索引：按租户+访客（用于个人工具使用历史）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tool_interactions_tenant_visitor
  ON public.tool_interactions(tenant_id, visitor_id);

-- ================================================================
-- 用户表索引优化
-- 目标表: users
-- ================================================================

-- 复合索引：按租户+创建时间（用于用户列表分页）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_created
  ON public.users(tenant_id, created_at DESC);

-- 索引：按租户+邮箱（用于用户查找、去重）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_email
  ON public.users(tenant_id, email)
  WHERE email IS NOT NULL AND email != '';

-- 索引：按租户+手机号（用于用户查找）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_phone
  ON public.users(tenant_id, phone)
  WHERE phone IS NOT NULL AND phone != '';

-- ================================================================
-- 询盘/线索表索引优化
-- 目标表: inquiries
-- ================================================================

-- 复合索引：按租户+状态（用于询盘列表筛选）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inquiries_tenant_status
  ON public.inquiries(tenant_id, status);

-- 复合索引：按租户+创建时间（用于询盘列表排序）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inquiries_tenant_created
  ON public.inquiries(tenant_id, created_at DESC);

-- 索引：按租户+优先级（用于高优先级询盘筛选）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inquiries_tenant_priority
  ON public.inquiries(tenant_id, priority);

-- ================================================================
-- 会话表索引优化
-- 目标表: sessions
-- ================================================================

-- 复合索引：按租户+最后访问时间（用于实时在线用户查询）
-- 注意：sessions 表使用 last_visit 字段
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_tenant_last_visit
  ON public.sessions(tenant_id, last_visit DESC);

-- 索引：按租户+访客（用于用户会话历史）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_tenant_visitor
  ON public.sessions(tenant_id, visitor_id);

-- ================================================================
-- 页面事件表索引优化
-- 目标表: page_events
-- ================================================================

-- 复合索引：按租户+会话（用于会话页面路径分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_events_tenant_session
  ON public.page_events(tenant_id, session_id);

-- 复合索引：按租户+时间（用于页面访问趋势）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_events_tenant_created
  ON public.page_events(tenant_id, created_at DESC);

-- ================================================================
-- Prismatic 事件表索引优化
-- 目标表: prismatic_events
-- ================================================================

-- 复合索引：按租户+人物+事件类型（用于人物分析）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prismatic_events_tenant_persona
  ON public.prismatic_events(tenant_id, persona_id, event_type);

-- 复合索引：按租户+时间（用于最近事件流）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prismatic_events_tenant_created
  ON public.prismatic_events(tenant_id, created_at DESC);

-- ================================================================
-- 查看索引创建结果
-- ================================================================

-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;
