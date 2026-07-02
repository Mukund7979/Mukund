export const formatCurrency = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "₹0.00";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}₹${abs.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const CATEGORY_COLORS = {
  "Food & Dining": "hsl(38 92% 50%)",
  "Transport": "hsl(200 90% 55%)",
  "Shopping": "hsl(280 70% 60%)",
  "Groceries": "hsl(142 71% 45%)",
  "Entertainment": "hsl(320 70% 60%)",
  "Utilities": "hsl(180 65% 50%)",
  "Health": "hsl(348 83% 55%)",
  "Rent & Housing": "hsl(24 90% 55%)",
  "Travel": "hsl(220 80% 60%)",
  "Education": "hsl(260 70% 60%)",
  "Subscriptions": "hsl(160 60% 50%)",
  "Other": "hsl(0 0% 55%)",
};

export const colorForCategory = (cat) => CATEGORY_COLORS[cat] || "hsl(0 0% 65%)";
