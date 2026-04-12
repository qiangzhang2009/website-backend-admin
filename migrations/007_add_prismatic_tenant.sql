-- Migration: Add Prismatic as a tenant site
-- Run after 006_prismatic_tracking_v2.sql

BEGIN;

-- Insert Prismatic as a tracked site
INSERT INTO public.tenants (name, slug, domain, timezone, language, settings)
VALUES (
  'Prismatic 折射之光',
  'prismatic',
  'prismatic-app.vercel.app',
  'Asia/Shanghai',
  'zh-CN',
  '{"features": {"prismaticAnalytics": true, "personaTracking": true, "aiMetrics": true}}'
)
ON CONFLICT (slug) DO NOTHING;

-- Verify
SELECT id, name, slug FROM public.tenants WHERE slug = 'prismatic';

COMMIT;
