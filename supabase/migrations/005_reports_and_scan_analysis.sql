-- 005: Reports & Scan Analysis
-- Adds analysis columns to body_composition_scans and creates client_reports table

-- Add AI analysis fields to body composition scans
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS analysis_text text;
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS analysis_generated_at timestamptz;
ALTER TABLE body_composition_scans ADD COLUMN IF NOT EXISTS file_url text;

-- Client Reports table
CREATE TABLE IF NOT EXISTS client_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('weekly', 'monthly')),
  report_date date NOT NULL,
  pdf_url text,
  report_data jsonb DEFAULT '{}',
  coach_name text,
  emailed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, report_type, report_date)
);

-- RLS for client_reports
ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;

-- Coaches in same org can see reports for their clients
CREATE POLICY "Coaches can view client reports" ON client_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM client_coach_assignments cca
      JOIN org_members om ON om.user_id = cca.coach_user_id
      WHERE cca.client_id = client_reports.client_id
        AND cca.is_active = true
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can insert client reports" ON client_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM client_coach_assignments cca
      WHERE cca.client_id = client_reports.client_id
        AND cca.is_active = true
        AND cca.coach_user_id = auth.uid()
    )
  );

-- Create storage buckets (run via Supabase dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('reports', 'reports', false, 10485760),
--        ('client-documents', 'client-documents', false, 20971520)
-- ON CONFLICT DO NOTHING;
