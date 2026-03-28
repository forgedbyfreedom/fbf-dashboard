-- Auto Program Generation Pipeline
-- Tables for program reviews, change logging, and intake status tracking

-- Program Reviews table — stores AI-generated programs pending admin approval
CREATE TABLE IF NOT EXISTS program_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  intake_id uuid,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('generating', 'pending_review', 'approved', 'rejected', 'error')),
  generated_program jsonb,
  approved_program jsonb,
  admin_notes text,
  error_message text,
  generated_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_reviews_client ON program_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_program_reviews_status ON program_reviews(status);

-- Program Change Log — tracks who changed what on client program fields
CREATE TABLE IF NOT EXISTS program_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_name text,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_change_log_client ON program_change_log(client_id);
CREATE INDEX IF NOT EXISTS idx_program_change_log_created ON program_change_log(created_at DESC);

-- Add program_status column to client_intake for pipeline tracking
-- Values: null (not started), 'pending', 'generating', 'ready_for_review', 'approved', 'program_delivered'
ALTER TABLE client_intakes ADD COLUMN IF NOT EXISTS program_status text;

-- RLS policies
ALTER TABLE program_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on program_reviews" ON program_reviews;
CREATE POLICY "Service role full access on program_reviews"
  ON program_reviews FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on program_change_log" ON program_change_log;
CREATE POLICY "Service role full access on program_change_log"
  ON program_change_log FOR ALL
  USING (true)
  WITH CHECK (true);
