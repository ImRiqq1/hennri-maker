/** Botão escuro "+ Novo ..." usado no topo das páginas. */
export function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-new-button
      className="press inline-flex h-11 items-center gap-2 rounded-[var(--r-control)] bg-primary pr-5 pl-4 text-[14px] font-medium text-primary-foreground shadow-soft outline-none transition-[background-color,transform] duration-200 hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ice-300"
    >
      <i className="ri-add-line text-[17px] opacity-70" />
      <span>{label}</span>
    </button>
  )
}
