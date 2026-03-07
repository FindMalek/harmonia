# Drizzle ORM Documentation Skill

Complete Drizzle ORM documentation packaged as an OpenClaw AgentSkill.

## Contents

- **Database Connections** (PostgreSQL, MySQL, SQLite + cloud providers)
- **Schema Definition** (column types, relations, constraints)
- **Query Builder** (select, insert, update, delete, joins, transactions)
- **Migrations** (drizzle-kit, schema management)
- **Integrations** (Neon, Supabase, PlanetScale, Cloudflare D1, Turso, etc.)
- **Validation** (Zod, Valibot, Arktype, Effect)
- **Framework Guides** (Next.js, SvelteKit, Astro, etc.)

## Structure

```
references/
├── get-started/      # Installation and setup guides
├── connect-*.mdx     # Database connection guides
├── column-types/     # All database types
├── relations/        # Relations and foreign keys
├── migrate/          # Migration tools
├── guides/           # Best practices
├── tutorials/        # Step-by-step tutorials
├── extensions/       # Validation and type safety
└── latest-releases/  # Version updates
```

## Installation

Via ClawHub:
```bash
clawhub install lb-drizzle-skill
```

Or manually: Download and extract into your OpenClaw workspace `skills/` folder.

## Usage

This skill triggers automatically when you ask questions about Drizzle ORM, database schemas, queries, migrations, or cloud database integrations.

## Supported Databases

- **PostgreSQL** (Neon, Supabase, Vercel Postgres, etc.)
- **MySQL** (PlanetScale, TiDB)
- **SQLite** (Cloudflare D1, Turso, Bun, Expo, libSQL)

## Source

Documentation extracted from [drizzle-team/drizzle-orm-docs](https://github.com/drizzle-team/drizzle-orm-docs) (latest commit: 2026-02-05).

## License

Documentation content: MIT (from Drizzle ORM project)
