export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.5px] text-section-label mt-2.5 mb-2">
      {children}
    </p>
  );
}
