import { useMemo, useState } from "react";
import { useDataset, capacity, type Raw, isExcludedCollaborator } from "@/lib/dataset";

type Row = { ws: string; talent: string; mgr: string; month: string; dossier: string; status: string; fte: number; gross: number; absence: number; leave: number; management: number; training: number };
const toRows = (raw: Raw[]): Row[] => raw.map(
  ([ws, talent, mgr, month, dossier, status, , fte, gross, absence, management, training, leave]) => ({
    ws, talent, mgr, month, dossier,
    // Règle métier : en septembre, tout lead identifié est considéré comme en cours (IN_PROGRESS), jamais REQUEST.
    status: month === "Sep" && status === "REQUEST" ? "IN_PROGRESS" : status,
    fte, gross, absence, leave, management, training,
  }),
).filter((r) => r.ws !== "FR - Innovative Tech (DAP)" && !isExcludedCollaborator(r.talent, r.mgr));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FR: Record<string, string> = { Jan: "Janv", Feb: "Févr", Mar: "Mars", Apr: "Avr", May: "Mai", Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sept", Oct: "Oct", Nov: "Nov", Dec: "Déc" };

type St = "mission" | "lead" | "nolead" | "inter" | "out";
const ORDER: St[] = ["nolead", "inter", "lead", "mission"];
const ST_LABEL: Record<St, string> = { mission: "En mission", lead: "Lead à confirmer", nolead: "Affecté sans lead", inter: "Intermission", out: "Hors effectif" };
const ST_CLASS: Record<St, string> = { mission: "bg-chart-4 text-primary-foreground", lead: "bg-chart-2 text-primary-foreground", nolead: "bg-violet text-violet-foreground", inter: "bg-destructive text-destructive-foreground", out: "bg-muted text-muted-foreground" };
const SHORT: Record<St, string> = { mission: "Mission", lead: "Lead", nolead: "Sans lead", inter: "Inter", out: "Hors eff." };

export function Staffing({ ws, mgr, month, onPick }: { ws: string; mgr: string; month: string; onPick: (t: string) => void }) {
  const { raw, dates } = useDataset();
  const rows = useMemo(() => toRows(raw), [raw]);
  const [filter, setFilter] = useState<St | "">("");
  const [activityFilter, setActivityFilter] = useState<"training" | "">("");

  const list = useMemo(() => {
    const m = new Map<string, { talent: string; ws: string; mgr: string; byMonth: Record<string, Row[]> }>();
    rows.filter((r) => (!ws || r.ws === ws) && (!mgr || r.mgr === mgr)).forEach((r) => {
      let t = m.get(r.talent);
      if (!t) { t = { talent: r.talent, ws: r.ws.replace("FR - ", ""), mgr: r.mgr, byMonth: {} }; m.set(r.talent, t); }
      (t.byMonth[r.month] ??= []).push(r);
    });
    // Hors effectif / présence : d'après les dates d'entrée/sortie (≥ 1 jour ouvré dans le mois),
    // cohérent avec le KPI « Présents ≥ 1 jour ». Sans dates connues, repli sur les lignes du mois.
    const st = (talent: string, mo: string, l: Row[] = []): St => {
      const d = dates[talent];
      if (d) {
        const [entry = null, exit = null] = d;
        if (capacity(mo, entry, exit) <= 0) return "out";
      } else if (l.length && l.every((r) => r.gross === 0)) {
        return "out";
      }
      const leads = l.filter((r) => r.dossier !== "-");
      if (leads.some((r) => r.status === "IN_PROGRESS")) return "mission";
      if (leads.length) return "lead";
      if (l.some((r) => r.fte > 0)) return "nolead";
      return "inter";
    };
    return [...m.values()]
      .map((t) => ({ ...t, st: Object.fromEntries(MONTHS.map((mo) => [mo, st(t.talent, mo, t.byMonth[mo])])) as Record<string, St> }))
      .sort((a, b) => ORDER.indexOf(a.st[month] ?? "inter") - ORDER.indexOf(b.st[month] ?? "inter") || a.talent.localeCompare(b.talent));
  }, [rows, dates, ws, mgr, month]);

  const counts: Record<St, number> = { mission: 0, lead: 0, nolead: 0, inter: 0, out: 0 };
  list.forEach((t) => { counts[t.st[month] ?? "inter"]++; });
  const present = list.filter((t) => t.st[month] !== "out");
  const monthTotals = (talent: (typeof list)[number]) => {
    const monthRows = talent.byMonth[month] ?? [];
    return {
      absence: monthRows.reduce((sum, row) => sum + row.absence, 0),
      leave: monthRows.reduce((sum, row) => sum + row.leave, 0),
      management: monthRows.reduce((sum, row) => sum + row.management, 0),
      training: monthRows.reduce((sum, row) => sum + row.training, 0),
    };
  };
  const trainingCount = present.filter((talent) => monthTotals(talent).training > 0).length;
  const shown = present.filter((talent) => {
    if (filter && talent.st[month] !== filter) return false;
    const totals = monthTotals(talent);
    return !activityFilter || totals[activityFilter] > 0;
  });

  return (
    <section className="dashboard-panel mb-6 rounded-lg border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Contrôle des affectations leads</h2>
          <p className="mt-1 text-xs text-muted-foreground">« Affecté sans lead » : FTE affecté sur le mois mais aucun lead Salesforce créé — à régulariser. « Intermission » : présent mais ni lead ni affectation. « Hors effectif » : avant la date d'entrée ou après la date de sortie.</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {ORDER.map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "" : s)} className={`rounded-md border bg-secondary/30 p-4 text-left transition hover:bg-accent ${filter === s ? "ring-2 ring-ring" : ""}`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${ST_CLASS[s]}`} />
            <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground">{ST_LABEL[s]}</span>
            <p className="mt-1 font-display text-3xl font-bold">{counts[s]} <span className="text-sm font-normal text-muted-foreground">/ {present.length}</span></p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setActivityFilter(activityFilter === "training" ? "" : "training")} className={`rounded-md border px-3 py-2 text-sm transition ${activityFilter === "training" ? "border-violet bg-violet/20 text-violet" : "text-muted-foreground"}`}>
          Formation <span className="ml-1 font-mono font-semibold">{trainingCount}</span>
        </button>
      </div>
      <div className="max-h-[480px] overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="sticky left-0 top-0 z-20 w-[180px] min-w-[180px] border-b bg-card py-2.5 pl-3 pr-2 shadow-[0_1px_0_0_hsl(var(--border))]">Collaborateur</th>
              <th className="sticky top-0 z-10 border-b bg-card py-2.5 pr-3 shadow-[0_1px_0_0_hsl(var(--border))]">Workspace</th>
              <th className="sticky top-0 z-10 border-b bg-card py-2.5 pr-3 shadow-[0_1px_0_0_hsl(var(--border))]">Manager</th>
              {MONTHS.map((m) => <th key={m} className="sticky top-0 z-10 border-b bg-card px-2 py-2.5 text-center shadow-[0_1px_0_0_hsl(var(--border))]">{MONTH_FR[m]}</th>)}
              <th className="sticky top-0 z-10 border-b bg-card px-2 py-2.5 text-right shadow-[0_1px_0_0_hsl(var(--border))]">Absence</th>
              <th className="sticky top-0 z-10 border-b bg-card px-2 py-2.5 text-right shadow-[0_1px_0_0_hsl(var(--border))]">Congés</th>
              <th className="sticky top-0 z-10 border-b bg-card px-2 py-2.5 text-right shadow-[0_1px_0_0_hsl(var(--border))]">Management</th>
              <th className="sticky top-0 z-10 border-b bg-card px-2 py-2.5 text-right shadow-[0_1px_0_0_hsl(var(--border))]">Formation</th>
              <th className="sticky top-0 z-10 border-b bg-card py-2.5 pl-10 pr-3 shadow-[0_1px_0_0_hsl(var(--border))]">Lead(s) du mois</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t) => (
              <tr key={t.talent} onClick={() => onPick(t.talent)} className="group cursor-pointer border-t transition-colors hover:bg-accent">
                <td className="sticky left-0 z-[5] bg-card py-2 pl-3 pr-2 font-medium group-hover:bg-accent">{t.talent}</td>
                <td className="text-muted-foreground">{t.ws}</td>
                <td className="text-muted-foreground">{t.mgr}</td>
                {MONTHS.map((m) => {
                  const s = t.st[m] ?? "inter";
                  return (
                    <td key={m} className="px-1 text-center">
                      <span title={ST_LABEL[s]} className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${ST_CLASS[s]} ${m === month ? "" : "opacity-50"}`}>{SHORT[s]}</span>
                    </td>
                  );
                })}
                <td className="text-right font-mono text-chart-2">{monthTotals(t).absence > 0 ? monthTotals(t).absence.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-chart-1">{monthTotals(t).leave > 0 ? monthTotals(t).leave.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-primary">{monthTotals(t).management > 0 ? monthTotals(t).management.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-violet">{monthTotals(t).training > 0 ? monthTotals(t).training.toFixed(2) : "—"}</td>
                <td className="max-w-[360px] truncate py-2 pl-10 text-xs text-muted-foreground">
                  {t.byMonth[month]?.filter((r) => r.dossier !== "-").map((r) => r.dossier).join(" | ") || <span className="text-destructive">{t.st[month] === "nolead" ? "Affecté sans lead — à créer par le commercial" : t.st[month] === "out" ? "Pas encore arrivé ou sorti" : "Aucun lead ni affectation"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
