type ChartItem = {
  label: string;
  value: number;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
};

const toneClass: Record<NonNullable<ChartItem["tone"]>, string> = {
  blue: "from-blue-600 to-blue-400",
  green: "from-emerald-600 to-emerald-400",
  amber: "from-amber-600 to-amber-400",
  red: "from-rose-600 to-rose-400",
  slate: "from-slate-700 to-slate-400",
};

export function ChartPlaceholder({ title, data }: { title: string; data: ChartItem[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {data.map((item) => {
          const height = Math.max(10, Math.round((item.value / max) * 100));
          return (
            <div key={item.label} className="space-y-2">
              <div className="flex h-36 items-end rounded-xl bg-slate-50 p-2">
                <div
                  className={`w-full rounded-lg bg-gradient-to-t ${toneClass[item.tone || "blue"]}`}
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>
              <div className="text-[11px] leading-tight text-slate-500">{item.label}</div>
              <div className="text-sm font-semibold text-slate-800">{item.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
