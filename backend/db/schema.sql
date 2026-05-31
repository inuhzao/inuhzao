-- ═══════════════════════════════════════════════════
-- INUHZAO Platform — Database Schema
-- Executa este ficheiro no Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- ── USERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitch_id       TEXT UNIQUE NOT NULL,
  username        TEXT NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  email           TEXT,
  is_admin        BOOLEAN DEFAULT FALSE,
  points          INTEGER DEFAULT 0,
  total_points    INTEGER DEFAULT 0,
  spent_points    INTEGER DEFAULT 0,
  watchtime_mins  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SHOP ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER NOT NULL,
  stock       INTEGER DEFAULT 0,
  image_url   TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── REDEMPTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  item_id     UUID REFERENCES shop_items(id) ON DELETE SET NULL,
  item_name   TEXT NOT NULL,
  item_image  TEXT,
  price       INTEGER NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'refunded')),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── COUPONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  points      INTEGER NOT NULL,
  description TEXT,
  used_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── GIVEAWAYS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS giveaways (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prize       TEXT NOT NULL,
  description TEXT,
  cost        INTEGER DEFAULT 0,
  active      BOOLEAN DEFAULT TRUE,
  winner_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

-- ── GIVEAWAY ENTRIES ───────────────────────────────
CREATE TABLE IF NOT EXISTS giveaway_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id  UUID REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(giveaway_id, user_id)
);

-- ── TIMERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  total_secs  INTEGER NOT NULL,
  started_at  TIMESTAMPTZ,
  running     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── HIDRA LOG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hidra_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  cofres          INTEGER NOT NULL,
  yang_por_cofre  INTEGER NOT NULL,
  yang_total      INTEGER NOT NULL,
  notas           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISGUISES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS disguises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  total_secs  INTEGER NOT NULL,
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SE CONFIG ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS se_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  TEXT,
  jwt_token   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── SESSIONS (para express-session) ───────────────
CREATE TABLE IF NOT EXISTS session (
  sid     TEXT PRIMARY KEY,
  sess    JSONB NOT NULL,
  expire  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════

ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaways      ENABLE ROW LEVEL SECURITY;
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidra_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE disguises      ENABLE ROW LEVEL SECURITY;

-- Políticas: o backend usa service_role (bypassa RLS)
-- Utilizadores autenticados lêem os seus próprios dados

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (true);

CREATE POLICY "shop_items_public_read" ON shop_items
  FOR SELECT USING (active = true);

CREATE POLICY "giveaways_public_read" ON giveaways
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER shop_items_updated_at
  BEFORE UPDATE ON shop_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER redemptions_updated_at
  BEFORE UPDATE ON redemptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════
-- DADOS INICIAIS
-- ═══════════════════════════════════════════════════

-- Item exemplo na loja
INSERT INTO shop_items (name, description, price, stock)
VALUES
  ('Shoutout na Stream', 'Shoutout ao vivo no próximo stream', 1000, 5),
  ('Sub Gifted', 'Uma sub gifted para ti ou um amigo', 5000, 2),
  ('Sessão de Jogo', 'Jogar contigo ao vivo na stream', 3000, 1)
ON CONFLICT DO NOTHING;
