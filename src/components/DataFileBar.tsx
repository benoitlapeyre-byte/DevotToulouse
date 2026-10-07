import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, RotateCcw, Upload, Info } from "lucide-react";
import { exportSpreadsheet, importSpreadsheet, resetDataset, setDataset, useDataset, useRawDataset, isDeliveryMgmt, useIncludeDelivery, setIncludeDelivery } from "@/lib/dataset";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DataFileBar() {
  const { raw, source } = useDataset();
  const rawDataset = useRawDataset();
  const includeDelivery = useIncludeDelivery();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const deliveryMembers = Array.from(new Set(rawDataset.raw.filter(r => isDeliveryMgmt(r[1], r[2])).map(r => r[1]))).sort((a, b) => a.localeCompare(b));

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
        <div className="mr-2 flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm bg-background">
          <label className="flex cursor-pointer items-center gap-2" title="Rodolphe Levesque, les collaborateurs sous sa responsabilité, Alexis Balazuc, et Matthieu Maugard">
            <input type="checkbox" className="accent-primary" checked={includeDelivery} onChange={(e) => setIncludeDelivery(e.target.checked)} />
            Inclure l'équipe management Delivery
          </label>
          <Dialog>
            <DialogTrigger asChild>
              <button className="ml-1 text-muted-foreground hover:text-foreground focus:outline-none" title="Voir l'équipe">
                <Info size={16} />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Équipe Management Delivery</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                <ul className="space-y-2 text-sm">
                  {deliveryMembers.map(name => (
                    <li key={name} className="flex items-center gap-2 border-b pb-2 last:border-0 last:pb-0">
                      <div className="h-6 w-6 shrink-0 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-medium text-foreground">
                        {name.substring(0, 1)}
                      </div>
                      <span>{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-right">
                {deliveryMembers.length} collaborateurs
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
