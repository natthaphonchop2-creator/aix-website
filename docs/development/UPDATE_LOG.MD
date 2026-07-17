# AiX Website Development Update Log

This file is the required update record for ongoing development.

Rule: every meaningful code, asset, dependency, deployment, or documentation change must add a new dated entry here before commit. Keep the latest entry at the top.

## 2026-07-18 - Phase 0B Task 1 fail-closed security configuration

Scope:
- Added `security/config-security.cjs` with strict `parseAllowedOrigins()` and production-only `validateSecurityConfig()` contracts.
- Required production `AUTH_SECRET`, `CSRF_SECRET`, and `SMS_OTP_SECRET` values to be distinct, non-default, and at least 32 UTF-8 bytes; required a valid admin email, a non-default admin password of at least 14 characters, and at least one exact HTTPS application origin.
- Normalized only valid exact origins and a single root trailing slash while rejecting malformed URLs, credentials, wildcards, opaque or unsupported schemes, backslashes, internal whitespace, repeated root slashes, and every configured path, query, or fragment, including dot-segment paths a URL parser would otherwise normalize away.
- Wired validation immediately after local environment loading and before `DATA_DIR`, upload directory creation, database opening, or server listen.
- Removed production random signing-secret fallbacks. Development/test fallbacks remain deterministic and retain independent derivation inputs for auth, CSRF, and SMS signing.
- Review follow-up revalidates the canonical hostname/origin after URL parsing, closing percent-encoded wildcard forms while preserving IDN, IPv6, default-port, and root-slash normalization. Encoded credential and authority-delimiter probes continue to fail closed without echoing configured values.
- Review follow-up centralizes the three purpose-specific development signing defaults in the validator module. The server consumes those exact values without duplicating the derivation algorithm or purpose strings, and production rejects each exact predictable fallback while unrelated strong values remain valid.
- Expanded `.env.example` with the exact six-value production security contract and independent secret-generation guidance.
- Added isolated unit and child-process regression coverage without loading local environment files or inheriting real local secrets.

Version:
- `1.0.1` unchanged.

Changed files:
- `security/config-security.cjs`
- `tests/config-security.test.mjs`
- `server.js`
- `.env.example`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Initial RED: `node --test tests/config-security.test.mjs` exited 1 with the expected `MODULE_NOT_FOUND` for `security/config-security.cjs`.
- Startup-wiring RED: after the validator existed but before server wiring, the focused suite ran 31 tests with 30 passing and 1 failing because the weak production child remained alive until the test killed it with `SIGKILL`.
- Focused GREEN: `node --test tests/config-security.test.mjs` passed 31 tests with 0 failures.
- Production startup proof: the focused child used `AIX_SKIP_LOCAL_ENV=1`, weak production values, and an isolated nonexistent `DATA_DIR`; it exited itself nonzero with `Invalid production security configuration: AUTH_SECRET`, left the whole data/database/upload path absent, and preserved the outside sentinel unchanged.
- Full suite: `npm test` passed 138 tests with 0 failures.
- Syntax: `node --check security/config-security.cjs`, `node --check tests/config-security.test.mjs`, and `node --check server.js` passed.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 99 manifest-approved files, Wrangler `4.95.0` read 106 asset-directory files, and stopped at `--dry-run` without deployment.
- Dependency audit: `npm audit --audit-level=high` exited 1 with the unchanged 6 pre-existing advisories (1 low, 5 high) in Multer and the Wrangler development chain; no dependency or lockfile was changed and no automatic fix was applied.
- `git diff --check` and `git diff --cached --check` passed; the cached file list contained exactly the five authorized Task 1 files.
- Independent read-only self-review returned Approved with no concrete blocker.
- Review follow-up RED: `node --test tests/config-security.test.mjs` ran 43 tests with 37 passing and 6 failing exactly at the four percent-encoded wildcard cases, the missing centralized defaults contract, and the server's duplicated local derivation.
- Review follow-up focused GREEN: `node --test tests/config-security.test.mjs` passed 43 tests with 0 failures, including encoded wildcard and authority probes, error redaction, all three purpose-specific production-default rejections, and valid IDN/IPv6 normalization.
- Review follow-up full suite: `npm test` passed 150 tests with 0 failures.
- Review follow-up compatibility probe confirmed all three centralized development defaults exactly match the prior server derivation outputs; source search found the derivation helper and three purpose strings only in `security/config-security.cjs`.
- Review follow-up syntax checks for `security/config-security.cjs`, `tests/config-security.test.mjs`, and `server.js` passed; `git diff --check` passed.
- Review follow-up Cloudflare dry-run exited 0, again preparing 99 manifest-approved files and stopping at Wrangler `--dry-run`; the dependency audit remained unchanged at 6 advisories (1 low, 5 high), with no package or lockfile change and no automatic fix.
- Independent read-only review of the follow-up returned no findings and separately confirmed canonical wildcard rejection, non-echoing authority errors, normalization compatibility, exact derivation compatibility, production default rejection, and removal of duplicated server derivation inputs.

Unresolved risks:
- Production deployment configuration must provision `CSRF_SECRET` and `APP_ORIGINS` in addition to the other required values before the next production start; this task did not inspect, print, or mutate live credentials or deployment state.
- `.env.local` intentionally retains its existing local override precedence unless `AIX_SKIP_LOCAL_ENV=1`; production operators must avoid shipping stale local overrides.
- This task establishes configuration for later cookie, Origin/CSRF, and rate-limit work but intentionally does not change session transport or request enforcement yet.
- The 5 pre-existing high dependency advisories remain assigned to the separate dependency-hardening task.

## 2026-07-18 - Phase 0A Task 4 manifest-driven Cloudflare package

Scope:
- Replaced broad root-level rsync packaging with a canonical-manifest builder that copies only approved existing regular root files and safe image/font assets.
- Added fail-closed destination validation before deletion: the repository root, `cloudflare` parent, and exact `cloudflare/assets` destination must be non-symlinked directories whose canonical paths remain contained.
- Made source traversal and prepared-tree scanning reject or skip symlinks, dotfiles, unsafe extensions, non-regular entries, missing root files, unlisted directories, and canonical escapes.
- Removed private HTML mappings and the health exception from the Cloudflare Worker; login/register redirect to homepage auth modes while every private route family and `/api/*` returns `503`.
- Expanded Worker-first patterns for admin, dashboard, tools-box, live, payment, course start/content/learn, login/register, and API routes.
- Added `test` and `test:security` scripts, preserved all existing scripts, kept Acorn pinned exactly at `8.15.0`, and kept `cf:check` dry-run-only.
- Regenerated the ignored `cloudflare/assets` tree only through the validated builder; generated output was not staged.
- Review follow-up replaced delete-first publication with an unpredictable sibling stage, pre-promotion scan, recoverable backup/promotion renames, post-promotion validation, and rollback to the known-good tree on failure.
- Added an exclusive `wx` builder lock plus parent directory device/inode/canonical identity checks before every rename or removal; cleanup is restricted to invocation-owned stage/backup paths whose identities are revalidated.
- Hardened source copying with `O_NOFOLLOW` and before/after file and directory identity/canonical checks, including deterministic coverage for staging failure, parent replacement, concurrent builders, rollback, and successful artifact cleanup.
- Normalized every trailing slash in the Worker, made exact `/api` and all decoded `/api/*` paths fail closed, rejected malformed encodings, and preserved the original marketing `Request` when passing through to the asset binding.

Changed files:
- `package.json`
- `cloudflare/worker.js`
- `wrangler.jsonc`
- `scripts/prepare-cloudflare-assets.cjs`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Packaging RED: `node --test tests/cloudflare-publication.test.mjs` failed as expected with `Cannot find module '../scripts/prepare-cloudflare-assets.cjs'` before the builder existed.
- Packaging GREEN: `node --test tests/cloudflare-publication.test.mjs` passed: 5 tests, 0 failures, including root-file and asset symlinks, a symlinked Cloudflare parent with an untouched outside sentinel, exact destination rejection, safe regeneration, and unsafe output scanning.
- Worker/config RED: the same focused command ran 8 tests with 5 passing and 3 failing: `/login` returned asset status `200`, `/login/*` was absent from Worker-first patterns, and the root `test` script was undefined.
- Final focused GREEN: `node --test tests/cloudflare-publication.test.mjs` passed: 8 tests, 0 failures.
- Full applicable suite: `npm test` passed: 101 tests, 0 failures.
- Dry-run package check: `npm run cf:check` exited 0, prepared 99 manifest-approved regular files, Wrangler `4.95.0` reported reading 106 files from the assets directory, and `--dry-run: exiting now` confirmed no deploy.
- Final generated-tree scan with `assertSafePreparedTree` validated 99 regular files with 0 denied entries; filesystem checks found 99 files and 0 symlinks.
- Review follow-up RED: `node --test tests/cloudflare-publication.test.mjs` ran 14 tests with 7 passing and 7 failing. The failures proved the old delete-first builder did not preserve the known-good tree on injected staging or post-promotion errors, did not reject parent replacement or concurrent builders, did not normalize repeated auth-route slashes, accepted malformed encodings, and lacked the exact `/api` Worker-first pattern.
- Review follow-up focused GREEN: `node --test tests/cloudflare-publication.test.mjs` passed: 14 tests, 0 failures.
- Review follow-up full suite: `npm test` passed: 107 tests, 0 failures.
- Review follow-up dry-run: `npm run cf:check` exited 0, prepared 99 manifest-approved files, Wrangler `4.95.0` read 106 generated asset-directory files, and exited at `--dry-run` without deployment.
- Review follow-up generated-tree checks: `assertSafePreparedTree` completed successfully; filesystem checks found 99 files, 0 symlinks, and no stage, backup, or lock artifacts.
- Review follow-up `node --check scripts/prepare-cloudflare-assets.cjs` passed.
- `git diff --check` passed with no whitespace errors.
- `git diff --cached --check` passed with no whitespace errors.

Unresolved risks:
- Cloudflare remains a marketing/static surface by design; private pages and all APIs require the Node application origin and intentionally return `503` on the Worker.
- `cloudflare/assets` is generated and ignored; its 99-file count is a working-tree snapshot and changes when manifest-approved source assets change.
- The preserved `cf:deploy` command performs a real deployment if intentionally invoked, but this task ran only `cf:check` with Wrangler `--dry-run` and made no external change.
- Node exposes atomic single-path rename but no single-call directory exchange or directory-handle-relative rename/unlink primitive. The builder therefore uses a recoverable two-rename backup/promotion sequence, so there is a brief interval with no destination; rollback restores the verified known-good backup when validation fails.
- The exclusive lock coordinates this builder, and identity/canonical revalidation makes detected parent/source changes fail safely. A malicious process running as the same local user could still mutate filesystem paths in the interval between a path check and the following Node path-based operation; eliminating that operating-system race is outside the Node API boundary used here.

## 2026-07-18 - v1.0.1 Phase 0A Task 3 explicit API authorization matrix

Scope:
- Added one exhaustive literal `API_ROUTE_POLICIES` contract covering every current `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` declaration under `/api/` exactly once.
- Locked member and admin route declarations to their existing authorization middleware and corrected member logout to require `requireMemberSession`.
- Superseded the review-rejected regex and hand-written tokenizer with Acorn `8.15.0` plus a small generic AST traversal over active `CallExpression` and `MemberExpression` nodes.
- Restricted route collection to direct, non-computed, non-optional `app.<method>(<plain string literal>, ...)` calls and reads middleware identity from the actual AST argument node.
- Added fail-closed AST contracts for malformed JavaScript, dynamic/template paths, computed/optional method access, method aliases, Express routers, literal/computed API mounts, nested/call-result receivers, unsupported API methods, comments, strings, template raw text, and regex literals.
- Bound accepted route calls to the sole exact top-level `const app = express()` declarator and conservatively reject every other `app` variable, function/class name, parameter, catch binding, destructuring/rest/default pattern, reassignment, update, iteration target, and `with` shadow.
- Expanded route-method guards to Express's complete Node HTTP/WebDAV method set plus `all`, while continuing to handle `use` and `route` as mounts/builders; unsupported static API methods, dynamic paths, and detached methods now fail closed.
- Replaced the one dynamic member-page asset registration loop with eight behavior-equivalent literal route registrations so every Express route path is statically reviewable.
- Kept `tests/api-route-policy.test.mjs` below the former custom-parser size at 475 versus 523 lines while increasing coverage to 5 exact-binding fixtures and 34 unsupported/shadowing fixtures.
- Made the anonymous projection check non-vacuous by creating a featured course through the protected admin flow, then requiring an exact approved key set for every public list item and the public detail response.
- Added an explicit public catalog projection so anonymous course responses no longer expose the admin-only `featured` and internal `sortOrder` fields; authenticated admin/member projections remain unchanged.
- Preserved the Stripe raw-body webhook order, Task 2 publication boundary, current session architecture, and local-only scope.

Version:
- `1.0.1` unchanged.

Changed files:
- `tests/api-route-policy.test.mjs`
- `server.js`
- `package.json`
- `package-lock.json`
- `docs/development/UPDATE_LOG.MD`

Validation:
- RED: `node --test tests/api-route-policy.test.mjs` ran 3 tests with 2 passing and 1 failing. The exhaustive route equality and anonymous projections passed; the middleware contract failed specifically because `POST /api/auth/logout` did not declare `requireMemberSession`.
- GREEN focused suite: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs` passed: 8 tests, 0 failures.
- Full applicable suite: `node --test tests/*.test.mjs` passed: 46 tests, 0 failures.
- Review-fix parser RED: `node --test tests/api-route-policy.test.mjs` ran 7 tests with 4 passing and 3 failing. The naive replacement missed a multiline double-quoted route, extracted fake routes from comments/strings, and did not reject computed `app['get']` syntax.
- Review-fix parser GREEN: `node --test tests/api-route-policy.test.mjs` passed: 7 tests, 0 failures after the structural tokenizer/parser replaced the regex.
- Review-fix projection RED: `node --test tests/api-route-policy.test.mjs` ran 7 tests with 6 passing and 1 failing. The non-empty seeded public list contained the unapproved `featured` and `sortOrder` keys.
- Review edge-case RED: `node --test tests/api-route-policy.test.mjs` ran 9 tests with 6 passing and 3 failing. Active calls inside template interpolation were missed, a computed `app.use(prefix, router)` mount was accepted, and regex contents after `if (...)` produced a false route.
- Review edge-case GREEN: `node --test tests/api-route-policy.test.mjs` passed: 9 tests, 0 failures after template-expression tokenization, computed-mount rejection, and control-flow regex recognition were added.
- Review-fix focused GREEN: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs` passed: 14 tests, 0 failures.
- Review-fix full suite: `node --test tests/*.test.mjs` passed: 52 tests, 0 failures.
- AST review RED on the hand-written parser: `node --test tests/api-route-policy.test.mjs` ran 20 tests including table subtests; 14 passed and 6 failed. Closed-block regex text created a false route, while nested `wrapper.app`, call-result receivers, optional app access, and a computed template pathname were not rejected; their parent group also failed.
- Added exact dev dependency `acorn@8.15.0` with `npm install --save-dev --save-exact acorn@8.15.0`; `npm ls acorn --depth=0` resolved exactly `8.15.0`.
- AST integration RED: `node --test tests/api-route-policy.test.mjs` ran 20 tests with 18 passing and 2 failing because the new fail-closed AST contract rejected the existing dynamic member-page asset route at `server.js` line 4067.
- AST integration GREEN: the same suite passed all 20 tests after replacing that loop with literal registrations.
- Method-alias RED: `node --test tests/api-route-policy.test.mjs` ran 22 tests with 19 passing and 3 failing. Computed `app['get'].bind(app)` and direct `app.get` aliases were accepted, and their parent group failed.
- Final AST focused suite: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs` passed: 29 tests, 0 failures.
- Final AST full suite: `node --test tests/*.test.mjs` passed: 67 tests, 0 failures.
- `node --check server.js` and `node --check tests/api-route-policy.test.mjs` passed.
- `npm audit --audit-level=high` completed with exit code 1 and the unchanged 6 pre-existing vulnerabilities: 1 low and 5 high in Multer and the Wrangler development dependency chain. Acorn introduced no advisory and no automatic fix was applied.
- Third-review RED: `node --test tests/api-route-policy.test.mjs` ran 37 tests including subtests; 25 passed and 12 failed. Five exact-binding cases plus their parent failed, and dynamic `options`, detached `all`, function-parameter `app`, nested `const app`, and destructured arrow `app` plus their parent remained open.
- Third-review API GREEN: `node --test tests/api-route-policy.test.mjs` passed: 50 tests, 0 failures after lexical binding and comprehensive Express method guards were added.
- Third-review focused GREEN: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs` passed: 55 tests, 0 failures.
- Third-review full suite: `node --test tests/*.test.mjs` passed: 93 tests, 0 failures.
- Third-review `node --check server.js` and `node --check tests/api-route-policy.test.mjs` passed.
- Third-review `npm audit --audit-level=high` again exited 1 with the unchanged 6 pre-existing vulnerabilities: 1 low and 5 high; package files did not change.
- `git diff --check` passed with no whitespace errors.
- `git diff --cached --check` passed with no whitespace errors.

Unresolved risks:
- The matrix is a source-level regression contract; cookie-only sessions, retired bearer-token rejection, Origin/CSRF checks, and rate limits remain Phase 0B work.
- Anonymous catalog fields are now governed by an explicit allowlist; future intentional public fields must be added to both the projection and exact list/detail contract.
- The two legacy routes classified as `disabled` still retain their existing handlers until the separately scoped legacy-auth shutdown task changes them to intentional `410 Gone` responses.
- The 5 pre-existing high dependency advisories remain open for the dedicated dependency-hardening task; this AST-only dependency change did not run `npm audit fix`.
- Reflective/dynamic constructs such as `Reflect.get(app, "get")` and direct `eval(...)` remain outside this conservative lexical-binding model; neither exists in current `server.js` or the approved route-registration patterns.

## 2026-07-18 - Phase 0A Task 2 Express publication boundary

Scope:
- Replaced unrestricted repository-root static serving with the canonical positive publication manifest from Phase 0A Task 1.
- Removed the public `/uploads` mount and made unknown, sensitive, traversal, and direct private-page requests fail closed with `404`.
- Added explicit public routes for the admin login shell and its exact CSS/JavaScript dependencies; `/admin.html` now canonicalizes to `/admin` with `308`.
- Guarded canonical member pages and their page-specific scripts with the existing member-session helper, without changing authentication behavior reserved for Phase 0B.
- Added an isolated real-HTTP server harness using temporary data/upload directories and deterministic child-process cleanup.
- Preserved the Stripe raw-body webhook before JSON parsing and kept all work local-only with no deployment or external mutation.
- Hardened the review gate with table-driven anonymous checks for every member-only page script plus explicit HEAD, malformed-encoding, and encoded-private-path HTTP coverage.

Changed files:
- `server.js`
- `tests/helpers/server-harness.mjs`
- `tests/publication-boundary.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- RED: `node --test tests/publication-boundary.test.mjs` failed as expected: 0 passed, 3 failed. The real server returned `200` for `/Agent.MD`, returned `200` for anonymous `/tools-box`, and returned an HTML response for an unknown API route.
- GREEN: `node --test tests/publication-boundary.test.mjs` passed: 3 tests, 0 failures.
- Initial focused regression run: `node --test tests/publication-manifest.test.mjs tests/publication-boundary.test.mjs tests/homepage-contract.test.mjs` passed 40 of 41 tests; the only failure was the legacy homepage source contract that still looked for the removed Supabase path denylist. A migration note now records that the positive manifest replaces that legacy check without restoring denylist behavior.
- Final focused regression run: `node --test tests/publication-manifest.test.mjs tests/publication-boundary.test.mjs tests/homepage-contract.test.mjs` passed: 41 tests, 0 failures.
- Full applicable suite: `node --test tests/*.test.mjs` passed: 41 tests, 0 failures.
- Review follow-up focused run: `node --test tests/publication-boundary.test.mjs` passed: 5 tests, 0 failures. All 8 member-only scripts returned `302` or `404`, approved/denied HEAD requests respected the publication boundary, malformed encodings returned only `400` or `404`, and encoded direct-private paths returned `404`.
- Review follow-up full suite: `node --test tests/*.test.mjs` passed: 43 tests, 0 failures. The added probes revealed no server boundary bug, so `server.js` required no follow-up change.
- Review follow-up `git diff --check` and `git diff --cached --check` both passed with no whitespace errors; the cached file list contained only this update log and `tests/publication-boundary.test.mjs`.
- `npm audit --audit-level=high` completed with exit code 1 and reported 6 pre-existing vulnerabilities: 1 low and 5 high in Multer and the Wrangler development dependency chain; no automatic dependency change was made in this task.
- `git diff --check` passed.
- `git diff --cached --check` passed with no whitespace errors.

Unresolved risks:
- Member and admin cookie/session replacement, retired bearer-token rejection, Origin/CSRF enforcement, and rate limits remain Phase 0B work.
- Direct `/uploads/...` URLs are intentionally unavailable; authenticated identifier-based replay/resource delivery remains Phase 0C work.
- Cloudflare packaging does not consume the publication manifest yet and remains a later Phase 0A task.
- The 5 high dependency advisories remain open for the targeted dependency-hardening task; this task did not run `npm audit fix`.

## 2026-07-18 - Phase 0A Task 1 canonical public publication manifest

Scope:
- Added the canonical positive allowlist contract for anonymous root files and safe static assets.
- Defined pathname decoding, traversal/hidden-path/backslash/null-byte rejection, and repository-root containment for resolved public paths.
- Hardened resolution after review: every in-root component must be non-symlinked, the final candidate must be a regular file, and the canonical candidate must remain contained by the canonical repository root.
- Added table-driven coverage for every approved asset extension and representative denied HTML, archive, PDF, and Office extensions.
- Kept this task local-only; Express and Cloudflare consumers remain separate later Phase 0A tasks.

Changed files:
- `security/publication-manifest.cjs`
- `tests/publication-manifest.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- RED: `node --test tests/publication-manifest.test.mjs` failed as expected with `Cannot find module '../security/publication-manifest.cjs'` before the manifest existed.
- GREEN: `node --test tests/publication-manifest.test.mjs` passed: 4 tests, 0 failures.
- Full applicable suite: `node --test tests/*.test.mjs` passed: 36 tests, 0 failures.
- Review-fix RED: `node --test tests/publication-manifest.test.mjs` failed as expected because `resolvePublicPath` returned the lexical in-root path for a file symlink that targeted a temp directory outside the publication root.
- Review-fix GREEN: `node --test tests/publication-manifest.test.mjs` passed: 6 tests, 0 failures, including file-symlink and directory-symlink escape rejection.
- Final applicable suite: `node --test tests/*.test.mjs` passed: 38 tests, 0 failures.
- `git diff --check` passed.
- `git diff --cached --check` passed with no whitespace errors.

Unresolved risks:
- The manifest is not yet enforced by Express static serving or Cloudflare packaging; those integrations are explicitly owned by subsequent Phase 0A tasks.

## 2026-07-18 - Phase 0 implementation plan pack

Scope:
- Converted the approved emergency-hardening design into three ordered, independently testable implementation plans.
- Plan 0A covers the positive public-file manifest, Express/private-page boundary, API authorization matrix, and manifest-driven Cloudflare package.
- Plan 0B covers fail-closed production configuration, member/admin cookie sessions, retired-token denial, suspended-account preservation, Origin/CSRF controls, rate limits, and the shared browser session client.
- Plan 0C covers upload validation and cleanup, protected media delivery, premium tools protection, safe DOM rendering, security headers, patched dependencies, and the final browser/security gate.
- Kept every implementation and validation step local-only; production rollout and external incident-response actions still require separate approval.

Changed files:
- `docs/superpowers/plans/2026-07-18-aix-phase-0a-publication-boundary.md`
- `docs/superpowers/plans/2026-07-18-aix-phase-0b-auth-session-security.md`
- `docs/superpowers/plans/2026-07-18-aix-phase-0c-protected-content-hardening.md`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Confirmed all three plans use the required agentic-worker header, checkbox steps, exact file paths, test-first cycles, expected command results, and focused commit boundaries.
- Checked every approved design section against at least one implementation task and corrected cross-plan interface names for sessions, CSRF, rate limits, media delivery, browser clients, and safe DOM rendering.
- Placeholder scan found no `TBD`, `TODO`, `FIXME`, `implement later`, or unresolved fill-in instructions.
- `git diff --check` passed.
- No runtime source, dependency, lockfile, credential, database, upload, customer export, Cloudflare output, or production state was changed.

## 2026-07-18 - Phase 0 emergency hardening design

Scope:
- Documented the owner-approved decision to lock down the AiX public website and back-office attack surface before visual redesign.
- Defined a local-only emergency phase covering positive static publication, member/admin cookie sessions, removal of passwordless email-and-phone login, CSRF and origin controls, rate limits, protected media, upload validation, safe rendering, dependency updates, and production secret checks.
- Recorded explicit non-goals, compatibility behavior, verification requirements, acceptance criteria, and the boundary that prohibits deployment or external mutation.

Changed files:
- `docs/superpowers/specs/2026-07-18-aix-phase-0-emergency-hardening-design.md`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Reviewed the specification for unresolved placeholders, contradictory scope, untestable acceptance criteria, accidental production authorization, retired-token acceptance, suspended-account behavior, cookie path coverage, and secret-strength requirements.
- `git diff --check` passed.
- No runtime source, dependency, data, customer export, credential, or deployment state was changed.

## 2026-06-11 - v1.0.1 cropped stack hero orbit

Scope:
- Adapted the 21st.dev stack feature section layout direction into the current static homepage Hero without adding React, Next.js, Tailwind, or shadcn dependencies.
- Kept the existing AiX and AI/tool logo assets in the Hero orbit.
- Rebalanced the Hero frame toward a two-column cropped-orbit layout with the center logo half-visible at the right edge.
- Preserved orbit-line logo placement and resized desktop/mobile rings so top and bottom logo nodes are not clipped.
- Updated the homepage contract test to lock the cropped orbit geometry and responsive ring sizes.

Changed files:
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `npx shadcn@latest info --json` confirmed the active root project is `Manual`, with no root shadcn config, TypeScript, or Tailwind setup.
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: center logo is 50% visible at the right edge, 12 existing colored logos load, computed logo filter is `none`, no old orbit icons remain, top/bottom orbit nodes are not clipped, no page overflow, and no console warnings/errors.
- Browser QA 659x765 on `/`: center logo is 50% visible at the right edge, 12 existing colored logos load, top/bottom orbit nodes are not clipped, next section begins within the viewport, no page overflow, and no console warnings/errors.
- Interaction QA: the Hero `ดูวิธีเรียนใน AiX` button scrolls to `#learning-system` with the target positioned below the sticky header.

## 2026-06-11 - v1.0.1 shift orbit logos right

Scope:
- Shifted the stack Hero orbit visual to the right so right-side logos can appear partially cropped at the Hero card edge.
- Reduced desktop and mobile ring sizes and increased the mobile orbit height so top and bottom logo nodes are not clipped.
- Kept logo nodes on the orbit lines by using edge coordinates for left/right nodes.
- Updated the homepage contract test for the new stage position, ring sizes, and mobile orbit sizing.

Changed files:
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: 12 colored logos loaded, computed logo filter is `none`, no old orbit icons remain, top and bottom orbit nodes are not clipped, no page overflow, and no console warnings/errors.
- Browser QA 659x765 on `/`: the orbit is shifted right, one right-side logo is partially visible at about half width, top and bottom orbit nodes are not clipped, 12 colored logos loaded, no old orbit icons remain, no page overflow, and no console warnings/errors.

## 2026-06-11 - v1.0.1 remove hero status pill

Scope:
- Removed the Hero status pill text `สมาชิก AiX Club, 1,999 บาทต่อปี` from the stack Hero.
- Kept the membership section status pill intact.
- Updated the homepage contract test to prevent the removed Hero pill from returning.

Changed files:
- `index.html`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA 659x765 on `/`: Hero status pill is absent, the removed text is absent from Hero, membership status pill remains available, no page overflow, and no console warnings/errors.

## 2026-06-11 - v1.0.1 stack hero colored AI logos

Scope:
- Added 12 provided AI/tool logo assets under `assets/ai-logos/`.
- Replaced the generic Font Awesome orbit icons in the stack Hero with the provided colored logo files.
- Kept the logo images in full color by overriding the homepage grayscale image filter for `.aix-orbit-logo`.
- Moved side orbit nodes from inset positions to the actual left/right ring edges so logos run on the orbit lines.
- Updated the homepage contract test to require the 12 logo assets, colored-logo filter override, and on-line side node coordinates.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `assets/ai-logos/`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: 12 colored orbit logos loaded, computed logo filter is `none`, 3 orbit rings and 12 nodes are present, no old orbit icons remain, no page overflow, and no console warnings/errors.
- Browser QA 659x765 on `/`: 12 colored orbit logos loaded, side nodes use the ring-edge coordinates, next section remains visible, no page overflow, and no console warnings/errors.

## 2026-06-11 - v1.0.1 stack hero logo-only center

Scope:
- Removed the `AiX` text label from the center of the stack Hero orbit so the center shows only the logo.
- Removed the unused center-label CSS and increased the logo size inside the center circle for better visibility.
- Updated the homepage contract test to prevent the center `AiX` span and related CSS from returning.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA at 659x765 on `/`: center text is empty, no center span exists, the logo image is present and larger, old Hero is absent, no page overflow, and no console warnings/errors.

## 2026-06-11 - v1.0.1 stack hero orbit alignment fix

Scope:
- Adjusted the new stack Hero orbit after browser review so the selected stage sits further left and no longer spills out of the desktop Hero card.
- Removed the extra Hero feature list and internal source note text so the Hero content fits inside the frame and the public page does not expose implementation/source wording.
- Increased the Hero frame height slightly and rebalanced the desktop columns so the CTA buttons are fully visible.
- Updated the homepage contract test to lock the centered orbit stage sizing and prevent the internal `Stack Feature Section` copy from returning.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: orbit stage moved left by about 260px, stage and center are inside the Hero card, CTA buttons are inside the frame, old Hero is absent, internal source copy is absent, no page overflow, and no console warnings/errors.
- Browser QA mobile 390x844 on `/`: stack Hero renders, old Hero is absent, internal source copy is absent, CTA buttons stay inside the frame, next section remains visible, no page overflow, and no console warnings/errors.

## 2026-06-11 - v1.0.1 stack feature hero

Scope:
- Replaced the old homepage Hero map with a stack-feature Hero inspired by the 21st.dev `ruixen.ui/stack-feature-section` registry item.
- Kept the implementation in the active Express/HTML homepage instead of importing the React/Next component directly, because the active root is not a shadcn React app.
- Added a neutral token-based orbit stack visual with three rings and 18 icons using the existing Font Awesome assets.
- Tuned desktop and mobile Hero heights so the next section remains visible in the first viewport and no page-level horizontal overflow is introduced.
- Removed the unused CSS from the old `aix-system-map` Hero and updated the homepage contract test to prevent that old Hero from returning.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `npx shadcn@latest info --json` confirmed the active root is not a shadcn project; `old aix-club/` is the available Vite/shadcn project.
- `npx shadcn@latest add https://21st.dev/r/ruixen.ui/stack-feature-section` was run from `old aix-club/`; the registry required pnpm dependencies and then stopped before overwriting existing `button.tsx`, so the root homepage ports the registry component pattern without overwriting existing shadcn UI files.
- Removed the temporary unused `next` and `react-icons` dependency additions from `old aix-club/` after confirming no source files import them.
- `node --test tests/homepage-contract.test.mjs` passed: 7 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: stack Hero present, 3 orbit rings, 18 nodes, old `aix-system-map` absent, no page overflow, no console warnings/errors, next section visible.
- Browser QA mobile 390x844 on `/`: stack Hero present, 3 orbit rings, 18 nodes, no page overflow, no console warnings/errors, next section visible.

## 2026-06-11 - v1.0.1 neutral theme tokens

Scope:
- Added the requested neutral theme tokens to the public stylesheet, including light and dark token sets.
- Bridged legacy AiX CSS variables (`--blue`, `--ink`, `--line`, `--bg`, clean, and UI/UX variables) to the new neutral token set so existing pages inherit the same theme direction.
- Moved existing secondary text usage from `color: var(--muted)` to `color: var(--muted-foreground)` so `--muted` can correctly act as a muted background token.
- Added the reusable theme reference file at `docs/development/AIX_THEME_TOKENS.MD`, including the runtime variables, dark mode variables, Tailwind v4 `@theme inline` bridge, and usage notes.
- Expanded the homepage contract test to verify the theme tokens are installed and documented.

Changed files:
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/AIX_THEME_TOKENS.MD`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 6 tests, 0 failures.
- `rg -n "color:\s*var\(--muted\)" styles.css` returned no matches.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA on `http://localhost:3000/` passed: root tokens matched the requested values, Hero primary and secondary buttons used `#18181b`, sampled Hero card radius resolved to `10px`, and no console warnings/errors were reported.

## 2026-06-11 - v1.0.1 remove homepage hero gray

Scope:
- Removed the gray split background from the homepage Hero and made the Hero background plain white.
- Changed Hero-only supporting text, fact cards, status pill, secondary CTA, and Learning OS map borders from gray treatment to black/white treatment.
- Added a contract test to prevent the old gray split Hero background from returning.

Changed files:
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 5 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA on `http://localhost:3000/` passed: Hero computed `backgroundImage` was `none`, Hero background was white, Hero map/fact borders were black, and no console warnings/errors were reported.

## 2026-06-11 - v1.0.1 remove moving light effects

Scope:
- Removed the public `site-motion.js` and GSAP script includes from every page that loaded the shared motion layer.
- Replaced `site-motion.js` with a no-op so stale links cannot re-enable the old moving light effects.
- Added a site-wide CSS guard that hides the legacy moving light pseudo-elements on cards, trust grids, hero media, final CTA, and process cards.
- Added a contract test to keep the removed moving-light motion layer out of public HTML pages.

Changed files:
- `index.html`
- `auth.html`
- `class-detail.html`
- `course-content.html`
- `course-learn.html`
- `course-start.html`
- `dashboard.html`
- `live-class.html`
- `payment.html`
- `payment-success.html`
- `tools-box.html`
- `site-motion.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `rg -n "site-motion\.js|assets/vendor/gsap\.min\.js" *.html` returned no matches.
- `node --test tests/homepage-contract.test.mjs` passed: 4 tests, 0 failures.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA on `http://localhost:3000/` passed: no motion script tags, no `gsap-hover-card` or `card-accent-active` elements, the sampled card `::before` pseudo-element was hidden, and no console warnings/errors were reported.

## 2026-06-11 - v1.0.1 homepage monochrome palette pass

Scope:
- Retuned the public homepage and homepage header to a controlled white, black, and neutral gray palette.
- Removed the remaining homepage blue, purple, green, amber, and coral accents from the AiX homepage override layer.
- Added homepage-scoped overrides for reused course cards, resource cards, catalog chips, mobile navigation, course visual mockups, badges, and images so global accent styles do not leak into the homepage.
- Preserved the existing homepage layout, copy, membership positioning, and interaction behavior.

Changed files:
- `styles.css`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 3 tests, 0 failures.
- Homepage palette contract command passed: the `.aix-home-header` / `.aix-homepage-redesign` CSS block has no non-monochrome hex/rgb colors and no `oklch()` chroma above `0.001`.
- `git diff --check` passed.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA on `http://localhost:3000/` passed at 1440x900: no rendered non-gray colors in homepage/header computed samples, no horizontal overflow, and no console warnings/errors.
- Browser QA on `http://localhost:3000/` passed at 390x844 with the mobile menu open: no rendered non-gray colors in homepage/header computed samples, no page-level horizontal overflow, and no console warnings/errors.

## 2026-06-04 - v1.0.1 typography and impeccable design pass

Scope:
- Updated the public AiX site font system to a Thai-first pair: `Bai Jamjuree` for body/interface text and `Chakra Petch` for display headings and system labels.
- Replaced old Google Font imports across public HTML pages, removing the previous Noto/Poppins/Open Sans/Inconsolata stack.
- Tuned the homepage design toward the `$impeccable` brand register: clearer type hierarchy, 8px card radius, Thai-first section labels, no numbered scaffold markers, and less generic hero decoration.
- Updated CSS tokens and homepage component rules so headings, labels, price text, map nodes, resource stack, and buttons use the new type system consistently.
- Fixed the course learning progress bar to animate with `transform: scaleX()` instead of layout-changing `width`.
- Removed a legacy side-divider card treatment flagged by the design detector.
- Expanded the homepage contract test to prevent mascot references and old default font stacks from returning.

Changed files:
- `auth.html`
- `class-detail.html`
- `course-content.html`
- `course-learn.html`
- `course-start.html`
- `dashboard.html`
- `index.html`
- `live-class.html`
- `payment.html`
- `payment-success.html`
- `tools-box.html`
- `course-learn.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `output/playwright/`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 3 tests, 0 failures.
- `node .agents/skills/impeccable/scripts/detect.mjs --json index.html styles.css` returned `[]`.
- `npm audit --audit-level=moderate` passed: 0 vulnerabilities.
- `node -e "...spawn('npm',['run','cf:check'])..."` passed with exit code 0, Wrangler `4.95.0` read 174 static assets and completed `--dry-run`.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Old public font/mascot scan returned no matches outside the contract test.
- Browser QA on `http://localhost:3000/` confirmed `Bai Jamjuree` and `Chakra Petch` loaded, no horizontal overflow, no broken images, and no numbered resource markers.
- Browser screenshot evidence captured:
  - `output/playwright/aix-home-impeccable-type-desktop.png`
  - `output/playwright/aix-home-impeccable-type-mobile.png`

## 2026-06-04 - v1.0.1

Scope:
- Rebuilt the AiX Club homepage as a new brand and product system focused on yearly membership, continuous AI learning, and business use cases.
- Removed the rejected mascot and companion visual direction from public HTML, CSS, JavaScript, footer markup, and local homepage generated assets.
- Replaced the homepage hero with an AiX Learning OS system map using the existing AiX logo, structured learning nodes, and no character artwork.
- Updated the member learning panel, resource section, membership section, and footer treatment to use information architecture instead of decorative character imagery.
- Added a Node test contract for homepage structure, no public mascot or companion references, motion safety, and runtime hooks.
- Updated `cf:prepare` to exclude git metadata and local QA artifacts from Cloudflare static preview assets after Wrangler failed on `.git/fsmonitor--daemon.ipc`.

Changed files:
- `index.html`
- `styles.css`
- `script.js`
- `site-footer.js`
- `package.json`
- `tests/homepage-contract.test.mjs`
- `assets/generated/home/` removed
- `docs/development/UPDATE_LOG.MD`
- `output/playwright/`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 3 tests, 0 failures.
- `npm audit --audit-level=moderate` passed: 0 vulnerabilities.
- `node -e "...spawn('npm',['run','cf:check'])..."` passed with exit code 0, Wrangler `4.95.0` read 174 static assets and completed `--dry-run`.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA on `http://localhost:3000/` passed at 1280x720 and 390x844: no banned mascot or companion references, no horizontal overflow, no broken images, 5 course cards, and 4 resource cards.
- Browser CTA check passed: clicking the hero signup button opened `#authModal` with active `#signupPane`.
- Browser screenshot evidence captured:
  - `output/playwright/aix-home-no-mascot-desktop.png`
  - `output/playwright/aix-home-no-mascot-mobile.png`

Notes:
- Local Playwright console may still report Google GSI `403` and "origin is not allowed" errors because the configured Google client ID does not allow `localhost`; this is not from the homepage redesign.
- `cf:prepare` now excludes git metadata, Playwright session files, homepage contract tests, and Playwright screenshots so Cloudflare preview only receives public site assets.

## 2026-05-29 - v1.0.1

Scope:
- Organized development documentation into the new `docs/development/` folder.
- Added root `Agent.MD` as the project operating guide and update rule source.
- Updated project package version from `1.0.0` to `1.0.1`.
- Updated dependencies to the latest npm-reported versions available during this session:
  - `better-sqlite3` `^12.10.0`
  - `stripe` `^22.2.0`
  - `wrangler` `^4.95.0`
- Included newly generated public assets under `assets/generated/`.
- Included quotation PDF output under `output/pdf/`.

Changed files:
- `Agent.MD`
- `docs/development/UPDATE_LOG.MD`
- `package.json`
- `package-lock.json`
- `assets/generated/`
- `output/pdf/`

Validation:
- `npm outdated --json` showed updates were available for `better-sqlite3`, `stripe`, and `wrangler`.
- `npm audit fix` completed successfully.
- `npm audit` result after the fix: 0 known vulnerabilities.
- `npm outdated --json` after updates returned `{}`.
- `npm run cf:check` passed with Wrangler `4.95.0` dry-run and read 1349 files from `cloudflare/assets`.
- `curl -sS http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.

Notes:
- This repo remains an Express + SQLite + disk-upload app for the real API.
- Cloudflare Worker deployment is still a static preview unless API storage is migrated to D1/R2 or proxied to a Node origin.
- Do not move public generated assets without updating all references.
