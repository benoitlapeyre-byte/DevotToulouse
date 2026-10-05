interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function FilterSelect({ label, value, onChange, options, placeholder = "Tous" }: FilterSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-muted-foreground">
      {label}
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="rounded-md border border-input bg-secondary px-3 py-2 text-sm normal-case tracking-normal text-foreground"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
