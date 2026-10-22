# Supabase setup

1. Create a Supabase project.
2. Enable password authentication in **Authentication > Providers > Email**.
   Disable email confirmation because usernames map to internal placeholder
   addresses that residents cannot receive mail at.
3. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_USERNAME_EMAIL_DOMAIN`, and `SUPABASE_SECRET_KEY` from
   `.env.example`. The application also accepts the previous
   `VITE_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY` names.
4. Deploy the `generate-concepts` and `generate-personal-concept` Edge Functions
   and set these Edge Function
   Secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
   `STORAGE_BUCKET=park-concepts`, and optionally
   `FLUX_CONCEPT_COUNT=3` (or another value from 1 to 6). Supabase automatically provides
   `SUPABASE_URL` and its service-role secret to deployed functions; the
   function also accepts `SUPABASE_SECRET_KEY`.
5. Run all migrations in `migrations/` from the Supabase SQL editor or with
   the Supabase CLI.
6. Configure the deployment origin in Supabase **Authentication > URL Configuration**.

New resident accounts provide an email address, which is used for Supabase
Auth and stored on the application profile. Older accounts created before the
email field was added continue to sign in through the legacy
`username@SUPABASE_USERNAME_EMAIL_DOMAIN` mapping. Supabase Auth still owns
password hashing and session management.

The Stage 4 migration creates a private `park-concepts` storage bucket.
Upload the existing park photographs using the exact seeded keys
`parks/maple-street-park.jpg` and `parks/riverside-green.jpg` before testing
generation.

Residents can submit one improvement request per consultation. The database
advances the consultation to `preparing` after 15 unique submissions. The
15th submission automatically starts the server-side generation action, which
sends the selected park image to Cloudflare FLUX, stores each returned image
in Supabase Storage, and opens voting only after the complete configured
concept set has been stored and published. No developer action is required.
The database also permits each user to claim generation only once per
consultation; repeated requests are rejected before any provider call.

During the design stage, each resident can also generate exactly one private
FLUX image from their own request and selected park photograph. This uses the
`generate-personal-concept` Edge Function and stores the result in
`personal_concepts`; the generated Storage object is private and is shown
through a short-lived signed URL. Failed personal generations do not consume
the quota, so a failed provider or storage operation can be retried.

Residents use `/login`. Developer accounts do not have public sign-up and use
`/developer-login`; the page rejects accounts whose `public.users.role` is not
`developer`.

The TanStack Start server invokes `generate-concepts` with the resident's
Supabase access token. It does not read the Cloudflare secrets and never sends
them to the browser. Deploy from the project root with the Supabase CLI:

```text
supabase functions deploy generate-concepts
supabase functions deploy generate-personal-concept
supabase secrets set CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...
```

Do not put either Cloudflare secret in a `VITE_` variable or browser code.
