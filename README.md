# AI Business OS

Production-ready SaaS platform where business owners onboard their company and receive assistance from multiple AI agents managed by a CEO Agent.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Supabase (Auth, PostgreSQL, RLS) |
| AI | Google Gemini 2.5 Flash |
| Workflows | n8n (webhook integration) |

## Folder Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected app pages
│   │   ├── dashboard/        # Main dashboard
│   │   ├── setup/            # Business onboarding
│   │   ├── company/          # Company profile
│   │   ├── agents/           # Agent dashboard
│   │   ├── tasks/            # Task dashboard
│   │   ├── reports/          # Reports dashboard
│   │   └── settings/         # Settings
│   ├── api/
│   │   ├── agents/           # Agent execution routes
│   │   ├── business/         # Business CRUD
│   │   ├── tasks/            # Task management
│   │   ├── reports/          # Reports fetch
│   │   └── webhooks/n8n/     # n8n workflow webhook
│   ├── login/                # Authentication
│   └── signup/
├── components/
│   ├── ui/                   # Shadcn UI components
│   ├── layout/               # Sidebar, headers
│   ├── dashboard/            # Dashboard widgets
│   ├── agents/               # Agent cards
│   └── tasks/                # Task components
├── hooks/                    # React hooks
├── lib/
│   ├── supabase/             # Supabase clients
│   ├── gemini/               # Gemini AI client
│   └── agents/               # Agent services
└── types/                    # TypeScript types
supabase/
└── migrations/               # SQL schema + RLS
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `N8N_WEBHOOK_SECRET` (optional)

### 3. Run Supabase migrations

Apply migrations in your Supabase project SQL editor or via CLI:

```bash
npx supabase db push
```

Or run files in order:
1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_fix_signup_trigger.sql` — **required if signup shows "Database error saving new user"**

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## AI Agents

| Agent | Role |
|-------|------|
| CEO | Business analysis, delegation, executive reports |
| HR | Task categorization, assignment, tracking |
| Marketing | Social content, campaigns, calendars |
| Sales | Lead scoring, outreach, conversions |
| Developer | SEO, UX, performance improvements |
| Support | FAQ, workflows, customer journey |
| Finance | Profit, ROI, budgets, forecasts |
| Operations | KPIs, execution plans, monitoring |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/business` | Create/update business |
| POST | `/api/agents/run` | Run any agent |
| POST | `/api/agents/ceo` | Run CEO agent |
| POST | `/api/agents/{department}` | Run department agent |
| GET/PATCH | `/api/tasks` | List/update tasks |
| GET | `/api/reports` | List reports |
| POST | `/api/webhooks/n8n` | n8n workflow callback |

## n8n Integration

Configure n8n workflows to POST to:

```
POST /api/webhooks/n8n
Authorization: Bearer {N8N_WEBHOOK_SECRET}

{
  "businessId": "uuid",
  "workflow": "marketing-automation",
  "payload": { ... }
}
```

## Database Tables

- `profiles` — User profiles
- `businesses` — Business onboarding data
- `agents` — 8 AI agents per business
- `tasks` — Delegated and completed tasks
- `reports` — Agent-generated reports
- `activity_feed` — Real-time agent activity
- `approvals` — Pending user approvals
- `revenue_opportunities` — CEO-identified opportunities

All tables have Row Level Security (RLS) enforcing owner-only access.
