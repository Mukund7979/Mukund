import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { House, Receipt, ChartPieSlice, Wallet, DownloadSimple } from "@phosphor-icons/react";
import { exportCsvUrl } from "@/lib/api";

const navItems = [
  { to: "/", label: "Dashboard", icon: House, testId: "nav-dashboard" },
  { to: "/expenses", label: "Expenses", icon: Receipt, testId: "nav-expenses" },
  { to: "/budgets", label: "Budgets", icon: Wallet, testId: "nav-budgets" },
  { to: "/insights", label: "Insights", icon: ChartPieSlice, testId: "nav-insights" },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col border-r border-border bg-background z-40">
      <div className="px-6 py-8 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-heading font-bold text-lg">L</span>
          </div>
          <div>
            <div className="font-heading text-sm font-semibold tracking-tight" data-testid="brand-name">LEDGER</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Expense OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 flex flex-col gap-1">
        <div className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground px-3 mb-3">Navigation</div>
        {navItems.map(({ to, label, icon: Icon, testId }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              data-testid={testId}
              className={`group flex items-center gap-3 px-3 py-2.5 border border-transparent transition-all duration-150 ${
                active
                  ? "bg-secondary text-foreground border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon size={18} weight={active ? "fill" : "regular"} />
              <span className="text-sm font-medium">{label}</span>
              {active && <span className="ml-auto w-1 h-4 bg-primary" />}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <a
          href={exportCsvUrl()}
          data-testid="export-csv-link"
          className="flex items-center justify-center gap-2 border border-border px-3 py-2.5 text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-all"
        >
          <DownloadSimple size={14} />
          Export CSV
        </a>
      </div>
    </aside>
  );
}
