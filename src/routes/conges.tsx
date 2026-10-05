import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { importLeaves, managerOf, resetLeaves, restoreLeaves, setLeaves } from "@/lib/conges";
import { useLeaveStats } from "@/hooks/useLeaveStats";
import { FilterSelect } from "@/components/FilterSelect";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/conges")({
  head: () => ({
    meta: [
      { title: "Suivi des congés — Pilotage Agence Toulouse" },
      { name: "description", content: "Soldes de congés payés N et N-1 des collaborateurs de l'agence, avec jours à risque de perte." },
      { property: "og:title", content: "Suivi des congés — Agence Toulouse" },
      { property: "og:description", content: "Soldes CP N / N-1 par collaborateur et jours à poser avant expiration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Conges,
});

const f = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const fd = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function Conges() {
  const { filters, setters, options, stats } = useLeaveStats();
  const { unit, mgr, q, riskOnly } = filters;
  const { setUnit, setMgr, setQ, setRiskOnly } = setters;
  const { units, mgrs } = options;
  const { data, atRisk, sum, totalCount, asOf, source, totalRows } = stats;

  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  
  useEffect(() => { restoreLeaves(); }, []);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { const next = await importLeaves(file); setLeaves(next); toast.success(`${next.rows.length} collaborateurs importés`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Import impossible"); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };

  return (
    <>
      <header className="border-b bg-card px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Congés payés</p>
            <h1 className="mt-1 text-3xl font-bold">Suivi des congés</h1>
            <p className="mt-1 text-sm text-muted-foreground">Soldes au {fd(asOf)}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <FilterSelect label="Workspace" value={unit} onChange={setUnit} options={units} />
            <FilterSelect label="Manager" value={mgr} onChange={setMgr} options={mgrs} />
            
            <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-muted-foreground">Collaborateur
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="rounded-md border border-input bg-secondary px-3 py-2 text-sm normal-case tracking-normal text-foreground" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} /> 
              Jours à risque uniquement
            </label>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-7 lg:px-8">
        <div className="dashboard-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-3">
          <div className="text-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fichier des soldes</span>
            <p className="font-medium">{source} <span className="font-mono text-xs text-muted-foreground">· {totalRows} collaborateurs</span></p>
          </div>
          <div className="flex gap-2">
            <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <button disabled={busy} onClick={() => input.current?.click()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Import…" : "Mettre à jour (upload)"}</button>
            <button onClick={() => { resetLeaves(); toast("Fichier initial rétabli"); }} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">Réinitialiser</button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Collaborateurs" value={totalCount} />
          <StatCard label="Solde CP N-1 (j)" value={f(sum("n1"))} />
          <StatCard label="Solde CP N (j)" value={f(sum("n"))} />
          <StatCard label={`Jours à risque · ${atRisk} pers.`} value={f(sum("risk"))} highlight />
        </div>

        <section className="dashboard-panel overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Collaborateur", "Manager", "Workspace", "Département", "CP N-1 restant", "À risque", "Expiration N-1", "CP N acquis", "CP N restant"].map((h, i) => <th key={h} className={`px-4 py-3 ${i > 3 ? "text-right" : ""}`}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.name} className="border-b last:border-0 hover:bg-accent/40">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{managerOf(r.name) || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.unit.replace(/^FR - /, "")}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.dept}</td>
                  <td className="px-4 py-2 text-right font-mono">{f(r.n1)}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.risk > 0 ? <span className="rounded bg-primary/15 px-2 py-0.5 font-semibold text-primary">{f(r.risk)}</span> : "—"}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{r.risk > 0 ? fd(r.exp) : "—"}</td>
                  <td className="px-4 py-2 text-right font-mono">{f(r.nAcq)}</td>
                  <td className="px-4 py-2 text-right font-mono">{f(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
