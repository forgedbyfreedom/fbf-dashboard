-- Client Intake / Onboarding system
-- Stores intake form data for new clients

-- Create the intake_tokens table for magic link access
CREATE TABLE IF NOT EXISTS intake_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked')),
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX idx_intake_tokens_hash ON intake_tokens(token_hash);
CREATE INDEX idx_intake_tokens_client ON intake_tokens(client_id);

-- Create the client_intake table
CREATE TABLE IF NOT EXISTS client_intake (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone text,
  date_of_birth date,
  emergency_contact_name text,
  emergency_contact_phone text,
  height_inches integer,
  current_weight_lbs numeric,
  goal_weight_lbs numeric,
  primary_goals text,
  training_experience text,
  injuries_or_limitations text,
  medical_conditions text,
  current_medications text,
  allergies text,
  dietary_restrictions text,
  previous_coaches text,
  how_did_you_hear text,
  waiver_accepted boolean DEFAULT false,
  waiver_accepted_at timestamptz,
  waiver_ip text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_client_intake_client ON client_intake(client_id);

-- Allow service role full access (RLS)
ALTER TABLE client_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_tokens ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY "Service role full access on client_intake"
  ON client_intake FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on intake_tokens"
  ON intake_tokens FOR ALL
  USING (true)
  WITH CHECK (true);
