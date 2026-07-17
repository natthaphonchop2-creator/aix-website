# AiX Website Development Update Log

This file is the required update record for ongoing development.

Rule: every meaningful code, asset, dependency, deployment, or documentation change must add a new dated entry here before commit. Keep the latest entry at the top.

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
