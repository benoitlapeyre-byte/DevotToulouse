import { useState, useMemo, useEffect } from "react";
import { useDataset, restoreDataset, capacity, type Raw } from "@/lib/dataset";

export type Row = {
  ws: string;
  talent: string;
  mgr: string;
  month: string;
  dossier: string;
  status: string;
  fte: number;
  gross: number;
  absence: number;
  leave: number;
  management: number;
  training: number;
};

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_FR: Record<string, string> = {
  Jan: "Janv", Feb: "Févr", Mar: "Mars", Apr: "Avr", May: "Mai", Jun: "Juin", Jul: "Juil", Aug: "Août", Sep: "Sept", Oct: "Oct", Nov: "Nov", Dec: "Déc"
};

export const uniq = (rows: Row[], k: keyof Row) => [...new Set(rows.map((r) => r[k] as string))].sort();

const toRows = (raw: Raw[]): Row[] => raw.map(
  ([ws, talent, mgr, month, dossier, status, , fte, gross, absence, management, training, leave]) => ({
    ws, talent, mgr, month, dossier, fte, gross, absence, leave, management, training,
    // Règle métier : en septembre, tout lead identifié est considéré comme confirmé (IN_PROGRESS), jamais REQUEST.
    status: month === "Sep" && status === "REQUEST" ? "IN_PROGRESS" : status,
  }),
).filter((r) => r.ws !== "FR - Innovative Tech (DAP)");

export function useDashboard() {
  const [ws, setWs] = useState("");
  const [mgr, setMgr] = useState("");
  const [month, setMonth] = useState("Oct");
  const [status, setStatus] = useState("");
  const [talent, setTalent] = useState<string | null>(null);
  const { raw, dates } = useDataset();

  const rows = useMemo(() => toRows(raw), [raw]);

  useEffect(() => { restoreDataset(); }, []);

  const data = useMemo(() => rows.filter((r) => 
    (!ws || r.ws === ws) && 
    (!mgr || r.mgr === mgr) && 
    r.month === month && 
    (!status || r.status === status)
  ), [rows, ws, mgr, month, status]);

  const mgrOptions = useMemo(() => [...new Set(rows.filter((r) => !ws || r.ws === ws).map((r) => r.mgr))].sort(), [rows, ws]);

  const scope = new Set(rows.filter((r) => (!ws || r.ws === ws) && (!mgr || r.mgr === mgr)).map((r) => r.talent));
  const presentIn = (t: string, m: string) => {
    const [entry = null, exit = null] = dates[t] ?? [];
    if (dates[t]) return capacity(m, entry, exit) > 0;
    return rows.some((r) => r.talent === t && r.month === m);
  };

  const talents = [...scope].filter((t) => presentIn(t, month)).length;
  const presentData = data.filter((r) => presentIn(r.talent, month));
  const dossiers = new Set(presentData.filter((r) => r.dossier !== "-").map((r) => r.dossier)).size;

  return {
    filters: { ws, mgr, month, status, talent },
    setters: { setWs, setMgr, setMonth, setStatus, setTalent },
    options: { wsOptions: uniq(rows, "ws"), mgrOptions, statusOptions: ["IN_PROGRESS", "REQUEST"] },
    metrics: { talents, dossiers },
  };
}
