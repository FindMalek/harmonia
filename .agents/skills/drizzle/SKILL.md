---
name: drizzle
description: Complete Drizzle ORM documentation in markdown format. Use when working with Drizzle ORM - covers schema definition, queries, migrations, database connections (PostgreSQL, MySQL, SQLite), integrations (Neon, Supabase, PlanetScale, Cloudflare D1, Turso), column types, relations, transactions, and framework usage (Next.js, SvelteKit, Astro).
---

# Drizzle ORM Documentation

Complete Drizzle ORM documentation embedded in markdown. Read from `references/` to answer questions about schema design, querying, migrations, and database integrations.

## Documentation Structure

All documentation is in `references/` organized by topic:

### Getting Started (`references/get-started/`)
- Installation and setup
- Schema definition basics
- Database connections
- First queries

### Database Connections (`references/connect-*.mdx`)
Connect to various databases and platforms:
- **PostgreSQL:** `connect-neon.mdx`, `connect-supabase.mdx`, `connect-effect-postgres.mdx`, `connect-pglite.mdx`
- **MySQL:** `connect-planetscale.mdx`, `connect-tidb.mdx`
- **SQLite:** `connect-cloudflare-d1.mdx`, `connect-turso.mdx`, `connect-bun-sqlite.mdx`, `connect-expo-sqlite.mdx`, `connect-op-sqlite.mdx`
- **Serverless:** `connect-drizzle-proxy.mdx`, `connect-cloudflare-do.mdx`
- **Edge:** `connect-nile.mdx`, `connect-sqlite-cloud.mdx`

### Column Types (`references/column-types/`)
All database column types and modifiers:
- PostgreSQL, MySQL, SQLite types
- Custom types and validators
- Type safety and inference

### Queries & Operations
Core query builder features:
- `select.mdx` - Select queries
- `insert.mdx` - Insert operations
- `update.mdx` - Update operations
- `delete.mdx` - Delete operations
- `joins.mdx` - Join queries
- `indexes.mdx` - Index management
- `views.mdx` - Database views
- `batch-api.mdx` - Batch operations
- `transactions.mdx` - Transaction handling

### Relations & Schema (`references/relations/`)
- One-to-one, one-to-many, many-to-many
- Foreign keys and constraints
- Cascading operations

### Migrations (`references/migrate/`)
Schema migration tools:
- `drizzle-kit` usage
- Migration generation
- Push vs generate modes
- Migration deployment

### Integrations & Extensions (`references/extensions/`)
- Validation (Zod, Valibot, Arktype, Effect)
- Type safety enhancements
- Caching strategies

### Guides (`references/guides/`)
Best practices and how-tos:
- Performance optimization
- Type-safe queries
- Testing strategies
- Production patterns

### Tutorials (`references/tutorials/`)
Step-by-step walkthroughs for common use cases.

### Latest Releases (`references/latest-releases/`)
Version-specific features and updates.

## Quick Reference

### Common Tasks

| Task | File to Read |
|------|--------------|
| Setup Drizzle | `references/get-started/` |
| Connect to Neon | `references/connect-neon.mdx` |
| Connect to Supabase | `references/connect-supabase.mdx` |
| Connect to PlanetScale | `references/connect-planetscale.mdx` |
| Connect to Cloudflare D1 | `references/connect-cloudflare-d1.mdx` |
| Connect to Turso | `references/connect-turso.mdx` |
| Define schema | `references/get-started/` + `references/column-types/` |
| Run queries | `references/select.mdx`, `references/insert.mdx`, etc. |
| Setup relations | `references/relations/` |
| Run migrations | `references/migrate/` |
| Validate with Zod | `references/zod.mdx` |
| Batch operations | `references/batch-api.mdx` |
| Transactions | `references/transactions.mdx` |

### When to Use This Skill

- Setting up Drizzle ORM in a TypeScript project
- Defining database schemas with type safety
- Connecting to PostgreSQL, MySQL, or SQLite databases
- Working with serverless/edge databases (Neon, Supabase, D1, Turso)
- Writing type-safe queries
- Managing database migrations
- Adding validation with Zod/Valibot
- Questions about Drizzle ORM patterns and best practices

### How to Navigate

1. **Start with `references/get-started/`** for installation and basics
2. **For database setup:** Find relevant `connect-*.mdx` file
3. **For schema design:** Check `references/column-types/` and `references/relations/`
4. **For queries:** Use query-specific files (select, insert, update, delete, joins)
5. **For migrations:** See `references/migrate/`
6. **For validation:** Check `references/zod.mdx` or other validator files
7. **For best practices:** Browse `references/guides/`

All files are `.mdx` (Markdown + JSX) but readable as plain markdown.
