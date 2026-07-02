import React, { useEffect, useState } from "react";
import { Plus, MagnifyingGlass, PencilSimple, Trash, Image as ImageIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ExpenseFormDialog from "@/components/ExpenseFormDialog";
import { deleteExpense, fetchCategories, listExpenses } from "@/lib/api";
import { formatCurrency, formatDate, colorForCategory } from "@/lib/format";
import { toast } from "sonner";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category && category !== "All") params.category = category;
      if (search) params.search = search;
      const data = await listExpenses(params);
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories().then(setCategories);
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteExpense(deleteId);
      toast.success("Expense deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6 animate-in-up" data-testid="expenses-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">Ledger</p>
          <h1 className="font-heading text-4xl sm:text-5xl font-light tracking-tight mt-2">All Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Every transaction. Fully searchable.</p>
        </div>
        <Button
          data-testid="expenses-add-button"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 tracking-widest text-xs uppercase"
        >
          <Plus size={16} className="mr-2" weight="bold" />
          New Expense
        </Button>
      </div>

      {/* Filters */}
      <div className="border border-border bg-card p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="expenses-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="rounded-none bg-transparent pl-10"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="expenses-filter-category" className="w-full md:w-56 rounded-none bg-transparent">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="rounded-none bg-card border-border">
            <SelectItem value="All">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border bg-card">
        <div className="grid grid-cols-12 border-b border-border px-6 py-3 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          <div className="col-span-2">Date</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted-foreground" data-testid="expenses-loading">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground" data-testid="expenses-empty">
            No expenses match your filters.
          </div>
        ) : (
          <div>
            {expenses.map((e) => (
              <div
                key={e.id}
                data-testid={`expense-row-${e.id}`}
                className="grid grid-cols-12 items-center px-6 py-4 border-b border-border/50 hover:bg-secondary/40 transition-colors group"
              >
                <div className="col-span-2 font-mono text-xs text-muted-foreground">{formatDate(e.date)}</div>
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  {e.receipt ? (
                    <button
                      data-testid={`expense-receipt-view-${e.id}`}
                      onClick={() => setPreviewReceipt(e.receipt)}
                      className="w-8 h-8 border border-border flex items-center justify-center hover:border-foreground"
                    >
                      <ImageIcon size={12} />
                    </button>
                  ) : (
                    <span className="w-1 h-8" style={{ background: colorForCategory(e.category) }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    {e.notes && <p className="text-[10px] text-muted-foreground truncate">{e.notes}</p>}
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] tracking-[0.2em] uppercase border border-border px-2 py-1 text-muted-foreground">
                    {e.category}
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono text-sm">{formatCurrency(e.amount)}</div>
                <div className="col-span-1 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    data-testid={`expense-edit-${e.id}`}
                    onClick={() => { setEditing(e); setDialogOpen(true); }}
                    className="p-2 border border-border hover:border-foreground"
                    aria-label="Edit expense"
                  >
                    <PencilSimple size={12} />
                  </button>
                  <button
                    data-testid={`expense-delete-${e.id}`}
                    onClick={() => setDeleteId(e.id)}
                    className="p-2 border border-border hover:border-loss text-muted-foreground hover:text-loss"
                    aria-label="Delete expense"
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-12 items-center px-6 py-4 bg-secondary/30 border-t border-border">
              <div className="col-span-9 text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                Filtered Total · {expenses.length} txns
              </div>
              <div className="col-span-3 text-right font-mono text-lg" data-testid="expenses-total">
                {formatCurrency(total)}
              </div>
            </div>
          </div>
        )}
      </div>

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        initial={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-none bg-card border-border" data-testid="delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The transaction will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none" data-testid="delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="delete-confirm"
              className="rounded-none bg-loss text-white hover:bg-loss/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewReceipt && (
        <div
          onClick={() => setPreviewReceipt(null)}
          data-testid="receipt-preview-overlay"
          className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-6 cursor-pointer"
        >
          <img src={previewReceipt} alt="Receipt" className="max-h-[80vh] border border-border" />
        </div>
      )}
    </div>
  );
}
