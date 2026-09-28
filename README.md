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

## Deploying to production

### 1. Supabase (production project, separate from dev)

1. Create a new project. Pick the region closest to your users.
2. **Take a backup** of any existing data, then apply every file in
   `supabase/migrations/` **in numeric order** (SQL Editor, or
   `npx supabase link --project-ref <ref> && npx supabase db push`).
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

Security headers (CSP, HSTS, frame, referrer and permissions policies) are
defined in `next.config.ts`. If you add a new third-party origin (analytics,
payments, error tracking), add it to the CSP there.
