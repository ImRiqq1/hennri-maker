import { useDesign } from '../lib/design'
import { AbyssHome } from './home/AbyssHome'
import { CommandHome } from './home/CommandHome'
import { WorkspaceHome } from './home/WorkspaceHome'

/** Página inicial: cada design system tem a sua. */
export function Home() {
  const { design } = useDesign()
  if (design === 'workspace') return <WorkspaceHome />
  if (design === 'command') return <CommandHome />
  return <AbyssHome />
}
