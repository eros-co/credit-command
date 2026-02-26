'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  CreditScoreEntry,
  Transaction,
  Expense,
  PurchaseDecision,
  InvestmentDecision,
  MonthlyReport,
  UserSettings,
} from './types';

interface AppActions {
  // Auth
  login: (password: string) => boolean;
  logout: () => void;

  // Settings
  updateSettings: (settings: Partial<UserSettings>) => void;

  // Credit Scores
  addCreditScore: (entry: CreditScoreEntry) => void;
  deleteCreditScore: (id: string) => void;

  // Transactions
  addTransactions: (txns: Transaction[]) => void;
  deleteTransaction: (id: string) => void;
  clearTransactions: () => void;

  // Expenses
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Purchase Decisions
  addPurchaseDecision: (decision: PurchaseDecision) => void;

  // Investment Decisions
  addInvestmentDecision: (decision: InvestmentDecision) => void;

  // Monthly Reports
  addMonthlyReport: (report: MonthlyReport) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthlyIncome: 30000,
  monthlyRent: 7500,
  creditLimit: 50000,
  creditCardBalance: 0,
  targetScore: 740,
  targetDate: '2026-08-31',
  name: 'User',
};

// Simple password - user can change in env
const SYSTEM_PASSWORD = 'credit2026';

export const useAppStore = create<AppState & AppActions>()(
  persist(
    (set, get) => ({
      // Initial state
      settings: DEFAULT_SETTINGS,
      creditScores: [],
      transactions: [],
      expenses: [],
      purchaseDecisions: [],
      investmentDecisions: [],
      monthlyReports: [],
      isAuthenticated: false,

      // Auth
      login: (password: string) => {
        const valid = password === SYSTEM_PASSWORD;
        if (valid) set({ isAuthenticated: true });
        return valid;
      },
      logout: () => set({ isAuthenticated: false }),

      // Settings
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      // Credit Scores
      addCreditScore: (entry) =>
        set((state) => ({
          creditScores: [...state.creditScores, entry].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          ),
        })),
      deleteCreditScore: (id) =>
        set((state) => ({
          creditScores: state.creditScores.filter((s) => s.id !== id),
        })),

      // Transactions
      addTransactions: (txns) =>
        set((state) => ({
          transactions: [...state.transactions, ...txns],
        })),
      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),
      clearTransactions: () => set({ transactions: [] }),

      // Expenses
      addExpense: (expense) =>
        set((state) => ({
          expenses: [...state.expenses, expense],
        })),
      updateExpense: (id, updates) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        })),

      // Purchase Decisions
      addPurchaseDecision: (decision) =>
        set((state) => ({
          purchaseDecisions: [decision, ...state.purchaseDecisions],
        })),

      // Investment Decisions
      addInvestmentDecision: (decision) =>
        set((state) => ({
          investmentDecisions: [decision, ...state.investmentDecisions],
        })),

      // Monthly Reports
      addMonthlyReport: (report) =>
        set((state) => ({
          monthlyReports: [report, ...state.monthlyReports],
        })),
    }),
    {
      name: 'credit-command-storage',
      partialize: (state) => ({
        settings: state.settings,
        creditScores: state.creditScores,
        transactions: state.transactions,
        expenses: state.expenses,
        purchaseDecisions: state.purchaseDecisions,
        investmentDecisions: state.investmentDecisions,
        monthlyReports: state.monthlyReports,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
