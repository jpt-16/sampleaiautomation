# Gleam Detail Co. · AI Lead Response (demo)

A working lead-response automation for a fictional car-detailing business, built for a JT Builds Co. demo.

**Quote form → AI-written reply → saved lead → owner dashboard**

1. `/` Customers submit a quote request (name, email, phone, vehicle, service, preferred date) with full validation.
2. `POST /api/inquiries` asks an AI model (server-side) for a personalised acknowledgement. The prompt forbids prices, booking confirmations and availability promises, and a post-check rejects any reply that contains them.
3. The inquiry, reply, status and timestamp are saved to the lead database.
4. `/dashboard` shows leads live (polls every 4s) with status filters, the generated reply, and one-click **Mark as followed up**.

Statuses: `New` (AI step failed, needs a human) · `Responded` (AI reply generated) · `Follow-up Needed` (owner flag) · `Followed Up` (owner done).

## Quick start (zero config)

```bash
npm install
npm run dev        # http://localhost:3000
```

With no keys set the app runs in clearly-labelled **DEMO MODE** (amber pill in the header): realistic sample replies, and leads are stored in a local SQLite file (`data/leads.db`) that persists across restarts. Requires Node 22.5+ (uses the built-in `node:sqlite`).

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | no | Enables live AI replies. Without it, demo mode. Server-only. |
| `ANTHROPIC_MODEL` | no | Model override (default `claude-haiku-5-5`). |
| `SUPABASE_URL` | no | Use Supabase for storage (set with the key below). |
| `SUPABASE_SERVICE_ROLE_KEY` | no | Server-only key. Never prefix with `NEXT_PUBLIC_`. |
| `SQLITE_PATH` | no | Custom SQLite file location. |

### Supabase setup

1. Create a project, then run `supabase/migrations/0001_create_leads.sql` in the SQL editor (or `supabase db push`).
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The table has RLS enabled with no policies, so only the server can touch it.

The dashboard header shows `STORAGE · SUPABASE` or `STORAGE · SQLITE` so you can see which is active. (SQLite needs a writable disk; use Supabase on serverless hosts like Vercel.)

## Demo script (for the Reel)

1. Open `/`. Click **▶ Run demo inquiry**. Fields fill in one by one, then submit automatically.
2. Watch the **Live automation** panel: *Inquiry received → AI writing → reply typed out → Saved to lead database*. The form swaps to a success confirmation.
3. Click **Open in dashboard**. The new lead is on top, highlighted, with the AI reply showing.
4. Click **Mark as followed up**. The status badge and counters update.
5. Optional: show validation by clicking **Request my quote** on an empty form.

Tip: keep `/dashboard` open in a second window; new leads appear there within 4 seconds.

## Checks

```bash
npm run typecheck && npm test && npm run build
```

## Notes

- Error handling: validation errors per field; network/server errors shown inline; if the AI call fails the lead is **still saved** as `New` and flagged for manual follow-up; rate limiting (8 req/min/IP, in-memory) protects AI spend.
- The dashboard has **no authentication** (it's a demo). Add auth before exposing real customer data.
