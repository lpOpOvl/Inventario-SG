-- Executar na D1 via Cloudflare Dashboard ou Wrangler
-- Dashboard: Workers & Pages → D1 → a tua base de dados → Console

CREATE TABLE IF NOT EXISTS objectives_items (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  item      TEXT    NOT NULL,
  category  TEXT    NOT NULL DEFAULT 'Armas (FPS)',
  note      TEXT    DEFAULT '',
  target_qty REAL   DEFAULT NULL,
  priority  INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rules (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT    DEFAULT '',
  tag         TEXT    DEFAULT NULL,
  priority    INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
