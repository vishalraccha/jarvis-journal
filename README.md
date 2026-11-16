# Jarvis Journal (JJ) — Professional Trading Terminal & Journal

A high-performance, dark-themed trading journal and performance terminal inspired by TradeZella, engineered with original Jarvis branding, accurate financial mathematics, Lightweight Charts, and Supabase PostgreSQL with strict Row Level Security.

---

## 🚀 Key Modules & Capabilities

1. **Dashboard & Performance Calendar**
   - **Top 10 Trading Terminal KPIs**: Net P&L, Gross P&L, Win Rate, Total Trades, Profit Factor, Average Win, Average Loss, Average R-Multiple, Maximum Drawdown, Expectancy.
   - **Monthly Performance Calendar**: Visual profit/loss heat map by day, trade count, monthly summary badge, and 1-click drilldown into Day Journals.
   - **Recharts Analytics Grid**: Cumulative P&L curve, Daily P&L histogram, Performance by Instrument, and Performance by Weekday.

2. **Trade Log (DAY | WEEK | ALL)**
   - **DAY View**: Chronological breakdown by date, expandable execution lists, and win/loss statistics.
   - **WEEK View**: Weekly P&L cards, daily performance tiles, and expandable trade lists.
   - **ALL View**: Sortable and filterable data table with symbol search, direction filters, status filters, CSV export, and bulk trade deletion with confirmation.
   - **Trade Detail Modal**: Lightweight Charts candlestick chart showing trade entry, exit, stop loss, and take profit price lines, MAE (Maximum Adverse Excursion), MFE (Maximum Favorable Excursion), and trader psychology reflections.

3. **10-Step Daily Journaling Notebook**
   - Built-in TradeZella-style 10-point daily review template:
     1. Market overview & macro context
     2. Today's trading plan & bias
     3. Key support, resistance & liquidity levels
     4. Expected market direction & triggers
     5. Trading setups monitored
     6. Executed trades summary
     7. Mistakes made & rule adherence
     8. Emotional state & mental psychology
     9. Lessons learned
     10. Tomorrow's actionable improvements
   - Mood tracker (Calm, Neutral, Frustrated) and direct Supabase persistence.

4. **Advanced Trading Analytics**
   - Hourly Heatmaps (identifying most profitable execution hours).
   - Weekday performance distribution (Monday through Friday edge).
   - Playbook strategy comparison table.
   - Market session breakdowns (New York, London, Asian, Overlap).
   - Mistake cost leakage analyzer (calculates total capital lost due to recurring psychological mistakes).
   - MAE vs MFE scatter plot.

5. **Executive Reports & Audit Statements**
   - Monthly, weekly, and daily statements.
   - CSV export and print-ready CSS layout (`window.print()`).

6. **Strategy Playbook Manager**
   - Define custom strategies with entry rules, exit conditions, and stop loss protocols.
   - Automatically computes Win Rate, Profit Factor, and Net P&L per setup.

7. **Historical Trade Replay Engine**
   - Built on TradingView's Lightweight Charts library.
   - Historical bar-by-bar candlestick playback with volume histograms.
   - Controls: Play/Pause, Step Forward, Step Backward, Speed selector (0.5x, 1x, 2x, 5x), and Reset.
   - Pluggable `IMarketDataProvider` interface ready for live data feeds or historical CSV imports.

8. **Manual Backtesting Simulator**
   - Isolated backtest sessions with custom starting capital.
   - Simulated Long and Short order placements.
   - Completely separated database storage (`backtest_sessions`, `backtest_trades`) ensuring backtests never contaminate live trading statistics.

9. **Jarvis AI Assistant**
   - Personal trading analysis coach analyzing actual user trades.
   - Interactive diagnostic prompts ("Why am I losing money?", "Which hours are most profitable?", "Am I taking revenge trades?").
   - Actionable rule-following recommendations with mathematical statistical evidence.

10. **Daily Routines & Discipline Tracker**
    - Pre-market, during-market, and post-market protocol checklists.
    - 60-day GitHub-style discipline consistency heatmap.
    - Streak counter and habit adherence score.

---

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Charts**: Lightweight Charts (Financial candlesticks & replay), Recharts (Analytics curves, heatmaps & histograms)
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **State & Data**: In-memory storage adapter for strict compliance with zero browser storage persistence rules

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database Migration
Run the SQL migration in your Supabase SQL Editor:
- `supabase/migrations/20261116000000_jarvis_journal_schema.sql`
- `supabase/migrations/20261116000001_storage_setup.sql`

This creates all 23 normalized tables, triggers, and seed data for major instruments (NQ, ES, BTC, XAU/USD, EUR/USD, NVDA).

### 4. Run Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
```

---

## 🌐 Deploying on Render

This project includes a ready-to-use `render.yaml` specification for Render Static Site deployment.

1. Connect your Git repository to Render.
2. Select **Static Site**.
3. Set the build command to `npm install && npm run build`.
4. Set the publish directory to `dist`.
5. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
