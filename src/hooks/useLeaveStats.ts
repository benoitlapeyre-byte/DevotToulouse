import { useMemo, useState } from "react";
import { useLeaves, managerOf } from "@/lib/conges";
import { isExcludedCollaborator } from "@/lib/dataset";

export function useLeaveStats() {
  const { rows, asOf, source } = useLeaves();
  const [unit, setUnit] = useState("");
  const [mgr, setMgr] = useState("");
  const [q, setQ] = useState("");
  const [riskOnly, setRiskOnly] = useState(false);

  const validRows = useMemo(() => rows.filter((r) => !isExcludedCollaborator(r.name, managerOf(r.name))), [rows]);
  const units = useMemo(() => [...new Set(validRows.map((r) => r.unit))].sort(), [validRows]);
  const mgrs = useMemo(() => [...new Set(validRows.map((r) => managerOf(r.name)).filter(Boolean))].sort(), [validRows]);
  
  const data = useMemo(() => validRows
    .filter((r) => 
      (!unit || r.unit === unit) && 
      (!mgr || managerOf(r.name) === mgr) && 
      (!q || r.name.toLowerCase().includes(q.toLowerCase())) && 
      (!riskOnly || r.risk > 0)
    )
    .sort((a, b) => b.risk - a.risk || b.n1 + b.n - a.n1 - a.n), 
  [validRows, unit, mgr, q, riskOnly]);

  const sum = (k: "n" | "n1" | "risk") => data.reduce((s, r) => s + r[k], 0);
  const atRisk = data.filter((r) => r.risk > 0).length;

  return {
    filters: { unit, mgr, q, riskOnly },
    setters: { setUnit, setMgr, setQ, setRiskOnly },
    options: { units, mgrs },
    stats: {
      data,
      atRisk,
      sum,
      totalCount: data.length,
      asOf,
      source,
      totalRows: validRows.length
    }
  };
}
