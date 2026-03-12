export function TruncateCell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-[280px] min-w-0">
      <div className="truncate font-medium text-slate-900" title={title}>{title}</div>
      {subtitle ? <div className="truncate text-xs text-slate-500" title={subtitle}>{subtitle}</div> : null}
    </div>
  );
}
