import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const fetchCategories = () => api.get("/categories").then((r) => r.data.categories);
export const autoCategorize = (description) =>
  api.post("/categorize", { description }).then((r) => r.data.category);

export const listExpenses = (params = {}) =>
  api.get("/expenses", { params }).then((r) => r.data);
export const createExpense = (data) => api.post("/expenses", data).then((r) => r.data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data).then((r) => r.data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`).then((r) => r.data);

export const listBudgets = () => api.get("/budgets").then((r) => r.data);
export const createBudget = (data) => api.post("/budgets", data).then((r) => r.data);
export const updateBudget = (id, data) => api.put(`/budgets/${id}`, data).then((r) => r.data);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`).then((r) => r.data);

export const getSummary = (month) =>
  api.get("/dashboard/summary", { params: month ? { month } : {} }).then((r) => r.data);

export const exportCsvUrl = () => `${API}/expenses/export/csv`;
