/** Botão escuro "+ Novo ..." usado no topo das páginas. */
export function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-abyss-950 pr-5 pl-4 text-[14px] font-medium text-white shadow-soft outline-none transition-[background-color,transform] duration-200 hover:bg-abyss-800 focus-visible:ring-4 focus-visible:ring-ice-300 active:scale-[0.98]"
    >
      <i className="ri-add-line text-[17px] text-ice-300" />
      <span>{label}</span>
    </button>
  )
}
