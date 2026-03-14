-- FatCats MVP v1 Schema
-- Paste this into Supabase SQL Editor and click "Run"

-- 1. Reports table (citizen + 311 unified)
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  source text NOT NULL CHECK (source IN ('citizen', '311')),
  status text NOT NULL DEFAULT 'unresolved',
  category text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  lat double precision,
  lng double precision,
  neighborhood text,
  photo_url text,
  supporters_count integer DEFAULT 0,
  author_device_hash text,
  external_id text UNIQUE, -- for 311 dedup
  project_id text,
  contract_id text,
  contractor_name text
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_source ON reports(source);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_location ON reports(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_author ON reports(author_device_hash) WHERE author_device_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- 2. Anonymous users
CREATE TABLE IF NOT EXISTS users_anonymous (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  device_hash text UNIQUE NOT NULL
);

-- 3. Report supports ("watching")
CREATE TABLE IF NOT EXISTS report_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(report_id, device_hash)
);

CREATE INDEX IF NOT EXISTS idx_supports_report ON report_supports(report_id);
CREATE INDEX IF NOT EXISTS idx_supports_device ON report_supports(device_hash);

-- 4. Storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS Policies (permissive for MVP)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_anonymous ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_supports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports
CREATE POLICY "Anyone can read reports" ON reports FOR SELECT USING (true);
-- Allow anyone to insert reports
CREATE POLICY "Anyone can insert reports" ON reports FOR INSERT WITH CHECK (true);
-- Allow anyone to update reports (for supporter count, status)
CREATE POLICY "Anyone can update reports" ON reports FOR UPDATE USING (true);

-- Allow anyone to read/insert anonymous users
CREATE POLICY "Anyone can read users" ON users_anonymous FOR SELECT USING (true);
CREATE POLICY "Anyone can insert users" ON users_anonymous FOR INSERT WITH CHECK (true);

-- Allow anyone to read/insert supports
CREATE POLICY "Anyone can read supports" ON report_supports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert supports" ON report_supports FOR INSERT WITH CHECK (true);

-- Storage policy: anyone can upload to report-photos
CREATE POLICY "Anyone can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'report-photos');
CREATE POLICY "Anyone can read photos" ON storage.objects FOR SELECT USING (bucket_id = 'report-photos');

-- Capital Projects (City Spending)
CREATE TABLE IF NOT EXISTS capital_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  description text,
  agency text,
  planned_commit bigint DEFAULT 0,
  spent_total bigint DEFAULT 0,
  start_date timestamptz,
  end_date timestamptz,
  category text,
  borough text
);
ALTER TABLE capital_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read capital_projects" ON capital_projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert capital_projects" ON capital_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update capital_projects" ON capital_projects FOR UPDATE USING (true);
