# CreditCommand — Private Financial Intelligence System

A private, full-stack web application designed to continuously optimise financial behaviour for the South African credit system. Built with Next.js 16, Tailwind CSS 4, and Bun.

## Features

- **Central Dashboard** — Real-time financial health overview with credit score trends, utilisation monitoring, and score projections
- **Credit Score Tracker** — Track scores across Experian, TransUnion, and XDS bureaus with trend analysis
- **Statement Analysis** — Upload CSV statements or add transactions manually; automatic categorisation and spending analysis
- **Expense & Subscription Manager** — Track recurring expenses with intelligent optimisation insights
- **Purchase Decision Advisor** — AI-powered purchase recommendations based on credit impact analysis
- **Investment Decision Advisor** — Evaluate investments against credit optimisation goals
- **Monthly AI Report** — Comprehensive financial intelligence briefing with risk factors, smart moves, and credit trajectory
- **Settings** — Configure income, rent, credit limits, and financial goals

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **State**: Zustand (persistent localStorage)
- **Language**: TypeScript
- **Deployment**: Vercel

## Access

Default access code: `credit2026`

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Deployment

Automatically deployed via Vercel on push to `main`.
