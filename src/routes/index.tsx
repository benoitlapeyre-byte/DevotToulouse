import { createFileRoute } from "@tanstack/react-router";
import { Staffing } from "@/components/Staffing";
import { Tace, workdays } from "@/components/Tace";
import { Idle } from "@/components/Idle";
import { TalentCard } from "@/components/TalentCard";
import { DataFileBar } from "@/components/DataFileBar";
import { FilterSelect } from "@/components/FilterSelect";
import { StatCard } from "@/components/StatCard";
import { useDashboard, MONTHS, MONTH_FR } from "@/hooks/useDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pilotage Agence Toulouse — Collaborateurs & Affectations" },
      { name: "description", content: "Vision opérationnelle de l'agence : collaborateurs, managers, workspaces, affectations, absences et leads Salesforce." },
      { property: "og:title", content: "Pilotage Agence Toulouse" },
      { property: "og:description", content: "Collaborateurs, capacités, affectations, absences et leads Salesforce de septembre à décembre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { filters, setters, options, metrics } = useDashboard();
  const { ws, mgr, month, status, talent } = filters;
  const { setWs, setMgr, setMonth, setStatus, setTalent } = setters;
  const { wsOptions, mgrOptions, statusOptions } = options;
  const { talents, dossiers } = metrics;

  return (
    <>
      <header className="border-b bg-card px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operational dashboard</p>
            <h1 className="mt-1 text-3xl font-bold">Collaborateurs & affectations</h1>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FilterSelect label="Workspace" value={ws} onChange={(v) => { setWs(v); setMgr(""); }} options={wsOptions} />
            <FilterSelect label="Talent Manager" value={mgr} onChange={setMgr} options={mgrOptions} />
            <FilterSelect label="Statut" value={status} onChange={setStatus} options={statusOptions} />
            <div className="flex flex-col gap-1 text-xs uppercase tracking-wider text-muted-foreground md:col-span-3">
              Mois · 2026 · {workdays(month)} jours ouvrés
              <div className="grid grid-cols-6 gap-1 rounded-md bg-secondary p-1 lg:grid-cols-12">
                {MONTHS.map((m) => (
                  <button 
                    key={m} 
                    onClick={() => setMonth(m)} 
                    className={`rounded px-2 py-1 text-sm normal-case tracking-normal ${month === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-background"}`}
                  >
                    {MONTH_FR[m]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-7 lg:px-8">
        <DataFileBar />
        <div className="mb-6 grid grid-cols-2 gap-4">
          <StatCard label={`Présents ≥ 1 jour · ${MONTH_FR[month]}`} value={talents} highlight />
          <StatCard label="Leads Salesforce" value={dossiers} />
        </div>

        <Tace ws={ws} mgr={mgr} month={month} onPick={setTalent} />
        <Staffing ws={ws} mgr={mgr} month={month} onPick={setTalent} />
        <Idle ws={ws} mgr={mgr} month={month} onPick={setTalent} />
        {talent && <TalentCard talent={talent} onClose={() => setTalent(null)} />}
      </div>
    </>
  );
}
