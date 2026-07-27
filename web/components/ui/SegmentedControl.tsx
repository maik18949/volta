'use client';

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-md border border-black/10 bg-white/90 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1 text-sm font-semibold ${
            value === option.value ? 'bg-accent text-white' : 'text-text-secondary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
