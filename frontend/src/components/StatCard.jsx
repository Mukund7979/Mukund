import React from "react";

export default function StatCard({ label, value, subLabel, subValue, subTone, icon: Icon, testId }) {
  const toneClass =
    subTone === "up" ? "text-loss" : subTone === "down" ? "text-profit" : "text-muted-foreground";
  return (
    <div
      className="border border-border bg-card p-6 flex flex-col gap-4 hover:-translate-y-[1px] hover:border-foreground/40 transition-all"
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon size={16} className="text-muted-foreground" />}
      </div>
      <div className="font-mono text-3xl sm:text-4xl tracking-tighter text-foreground">
        {value}
      </div>
      {subValue !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-mono ${toneClass}`}>{subValue}</span>
          <span className="text-muted-foreground tracking-wider uppercase text-[10px]">{subLabel}</span>
        </div>
      )}
    </div>
  );
}
