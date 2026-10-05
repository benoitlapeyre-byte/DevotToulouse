import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, RotateCcw, Upload } from "lucide-react";
import { exportSpreadsheet, importSpreadsheet, resetDataset, setDataset, useDataset, useIncludeDelivery, setIncludeDelivery } from "@/lib/dataset";
import { Button } from "@/components/ui/button";

export function DataFileBar() {
  const { raw, source } = useDataset();
  const includeDelivery = useIncludeDelivery();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const next = await importSpreadsheet(file);
      setDataset(next);
      toast.success(`${next.raw.length} lignes importées depuis ${file.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      await exportSpreadsheet();
      toast.success("Fichier Excel .xlsx exporté");
    } catch {
      toast.error("Export Excel impossible");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="dashboard-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-5 py-3">
      <div className="text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source des données</span>
        <p className="font-medium">{source} <span className="font-mono text-xs text-muted-foreground">· {raw.length} lignes</span></p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="mr-2 flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm" title="Rodolphe Levesque, les collaborateurs sous sa responsabilité, et Alexis Balazuc">
          <input type="checkbox" className="accent-primary" checked={includeDelivery} onChange={(e) => setIncludeDelivery(e.target.checked)} />
          Inclure l'équipe management Delivery
        </label>
        <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button disabled={busy} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />
          {busy ? "Import…" : "Importer .xlsx"}
        </Button>
        <Button variant="outline" disabled={exporting} onClick={onExport}>
          <Download aria-hidden="true" />
          {exporting ? "Export…" : "Exporter .xlsx"}
        </Button>
        <Button variant="ghost" onClick={() => { resetDataset(); toast("Export intégré rétabli"); }}>
          <RotateCcw aria-hidden="true" />
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
