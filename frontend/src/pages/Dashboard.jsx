import React, { useEffect, useState } from "react";
import { Plus, ArrowUpRight, ArrowDownRight, Receipt, Wallet } from "@phosphor-icons/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import StatCard from "@/components/StatCard";
import ExpenseFormDialog from "@/components/ExpenseFormDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchCategories, getSummary } from "@/lib/api";
import { formatCurrency, formatDate, colorForCategory } from "@/lib/format";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getSummary(), fetchCategories()]);
      setSummary(s);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeUp = summary && summary.change_pct > 0;
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 animate-in-up" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
            Command · {monthLabel}
          </p>
          <h1 className="font-heading text-4xl sm:text-5xl font-light tracking-tight mt-2" data-testid="dashboard-title">
            Financial Pulse
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track every dollar. Own every decision.</p>
        </div>
        <Button
          data-testid="dashboard-add-expense-button"
          onClick={() => setDialogOpen(true)}
          className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 tracking-widest text-xs uppercase"
        >
          <Plus size={16} className="mr-2" weight="bold" />
          New Expense
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm" data-testid="dashboard-loading">Loading...</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              testId="stat-total-month"
              label="Total Spent · This Month"
              value={formatCurrency(summary.total_month)}
              subValue={`${changeUp ? "+" : ""}${summary.change_pct}%`}
              subLabel="vs last month"
              subTone={changeUp ? "up" : "down"}
              icon={Wallet}
            />
            <StatCard
              testId="stat-transactions"
              label="Transactions"
              value={summary.transaction_count}
              subValue={summary.transaction_count > 0 ? formatCurrency(summary.total_month / summary.transaction_count) : "—"}
              subLabel="avg per txn"
              icon={Receipt}
            />
            <StatCard
              testId="stat-prev-month"
              label="Previous Month"
              value={formatCurrency(summary.total_prev)}
              subValue={changeUp ? "increased" : "decreased"}
              subLabel="spend trend"
              subTone={changeUp ? "up" : "down"}
              icon={changeUp ? ArrowUpRight : ArrowDownRight}
            />
            <StatCard
              testId="stat-budgets-active"
              label="Active Budgets"
              value={summary.budget_status.length}
              subValue={`${summary.budget_status.filter((b) => b.status !== "ok").length}`}
              subLabel="alerts"
              subTone={summary.budget_status.some((b) => b.status !== "ok") ? "up" : undefined}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trend chart */}
            <div className="lg:col-span-2 border border-border bg-card p-6" data-testid="chart-trend-card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading text-xl">Spending Trend</h3>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">Last 6 Months</p>
                </div>
              </div>
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.monthly_trend}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(0 0% 98%)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="hsl(0 0% 98%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
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
                      formatter={(v) => [formatCurrency(v), "Total"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(0 0% 98%)"
                      strokeWidth={2}
                      fill="url(#trendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category pie */}
            <div className="border border-border bg-card p-6" data-testid="chart-category-card">
              <h3 className="font-heading text-xl">By Category</h3>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1 mb-4">This Month</p>
              {summary.category_breakdown.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border">
                  No data yet
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.category_breakdown}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={1}
                        stroke="none"
                      >
                        {summary.category_breakdown.map((entry, i) => (
                          <Cell key={i} fill={colorForCategory(entry.category)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(0 0% 7%)",
                          border: "1px solid hsl(240 4% 16%)",
                          borderRadius: 0,
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 12,
                        }}
                        formatter={(v) => formatCurrency(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="space-y-1.5 mt-4">
                {summary.category_breakdown.slice(0, 4).map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2" style={{ background: colorForCategory(c.category) }} />
                      <span className="text-muted-foreground">{c.category}</span>
                    </div>
                    <span className="font-mono">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border border-border bg-card p-6" data-testid="dashboard-recent-expenses">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-xl">Recent Transactions</h3>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1">Latest activity</p>
                </div>
                <Link to="/expenses" data-testid="view-all-expenses-link" className="text-xs tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground pb-0.5">
                  View All →
                </Link>
              </div>
              {summary.recent_expenses.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border">
                  No transactions yet. Add your first expense to get started.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {summary.recent_expenses.map((e) => (
                    <div key={e.id} className="py-3 flex items-center justify-between" data-testid={`recent-expense-${e.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-8" style={{ background: colorForCategory(e.category) }} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.description}</p>
                          <p className="text-[10px] tracking-widest uppercase text-muted-foreground">
                            {e.category} · {formatDate(e.date)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-border bg-card p-6" data-testid="dashboard-budget-alerts">
              <h3 className="font-heading text-xl">Budget Alerts</h3>
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mt-1 mb-4">Live tracking</p>
              {summary.budget_status.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center border border-dashed border-border">
                  No budgets set. <Link to="/budgets" data-testid="setup-budget-link" className="underline underline-offset-4 hover:text-foreground">Set one now →</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary.budget_status.map((b) => {
                    const barColor = b.status === "over" ? "bg-loss" : b.status === "warning" ? "bg-warning" : "bg-foreground";
                    return (
                      <div key={b.id} data-testid={`budget-${b.category}`} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="tracking-wider uppercase text-muted-foreground">{b.category}</span>
                          <span className="font-mono">{formatCurrency(b.spent)} / {formatCurrency(b.budget)}</span>
                        </div>
                        <div className="h-1.5 bg-secondary relative overflow-hidden">
                          <div
                            className={`h-full ${barColor} transition-all`}
                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                          />
                        </div>
                        <div className={`text-[10px] tracking-wider uppercase font-mono ${b.status === "over" ? "text-loss" : b.status === "warning" ? "text-warning" : "text-muted-foreground"}`}>
                          {b.percentage}% {b.status === "over" ? "· Over Budget" : b.status === "warning" ? "· Nearing Limit" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        onSaved={load}
      />
    </div>
  );
}
