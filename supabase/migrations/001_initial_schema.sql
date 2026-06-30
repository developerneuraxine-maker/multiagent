-- AI Business OS - Initial Schema
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE agent_type AS ENUM (
  'ceo', 'hr', 'marketing', 'sales', 'developer',
  'support', 'finance', 'operations'
);

CREATE TYPE agent_status AS ENUM (
  'idle', 'working', 'reviewing', 'offline'
);

CREATE TYPE task_status AS ENUM (
  'pending', 'in_progress', 'review', 'completed', 'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'rejected'
);

CREATE TYPE report_type AS ENUM (
  'executive', 'department', 'performance', 'financial', 'operational'
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Businesses
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  products TEXT[] DEFAULT '{}',
  services TEXT[] DEFAULT '{}',
  problems TEXT,
  goals TEXT,
  budget NUMERIC(12, 2) DEFAULT 0,
  health_score NUMERIC(5, 2) DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  growth_score NUMERIC(5, 2) DEFAULT 0 CHECK (growth_score >= 0 AND growth_score <= 100),
  setup_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_owner_id ON businesses(owner_id);

-- Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type agent_type NOT NULL,
  name TEXT NOT NULL,
  status agent_status NOT NULL DEFAULT 'idle',
  performance_score NUMERIC(5, 2) DEFAULT 75 CHECK (performance_score >= 0 AND performance_score <= 100),
  current_task_id UUID,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, type)
);

CREATE INDEX idx_agents_business_id ON agents(business_id);
CREATE INDEX idx_agents_type ON agents(type);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  department agent_type,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  output JSONB DEFAULT '{}',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  approved BOOLEAN DEFAULT NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_business_id ON tasks(business_id);
CREATE INDEX idx_tasks_agent_id ON tasks(agent_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

ALTER TABLE agents
  ADD CONSTRAINT fk_agents_current_task
  FOREIGN KEY (current_task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  type report_type NOT NULL DEFAULT 'department',
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_business_id ON reports(business_id);
CREATE INDEX idx_reports_agent_id ON reports(agent_id);

-- Activity Feed
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_feed_business_id ON activity_feed(business_id);
CREATE INDEX idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- Approvals
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_approvals_business_id ON approvals(business_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- Revenue Opportunities
CREATE TABLE revenue_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  potential_value NUMERIC(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'identified',
  source_agent agent_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_opportunities_business_id ON revenue_opportunities(business_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Seed default agents for new business
CREATE OR REPLACE FUNCTION public.create_default_agents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO agents (business_id, type, name, status) VALUES
    (NEW.id, 'ceo', 'CEO Agent', 'idle'),
    (NEW.id, 'hr', 'HR Agent', 'idle'),
    (NEW.id, 'marketing', 'Marketing Agent', 'idle'),
    (NEW.id, 'sales', 'Sales Agent', 'idle'),
    (NEW.id, 'developer', 'Developer Agent', 'idle'),
    (NEW.id, 'support', 'Support Agent', 'idle'),
    (NEW.id, 'finance', 'Finance Agent', 'idle'),
    (NEW.id, 'operations', 'Operations Agent', 'idle');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_agents();
