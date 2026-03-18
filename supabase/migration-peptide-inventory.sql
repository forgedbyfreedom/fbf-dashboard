-- Peptide inventory: track wholesale stock levels
CREATE TABLE IF NOT EXISTS peptide_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  peptide_name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 2,
  wholesale_cost NUMERIC(8,2),
  retail_price NUMERIC(8,2),
  supplier TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(peptide_name, size_label)
);

-- Inventory transactions: log every stock change
CREATE TABLE IF NOT EXISTS peptide_inventory_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID REFERENCES peptide_inventory(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'received', 'assigned', 'expired', 'adjustment'
  quantity INTEGER NOT NULL, -- positive = added, negative = removed
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peptide_inv_name ON peptide_inventory(peptide_name);
CREATE INDEX IF NOT EXISTS idx_peptide_log_inv ON peptide_inventory_log(inventory_id);
CREATE INDEX IF NOT EXISTS idx_peptide_log_client ON peptide_inventory_log(client_id);

ALTER TABLE peptide_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE peptide_inventory_log ENABLE ROW LEVEL SECURITY;

-- Only org_admin/coach can see inventory
CREATE POLICY "Org members can read inventory"
  ON peptide_inventory FOR SELECT
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages inventory"
  ON peptide_inventory FOR ALL
  USING (true);

CREATE POLICY "Org members can read inventory log"
  ON peptide_inventory_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM org_members WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages inventory log"
  ON peptide_inventory_log FOR ALL
  USING (true);
