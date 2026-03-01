-- Instagram handle on clients (for engagement tracking)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_handle text;

-- Scheduled/published Instagram posts
CREATE TABLE IF NOT EXISTS instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_user_id uuid NOT NULL REFERENCES profiles(id),
  caption text NOT NULL,
  image_url text,
  image_urls text[],
  post_type text NOT NULL CHECK (post_type IN ('motivational', 'transformation', 'tip', 'custom')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for timestamptz NOT NULL,
  published_at timestamptz,
  instagram_post_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_status ON instagram_posts(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_coach ON instagram_posts(coach_user_id, created_at DESC);

-- Instagram DM leads
CREATE TABLE IF NOT EXISTS instagram_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_user_id text NOT NULL,
  instagram_username text,
  name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'archived')),
  first_message text,
  notes text,
  auto_responded boolean DEFAULT false,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_leads_user ON instagram_leads(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_leads_status ON instagram_leads(status, created_at DESC);

-- Instagram DM message log
CREATE TABLE IF NOT EXISTS instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES instagram_leads(id) ON DELETE CASCADE,
  instagram_message_id text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message text NOT NULL,
  sender_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_lead ON instagram_messages(lead_id, created_at DESC);

-- RLS
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own posts" ON instagram_posts
  FOR ALL USING (coach_user_id = auth.uid());

CREATE POLICY "Org members see leads" ON instagram_leads
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members manage leads" ON instagram_leads
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org members see lead messages" ON instagram_messages
  FOR SELECT USING (
    lead_id IN (
      SELECT id FROM instagram_leads WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Auto-response template (stored in org settings or as a simple config)
-- We'll use a default in the code and allow override via env var
