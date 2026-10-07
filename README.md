# ClinicalBridge

Staffing marketplace connecting hospitals with working doctors and locum tenens.
Next.js 16 (App Router) + Supabase (Postgres, Auth, Storage, Realtime).

## Local development

```bash
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm install
npm run dev                  # http://localhost:3000
```

Checks (the same ones CI runs):

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

`tests/db/` applies every migration to an in-process Postgres (PGlite) and
checks the row-level security policies and write guards as each role (allowed
app flows and blocked abuse). Add a case there whenever you change a policy.

## Deploying to production

### 1. Supabase (production project, separate from dev)

1. Create a new project. Pick the region closest to your users.
2. **Take a backup** of any existing data, then apply every file in
   `supabase/migrations/` **in numeric order** (SQL Editor, or the
   "DB migrate" GitHub workflow described below). Run 022 on its own before
   023 (it adds an enum value that 023 uses).
3. Check that the `documents` storage bucket exists and is **private**
   (migration 021). Documents are served only through short-lived signed URLs.
4. **Authentication → URL Configuration**
   - Site URL: `https://<your-domain>`
   - Redirect URLs: `https://<your-domain>/**`
5. **Authentication → Providers → Email**: turn **Confirm email** on.
6. **Authentication → SMTP Settings**: add a real SMTP provider (Resend,
   SendGrid, Postmark…). Supabase's built-in mailer is rate-limited to a
   handful of emails per hour and is not meant for production.
7. **Authentication → Attack Protection**: enable leaked-password protection
   and CAPTCHA once the frontend supports it.
8. Sign up with the designated super-admin email hardcoded in migration 018.
   The database promotes that account to super admin automatically.

9. **Email notifications** (optional until you have an email provider): deploy
   the Edge Function and create the database webhook. The steps are at the top
   of `supabase/functions/send-notification-email/index.ts`.

### 2. Vercel

1. Import the repository and use the default Next.js settings.
2. Set these environment variables for **Production and Preview**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon / publishable key |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` |

   `NEXT_PUBLIC_*` values are **inlined at build time**. After changing them,
   **redeploy**; updating them at runtime has no effect. If they are missing, the
   role sections fail closed (503 / error page) instead of loading.
3. Add your domain under Project → Domains.

### 3. Smoke test after every deploy

- Logged out, open `/hospital/dashboard`. You should be redirected to `/login`.
- Sign up as a hospital, a working doctor and a locum tenens. Confirm the email,
  finish onboarding and upload a document.
- As super admin, open the verification dialog. The document preview should
  load, and its URL should contain `/object/sign/`.
- Post a shift, then apply, accept and complete it, and submit a payout.
- Send a message between two accounts and check that it arrives live.
- Open the browser console. There should be no CSP violations.

### Database migrations from CI

`.github/workflows/db-migrate.yml` is a manually triggered workflow that runs
the RLS test suite and then `supabase db push`. Set `SUPABASE_ACCESS_TOKEN`,
`SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_REF` as secrets on a GitHub
environment (`staging` / `production`). If some migrations were already applied
by hand, mark them first so they aren't re-run:

```bash
npx supabase migration repair --status applied 001 002 003 ...
```

### Before launch

- Fill in `LEGAL` in `lib/config/brand.ts` and have a lawyer review `/terms`
  and `/privacy`. Bump `LEGAL_VERSION` in `lib/legal.ts` whenever they change.
  The version each user accepted is stored in their auth metadata.

Security headers (CSP, HSTS, frame, referrer and permissions policies) are
defined in `next.config.ts`. If you add a new third-party origin (analytics,
payments, error tracking), add it to the CSP there.
