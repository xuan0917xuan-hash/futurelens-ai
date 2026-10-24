# FutureLens AI

> **Demo project:** FutureLens AI is a demonstration prototype, not a production
> service. The consultation content, generated concepts, and results are for
> showcasing the user experience and technical workflow only. Do not use it for
> real civic decisions or store sensitive personal information.

This project was built with **AI-assisted coding**. AI tools were used to help
explore implementation options, generate and refine code, and support testing.
The application, configuration, security decisions, and final changes remain
subject to human review and are not a guarantee of production readiness.

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
