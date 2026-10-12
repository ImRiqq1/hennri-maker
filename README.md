# HENNRI IA MAKER

Código do **maker.hennri.com**: acervo privado de prompts, skills, referências e cursos.

Roda num **Cloudflare Worker** (`hennri-maker`):

| Peça | O que é | Onde fica |
| --- | --- | --- |
| Frontend | React + Tailwind (as telas) | `src/` |
| Backend | API em Hono (`/api/...`) + senha do site | `api/` |
| Banco | D1 `hennri-maker-db` (prompts, skills, referências, cursos) | Cloudflare |
| Arquivos | R2 `hennri-maker-files` (imagens e vídeos enviados) | Cloudflare |

> Este código foi **recuperado do site publicado** em 12/10/2026, porque o original não estava salvo.
> O backend veio quase idêntico; o frontend foi reescrito a partir do JS compilado, com o mesmo visual.
> `.recovered/` guarda os arquivos originais baixados, só pra consulta.

---

## Onde mexer

| Quero mudar… | Arquivo |
| --- | --- |
| Cores e fontes | `src/index.css` (bloco `:root`) |
| Textos da página inicial (título, "UM ACERVO, NÃO UM APP", rodapé) | `src/pages/Home.tsx` |
| Itens do menu lateral | `src/components/Sidebar.tsx` |
| Categorias de prompt, modelos, proporções, tags `[Pedido]`… | `src/lib/constants.ts` |
| Categorias de skill e abas de referência | `src/lib/constants.ts` |
| Página de Prompts / card / modal / editor | `src/pages/Prompts.tsx`, `src/components/Prompt*.tsx` |
| Skills | `src/pages/Skills.tsx`, `src/components/Skill*.tsx` |
| Referências | `src/pages/References.tsx`, `src/components/Reference*.tsx` |
| Cursos e aulas | `src/pages/Courses.tsx`, `CourseDetail.tsx`, `Lesson.tsx` |
| Tela de login | `src/pages/Login.tsx` |
| Logos / favicon / fontes | `public/brand/`, `public/favicon.png`, `public/fonts/` |
| Rotas da API, banco | `api/routes/*.ts`, `api/db/*.ts` |
| Estrutura das tabelas | `migrations/` |

Os ícones são do [Remix Icon](https://remixicon.com) (classes `ri-...`).

---

## Rodar no seu Mac

Uma vez só:

```bash
npm install
echo "SITE_PASSWORD=qualquer-senha-local" > .dev.vars
npm run db:seed:local
```

Depois, sempre que for mexer:

```bash
npm run dev
```

Abra o endereço que o Vite mostrar (normalmente http://localhost:5173) e entre com a senha do `.dev.vars`.
As mudanças nos arquivos aparecem na hora.

Esse modo usa um **banco local de teste** (amostra dos dados). Nada que você faz aqui afeta o site de verdade.
As imagens não aparecem localmente porque ficam no R2 de produção.

---

## Publicar no maker.hennri.com

Uma vez só, faça login na Cloudflare (abre o navegador):

```bash
npx wrangler login
```

Pra publicar:

```bash
npm run deploy
```

Isso gera o frontend (`dist/`) e sobe o Worker. O banco e as imagens **não** são tocados: o site novo usa os mesmos dados.

### Senha do site

A senha fica guardada como *secret* na Cloudflare, não no código. Pra trocar:

```bash
npx wrangler secret put SITE_PASSWORD
```

Trocar a senha desloga todo mundo.

---

## Outros comandos

```bash
npm run typecheck
npm run build
npm run preview
```

- `typecheck` confere erros de tipo.
- `build` só gera o `dist/`.
- `preview` gera e roda igual produção, na porta 8787.
