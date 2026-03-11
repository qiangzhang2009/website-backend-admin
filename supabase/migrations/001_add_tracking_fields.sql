-- 添加追踪事件新字段的迁移脚本
-- 运行此脚本添加设备信息、地理位置和访问来源字段

ALTER TABLE public.tracking_events 
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS browser TEXT,
ADD COLUMN IF NOT EXISTS os TEXT,
ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
ADD COLUMN IF NOT EXISTS language TEXT,
ADD COLUMN IF NOT EXISTS traffic_source TEXT,
ADD COLUMN IF NOT EXISTS geo_country TEXT,
ADD COLUMN IF NOT EXISTS geo_region TEXT,
ADD COLUMN IF NOT EXISTS geo_city TEXT,
ADD COLUMN IF NOT EXISTS geo_isp TEXT;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_tracking_events_visitor_id ON public.tracking_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_session_id ON public.tracking_events(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_geo_country ON public.tracking_events(geo_country);
CREATE INDEX IF NOT EXISTS idx_tracking_events_device_type ON public.tracking_events(device_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_traffic_source ON public.tracking_events(traffic_source);
