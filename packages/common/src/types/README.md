# Canonical Types

Domain types live here. Use these for type safety across the codebase.

## When to add here

- Shared domain shapes (LlmTags, PipelineProgress)
- Types used by multiple packages
- Types that should stay stable as an API contract

## When to use schemas instead

- Input/output validation (Zod schemas in `schemas/`)
- API request/response shapes (use `z.infer<typeof schema>` if you need a type)
