-- Executar na D1 via Cloudflare Dashboard ou Wrangler
-- Dashboard: Workers & Pages → D1 → a tua base de dados → Console

CREATE TABLE IF NOT EXISTS activity_logs (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  username   TEXT     NOT NULL,
  action     TEXT     NOT NULL,  -- 'login' | 'logout' | 'pageview'
  page       TEXT     DEFAULT '',
  timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT     DEFAULT ''
);

-- Se a tabela já existia sem a coluna page, executar:
-- ALTER TABLE activity_logs ADD COLUMN page TEXT DEFAULT '';

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
