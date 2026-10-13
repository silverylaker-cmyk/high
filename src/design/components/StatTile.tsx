export function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stack-sm" style={{ gap: 2 }}>
      <span className="t-hud">{value}</span>
      <span className="t-small muted">{label}</span>
    </div>
  );
}
