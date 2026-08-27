# @sonaraem/email

React Email templates and Resend send helpers for Sonaraem.

## Structure

```
packages/email/
├── components/     # EmailThemeProvider, Logo, Button, Footer
├── emails/         # One .tsx per template (no _components/)
├── public/         # logo.png and other hosted assets
├── render.ts       # HTML render wrapper
└── src/send.ts     # Resend delivery
```

## Authoring

Templates use **Tailwind `className`** + `EmailThemeProvider` + `getEmailThemeClasses()` + `getEmailInlineStyles("light")` inline fallbacks. Dark mode is CSS-only in `components/theme.tsx` — never add `*.dark.tsx` duplicates.

Theme colors live in `components/theme.tsx` only. Do not import `@sonaraem/ui` from this package.

## Preview

```bash
pnpm dev:email
```

## Send

Import from `@sonaraem/email/send`. Policy, dedupe, and triggers live in `@sonaraem/common`.
