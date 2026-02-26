# Test Notes

## Login Page
- Works correctly - clean dark theme with shield icon
- Password field with show/hide toggle
- "CreditCommand" branding with "Private Financial Intelligence System" subtitle

## Dashboard
- All 4 metric cards render: Credit Score, Utilisation, Monthly Spending, Health Rating
- Credit Score Trend chart placeholder shows correctly
- Score Projections panel shows correctly
- Secondary metrics (Credit vs Cash, Subscriptions, Income, Rent) render
- Quick Insights section renders
- Sidebar navigation works with all 8 pages listed
- Sign Out button present

## Issues to fix
- Health rating shows "CRITICAL" when no score is entered (should show N/A or similar)
- Predictions show 300 when no score entered (should handle 0 score case)
