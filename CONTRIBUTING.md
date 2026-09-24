# Contributing to Skill Relay

Thanks for helping make agent workflows easier to inspect and reuse.

## Before you start

1. Read the README and the safety/provenance section.
2. Check existing issues and open a focused issue for substantial changes.
3. Never add synthetic catalog records to inflate the public count.
4. Treat upstream skill content as untrusted input.

## Development

```bash
npm install
npm run lint
npm run build
```

The core experience works without a database. For persistence, copy `.env.example` to `.env.local` and provide a Neon `DATABASE_URL`.

## Quality bar

- Keep the catalog, engine, and store boundaries typed in `src/lib`.
- Use the same deterministic engine for UI, REST, and MCP surfaces.
- Add a reproducible HTTP or test proof for data and mutation changes.
- Preserve source labels, fallback behavior, and safety disclaimers.
- Prefer small changes with clear names over clever abstractions.

## Pull requests

Use a descriptive title, explain the user outcome, list verification commands, and call out any new external dependency or source. A pull request is ready when lint and build pass and the relevant route works with a real request.
