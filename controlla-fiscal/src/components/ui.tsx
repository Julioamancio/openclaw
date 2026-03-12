import type { ReactNode } from "react";

export function MetricCard({ label, value, tone = "slate", helper }: { label: string; value: string | number; tone?: "slate" | "green" | "amber" | "red" | "blue"; helper?: string }) {
  const tones = {
    slate: "from-slate-950 to-slate-800",
    green: "from-emerald-600 to-emerald-500",
    amber: "from-amber-500 to-orange-500",
    red: "from-rose-600 to-red-500",
    blue: "from-blue-600 to-cyan-500",
  } as const;

  return (
    <div className={`rounded-3xl bg-gradient-to-br ${tones[tone]} p-[1px] shadow-lg`}>
      <div className="rounded-[calc(1.5rem-1px)] bg-white p-5">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</div>
        {helper ? <div className="mt-2 text-sm text-slate-500">{helper}</div> : null}
      </div>
    </div>
  );
}

export function Panel({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm table-auto">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="max-w-[320px] px-4 py-3 align-top text-slate-700 break-words">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-blue-100 text-blue-700",
  } as const;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
