CREATE TABLE IF NOT EXISTS bloodwork_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  markers JSONB NOT NULL DEFAULT '[]',
  file_url TEXT,
  analysis_text TEXT,
  analysis_generated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bloodwork_client ON bloodwork_results(client_id);
ALTER TABLE bloodwork_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bloodwork" ON bloodwork_results FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages bloodwork" ON bloodwork_results FOR ALL USING (true);
