import { ReactNode } from "react";
import { AppNav } from "./AppNav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="bg-foreground px-6 py-7 text-primary-foreground lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-lg font-bold">d.</span>
          <span className="text-xl font-bold">devoteam</span>
        </div>
        <div className="mt-12 border-l-2 border-primary pl-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Agence Toulouse</p>
          <p className="mt-2 text-sm text-primary-foreground/70">Pilotage opérationnel de l'agence</p>
        </div>
        <AppNav />
        <div className="mt-auto pt-10 text-xs uppercase tracking-wider text-primary-foreground/40">
          Janvier — Décembre 2026
        </div>
      </aside>

      <main className="min-w-0">
        {children}
      </main>
    </div>
  );
}
