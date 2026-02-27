import { useAppStore } from './store';
import type { Transaction, TransactionCategory } from './types';

export interface ParsedStatement {
  statementType: 'current_account' | 'credit_card' | 'savings_account';
  accountNumber: string;
  closingBalance: number;
  creditLimit?: number;
  transactions: {
    date: string;
    description: string;
    amount: number;
    type: 'debit' | 'credit';
    category: string;
    isSubscription?: boolean;
  }[];
}

/**
 * Maps external category strings to our internal TransactionCategory type.
 */
function mapCategory(cat: string): TransactionCategory {
  const c = cat.toLowerCase();
  if (c.includes('housing') || c.includes('rent')) return 'housing';
  if (c.includes('utilit')) return 'utilities';
  if (c.includes('grocer')) return 'groceries';
  if (c.includes('transport') || c.includes('uber') || c.includes('bolt')) return 'transport';
  if (c.includes('entertain')) return 'entertainment';
  if (c.includes('dining') || c.includes('food')) return 'dining';
  if (c.includes('shop')) return 'shopping';
  if (c.includes('health') || c.includes('medic')) return 'health';
  if (c.includes('insur')) return 'insurance';
  if (c.includes('subscrip')) return 'subscriptions';
  if (c.includes('savings')) return 'savings';
  if (c.includes('invest')) return 'investments';
  if (c.includes('debt') || c.includes('loan')) return 'debt_payment';
  if (c.includes('income') || c.includes('salary')) return 'income';
  if (c.includes('transfer')) return 'transfer';
  if (c.includes('charge') || c.includes('fee')) return 'bank_charges';
  if (c.includes('fuel')) return 'fuel';
  if (c.includes('mobile') || c.includes('data')) return 'mobile_data';
  return 'other';
}

/**
 * Syncs a parsed statement's data into the global app state.
 */
export function syncStatementToStore(parsed: ParsedStatement) {
  const store = useAppStore.getState();
  
  // 1. Update account-specific balances in settings
  const balanceUpdates: any = {};
  if (parsed.statementType === 'current_account') {
    balanceUpdates.debitBalance = parsed.closingBalance;
  } else if (parsed.statementType === 'credit_card') {
    balanceUpdates.creditCardBalance = Math.abs(parsed.closingBalance); // Credit balances are often negative in statements
    if (parsed.creditLimit) balanceUpdates.creditLimit = parsed.creditLimit;
  } else if (parsed.statementType === 'savings_account') {
    balanceUpdates.savingsBalance = parsed.closingBalance;
  }
  
  store.updateSettings(balanceUpdates);

  // 2. Map and add transactions
  const newTransactions: Transaction[] = parsed.transactions.map((tx, idx) => ({
    id: `tx-${parsed.accountNumber}-${Date.now()}-${idx}`,
    date: tx.date.includes('-') ? tx.date : new Date().toISOString().split('T')[0], // Ensure YYYY-MM-DD
    description: tx.description,
    amount: tx.amount,
    category: mapCategory(tx.category),
    type: tx.type,
    source: parsed.statementType === 'credit_card' ? 'credit_card' : 
            parsed.statementType === 'savings_account' ? 'savings' : 'bank',
    accountNumber: parsed.accountNumber,
    isSubscription: tx.isSubscription || tx.category.toLowerCase().includes('subscription'),
  }));

  store.addTransactions(newTransactions);
}
