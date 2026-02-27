-- ============================================
-- FBF Coach Dashboard - Initial Schema
-- ============================================

-- Organizations
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Profiles (all users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Org membership + roles
CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('org_admin', 'coach')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid REFERENCES profiles(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  timezone text DEFAULT 'America/New_York',
  target_calories int,
  target_protein int,
  target_steps int,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Coach <-> Client assignments
CREATE TABLE client_coach_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL REFERENCES profiles(id),
  is_active boolean DEFAULT true,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(client_id, coach_user_id)
);

-- Magic links (hashed tokens)
CREATE TABLE client_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Daily check-ins
CREATE TABLE checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight_lbs numeric,
  sleep_hours numeric,
  sleep_quality int CHECK (sleep_quality BETWEEN 1 AND 10),
  steps int,
  calories int,
  protein_g int,
  carbs_g int,
  fat_g int,
  training_done boolean DEFAULT false,
  training_type text,
  workout_notes text,
  rpe int CHECK (rpe BETWEEN 1 AND 10),
  cardio_minutes int,
  supplements_json jsonb DEFAULT '[]',
  ped_log_json jsonb DEFAULT '[]',
  side_effects_notes text,
  general_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, date)
);

-- Files (photos, labs)
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id),
  checkin_id uuid REFERENCES checkins(id),
  file_type text CHECK (file_type IN ('progress_photo', 'lab_pdf', 'other')),
  storage_path text NOT NULL,
  original_name text,
  created_at timestamptz DEFAULT now()
);

-- Coach notes
CREATE TABLE coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_user_id uuid NOT NULL REFERENCES profiles(id),
  note text NOT NULL,
  action_items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

-- Auto-generated flags
CREATE TABLE flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text CHECK (severity IN ('green', 'yellow', 'red')),
  details jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Pre-computed metrics (fast dashboard)
CREATE TABLE client_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
  coach_user_id uuid REFERENCES profiles(id),
  last_checkin_at timestamptz,
  adherence_7d numeric,
  avg_calories_7d numeric,
  avg_protein_7d numeric,
  avg_steps_7d numeric,
  avg_sleep_7d numeric,
  weight_current numeric,
  weight_delta_7d numeric,
  weight_delta_30d numeric,
  status text DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  open_flags_count int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_checkins_client_date ON checkins(client_id, date DESC);
CREATE INDEX idx_clients_org ON clients(organization_id, is_active);
CREATE INDEX idx_assignments_coach ON client_coach_assignments(coach_user_id, is_active);
CREATE INDEX idx_flags_client ON flags(client_id, resolved_at, created_at DESC);
CREATE INDEX idx_metrics_coach ON client_metrics(coach_user_id, status, last_checkin_at DESC);
CREATE INDEX idx_client_links_hash ON client_links(token_hash);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_metrics ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is org_admin for a given org
CREATE OR REPLACE FUNCTION is_org_admin(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = 'org_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: check if user is a coach assigned to a client
CREATE OR REPLACE FUNCTION is_assigned_coach(cid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM client_coach_assignments
    WHERE client_id = cid
      AND coach_user_id = auth.uid()
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: get user's org IDs
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF uuid AS $$
  SELECT organization_id FROM org_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- RLS Policies: profiles
-- ============================================
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
  ON profiles FOR SELECT
  USING (id IN (
    SELECT user_id FROM org_members WHERE organization_id IN (SELECT user_org_ids())
  ));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- RLS Policies: organizations
-- ============================================
CREATE POLICY "Users can view their orgs"
  ON organizations FOR SELECT
  USING (id IN (SELECT user_org_ids()));

-- ============================================
-- RLS Policies: org_members
-- ============================================
CREATE POLICY "Members can view their org members"
  ON org_members FOR SELECT
  USING (organization_id IN (SELECT user_org_ids()));

CREATE POLICY "Org admins can manage members"
  ON org_members FOR ALL
  USING (is_org_admin(organization_id));

-- ============================================
-- RLS Policies: clients
-- ============================================
CREATE POLICY "Coaches see assigned clients"
  ON clients FOR SELECT
  USING (
    is_assigned_coach(id)
    OR is_org_admin(organization_id)
    OR user_id = auth.uid()
  );

CREATE POLICY "Coaches can update assigned clients"
  ON clients FOR UPDATE
  USING (
    is_assigned_coach(id)
    OR is_org_admin(organization_id)
  );

CREATE POLICY "Org admins can insert clients"
  ON clients FOR INSERT
  WITH CHECK (is_org_admin(organization_id));

CREATE POLICY "Coaches can insert clients in their org"
  ON clients FOR INSERT
  WITH CHECK (organization_id IN (SELECT user_org_ids()));

-- ============================================
-- RLS Policies: client_coach_assignments
-- ============================================
CREATE POLICY "Coaches see own assignments"
  ON client_coach_assignments FOR SELECT
  USING (
    coach_user_id = auth.uid()
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
  );

CREATE POLICY "Org admins manage assignments"
  ON client_coach_assignments FOR ALL
  USING (is_org_admin((SELECT organization_id FROM clients WHERE id = client_id)));

-- ============================================
-- RLS Policies: client_links
-- ============================================
CREATE POLICY "Coaches see links for assigned clients"
  ON client_links FOR SELECT
  USING (is_assigned_coach(client_id));

CREATE POLICY "Coaches manage links for assigned clients"
  ON client_links FOR ALL
  USING (is_assigned_coach(client_id));

-- ============================================
-- RLS Policies: checkins
-- ============================================
CREATE POLICY "Coaches see checkins for assigned clients"
  ON checkins FOR SELECT
  USING (
    is_assigned_coach(client_id)
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- Check-in INSERT is done via service role (magic link API), no RLS policy needed for anon insert

-- ============================================
-- RLS Policies: files
-- ============================================
CREATE POLICY "Coaches see files for assigned clients"
  ON files FOR SELECT
  USING (
    is_assigned_coach(client_id)
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
    OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
  );

-- ============================================
-- RLS Policies: coach_notes
-- ============================================
CREATE POLICY "Coaches see notes for assigned clients"
  ON coach_notes FOR SELECT
  USING (is_assigned_coach(client_id));

CREATE POLICY "Coaches can add notes for assigned clients"
  ON coach_notes FOR INSERT
  WITH CHECK (is_assigned_coach(client_id) AND coach_user_id = auth.uid());

-- ============================================
-- RLS Policies: flags
-- ============================================
CREATE POLICY "Coaches see flags for assigned clients"
  ON flags FOR SELECT
  USING (
    is_assigned_coach(client_id)
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = client_id))
  );

CREATE POLICY "Coaches can resolve flags"
  ON flags FOR UPDATE
  USING (is_assigned_coach(client_id));

-- ============================================
-- RLS Policies: client_metrics
-- ============================================
CREATE POLICY "Coaches see metrics for assigned clients"
  ON client_metrics FOR SELECT
  USING (
    coach_user_id = auth.uid()
    OR is_org_admin((SELECT organization_id FROM clients WHERE id = (
      SELECT id FROM clients WHERE id = client_metrics.client_id
    )))
  );

-- ============================================
-- Storage bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-files', 'checkin-files', false);

CREATE POLICY "Coaches can view client files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkin-files');

CREATE POLICY "Service role uploads files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'checkin-files');
