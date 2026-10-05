import { Link } from "@tanstack/react-router";

export function AppNav() {
  const cls = "block rounded-md px-3 py-2 text-sm text-primary-foreground/70 hover:bg-primary-foreground/10";
  return (
    <nav className="mt-8 space-y-1">
      <Link to="/" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "bg-primary-foreground/10 font-semibold text-primary-foreground" }}>Affectations & TACE</Link>
      <Link to="/conges" className={cls} activeProps={{ className: "bg-primary-foreground/10 font-semibold text-primary-foreground" }}>Suivi des congés</Link>
    </nav>
  );
}
