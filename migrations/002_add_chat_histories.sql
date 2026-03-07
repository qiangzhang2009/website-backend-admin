-- 聊天历史记录表
CREATE TABLE IF NOT EXISTS public.chat_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_id VARCHAR(255),
  session_id VARCHAR(255),
  role VARCHAR(20) NOT NULL,  -- user, assistant
  content TEXT NOT NULL,
  divination_type VARCHAR(100),  -- 模块类型: bazi, fengshui, tarot, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_chat_histories_tenant ON public.chat_histories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_visitor ON public.chat_histories(visitor_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_session ON public.chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_type ON public.chat_histories(divination_type);
CREATE INDEX IF NOT EXISTS idx_chat_histories_created ON public.chat_histories(created_at DESC);
