# AiX Website Development Update Log

This file is the required update record for ongoing development.

Rule: every meaningful code, asset, dependency, deployment, or documentation change must add a new dated entry here before commit. Keep the latest entry at the top.

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
