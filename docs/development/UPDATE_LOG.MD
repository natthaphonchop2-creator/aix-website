# AiX Website Development Update Log

This file is the required update record for ongoing development.

Rule: every meaningful code, asset, dependency, deployment, or documentation change must add a new dated entry here before commit. Keep the latest entry at the top.

## 2026-07-20 - Phase 0C Task 5 browser policy, deployment parity, and responsive closeout

Scope:
- Added one shared browser-header policy for Express and Worker-generated responses: report-only CSP, `nosniff`, strict referrer policy, frame denial, restricted browser permissions, popup-compatible COOP, and production-only HSTS. Express disables framework disclosure, keeps the Stripe raw-body route ahead of JSON parsing, and applies the policy before CORS.
- Made HSTS fail closed unless both `NODE_ENV=production` and `APP_ENV=production`; Render now declares the application environment explicitly. Local development binds to `127.0.0.1`, production defaults to `0.0.0.0`, and the project-specific `AIX_LISTEN_HOST` override is covered by contract tests.
- Added Cloudflare parity without publishing server internals: the preparation step generates a validated root `_headers` file only inside the prepared asset tree, assigns HSTS only to the canonical production host, and retains atomic preparation and path/symlink checks. The Worker adds the shared policy only to responses it generates and leaves static asset responses unchanged.
- Updated Helmet to `8.3.0` and Wrangler to `4.112.0`; retained Multer `2.2.0` and exact LinkeDOM `0.18.13`. The resolved Wrangler chain now uses esbuild `0.28.1`, Miniflare `4.20260714.0`, Undici `7.28.0`, and ws `8.21.0`.
- Added a responsive Admin drawer at 768px and below with a 44px menu control, backdrop, reachable logout, exact expanded/hidden state, inert background content, focus transfer into the drawer, focus restoration on ordinary close, and visible login-email focus after logout/session transitions. Desktop behavior remains unchanged.
- Added deterministic contracts for the browser policy, Render/HSTS behavior, listen-host defaults, Cloudflare generation/Worker parity, and Admin mobile accessibility. The exact named verification script includes all new suites.

Changed files:
- `security/browser-headers.cjs`
- `server.js`
- `render.yaml`
- `cloudflare/worker.js`
- `scripts/prepare-cloudflare-assets.cjs`
- `admin.html`
- `admin.css`
- `admin.js`
- `package.json`
- `package-lock.json`
- `tests/browser-headers.test.mjs`
- `tests/server-listen-contract.test.mjs`
- `tests/admin-mobile-contract.test.mjs`
- `tests/cloudflare-publication.test.mjs`
- `tests/helpers/server-harness.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- TDD RED/GREEN evidence was recorded for the missing header module, absent runtime headers/order, Cloudflare `_headers` and Worker parity, production-environment HSTS gating, explicit loopback binding, and Admin mobile drawer/focus behavior. The final focused group passed 30 tests with 0 failures.
- Named verification: `npm run test:security` passed 261 tests with 0 failures.
- Full regression: `npm test` passed 293 tests with 0 failures.
- Dependency resolution matched Helmet `8.3.0`, Multer `2.2.0`, LinkeDOM `0.18.13`, Wrangler `4.112.0`, esbuild `0.28.1`, Miniflare `4.20260714.0`, Undici `7.28.0`, and ws `8.21.0`.
- Production-only and full dependency audits both returned `found 0 vulnerabilities`.
- `npm run cf:check` prepared 102 manifest-approved assets, Wrangler read 109 files, and the deployment dry-run exited successfully. No deployment occurred.
- Desktop browser QA covered the public homepage, class detail, generic login failure, member registration, unpaid Dashboard, unavailable-payment fallback, authenticated Admin Dashboard, UI-based member entitlement update, active-member Dashboard, Tools Box, course start/content/learning, and member logout.
- Mobile browser QA at 390x844 covered the public homepage, active-member Dashboard, Tools Box, course learning, and logout. Every checked route reported `scrollWidth === innerWidth` with no page-level horizontal overflow. Evidence is retained under `output/playwright/phase0-local/` and remains outside the tracked publication set.
- Local browser console noise was limited to expected anonymous `/api/auth/me` `401` responses and an unapproved `/favicon.ico` `404`; no page-script warning was observed. Further Admin/adversarial browser probing was intentionally skipped at the operator's request after the normal Admin mutation flow had passed.
- Final independent read-only review approved the browser-policy/deployment diff and the corrected Admin drawer semantics with no remaining finding. Syntax checks and `git diff --check` passed.
- A scalar-only read-only query found 2 local member records with neither a password hash nor Google subject. No account or production data was changed.

Current boundaries:
- Real Google OAuth and external Stripe Checkout were not exercised because the isolated environment intentionally had no provider credentials. Disabled/unavailable UI states and automated provider-boundary tests passed; this is not a claim of live provider success.
- Cloudflare validation remained a dry-run. The current Worker is a static-preview boundary and does not replace the Express/SQLite origin for authenticated API flows.
- No deploy, push, pull request, production query, customer-data mutation, credential rotation, CDN purge, or external notification occurred. Pre-existing untracked user files remained outside this task.

## 2026-07-18 - Phase 0C Task 4 safe DOM rendering boundary

Scope:
- Added the frozen UMD `AiXDom` helper with the four approved browser/CommonJS interfaces: `safeUrl`, `node`, `link`, and `replace`. Tags, ordinary attributes, typed properties, and media URL properties are explicit allowlists; anchors can be created only through `link`; server text is assigned through text nodes; and absolute HTTP(S) links receive an authored `_blank` plus `noopener noreferrer` boundary.
- Added a fail-closed URL policy for relative/root/query/hash URLs, canonical credential-free HTTP(S), explicit opt-in `mailto:`/`tel:`, and `about:blank`. It rejects executable or caller-invented schemes, protocol-relative and noncanonical authorities, credentials, controls, markup delimiters, backslashes, malformed percent escapes, encoded schemes, encoded/double-encoded traversal, and prototype-key bypasses while preserving benign percent-encoded path/query values such as Thai filenames and signed download URLs.
- Published `safe-dom.js` explicitly and loaded it after `/aix-api-client.js` but before the renderer on the homepage, class detail, Dashboard, Tools Box, Course Content, Course Learn, and Admin pages. The Cloudflare fixture now copies and validates the same helper.
- Rebuilt every named API/database renderer in `script.js`, `class-detail.js`, `dashboard.js`, `tools-box.js`, `course-content.js`, `course-learn.js`, and `admin.js` with DOM nodes, safe links, fixed class/icon maps, bounded authored styles, typed properties, encoded API path segments, and event listeners instead of HTML interpolation or inline handlers. JSON-LD and AiX Teacher replies remain on non-parsing `textContent` sinks.
- Preserved the existing visual structure and behavior, including the class-modal rainbow CTA marker, Admin table/detail presentation, raw display labels for unknown Admin states, bounded learning progress, valid percent-encoded receipt/media URLs, and fallback behavior for malformed course paths or prototype keys.
- Preserved the Phase 0C Task 2 opaque protected-media projections (`filePath` remains absent) and the Task 3 premium Tools Box fetch, validation, generation, logout, copy, and download lifecycle. The Tools protection VM now loads the real page DOM and real `safe-dom.js` through LinkeDOM instead of a permissive fake DOM.
- Added hostile-DOM unit coverage plus Acorn-enforced source contracts for every affected renderer, script order, publication, fixed-map ownership checks, event listeners, encoded IDs, URL sinks, and the Task 2/3 boundaries. Updated prior homepage/auth/publication contracts only where the approved safe-DOM script and equivalent node structure changed.

Version and dependencies:
- `1.0.1` unchanged.
- Added exact development-only `linkedom@0.18.13` for deterministic browser-DOM security tests; `package-lock.json` records its transitive test dependencies. No production dependency changed and no audit fix was run.

Changed files:
- `safe-dom.js`
- `security/publication-manifest.cjs`
- `index.html`
- `class-detail.html`
- `dashboard.html`
- `tools-box.html`
- `course-content.html`
- `course-learn.html`
- `admin.html`
- `script.js`
- `class-detail.js`
- `dashboard.js`
- `tools-box.js`
- `course-content.js`
- `course-learn.js`
- `admin.js`
- `tests/safe-dom.test.mjs`
- `tests/safe-render-contract.test.mjs`
- `tests/homepage-contract.test.mjs`
- `tests/client-auth-contract.test.mjs`
- `tests/tools-protection.test.mjs`
- `tests/publication-manifest.test.mjs`
- `tests/publication-boundary.test.mjs`
- `tests/cloudflare-publication.test.mjs`
- `package.json`
- `package-lock.json`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Initial Safe DOM/renderer RED: `node --test tests/safe-dom.test.mjs tests/safe-render-contract.test.mjs` ran 20 tests, passed 1, and failed 19 because the helper did not exist and the named renderers still used parsing sinks or lacked the required contracts.
- Hostile URL/attribute review cycles added regressions for caller scheme opt-in, credentialed URLs, runtime IDs, malformed percent escapes, caller `target`/`rel` overrides, root `/`, encoded traversal, numeric entities, and prototype keys before their fixes. The formal-review percent-URL, class-modal marker, and server-icon cycle reproduced 3 failures in a 23-test run, then passed 23/23 after the fixes; the URL-controlled class-detail prototype regression separately failed 0/1 and then passed 1/1.
- Focused Safe DOM and renderer contract: 24/24 passed, including behavioral rejection/clamping for `Infinity`, `NaN`, negative, and over-limit progress values before storage, percentage styles, and learning navigation.
- Homepage and shared-client contract: 54/54 passed.
- Publication manifest/boundary/Cloudflare contract: 25/25 passed.
- Task 2/3 regression group (`upload-policy`, `protected-media`, `tools-protection`, and `api-route-policy`): 90/90 passed.
- Named security suite: `npm run test:security` passed 245 tests with 0 failures.
- Full regression: `npm test` passed 277 tests with 0 failures.
- Cloudflare publication dry-run: `npm run cf:check` prepared 101 manifest-approved assets, read 108 files, and exited successfully at `wrangler deploy --dry-run`; no deployment occurred.
- Production dependency audit: `npm audit --omit=dev --audit-level=high` exited 0 with `found 0 vulnerabilities`.
- Full dependency audit: `npm audit --audit-level=high` exited 1 with the expected development-only 5 findings (1 low, 4 high) in `esbuild`, `undici`, and `ws` through Wrangler/Miniflare. These remain assigned to Phase 0C Task 5; no `npm audit fix` was run.
- Final independent read-only re-review approved the complete diff with no remaining Critical, Important, or Minor finding after the percent-URL, modal CTA, fixed-icon, prototype-key, and finite-progress follow-ups.
- Syntax checks for all eight affected JavaScript files, `git diff --check`, deterministic sink scans, and the prepared-publication scan passed. No server route, CSS, production data, external provider, deploy, push, or pull request was changed or invoked. Pre-existing untracked user files remained outside the task scope.

Unresolved risks:
- `safeUrl` establishes an executable-URL and DOM-injection boundary; it does not establish that an otherwise valid external HTTP(S) destination is trustworthy. Server-side URL governance remains responsible for which external destinations are stored.
- Future API-backed renderers must continue using the helper, fixed authored classes/styles, encoded identifiers, and listener-based actions. The source contracts cover the current named renderer inventory but do not automatically discover future files outside that inventory.
- The existing 4 high development-tool advisories remain open for the separately approved dependency-maintenance task; production dependencies currently audit clean.

## 2026-07-18 - Phase 0C Task 3 protected premium Tools Box library

Scope:
- Moved the complete six-skill and six-prompt premium library out of the anonymously downloadable `tools-box.js` bundle into the server-only `content/tools-library.cjs` module. The 19,057-byte record block is unchanged byte-for-byte; the module returns a fresh structured clone for every request.
- Added cookie-authenticated `GET /api/member/tools`. The route reuses `requireMemberSession`, requires current active paid access, rejects anonymous, retired Bearer, unpaid, expired, suspended, and deleted-member states without returning library records, and sends authorized responses with `Cache-Control: private, no-store`.
- Changed the Tools Box client to begin with empty libraries and request premium data only after `/api/member/dashboard` confirms active access. Both arrays are validated together before rendering; missing, empty, partial, malformed, `402`, `500`, and render-error outcomes clear both libraries without a partial result.
- Added lifecycle generations and logout single-flight handling. Older dashboard/tools success or failure cannot overwrite a newer access state; a `402` between dashboard and tools locks the UI and removes member resources; logout immediately clears premium content, blocks pending responses and duplicate logout calls, and never restores premium content after a failed logout.
- Preserved copy/download behavior for authorized records while stale buttons become inert as soon as the library is cleared. Bumped the Tools Box script cache key.
- Added explicit Node publication checks for direct, encoded, `GET`, and `HEAD` requests to the server-only module. Added Cloudflare builder and prepared-tree checks that exclude or reject `content/`, and wired the deterministic Tools protection suite into the exact named security script.

Version:
- `1.0.1` unchanged. No dependency or lockfile changed.

Changed files:
- `content/tools-library.cjs`
- `tests/tools-protection.test.mjs`
- `server.js`
- `tools-box.js`
- `tools-box.html`
- `tests/api-route-policy.test.mjs`
- `tests/homepage-contract.test.mjs`
- `tests/publication-boundary.test.mjs`
- `tests/cloudflare-publication.test.mjs`
- `package.json`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Initial cross-boundary RED: the selected five-suite run executed 108 tests, passed 98, and failed 10 because the premium records were still public, the server-only module/API did not exist, the route policy was absent, the client rendered locked records, and the cache/publication contracts still described the public bundle.
- Exact move proof: the original contiguous record block is 19,057 bytes with SHA-256 `48db26bced5dfb9d6b48ebfe4de24b9e248c3a24b392aced7e0f462904120445`; the strict-mode module wrapper is 19,234 bytes with SHA-256 `c5398809527b5648cd988779deb022e8ec5a1f36deec4b9c0bf0d57237a230e0`.
- Focused Tools protection suite: `node --test tests/tools-protection.test.mjs` passed 8 tests with 0 failures, covering the full denied-state matrix, independent clones, malformed payloads, access-loss `402`, stale dashboard/tools success and failure, bootstrap races, real copy/download dispatch, stale buttons, logout clearing, and duplicate logout single-flight.
- Cross-boundary focused suite: `node --test tests/tools-protection.test.mjs tests/api-route-policy.test.mjs tests/homepage-contract.test.mjs tests/publication-boundary.test.mjs tests/cloudflare-publication.test.mjs` passed 109 tests with 0 failures.
- Named security suite: `npm run test:security` passed 221 tests with 0 failures.
- Full regression: `npm test` passed 253 tests with 0 failures.
- Cloudflare publication dry-run: `npm run cf:check` prepared 100 manifest-approved assets, read 107 files, and exited successfully at `wrangler deploy --dry-run`; no deployment occurred.
- Production dependency audit: `npm audit --omit=dev --audit-level=high` exited 0 with `found 0 vulnerabilities`.
- Independent local review found and resolved an active-UI/resource residue after a tools `402` and a duplicate-logout race; final review status is recorded in the Task 3 report.
- Cloudflare output scan confirms no `content/` directory or premium marker is present in the prepared public tree.
- No dependency change, audit fix, deploy, push, pull request, external provider call, or production query was performed. Pre-existing untracked user files remained outside the task scope.

Unresolved risks:
- Premium content intentionally exists in an authorized member's browser after delivery and can be copied or downloaded. A later server-side expiry cannot retract data already delivered; the next dashboard/tools request, logout, or navigation enforces the newer state. `private, no-store` prevents intended shared/storage caching but cannot prevent an authorized user from retaining content.

## 2026-07-18 - Phase 0C Task 2 review follow-up: hide unfeatured course resources

Scope:
- Fixed the formal Task 2 review finding in `/api/member/dashboard`: an active member now receives global member resources (`courseId = ''`) plus resources joined to a currently featured course, matching protected-media delivery semantics. Resources assigned to an unfeatured or missing course are omitted before their metadata or external URL is projected.
- Kept the Admin resource inventory unchanged so an authenticated Admin can still manage and preview both local uploads and external links assigned to unfeatured courses.
- Added an isolated integration regression covering an unfeatured local upload and external URL, Admin visibility for both, and preservation of explicit global and featured-course resources.

Version:
- `1.0.1` unchanged. No dependency or lockfile changed.

Changed files:
- `server.js`
- `tests/protected-media.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Focused RED: `node --test --test-name-pattern='member dashboard hides unfeatured-course resources' tests/protected-media.test.mjs` failed 0 of 1 at the hidden-local assertion because the dashboard returned the unfeatured resource (`true !== false`).
- Focused GREEN: the same command passed 1 test with 0 failures after the dashboard query-only fix.
- Protected-media suite: `node --test tests/protected-media.test.mjs` passed 15 tests with 0 failures.
- Named security suite: `npm run test:security` passed 213 tests with 0 failures.
- Full regression: `npm test` passed 245 tests with 0 failures.
- Cloudflare publication dry-run: `npm run cf:check` prepared 100 manifest-approved assets, read 107 files, and exited successfully at `wrangler deploy --dry-run`; no deployment occurred.
- Production dependency audit: `npm audit --omit=dev` exited 0 with `found 0 vulnerabilities`.
- No dependency change, audit fix, deploy, push, pull request, external provider call, or production query was performed. Pre-existing untracked user files remained outside the task scope.

Unresolved risks:
- No new residual risk was introduced. The protected-media architecture and operating assumptions recorded in the main Task 2 entry remain unchanged.

## 2026-07-18 - Phase 0C Task 2 protected member media and opaque upload projections

Scope:
- Added cookie-authenticated `GET`/`HEAD` delivery at `/api/media/replays/:id` and `/api/media/resources/:id`. Active paid members can access only member-visible assets belonging to featured courses (or global member resources); the configured Admin session can preview hidden/unfeatured assets. Retired bearer and cookie credentials remain rejected.
- Added strict single-range delivery for bounded, open-ended, suffix, and clamped byte ranges, including exact `200`, `206`, and `416` headers, zero-byte files, and body-free `HEAD`. Responses send server-defined content types, `nosniff`, `private, no-store`, and injection-safe dual ASCII/RFC 5987 `Content-Disposition` filenames whose extension comes from the stored validated file. Node's stream `pipeline` now owns both ends, destroys the source, and closes the file handle when a client terminates a large response early; open/read errors are also deterministic.
- Bound every delivery to one exact replay/resource filename beneath the expected family. Lexical traversal, encoded separators, the wrong upload family, nested paths, missing files, directories, final symlinks, and symlinked ancestors fail closed. Delivery opens a no-follow regular file handle and verifies its identity before streaming; raw `/uploads/...` paths remain unpublished for both `GET` and `HEAD`.
- Replaced direct-to-final Multer writes with route-specific owner-only staging directories under the application upload root. Replay and resource routes use the Task 1 policies' exact 500 MB and 50 MB limits plus finite one-file, eight-field, ten-part, 100-byte field-name, 16 KB field-value, and flat-body boundaries. Eight fields is the smallest value compatible with the current resource form; exact body allowlists and scalar-only values reject unknown, nested, and duplicate fields even within the transport limits.
- Integrated staged validation and atomic placement into replay/resource create and update handlers. Database failure removes the newly placed file; a successful database replacement precedes deletion of the old contained file; delete removes the row before the old file. No asynchronous filesystem operation runs inside a database transaction. Rejected, oversized, aborted, and forced SQLite-failure requests are compensated without leaving a staged file or unintended row during the tested process lifetime. Multipart, validation/filesystem, and database failures use fixed or allowlisted JSON messages and never return low-level error text, SQL trigger details, or staging paths.
- Removed `filePath` from every member/Admin projection and authorized browser consumer, including adversarially nested course JSON and resource tags. Member objects use opaque `mediaUrl` plus protected `videoUrl`/`url`; Admin receives only `hasUpload` and the same protected preview URL. Safe root-relative and credential-free HTTPS links are preserved, while direct, encoded, and double-encoded upload/traversal/backslash/control paths plus HTTP, protocol-relative, credentialed, JavaScript, and data URLs are stripped.
- Updated Course Content/Learn playback and download links, Dashboard and Tools Box resource links, and Admin replay/resource previews to consume protected URLs. Admin forms now advertise only `.mp4,.webm` at 500 MB and the exact resource extension set at 50 MB.
- Added the protected-media routes to the AST route-policy inventory and added the new deterministic integration suite to the exact named `test:security` command and its package-script contract.

Version:
- `1.0.1` unchanged. No dependency or lockfile changed.

Changed files:
- `security/media-delivery.cjs`
- `tests/protected-media.test.mjs`
- `server.js`
- `dashboard.js`
- `tools-box.js`
- `course-content.js`
- `course-learn.js`
- `admin.js`
- `admin.html`
- `tests/api-route-policy.test.mjs`
- `package.json`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Initial module RED: the first protected-media run exited 1 with `MODULE_NOT_FOUND` for `../security/media-delivery.cjs`, proving the contract ran before implementation.
- Focused range/auth/policy RED-GREEN: byte-range unit tests passed 2 of 2 after the parser was added; anonymous media initially returned `404` instead of `401`, and the AST inventory initially lacked both protected routes. Cookie-only authorization and exact `allowMediaSession` route declarations made both selected groups pass.
- Delivery RED-GREEN: the first range request returned `200` instead of `206`, and the first traversal fixture returned `200`. Contained file-handle delivery, complete range/HEAD behavior, exact-family resolution, and symlink/regular-file checks made both selected groups pass 2 of 2.
- Stream-lifecycle review RED-GREEN: a deterministic destination-abort test showed the initial manual `res.close` Promise resolved with `source.destroyed === false`, leaving the FileHandle stream open. Replacing it with `pipeline` made the real handle reject further `stat` calls as closed; injected open and read failures propagate, and the read-failure source is destroyed and closed.
- Projection and filename RED-GREEN: the first member payload recursively exposed `resources[0].filePath`, and the first Thai filename response lacked a safe dual filename header. Opaque projections and sanitized ASCII plus RFC 5987 disposition generation made both focused groups pass. Pre-commit review then injected `filePath` into nested course skills/tools/outcomes/info/syllabus/FAQ/brand data and resource tags; the anonymous catalog failed at `response.skills[0].filePath`. Deep response sanitization made anonymous, member, and Admin recursive guards pass. The URL-normalization expansion also failed on a valid encoded-percent root-relative path; bounded decoding now preserves it while rejecting direct, encoded, and double-encoded unsafe variants.
- Multipart RED-GREEN: an HTML-disguised PDF initially returned `200`; staging validation and body boundaries made the selected upload matrix pass. A later minimal duplicate `title` body reproduced an unintended `200`; scalar-only field validation changed it to `400`. Removing the staging destination then reproduced a raw `ENOENT` response containing its absolute `.staging` path; fixed multipart and validation error mapping now returns generic JSON. The matrix also covers unknown/nested fields, long field names/values, a second file, a 50 MB plus one-byte resource, exact owner-only directory modes, no residual staging files, and no unintended rows.
- Lifecycle RED-GREEN: forced SQLite insert/update/delete failures for resources and replays verify database-first ownership transitions, preservation of the old file/row on failed mutations, removal of a newly placed file on failed database work, and old-file deletion only after successful replacement. Their first disclosure assertions received Express `text/html` instead of generic JSON; create/update/delete now return one fixed JSON `500` without SQL, trigger, upload-name, or path details. The first resource trigger fixture also exposed an over-tight Busboy `parts` threshold; the smallest compatible value (`10`) made both lifecycle groups pass 2 of 2. A raw-socket abort regression passes with no staged file or row.
- Client/package RED-GREEN: the authorized-client source contract first failed on `dashboard.js` consuming `resource.filePath`, then passed after all five browser consumers and Admin were migrated. The package-script contract then failed because `test:security` did not include `tests/protected-media.test.mjs`, and passed after exact wiring.
- Focused protected-media suite: `node --test tests/protected-media.test.mjs` passed 14 tests with 0 failures.
- Cross-boundary focused suite: `node --test tests/upload-policy.test.mjs tests/protected-media.test.mjs tests/client-auth-contract.test.mjs tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs tests/cloudflare-publication.test.mjs` passed 122 tests with 0 failures.
- Named security suite: `npm run test:security` passed 212 tests with 0 failures.
- Full regression: `npm test` passed 244 tests with 0 failures.
- Production dependency audit: `npm audit --omit=dev` exited 0 with `found 0 vulnerabilities`.
- Full dependency audit: `npm audit --audit-level=high` exited 1 with the expected 5 development findings (1 low, 4 high) in `esbuild`, `undici`, and `ws` through Wrangler/Miniflare. No audit fix or dependency change was applied.
- No external provider call, production query, deployment, push, pull request, or other external-state mutation was performed. Pre-existing untracked user files remained outside the task scope.

Unresolved risks:
- Runtime exceptions and request aborts have deterministic compensating cleanup, but a process or host crash can still leave a staged file, a newly placed file before its database insert, an old file after a successful replacement, or a file after its row was deleted. No startup/background reconciliation job is included in this task; operators should reconcile upload directories against database references after an unclean shutdown.
- Path and inode checks assume the upload root and all staging/final directories are application-owned and remain owner-only (`0700`). Portable Node APIs cannot eliminate every parent-component time-of-check/time-of-use race against a malicious same-UID local process; this is not claimed as a hostile local-user boundary.
- Existing legacy files are path/identity checked during delivery but are not retroactively signature-scanned on every read. Newly uploaded files pass the Task 1 signature/container policy before placement. Signature checks are not malware scanning or content disarm.
- Large replay ranges are streamed by the Node process rather than an authenticated object-storage/CDN layer. That architecture and the 4 known high development-dependency advisories remain follow-up work.

## 2026-07-18 - Phase 0C Task 1 staged upload validation and safe lifecycle

Scope:
- Upgraded Multer from `^2.1.1` to `^2.2.0` without `--force` or an automatic audit fix. Added the upload-policy suite to the exact named `test:security` command and synchronized its package-script publication contract.
- Added centralized replay and resource policies with exact 500 MB and 50 MB limits. Validation rejects missing or mismatched reported sizes, non-positive/non-finite values, actual oversize files, non-regular staged paths, symlinks, and a staged inode that changes during validation.
- Added strict upload-name validation for both slash styles, NUL/control and bidirectional-control characters, dotfiles, traversal-like names, unsupported types, platform-reserved names, dangerous inner extensions, and allowed-type double-extension disguises. Generated server filenames retain a UTF-8-byte-bounded safe Unicode/alphanumeric basename behind a timestamp plus 128-bit random prefix and a canonical lowercase extension.
- Added bounded format validation for a recognized PDF version header, PNG signature plus IHDR dimensions/CRC, JPEG, RIFF-sized WebP, bounded MP4 `ftyp`, and WebM EBML plus `webm` DocType; complete chunked UTF-8 validation for TXT/CSV with binary-control and leading-markup denial; and bounded ZIP central/local directory parsing. DOCX, XLSX, and PPTX additionally reject ZIP64 sentinels, preflight every entry against a 64 MB per-entry cap, 256 MB aggregate uncompressed cap, and 200x compression-ratio cap, then bounded-read/decompress and verify actual size plus CRC for every archive entry. Required metadata/main parts use tighter limits, are parsed as actual namespace-qualified XML tags/attributes, reject DTD/entity/CDATA/comment spoofing, and require the exact format-specific main XML root.
- Added exact lexical containment, validated-object and inode binding, safe directory creation that rejects symlinked intermediates, bounded collision retries, and atomic no-clobber hard-link promotion. Placement verifies that the destination is the same validated regular inode before removing the staged name, so no partially copied final path is exposed. Contained deletion rejects traversal, symlinked roots/parents/targets, directories, and missing files with a safe boolean result.
- Kept `server.js` unchanged. Route integration, staging middleware, and protected media delivery remain intentionally assigned to the next Phase 0C task.

Version:
- `1.0.1` unchanged.

Changed files:
- `security/upload-policy.cjs`
- `tests/upload-policy.test.mjs`
- `package.json`
- `package-lock.json`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Dependency upgrade: `npm install multer@2.2.0` completed successfully, changed only the declared/locked Multer release, and did not run `--force` or `npm audit fix`.
- Initial module RED: `node --test tests/upload-policy.test.mjs` exited 1 with `MODULE_NOT_FOUND` for `../security/upload-policy.cjs`, proving the new contract ran before production code existed.
- Initial GREEN cycle: the first implementation run passed 13 of 15 tests. It exposed uppercase-extension duplication in generated filenames and an invalid FileHandle prototype instrumentation assumption; after correcting the filename implementation and wrapping the actual handle close method, the suite passed 15 of 15.
- Named-script RED/GREEN: the selected Cloudflare package-script contract failed 0 of 1 because `package.json` did not yet contain `tests/upload-policy.test.mjs`, then passed 1 of 1 after the exact script was updated.
- Atomic-placement review RED: the inode regression failed 0 of 1 against the initial exclusive-copy placement because the destination had a different inode. Replacing that path with no-clobber `fs.link` promotion made the placement and collision regressions pass 2 of 2 and ensured the final path is never a visible partial copy.
- Symlinked-destination RED/GREEN: an existing destination reached through a symlinked intermediate initially produced `Missing expected rejection`; walking from the staged/destination common ancestor and rejecting every symlinked component made the selected placement regressions pass 3 of 3.
- Filename-boundary RED/GREEN: 200 Thai characters initially generated a 291-byte server filename and failed the exact 240-byte ceiling. UTF-8-aware basename truncation made the selected filename regression pass 1 of 1 without splitting a code point. Additional dangerous inner-extension cases for `.lnk` and `.ps1` first reached disk lookup and then failed before disk access after the denylist was completed.
- Independent Office review RED/GREEN: required marker strings placed only in XML comments initially passed, proving substring matching did not establish an Office structure. New regressions also cover a wrong-namespace prefix, duplicate main overrides/relationships, garbage or entity-bearing main XML, mismatched CRC, excessive compression ratio, and an advertised `0xffffffff` main size. The selected valid/rejection matrix and all deflated DOCX/XLSX/PPTX fixtures passed 2 of 2 after structural parsing and bounded reads were added.
- Office whole-archive re-review RED/GREEN: a DOCX with a CRC-corrupted extra media part initially produced `Missing expected rejection: extra-crc.docx`, proving validation was limited to the three required XML parts. The implementation now preflights all central entries before decompression, rejects ZIP64 size/offset/count sentinels, applies the documented per-entry/aggregate/ratio limits, and bounded-validates size and CRC for every entry while retaining only the required XML buffers. The selected matrix passed 2 of 2 with a valid extra media part and rejection of corrupted, `0xffffffff`-advertised, over-64-MB per-entry, and over-256-MB aggregate advertised extra parts; the focused suite passed 17 of 17.
- Signature-review RED/GREEN: invalid PDF versions, PNG signature-only data, WebM signature-only data, and a Matroska DocType initially passed their shared magic prefixes. Recognized PDF versions, PNG IHDR/CRC, and bounded EBML DocType validation made the selected signature matrix pass 2 of 2.
- Final focused suite: `node --test tests/upload-policy.test.mjs` passed 17 tests with 0 failures.
- Production dependency audit: `npm audit --omit=dev` exited 0 with `found 0 vulnerabilities`; Multer has no remaining production high/critical finding.
- Named security suite: `npm run test:security` passed 198 tests with 0 failures.
- Full regression: `npm test` passed 230 tests with 0 failures.
- Full dependency audit: `npm audit --audit-level=high` exited 1 with 5 known development findings (1 low, 4 high) in `esbuild`, `undici`, and `ws` through the Wrangler/Miniflare development chain. No dependency outside the authorized Multer upgrade and no automatic fix was applied.
- Independent review history: the first Office review found substring-only structure validation and an explicitly documented same-UID local-race boundary; structural namespace-qualified XML checks and owner-only-root guidance resolved them. Re-review then found unverified extra Office entries; the whole-archive RED/GREEN fix added entry-wide limits, decompression, size, and CRC checks. The final read-only verdict was Approved with no remaining Critical, Important, or Minor finding.
- No external provider call, production query, deployment, or other external-state mutation was performed. Pre-existing untracked user files remained outside the task scope.

Unresolved risks:
- Atomic hard-link promotion intentionally requires the staged and final upload directories to reside on the same filesystem. The next integration task must create staging beneath the upload root and clean staged/final files around database failures.
- Portable Node path APIs cannot make the lstat/link/unlink sequence race-proof against a malicious same-UID local process without directory-file-descriptor `openat`/`linkat`/`unlinkat` primitives. Staging and upload roots are trusted application-owned paths; the next integration task must create them owner-only (`0700`) and must not claim a same-UID local-adversary boundary.
- Signature and Office-container checks provide bounded type validation; they are not malware scanning or content-disarm services. Generic ZIP contents are never extracted by this module.
- The 4 known high development-dependency advisories remain assigned to dependency hardening. `server.js` does not consume this policy until the separately reviewed upload-route task.

## 2026-07-18 - Phase 0B Task 5 real authentication integration and abuse proof

Scope:
- Added real child-server integration coverage for member registration with explicit consent, password login, passwordless-login denial, cookie-only authentication, session-bound CSRF, and the recursive absence of `token`, `authToken`, `adminToken`, `sessionToken`, `accessToken`, `refreshToken`, `idToken`, `jwt`, and `bearerToken` response fields at every object/array depth. Test-mode member and Admin cookies are checked for exact lifetime/order, `HttpOnly`, `Path=/`, expected `SameSite`, no `Domain`, and no `Secure`.
- Proved that a retired `Authorization: Bearer` header is rejected both alone and when paired with a valid `aix_member_session`; the retired `aix_session` cookie is denied and expired; and a browser token field in a login body is rejected. No bearer-like response credential is accepted as a substitute for the HttpOnly session cookie.
- Exercised the complete member logout denial matrix over HTTP: missing Origin, missing CSRF, wrong CSRF, another session's CSRF, and `https://evil.invalid` each return `403`. The member session remains valid after every denied attempt; the exact Origin plus matching session CSRF returns `200` with exactly two ordered host-only expiration headers for `aix_member_session` and the retired `aix_session`.
- Verified the retired `/api/auth/signup` and `/api/auth/login` endpoints return `410`, and a fresh Admin limiter returns five `401` responses followed by a sixth `429` with one canonical exact-key draft-8 directive each for `r=0`, `q=5`, and `w=900`; malformed, bare, or duplicate exact-key parameters fail. No legacy `X-RateLimit-*` header or `ERR_ERL_` diagnostic is present.
- Exercised suspension through the real flow: register a member, perform a real Admin password login, restore the Admin session and CSRF, update that member to `suspended`, then prove both the existing member cookie and a correct password login return `401`. The test harness uses only its isolated local database and loopback server; no Google, SMS, Stripe, Supabase, production, or other provider request is made.
- Added the integration suite to the exact named `test:security` command and updated the package-script publication contract. No `server.js` or API route-policy change was needed because the new behavioral tests found no implementation defect.

Version:
- `1.0.1` unchanged.

Changed files:
- `tests/auth-integration.test.mjs`
- `package.json`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Initial behavioral run: `node --test tests/auth-integration.test.mjs` passed 4 tests with 0 failures on the existing server implementation. This was a valid no-defect result rather than an invented server failure.
- Script-contract RED: the selected `cloudflare-publication` package-script test failed 0 of 1 with `ERR_ASSERTION` because the actual `test:security` string ended at `tests/client-auth-contract.test.mjs` while the expected string also included `tests/auth-integration.test.mjs`.
- Minimal GREEN: after appending only the new integration path to `package.json`, the integration suite passed 4 of 4 and the selected package-script contract passed 1 of 1. The later valid-cookie-plus-bearer and cross-Origin/session-preservation additions also passed 4 of 4 immediately, confirming no `server.js` fix was justified.
- Independent-review regression RED: after adding a nested response-field guard proof, `node --test tests/auth-integration.test.mjs` ran 5 tests with 4 passing and 1 failing at `Missing expected exception (AssertionError): token`; this demonstrated that the original top-level-only helper could pass vacuously. The exact retired-cookie and logout-cookie-set checks already passed against the intended two-cookie server behavior.
- Review GREEN: the response guard now recursively inspects every object and array and reports the full response path; the focused integration suite passed 5 of 5. Logout assertions compare the complete ordered `Set-Cookie` arrays, so missing, duplicate, reordered, or extra cookies/attributes fail.
- Formal-review limiter RED: the selected helper regression failed 0 of 1 at `Missing expected exception (AssertionError): r=0`, proving the earlier `/r=0/`, `/q=5/`, and `/w=900/` substring checks could incorrectly accept `r=01`, `q=50`, `w=9000`, or a suffixed key such as `xr=0`.
- Limiter GREEN: the assertion now parses semicolon parameters, requires an exact directive key, a canonical integer, and exactly one expected value without depending on the display label or dynamic reset `t`; the selected regression passed 1 of 1 and the real integration suite passed 6 of 6.
- Parser re-review RED: the selected helper regression failed 0 of 1 at `Missing expected exception (AssertionError): "ignored"; q=05; q=5; w=900`, proving that filtering malformed values before counting could let one malformed and one valid exact-key directive pass.
- Parser hardening GREEN: every raw segment with the exact case-insensitive key before its first `=`—or the bare key itself—is counted before value validation. The assertion requires exactly one occurrence whose complete trimmed segment equals canonical `key=value`; regressions cover malformed-plus-valid, bare-plus-valid, duplicate valid, extra `=`, explicit `+`, leading zero, numeric prefix, and suffixed key. The selected regression passed 1 of 1 and the real integration suite passed 6 of 6.
- Focused authentication gate: `node --test tests/config-security.test.mjs tests/session-security.test.mjs tests/http-security.test.mjs tests/client-auth-contract.test.mjs tests/auth-integration.test.mjs tests/api-route-policy.test.mjs` passed 156 tests with 0 failures.
- Named security suite: `npm run test:security` passed 181 tests with 0 failures.
- Full regression: `npm test` passed 213 tests with 0 failures.
- Syntax and diff: `node --check` passed for both changed test files, and `git diff --check` passed.
- Local compatibility snapshot: the required read-only `node --no-warnings` SQLite command printed only `{"inaccessiblePasswordAccounts":2}`. No local row was mutated or identified. Fresh integration fixtures use isolated temporary test databases and are not reported as the repository compatibility count.
- Dependency audit: `npm audit --audit-level=high` exited 1 with the known 6 advisories (1 low, 5 high) in Multer and the Wrangler development chain. No dependency, lockfile, or automatic audit fix was applied.
- No external provider call, production query, deployment, or other external-state mutation was performed. Pre-existing untracked user files remained outside the task scope.
- Independent review history: the first pass found two Important issues in nested bearer-field and cookie-set assertions, and later formal review found one Minor numeric-prefix false-positive; all were fixed and approved. Parser re-review then found one additional Minor malformed-duplicate gap. After the count-before-validation RED/GREEN fix, the final read-only verdict was Approved with no remaining Critical, Important, or Minor finding. `server.js` and `tests/api-route-policy.test.mjs` remained unchanged.

Unresolved risks:
- The two locally counted members without either a password hash or Google subject remain a compatibility/recovery follow-up; this task intentionally did not inspect identifiers or alter account records.
- The 5 known high dependency advisories remain assigned to dependency hardening.
- This gate proves the local Node/SQLite authentication path. Production deployment and production-data validation were not authorized or performed.

## 2026-07-18 - Phase 0B Task 4 formal review logout follow-up

Scope:
- Added one shared `logout(path)` transaction to the cookie/CSRF browser client. A logout becomes terminal only after a `2xx` response or a `401` from the authenticated logout/session check, because those outcomes confirm that the HttpOnly cookie is no longer an authenticated session.
- A logout `403` now refreshes the session CSRF token without discarding the last usable token, then retries the logout exactly once. Network errors, `5xx`, a second `403`, invalid refresh data, or a stale auth epoch reject the operation while preserving the authenticated client/UI state; no false success is announced.
- Epoch checks cover the direct logout, session refresh, retry preflight, request completion, and terminal clear. A pending older logout cannot clear state, send a retry against, or transition UI for a newer login lifecycle.
- Migrated Homepage, Dashboard, Tools Box, and Admin logout handlers to the shared transaction. Each surface now shows an explicit logout failure and returns before guest-state mutation or redirect. Successful member/admin cleanup runs only after the client confirms a terminal outcome.
- Admin login now copies the password into the request-local value and clears the password DOM field before the first network await, covering both success and failure. Both the logged-in layout and logged-out/login view clear the field again so browser autofill or a restored session cannot leave the secret in a hidden DOM node.
- This entry supersedes the original Task 4 statement that every failed logout clears local state. Failed logout attempts now intentionally retain authenticated state unless a `401` confirms the session is already unauthenticated.

Version:
- `1.0.1` unchanged.

Changed files:
- `aix-api-client.js`
- `script.js`
- `dashboard.js`
- `tools-box.js`
- `admin.js`
- `tests/client-auth-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Follow-up RED: `node --test tests/client-auth-contract.test.mjs` ran 21 tests with 15 passing and 6 failing at the intentionally missing client logout transaction, all four unsafe surface handlers, and Admin password lifecycle.
- Initial client GREEN: the first implementation passed 21 of 21 after one intermediate 20-of-21 run showed only an over-specific source assertion that rejected valid object-property shorthand; accepting both equivalent JavaScript forms restored the intended lifecycle proof without weakening it.
- Independent-review race RED/GREEN: after the first `403` refresh completed, a concurrent login could adopt a newer token in the microtask gap before the retry. The deterministic target first failed 0 of 1 because the retry was sent (`2 !== 1` logout calls). It passed 1 of 1 after an epoch assertion was added synchronously at the start of the retry request; the proof confirms only the old token was sent, the newer token remained adopted, and no retry reached `fetch`.
- Final client GREEN: `node --test tests/client-auth-contract.test.mjs` passed 22 tests with 0 failures.
- Focused GREEN: `node --test tests/client-auth-contract.test.mjs tests/homepage-contract.test.mjs tests/publication-manifest.test.mjs` passed 60 tests with 0 failures.
- Named security suite: `npm run test:security` passed 175 tests with 0 failures.
- Full regression: `npm test` passed 207 tests with 0 failures.
- Syntax: `node --check` passed for the shared client, four changed page scripts, and client contract.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 100 manifest-approved files, Wrangler `4.95.0` read 107 generated asset-directory files, and stopped at `--dry-run` without deployment.
- `git diff --check` passed; pre-existing untracked user assets remained outside the task scope.
- Independent read-only follow-up: Approved with no remaining Critical, Important, or Minor finding after verifying the pre-request epoch guard, deterministic sent-token regression, 22-of-22 client contract, and clean diff.

Unresolved risks:
- A network or server failure intentionally leaves the authenticated UI visible because the HttpOnly session may still be valid. The explicit error asks the user to retry rather than claiming a logout that the server did not confirm.
- A `401` from either the authenticated logout endpoint or its session refresh is treated as terminal because the cookie no longer authenticates. Other refresh failures fail closed and retain state.
- No deployment was performed in this follow-up.

## 2026-07-18 - Phase 0B Task 4 shared cookie and CSRF browser client

Scope:
- Added `aix-api-client.js` as the single browser request boundary. Every request target is canonicalized and rejected before `fetch` unless it is exact same-origin HTTP(S); `fetch` receives the validated absolute URL rather than a document-base-relative string. Caller-supplied `Authorization`, `X-CSRF-Token`, credential modes, and redirect modes cannot override the client. Fetch credentials are always `same-origin` and redirects fail closed, preventing CSRF leakage through either a malicious `<base>` element or cross-origin `307`/`308` redirect.
- Kept each CSRF token in one page-client closure only. Clients expose `request`, raw `Response` access for Admin, session `bootstrap`, explicit auth-response `adopt`, deliberate `clear`, and a read-only token getter. Failed bootstrap and logout clear the in-memory token, separately created member/admin/page clients do not share token state, and a private epoch prevents a stale startup bootstrap from clearing or overwriting a newer login/logout token. Homepage and Admin restore flows also ignore stale success/failure UI results.
- Added response handling for JSON, `+json`, text, empty bodies, malformed JSON, and `204`/`205`; normalized failures expose only a numeric status plus a client-safe message and do not echo raw response text, request bodies, or rejected URLs.
- Preserved browser-owned body semantics: `FormData` retains a generated multipart boundary, `URLSearchParams` and `Blob` are not mislabeled, valid JSON strings receive `application/json`, and explicit non-auth content types remain intact.
- Removed browser bearer headers and persistent auth/session state from the homepage, published Class Detail, Dashboard, Tools Box, Live Class, Payment, Payment Success, Course Start, Course Content, Course Learn, and Admin scripts. Startup now bootstraps `/api/auth/me` or `/api/admin/session`; login/register/Google results are adopted before authenticated UI/navigation, and authenticated mutations wait for a bootstrapped CSRF token. Class Detail was explicitly added to scope after the active-runtime scan found it was the only residual published bearer path.
- Retired exactly `aix_member_token`, `aix_member_session`, `aixAdminToken`, `aixAdminAuth`, and the unused legacy local account database `aix_members`. Cleanup tolerates blocked `localStorage` and never removes theme, progress, notes, lab, commitment, or Admin seed data.
- Loaded the shared client immediately before each of the eleven page scripts, added it to the publication manifest, and added the behavioral/source contract to the named security suite and its exact package-script assertion. A canonical active-runtime scan covers the 25 served JS/HTML files from the public manifest and explicit member/Admin routes.

Browser migration matrix:

| Surface | Bootstrap/adoption | Authenticated unsafe requests | Preserved non-auth storage |
| --- | --- | --- | --- |
| Homepage | `/api/auth/me`; member/password/Google responses adopted | Member logout | `aix-theme` |
| Class Detail | Optional `/api/auth/me` for member-aware CTA; anonymous fallback on `401` | None | None |
| Dashboard | `/api/auth/me` before dashboard render | Notification read, logout | `aix_learning_progress_v1` |
| Tools Box | `/api/auth/me`, with `401` rendered anonymously | Logout | None |
| Live Class | `/api/auth/me` before room lookup | None | `aix_live_notes_*` |
| Payment | `/api/auth/me` before payment UI | Stripe checkout, phone OTP send/verify | None |
| Payment Success | `/api/auth/me` before Stripe-session lookup | None | None |
| Course Start | `/api/auth/me` before content lookup | None | `aix_course_commitment_*` |
| Course Content | `/api/auth/me` before content lookup | None | None |
| Course Learn | `/api/auth/me` before render and initial progress sync | Progress sync, AI teacher | `aix_learning_progress_v1`, `aix_lesson_notes_*`, `aix_lesson_lab_*` |
| Admin | `/api/admin/session`; login response adopted | Course/replay/resource/schedule/lead/member/package CRUD, notify, logout | `aixCourses`, `aixPackages`, `aixLeads` |

Version:
- `1.0.1` unchanged.

Changed files:
- `aix-api-client.js`
- `tests/client-auth-contract.test.mjs`
- `security/publication-manifest.cjs`
- `index.html`
- `class-detail.html`
- `dashboard.html`
- `tools-box.html`
- `live-class.html`
- `payment.html`
- `payment-success.html`
- `course-start.html`
- `course-content.html`
- `course-learn.html`
- `admin.html`
- `script.js`
- `class-detail.js`
- `dashboard.js`
- `tools-box.js`
- `live-class.js`
- `payment.js`
- `payment-success.js`
- `course-start.js`
- `course-content.js`
- `course-learn.js`
- `admin.js`
- `package.json`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Contract RED: `node --test tests/client-auth-contract.test.mjs` ran 13 tests with 0 passing and 13 failing at the intentionally missing shared client, missing page loaders, raw bearer fetches, persistent auth storage, missing bootstrap/adopt/clear ordering, and publication/security-suite omissions.
- Review redirect RED/GREEN: the focused same-origin request test first failed 0 of 1 because caller `redirect: "follow"` survived; it passed 1 of 1 after the shared client forced `redirect: "error"` after caller options. A two-server browser probe initially received the CSRF token at a cross-origin `307` sink and then confirmed the fixed sink received no token.
- Review canonical-URL and race RED/GREEN: the selected tests ran with the stale-bootstrap regression passing and the canonical-target assertion failing 1 of 2 because `fetch` received the original relative string. Both passed after `fetch` received `target.href`; a Chrome probe with a cross-origin `<base href>` confirmed the token reached only the validated origin. The standalone deferred stale-bootstrap test first failed 0 of 1, then passed after epoch guarding. Homepage/Admin stale-restore source contracts first failed 0 of 2, then passed after UI lifecycle guards.
- Expanded-scope RED/GREEN: the Class Detail loader/source selection failed 0 of 2 on its missing shared loader and raw bearer fetch, then passed 2 of 2 after migration.
- Focused GREEN: `node --test tests/client-auth-contract.test.mjs tests/homepage-contract.test.mjs tests/publication-manifest.test.mjs` passed 54 tests with 0 failures; the client contract itself passed 16 of 16.
- Named security suite: `npm run test:security` passed 169 tests with 0 failures, including the new client contract plus publication, route-policy, config, session, Origin/CSRF, and rate-limit regressions.
- Full regression: `npm test` passed 201 tests with 0 failures.
- Syntax: `node --check` passed for the shared client, all eleven migrated page scripts, both changed test files, and the publication manifest.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 100 manifest-approved files, Wrangler `4.95.0` read 107 generated asset-directory files, and stopped at `--dry-run` without deployment.
- Dependency audit: `npm audit --audit-level=high` exited 1 with the known 6 advisories (1 low, 5 high) in Multer and the Wrangler development chain. No dependency or lockfile changed, no automatic fix was applied, and this browser migration introduced no dependency.
- Active-runtime scan: the 25 JS/HTML files selected from the canonical publication manifest plus explicit member/Admin routes contain no retired auth key, browser Authorization/Bearer construction, or auth local/session storage outside the shared cleanup inventory. The broad root scan found only an unreferenced inactive rewrite utility plus legitimate server-to-provider Authorization headers; neither is browser runtime.
- `git diff --check` passed; pre-existing untracked user assets remained outside the task scope.
- Independent read-only review: Approved with no remaining Critical, Important, or Minor finding after the redirect, canonical URL, stale bootstrap, and residual Class Detail findings were fixed and re-probed.

Unresolved risks:
- CSRF is intentionally memory-only. A refresh or separate tab must bootstrap its own fresh token before an authenticated mutation; no token is recovered from browser storage.
- Cloudflare static preview continues to fail closed for private page/API families. Member and Admin cookie flows require the approved dynamic backend path and exact configured application Origin.
- The tracked but unreferenced `rewrite_admin.js` one-off rewrite utility still contains obsolete Admin auth text. It is not published, imported, package-invoked, or part of active browser runtime; it must not be run without separate cleanup/review.
- The 5 known high dependency advisories remain assigned to dependency hardening.

## 2026-07-18 - Phase 0B Task 3 Origin, CSRF, CORS, and authentication limits

Scope:
- Added a standalone HTTP-security module that accepts only an absent or exact configured CORS Origin, enables credentialed CORS, rejects every unsafe `POST`/`PUT`/`PATCH`/`DELETE` without an exact approved Origin, and requires a session-bound `X-CSRF-Token` after successful member/admin authentication. `GET`, `HEAD`, and `OPTIONS` remain neutral.
- Preserved the single Stripe webhook as an explicit exemption before global JSON parsing and Origin enforcement so its signed raw body remains intact. The middleware order is credentialed exact-Origin CORS, Stripe raw webhook, 1 MB JSON parsing, retired-token rejection, then the global mutation-Origin gate.
- Set production Express `trust proxy` to exactly `1`, matching the approved one-proxy topology, while leaving nonproduction proxy behavior unchanged.
- Installed exact `express-rate-limit@8.6.0` without `--force`. Pure-IP limiters retain the package's default IPv4/IPv6-safe key generator and proxy/IP diagnostics; identity fallbacks call `ipKeyGenerator` explicitly. Valid canonical email/phone values are stored only as fixed-length SHA-256 keys, malformed or oversized identities fall back to a prefixed safe IP key, and raw attacker-controlled identity text is never retained by the rate-limit store.
- Applied independent member-login limits of 10 attempts per IP per 15 minutes and 5 attempts per canonical email per 15 minutes; admin login is 5 attempts per IP per 15 minutes.
- Applied shared OTP limits of 5 attempts per canonical phone per 10 minutes and 20 attempts per IP per hour across all four public and authenticated send/verify routes. Authenticated OTP routes retain `requireMemberSession` first, so authentication and session CSRF succeed before the shared limiter reads the stored-member phone fallback.
- Added unit, source-contract, isolated limiter-server, and real child-server coverage for exact/missing/malformed Origins, credentialed CORS, all safe/unsafe methods, session-bound CSRF, cross-session rejection, limiter thresholds and standard headers, canonical identity equivalence, invalid-identity fallback, all four OTP declarations, no nonexistent password-reset route, production proxy configuration, absence of limiter validation warnings, and a locally signed inert Stripe webhook with no Origin.
- Migrated only affected server-side fixtures to send the real Origin and CSRF values returned by login/registration. Expanded the named `test:security` command to include the Phase 0B config, session, and HTTP suites and updated its exact package-script contract.

Version:
- `1.0.1` unchanged.

Changed files:
- `security/http-security.cjs`
- `tests/http-security.test.mjs`
- `server.js`
- `package.json`
- `package-lock.json`
- `tests/session-security.test.mjs`
- `tests/api-route-policy.test.mjs`
- `tests/cloudflare-publication.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Module RED: `node --test tests/http-security.test.mjs` exited 1 with the expected `MODULE_NOT_FOUND` for `security/http-security.cjs` before implementation.
- Initial module GREEN: the focused HTTP-security suite passed 9 tests with 0 failures after the module and isolated limiter proofs were implemented.
- Server-integration RED: the expanded HTTP suite ran 18 tests with 10 passing and 8 failing at the intentionally missing server wiring: wildcard CORS, absent global Origin rejection, absent session CSRF, and missing admin/member/OTP thresholds.
- Server-integration GREEN: `node --test tests/http-security.test.mjs` passed 18 tests with 0 failures after server wiring. Its child-process output contained no `ValidationError` or `ERR_ERL_` limiter warning.
- Existing-fixture RED: `node --test tests/session-security.test.mjs tests/api-route-policy.test.mjs` ran 63 tests with 60 passing and 3 failing because existing mutation fixtures omitted the newly required Origin/CSRF values and one source assertion expected the prior unbounded `express.json()` call.
- Focused security/API/publication GREEN: `node --test tests/http-security.test.mjs tests/session-security.test.mjs tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs tests/publication-manifest.test.mjs` passed 96 tests with 0 failures.
- Named security suite: `npm run test:security` passed 153 tests with 0 failures after adding the config/session/HTTP suites to the existing Phase 0A security command and updating its exact contract.
- Final HTTP suite after strengthening all-method/all-OTP-route and review-hardening proofs: `node --test tests/http-security.test.mjs` passed 22 tests with 0 failures.
- Full regression: `npm test` passed 185 tests with 0 failures. An intermediate run exposed only the stale exact `test:security` script contract (180 of 181 then-current tests passed); the authorized contract migration restored the suite without weakening the named security command.
- Syntax: `node --check` passed for `security/http-security.cjs`, `tests/http-security.test.mjs`, `tests/session-security.test.mjs`, `tests/api-route-policy.test.mjs`, `tests/cloudflare-publication.test.mjs`, and `server.js`; `git diff --check` passed.
- Exact dependency proof: `npm ls express-rate-limit --depth=0` resolved `express-rate-limit@8.6.0` at the project root.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 99 manifest-approved files, Wrangler `4.95.0` read 106 generated asset-directory files, and stopped at `--dry-run` without deployment.
- Dependency audit: `npm audit --audit-level=high` exited 1 with 6 advisories (1 low, 5 high): Multer plus the Wrangler development chain (`esbuild`, `undici`, and `ws`). No automatic fix was applied; the exact rate-limit dependency introduced no reported advisory.
- Independent review found correct middleware/Origin/CORS/CSRF/Stripe behavior, plus one raw oversized-email MemoryStore risk and two hardening gaps in pure-IP diagnostics and optional-interface compatibility. Review RED: `node --test --test-name-pattern "original interface|pure IP limiters|fixed-length SHA-256|bounds canonical email" tests/http-security.test.mjs` ran 4 tests with 0 passing and 4 failing. Review GREEN: the same command passed 4 of 4 after bounded canonical acceptance, SHA-256 identity keys, default pure-IP key generation, and safe optional canonicalizer defaults were implemented. The review's cross-route OTP availability observation is retained as an explicit tradeoff because one shared budget across all four OTP routes is a binding Task 3 requirement. Independent read-only follow-up returned Approved with no remaining actionable finding and reconfirmed the review regressions, focused suite, and diff check.

Unresolved risks:
- Browser cookie/CSRF migration remains Phase 0B Task 4. Existing browser mutations that still use retired bearer transport will not satisfy the new session cookie and CSRF contract until that separately scoped migration lands.
- The default rate-limit stores are intentionally process-local memory. Counters reset on restart and are not shared across horizontally scaled instances; production multi-instance operation needs an approved shared store.
- The intentionally shared canonical-phone/IP OTP budgets let anonymous registration traffic consume the same phone budget later used by an authenticated phone/payment route. This limits total abuse per phone as specified, but creates a targeted short-lived availability tradeoff that should be revisited only if the product contract permits purpose-scoped budgets.
- `trust proxy = 1` is correct only for the approved single-proxy deployment topology. Any proxy-chain change requires an explicit review before deployment.
- Production startup requires the exact frontend origins in `APP_ORIGINS`; requests from any unlisted origin fail closed by design.
- The 5 high dependency advisories remain assigned to dependency hardening.

## 2026-07-18 - Phase 0B Task 2 formal review follow-up

Scope:
- Exported pure `assertSessionIdentity(identity)` from the session-security module. Issuance and verification now share the exact string-type, non-empty, and 512-character subject/email contract; rejected identities receive a generic client-safe `400` without echoing either field.
- Added one server preflight that composes active-account policy with the shared session-identity contract and runs before every member-session issuance path.
- Reordered existing Google-member handling so account status and stored member identity are checked before `lastLoginAt`, identity linking, email verification, auth-provider, or profile updates. New Google members normalize the exact stored email and generate the exact stored ID before preflight and INSERT.
- Reordered member registration to preflight its generated ID and normalized email before duplicate lookup and INSERT, while retaining the no-orphan oversized-email regression.
- Reordered password login to preflight active imported/legacy rows before updating `lastLoginAt` or `updatedAt`; invalid stored IDs/emails return `400` instead of mutating and later surfacing an uncaught `500`.
- Made retired `aix_session` expiry idempotent per response. A logout request carrying both current and retired cookies now emits one member-cookie clear and exactly one retired-cookie clear.
- Added pure callback-order, source-order, direct temporary-database, client-safe error, and exact `Set-Cookie` count regressions without adding a Google provider bypass or making any external provider call.

Version:
- `1.0.1` unchanged.

Changed files:
- `security/session-security.cjs`
- `tests/session-security.test.mjs`
- `server.js`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Identity/order RED: `node --test tests/session-security.test.mjs` ran 13 tests with 10 passing and 3 failing because the pure preflight and server ordering helper were absent and an active imported oversized-ID login returned `500` after writing timestamps instead of a deliberate pre-write `400`.
- Identity/order GREEN and cookie RED: after preflight ordering was implemented, the session suite reached the logout header assertion with 12 tests passing and 1 failing because it observed 2 retired-cookie clears instead of 1.
- Cookie source RED: `node --test --test-name-pattern "server audits every issuance path" tests/session-security.test.mjs` ran 1 test with 0 passing and 1 failing because the logout route had no response-idempotent expiry call.
- Session GREEN: `node --test tests/session-security.test.mjs` passed 13 tests with 0 failures. The live temporary SQLite proof covers active imported rows with an oversized ID and oversized email, confirms `400` with a non-echoing message, and verifies both `updatedAt` and `lastLoginAt` remain unchanged.
- Mutation-order source proof requires the composed status/identity preflight before the existing Google UPDATE, new Google INSERT, registration duplicate read and INSERT, password-login timestamp UPDATE, and final session issue call.
- Security/publication suite: `node --test tests/session-security.test.mjs tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs tests/publication-manifest.test.mjs` passed 74 tests with 0 failures.
- Initial full regression caught one compatibility failure: 162 of 163 tests passed because an existing homepage source contract expected the original ``auth_google_${profile.sub}`` synthetic-phone expression. That behavior-equivalent expression was restored without weakening normalized session email or preflight ordering.
- Final full suite: `npm test` passed 163 tests with 0 failures.
- Syntax: `node --check` passed for `security/session-security.cjs`, `tests/session-security.test.mjs`, and `server.js`; `git diff --check` passed.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 99 manifest-approved files, Wrangler `4.95.0` read 106 generated asset-directory files, and stopped at `--dry-run` without deployment.
- Dependency audit: `npm audit --audit-level=high` exited 1 with the unchanged 6 pre-existing advisories (1 low, 5 high) in Multer and the Wrangler development chain; no dependency or lockfile changed and no automatic fix was applied.
- Independent read-only follow-up review returned Approved with no Critical, Important, or Minor finding and separately confirmed all pre-write ordering, safe `400` behavior, and one retired-cookie clear per response.

Unresolved risks:
- Google mutation ordering is proven structurally without a production test bypass; this follow-up made no external Google request.
- Browser cookie/CSRF client migration remains Phase 0B Task 4; Origin/CSRF enforcement and authentication/OTP rate limits remain Phase 0B Task 3.
- The existing PostgreSQL compatibility wrapper still lacks a real multi-statement transaction; this follow-up prevents known rejected identity/status cases from reaching writes but does not change database architecture.
- The 5 pre-existing high dependency advisories remain assigned to dependency hardening.

## 2026-07-18 - Phase 0B Task 2 isolated signed-cookie sessions

Scope:
- Replaced browser bearer transport and the shared `aix_session` path with separately signed `aix_member_session` and `aix_admin_session` host-only cookies. Member cookies use `HttpOnly`, `SameSite=Lax`, and the configured member lifetime; admin cookies use `HttpOnly`, `SameSite=Strict`, and an invariant eight-hour lifetime. Production cookies add `Secure`.
- Added strict signed-session parsing and verification with exact payload shape and lifetime checks, version/kind isolation, safe-integer timestamps, per-session nonces, HMAC signatures, timing-safe comparison, duplicate-cookie rejection, malformed-input fail-closed behavior, and CSRF tokens bound to the complete signed session identity.
- Added an active-only account policy. Every member-session issue/read path re-reads or checks the member and returns `401` unless `status === 'active'`; startup no longer normalizes pending or inactive records to active, and existing Google login no longer reactivates an account.
- Removed the passwordless email-plus-phone member-login branch. Password login now requires both a valid email and password before status validation and session issuance.
- Retired the operational legacy `/api/auth/signup` and `/api/auth/login` handlers with intentional `410 Gone` responses. Incoming browser bearer authorization and legacy top-level token fields are rejected after JSON parsing, while the Stripe webhook retains raw-body precedence.
- Added cookie-only admin login plus `GET /api/admin/session` and `POST /api/admin/logout`; member `auth/me` and both login flows return a CSRF token but no bearer credential.
- Kept `aix_session` only as a retirement target and expires it on member issue/logout and whenever it is presented to member session/page checks.
- Added a read-only startup compatibility count for accounts with neither a password hash nor Google identity, warning operators without silently migrating or activating any account.
- Expanded the exact API policy matrix and added unit, source-contract, and live HTTP regression coverage for cookie attributes, isolation, tampering, expiry, malformed cookies/claims, account statuses, issuance routes, legacy rejection, logout, and a session invalidated by later suspension.

Version:
- `1.0.1` unchanged.

Changed files:
- `security/session-security.cjs`
- `security/account-policy.cjs`
- `tests/session-security.test.mjs`
- `tests/api-route-policy.test.mjs`
- `server.js`
- `docs/development/UPDATE_LOG.MD`

Validation:
- Unit RED: `node --test tests/session-security.test.mjs` exited 1 with the expected `MODULE_NOT_FOUND` for `security/session-security.cjs` before either security module existed.
- Initial unit GREEN: the focused session/account suite passed 9 tests with 0 failures after the two security modules were implemented.
- Server/API RED: `node --test tests/session-security.test.mjs tests/api-route-policy.test.mjs` ran 62 tests with 56 passing and 6 failing at the intended missing route-policy, cookie transport, legacy shutdown, status-preservation, and retired-client contracts.
- Server/API GREEN: the same focused command passed all 62 tests with 0 failures after server integration.
- Final session suite: `node --test tests/session-security.test.mjs` passed 12 tests with 0 failures.
- Security/publication suite: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs tests/publication-manifest.test.mjs tests/session-security.test.mjs` passed 73 tests with 0 failures.
- Full suite: `npm test` passed 162 tests with 0 failures.
- Source audit found none of the nine retired token/session helper definitions or any member/admin response-token issuance; `aix_session` remains only in the explicit expiry check. Four member authentication routes issue through the active-policy-gated helper, OTP verification continues to issue only its purpose-bound phone proof, and admin login issues only the isolated admin cookie.
- Read-only compatibility probe: the current local `data.db` contains 2 member records with neither `passwordHash` nor `googleSub`; no record was modified, and production operators will receive the startup review warning for the corresponding deployment database.
- Syntax: `node --check` passed for both security modules, both changed test files, and `server.js`.
- Cloudflare dry-run: `npm run cf:check` exited 0, prepared 99 manifest-approved files, Wrangler `4.95.0` read 106 generated asset-directory files, and stopped at `--dry-run` without deployment.
- Dependency audit: `npm audit --audit-level=high` exited 1 with the unchanged 6 pre-existing advisories (1 low, 5 high) in Multer and the Wrangler development chain; no dependency or lockfile was changed and no automatic fix was applied.
- `git diff --check` passed with no whitespace errors.
- Independent review found no Critical or Important issue and one Minor oversized-identity edge case. First follow-up RED ran the exact identity-shape test with 0 passing and 1 failing (`Missing expected exception`); first GREEN passed 1 of 1 after issuance and verification shared one exported 512-character bound. Follow-up review then showed registration still inserted the oversized identity before issuance rejected it. A live RED ran 1 test with 0 passing and 1 failing because the account remained queryable; final GREEN passed 1 of 1 after member-input validation rejected it before duplicate lookup or INSERT.

Unresolved risks:
- The current browser scripts still send bearer credentials and will intentionally receive re-authentication errors until the separately scoped Phase 0B Task 4 client migration switches them to cookie credentials and CSRF headers.
- CSRF token creation/validation is available now, but Origin/CSRF enforcement and authentication/OTP rate limits remain the separately scoped Phase 0B Task 3 work.
- Accounts reported by the startup compatibility count require an operator-reviewed password-setup or identity-linking migration; this task deliberately performs no automatic credential or account-status mutation.
- Google provider verification was covered through source contracts and existing test boundaries, not a live call to the external Google service.
- PostgreSQL compatibility still uses the existing synchronous wrapper whose multi-statement login/upsert flows are not wrapped in a real transaction; this task did not change database or provider architecture.
- The 5 pre-existing high dependency advisories remain assigned to the separate dependency-hardening task.

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
