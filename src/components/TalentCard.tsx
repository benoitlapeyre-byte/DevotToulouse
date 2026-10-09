import { useDataset, capacity, type Raw } from "@/lib/dataset";

type R = { ws: string; talent: string; mgr: string; month: string; dossier: string; status: string; fte: number; gross: number; absence: number; leave: number; management: number; training: number; selected: number };
const toAll = (raw: Raw[]): R[] => raw.map(
  ([ws, talent, mgr, month, dossier, status, , fte, gross, absence, management, training, leave, selected]) => ({
    ws, talent, mgr, month, dossier, fte, gross: gross || 0, absence, leave, management, training, selected: selected || 0,
    status: month === "Sep" && status === "REQUEST" ? "IN_PROGRESS" : status,
  }),
).filter((r) => r.ws !== "FR - Innovative Tech (DAP)");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FR: Record<string, string> = { Jan: "Janv", Feb: "Févr", Mar: "Mars", Apr: "Avr", May: "Mai", Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sept", Oct: "Oct", Nov: "Nov", Dec: "Déc" };
const STATUS = {
  mission: ["En mission", "bg-chart-4/20 text-chart-4"],
  lead: ["Lead à confirmer", "bg-chart-2/20 text-chart-2"],
  nolead: ["Affecté sans lead", "bg-violet/20 text-violet"],
  inter: ["Intermission", "bg-destructive/20 text-destructive"],
  out: ["Hors effectif", "bg-muted text-muted-foreground"],
} as const;

export function TalentCard({ talent, onClose }: { talent: string; onClose: () => void }) {
  const { raw, dates } = useDataset();
  const rows = toAll(raw).filter((r) => r.talent === talent);
  const first = rows[0];
  const leads = rows.filter((r) => r.dossier !== "-");
  const months = MONTHS.map((m) => {
    const l = rows.filter((r) => r.month === m);
    const ld = l.filter((r) => r.dossier !== "-");
    const fte = l.reduce((s, r) => s + r.fte, 0);
    const dt = dates[talent];
    const fg = Math.max(0, ...l.map((r) => r.gross));
    const gross = fg;
    const st: keyof typeof STATUS = ld.some((r) => r.status === "IN_PROGRESS") ? "mission" : ld.length ? "lead" : fte > 0 ? "nolead" : gross === 0 ? "out" : "inter";
    return { m, fte, gross, tace: gross ? fte / gross : null, absence: l.reduce((s, r) => s + r.absence, 0), leave: l.reduce((s, r) => s + r.leave, 0), management: l.reduce((s, r) => s + r.management, 0), training: l.reduce((s, r) => s + r.training, 0), selected: l.reduce((s, r) => s + r.selected, 0), st };
  });
  const totFte = months.reduce((s, x) => s + x.fte, 0);
  const totGross = months.reduce((s, x) => s + x.gross, 0);
  const dossiers = [...new Set(leads.map((r) => r.dossier))].map((d) => {
    const l = leads.filter((r) => r.dossier === d);
    return { d, months: MONTHS.filter((m) => l.some((r) => r.month === m)), status: l.some((r) => r.status === "IN_PROGRESS") ? "IN_PROGRESS" : "REQUEST", fte: l.reduce((s, r) => s + r.fte, 0) };
  }).sort((a, b) => a.d.localeCompare(b.d));
  const pct = (v: number | null) => v == null ? "—" : `${Math.round(v * 100)} %`;
  const color = (v: number | null) => v == null ? "text-muted-foreground" : v >= 0.85 ? "text-chart-4" : v >= 0.7 ? "text-chart-2" : "text-destructive";
  const [entry, exit] = dates[talent] ?? [null, null];
  const fd = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("fr-FR") : "—";
  const initials = talent.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/50" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-auto border-l border-l-primary bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="mb-4 text-sm font-medium text-primary hover:text-primary/80">← Fermer</button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">{initials}</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Fiche collaborateur</p>
            <h2 className="text-2xl font-bold">{talent}</h2>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border p-3"><dt className="text-xs uppercase text-muted-foreground">Workspace</dt><dd className="mt-1">{first?.ws.replace("FR - ", "") ?? "—"}</dd></div>
          <div className="rounded-md border p-3"><dt className="text-xs uppercase text-muted-foreground">Talent Manager</dt><dd className="mt-1">{first?.mgr ?? "—"}</dd></div>
          <div className="rounded-md border p-3"><dt className="text-xs uppercase text-muted-foreground">Date d'entrée</dt><dd className="mt-1 font-mono">{fd(entry)}</dd></div>
          <div className="rounded-md border p-3"><dt className="text-xs uppercase text-muted-foreground">Date de sortie</dt><dd className={`mt-1 font-mono ${exit ? "text-destructive" : ""}`}>{exit ? fd(exit) : "En poste"}</dd></div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[["TACE Sept→Déc", pct(totGross ? totFte / totGross : null), color(totGross ? totFte / totGross : null)], ["Leads", String(dossiers.length), ""], ["Absence FTE (maladie)", months.reduce((s, x) => s + x.absence, 0).toFixed(2), "text-chart-2"], ["Congés FTE", months.reduce((s, x) => s + x.leave, 0).toFixed(2), "text-chart-1"], ["Management FTE", months.reduce((s, x) => s + x.management, 0).toFixed(2), "text-primary"], ["Formation FTE", months.reduce((s, x) => s + x.training, 0).toFixed(2), "text-violet"]].map(([l, v, c]) => (
            <div key={l} className="rounded-md border p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p><p className={`mt-1 font-display text-xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>

        <h3 className="mt-6 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Mois par mois</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Mois</th><th>Statut</th><th className="text-right">Assigned FTE</th><th className="text-right">Selected FTE</th><th className="text-right">Capacité</th><th className="text-right">Absence</th><th className="text-right">Congés</th><th className="text-right">Management</th><th className="text-right">Formation</th><th className="text-right">TACE</th></tr></thead>
          <tbody>
            {months.map((x) => (
              <tr key={x.m} className="border-t">
                <td className="py-2 font-mono">{FR[x.m]}</td>
                <td><span className={`rounded px-2 py-0.5 text-xs ${STATUS[x.st][1]}`}>{STATUS[x.st][0]}</span></td>
                <td className="text-right font-mono">{x.fte.toFixed(2)}</td>
                <td className="text-right font-mono text-blue-500">{x.selected ? x.selected.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-muted-foreground">{x.gross ? x.gross.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-chart-2">{x.absence ? x.absence.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-chart-1">{x.leave ? x.leave.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-primary">{x.management ? x.management.toFixed(2) : "—"}</td>
                <td className="text-right font-mono text-violet">{x.training ? x.training.toFixed(2) : "—"}</td>
                <td className={`text-right font-mono ${color(x.tace)}`}>{pct(x.tace)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-6 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Leads Salesforce</h3>
        {dossiers.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Aucun lead créé — à faire créer par le commercial.</p>
        ) : (
          <ul className="space-y-2">
            {dossiers.map((x) => (
              <li key={x.d} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm">{x.d}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={x.status === "IN_PROGRESS" ? "text-chart-4" : "text-chart-2"}>{x.status === "IN_PROGRESS" ? "Confirmé" : "Demande"}</span>
                  <span className="text-muted-foreground">· FTE {x.fte.toFixed(2)} ·</span>
                  {x.months.map((m) => <span key={m} className="rounded bg-muted px-1.5 font-mono">{FR[m]}</span>)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
