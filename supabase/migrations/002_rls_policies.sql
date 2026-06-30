-- AI Business OS - Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_opportunities ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Businesses
CREATE POLICY "Users can view own businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own businesses"
  ON businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- Helper: check business ownership
CREATE OR REPLACE FUNCTION user_owns_business(business_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_uuid AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Agents
CREATE POLICY "Users can view agents of own businesses"
  ON agents FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can update agents of own businesses"
  ON agents FOR UPDATE
  USING (user_owns_business(business_id));

-- Tasks
CREATE POLICY "Users can view tasks of own businesses"
  ON tasks FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can create tasks for own businesses"
  ON tasks FOR INSERT
  WITH CHECK (user_owns_business(business_id));

CREATE POLICY "Users can update tasks of own businesses"
  ON tasks FOR UPDATE
  USING (user_owns_business(business_id));

CREATE POLICY "Users can delete tasks of own businesses"
  ON tasks FOR DELETE
  USING (user_owns_business(business_id));

-- Reports
CREATE POLICY "Users can view reports of own businesses"
  ON reports FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can create reports for own businesses"
  ON reports FOR INSERT
  WITH CHECK (user_owns_business(business_id));

-- Activity Feed
CREATE POLICY "Users can view activity of own businesses"
  ON activity_feed FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can create activity for own businesses"
  ON activity_feed FOR INSERT
  WITH CHECK (user_owns_business(business_id));

-- Approvals
CREATE POLICY "Users can view approvals of own businesses"
  ON approvals FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can update approvals of own businesses"
  ON approvals FOR UPDATE
  USING (user_owns_business(business_id));

CREATE POLICY "Users can create approvals for own businesses"
  ON approvals FOR INSERT
  WITH CHECK (user_owns_business(business_id));

-- Revenue Opportunities
CREATE POLICY "Users can view opportunities of own businesses"
  ON revenue_opportunities FOR SELECT
  USING (user_owns_business(business_id));

CREATE POLICY "Users can manage opportunities of own businesses"
  ON revenue_opportunities FOR ALL
  USING (user_owns_business(business_id));

-- Service role bypass for API routes using service key (optional)
-- API routes should use authenticated user client; service role for n8n webhooks only
