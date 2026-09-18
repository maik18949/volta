'use client';

/** Numbered left-hand section navigation (Immobiliendaten tab + property wizard). */
export function SectionNav({
  heading,
  items,
  activeIndex,
  onSelect,
}: {
  heading: string;
  items: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav className="flex w-[220px] shrink-0 flex-col gap-0.5">
      <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-[0.5px] text-text-dim">{heading}</p>
      {items.map((label, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={active ? 'step' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left text-[13px] ${
              active
                ? 'bg-accent/[0.08] font-semibold text-text-primary'
                : 'font-medium text-text-secondary hover:bg-black/[0.03] hover:text-text-primary'
            }`}
          >
            <span
              className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active ? 'bg-accent text-white' : 'bg-slate-200 text-text-dim'
              }`}
            >
              {i + 1}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
