import { useSyncExternalStore } from "react";
import baseRaw from "@/data/agence.json";
import baseDates from "@/data/dates.json";

// [ws, talent, mgr, month, dossier, status, rev, assignedFte, grossCapacity, absence, management, training, leave]
export type Raw = [string, string, string, string, string, string, number, number, number, number, number, number, number];
export type Dates = Record<string, (string | null)[]>;
type State = { raw: Raw[]; dates: Dates; source: string };

const KEY = "agence-dataset-v9";
// Plafond métier : par collaborateur et par mois, Assigned FTE total et capacité brute ne dépassent jamais 1.
export function capOne(raw: Raw[]): Raw[] {
  const tot = new Map<string, number>();
  raw.forEach((r) => { const k = r[1] + "|" + r[3]; tot.set(k, (tot.get(k) ?? 0) + r[7]); });
  return raw.map((r) => {
    const t = tot.get(r[1] + "|" + r[3]) ?? 0;
    const x = [...r] as Raw;
    if (t > 1) x[7] = +(r[7] / t).toFixed(4);
    if (x[8] > 1) x[8] = 1;
    return x;
  });
}
const initial: State = { raw: capOne(baseRaw as Raw[]), dates: baseDates as Dates, source: "Agence Toulouse (05/10/2026, année 2026 complète)" };
let state: State = initial;
const listeners = new Set<() => void>();
// Équipe de management Delivery : collaborateurs sous Rodolphe Levesque + Alexis Balazuc + Matthieu Maugard
const low = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const isDeliveryMgmt = (talent: string, mgr: string) =>
  low(mgr).includes("rodolphe levesque") || low(talent).includes("rodolphe levesque") || /alexis bal(d)?azuc/.test(low(talent)) || low(talent).includes("matthieu maugard") || low(mgr).includes("matthieu maugard");
let includeDelivery = true;
const filterView = (s: State): State => includeDelivery ? s : { ...s, raw: s.raw.filter((r) => !isDeliveryMgmt(r[1], r[2])) };
let view: State = initial;
const emit = () => { view = filterView(state); listeners.forEach((l) => l()); };
const sub = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useDataset() {
  return useSyncExternalStore(sub, () => view, () => initial);
}
export function useRawDataset() {
  return useSyncExternalStore(sub, () => state, () => initial);
}
export function useIncludeDelivery() {
  return useSyncExternalStore(sub, () => includeDelivery, () => true);
}
export function setIncludeDelivery(v: boolean) {
  includeDelivery = v;
  try { localStorage.setItem("agence-include-delivery", v ? "1" : "0"); } catch { /* ignore */ }
  emit();
}

export function setDataset(next: State, persist = true) {
  state = { ...next, raw: capOne(next.raw) };
  if (persist) { try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* quota */ } }
  emit();
}
export function restoreDataset() {
  try { if (localStorage.getItem("agence-include-delivery") === "0") { includeDelivery = false; emit(); } } catch { /* ignore */ }
  try { const s = localStorage.getItem(KEY); if (s) setDataset(JSON.parse(s), false); } catch { /* ignore */ }
}
export function resetDataset() {
  localStorage.removeItem(KEY);
  setDataset(initial, false);
}

const MONTH_IDX: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const YEAR = 2026;
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9éè]/g, "");
const num = (v: unknown) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const toMonth = (v: unknown): string => {
  if (v instanceof Date) return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][v.getMonth()] ?? "";
  const s = norm(v);
  for (const [k, p] of <[string, string][]>[["Jan","jan"],["Feb","fe"],["Mar","mar"],["Apr","av"],["Apr","apr"],["May","mai"],["May","may"],["Jun","juin"],["Jun","jun"],["Jul","juil"],["Jul","jul"],["Aug","ao"],["Aug","aug"]]) if (s.startsWith(p)) return k;
  if (s.startsWith("sep")) return "Sep";
  if (s.startsWith("oct")) return "Oct";
  if (s.startsWith("nov")) return "Nov";
  if (s.startsWith("dec") || s.startsWith("déc")) return "Dec";
  return String(v ?? "");
};
const toIso = (v: unknown): string | null => {
  if (!v || v === "-") return null;
  const d = v instanceof Date ? v : new Date(String(v).replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1"));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// Share of working days (Mon–Fri) of the month the talent is employed, from entry/exit dates.
export function capacity(month: string, entry: string | null, exit: string | null) {
  const m = MONTH_IDX[month];
  if (m === undefined) return 1;
  const ex = exit && entry && exit < entry ? null : exit; // exit before entry = earlier departure, still employed
  let all = 0, on = 0;
  for (let d = new Date(Date.UTC(YEAR, m, 1)); d.getUTCMonth() === m; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    all++;
    const iso = d.toISOString().slice(0, 10);
    if ((!entry || iso >= entry) && (!ex || iso <= ex)) on++;
  }
  return all ? +(on / all).toFixed(3) : 0;
}

export async function importSpreadsheet(file: File): Promise<State> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Format non pris en charge. Sélectionnez un fichier Excel .xlsx.");
  }
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  const firstSheet = firstSheetName ? wb.Sheets[firstSheetName] : undefined;
  if (!firstSheet) throw new Error("Le classeur Excel ne contient aucune feuille lisible.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" });
  const headerIdx = rows.findIndex((r) => r.some((c) => norm(c) === "talenttalent"));
  if (headerIdx < 0) throw new Error("Colonne « Talent Talent » introuvable dans le fichier.");
  const h = rows[headerIdx]!.map(norm);
  const col = (...names: string[]) => {
    for (const name of names) {
      const exact = h.findIndex((value) => value === name);
      if (exact >= 0) return exact;
    }
    for (const name of names) {
      const partial = h.findIndex((value) => value.includes(name));
      if (partial >= 0) return partial;
    }
    return -1;
  };
  const c = {
    ws: col("talentworkspace"), talent: col("talenttalent"), mgr: col("talentmanager"), month: col("occupationtimemonth", "mois"),
    dossier: col("dossiername"), status: col("taskstatus"), rev: col("recognitionrevenue"), fte: col("assignedfte"),
    gross: col("grosscapacityfte", "grosscapacity", "capacitébrutefte", "capacitébrute"), absence: col("absencefte"), leave: col("leavefte", "leave"), mgmt: col("busymanagementfte", "managementfte"), training: col("trainingfte", "formation"),
    entry: col("entrydate", "datedentrée", "entrée", "entry"), exit: col("exitdate", "datedesortie", "sortie", "exit"),
  };
  const missing = (["ws", "talent", "mgr", "month", "fte"] as const).filter((k) => c[k] < 0);
  if (missing.length) throw new Error(`Colonnes manquantes : ${missing.join(", ")}.`);

  const dates: Dates = { ...state.dates };
  const body = rows.slice(headerIdx + 1).filter((r) => r[c.talent]);
  if (c.entry >= 0 || c.exit >= 0) body.forEach((r) => {
    dates[String(r[c.talent])] = [c.entry >= 0 ? toIso(r[c.entry]) : null, c.exit >= 0 ? toIso(r[c.exit]) : null];
  });
  const get = (r: unknown[], i: number) => (i >= 0 ? r[i] : "");
  const raw: Raw[] = body.map((r) => {
    const talent = String(r[c.talent]).trim();
    const month = toMonth(r[c.month]);
    const fte = num(r[c.fte]), absence = num(get(r, c.absence)), leave = num(get(r, c.leave)), management = num(get(r, c.mgmt)), training = num(get(r, c.training));
    const [entry = null, exit = null] = dates[talent] ?? [];
    const gross = c.gross >= 0 ? num(r[c.gross]) : dates[talent] ? capacity(month, entry, exit) : fte + absence + leave + management + training;
    return [String(r[c.ws]).trim(), talent, String(r[c.mgr]).trim(), month, String(get(r, c.dossier) || "-").trim(), String(get(r, c.status) || "-").trim(), num(get(r, c.rev)), fte, gross, absence, management, training, leave];
  });
  if (!raw.length) throw new Error("Aucune ligne de données trouvée.");
  return { raw, dates, source: file.name };
}

export async function exportSpreadsheet() {
  const XLSX = await import("xlsx");
  const header = ["Talent Workspace", "Talent Talent", "Talent Manager", "Occupation Time Month", "Dossier Name", "Task Status", "Assigned FTE", "Gross capacity FTE", "Absence FTE", "Leave FTE", "[Busy] Management FTE", "Training FTE", "Entry date", "Exit date"];
  const data = state.raw.map(([ws, talent, mgr, month, dossier, status, , fte, gross, absence, management, training, leave]) => {
    const [entry, exit] = state.dates[talent] ?? [null, null];
    return [ws, talent, mgr, month, dossier, status, fte, gross, absence, leave, management, training, entry ?? "", exit ?? ""];
  });
  const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
  sheet["!cols"] = header.map((x, i) => ({ wch: i === 4 ? 60 : Math.max(14, x.length + 2) }));
  sheet["!autofilter"] = { ref: `A1:N${data.length + 1}` };
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: "Pilotage Agence Toulouse",
    Subject: "Collaborateurs, capacités et affectations",
    Author: "Devoteam",
    CreatedDate: new Date(),
  };
  XLSX.utils.book_append_sheet(wb, sheet, "Affectations");
  XLSX.writeFile(wb, `Agence_Toulouse_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
