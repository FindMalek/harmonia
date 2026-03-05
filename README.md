# harmonia

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Copy `.env.example` to `.env` at the project root and fill in your values.
2. Make sure you have a PostgreSQL database set up (e.g. Neon).
3. Apply the schema to your database:

```bash
pnpm run db:push
```

Then, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) (or [http://127.0.0.1:3001](http://127.0.0.1:3001) if using Spotify) in your browser to see the fullstack application.

### Spotify (optional)

To sign in with Spotify and run the organize pipeline (sync liked tracks, lyrics, LLM, embeddings, clustering):

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. In the app settings, set **Redirect URI** to `{BETTER_AUTH_URL}/api/auth/callback/spotify` (e.g. `http://127.0.0.1:3001/api/auth/callback/spotify` for local dev — use `127.0.0.1`, not `localhost`).
3. Copy **Client ID** and **Client Secret** into `.env` as `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
4. Restart the dev server, then use **Sign in with Spotify** on the login page (or **Link Spotify** on the dashboard if you already have an account).
5. On the dashboard, click **Run organize pipeline** to sync your liked tracks and run the full pipeline.

## Project Structure

```
harmonia/
├── apps/
│   └── web/         # Fullstack application (Next.js)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `pnpm run dev`: Start all applications in development mode
- `pnpm run build`: Build all applications
- `pnpm run check-types`: Check TypeScript types across all apps
- `pnpm run db:push`: Push schema changes to database
- `pnpm run db:generate`: Generate database client/types
- `pnpm run db:migrate`: Run database migrations
- `pnpm run db:studio`: Open database studio UI
