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
        const { transactions } = get();
        if (transactions.length === 0) return;

        // With AI parsing running once a month, we trust the 'isSubscription' flag 
        // set by the manus statement processor rather than relying on multiple occurrences.
        const detectedExpenses: Expense[] = transactions
          .filter((t) => t.isSubscription && t.type === 'debit')
          // Deduplicate by description if multiple statements are uploaded over time
          .reduce((acc, t) => {
             const key = t.description.toLowerCase().trim();
             if (!acc.some(e => e.name.toLowerCase() === key)) {
               acc.push({
                 id: `auto-${key}-${t.id}`,
                 name: t.description.charAt(0).toUpperCase() + t.description.slice(1),
                 amount: t.amount,
                 category: t.category,
                 frequency: 'monthly',
                 isSubscription: true,
                 startDate: t.date,
               });
             }
             return acc;
          }, [] as Expense[]);

        set({ expenses: detectedExpenses });
      }
    }),
    {
      name: 'credit-command-storage',
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        settings: {
          ...currentState.settings,
          ...(persistedState?.settings || {}),
        },
        creditScores: persistedState?.creditScores || currentState.creditScores,
        transactions: persistedState?.transactions || currentState.transactions,
        expenses: persistedState?.expenses || currentState.expenses,
        purchaseDecisions: persistedState?.purchaseDecisions || currentState.purchaseDecisions,
        investmentDecisions: persistedState?.investmentDecisions || currentState.investmentDecisions,
        monthlyReports: persistedState?.monthlyReports || currentState.monthlyReports,
      }),
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
