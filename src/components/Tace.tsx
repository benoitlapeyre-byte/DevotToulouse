import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDataset, capacity, type Raw, type Dates } from "@/lib/dataset";

export type C = { ws: string; talent: string; mgr: string; month: string; assigned: number; gross: number; absence: number; leave: number; management: number; training: number; selected: number; fileGross?: number };
// One entry per talent-month: assigned, absence (maladie), leave (congés), management and
// training FTE are summed across rows, gross capacity is repeated on every row so it is
// taken once (max). When the file has no capacity column (gross = 0), it is derived from
// entry/exit dates.
export function buildCap(raw: Raw[], dates: Dates): C[] {
const capMap = new Map<string, C>();
  raw.forEach(([ws, talent, mgr, month, , , , assigned, gross, absence, management, training, leave, selected]) => {
    if (ws === "FR - Innovative Tech (DAP)") return;
    const k = talent + "|" + month;
    const [entry = null, exit = null] = dates[talent] ?? [];
    const c = capMap.get(k);
    if (c) { c.assigned += assigned; c.fileGross = Math.max(c.fileGross ?? 0, gross); c.absence += absence; c.leave += leave; c.management += management; c.training += training; c.selected += (selected || 0); }
    else capMap.set(k, { ws, talent, mgr, month, assigned, gross: 0, fileGross: gross, absence, leave, management, training, selected: selected || 0 });
  });
// Gross capacity is already normalized during import: it comes directly from the export,
// or is derived there when the column is absent. Keep zero values from the file unchanged.
return [...capMap.values()].map((c) => {
  const fg = c.fileGross ?? 0;
  const gross = fg;
  const { fileGross: _f, ...rest } = c; void _f;
  return { ...rest, gross };
});
}
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_FR: Record<string, string> = { Jan: "Janv", Feb: "Févr", Mar: "Mars", Apr: "Avr", May: "Mai", Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sept", Oct: "Oct", Nov: "Nov", Dec: "Déc" };
const TARGET = 0.85;
export const pct = (a: number, g: number) => (g ? a / g : 0);
export const fmt = (v: number) => `${(v * 100).toFixed(1)} %`;
export const tone = (v: number) => (v >= TARGET ? "text-chart-4" : v >= 0.7 ? "text-chart-2" : "text-destructive");
// Nombre de jours ouvrés (lun–ven) du mois en 2026.
export const workdays = (month: string) => {
  const m = MONTHS.indexOf(month);
  if (m < 0) return 0;
  let n = 0;
  for (let d = new Date(Date.UTC(2026, m, 1)); d.getUTCMonth() === m; d.setUTCDate(d.getUTCDate() + 1)) { const w = d.getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return n;
};

export function Tace({ ws, mgr, month, onPick }: { ws: string; mgr: string; month: string; onPick: (t: string) => void }) {
  const { raw, dates } = useDataset();
  const cap = useMemo(() => buildCap(raw, dates), [raw, dates]);
  const base = cap.filter((c) => (!ws || c.ws === ws) && (!mgr || c.mgr === mgr));

  // Entries / exits per month, from entry/exit dates, scoped to the current ws/mgr filters.
  const moves = useMemo(() => {
    const scope = new Set(raw.filter(([w, , m]) => w !== "FR - Innovative Tech (DAP)" && (!ws || w === ws) && (!mgr || m === mgr)).map(([, t]) => t));
    const hasRow = new Set(raw.map(([, t, , mo]) => t + "|" + mo));
    const inMonth = (iso: string | null, mi: number) => !!iso && iso.slice(0, 4) === "2026" && +iso.slice(5, 7) - 1 === mi;
    return MONTHS.map((m, i) => {
      const mi = i;
      const entries: [string, string][] = [], exits: [string, string][] = [];
      scope.forEach((t) => {
        const [entry, exit] = dates[t] ?? [];
        if (entry && inMonth(entry, mi)) entries.push([t, entry]);
        if (exit && entry && exit >= entry && inMonth(exit, mi)) exits.push([t, exit]);
      });
      // Présents au moins 1 jour ouvré du mois, d'après les dates d'entrée/sortie.
      const present = [...scope].filter((t) => {
        const [entry = null, exit = null] = dates[t] ?? [];
        return dates[t] ? capacity(m, entry, exit) > 0 : hasRow.has(t + "|" + m);
      }).length;
      const byDate = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
      return { key: m, name: MONTH_FR[m], present, entries: entries.sort(byDate), exits: exits.sort(byDate) };
    });
  }, [raw, dates, ws, mgr]);
  const agg = (l: C[]) => ({ a: l.reduce((s, c) => s + c.assigned, 0), g: l.reduce((s, c) => s + c.gross, 0), ab: l.reduce((s, c) => s + c.absence, 0), lv: l.reduce((s, c) => s + c.leave, 0), mg: l.reduce((s, c) => s + c.management, 0), tr: l.reduce((s, c) => s + c.training, 0), sel: l.reduce((s, c) => s + c.selected, 0) });

  const trend = MONTHS.map((m) => {
    const { a, g, ab, lv, mg, tr, sel } = agg(base.filter((c) => c.month === m));
    return { name: MONTH_FR[m], "Assigned FTE": +a.toFixed(1), "Selected FTE": +sel.toFixed(1), Absence: +ab.toFixed(1), Congés: +lv.toFixed(1), Management: +mg.toFixed(1), Formation: +tr.toFixed(1), Inoccupé: +Math.max(0, g - a - ab - lv - mg - tr).toFixed(1), TACE: +(pct(a, g - lv) * 100).toFixed(1) };
  });
  const cur = agg(base.filter((c) => c.month === month));
  const wd = workdays(month);
  const own = cur.g - cur.ab; // FTE OWN = capacité brute − absence FTE
  const level: "ws" | "mgr" | "talent" = mgr ? "talent" : ws ? "mgr" : "ws";
  const key = (c: C) => (level === "talent" ? c.talent : level === "mgr" ? c.mgr : c.ws.replace("FR - ", ""));
  const groups = new Map<string, C[]>();
  base.filter((c) => c.month === month).forEach((c) => groups.set(key(c), [...(groups.get(key(c)) ?? []), c]));
  const detailRows = [...groups.entries()]
    .map(([name, l]) => { const { a, g, ab, lv, mg, tr, sel } = agg(l); const net = g - lv; const own = g - ab; return { name, a, sel, g, net, ab, lv, mg, tr, own, prod: own * wd, t: pct(a, net) }; })
    .filter((r) => r.g > 0)
    .sort((x, y) => x.t - y.t);


  return (
    <section className="dashboard-panel mb-6 rounded-lg border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">TACE — Taux d'occupation</h2>
          <p className="mt-1 text-xs text-muted-foreground">{wd} jours ouvrés en {MONTH_FR[month]} · TACE = Assigned FTE / Net Capacity FTE · Net Capacity = capacité brute − congés · Capacité FTE OWN = capacité brute − Absence FTE · objectif {fmt(TARGET)}</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-10">
        {[["Capacité brute FTE", cur.g.toFixed(1), cur.g * wd, "", ""], ["Capacité FTE OWN", own.toFixed(1), own * wd, "", "Capacité brute FTE − Absence FTE"], ["Congés FTE", cur.lv.toFixed(1), cur.lv * wd, "text-chart-1", ""], ["Net Capacity FTE", (cur.g - cur.lv).toFixed(1), (cur.g - cur.lv) * wd, "", ""], ["Absence FTE", cur.ab.toFixed(1), cur.ab * wd, "text-chart-5", ""], ["FTE inoccupés", Math.max(0, cur.g - cur.a - cur.ab - cur.lv - cur.mg - cur.tr).toFixed(1), Math.max(0, cur.g - cur.a - cur.ab - cur.lv - cur.mg - cur.tr) * wd, "text-destructive", ""], ["Management FTE", cur.mg.toFixed(1), cur.mg * wd, "text-chart-3", ""], ["Formation FTE", cur.tr.toFixed(1), cur.tr * wd, "text-violet", ""], ["Assigned FTE", cur.a.toFixed(1), cur.a * wd, "", ""], ["Selected FTE", cur.sel.toFixed(1), cur.sel * wd, "text-blue-500", ""], ["TACE " + MONTH_FR[month], fmt(pct(cur.a, cur.g - cur.lv)), null, tone(pct(cur.a, cur.g - cur.lv)), ""]].map(([l, v, d, c, note]) => (
          <div key={l as string} className="rounded-md border bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</p>
            <p className={`mt-1 font-display text-3xl font-bold ${c}`}>{v}</p>
            {d !== null ? <p className="mt-0.5 font-mono text-xs text-muted-foreground">{(d as number).toFixed(0)} j</p> : null}
            {note ? <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{note}</p> : null}
          </div>
        ))}
      </div>
      <div className="mb-4 rounded-md border bg-secondary/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mouvements d'effectif — entrées / sorties de collaborateurs</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {moves.map((mv) => (
            <div key={mv.key} className={`rounded-md border bg-card px-3 py-2 ${mv.key === month ? "ring-2 ring-primary" : "opacity-70"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{mv.name}</span>
                <span className="font-mono text-sm"><span className="text-chart-4">+{mv.entries.length}</span><span className="mx-1 text-muted-foreground">/</span><span className="text-destructive">−{mv.exits.length}</span></span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Présents au moins 1 jour : <span className="font-mono font-semibold text-foreground">{mv.present}</span></p>
              <ul className="mt-2 space-y-0.5 text-xs">
                {mv.entries.map(([t, d]) => <li key={"e" + t}><button onClick={() => onPick(t)} className="text-left hover:underline"><span className="font-mono text-chart-4">+ {d.slice(8, 10)}/{d.slice(5, 7)}</span> {t}</button></li>)}
                {mv.exits.map(([t, d]) => <li key={"s" + t}><button onClick={() => onPick(t)} className="text-left hover:underline"><span className="font-mono text-destructive">− {d.slice(8, 10)}/{d.slice(5, 7)}</span> {t}</button></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={300}>

          <ComposedChart data={trend}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" />
            <YAxis yAxisId="f" stroke="var(--muted-foreground)" />
            <YAxis yAxisId="p" orientation="right" domain={[0, (m: number) => Math.max(100, Math.ceil(m / 10) * 10)]} unit="%" stroke="var(--muted-foreground)" />
            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--foreground)" }} />
            <Legend />
            <Bar yAxisId="f" dataKey="Assigned FTE" stackId="a" fill="var(--chart-4)" />
            <Bar yAxisId="f" dataKey="Absence" stackId="a" fill="var(--chart-5)" />
            <Bar yAxisId="f" dataKey="Congés" stackId="a" fill="var(--chart-1)" />
            <Bar yAxisId="f" dataKey="Management" stackId="a" fill="var(--chart-3)" />
            <Bar yAxisId="f" dataKey="Formation" stackId="a" fill="var(--violet)" />
            <Bar yAxisId="f" dataKey="Inoccupé" stackId="a" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
            <Line yAxisId="p" dataKey="TACE" stroke="var(--primary)" strokeWidth={3} unit="%" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="max-h-[320px] overflow-y-auto rounded-md border bg-secondary/40">

          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">

              <tr><th className="py-2 pl-4">{level === "talent" ? "Collaborateur" : level === "mgr" ? "Manager" : "Workspace"}</th><th className="text-right">Assigned FTE</th><th className="text-right">Selected FTE</th><th className="text-right">Absence</th><th className="text-right">Congés</th><th className="text-right">Management</th><th className="text-right">Formation</th><th className="text-right">Capacité</th><th className="text-right">Net Capacity</th><th className="text-right">Capacité FTE OWN</th><th className="text-right">Prod. possible (j)</th><th className="w-1/3 pl-4 pr-4">TACE</th></tr>
            </thead>
            <tbody>
              {detailRows.map((r) => (
                <tr key={r.name} className="border-t">
                  <td className="py-2 pl-4">{r.name}</td>
                  <td className="text-right font-mono">{r.a.toFixed(1)}</td>
                  <td className="text-right font-mono text-blue-500">{r.sel > 0 ? r.sel.toFixed(1) : "—"}</td>
                  <td className="text-right font-mono text-chart-5">{r.ab > 0 ? r.ab.toFixed(1) : "—"}</td>
                  <td className="text-right font-mono text-chart-1">{r.lv > 0 ? r.lv.toFixed(1) : "—"}</td>
                  <td className="text-right font-mono text-chart-3">{r.mg > 0 ? r.mg.toFixed(1) : "—"}</td>
                  <td className="text-right font-mono text-violet">{r.tr > 0 ? r.tr.toFixed(1) : "—"}</td>
                  <td className="text-right font-mono">{r.g.toFixed(1)}</td>
                  <td className="text-right font-mono">{r.net.toFixed(1)}</td>
                  <td className="text-right font-mono">{r.own.toFixed(1)}</td>
                  <td className="text-right font-mono text-chart-2">{r.prod.toFixed(0)}</td>
                  <td className="pl-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${Math.min(100, r.t * 100)}%` }} /></div>
                      <span className={`w-14 text-right font-mono text-xs ${tone(r.t)}`}>{fmt(r.t)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {!detailRows.length && <tr><td colSpan={12} className="py-4 text-center text-muted-foreground">Pas de détail disponible</td></tr>}
            </tbody>
          </table>
      </div>
    </section>

  );
}
