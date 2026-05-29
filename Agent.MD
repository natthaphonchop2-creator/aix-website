# AiX Website Agent Guide

Last updated: 2026-05-29
Current project version: 1.0.1

## Project Snapshot

AiX Website is a Node/Express website with SQLite-backed API behavior, local file uploads, Stripe integration, and a Cloudflare Worker static-preview path.

Primary runtime:
- Node.js: `22.x`
- Server entry: `server.js`
- Local start: `npm start`
- Package manager: npm with `package-lock.json`
- Static preview: `cloudflare/worker.js` + `wrangler.jsonc`

Important paths:
- App pages and browser scripts live at the repository root.
- Generated public visuals live in `assets/generated/`.
- PDF quotation output lives in `output/pdf/`.
- Development records live in `docs/development/`.
- Runtime data, private uploads, Wrangler output, and old archived app code are ignored by git.

## Current Dependency Baseline

The 2026-05-29 baseline updates the app to:
- `better-sqlite3` `^12.10.0`
- `stripe` `^22.2.0`
- `wrangler` `^4.95.0`

`npm audit fix` was run on this baseline and the audit result is 0 known vulnerabilities.

## Development Rules

1. Before changing code, read this file and `docs/development/UPDATE_LOG.MD`.
2. Every meaningful development session must add a dated entry to `docs/development/UPDATE_LOG.MD` before commit.
3. Each update entry must include version, scope, changed files, validation commands, result, and next risk or follow-up.
4. If the app version changes, update `package.json`, `package-lock.json`, this file, and `docs/development/UPDATE_LOG.MD` in the same commit.
5. Do not commit secrets. Keep `.env`, `.env.local`, database files, private uploads, and generated Wrangler assets ignored.
6. Do not move public assets from `assets/generated/` or `output/pdf/` unless all HTML, CSS, JS, and document references are updated in the same change.
7. Treat the Cloudflare Worker as a static preview until the Express/SQLite API is migrated to Workers + D1/R2 or proxied to a Node origin.
8. Preserve existing visible behavior unless the task explicitly asks for a redesign.

## Verification Commands

Use the smallest verification set that matches the change:
- Dependency or server change: `npm audit`
- Cloudflare preview change: `npm run cf:check`
- Runtime smoke test: `npm start`, then check `/api/health`

Record the exact commands and results in `docs/development/UPDATE_LOG.MD`.
