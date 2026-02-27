/**
 * FNB Private Wealth Statement Parser
 * Handles two statement types:
 * 1. FNB Private Wealth Current Account (cheque account)
 * 2. FNB Private Wealth Credit Card
 */

export interface ParsedTransaction {
  date: string;          // ISO date string YYYY-MM-DD
  description: string;   // cleaned merchant/description
  amount: number;        // positive = debit (money out), negative = credit (money in)
  balance?: number;      // running balance after transaction
  type: 'debit' | 'credit';
  category: string;      // auto-categorised
  rawDescription: string;
}

export interface ParsedStatement {
  statementType: 'current_account' | 'credit_card';
  accountNumber: string;
  statementNumber: string;
  statementDate: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  closingBalance: number;
  creditLimit?: number;       // credit card only
  availableBalance?: number;  // credit card only
  totalDebits: number;
  totalCredits: number;
  transactions: ParsedTransaction[];
  rawText: string;
}

// ─── Category Rules ───────────────────────────────────────────────────────────
const CATEGORY_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /uber|bolt|didi|taxify/i, category: 'Transport' },
  { pattern: /kfc|mcdonald|nandos|steers|burger|spur|wimpy|debonairs|pizza|restaurant|cafe|coffee|starbucks|mugg|bean|hudsons|ts tatso|drama|checkers deli|woolworths food|pick n pay|pnp|spar|food|eat|kitchen|grill|braai/i, category: 'Food & Dining' },
  { pattern: /checkers|woolworths|pick n pay|pnp|spar|makro|game|shoprite|dischem|clicks|pharmacy|grocery|supermarket/i, category: 'Groceries' },
  { pattern: /netflix|spotify|apple\.com|google.*workspace|figma|vercel|framer|claude|chatgpt|openai|adobe|canva|notion|slack|zoom|microsoft|dropbox|github|subscription/i, category: 'Subscriptions' },
  { pattern: /airbnb|hotel|accommodation|lodge|guesthouse|booking\.com|expedia/i, category: 'Travel & Accommodation' },
  { pattern: /engen|sasol|shell|total|caltex|bp|petrol|fuel/i, category: 'Fuel' },
  { pattern: /paypal|exness|psp\*exness|trading|forex|luno|crypto/i, category: 'Investments & Trading' },
  { pattern: /finchoice|fasta|loan|credit|debicheck|edo collection/i, category: 'Loan Repayments' },
  { pattern: /fnb app transfer|magtape credit|payshap|capitec|absa|standard bank|nedbank|transfer/i, category: 'Transfers' },
  { pattern: /fnb app payment|payment to/i, category: 'Payments' },
  { pattern: /atm cash|cash withdrawal/i, category: 'Cash' },
  { pattern: /internet pmt|internet payment/i, category: 'Online Payments' },
  { pattern: /vodacom|mtn|telkom|cell c|airtime|data|1sa data|1sa airtime/i, category: 'Mobile & Data' },
  { pattern: /1sa work|vodsgc|vodsv|vods/i, category: 'Work / Vodacom' },
  { pattern: /bank charge|service fee|monthly fee|admin fee|interest/i, category: 'Bank Charges' },
  { pattern: /salary|payroll|income|wages/i, category: 'Income' },
];

function categorise(description: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.category;
  }
  return 'Other';
}

// ─── Amount parser ─────────────────────────────────────────────────────────────
function parseAmount(raw: string): number {
  // Remove spaces, handle "Cr" suffix (credit = negative debit)
  const cleaned = raw.replace(/\s/g, '').replace(/,/g, '');
  const isCr = /Cr$/i.test(cleaned);
  const num = parseFloat(cleaned.replace(/Cr$/i, '').replace(/Dr$/i, ''));
  if (isNaN(num)) return 0;
  return isCr ? -num : num;
}

// ─── Date parser ───────────────────────────────────────────────────────────────
const MONTH_MAP: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function parseDate(dayMonth: string, statementYear: number, statementMonth: number): string {
  // e.g. "23 Dec" or "05 Jan"
  const parts = dayMonth.trim().split(/\s+/);
  if (parts.length < 2) return '';
  const day = parts[0].padStart(2, '0');
  const monthStr = parts[1];
  const month = MONTH_MAP[monthStr];
  if (!month) return '';
  // Determine year: if statement month is Jan and transaction is Dec, it's previous year
  let year = statementYear;
  const txMonth = parseInt(month, 10);
  if (statementMonth === 1 && txMonth === 12) year = statementYear - 1;
  if (statementMonth === 12 && txMonth === 1) year = statementYear + 1;
  return `${year}-${month}-${day}`;
}

// ─── Current Account Parser ────────────────────────────────────────────────────
export function parseCurrentAccountStatement(text: string): ParsedStatement {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract metadata
  const accountMatch = text.match(/FNB Private Wealth Current Account\s*:\s*(\d+)/i);
  const accountNumber = accountMatch?.[1] ?? '';

  const stmtNumMatch = text.match(/Tax Invoice\/Statement Number\s*:\s*(\d+)/i);
  const statementNumber = stmtNumMatch?.[1] ?? '';

  const periodMatch = text.match(/Statement Period\s*:\s*(\d+ \w+ \d{4}) to (\d+ \w+ \d{4})/i);
  const periodStart = periodMatch ? formatDateFromLong(periodMatch[1]) : '';
  const periodEnd = periodMatch ? formatDateFromLong(periodMatch[2]) : '';

  const stmtDateMatch = text.match(/Statement Date\s*:\s*(\d+ \w+ \d{4})/i);
  const statementDate = stmtDateMatch ? formatDateFromLong(stmtDateMatch[1]) : '';

  // Extract statement year and month from period end
  const endDateParts = periodEnd.split('-');
  const stmtYear = parseInt(endDateParts[0] ?? '2026', 10);
  const stmtMonth = parseInt(endDateParts[1] ?? '1', 10);

  // Extract balances — look for the balance section
  const openBalMatch = text.match(/Opening Balance[\s\S]{0,200}?([\d,]+\.\d{2}\s*(?:Cr|Dr)?)/i);
  const closeBalMatch = text.match(/Closing Balance[\s\S]{0,200}?([\d,]+\.\d{2}\s*(?:Cr|Dr)?)/i);
  const openingBalance = openBalMatch ? parseAmount(openBalMatch[1]) : 0;
  const closingBalance = closeBalMatch ? parseAmount(closeBalMatch[1]) : 0;

  // ─── Transaction extraction ───────────────────────────────────────────────
  // The current account format has transactions in groups of 4 lines:
  // Line 1: "DD Mon Description..."
  // Line 2: "Reference/card number DD Mon"
  // Line 3: Amount
  // Line 4: Balance
  // But pdftotext splits them oddly. We use a regex approach on the full text.

  const transactions: ParsedTransaction[] = [];

  // Find the transaction section(s)
  const txSectionRegex = /Transactions in RAND \(ZAR\)([\s\S]*?)(?:Page \d+ of \d+|First National Bank|$)/gi;
  let sectionMatch;

  while ((sectionMatch = txSectionRegex.exec(text)) !== null) {
    const section = sectionMatch[1];
    // Each transaction starts with a date pattern: "DD Mon" or "DD Mon Description"
    // We'll extract all lines and process them in sequence
    const txLines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Skip header lines
    const startIdx = txLines.findIndex(l => /^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(l));
    if (startIdx === -1) continue;

    let i = startIdx;
    while (i < txLines.length) {
      const line = txLines[i];

      // Check if this line starts a transaction
      const dateMatch = line.match(/^(\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\s*(.*)/i);
      if (!dateMatch) { i++; continue; }

      const dateStr = dateMatch[1];
      let description = dateMatch[2].trim();

      // Next non-date line might be a continuation of description or a reference
      i++;
      // Collect description lines until we hit an amount
      while (i < txLines.length) {
        const next = txLines[i];
        // If it looks like an amount (digits, commas, optional Cr/Dr)
        if (/^[\d,]+\.\d{2}\s*(Cr|Dr)?$/.test(next)) break;
        // If it's another date line, stop
        if (/^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(next)) break;
        // Otherwise it's part of description or reference
        if (description && !description.includes(next)) {
          description += ' ' + next;
        }
        i++;
      }

      // Now read amount
      if (i >= txLines.length) break;
      const amountLine = txLines[i];
      if (!/^[\d,]+\.\d{2}\s*(Cr|Dr)?$/.test(amountLine)) { continue; }
      const amount = parseAmount(amountLine);
      i++;

      // Read balance (optional)
      let balance: number | undefined;
      if (i < txLines.length && /^[\d,]+\.\d{2}\s*(Cr|Dr)?$/.test(txLines[i])) {
        balance = parseAmount(txLines[i]);
        i++;
      }

      const isoDate = parseDate(dateStr, stmtYear, stmtMonth);
      const cleanDesc = cleanDescription(description);

      transactions.push({
        date: isoDate,
        description: cleanDesc,
        amount,
        balance,
        type: amount >= 0 ? 'debit' : 'credit',
        category: categorise(cleanDesc),
        rawDescription: description,
      });
    }
  }

  const totalDebits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    statementType: 'current_account',
    accountNumber,
    statementNumber,
    statementDate,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    totalDebits,
    totalCredits,
    transactions,
    rawText: text,
  };
}

// ─── Credit Card Parser ────────────────────────────────────────────────────────
export function parseCreditCardStatement(text: string): ParsedStatement {
  // Extract metadata
  const accountMatch = text.match(/FNB PRIVATE WEALTH CREDIT CARD\s+([\d\s]+)/i);
  const accountNumber = accountMatch ? accountMatch[1].replace(/\s/g, '') : '';

  const stmtNumMatch = text.match(/Statement No\.\s*:\s*(\d+)/i);
  const statementNumber = stmtNumMatch?.[1] ?? '';

  const stmtDateMatch = text.match(/Statement Date\s+(\d{2}\s+\w+\s+\d{4})/i);
  const statementDate = stmtDateMatch ? formatDateFromLong(stmtDateMatch[1]) : '';

  const dueDateMatch = text.match(/Payment Due Date\s+(\d{2}\s+\w+\s+\d{4})/i);
  const dueDate = dueDateMatch ? formatDateFromLong(dueDateMatch[1]) : '';

  // Derive period from statement date (credit card: previous month's 6th to this month's 5th)
  const stmtDateParts = statementDate.split('-');
  const stmtYear = parseInt(stmtDateParts[0] ?? '2026', 10);
  const stmtMonth = parseInt(stmtDateParts[1] ?? '1', 10);

  // Extract balances
  const openBalMatch = text.match(/Opening Balance[\s\S]{0,100}?([\d ,]+\.\d{2})/i);
  const closeBalMatch = text.match(/Closing Balance[\s\S]{0,100}?([\d ,]+\.\d{2})/i);
  const limitMatch = text.match(/Facility[\s\S]{0,20}?([\d ,]+\.\d{2})/i);
  const availMatch = text.match(/Available Balance[\s\S]{0,20}?([\d ,]+\.\d{2})/i);

  const openingBalance = openBalMatch ? parseFloat(openBalMatch[1].replace(/\s/g, '').replace(',', '')) : 0;
  const closingBalance = closeBalMatch ? parseFloat(closeBalMatch[1].replace(/\s/g, '').replace(',', '')) : 0;
  const creditLimit = limitMatch ? parseFloat(limitMatch[1].replace(/\s/g, '').replace(',', '')) : 30000;
  const availableBalance = availMatch ? parseFloat(availMatch[1].replace(/\s/g, '').replace(',', '')) : 0;

  // ─── Credit card transaction extraction ───────────────────────────────────
  // The credit card PDF has columns split across lines:
  // Column 1: Transaction dates (all dates listed together)
  // Column 2: Descriptions (all descriptions listed together)
  // Column 3: Reference codes (Vods...)
  // Column 4: Short codes (3 chars)
  // Column 5: Amounts (all amounts listed together)
  // We need to correlate them by position.

  const transactions: ParsedTransaction[] = [];

  // Find the transaction section (Page 2)
  const page2Match = text.match(/Page 2 of 2([\s\S]*?)(?:First National Bank|$)/i);
  if (!page2Match) {
    return {
      statementType: 'credit_card',
      accountNumber,
      statementNumber,
      statementDate,
      periodStart: '',
      periodEnd: statementDate,
      openingBalance,
      closingBalance,
      creditLimit,
      availableBalance,
      totalDebits: 0,
      totalCredits: 0,
      transactions: [],
      rawText: text,
    };
  }

  const section = page2Match[1];
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract dates column: lines matching "DD Mon"
  const dateLines: string[] = [];
  const descLines: string[] = [];
  const amountLines: string[] = [];
  const creditLines: string[] = [];

  // Separate the columns
  // Dates: "06 Dec", "08 Dec", etc.
  // Descriptions: "1sa Work", "1sa Data ...", etc.
  // Amounts: "1 000.00", "429.00", etc.
  // Credits: "7 000.00Cr", "5 000.00Cr", etc.

  let inDates = false;
  let inDescs = false;
  let inAmounts = false;
  let inCredits = false;
  let cardTotalFound = false;

  // The structure is:
  // Opening Balance line
  // Card No. line
  // [dates block] - lines matching DD Mon
  // [descriptions block] - lines starting with "1sa"
  // [reference block] - lines starting with "Vods"
  // [code block] - 3-char codes
  // "Card Total" line
  // [footer dates] - dates for interest/payments
  // [footer descs] - Interest, 1sa Credit etc.
  // [footer refs] - Vods...
  // [footer codes]
  // [amounts block] - all transaction amounts
  // [footer amounts] - interest + credit amounts

  // Simpler approach: extract all date-like lines, all description-like lines, all amount-like lines
  const allDateLines: string[] = [];
  const allDescLines: string[] = [];
  const allAmountLines: string[] = [];

  for (const line of lines) {
    if (/^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(line)) {
      allDateLines.push(line);
    } else if (/^1sa\s+/i.test(line) || /^Interest$/i.test(line)) {
      allDescLines.push(line);
    } else if (/^[\d ]+\.\d{2}(Cr)?$/.test(line.replace(/\s/g, '').replace(',', ''))) {
      // Amount line: "1 000.00" or "7 000.00Cr"
      const cleaned = line.replace(/\s/g, '');
      if (/^\d+\.\d{2}(Cr)?$/.test(cleaned)) {
        allAmountLines.push(line);
      }
    }
  }

  // The credit card PDF has all dates in one block, all descriptions in another, all amounts in another.
  // We match them positionally: date[i] + desc[i] + amount[i]
  // But the footer (interest + payments) has different structure.
  // Find "Card Total" to split main transactions from footer
  const cardTotalIdx = lines.findIndex(l => /^Card Total$/i.test(l));

  // Main transaction dates are before "Card Total"
  // Footer dates are after "Card Total"

  // Re-extract with position awareness
  const mainDates: string[] = [];
  const mainDescs: string[] = [];
  const mainAmounts: string[] = [];
  const footerDates: string[] = [];
  const footerDescs: string[] = [];
  const footerAmounts: string[] = [];

  let passedCardTotal = false;
  let passedOpeningBalance = false;
  let inMainDatesBlock = false;
  let inMainDescsBlock = false;
  let inMainAmountsBlock = false;
  let inFooterDatesBlock = false;
  let inFooterDescsBlock = false;
  let inFooterAmountsBlock = false;

  // Scan through lines sequentially
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/Opening Balance/i.test(line)) { passedOpeningBalance = true; continue; }
    if (/^Card No\./i.test(line)) { inMainDatesBlock = true; continue; }
    if (/^Card Total$/i.test(line)) {
      passedCardTotal = true;
      inMainDatesBlock = false;
      inMainDescsBlock = false;
      inFooterDatesBlock = true;
      continue;
    }
    if (/^Closing Balance$/i.test(line)) {
      inFooterAmountsBlock = false;
      continue;
    }

    if (!passedCardTotal) {
      // Main transaction area
      if (inMainDatesBlock && /^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(line)) {
        mainDates.push(line);
      } else if (inMainDatesBlock && mainDates.length > 0 && !/^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(line)) {
        // Switched to descriptions
        inMainDatesBlock = false;
        inMainDescsBlock = true;
      }

      if (inMainDescsBlock && /^1sa\s+/i.test(line)) {
        mainDescs.push(line);
      } else if (inMainDescsBlock && mainDescs.length > 0 && !/^1sa\s+/i.test(line) && !/^Vods/i.test(line)) {
        // Could be switching to refs or something else
      }
    } else {
      // Footer area
      if (inFooterDatesBlock && /^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(line)) {
        footerDates.push(line);
      } else if (inFooterDatesBlock && footerDates.length > 0 && !/^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(line)) {
        inFooterDatesBlock = false;
        inFooterDescsBlock = true;
      }

      if (inFooterDescsBlock && (/^Interest$/i.test(line) || /^1sa\s+/i.test(line))) {
        footerDescs.push(line);
      }

      // Amounts come after the Vods references in footer
      if (/^[\d ]+\.\d{2}(Cr)?$/.test(line.replace(/\s/g, ''))) {
        footerAmounts.push(line);
      }
    }
  }

  // Extract main amounts — they appear after all the Vods/code blocks
  // Find the block of amounts after the last Vods code
  const vodsLastIdx = lines.map((l, i) => /^Vods/i.test(l) ? i : -1).filter(i => i >= 0).pop() ?? 0;
  // But we need to find the main amounts block (before Card Total footer amounts)
  // Actually all amounts appear together in a block after the codes
  // Let's find them between the last code block and "Card Total"

  // Better approach: find all amount-like lines in the section
  // Main amounts: appear in a contiguous block after the Vods/code section
  // They end with "Card Total" amount (sum)

  // Re-scan for amounts
  let inAmountsSection = false;
  const allAmounts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleaned = line.replace(/\s/g, '');

    if (/^[\d]+\.\d{2}(Cr)?$/.test(cleaned) || /^[\d]{1,3}([\d]{3})*\.\d{2}(Cr)?$/.test(cleaned)) {
      allAmounts.push(line);
    }
  }

  // The structure: main transaction amounts first, then "Card Total" (sum), then footer amounts
  // Find Card Total value
  const cardTotalLine = lines.find(l => {
    const prev = lines[lines.indexOf(l) - 1];
    return prev && /^Card Total$/i.test(prev);
  });

  // Split amounts: find the index where the running total appears
  // The total of main transactions = sum of individual amounts
  // We'll use the fact that the last amount before footer is the card total
  // Footer amounts: interest + credit payments

  // Simpler: use the count of dates to determine how many main amounts there are
  const mainTxCount = mainDates.length;

  // Re-extract dates and descriptions more reliably using the full text structure
  // The credit card PDF columns are:
  // 1. Dates block (all transaction dates)
  // 2. Description block (all "1sa Work" etc.)
  // 3. Reference block (all "Vods...")
  // 4. Code block (all 3-char codes like "8JP")
  // Then "Card Total"
  // 5. Footer dates
  // 6. Footer descriptions (Interest, 1sa Credit, etc.)
  // 7. Footer references
  // 8. Footer codes
  // 9. Amounts block (main tx amounts + card total + footer amounts)

  // Extract dates more carefully
  const txDates: string[] = [];
  const txDescs: string[] = [];
  const txAmounts: string[] = [];
  const txTypes: ('debit' | 'credit')[] = [];

  // Find the date block: consecutive "DD Mon" lines after "Card No."
  const cardNoIdx = lines.findIndex(l => /^Card No\./i.test(l));
  if (cardNoIdx >= 0) {
    let j = cardNoIdx + 1;
    while (j < lines.length && /^\d{2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(lines[j])) {
      txDates.push(lines[j]);
      j++;
    }
  }

  // Find description block: consecutive "1sa ..." lines
  const firstDescIdx = lines.findIndex(l => /^1sa\s+/i.test(l));
  if (firstDescIdx >= 0) {
    let j = firstDescIdx;
    while (j < lines.length && /^1sa\s+/i.test(lines[j])) {
      txDescs.push(lines[j]);
      j++;
    }
  }

  // Find amounts block: after the last code block, before "Closing Balance"
  // Codes are 3-char uppercase like "8JP", "QMP" etc.
  const lastCodeIdx = lines.map((l, i) => /^[A-Z0-9]{3}$/.test(l) ? i : -1).filter(i => i >= 0).pop() ?? 0;
  const closingBalIdx = lines.findIndex(l => /^Closing Balance$/i.test(l));

  if (lastCodeIdx > 0) {
    let j = lastCodeIdx + 1;
    while (j < lines.length) {
      const l = lines[j];
      if (/^Closing Balance$/i.test(l)) break;
      const cleaned = l.replace(/\s/g, '');
      if (/^\d+\.\d{2}(Cr)?$/.test(cleaned)) {
        txAmounts.push(l);
      }
      j++;
    }
  }

  // Now build transactions: match dates[i] + descs[i] + amounts[i]
  // The amounts include: main tx amounts + card total + interest + payment credits
  // Main tx count = txDates.length
  // Footer tx count = footerDates.length (interest + credits)

  // Separate main amounts from footer amounts
  // Main amounts: first txDates.length entries
  // Then card total (1 entry)
  // Then footer amounts: footerDates.length entries

  const mainAmountValues = txAmounts.slice(0, txDates.length);
  // footer amounts are after card total
  const footerAmountValues = txAmounts.slice(txDates.length + 1); // skip card total

  // Build main transactions
  for (let i = 0; i < txDates.length; i++) {
    const dateStr = txDates[i] ?? '';
    const desc = txDescs[i] ?? 'Unknown';
    const amtStr = mainAmountValues[i] ?? '0.00';

    const isoDate = parseDate(dateStr, stmtYear, stmtMonth);
    const amount = parseFloat(amtStr.replace(/\s/g, '').replace(/Cr$/i, ''));
    const cleanDesc = cleanDescription(desc);

    transactions.push({
      date: isoDate,
      description: cleanDesc,
      amount,
      type: 'debit',
      category: categorise(cleanDesc),
      rawDescription: desc,
    });
  }

  // Build footer transactions (interest + payments)
  const footerDescLines = lines.filter((l, i) => {
    if (i <= (cardTotalIdx ?? 0)) return false;
    return /^Interest$/i.test(l) || /^1sa\s+(Credit|Work)/i.test(l);
  });

  for (let i = 0; i < footerDescLines.length; i++) {
    const desc = footerDescLines[i];
    const amtStr = footerAmountValues[i] ?? '0.00';
    const dateStr = footerDates[i] ?? txDates[txDates.length - 1] ?? '';

    const isoDate = parseDate(dateStr, stmtYear, stmtMonth);
    const cleaned = amtStr.replace(/\s/g, '');
    const isCr = /Cr$/i.test(cleaned);
    const amount = parseFloat(cleaned.replace(/Cr$/i, ''));
    const cleanDesc = cleanDescription(desc);

    transactions.push({
      date: isoDate,
      description: cleanDesc,
      amount: isCr ? -amount : amount,
      type: isCr ? 'credit' : 'debit',
      category: isCr ? 'Payments' : 'Bank Charges',
      rawDescription: desc,
    });
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  const totalDebits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    statementType: 'credit_card',
    accountNumber,
    statementNumber,
    statementDate,
    periodStart: '',
    periodEnd: statementDate,
    openingBalance,
    closingBalance,
    creditLimit,
    availableBalance,
    totalDebits,
    totalCredits,
    transactions,
    rawText: text,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDateFromLong(dateStr: string): string {
  // "23 December 2025" or "23 Jan 2026" or "05 Feb 2026"
  const months: Record<string, string> = {
    January: '01', February: '02', March: '03', April: '04', May: '05', June: '06',
    July: '07', August: '08', September: '09', October: '10', November: '11', December: '12',
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', Jun: '06', Jul: '07',
    Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length < 3) return '';
  const day = parts[0].padStart(2, '0');
  const month = months[parts[1]] ?? '01';
  const year = parts[2];
  return `${year}-${month}-${day}`;
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\d{6}\*\d{4}\s+\d{2}\s+\w{3}/g, '') // Remove card ref + date
    .replace(/\d{6}\*\d{4}/g, '')                   // Remove card ref
    .replace(/\s{2,}/g, ' ')
    .replace(/^(POS Purchase|Magtape Credit|Magtape Debit|FNB App Transfer|FNB App Payment|Internet Pmt To|Paypal Withdrawal|Payshap Credit|DebiCheck|ATM Cash|Edo Collection Attempt)\s*/i, '$1 ')
    .trim();
}

// ─── Auto-detect and parse ─────────────────────────────────────────────────────
export function detectAndParse(text: string): ParsedStatement {
  if (/FNB PRIVATE WEALTH CREDIT CARD/i.test(text)) {
    return parseCreditCardStatement(text);
  }
  return parseCurrentAccountStatement(text);
}
