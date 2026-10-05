import { useMemo } from "react";
import { useDataset } from "@/lib/dataset";
import { buildCap, MONTH_FR, pct, fmt, tone } from "@/components/Tace";

// Collaborateurs inoccupés sur le mois sélectionné : capacité restante après
// déduction de l'affectation, des absences (maladie), des congés, du management et de la formation.
export function Idle({ ws, mgr, month, onPick }: { ws: string; mgr: string; month: string; onPick: (t: string) => void }) {
  const { raw, dates } = useDataset();
  const cap = useMemo(() => buildCap(raw, dates), [raw, dates]);
  const base = cap.filter((c) => (!ws || c.ws === ws) && (!mgr || c.mgr === mgr));

  const idle = base
    .filter((c) => c.month === month && c.gross > 0)
    .map((c) => ({ talent: c.talent, mgr: c.mgr, ws: c.ws.replace("FR - ", ""), free: +(c.gross - c.assigned - c.absence - c.leave - c.management - c.training).toFixed(2), t: pct(c.assigned, c.gross) }))
    .filter((c) => c.free > 0.001)
    .sort((x, y) => y.free - x.free);

  return (
    <section className="dashboard-panel mb-6 rounded-lg border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collaborateurs inoccupés · {MONTH_FR[month]}</p>
        <span className="rounded-full bg-destructive/15 px-2 py-0.5 font-mono text-xs text-destructive">{idle.length} personne{idle.length > 1 ? "s" : ""}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Capacité restante après déduction de l'affectation, des absences (maladie), des congés, du management et de la formation. Cliquez sur un nom pour ouvrir sa fiche.</p>
      {idle.length ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {idle.map((c) => (
            <button key={c.talent} onClick={() => onPick(c.talent)} className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-left hover:border-primary">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.talent}</span>
                <span className="block truncate text-xs text-muted-foreground">{c.ws} · {c.mgr}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-sm font-semibold text-destructive">{c.free.toFixed(1)} FTE</span>
                <span className={`block font-mono text-xs ${tone(c.t)}`}>TACE {fmt(c.t)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun collaborateur inoccupé sur ce mois.</p>
      )}
    </section>
  );
}

