# AiX Website Phase 0 Emergency Hardening Design

Status: Ready for owner review

Date: 2026-07-18

Scope boundary: Local repository only; no production deployment, data deletion, credential rotation, CDN purge, or external-system mutation

## 1. Decision summary

AiX will begin with a targeted emergency-containment phase before visual redesign or back-office restructuring. The selected approach preserves the current Node/Express and static-page architecture while closing the highest-risk exposure and account-access paths first.

The implementation is allowed to change authentication behavior, protected-file delivery, static-file routing, security middleware, dependencies, and security tests. It is not allowed to redesign the public website, rebuild the admin interface, change membership pricing, or deploy the result.

## 2. Evidence that drives this phase

The repository audit found four immediate risk groups:

1. `express.static(__dirname)` and the current Cloudflare asset-copy command expose files by exclusion instead of publishing a positive allowlist. Known internal repository files and customer-export paths can therefore be served when their names are known.
2. `/api/members/login` can issue a member session from an email-and-phone match without requiring a password. The unused legacy `/api/auth/signup` and `/api/auth/login` endpoints also keep a separate SHA-256 credential path alive.
3. `/uploads` is publicly mounted before member authorization, allowing direct-file access around membership and payment checks.
4. Member and admin bearer tokens are retained in browser `localStorage`, server-originated values are rendered through unsafe HTML insertion in affected UI paths, production secrets can fall back to process-random values, CORS is unrestricted, and direct dependencies include currently reported vulnerabilities.

These risks are more urgent than the visual and information-architecture issues found in the public site and admin dashboard.

## 3. Goals

Phase 0 must produce all of the following outcomes:

- Only explicitly approved public pages and assets can be served without authentication.
- Internal documents, customer exports, logs, scripts, databases, environment files, source files, test files, and build artifacts return `404` from public routes.
- Email-and-phone matching alone can never create a member session.
- The legacy credential endpoints are disabled with an intentional `410 Gone` response.
- Member and admin authentication use separate `HttpOnly` cookies; authentication secrets are not returned in response bodies or persisted in `localStorage`.
- Authenticated state-changing requests require an approved origin and a session-bound CSRF token.
- Login, OTP, and admin authentication endpoints have practical rate limits.
- Uploaded replays and resources are served only after the applicable authorization check.
- Upload routes enforce route-specific file types and limits and remove rejected or abandoned temporary files.
- Unsafe rendering of server-originated member, class, replay, resource, and admin content is replaced by text-safe DOM construction or deliberate sanitization.
- Production startup fails closed when required authentication secrets or admin credentials are missing.
- Direct vulnerable dependency chains are upgraded without a forced major rewrite.
- Express and Cloudflare packaging use the same positive-publication policy and receive regression tests.

## 4. Non-goals

Phase 0 does not include:

- Public-site or admin-dashboard visual redesign.
- Navigation, mobile layout, typography, or page-length optimization.
- Database adapter replacement, transaction redesign, or event-loop performance work.
- Admin RBAC, MFA, audit-log product features, or multiple admin accounts.
- Migration from local upload storage to object storage.
- Course, pricing, Stripe product, or membership-policy changes.
- Production log review, incident notification, credential rotation, CDN purge, or production deployment.
- Removal or modification of customer data.

Those items remain separate follow-up phases so the emergency patch stays reviewable and reversible.

## 5. Approaches considered

### Approach A — Targeted containment in the current architecture

Keep Express, the existing pages, and the current database model. Replace broad static serving with a positive allowlist, harden the current signed-session flow, protect uploads, update vulnerable dependencies, and add security regression tests.

Benefits: smallest safe change set, fastest path to containment, and lowest visual-regression risk.

Tradeoff: retains legacy architecture that will still need Phase 1 cleanup.

Decision: selected.

### Approach B — Immediate public-directory and managed-auth migration

Move all public files into a new `public/` tree, replace the current authentication system with an external provider, and rebuild media delivery at the same time.

Benefits: cleaner long-term boundary.

Tradeoff: broad URL, asset, OAuth, and member-flow migration with substantially higher regression risk and a longer emergency window.

Decision: deferred to the foundation phase.

### Approach C — Edge-only blocking rules

Block known sensitive paths at Cloudflare while leaving the origin and application routing unchanged.

Benefits: very fast perimeter mitigation.

Tradeoff: the origin remains vulnerable, newly added private paths can leak, direct origin access bypasses the edge, and local/test environments remain unsafe.

Decision: rejected as the primary fix; edge rules may later add defense in depth.

## 6. Detailed design

### 6.1 One positive publication manifest

Create one version-controlled public-file manifest that is consumed by both Express static routing and `cf:prepare`.

The anonymous public set is limited to:

- Marketing pages: `index.html` and `class-detail.html`.
- Their exact root-level JavaScript and stylesheet dependencies.
- `robots.txt`, `sitemap.xml`, and referenced favicon/metadata assets.
- The asset directories `assets/`, `AiX logo/`, and `ai logo/`, restricted to safe web asset extensions.

Files not in that manifest are denied by default. The denied set therefore includes, without relying on name-by-name exclusions:

- `Agent.MD`, `PRODUCT.md`, `.env*`, package manifests, server source, worker source, and deployment configuration.
- `customer_exports/`, `docs/`, `scripts/`, `supabase/`, `tests/`, `tmp/`, `output/`, `outputs/`, `old aix-club/`, `.git/`, `.wrangler/`, local databases, and logs.
- Member, payment, course, live-class, tools, and admin implementation files unless served through an explicit application route.

Express must no longer mount the repository root with unrestricted `express.static`. Public requests resolve through the manifest and return `404` for any non-manifest path, including encoded traversal attempts and dotfile variants.

Member pages and their page-specific scripts are served from explicit authenticated routes. The admin login shell may be served by the `/admin` route, while all admin data remains behind admin authorization. Direct `.html` variants redirect to the canonical route or return `404`; they must not bypass middleware.

`tools-box.js` must not contain premium tool content in an anonymously downloadable bundle. Premium content is returned by authenticated API responses after membership checks.

The Cloudflare preparation command is replaced by a script that copies only the same manifest entries into `cloudflare/assets`. The prepared directory is scanned before completion and the command fails if a denied filename, directory, database, environment file, customer export, private page, or protected script appears.

### 6.2 API authorization matrix

All API routes are assigned to one explicit policy group; an unclassified route fails closed in the security-contract test:

- Public read-only: health, non-secret browser configuration, and the public course catalog/detail projection.
- Public authentication entry: Google verification, member registration, member login, and registration OTP routes, protected by approved-origin checks, input validation, and rate limits.
- Signed external callback: the Stripe webhook, protected by Stripe signature verification and the raw-body parser.
- Member session: dashboard, course content, progress, notifications, payment, member phone verification, protected tools, and protected media.
- Admin session: member management, course management, replay/resource management, schedules, leads, users, packages, statistics, and all mutations in those groups.

Public course responses use a deliberate public projection and cannot include premium lesson content, protected media identifiers, member data, internal paths, unpublished records, or admin-only fields. `/api/config` is limited to values intentionally safe for any anonymous browser. Unknown `/api/*` paths return JSON `404`.

### 6.3 Member authentication

The supported member-login paths are:

- Email plus password.
- Existing Google authentication after normal provider verification.

Email plus phone without a password is removed. A request without a password receives a generic `400` response and cannot disclose whether the email or phone exists. Password failures use a generic `401` response.

The legacy `/api/auth/signup` and `/api/auth/login` routes return `410 Gone` with a migration-safe message and never read or write the legacy user table.

Google login may update verified profile fields and `lastLoginAt`, but it must preserve an existing `suspended` or otherwise denied account status. A denied account never receives a new session through Google, password, OTP, or any other entry path.

Successful member login sets an `aix_member_session` cookie with:

- `HttpOnly` always.
- `Secure` in production.
- `SameSite=Lax` to preserve the Google redirect flow.
- `Path=/` and no broad `Domain` attribute.
- An explicit maximum age matching the existing member-session policy.

The session token is not present in JSON. Logout expires the cookie using identical attributes. Browser startup removes the retired member-token `localStorage` key, and no subsequent flow writes it again.

Member middleware accepts only `aix_member_session`. It explicitly ignores and rejects `Authorization: Bearer`, the retired `aix_session` cookie, and any client-provided token field. Auth/session responses expire the retired `aix_session` cookie so a previously issued or leaked browser token cannot be reused until its old TTL ends.

Existing users who do not have a usable password must use an already-linked Google account. Phase 0 does not invent a weak replacement recovery route: accounts with neither a password hash nor a Google identity remain denied until a separately reviewed secure password-setup migration is approved for production rollout. The implementation must report a read-only count of those accounts without modifying them.

### 6.4 Admin authentication

Admin authentication uses a separate `aix_admin_session` cookie with `HttpOnly`, production `Secure`, `SameSite=Strict`, `Path=/`, no broad `Domain` attribute, and the existing eight-hour maximum lifetime. The distinct cookie name prevents it from being interpreted as a member session while allowing both `/admin` and `/api/admin/*` to receive it.

Admin bearer tokens are not returned to JavaScript and are not stored in `localStorage`. Admin API middleware reads only the admin cookie and rejects `Authorization: Bearer` plus client-provided token fields. Logout expires it using the same attributes.

Production startup fails with a clear configuration error when `AUTH_SECRET`, `CSRF_SECRET`, `SMS_OTP_SECRET`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` is absent or when a documented development default is detected. Each signing secret must contain at least 32 bytes of entropy, the three signing secrets must differ, and the admin password must contain at least 14 characters and must not equal a documented/default value. Development-only defaults remain unavailable when `NODE_ENV=production`.

This phase retains the single-admin model. MFA and RBAC remain mandatory Phase 1 work.

### 6.5 CSRF, origin, CORS, and rate limits

The server uses an explicit `APP_ORIGINS` allowlist. Same-origin requests and configured HTTPS origins are accepted; wildcard CORS and reflected arbitrary origins are rejected. Credentialed responses are enabled only for approved origins.

For every authenticated session, the signed session payload includes a random nonce. The existing `/api/auth/me` route and a new `/api/admin/session` route return a CSRF token derived from that nonce and `CSRF_SECRET`. The browser holds the CSRF value in memory only and sends it in `X-CSRF-Token` on `POST`, `PUT`, `PATCH`, and `DELETE`. The server requires both:

- An exact approved `Origin` value.
- A valid session-bound CSRF header.

The Stripe webhook remains exempt because it is protected by Stripe signature verification and must continue receiving its raw request body. Anonymous login, signup, reset, and OTP entry points use the origin check and rate limiting but do not require a pre-existing CSRF token.

Emergency in-process limits are:

- Member login: 10 attempts per IP per 15 minutes and 5 attempts per normalized identity per 15 minutes.
- Admin login: 5 attempts per IP per 15 minutes.
- OTP request: 5 attempts per normalized phone number per 10 minutes and 20 per IP per hour.
- Password-reset request: 5 attempts per normalized identity per hour.

Rate-limit responses use `429` and do not reveal account existence. Express trusts exactly one proxy hop in the production Render topology so the limiter uses the actual client IP. A shared rate-limit store is deferred until multi-instance deployment.

### 6.6 Security headers and safe rendering

Express disables `X-Powered-By` and applies production-safe headers through configured security middleware:

- HSTS in production.
- `X-Content-Type-Options: nosniff`.
- Referrer policy `strict-origin-when-cross-origin`.
- Frame blocking through `frame-ancestors 'none'` or the equivalent header.
- A restrictive permissions policy for features the site does not use.

Because the current pages contain inline bootstrap scripts and third-party authentication resources, Content Security Policy starts in report-only mode in Phase 0 with the exact known origins documented in configuration. An enforcing CSP is promoted only after a local browser smoke test confirms that login, Google authentication, payment, and course pages do not break. The patch must not silently ship `unsafe-eval`.

Affected member, class, replay, resource, and admin rendering paths must stop interpolating server-originated strings into `innerHTML`. They use `textContent`, DOM node creation, safe attribute setters, and strict URL-scheme validation. Where controlled rich text is an intentional product feature, a maintained sanitizer with a minimal tag/attribute allowlist is required. `javascript:`, event-handler attributes, embedded frames, and arbitrary style attributes are rejected.

### 6.7 Protected uploads and media delivery

The public `/uploads` static mount is removed.

Files are delivered by explicit routes that:

1. Resolve a database record by opaque identifier, not by a user-supplied filesystem path.
2. Require the applicable member session and active membership/payment rule, or an admin session.
3. Resolve the canonical file path under the configured upload root and reject traversal after real-path normalization.
4. Set a stored server-defined content type, `nosniff`, and a safe content-disposition filename.
5. Support validated byte ranges for replay video without exposing the underlying path.

Route-specific upload policy is:

- Replay video: MP4 or WebM, maximum 500 MB.
- Member resources: PDF, ZIP, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPEG, or WebP, maximum 50 MB.

Validation checks content signature where the format supports it, not only the browser-supplied MIME type or filename extension. ZIP-based Office documents require both a ZIP signature and the expected extension. Text and CSV files receive UTF/text validation and are always served as attachments. Executable formats, HTML, SVG, scripts, and double-extension disguises are rejected.

Rejected, failed, and aborted uploads are removed from temporary storage. Database writes occur only after successful validation and final placement. Replacing or deleting a media record removes its prior file only after the database operation succeeds and only when the resolved file remains inside the upload root.

### 6.8 Dependency update policy

Upgrade direct vulnerable packages, including Multer and the Wrangler dependency chain, to supported patched versions recorded in `package-lock.json`.

The update process must:

- Review release notes for direct dependency behavior changes.
- Use targeted version updates.
- Run `npm audit` after installation.
- Avoid `npm audit fix --force`.
- Preserve Stripe raw-body webhook ordering and existing database-driver compatibility.

The acceptance target is zero known high or critical vulnerabilities in production and development dependency trees. Any remaining lower-severity issue requires a written package path, exploitability assessment for AiX, and follow-up owner.

### 6.9 Request data flows

Anonymous static request:

`request path -> normalized path -> public manifest lookup -> safe asset response or 404`

Member login and session bootstrap:

`approved Origin + rate limit -> credential verification -> signed HttpOnly cookie -> /api/auth/me -> member projection + in-memory CSRF token`

Authenticated mutation:

`session cookie -> session/member lookup -> exact Origin -> CSRF verification -> validation -> database mutation -> safe response projection`

Protected media request:

`opaque media id -> session/member lookup -> active-access rule -> database media record -> upload-root containment check -> safe full/range response`

No flow accepts a browser bearer token, exposes a filesystem path, or uses client-provided HTML as trusted markup.

## 7. Error and compatibility behavior

- Sensitive and unknown static paths return `404`, not `403`, to avoid confirming existence.
- Unauthenticated protected-page navigation redirects to the canonical member login entry; protected API calls return `401` JSON.
- Authenticated but unauthorized media/API calls return `403` without filesystem or record details.
- Invalid CSRF or Origin checks return `403` with a generic message.
- Old local-storage sessions are treated as logged out and cleared; they are never converted into cookies in browser code.
- Direct historic `/uploads/...` URLs stop working. The UI must rewrite all known replay/resource links to the protected identifier route before the public mount is removed.
- Login responses remain generic so password, OTP, phone, and reset failures cannot be used for account enumeration.

## 8. Verification plan

### Automated security contracts

Add tests proving:

- Public marketing pages and every referenced public asset return `200`.
- `Agent.MD`, `PRODUCT.md`, `.env`, package files, source files, databases, `customer_exports/`, `docs/`, `scripts/`, `tests/`, `tmp/`, outputs, and encoded traversal variants return `404`.
- Member/private `.html` paths cannot bypass their canonical guarded routes.
- Every `/api/*` route is classified in the authorization matrix, and an intentionally unclassified test route fails closed.
- Public course/config projections omit seeded premium, member, secret, unpublished, filesystem, and admin-only fields.
- `cf:prepare` produces only manifest-listed files and fails a seeded sensitive-file scan.
- Member login without a password cannot create a session.
- Password and Google login both preserve a seeded suspended status and issue no session for that account.
- Legacy auth endpoints return `410` and cannot write data.
- Successful login JSON contains no bearer token and sets the expected cookie flags.
- `Authorization: Bearer`, the retired `aix_session` cookie, and client token fields cannot authenticate member or admin APIs.
- Member and admin browser code neither writes nor depends on retired `localStorage` tokens.
- Missing/invalid Origin and CSRF values reject authenticated mutations.
- Approved-origin authenticated mutations succeed.
- Login and OTP limits return `429` at the configured threshold.
- Anonymous upload/media access returns `401`; inactive membership returns `403`.
- Valid paid-member media delivery supports safe range requests.
- Oversized, mismatched, executable, SVG, HTML, and path-disguised uploads are rejected and leave no orphan file.
- Stored payloads containing tags, event attributes, or script URLs render as text or sanitized safe markup.
- Stripe webhook signature and raw-body regression tests continue to pass.
- Production startup rejects missing, reused, default, or below-minimum-strength required secrets and credentials.

### Required commands and browser smoke tests

Before completion, run:

1. The existing homepage contract suite.
2. The new Phase 0 security suite.
3. `npm audit` and record the complete severity result.
4. `npm run cf:check` and scan the prepared tree.
5. `git diff --check`.
6. Desktop and mobile browser smoke tests for public marketing, member login, Google login bootstrap, protected dashboard, course access, replay/resource access, payment start/return, admin login, admin read, admin mutation, logout, and expired-session behavior.

No implementation is complete if only source-pattern tests pass; at least one real browser flow must prove the cookie and CSRF behavior.

## 9. Acceptance criteria

Phase 0 is ready for owner review when all conditions are true:

- There is no unrestricted repository-root or upload-root static mount.
- A single positive publication manifest controls Express and Cloudflare output.
- Every seeded sensitive-path test returns `404` locally.
- Passwordless email-and-phone session creation is impossible.
- Legacy authentication is disabled.
- Member/admin authentication cookies have the specified flags and no authentication bearer remains in client storage or response bodies.
- Authenticated mutations reject missing or invalid Origin/CSRF proofs.
- Authentication abuse limits are test-covered.
- Protected uploads require authorization and pass type, size, path, and cleanup tests.
- Known unsafe server-content render paths are encoded or sanitized and have payload tests.
- Production secret validation fails closed.
- There are zero known high or critical dependency vulnerabilities, or an explicit owner-approved exception exists for a non-exploitable transitive path.
- Existing homepage contracts, Stripe webhook behavior, Cloudflare dry run, and browser smoke tests pass.
- The development update log lists exact files changed, commands run, results, and unresolved risks.
- No production deployment or external mutation occurred.

## 10. Expected implementation surface

The implementation is expected to touch:

- `server.js` for routing, auth cookies, CSRF/origin controls, headers, rate limits, media authorization, upload validation, and startup checks.
- Member and admin browser scripts for cookie-based session bootstrapping, in-memory CSRF handling, safe DOM rendering, protected media URLs, and removal of local-storage bearer usage.
- `package.json` and `package-lock.json` for targeted dependency and test-script changes.
- A new public-manifest/build script and the `cf:prepare` command.
- Security-focused tests plus the existing homepage contracts.
- `.env.example` for non-secret configuration names and safe documentation.
- `docs/development/UPDATE_LOG.MD` for the required implementation record.

The exact diff must remain limited to the emergency controls above. Visual redesign and back-office restructuring begin only after this phase passes review.

## 11. Rollout and rollback boundary

Only the owner's approval of this written specification authorizes local implementation and validation. Until that approval, this document and its update-log entry are the only permitted changes.

Before any later production deployment, a separate approval must cover database and upload backup, secret rotation, origin inventory, preview deployment, CDN behavior, production smoke tests, monitoring, and review of whether the prior exposure requires incident-response action.

Rollback may revert a faulty code deployment, but it must not intentionally restore repository-root exposure, public uploads, passwordless account matching, or browser-stored bearer tokens. A compatibility problem in one of those controls must be fixed forward or placed behind a server-side deny-by-default maintenance response.
