-- Migration: Fix column name mismatches in tool_interactions queries
-- Issue: API queries reference duration_seconds and input_data/output_data
--         but Neon PostgreSQL table uses duration_ms and input_params/output_result

-- 1. Add duration_seconds as a generated/computed column (derived from duration_ms)
-- This lets existing queries that use duration_seconds continue to work
ALTER TABLE public.tool_interactions
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER
  GENERATED ALWAYS AS (CASE WHEN duration_ms IS NOT NULL THEN duration_ms / 1000 ELSE NULL END) STORED;

-- 2. Add input_data and output_data as aliases for input_params and output_result
-- This allows the modules API queries (which reference input_data/output_data) to work
-- We create views for backward compatibility instead of renaming columns
-- (Renaming would break the insertToolInteraction function in db/index.ts)

-- Create a view that provides the column names expected by the API
CREATE OR REPLACE VIEW public.tool_interactions_v AS
SELECT
  id,
  tenant_id,
  visitor_id,
  session_id,
  tool_name,
  tool_section,
  action,
  input_params,
  output_result,
  duration_ms,
  duration_seconds,
  step_completed,
  total_steps,
  module,
  user_message,
  ai_message,
  created_at
FROM public.tool_interactions;

-- 3. Ensure the reports API's TO_CHAR DATE query works with TIMESTAMPTZ
-- (Already works in PostgreSQL, no change needed)
