# FeelsOdd

**FeelsOdd** is a B2B SaaS security tool that protects companies from AI-powered fraud, phishing, and fake payment instructions. Employees can paste suspicious content, forward suspicious emails, and let FeelsOdd analyze the risk before anyone makes a costly mistake.

---

## Features

- AI-powered fraud detection with risk level scoring (low / medium / high)
- One-click email approval workflow via Resend — no login required for approvers
- Inbound email forwarding via Resend receiving webhooks
- Provider-agnostic `.eml` email upload for exported messages from Gmail, Outlook, Apple Mail, and other clients
- Connected inbox management for Gmail, Outlook, and IMAP mailboxes
- Manual and scheduled inbox sync for connected Gmail, Outlook, and IMAP mailboxes
- Optional Slack / Teams incident alerting for medium/high findings
- Screenshot upload with OCR + fraud analysis
- WebExtensions-first browser capture for selected text, links, web pages, and Gmail
- Full audit trail with timestamps, risk scores, and approver decisions
- Clean dashboard to monitor all requests
- Token-based approver links (no auth required)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/yourorg/truststep.git
cd truststep
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in all values in `.env.local` (see table below).

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** in your Supabase dashboard
3. Run the contents of `supabase/schema.sql` to create the tables and seed the demo company
4. Copy your **Project URL** and **anon key** from **Settings → API**
5. Copy your **service_role key** (keep this secret — server-side only)

### 4. Set up OpenAI for screenshot OCR

1. Create an account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key under **API Keys**
3. Add it to `.env.local` as `OPENAI_API_KEY`
4. This key is used for screenshot / image text extraction and visual context analysis

### 5. Set up Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your sending domain (or use the sandbox for testing)
3. Generate an API key
4. Add it to `.env.local` as `RESEND_API_KEY`
5. Update the `from` address in `lib/resend.ts` to match your verified domain

### 6. Set up inbound email forwarding

1. In Resend, enable **Receiving** and create or copy your `*.resend.app` inbound domain
2. Add that domain to `.env.local` as `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN`
3. Create a webhook endpoint in Resend pointing to:
   `https://your-app-domain.com/api/webhooks/resend`
4. Subscribe the webhook to the `email.received` event
5. Copy the webhook signing secret into `.env.local` as `RESEND_WEBHOOK_SECRET`
6. Forward suspicious emails to:
   `scan@your-domain.resend.app`
   or, for a logged-in company-specific route:
   `scan+<company_uuid>@your-domain.resend.app`

### 7. Apply the inbound email migration

If your database is already created, run the SQL in `supabase/migration_inbound_email.sql`.

If you already applied older source constraints, also run `supabase/migration_add_image_source.sql`.

To enable the connected inbox management UI, also run `supabase/migration_connected_inboxes.sql`.

If you already created `connected_inboxes` before Gmail OAuth was added, also run `supabase/migration_connected_inboxes_oauth.sql`.

If you already created `connected_inboxes` before IMAP credentials were added, also run `supabase/migration_connected_inboxes_imap.sql`.

### 8. Set up Gmail OAuth for connected inboxes

1. Create OAuth credentials in Google Cloud Console
2. Add these values to `.env.local`:
   - `GOOGLE_MAIL_CLIENT_ID`
   - `GOOGLE_MAIL_CLIENT_SECRET`
3. Add this redirect URI in Google Cloud:
   - `http://localhost:3000/api/inboxes/oauth/google/callback`
   - or your production equivalent based on `NEXT_PUBLIC_APP_URL`
4. FeelsOdd requests `gmail.readonly` plus basic identity scopes to resolve the mailbox address

### 8.1 Set up Google and Microsoft login

Social login is handled by Supabase Auth. The Gmail/Outlook inbox variables below are unrelated to account login.

1. Put a real Supabase project URL, anon key, and service-role key in `.env.local` (see `.env.example`).
2. In Supabase Auth URL Configuration, set the Site URL and allow these redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
3. Create a Google OAuth web client. In Google Cloud, use this authorized redirect URI:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
4. Enable Google in Supabase Auth Providers and paste the Google client ID and secret there.
5. Create a Microsoft Entra app. Use the same Supabase callback URI:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
6. Enable Azure in Supabase Auth Providers and paste the Microsoft client ID, secret, and tenant URL there. Use the `common` tenant for personal and work Microsoft accounts.
7. Restart the Next.js server after changing `.env.local`.

### 8.5 Set up Microsoft Graph OAuth for Outlook inboxes

1. Register an app in Microsoft Entra / Azure Portal
2. Add these values to `.env.local`:
   - `MICROSOFT_MAIL_CLIENT_ID`
   - `MICROSOFT_MAIL_CLIENT_SECRET`
   - `MICROSOFT_MAIL_TENANT_ID` (`common` is fine for multi-tenant dev)
3. Add this redirect URI:
   - `http://localhost:3000/api/inboxes/oauth/outlook/callback`
   - or your production equivalent based on `NEXT_PUBLIC_APP_URL`
4. FeelsOdd requests `Mail.Read`, `User.Read`, `offline_access`, and basic identity scopes

### 8.6 Set up IMAP inboxes

1. In `/inboxes`, choose `Iný e-mail cez IMAP`
2. Fill in:
   - IMAP host
   - port
   - TLS/SSL preference
   - IMAP username
   - IMAP password or app password
3. FeelsOdd stores these credentials server-side only and never returns them to the browser API response
4. For production, replace plain database storage with encrypted secrets or a dedicated vault

### 9. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 9.5 Set up scheduled inbox auto-sync

1. Add `INBOX_SYNC_CRON_SECRET` to `.env.local`
2. Point your scheduler / cron system to:
   - `GET /api/inboxes/auto-sync`
   - or `POST /api/inboxes/auto-sync`
3. Send either:
   - `Authorization: Bearer <INBOX_SYNC_CRON_SECRET>`
   - or `x-sync-secret: <INBOX_SYNC_CRON_SECRET>`
4. Scheduled sync respects `scan_mode`:
   - `auto` runs every scheduler tick
   - `digest` runs only when the inbox was not checked for at least 12 hours
   - `manual` is skipped by cron and only runs from the UI

### 9.6 Set up Slack / Teams incident alerts

1. Add `INCIDENT_ALERT_WEBHOOK_URL` to `.env.local`
2. Optionally set `INCIDENT_ALERT_MIN_RISK` to:
   - `medium` (default)
   - `high`
3. FeelsOdd posts external alerts whenever a new incident at or above the configured risk is created
4. The helper auto-detects Microsoft Teams style webhooks by URL and falls back to Slack-style payloads otherwise
5. In `/inboxes`, use `Poslať test alert` to verify the webhook without waiting for a real incident

### 9.7 Send a daily digest

1. Ensure `RESEND_API_KEY` and the company `approver_email` are configured
2. In `/inboxes`, use `Poslať denný digest`
3. FeelsOdd sends a 24-hour summary with:
   - total medium/high incidents
   - source breakdown
   - latest priorities
   - inbox health
   - failed alert count

### 9.8 Set up scheduled daily digests

1. Add `DIGEST_CRON_SECRET` to `.env.local`
2. Point your scheduler / cron system to:
   - `GET /api/digests/auto-send`
   - or `POST /api/digests/auto-send`
3. Send either:
   - `Authorization: Bearer <DIGEST_CRON_SECRET>`
   - or `x-digest-secret: <DIGEST_CRON_SECRET>`
4. FeelsOdd will send the daily digest to every company `approver_email`

### 10. Load the browser extension

1. Open `chrome://extensions` (or the equivalent Extensions page in a Chromium browser)
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder

The extension can then:
- analyze selected text via right click
- analyze the current page or a clicked link
- analyze the opened Gmail or Outlook Web email without copy-paste

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `GROQ_API_KEY` | Groq API key for fraud analysis |
| `OPENAI_API_KEY` | OpenAI API key used for screenshot OCR / vision extraction |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `RESEND_WEBHOOK_SECRET` | Resend webhook signing secret for inbound email verification |
| `NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN` | Public inbound receiving domain used for forward-to-FeelsOdd addresses |
| `NEXT_PUBLIC_APP_URL` | Base URL of the app (e.g. `http://localhost:3000`) |
| `GOOGLE_MAIL_CLIENT_ID` | Google OAuth client id for Gmail inbox connect |
| `GOOGLE_MAIL_CLIENT_SECRET` | Google OAuth client secret for Gmail inbox connect |
| `MICROSOFT_MAIL_CLIENT_ID` | Microsoft Graph OAuth client id for Outlook inbox connect |
| `MICROSOFT_MAIL_CLIENT_SECRET` | Microsoft Graph OAuth client secret for Outlook inbox connect |
| `MICROSOFT_MAIL_TENANT_ID` | Microsoft tenant id or `common` for Outlook inbox connect |
| `INBOX_SYNC_CRON_SECRET` | Secret used by the scheduled inbox auto-sync endpoint |
| `DIGEST_CRON_SECRET` | Secret used by the scheduled daily digest endpoint |
| `INCIDENT_ALERT_WEBHOOK_URL` | Optional Slack / Teams webhook URL for external incident alerts |
| `INCIDENT_ALERT_MIN_RISK` | Minimum risk level that should trigger the external webhook (`medium` or `high`) |

---

## Supabase Setup Details

The schema creates two tables:

- **`companies`** — stores company info and the approver email address
- **`requests`** — stores all submitted texts with AI analysis results, inbound source, and approval status

A demo company (`Demo s.r.o.`) is seeded automatically with ID `00000000-0000-0000-0000-000000000001`.

Row Level Security (RLS) is enabled with permissive public policies so the app works without user auth. For production, tighten these policies to require authentication.

---

## Project Structure

```
truststep/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles + Tailwind
│   ├── dashboard/page.tsx        # Dashboard — all requests
│   ├── submit/page.tsx           # Submit form (client component)
│   ├── report/[id]/page.tsx      # Risk report detail
│   ├── approve/[token]/page.tsx  # Approver one-click page
│   └── api/
│       ├── analyze/route.ts      # POST /api/analyze
│       ├── analyze-image/route.ts # POST /api/analyze-image
│       ├── approve/route.ts      # POST /api/approve
│       └── webhooks/resend       # POST /api/webhooks/resend
├── components/
│   ├── Navbar.tsx
│   ├── RiskBadge.tsx
│   └── StatusBadge.tsx
├── lib/
│   ├── types.ts
│   ├── supabase.ts
│   ├── openai.ts
│   ├── resend.ts
│   └── utils.ts
└── supabase/
    └── schema.sql
```

---

## Screenshot

_[Add screenshot here]_

---

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** — dark navy design system
- **Supabase** — Postgres database + optional auth
- **OpenAI** — image OCR / vision extraction for screenshots
- **Groq** — primary text + audio fraud analysis
- **Resend** — transactional email for approver notifications
- **Resend Receiving** — inbound email ingestion via webhook

---

© 2026 FeelsOdd
