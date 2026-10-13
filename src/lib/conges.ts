import { useSyncExternalStore } from "react";
import base from "@/data/conges.json";
import agence from "@/data/agence.json";
import { isExcludedCollaborator } from "@/lib/dataset";

const keyName = (s: string) => s.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
const mgrMap = new Map<string, string>();
for (const r of agence as unknown[][]) { const t = String(r[1]); if (!mgrMap.has(keyName(t))) mgrMap.set(keyName(t), String(r[2])); }
export const managerOf = (name: string) => mgrMap.get(keyName(name)) ?? "";

export type Leave = { name: string; unit: string; dept: string; n: number; nAcq: number; n1: number; risk: number; exp: string | null };
export type LeaveState = { asOf: string; source: string; rows: Leave[] };

const KEY = "agence-conges-v1";
const initial = base as LeaveState;
let state = initial;
const ls = new Set<() => void>();

export const useLeaves = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => state, () => initial);
export function setLeaves(next: LeaveState, persist = true) {
  state = next;
  if (persist) { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ } }
  ls.forEach((l) => l());
}
export function restoreLeaves() { try { const s = localStorage.getItem(KEY); if (s) setLeaves(JSON.parse(s), false); } catch { /* ignore */ } }
export function resetLeaves() { localStorage.removeItem(KEY); setLeaves(initial, false); }

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const num = (v: unknown) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const iso = (v: unknown) => { if (!v) return null; const d = v instanceof Date ? v : new Date(String(v)); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); };

export async function importLeaves(file: File): Promise<LeaveState> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0] ?? ""]!, { header: 1, defval: "" });
  const asOfRow = rows.find((r) => norm(r[0]) === "asof");
  const hi = rows.findIndex((r) => r.some((c) => norm(c) === "worker") && r.some((c) => norm(c) === "plan"));
  if (hi < 0) throw new Error("Colonnes « Worker » et « Plan » introuvables.");
  const h = rows[hi]!.map(norm);
  const col = (n: string) => h.findIndex((c) => c.startsWith(n));
  const c = { w: col("worker"), unit: col("operatingunit"), dept: col("department"), plan: col("plan"), cur: col("currentbalance"), acc: col("accruedbalance"), risk: col("carryoverbalanceatrisk"), exp: col("nextcarryoverexpiration") };
  if (c.cur < 0) throw new Error("Colonne « Current Balance » introuvable.");
  const map = new Map<string, Leave>();
  for (const r of rows.slice(hi + 1)) {
    const name = String(r[c.w] ?? "").trim(); const plan = String(r[c.plan] ?? "").trim();
    if (!name || !plan) continue;
    if (isExcludedCollaborator(name, managerOf(name))) continue;
    const o = map.get(name) ?? { name, unit: String(r[c.unit] ?? ""), dept: String(r[c.dept] ?? ""), n: 0, nAcq: 0, n1: 0, risk: 0, exp: null };
    if (/N-1$/.test(plan)) { o.n1 = num(r[c.cur]); o.risk = c.risk >= 0 ? num(r[c.risk]) : 0; o.exp = c.exp >= 0 ? iso(r[c.exp]) : null; }
    else if (/ N$/.test(plan)) { o.n = num(r[c.cur]); o.nAcq = c.acc >= 0 ? num(r[c.acc]) : 0; }
    map.set(name, o);
  }
  if (!map.size) throw new Error("Aucun solde de congés trouvé.");
  return { asOf: iso(asOfRow?.[1]) ?? new Date().toISOString().slice(0, 10), source: file.name, rows: [...map.values()] };
}
