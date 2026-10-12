import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { EmptyState, PageHeader } from '../components/PageHeader'
import { NewButton } from '../components/PrimaryButton'
import { SkillEditor, type SkillForm } from '../components/SkillEditor'
import { SkillRow } from '../components/SkillRow'
import { SkillViewer } from '../components/SkillViewer'
import { useToast } from '../components/Toast'
import { api } from '../lib/api'
import { SKILL_CATEGORIES } from '../lib/constants'
import type { Skill } from '../lib/types'

const FILTERS = ['Todas', ...SKILL_CATEGORIES]

export function Skills() {
  const { flash } = useToast()
  const [params, setParams] = useSearchParams()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Todas')
  const [openId, setOpenId] = useState<string | null>(null)
  const [openSkill, setOpenSkill] = useState<Skill | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setSkills(await api.get<Skill[]>('/skills'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const open = params.get('open')
    const isNew = params.get('new')
    if (open) {
      setFilter('Todas')
      setOpenId(open)
    }
    if (isNew) setEditorOpen(true)
    if (open || isNew) {
      const next = new URLSearchParams(params)
      next.delete('open')
      next.delete('new')
      setParams(next, { replace: true })
    }
  }, [params])

  // busca o detalhe (com "combina com") quando abre uma skill
  useEffect(() => {
    if (!openId) {
      setOpenSkill(null)
      return
    }
    api.get<Skill>(`/skills/${openId}`).then(setOpenSkill)
  }, [openId])

  const visible = useMemo(() => (filter === 'Todas' ? skills : skills.filter((s) => s.category === filter)), [skills, filter])
  const openIndex = openId ? visible.findIndex((s) => s.id === openId) + 1 : 0

  async function save(form: SkillForm) {
    const created = await api.post<Skill>('/skills', form)
    setSkills((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name)))
    setEditorOpen(false)
    flash('Skill salva')
  }

  function copyName() {
    if (!openSkill) return
    navigator.clipboard?.writeText(openSkill.name).catch(() => {})
    flash('Nome copiado')
  }

  const newButton = <NewButton label="Nova skill" onClick={() => setEditorOpen(true)} />

  return (
    <div>
      <PageHeader
        tags={['vídeo & direção', 'imagem & arte', 'áudio & voz', 'conteúdo', 'dev & build']}
        title="SKILLS"
        count={skills.length}
        actions={newButton}
      />

      <div className="mb-2 flex flex-wrap gap-1.5 border-b border-cream/10 pb-4.5">
        {FILTERS.map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {f}
          </Chip>
        ))}
      </div>

      {!loading && visible.length === 0 ? (
        <EmptyState
          title="SKILLS"
          tracking="-0.06em"
          message={skills.length === 0 ? 'Nenhuma skill catalogada ainda.' : 'Nenhuma skill nessa categoria ainda.'}
          action={newButton}
        />
      ) : (
        <div className="flex flex-col">
          {visible.map((s, i) => (
            <SkillRow key={s.id} skill={s} index={i + 1} onOpen={() => setOpenId(s.id)} />
          ))}
        </div>
      )}

      <SkillViewer
        skill={openSkill}
        index={openIndex}
        onClose={() => setOpenId(null)}
        onCopyName={copyName}
        onOpenRelated={setOpenId}
      />
      <SkillEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSave={save} />
    </div>
  )
}
