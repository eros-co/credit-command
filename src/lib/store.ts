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
  TransactionCategory,
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

  // Automated Updates
  syncDashboardFromTransactions: () => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthlyIncome: 30000,
  monthlyRent: 7500,
  creditLimit: 50000,
  creditCardBalance: 0,
  savingsBalance: 0,
  debitBalance: 0,
  targetScore: 740,
  targetDate: '2026-08-31',
  name: 'User',
};

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
      addTransactions: (txns) => {
        set((state) => ({
          transactions: [...state.transactions, ...txns],
        }));
        get().syncDashboardFromTransactions();
      },
      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
        get().syncDashboardFromTransactions();
      },
      clearTransactions: () => {
        set({ transactions: [] });
        get().syncDashboardFromTransactions();
      },

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

      // Automated Updates from Transactions
      syncDashboardFromTransactions: () => {
        const { transactions, settings } = get();
        if (transactions.length === 0) return;

        // Detect subscriptions (recurring monthly debits)
        const counts: Record<string, { count: number; amount: number; category: TransactionCategory }> = {};
        transactions.forEach(t => {
          if (t.type === 'debit') {
            const key = t.description.toLowerCase().trim();
            if (!counts[key]) counts[key] = { count: 0, amount: 0, category: t.category };
            counts[key].count++;
            counts[key].amount = t.amount;
          }
        });

        const detectedExpenses: Expense[] = Object.entries(counts)
          .filter(([_, data]) => data.count >= 2) // Simple recurrence check
          .map(([desc, data]) => ({
            id: `auto-${desc}`,
            name: desc.charAt(0).toUpperCase() + desc.slice(1),
            amount: data.amount,
            category: data.category,
            frequency: 'monthly',
            isSubscription: data.category === 'subscriptions',
            startDate: new Date().toISOString(),
          }));

        // Update balances (simplified logic: take latest statement balance if we had it, 
        // but for now we aggregate from txns if source is provided)
        // Note: In a real app we'd track per-account balances.
        
        set({ expenses: detectedExpenses });
      }
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
