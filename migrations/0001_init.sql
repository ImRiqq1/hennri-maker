-- Esquema recuperado do D1 de produção (hennri-maker-db) em 2026-10-12.
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,              -- imagem | vídeo | personagem | cenário | upscale | consistência
  prompt_text TEXT NOT NULL,           -- texto com blocos [Tag] inline
  model TEXT,
  aspect_ratio TEXT,
  image_key TEXT,                      -- chave do objeto no R2
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  ref_image_key TEXT,
  extra_image_key TEXT
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                  -- ex: "seedance-master" — nunca Title Case
  category TEXT NOT NULL,              -- Vídeo & Direção | Imagem & Arte | Áudio & Voz | Conteúdo | Dev & Build | Meta
  description TEXT NOT NULL,
  triggers TEXT,                       -- JSON array de frases-gatilho
  related_skill_ids TEXT,              -- JSON array de ids; null = calcula "combina com" por categoria em runtime
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS references_ (
  id TEXT PRIMARY KEY,
  tab TEXT NOT NULL,                   -- camera | cena | luz
  family TEXT NOT NULL,                -- MOVIMENTO | ÂNGULO | LENTE | etc — cabeçalho de grupo
  name TEXT NOT NULL,                  -- "Dolly-in"
  term TEXT NOT NULL,                  -- "low angle dolly-in, 35mm" — o que se copia
  media_key TEXT,                      -- R2, imagem ou vídeo curto
  description TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  author TEXT,
  cover_key TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id),
  name TEXT NOT NULL,
  track TEXT,                          -- "INTELIGÊNCIA ARTIFICIAL" etc — pro separador de trilha
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS module_items (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id),
  type TEXT NOT NULL,                  -- 'aula' | 'material'
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  drive_url TEXT,                      -- aula: link do Drive (id extraído na hora de montar o iframe)
  duration_seconds INTEGER,            -- aula
  cover_key TEXT,                      -- aula, opcional — null = pôster tipográfico gerado
  file_format TEXT,                    -- material
  file_size_mb REAL,                   -- material
  completed_at INTEGER                 -- null = não concluída (só aplica a 'aula')
);

CREATE TABLE IF NOT EXISTS lesson_notes (
  item_id TEXT PRIMARY KEY REFERENCES module_items(id),
  content TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_module_items_module_id ON module_items(module_id);
