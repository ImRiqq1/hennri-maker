/** Botão branco "+ Novo ..." usado no topo das páginas. */
export function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-hot="1"
      onClick={onClick}
      className="flex items-center gap-2 bg-paper px-4.5 py-2.5 text-[13px] font-semibold text-ink outline-none hover:bg-cream"
    >
      <i className="ri-add-line text-[15px]" />
      <span>{label}</span>
    </button>
  )
}
