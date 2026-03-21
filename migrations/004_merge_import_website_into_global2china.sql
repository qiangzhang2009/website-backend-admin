-- =============================================================================
-- 合并重复租户：import-website → global2china（同一站点 global2china.zxqconsulting.com）
-- 在 Neon / Supabase SQL 编辑器中执行一次即可。
-- =============================================================================

DO $$
DECLARE
  keep_id uuid;
  drop_id uuid;
  has_prefs boolean;
  has_profiles boolean;
  has_lifecycle boolean;
  has_rfm boolean;
  has_content boolean;
  has_module boolean;
  has_conv boolean;
  has_funnel boolean;
  has_chat boolean;
BEGIN
  SELECT id INTO keep_id FROM public.tenants WHERE slug = 'global2china' LIMIT 1;
  SELECT id INTO drop_id FROM public.tenants WHERE slug = 'import-website' LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) INTO has_prefs;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) INTO has_profiles;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_lifecycle'
  ) INTO has_lifecycle;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rfm_analysis'
  ) INTO has_rfm;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'content_analytics'
  ) INTO has_content;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'module_usage'
  ) INTO has_module;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'conversation_sessions'
  ) INTO has_conv;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'funnel_analytics'
  ) INTO has_funnel;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_histories'
  ) INTO has_chat;

  IF keep_id IS NULL AND drop_id IS NOT NULL THEN
    UPDATE public.tenants
    SET
      slug = 'global2china',
      name = COALESCE(NULLIF(TRIM(name), ''), 'Global2China 全球优品'),
      domain = 'global2china.zxqconsulting.com'
    WHERE id = drop_id;
    RAISE NOTICE 'Renamed tenant import-website → global2china';
    RETURN;
  END IF;

  IF keep_id IS NULL OR drop_id IS NULL THEN
    RAISE NOTICE 'Merge skipped: missing global2china or import-website.';
    RETURN;
  END IF;

  IF keep_id = drop_id THEN
    RETURN;
  END IF;

  IF has_prefs THEN
    EXECUTE format($f$
      DELETE FROM public.user_preferences up
      WHERE up.tenant_id = %L
        AND EXISTS (
          SELECT 1 FROM public.user_preferences up2
          WHERE up2.tenant_id = %L
            AND up2.visitor_id IS NOT DISTINCT FROM up.visitor_id
            AND up2.preference_key = up.preference_key
        ) $f$, drop_id, keep_id);
  END IF;

  IF has_profiles THEN
    EXECUTE format($f$
      DELETE FROM public.user_profiles up
      WHERE up.tenant_id = %L
        AND EXISTS (
          SELECT 1 FROM public.user_profiles up2
          WHERE up2.tenant_id = %L
            AND up2.visitor_id IS NOT DISTINCT FROM up.visitor_id
            AND up2.profile_id = up.profile_id
        ) $f$, drop_id, keep_id);
  END IF;

  IF has_lifecycle THEN
    EXECUTE format($f$
      DELETE FROM public.user_lifecycle ul
      WHERE ul.tenant_id = %L
        AND EXISTS (
          SELECT 1 FROM public.user_lifecycle ul2
          WHERE ul2.tenant_id = %L AND ul2.visitor_id = ul.visitor_id
        ) $f$, drop_id, keep_id);
  END IF;

  IF has_rfm THEN
    EXECUTE format($f$
      DELETE FROM public.rfm_analysis r
      WHERE r.tenant_id = %L
        AND EXISTS (
          SELECT 1 FROM public.rfm_analysis r2
          WHERE r2.tenant_id = %L AND r2.visitor_id = r.visitor_id
        ) $f$, drop_id, keep_id);
  END IF;

  IF has_content THEN
    EXECUTE format($f$
      DELETE FROM public.content_analytics ca
      WHERE ca.tenant_id = %L
        AND EXISTS (
          SELECT 1 FROM public.content_analytics ca2
          WHERE ca2.tenant_id = %L
            AND ca2.content_type = ca.content_type
            AND ca2.content_id = ca.content_id
        ) $f$, drop_id, keep_id);
  END IF;

  DELETE FROM public.users u
  WHERE u.tenant_id = drop_id
    AND u.visitor_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.users u2
      WHERE u2.tenant_id = keep_id AND u2.visitor_id = u.visitor_id
    );

  UPDATE public.tracking_events SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.visits SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.page_views SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.tool_interactions SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.inquiries SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.follow_ups SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.tags SET tenant_id = keep_id WHERE tenant_id = drop_id;
  UPDATE public.users SET tenant_id = keep_id WHERE tenant_id = drop_id;

  IF has_prefs THEN
    EXECUTE format('UPDATE public.user_preferences SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_profiles THEN
    EXECUTE format('UPDATE public.user_profiles SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_module THEN
    EXECUTE format('UPDATE public.module_usage SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_lifecycle THEN
    EXECUTE format('UPDATE public.user_lifecycle SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_rfm THEN
    EXECUTE format('UPDATE public.rfm_analysis SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_conv THEN
    EXECUTE format('UPDATE public.conversation_sessions SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_content THEN
    EXECUTE format('UPDATE public.content_analytics SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_funnel THEN
    EXECUTE format('UPDATE public.funnel_analytics SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;
  IF has_chat THEN
    EXECUTE format('UPDATE public.chat_histories SET tenant_id = %L WHERE tenant_id = %L', keep_id, drop_id);
  END IF;

  DELETE FROM public.tenants WHERE id = drop_id;

  UPDATE public.tenants
  SET
    name = 'Global2China 全球优品',
    domain = 'global2china.zxqconsulting.com'
  WHERE id = keep_id;

  RAISE NOTICE 'Merged import-website into global2china.';
END $$;
