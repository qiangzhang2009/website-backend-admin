# 数据库性能优化建议

## 概述

本文件记录了针对数据管理系统的数据库性能优化建议。

## 索引优化建议

### 1. 追踪事件表 (tracking_events)

当前查询模式：
- 按 `tenant_id` 和 `created_at` 过滤
- 按 `tenant_id` 和 `event_type` 过滤
- 按 `visitor_id` 过滤

建议添加索引：
```sql
-- 复合索引：租户 + 时间范围查询
CREATE INDEX idx_tracking_events_tenant_created 
ON public.tracking_events (tenant_id, created_at DESC);

-- 复合索引：租户 + 事件类型查询
CREATE INDEX idx_tracking_events_tenant_event 
ON public.tracking_events (tenant_id, event_type);

-- 复合索引：租户 + 访客ID查询
CREATE INDEX idx_tracking_events_tenant_visitor 
ON public.tracking_events (tenant_id, visitor_id);
```

### 2. 用户表 (users)

当前查询模式：
- 按 `tenant_id` 过滤
- 按 `tenant_id` + 姓名/公司/邮箱 搜索
- 按 `tenant_id` + `visitor_id` 查询

建议添加索引：
```sql
-- 复合索引：租户 + 更新时间排序
CREATE INDEX idx_users_tenant_updated 
ON public.users (tenant_id, updated_at DESC);

-- 索引：支持 ILIKE 搜索
CREATE INDEX idx_users_name_gin 
ON public.users USING gin (name gin_trgm_ops);

CREATE INDEX idx_users_company_gin 
ON public.users USING gin (company gin_trgm_ops);

CREATE INDEX idx_users_email_gin 
ON public.users USING gin (email gin_trgm_ops);
```

### 3. 询盘表 (inquiries)

当前查询模式：
- 按 `tenant_id` 过滤
- 按 `tenant_id` + `status` 过滤
- 按 `tenant_id` + 创建时间排序

建议添加索引：
```sql
-- 复合索引：租户 + 状态 + 创建时间
CREATE INDEX idx_inquiries_tenant_status_created 
ON public.inquiries (tenant_id, status, created_at DESC);
```

### 4. 工具交互表 (tool_interactions)

当前查询模式：
- 按 `tenant_id` 过滤
- 按 `tool_name` 分组统计

建议添加索引：
```sql
-- 复合索引：租户 + 工具名
CREATE INDEX idx_tool_interactions_tenant_tool 
ON public.tool_interactions (tenant_id, tool_name);
```

### 5. RFM 分析表 (rfm_analysis)

当前查询模式：
- 按 `tenant_id` 过滤
- 按 `tenant_id` + `rfm_segment` 过滤

建议添加索引：
```sql
-- 复合索引：租户 + 分段
CREATE INDEX idx_rfm_analysis_tenant_segment 
ON public.rfm_analysis (tenant_id, rfm_segment);
```

## 查询优化建议

### 1. 统计查询优化

当前 `stats/route.ts` 中的查询：
```sql
SELECT COUNT(DISTINCT visitor_id) FROM tracking_events 
WHERE tenant_id = ? AND created_at >= ?
```

建议：使用物化视图或定时任务预先计算统计数据。

### 2. 分页查询优化

对于大表分页，建议使用游标分页（keyset pagination）替代 OFFSET：
```sql
-- 替代
-- SELECT * FROM users ORDER BY created_at DESC LIMIT 10 OFFSET 1000

-- 使用
SELECT * FROM users 
WHERE created_at < 'last_seen_timestamp' 
ORDER BY created_at DESC 
LIMIT 10
```

## 实施步骤

1. 在测试环境执行上述索引创建语句
2. 使用 EXPLAIN ANALYZE 验证查询性能提升
3. 在生产环境中应用优化

## 注意事项

- 索引会增加写入开销，请根据实际读写比例权衡
- 对于数据量较小的表（如 < 10万行），索引优化效果不明显
- 定期使用 ANALYZE 更新统计信息
