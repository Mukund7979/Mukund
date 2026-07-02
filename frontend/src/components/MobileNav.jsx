import React from "react";
import { NavLink } from "react-router-dom";
import { House, Receipt, ChartPieSlice, Wallet } from "@phosphor-icons/react";

const items = [
  { to: "/", label: "Home", icon: House, testId: "mnav-dashboard" },
  { to: "/expenses", label: "Expenses", icon: Receipt, testId: "mnav-expenses" },
  { to: "/budgets", label: "Budgets", icon: Wallet, testId: "mnav-budgets" },
  { to: "/insights", label: "Insights", icon: ChartPieSlice, testId: "mnav-insights" },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur-xl">
      {items.map(({ to, label, icon: Icon, testId }) => (
        <NavLink
          key={to}
          to={to}
          data-testid={testId}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-3 text-[10px] tracking-widest uppercase transition-colors ${
              isActive ? "text-foreground bg-secondary" : "text-muted-foreground"
            }`
          }
        >
          <Icon size={18} weight="regular" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
