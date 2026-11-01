-- Conectar o ajudante por código (HN-4821) e escolher em qual computador cada pedido roda.

ALTER TABLE jobs ADD COLUMN target_helper_id TEXT;      -- null = qualquer ajudante online
ALTER TABLE helper_tokens ADD COLUMN platform TEXT;     -- windows | mac | linux

CREATE TABLE IF NOT EXISTS pair_requests (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,                  -- HN-4821, o que aparece no computador
  poll_secret_hash TEXT NOT NULL,      -- só o ajudante que pediu consegue buscar a chave
  name TEXT NOT NULL,                  -- nome do computador
  platform TEXT,
  status TEXT NOT NULL,                -- pending | approved | delivered
  token TEXT,                          -- chave gerada na aprovação; apagada assim que é entregue
  helper_id TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pair_requests_code ON pair_requests(code, status);
