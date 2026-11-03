# Protocolo site ↔ ajudante

O site nunca fala direto com o PC. Ele põe **pedidos** numa fila (tabela `jobs` no D1);
o ajudante do PC busca a fila, faz o trabalho pesado e devolve o resultado.
Assim dá pra pedir até pelo celular (com o PC ligado) sem abrir porta no roteador.

## Autenticação do ajudante

1. No site: Configurações → Ajudante → "Conectar este PC" → `POST /api/helper/pair` devolve uma
   chave `hm_…` (aparece uma vez).
2. O ajudante guarda a chave em `%APPDATA%\HennriMaker\config.json` junto com a URL do site.
3. Toda chamada do ajudante vai em `/api/agent/*` com `Authorization: Bearer hm_…`.

## Rotas do ajudante (`/api/agent`)

| Rota | O que faz |
| --- | --- |
| `POST /heartbeat` `{ info }` | Sinal de vida + info (versões, GPU, pasta). Online = contato nos últimos 40s. |
| `POST /jobs/claim` | Pega o próximo pedido (`200` com o pedido, `payload` já em objeto) ou `204` se não tem nada. Corpo opcional `{ "types": [...] }`: só pega pedidos desses tipos (o ajudante manda só os que têm vaga — GPU ocupada não trava downloads). Também conta como sinal de vida. |
| `POST /jobs/:id/progress` `{ progress?: 0-100, message?, detail? }` | Andamento (`detail` = objeto que fica no `result` enquanto roda). Resposta `{ status, cancel }` — se `cancel: true`, pare e não chame done/fail. |
| `POST /jobs/:id/done` `{ result?, message? }` | Terminou bem. |
| `POST /jobs/:id/fail` `{ error, result? }` | Deu erro (mensagem curta e amigável, em português). |
| `GET /jobs/:id` | Lê um pedido. |
| `PUT /files?ext=mp3&type=audio/mpeg` (corpo cru) | Sobe um arquivo pro R2 → `{ key }`. Até ~95 MB por arquivo. |
| `GET /files/:key` | Baixa um arquivo do R2 (ex.: áudio que o usuário enviou pelo site). |
| `GET /folders` | Pastas de ref (`id`, `name`). |
| `GET /tracks/:id`, `POST /tracks`, `PATCH /tracks/:id` | Trilhas da biblioteca. |
| `POST /downloads` | Registra um download do Baixador. |

## Tipos de pedido (`type` → `payload` → o que o ajudante faz)

- **download** `{ url, folder_id, mode: 'premiere'|'max'|'audio', browser?: ''|'firefox'|'chrome'|'edge'|'brave'|'opera' }`
  Baixa com yt-dlp (vídeo) ou gallery-dl (pin/board/carrossel de foto) para
  `<pasta dos arquivos>\Baixador\<nome da pasta>\`. Registra em `POST /downloads`
  (`folder_id, job_id, url, platform, mode, title, files[], bytes, thumb_key`), com miniatura
  pequena (jpg ≤ 480px) enviada por `PUT /files`. `result`: `{ download_id, title, files, skipped? }`.
- **music** `{ url, separate?: boolean }` — link do Spotify (música, álbum ou playlist) ou do YouTube.
  Spotify: lê as faixas (nome, artista, capa, duração) e baixa cada uma do YouTube (versão oficial
  quando existe), grava nome/artista/capa no MP3, compara a duração pra dizer se é a mesma gravação.
  Para cada faixa: sobe o MP3 e a capa (`PUT /files`) e cria a trilha (`POST /tracks`,
  `source: 'spotify'|'youtube'`, `local_path`, `match_note`). Se `separate`, separa a voz em seguida.
  `progress.message` tipo `"3/12 · Nome da música"`. `result`: `{ track_ids, items: [{ title, artist, status, match }] }`.
- **separate** `{ track_id }` — separa voz e instrumental na GPU; sobe os dois e faz
  `PATCH /tracks/:id { instrumental_key, vocals_key }`. `result`: `{ track_id }`.
- **enhance** `{ file_key, name }` ou `{ track_id }` — limpa ruído e melhora a voz.
  Sobe o resultado (`PUT /files`) e salva uma cópia no PC. `result`: `{ output_key, name, local_path }`.
- **open** `{ kind: 'root'|'folder'|'download'|'track'|'path', id?, path? }` — abre o Explorer no lugar certo
  (só funciona no PC do ajudante).
- **update_tools** `{}` — atualiza yt-dlp e gallery-dl. `result`: versões novas.
- **drive_scan** `{ url }` — lê uma pasta do Google Drive (e todas as subpastas) sem baixar.
  Pasta aberta ("qualquer pessoa com o link"): lê a página pública da pasta e mede cada arquivo pedindo 1 byte.
  Pasta privada: usa a conta Google conectada (`drive_google`). `result`:
  `{ name, mode: 'publico'|'conta', files, folders, bytes, unknown_sizes, types: [[ext, n]], top: [{ name, folder, files, bytes }], top_total, skipped }`.
- **drive** `{ url, dest?, name? }` — baixa a pasta inteira, igual ao Drive. Sem `dest`: `<pasta dos arquivos>\Drive\<nome da pasta>\`;
  com `dest` (caminho completo) o conteúdo vai direto nele. 4 arquivos ao mesmo tempo, continua o `.part` de onde parou,
  pula o que já terminou (rodar de novo = continuar). Docs/Planilhas/Apresentações → .docx/.xlsx/.pptx.
  Arquivo bloqueado pelo Google ("muita gente baixou") espera 1, 3 e 7 min antes de desistir.
  Enquanto roda, `progress.detail` vai pro `result`:
  `{ name, path, files_total, files_done, files_skipped, files_failed, bytes_total, bytes_done, unknown_sizes, speed, eta, current[], failed: [{ path, error }] }`.
- **drive_google** `{ action: 'login', client_id, client_secret }` ou `{ action: 'logout' }` — conecta a conta Google
  (OAuth de app para computador, só leitura, com PKCE e retorno em `http://127.0.0.1:<porta>`). O navegador do PC abre pro login;
  a autorização fica em `<dados>\google.json`. O site apaga o `payload` quando o pedido termina. `result`: `{ email }`.
  O heartbeat manda `info.google` (e-mail conectado ou `null`).

## `info` do heartbeat

```json
{
  "version": "1.0.0",
  "hostname": "PC-HENNRI",
  "gpu": "NVIDIA GeForce RTX 5060",
  "device": "cuda",
  "root": "C:\\Users\\…\\Downloads\\HENNRI",
  "tools": { "yt_dlp": "2026.10.26", "gallery_dl": "1.30.0", "separator": "0.40.0", "ffmpeg": "9.0.2" },
  "separator_ready": true,
  "busy": false
}
```

## Conexão por código (sem copiar a chave)

1. Ajudante sem chave: `POST /api/pair/start { name, platform: 'windows'|'mac' }` (sem login)
   → `{ request_id, poll_secret, code: 'HN-4821', expires_at }` (vale 10 minutos).
2. O ajudante mostra o código (console/Terminal e no ícone) e abre o navegador em
   `<site>/conectar?codigo=HN-4821`. Lá, já logado, você vê "Conectar <nome> (<Mac/Windows>)?" e confirma
   (`POST /api/helper/pair/HN-4821/approve`).
3. O ajudante pergunta a cada 3s: `POST /api/pair/poll { request_id, poll_secret }`
   → `202 { status: 'pending' }` · `200 { status: 'approved', token }` (entregue uma vez só) · `410` expirou.
4. A chave manual (Configurações → Conectar com chave) continua funcionando como plano B.

## Onde rodar (PC ou Mac)

- `POST /api/jobs { type, payload(s), target?: <id do ajudante> }`. Sem `target`, qualquer ajudante online pega.
  Com `target`, só aquele ajudante pega (`/api/agent/jobs/claim` filtra sozinho pela chave).
- `GET /api/helper` lista os ajudantes (`id, name, platform, last_seen, info`); online = `last_seen` < 40s.
- O heartbeat manda `info.platform` (`'windows'|'mac'`) e `info.os` (ex.: "macOS 15.4 · Apple M2").
