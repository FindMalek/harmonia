# @sonaraem/common

Shared schemas, types, and services for the Sonaraem monorepo.

## Structure

```
src/
├── schemas/       # Zod schemas for validation and API contracts
├── types/         # Canonical TypeScript types (LlmTags, PipelineProgress, etc.)
├── services/      # Business logic
│   ├── brain/     # AI: classification, embeddings, clustering, playlist generation
│   ├── music/     # Spotify sync, lyrics, export
│   └── organize/  # Pipeline orchestration
└── utils/         # Origin checks, routes
```

## Types vs Schemas

- **types/** — Canonical TypeScript definitions. Use for type safety in code.
- **schemas/** — Zod schemas for runtime validation and API input/output. Use `z.infer<>` when you need a type from a schema.

When both exist (e.g. `LlmTags`), the type in `types/` is the source of truth; the schema mirrors it for validation.

## Service Boundaries

- **brain** — Classification, embeddings, clustering, playlist generation. Depends on OpenAI, Groq, LRCLib.
- **music** — Spotify client, library sync, library stats, lyrics, export. Depends on Spotify API.
- **organize** — Orchestrates the full pipeline: sync → lyrics → classify → embed → cluster → generate.
