-- Run this in Supabase SQL Editor

-- 1. Add new columns to existing integrations table
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider_user_id TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider_email TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS provider_avatar TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS webhook_status TEXT DEFAULT 'none';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS scopes TEXT;

-- 2. OAuth states table (CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL,
  provider TEXT NOT NULL,
  extra JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Index for fast lookup and cleanup of expired states
CREATE INDEX IF NOT EXISTS oauth_states_state_idx ON oauth_states(state);
CREATE INDEX IF NOT EXISTS oauth_states_expires_idx ON oauth_states(expires_at);

-- RLS: only service role can read oauth_states (they're server-side only)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON oauth_states;
CREATE POLICY "Service role only" ON oauth_states
  USING (auth.role() = 'service_role');
