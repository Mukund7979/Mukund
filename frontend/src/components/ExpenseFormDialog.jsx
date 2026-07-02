import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarBlank, Image as ImageIcon, X } from "@phosphor-icons/react";
import { autoCategorize, createExpense, updateExpense } from "@/lib/api";
import { todayIso } from "@/lib/format";
import { toast } from "sonner";

export default function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  onSaved,
  initial = null,
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoCategorized, setAutoCategorized] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setDescription(initial.description || "");
        setAmount(String(initial.amount ?? ""));
        setCategory(initial.category || "Other");
        setDate(initial.date || todayIso());
        setNotes(initial.notes || "");
        setReceipt(initial.receipt || null);
      } else {
        setDescription("");
        setAmount("");
        setCategory("");
        setDate(todayIso());
        setNotes("");
        setReceipt(null);
      }
      setAutoCategorized(false);
    }
  }, [open, initial]);

  const handleDescriptionBlur = async () => {
    if (!description || category) return;
    try {
      const cat = await autoCategorize(description);
      setCategory(cat);
      setAutoCategorized(true);
    } catch (e) {
      // silent
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Receipt must be smaller than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => setReceipt(evt.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description required");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Amount must be a positive number");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: description.trim(),
        amount: amt,
        category: category || "Other",
        date,
        notes,
        receipt,
      };
      if (initial?.id) {
        await updateExpense(initial.id, payload);
        toast.success("Expense updated");
      } else {
        await createExpense(payload);
        toast.success("Expense added");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border rounded-none" data-testid="expense-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl tracking-tight">
            {initial ? "Edit Expense" : "New Expense"}
          </DialogTitle>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {initial ? "Update transaction" : "Log a new transaction"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="expense-description" className="text-xs tracking-widest uppercase text-muted-foreground">
              Description
            </Label>
            <Input
              id="expense-description"
              data-testid="expense-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="e.g. Uber ride, Starbucks coffee"
              className="rounded-none bg-transparent"
              required
            />
            {autoCategorized && category && (
              <p className="text-[10px] text-profit tracking-wider">Auto-categorized as {category}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expense-amount" className="text-xs tracking-widest uppercase text-muted-foreground">
                Amount ($)
              </Label>
              <Input
                id="expense-amount"
                data-testid="expense-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-none bg-transparent font-mono"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs tracking-widest uppercase text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="expense-date-trigger"
                    className="w-full rounded-none justify-start font-mono text-sm bg-transparent"
                  >
                    <CalendarBlank size={14} className="mr-2" />
                    {date}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-none bg-card border-border">
                  <Calendar
                    mode="single"
                    selected={new Date(date)}
                    onSelect={(d) => d && setDate(d.toISOString().slice(0, 10))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setAutoCategorized(false); }}>
              <SelectTrigger data-testid="expense-category-select" className="rounded-none bg-transparent">
                <SelectValue placeholder="Select or auto-detect" />
              </SelectTrigger>
              <SelectContent className="rounded-none bg-card border-border">
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="rounded-none">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-notes" className="text-xs tracking-widest uppercase text-muted-foreground">
              Notes (optional)
            </Label>
            <Textarea
              id="expense-notes"
              data-testid="expense-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-none bg-transparent resize-none"
              placeholder="Additional context"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs tracking-widest uppercase text-muted-foreground">Receipt (optional)</Label>
            {receipt ? (
              <div className="relative border border-border p-2">
                <img src={receipt} alt="Receipt" className="w-full h-32 object-contain" />
                <button
                  type="button"
                  data-testid="expense-receipt-remove"
                  onClick={() => setReceipt(null)}
                  className="absolute top-2 right-2 bg-background border border-border p-1 hover:border-foreground"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="expense-receipt-input"
                data-testid="expense-receipt-label"
                className="flex items-center justify-center gap-2 border border-dashed border-border p-4 cursor-pointer hover:border-foreground transition-colors text-xs tracking-widest uppercase text-muted-foreground"
              >
                <ImageIcon size={16} />
                Upload Receipt
                <input
                  id="expense-receipt-input"
                  data-testid="expense-receipt-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="expense-form-cancel"
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="expense-form-submit"
              className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving..." : initial ? "Update Expense" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
