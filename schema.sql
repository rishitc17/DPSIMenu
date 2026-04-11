-- ╔════════════════════════════════════════════════════════╗
-- ║  DPS i-Edge Menu Voting System — Supabase Schema       ║
-- ║  Run this in your Supabase SQL Editor                  ║
-- ╚════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ─────────────────────────────────────────────────────────
-- All student accounts are pre-loaded here.
-- Admin account is also in this table.
CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,       -- SHA-256 hex hash of password
  password_changed BOOLEAN DEFAULT FALSE, -- FALSE = first login, TRUE = password set
  xp               INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 2. ITEMS TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
    'morning_drink','fruit','morning_snack','main_course',
    'accompaniments','dessert','evening_snack','evening_drink'
  )),
  description TEXT,
  image_url   TEXT,
  allergens   TEXT[] DEFAULT '{}',     -- array of: 'lactose','mushroom','nuts'
  is_star     BOOLEAN DEFAULT FALSE,   -- star/junk item
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
-- 3. VOTES TABLE
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day         TEXT NOT NULL CHECK (day IN ('monday','tuesday','wednesday','thursday','friday')),
  category    TEXT NOT NULL CHECK (category IN (
    'morning_drink','fruit','morning_snack','main_course',
    'accompaniments','dessert','evening_snack','evening_drink'
  )),
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day, category)       -- one vote per user per day per category
);

-- ─────────────────────────────────────────────────────────
-- 4. SETTINGS TABLE
-- ─────────────────────────────────────────────────────────
-- Key-value store for app-wide settings
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('voting_open',   'true'),
  ('week_start',    ''),
  ('week_end',      ''),
  ('disabled_days', '[]')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 5. FIXED ITEMS TABLE
-- ─────────────────────────────────────────────────────────
-- Admin can lock specific items for a day/category
CREATE TABLE IF NOT EXISTS fixed_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day         TEXT NOT NULL CHECK (day IN ('monday','tuesday','wednesday','thursday','friday')),
  category    TEXT NOT NULL CHECK (category IN (
    'morning_drink','fruit','morning_snack','main_course',
    'accompaniments','dessert','evening_snack','evening_drink'
  )),
  item_id     UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, category)                -- one fixed item per day per category
);

-- ─────────────────────────────────────────────────────────
-- 6. INDEXES (for performance)
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_day ON votes(day);
CREATE INDEX IF NOT EXISTS idx_votes_item_id ON votes(item_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────
-- We use the anon key + app-level auth (no Supabase Auth).
-- Set RLS to allow anon role full access (auth is handled in the app).
-- For higher security, you can restrict by user_id after adding a
-- server-side JWT approach, but for GitHub Pages (no server), this works.

ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations via anon key (app handles auth logic)
CREATE POLICY "Allow anon all on users"       ON users       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on items"       ON items       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on votes"       ON votes       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on settings"    ON settings    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon all on fixed_items" ON fixed_items FOR ALL TO anon USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────
-- 8. SEED: ADMIN ACCOUNT
-- ─────────────────────────────────────────────────────────
-- Admin password: dpsimenu!admin
-- SHA-256 hash of "dpsimenu!admin":
-- Run this in browser console to verify:
--   crypto.subtle.digest('SHA-256', new TextEncoder().encode('dpsimenu!admin'))
--     .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2,'0')).join(''))
--     .then(console.log)

INSERT INTO users (email, password_hash, password_changed)
VALUES (
  'admin@dpsiedge.edu.in',
  'b94f8a5ce2a3b2a5c7e1a4d5f8b9c2e3a1b4d5f7c8e2a3b5c7d1e4f8a9b2c3',  -- REPLACE with actual hash
  TRUE   -- Admin never goes through first-login flow
)
ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 9. SEED: EXAMPLE STUDENT ACCOUNTS
-- ─────────────────────────────────────────────────────────
-- Temporary password format: firstnameDDMM (e.g., john0115 for John born Jan 15)
-- SHA-256 hash each one before inserting.
-- password_changed = FALSE means they'll be prompted to set a new password on first login.

-- Example (replace hash with actual SHA-256 of 'john0115'):
-- INSERT INTO users (email, password_hash, password_changed) VALUES
--   ('john.doe23@school.edu.in', '<sha256_of_john0115>', FALSE),
--   ('jane.smith24@school.edu.in', '<sha256_of_jane0220>', FALSE);

-- ─────────────────────────────────────────────────────────
-- HOW TO GENERATE SHA-256 HASHES
-- ─────────────────────────────────────────────────────────
-- In browser console:
--   async function sha256(str) {
--     const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
--     return Array.from(new Uint8Array(buf)).map(x=>x.toString(16).padStart(2,'0')).join('');
--   }
--   sha256('john0115').then(console.log)
--
-- Or use any online SHA-256 tool (sha256.online, etc.)
-- ─────────────────────────────────────────────────────────
