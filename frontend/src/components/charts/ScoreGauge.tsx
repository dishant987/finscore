interface Props {
  label: string;
  value: number;
  size?: "sm" | "md";
}

export default function ScoreGauge({ label, value, size = "md" }: Props) {
  const color = value >= 70 ? "text-[var(--accent)]" : value >= 40 ? "text-amber-400" : "text-red-400";
  const barColor = value >= 70 ? "var(--accent)" : value >= 40 ? "#f59e0b" : "#ef4444";
  const h = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className={`font-semibold ${color}`}>{value.toFixed(0)}</span>
      </div>
      <div className={`${h} rounded-full overflow-hidden`} style={{ background: 'var(--border)' }}>
        <div className={`${h} rounded-full transition-all duration-700`} style={{ width: `${value}%`, background: barColor }} />
      </div>
    </div>
  );
}
