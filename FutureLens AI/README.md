# FutureLens AI

## Requirements

- Node.js 20 or newer
- npm
- Access to the shared Supabase project
- Supabase CLI only if deploying migrations or Edge Functions

## Local development

Clone the repository and enter the application directory:

```sh
git clone <repository-url>
cd futurelens-ai/FutureLens AI
```

Install dependencies:

```sh
npm install
```

Create the local environment file:

```sh
copy .env.example .env
```

Fill in `.env` with the shared Supabase project values. Do not commit `.env`
or share the server-only secrets. The required values are documented in
`.env.example`.

Start the local development server:

```sh
npm run dev
```

The app is available at `http://localhost:5173`.

## Supabase setup

The database and image-generation features require the Supabase project to be
configured. From the `FutureLens AI` directory:

1. Run all SQL migrations in `supabase/migrations/` against the shared project.
2. Deploy both Edge Functions:

   ```sh
   supabase functions deploy generate-concepts
   supabase functions deploy generate-personal-concept
   ```

3. Configure the Edge Function secrets:

   ```sh
   supabase secrets set CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=...
   ```

4. Upload the two source park images to the `park-concepts` bucket using the
   paths documented in [supabase/README.md](./supabase/README.md).

The full Supabase and Cloudflare setup is documented in
[supabase/README.md](./supabase/README.md).

## Accounts

- Residents sign in at `/login`.
- Developers sign in at `/developer-login`.
- Developer accounts must be promoted to the `developer` role in
  `public.users`; developer self-registration is disabled.

## Verification

```sh
npm test -- --run
npm run build
npm run lint
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
