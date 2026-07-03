import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import Dashboard from "@/pages/Dashboard";
import Expenses from "@/pages/Expenses";
import Budgets from "@/pages/Budgets";
import Insights from "@/pages/Insights";

const TOAST_OPTIONS = {
  style: {
    background: "hsl(0 0% 7%)",
    border: "1px solid hsl(240 4% 16%)",
    borderRadius: 0,
    color: "hsl(0 0% 98%)",
    fontFamily: "Manrope, sans-serif",
  },
};

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-background text-foreground grain-overlay">
      <Sidebar />
      <main className="md:pl-60 pb-24 md:pb-0">
        <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-8 md:py-12">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </Shell>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={TOAST_OPTIONS}
      />
    </BrowserRouter>
  );
}

export default App;
