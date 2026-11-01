-- Trilhas (biblioteca de músicas, voz separada, playlists) + Baixador (refs em massa)
-- + fila de pedidos que o ajudante do PC executa.

-- Chaves do ajudante (o site gera; guardamos só o hash).
CREATE TABLE IF NOT EXISTS helper_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_seen INTEGER,                   -- último contato do ajudante
  info TEXT                            -- JSON: versões, placa de vídeo, pasta dos arquivos
);

-- Fila de pedidos. O site cria; o ajudante pega (status fila → rodando → ok/erro).
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                  -- download | music | separate | enhance | open | update_tools
  batch_id TEXT,                       -- vários links colados de uma vez
  payload TEXT NOT NULL,               -- JSON
  status TEXT NOT NULL DEFAULT 'fila', -- fila | rodando | ok | erro | cancelado
  progress REAL,                       -- 0–100, null = indeterminado
  message TEXT,                        -- texto curto do andamento ou do erro
  result TEXT,                         -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type, created_at);

-- Trilhas
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  source TEXT NOT NULL,                -- spotify | youtube | upload
  source_url TEXT,
  duration_seconds INTEGER,
  cover_key TEXT,                      -- R2
  audio_key TEXT,                      -- R2, versão original (mp3)
  instrumental_key TEXT,               -- R2, depois de separar a voz
  vocals_key TEXT,                     -- R2, depois de separar a voz
  local_path TEXT,                     -- caminho do arquivo no PC (pra "Mostrar na pasta")
  intents TEXT,                        -- JSON array (Épico · impacto, Motivacional…)
  match_note TEXT,                     -- "mesma gravação" / aviso quando o YouTube achou outra versão
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL REFERENCES playlists(id),
  track_id TEXT NOT NULL REFERENCES tracks(id),
  added_at INTEGER NOT NULL,
  PRIMARY KEY (playlist_id, track_id)
);

-- Projetos/clientes onde a trilha é usada ("Uso na GO-X" do vídeo)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS track_projects (
  project_id TEXT NOT NULL REFERENCES projects(id),
  track_id TEXT NOT NULL REFERENCES tracks(id),
  PRIMARY KEY (project_id, track_id)
);

-- Baixador: pastas de ref e o que foi baixado (os arquivos ficam no PC)
CREATE TABLE IF NOT EXISTS ref_folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  folder_id TEXT REFERENCES ref_folders(id),
  job_id TEXT,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,              -- IG | YT | PIN | TT | X | WEB
  mode TEXT NOT NULL,                  -- premiere | max | audio
  title TEXT,
  files TEXT,                          -- JSON array com os caminhos no PC
  bytes INTEGER,
  thumb_key TEXT,                      -- R2, miniatura pra mostrar no site
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_downloads_folder ON downloads(folder_id, created_at);

-- Pastas que já existiam no HENNRI-Baixador antigo
INSERT OR IGNORE INTO ref_folders (id, name, created_at) VALUES
  ('motion', 'Motion', 1),
  ('edits', 'Edits', 2),
  ('vlog-lifestyle', 'Vlog Lifestyle', 3),
  ('moodboard', 'Moodboard', 4),
  ('estudo', 'ESTUDO', 5),
  ('rua', 'rua', 6),
  ('pizzaria', 'pizzaria', 7),
  ('escritorio', 'escritorio', 8),
  ('porto', 'porto', 9),
  ('figurino', 'figurino', 10),
  ('interface', 'interface', 11),
  ('gameplay', 'gameplay', 12);
