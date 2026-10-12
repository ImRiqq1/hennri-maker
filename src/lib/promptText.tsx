import type { ReactNode } from 'react'

const TAG_RE = /\[[^\]\n]+\]/g

/** Divide o texto do prompt em parágrafos; um parágrafo que começa com [Tag] vira { tag, text }. */
export function splitPromptBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(\[[^\]\n]+\])\s*([\s\S]*)$/)
      return m ? { tag: m[1], text: m[2] } : { tag: '', text: p }
    })
}

/** Realça as [Tags] dentro do texto (usado no editor). */
export function highlightTags(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  let i = 0
  TAG_RE.lastIndex = 0
  while ((match = TAG_RE.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    out.push(
      <span key={`tag-${i++}`} className="font-medium text-cream">
        {match[0]}
      </span>,
    )
    last = match.index + match[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
