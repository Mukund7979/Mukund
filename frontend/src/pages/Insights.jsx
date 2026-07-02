import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, LineChart, Line } from "recharts";
import { getSummary } from "@/lib/api";
import { formatCurrency, colorForCategory } from "@/lib/format";

export default function Insights() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSummary().then((s) => { setSummary(s); setLoading(false); });
  }, []);

  if (loading || !summary) {
    return <div className="text-sm text-muted-foreground" data-testid="insights-loading">Loading...</div>;
  }

  const avgSpend = summary.monthly_trend.reduce((s, m) => s + m.total, 0) / (summary.monthly_trend.length || 1);
  const topCategory = summary.category_breakdown[0];
  const highestMonth = [...summary.monthly_trend].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-6 animate-in-up" data-testid="insights-page">
      <div className="border-b border-border pb-6">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Analytics</p>
        <h1 className="font-heading text-4xl sm:text-5xl font-light tracking-tight mt-2">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Patterns in your spending.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border bg-card p-6" data-testid="insight-avg-spend">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">6-Month Avg</p>
          <p className="font-mono text-3xl mt-3">{formatCurrency(avgSpend)}</p>
          <p className="text-xs text-muted-foreground mt-2">per month</p>
        </div>
        <div className="border border-border bg-card p-6" data-testid="insight-top-category">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Top Category</p>
          <p className="font-heading text-2xl mt-3">{topCategory?.category || "—"}</p>
          <p className="text-xs font-mono text-muted-foreground mt-2">{topCategory ? formatCurrency(topCategory.amount) : "No data"}</p>
        </div>
        <div className="border border-border bg-card p-6" data-testid="insight-peak-month">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Peak Month</p>
          <p className="font-heading text-2xl mt-3">{highestMonth?.label || "—"}</p>
          <p className="text-xs font-mono text-muted-foreground mt-2">{highestMonth ? formatCurrency(highestMonth.total) : "No data"}</p>
        </div>
      </div>

      <div className="border border-border bg-card p-6" data-testid="insights-monthly-chart">
        <h3 className="font-heading text-xl">Monthly Comparison</h3>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1 mb-4">Total by month</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.monthly_trend}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(240 4% 16%)" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(240 5% 65%)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(240 5% 65%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{
                  background: "hsl(0 0% 7%)",
                  border: "1px solid hsl(240 4% 16%)",
                  borderRadius: 0,
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                }}
                cursor={{ fill: "hsl(240 4% 12%)" }}
                formatter={(v) => [formatCurrency(v), "Total"]}
              />
              <Bar dataKey="total" fill="hsl(0 0% 98%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="border border-border bg-card p-6" data-testid="insights-category-breakdown">
        <h3 className="font-heading text-xl">Category Ranking</h3>
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1 mb-4">This month</p>
        {summary.category_breakdown.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border">
            No expenses yet this month.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.category_breakdown.map((c, idx) => {
              const pct = (c.amount / summary.total_month) * 100;
              return (
                <div key={c.category} data-testid={`insight-cat-${c.category}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-muted-foreground w-6">#{idx + 1}</span>
                      <span className="w-2 h-2" style={{ background: colorForCategory(c.category) }} />
                      <span className="tracking-wider uppercase">{c.category}</span>
                    </div>
                    <span className="font-mono">{formatCurrency(c.amount)} <span className="text-muted-foreground">· {pct.toFixed(1)}%</span></span>
                  </div>
                  <div className="h-1 bg-secondary relative">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, background: colorForCategory(c.category) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
