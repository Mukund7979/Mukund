import React, { useEffect, useState } from "react";
import { Plus, Trash, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createBudget,
  deleteBudget,
  fetchCategories,
  getSummary,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

export default function Budgets() {
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getSummary(), fetchCategories()]);
      setBudgetStatus(s.budget_status);
      setCategories(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const usedCategories = new Set(budgetStatus.map((b) => b.category));
  const availableCategories = categories.filter((c) => !usedCategories.has(c));

  const handleSave = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!category) return toast.error("Choose a category");
    if (isNaN(amt) || amt <= 0) return toast.error("Enter a positive amount");
    setSaving(true);
    try {
      await createBudget({ category, amount: amt, period: "monthly" });
      toast.success("Budget saved");
      setCategory(""); setAmount(""); setDialogOpen(false);
      load();
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBudget(id);
      toast.success("Budget removed");
      load();
    } catch {
      toast.error("Failed to remove");
    }
  };

  const overCount = budgetStatus.filter((b) => b.status === "over").length;
  const warnCount = budgetStatus.filter((b) => b.status === "warning").length;

  return (
    <div className="space-y-6 animate-in-up" data-testid="budgets-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Guardrails</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-light tracking-tight mt-2">Monthly Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">Cap spending. Get early warnings.</p>
        </div>
        <Button
          data-testid="budget-add-button"
          onClick={() => setDialogOpen(true)}
          disabled={availableCategories.length === 0}
          className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 tracking-widest text-xs uppercase disabled:opacity-40"
        >
          <Plus size={16} className="mr-2" weight="bold" />
          New Budget
        </Button>
      </div>

      {/* Alerts summary */}
      {(overCount > 0 || warnCount > 0) && (
        <div className="border border-warning bg-warning/5 p-4 flex items-start gap-3" data-testid="budget-alert-banner">
          <WarningCircle size={18} className="text-warning mt-0.5" weight="fill" />
          <div>
            <p className="text-sm font-semibold">
              {overCount > 0 && `${overCount} over budget`}
              {overCount > 0 && warnCount > 0 && " · "}
              {warnCount > 0 && `${warnCount} nearing limit`}
            </p>
            <p className="text-xs text-muted-foreground">Review flagged categories below.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground" data-testid="budgets-loading">Loading...</div>
      ) : budgetStatus.length === 0 ? (
        <div className="border border-dashed border-border p-16 text-center bg-card" data-testid="budgets-empty">
          <h3 className="font-heading text-2xl mb-2">No budgets set yet</h3>
          <p className="text-sm text-muted-foreground mb-6">Start with the categories you spend most in.</p>
          <Button
            data-testid="budgets-empty-add"
            onClick={() => setDialogOpen(true)}
            className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Create Your First Budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetStatus.map((b) => {
            const barColor = b.status === "over" ? "bg-loss" : b.status === "warning" ? "bg-warning" : "bg-foreground";
            const labelColor = b.status === "over" ? "text-loss" : b.status === "warning" ? "text-warning" : "text-muted-foreground";
            return (
              <div key={b.id} data-testid={`budget-card-${b.category}`} className="border border-border bg-card p-6 hover:border-foreground/40 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Category</p>
                    <h3 className="font-heading text-2xl mt-1">{b.category}</h3>
                  </div>
                  <button
                    data-testid={`budget-delete-${b.category}`}
                    onClick={() => handleDelete(b.id)}
                    className="p-2 border border-border hover:border-loss text-muted-foreground hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash size={12} />
                  </button>
                </div>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-mono text-3xl tracking-tighter">{formatCurrency(b.spent)}</span>
                  <span className="font-mono text-sm text-muted-foreground">/ {formatCurrency(b.budget)}</span>
                </div>
                <div className="h-2 bg-secondary relative overflow-hidden mb-2">
                  <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={labelColor}>
                    {b.percentage}% USED
                  </span>
                  <span className={b.remaining < 0 ? "text-loss" : "text-muted-foreground"}>
                    {b.remaining >= 0 ? formatCurrency(b.remaining) + " left" : formatCurrency(Math.abs(b.remaining)) + " over"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-none" data-testid="budget-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">New Budget</DialogTitle>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Set monthly cap</p>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="budget-category-select" className="rounded-none bg-transparent">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="rounded-none bg-card border-border">
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget-amount" className="text-xs tracking-widest uppercase text-muted-foreground">
                Monthly Amount ($)
              </Label>
              <Input
                id="budget-amount"
                data-testid="budget-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                className="rounded-none bg-transparent font-mono"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="budget-cancel" className="rounded-none">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} data-testid="budget-submit" className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? "Saving..." : "Save Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
