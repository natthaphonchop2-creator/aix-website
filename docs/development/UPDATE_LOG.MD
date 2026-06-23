# AiX Website Development Update Log

This file is the required update record for ongoing development.

Rule: every meaningful code, asset, dependency, deployment, or documentation change must add a new dated entry here before commit. Keep the latest entry at the top.

## 2026-06-16 - v1.0.8 continuous review marquee

Scope:
- Removed the hover/focus pause behavior from the homepage learner review marquee.
- Kept the review cards flowing continuously while users point at the section.
- Added contract coverage so `animation-play-state: paused` does not return to the homepage review styles.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-reviews-continuous-marquee-v9-20260616` and homepage script query to `script.js?v=aix-reviews-continuous-marquee-v9-20260616`.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 18 tests, 0 failures.
- `git diff --check` passed.
- Browser QA on `/index.html?qa=aix-reviews-continuous-marquee-v9-20260616#reviews`: confirmed `styles.css?v=aix-reviews-continuous-marquee-v9-20260616` loaded, `aixReviewMarquee` stayed `running`, no `animation-play-state: paused` CSS rule was present, and horizontal overflow stayed `0`.

## 2026-06-16 - v1.0.7 remove review screenshots

Scope:
- Removed the learner review screenshot strip from the homepage reviews section.
- Kept the 40+ learner social proof and text review cards, with no extra blank space before membership pricing.
- Removed unused review screenshot CSS and dark-mode selectors.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-reviews-no-screenshots-v8-20260616` and homepage script query to `script.js?v=aix-reviews-no-screenshots-v8-20260616`.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

## 2026-06-16 - v1.0.6 compact all homepage sections

Scope:
- Reviewed every main homepage section and reduced repeated or crowded copy across Hero, member loop, learning system, member resource space, paths, catalog, business cases, reviews, membership, and FAQ.
- Tightened section spacing, heading scale, card heights, course card metadata, and review card/screenshot density for both mobile and desktop.
- Kept the existing AiX black/white visual direction, orbit hero, Luma mobile navbar, auth modal flow, and review proof assets intact.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-all-sections-compact-v7-20260616` and homepage script query to `script.js?v=aix-all-sections-compact-v7-20260616`.

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
- `script.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 18 tests, 0 failures.

## 2026-06-16 - v1.0.5 compact membership and FAQ copy

Scope:
- Reworked the Membership section copy to reduce density on mobile and desktop.
- Shortened the headline to `เรียน AI ทั้งปี 1,999 บาท` and replaced the long paragraph/list with compact benefit chips.
- Simplified the price card to price, billing period, and two actions only.
- Removed the duplicated FAQ eyebrow, shortened FAQ answers, and closed FAQ items by default.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-membership-compact-20260616`.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 17 tests, 0 failures.
- `git diff --check` passed.
- Browser QA mobile 430x932 on `/index.html?qa=membership-compact-mobile-v2-20260616#membership`: confirmed `styles.css?v=aix-membership-compact-20260616` loaded, Membership section height reduced to `581px`, copy height `258px`, price panel height `215px`, FAQ has no open items, old long copy is absent, and horizontal overflow stayed `0`.
- Browser QA desktop 1440x900 on `/index.html?qa=membership-compact-desktop-20260616#membership`: confirmed Membership section height reduced to `393px`, grid uses `729px 360px`, price panel stays aligned right, FAQ has no open items, old long copy is absent, and horizontal overflow stayed `0`.

## 2026-06-16 - v1.0.4 mobile account opens auth modal

Scope:
- Replaced the old mobile bottom-nav account behavior with the current Login modal flow.
- Changed the final mobile nav item label from `บัญชี` to `เข้าสู่ระบบ`.
- Prevented the account nav link from navigating straight to `/dashboard` on public pages when the auth modal is available.
- Reused the main `#loginBtn` click path so logged-out users see the modal and logged-in users still reach the dashboard.
- Bumped the shared footer script cache-bust query to `site-footer.js?v=site-footer-mobile-auth-modal-20260616`.

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
- `site-footer.js`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA mobile 430x932 on `/index.html?qa=mobile-account-modal-20260616#home`: confirmed the final Luma nav item now exposes `เข้าสู่ระบบ` instead of `บัญชี`, loads `site-footer.js?v=site-footer-mobile-auth-modal-20260616`, clicking it kept the URL on `/index.html`, opened `#authModal` as a fixed overlay at `y=0`, `height=932`, `z-index: 100`, activated the Login pane, and horizontal overflow stayed `0`.

## 2026-06-16 - v1.0.3 mobile auth popup overlay restore

Scope:
- Fixed mobile signup/login opening as page content because the site-wide meteor stacking selector also matched `.modal-backdrop`.
- Excluded `.modal-backdrop` from the meteor stacking selector so Login/Register stay as fixed overlay popups.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-mobile-auth-popup-fixed-20260616`.
- Updated contract coverage so the meteor background selector cannot override mobile nav or modal overlays again.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA mobile 390x844 on `/index.html?qa=mobile-auth-popup-fixed-20260616#home`: tapped the hero signup button, confirmed `styles.css?v=aix-mobile-auth-popup-fixed-20260616` loaded, `#authModal` opened with `position: fixed`, `z-index: 100`, `y=0`, `height=844`, `overflow-y: auto`, Register pane active, and horizontal overflow stayed `0`.

## 2026-06-16 - v1.0.2 mobile navbar fixed positioning restore

Scope:
- Fixed the mobile Luma navbar disappearing from the viewport because the site-wide meteor stacking selector also matched `body > nav`.
- Excluded `.luma-mobile-nav` from the meteor stacking selector so its mobile `position: fixed` rule stays intact.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-mobile-nav-fixed-20260616`.
- Updated contract coverage so the meteor background selector cannot override the mobile navbar again.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Verification:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA mobile 390x844 on `/index.html?qa=mobile-nav-fixed-20260616#home`: confirmed `styles.css?v=aix-mobile-nav-fixed-20260616` loaded, `.luma-mobile-nav` rendered 6 items, stayed `position: fixed` at `y=768` / `bottom=828` with `z-index: 95`, horizontal overflow stayed `0`, scrolling down added `is-hidden`, and scrolling back up restored the visible navbar.

## 2026-06-16 - v1.0.1 login mascot viewport clearance

Scope:
- Fixed the Login mascot head being clipped at tablet-sized viewports such as 1024x768.
- Kept the Login card compact at `440px` and avoided adding extra title margin or card height.
- Added a desktop/tablet-only auth overlay offset so the mascot can sit above the card edge without leaving the viewport.
- Kept the Register modal placement unchanged.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-login-head-visible-20260616`.
- Added contract coverage for the Login-only overlay offset.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA at 1024x768 on `/index.html?qa=aix-auth-login-head-visible-20260616`: opened Login, confirmed `styles.css?v=aix-auth-login-head-visible-20260616` loaded, confirmed the Login card remains `440px` wide with no extra `.auth-copy-login` margin, confirmed the mascot top is visible at `y=9` instead of clipped, confirmed `AiX Club` is below both the mascot and speech bubble, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 compact login mascot edge

Scope:
- Reduced the default Login popup card width so the frame no longer feels expanded.
- Removed the extra Login title offset that made the card taller.
- Moved the Login mascot upward so it sits on the card edge instead of occupying space inside the card.
- Kept Register mascot placement unchanged.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-login-compact-20260616`.
- Added contract coverage for the compact Login card and edge-positioned mascot.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA at 659x765 on `/index.html?qa=aix-auth-login-compact-20260616&check=2`: opened Login, confirmed the card width is `440px`, `.auth-copy-login` has no extra `margin-top`, the mascot sits on the top edge, `AiX Club` is below both the mascot and speech bubble, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844 on `/index.html?qa=aix-auth-login-compact-mobile-20260616`: opened Login, confirmed the card remains compact at `608px` tall, `AiX Club` is below both the mascot and speech bubble, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 register peeking mascot without panel

Scope:
- Reworked the Register mascot to keep the original peeking pose while removing the generated black wall/panel.
- Added the cleaned transparent peeking mascot asset at `assets/mascot/aix-auth-mascot-register-peek-no-panel.png`.
- Updated the Register modal to use the no-panel mascot holding an AiX Club card.
- Repositioned the Register mascot so the page modal edge acts as the visual reveal point, with horizontal overflow clipped by the overlay.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-register-no-panel-20260616`.
- Updated homepage contract coverage for the new Register asset and no-panel placement.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `assets/mascot/aix-auth-mascot-register-peek-no-panel.png`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- PNG alpha validation confirmed `assets/mascot/aix-auth-mascot-register-peek-no-panel.png` is `RGBA 1024x1536`.
- Browser QA mobile 390x844 on `/index.html?qa=aix-auth-register-no-panel-mobile-20260616`: opened Register, confirmed `styles.css?v=aix-auth-register-no-panel-20260616` loaded, confirmed the Register popup loads `assets/mascot/aix-auth-mascot-register-peek-no-panel.png`, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA desktop 1440x900 on `/index.html?qa=aix-auth-register-no-panel-desktop-20260616`: opened Register, confirmed the no-panel mascot asset loaded at the right edge, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 auth modal concept A implementation

Scope:
- Implemented the selected Concept A direction for the homepage Login and Register popups.
- Changed the auth modal to a dark premium card with mascot-over-edge decoration.
- Added a Login title block, returning-user speech bubble, and a peeking mascot positioned outside the top-left card edge.
- Added a Register title block and side-peeking mascot while keeping the existing `ย้อนกลับ`, Google signup, form fields, OTP, and consent hooks.
- Reordered the Register phone field above password fields to match the selected mockup flow.
- Scoped modal `.auth-copy` styles so the standalone auth page card styles do not bleed into the popup.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-concept-a-20260616`.
- Updated homepage contract coverage for the Concept A layout, separated mascot poses, dark modal styling, and cache-bust query.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA desktop 1440x900 on `/index.html?qa=aix-auth-concept-a-desktop-final-20260616`: opened Register through the Login popup, confirmed `styles.css?v=aix-auth-concept-a-20260616` loaded, confirmed Register title `สมัครสมาชิก AiX Club`, transparent `.auth-copy` background, mascot image loaded, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844: confirmed Login title `AiX Club` is no longer covered by the mascot, confirmed Register title remains readable without a white style bleed, confirmed both mascot images loaded, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 auth modal imagegen concepts

Scope:
- Generated two imagegen design concepts for the Login/Register modal redesign before implementation.
- Saved the playful mascot-over-edge direction at `output/imagegen/auth-modal-concepts/aix-auth-modal-concept-a-playful.png`.
- Saved the cleaner integrated header-band direction at `output/imagegen/auth-modal-concepts/aix-auth-modal-concept-b-clean.png`.
- Did not change the live auth modal HTML/CSS in this pass.

Changed files:
- `docs/development/UPDATE_LOG.MD`
- `output/imagegen/auth-modal-concepts/aix-auth-modal-concept-a-playful.png`
- `output/imagegen/auth-modal-concepts/aix-auth-modal-concept-b-clean.png`

Validation:
- Confirmed both generated concept files are PNG images at `1536x1024`.
- Visually inspected both concepts; Concept B keeps the form hierarchy cleaner while Concept A is more playful.

## 2026-06-16 - v1.0.1 split auth mascot poses

Scope:
- Added a separate transparent 3D AiX mascot asset for the Register popup at `assets/mascot/aix-auth-mascot-register.png`.
- Kept the Login popup on the original waving mascot at `assets/mascot/aix-auth-mascot.png`.
- Updated the Register popup header art so Login and Register use distinct poses while keeping the same speech-bubble layout.
- Added contract coverage so the auth modal must keep one Login mascot asset and one Register mascot asset.

Changed files:
- `index.html`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `assets/mascot/aix-auth-mascot-register.png`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- PNG alpha validation confirmed `assets/mascot/aix-auth-mascot.png` is `RGBA 647x1173` and `assets/mascot/aix-auth-mascot-register.png` is `RGBA 668x1143`; all four corner alpha values are `0` on both assets.
- Browser QA on `/index.html?qa=split-auth-mascot-20260616`: opened Login through the visible `เข้าสู่ระบบสมาชิก` trigger, confirmed Login loads `assets/mascot/aix-auth-mascot.png` with speech `กลับมาเรียนต่อกัน`, switched to Register, confirmed Register loads `assets/mascot/aix-auth-mascot-register.png` with speech `เริ่มต้นกับ AiX`, confirmed the Register back button and first field are visible, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 auth mascot header art

Scope:
- Generated a new 3D AiX mascot raster asset using the built-in `image_gen` flow from the supplied reference style.
- Converted the generated chroma-key image into a transparent PNG at `assets/mascot/aix-auth-mascot.png`.
- Added the mascot to the top of both Login and Register popups.
- Added HTML/CSS speech bubbles so the Thai copy stays crisp and editable: `กลับมาเรียนต่อกัน` and `เริ่มต้นกับ AiX`.
- Added light/dark styling and mobile sizing for the auth mascot header.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-mascot-20260616`.
- Added contract coverage for the mascot asset, speech copy, and auth popup styling.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `assets/mascot/aix-auth-mascot.png`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- PNG alpha validation for `assets/mascot/aix-auth-mascot.png` confirmed `RGBA`, size `647x1173`, and all four corner alpha values are `0`.
- Browser QA on `/index.html?qa=register-required-phone-20260616`: opened Login and Register popups, confirmed `styles.css?v=aix-auth-mascot-20260616` loaded, confirmed the mascot image completed loading with natural size `647x1173`, confirmed Login speech text `กลับมาเรียนต่อกัน`, confirmed Register speech text `เริ่มต้นกับ AiX`, confirmed the Register `ย้อนกลับ` button and first field remain visible, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 remove register auth header

Scope:
- Removed the top Register popup header containing `AiX Member`, `สมัครสมาชิก AiX`, the user-plus icon, and the subtitle.
- Kept the Register `ย้อนกลับ` button by moving it into a minimal back row.
- Updated the auth popup CSS for the new Register back row.
- Added contract coverage so the removed Register header does not return.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- Browser QA on `/index.html?qa=register-required-phone-20260616`: opened the Register popup, confirmed `.auth-card-head-signup`, the user-plus icon, `สมัครสมาชิก AiX`, and the Register subtitle are absent; confirmed the `ย้อนกลับ` button remains visible in `.auth-register-back-row`; confirmed `#googleSignupButton` and the first Register field remain visible; horizontal overflow stayed `0`; console warning/error logs were empty.

## 2026-06-16 - v1.0.1 remove login auth header

Scope:
- Removed the top Login popup header containing `AiX Member`, `ระบบสมาชิก AiX`, the lock icon, and the subtitle.
- Kept the Register popup header and `ย้อนกลับ` button intact.
- Added contract coverage so the removed Login header does not return.

Changed files:
- `index.html`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- Browser QA on `/index.html?qa=register-required-phone-20260616`: opened the Login popup, confirmed `.auth-card-head-login`, `[data-auth-head="login"]`, the lock icon, `ระบบสมาชิก AiX`, and the Login subtitle are absent; confirmed `#googleLoginButton` remains visible; confirmed the Register header still exists and stays hidden in Login mode; horizontal overflow stayed `0`; console warning/error logs were empty.

## 2026-06-16 - v1.0.1 remove login Google helper text

Scope:
- Removed the helper text under the Google button from the homepage Login popup.
- Kept the Google login button and Register-side Google helper text intact.
- Added contract coverage so the removed Login helper text does not return.

Changed files:
- `index.html`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Browser QA on `/index.html?qa=register-required-phone-20260616`: opened the Login popup, confirmed `#googleLoginStatus` is absent, confirmed `เข้าสู่ระบบด้วย Google เป็นช่องทางหลัก` is absent from the document and Login pane, confirmed `#googleLoginButton` remains visible, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-16 - v1.0.1 register required phone cleanup

Scope:
- Removed `นามสกุล`, `Line ID`, and `ธุรกิจ / งานที่ทำ` from the homepage Register popup.
- Updated the Register name label to `ให้เรียกคุณว่าอะไรดี`.
- Made `เบอร์โทร` a required field in the homepage Register popup and standalone `/register` page.
- Updated homepage signup payloads to use the single display name field and send removed legacy fields as empty strings for existing database columns.
- Updated standalone `/register` client validation to no longer require last name and to require phone.
- Updated server-side member registration validation so missing phone is rejected by the API.
- Bumped stylesheet and auth script cache-bust query strings to `aix-register-required-phone-20260616`.
- Added contract coverage preventing the removed Register fields from returning and validating the new required-phone behavior across popup, standalone register page, client scripts, and server validation.

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
- `auth-page.js`
- `script.js`
- `server.js`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- Restarted the local `npm start` server so the updated `server.js` validation is active.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `POST /api/members/register` without `phone` returned `400` with `{"error":"กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ"}`.
- Browser QA on `/index.html?qa=register-required-phone-20260616`: opened the Register popup, confirmed labels are `ให้เรียกคุณว่าอะไรดี`, `อีเมล`, `รหัสผ่าน`, `ยืนยันรหัสผ่าน`, `เบอร์โทร`; confirmed `signupPhone.required === true`; confirmed `นามสกุล`, `Line ID`, `ธุรกิจ / งานที่ทำ`, and `ไม่จำเป็นต้องกรอก` are absent; confirmed loaded CSS and JS cache-bust values are `aix-register-required-phone-20260616`; horizontal overflow stayed `0`.

## 2026-06-16 - v1.0.1 auth popup register flow

Scope:
- Ported the attached shadcn-style sign-in card into the existing static homepage auth modal without adding React, Tailwind, shadcn, or new runtime dependencies.
- Changed the homepage auth flow so Login is the default popup state and Register opens as a separate popup state instead of being shown as a top tab/page section.
- Added a visible `ย้อนกลับ` button in the Register popup to return to Login.
- Preserved existing signup, login, Google auth, OTP, and form-submit hooks.
- Fixed the auth modal overlay to remain `position: fixed` above the page, overriding the site-wide meteors background layer that otherwise made body children `position: relative`.
- Prevented Register mode from auto-focusing email and scrolling the popup header/back button out of view.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-auth-popup-fixed-20260616`.
- Added homepage contract coverage for the new popup flow, back button, fixed overlay, scroll reset, cache-bust query, and preserved auth hooks.

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
- `script.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 16 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/index.html?qa=auth-popup-fixed-20260616`: opened Login popup from `#loginBtn`, confirmed `loginPane` active, no `auth-tabs`, fixed overlay, and horizontal overflow `0`.
- Browser QA desktop switched to Register from the Login popup, confirmed `signupPane` active, `auth-register-pop` class applied, back button visible, popup top at `y=28`, fixed backdrop at `y=0`, loaded `styles.css?v=aix-auth-popup-fixed-20260616`, and horizontal overflow `0`.
- Browser QA desktop clicked the Register back button and confirmed it returned to `loginPane`, hid the Register header, and removed the register popup class.
- Browser QA mobile 390x844 opened Register from the hero CTA, confirmed the fixed popup stayed inside the viewport, back button visible at `y=31`, shell `362px` wide, shell top `y=12`, internal scroll available, and horizontal overflow `0`.
- Browser console warning/error logs were empty.

## 2026-06-16 - v1.0.1 learner reviews and 40+ proof

Scope:
- Added a homepage learner reviews section between the business-use section and membership pricing.
- Highlighted `40+` learners, a 6-hour practical class, and replay access as the main social proof.
- Ported the attached testimonials-column concept into static HTML/CSS instead of adding React, shadcn, Tailwind, TypeScript, or `motion` to this static site.
- Added text review cards derived from the supplied review screenshots and a screenshot proof grid using the provided review images.
- Added responsive, dark-mode, reduced-motion, and image-filter overrides for the new review section.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-reviews-40-learners-20260616`.
- Added homepage contract coverage for the review section, review assets, social proof copy, motion safety, dark mode, and mobile behavior.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`
- `assets/reviews/aix-review-automation-practical.jpg`
- `assets/reviews/aix-review-manus-ai-efficiency.jpg`
- `assets/reviews/aix-review-manus-ai-work-assistant.jpg`
- `assets/reviews/aix-review-value-for-beginner.jpg`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 15 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/index.html?qa=reviews-40-learners-20260616`: loaded `styles.css?v=aix-reviews-40-learners-20260616`, found the `#reviews` section, confirmed the `40+` learner proof, 3 stat rows, 12 testimonial cards, 4 review screenshots, no console warning/error logs, and horizontal overflow `0`.
- Browser QA confirmed all 4 supplied review images loaded with natural dimensions and `filter: none`.
- Browser QA mobile 390x844 confirmed the review section uses one visible testimonial column, hides the second column, stacks review screenshots into one column, keeps horizontal overflow `0`, and keeps the `40+`, `6 ชม.`, and `Replay` proof readable.
- Visual QA with saved screenshots checked the desktop review section, mobile review heading/stat layout, and mobile review-image stack.
- The in-app browser viewport override was reset and the tab was left near the reviews section.

## 2026-06-15 - v1.0.1 remove homepage skip link

Scope:
- Removed the visible homepage skip link after browser review.
- Removed the unused `.skip-link` CSS and focus-visible styling.
- Kept `main#main-content` in place for page structure and existing hooks.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-no-skip-link-20260615`.
- Updated the homepage contract test to prevent the skip link from returning.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 14 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 520x765 on `/index.html#main-content`: loaded `styles.css?v=aix-no-skip-link-20260615`, confirmed `.skip-link` count `0`, confirmed `ข้ามไปเนื้อหาหลัก` is absent from body text and DOM snapshot, kept `main#main-content`, kept horizontal overflow at `0`, and console warning/error logs were empty.
- Browser interaction proof clicked the header theme toggle once; the page switched from light to dark mode and still kept the skip link absent.
- The in-app browser viewport override was reset and the tab was restored to `/index.html`.

## 2026-06-15 - v1.0.1 plain homepage section notes

Scope:
- Removed the decorative badge/pill treatment from homepage section notes after browser review.
- Converted `.aix-section-note` and `.aix-status-pill` into plain text labels with no frame, dot, padding, radius, or background.
- Removed the mobile full-width centered badge behavior for these labels.
- Kept the label text in place so sections still have their short context line.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-plain-section-notes-20260615`.
- Added a homepage contract test to prevent the badge styling from returning.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 14 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 520x765 on `/index.html?qa=plain-section-notes-20260615#learning-system`: loaded `styles.css?v=aix-plain-section-notes-20260615`, found 7 homepage section labels, confirmed every `.aix-section-note` and `.aix-status-pill` resolved to `display: block`, `padding-left/right: 0px`, `border-top-width: 0px`, `border-radius: 0px`, transparent background, and `::before` display `none`.
- Browser QA confirmed no horizontal overflow and no console warning/error logs; the viewport override was reset and the in-app browser was restored to `/index.html`.

## 2026-06-12 - v1.0.1 themed background Meteors

Scope:
- Tuned the site-wide Meteors background so the color changes between light and dark mode.
- Made the light-mode meteors use a clearer blue/sky trail and the dark-mode meteors use a brighter sky/white trail.
- Increased the meteor trail length and glow so the effect is more visible without adding foreground content.
- Moved the meteor field behind the page content with `z-index: 0`, `pointer-events: none`, and a content-layer rule for body children.
- Kept the existing shared `site-footer.js` injection and only changed the CSS theme/presentation layer.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-meteors-theme-20260612`.
- Updated the homepage contract test to preserve the themed Meteors background behavior.

Changed files:
- `admin.html`
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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- Browser QA desktop 1440x900 on `/index.html?qa=meteors-theme-layer-desktop-20260612#home`: loaded `styles.css?v=aix-meteors-theme-20260612`, rendered 16 site-wide meteors, light mode resolved to blue/sky tokens with `mix-blend-mode: multiply` and opacity `0.34`, dark mode resolved to sky/white tokens with `mix-blend-mode: screen` and opacity `0.42`, meteor trails resolved to `68px`, the field stayed at `z-index: 0`, content containers stayed above at `z-index: 1`, `elementFromPoint` did not hit the meteor field, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844 on `/index.html?qa=meteors-theme-layer-mobile-20260612#home`: loaded `styles.css?v=aix-meteors-theme-20260612`, verified the same light/dark color switch, kept `pointer-events: none`, kept the field behind content, reported 16 meteors, kept horizontal overflow at `0`, and console warning/error logs were empty.
- The in-app browser viewport override was reset and the tab was restored to `/index.html`.

## 2026-06-12 - v1.0.1 larger mobile hero orbit

Scope:
- Enlarged the homepage hero orbit visual for mobile viewports after browser review.
- Increased the mobile orbit block height from `clamp(280px, 38svh, 300px)` to `clamp(330px, 42svh, 370px)`.
- Increased the mobile orbit stage from `min(24rem, calc(100vw - 48px))` to `min(27.5rem, calc(100vw - 28px))`.
- Increased the mobile orbit ring sizes to `9.75rem`, `14.25rem`, and `18.5rem`.
- Increased mobile orbit node/logo sizes while keeping the centered mobile layout.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-mobile-orbit-larger-20260612`.
- Updated the homepage contract test to preserve the larger mobile orbit sizing.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 390x844 on `/index.html?qa=mobile-orbit-larger-overflow-390-20260612#home`: loaded `styles.css?v=aix-mobile-orbit-larger-20260612`, kept `.aix-stack-orbit` overflow visible, centered the `362px` orbit stage, increased orbit nodes to `38px`, kept the stage within the viewport, kept the orbit inside the hero frame, and horizontal overflow stayed `0`.
- Browser QA mobile 520x765 on `/index.html?qa=mobile-orbit-larger-overflow-520-20260612#home`: loaded `styles.css?v=aix-mobile-orbit-larger-20260612`, kept `.aix-stack-orbit` overflow visible, centered the `440px` orbit stage, increased orbit nodes to `38px`, kept the stage within the viewport, kept the orbit inside the hero frame, and horizontal overflow stayed `0`.
- Browser QA console warning/error logs were empty, and the in-app browser was restored to `/index.html`.

## 2026-06-12 - v1.0.1 site-wide Meteors background

Scope:
- Corrected the Meteors integration from a hero-only background to a site-wide web background.
- Removed the `aix-meteor-field` markup from the homepage hero.
- Added shared `ensureSiteMeteors()` injection in `site-footer.js` so every public page that loads the shared footer script receives the same Meteors background.
- Increased the deterministic meteor set from 12 hero-scoped spans to 16 site-wide spans distributed across the viewport.
- Changed the Meteors layer to fixed viewport positioning with low opacity, `pointer-events: none`, and light/dark blend tuning.
- Kept the removed GSAP/site-motion layer disabled; this change uses the lightweight static CSS keyframes only.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-site-meteors-20260612`.
- Bumped the shared footer script cache-bust query to `site-footer.js?v=site-footer-site-meteors-20260612`.
- Updated the homepage contract test to preserve the site-wide background injection.

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
- `site-footer.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "site-motion\.js|assets/vendor/gsap\.min\.js" *.html || true` returned no public HTML matches.
- Browser QA desktop 1440x900 on `/index.html?qa=site-meteors-desktop-20260612#home`: the page loaded `styles.css?v=aix-site-meteors-20260612` and `site-footer.js?v=site-footer-site-meteors-20260612`, rendered `.aix-site-meteor-field` with `position: fixed`, covered the full `1440x900` viewport, rendered 16 meteor spans, had no old hero `.aix-meteor-field`, used `animationName: "aixMeteor"`, had `pointerEvents: none`, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844 on `/index.html?qa=site-meteors-mobile-20260612#home`: the site-wide meteor field covered the full `390x844` viewport, rendered 16 meteor spans, had no old hero `.aix-meteor-field`, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA secondary route on `/payment.html?qa=site-meteors-payment-20260612` redirected to `/login` as expected for gated payment access while still loading the shared site-wide meteor field, `styles.css?v=aix-site-meteors-20260612`, and `site-footer.js?v=site-footer-site-meteors-20260612`.

## 2026-06-12 - v1.0.1 hero Meteors background port

Scope:
- Ported the supplied 21st.dev Meteors component into the current static HTML/CSS website instead of adding a React/Tailwind/shadcn runtime to the root project.
- Confirmed `npx shadcn@latest info --json` reports the root project as `Manual` with no shadcn config, no TypeScript config, and no Tailwind config.
- Added a decorative `aix-meteor-field` layer inside the homepage stack hero frame only.
- Added 12 deterministic meteor spans with CSS custom properties for position, delay, duration, and travel distance.
- Added `@keyframes aixMeteor`, light/dark meteor colors, and `prefers-reduced-motion` handling that stops the meteor animation.
- Kept the removed site-wide moving-light layer disabled; this change does not re-add `site-motion.js` or GSAP to public pages.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-hero-meteors-20260612`.
- Updated the homepage contract test to preserve the hero-scoped Meteors port.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `npx shadcn@latest info --json` reported `frameworkName: "manual"`, `typescript: false`, `tailwindVersion: null`, and no shadcn config for the root project.
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "site-motion\.js|assets/vendor/gsap\.min\.js" *.html || true` returned no public HTML matches.
- Browser QA desktop 1440x900 on `/index.html?qa=hero-meteors-desktop-20260612#home`: the page loaded `styles.css?v=aix-hero-meteors-20260612`, rendered 12 meteor spans, the sample meteor resolved to `animationName: "aixMeteor"`, `animationDuration: "8s"`, dark-mode meteor color `rgba(226, 232, 240, 0.78)`, the meteor field had `zIndex: 0`, the hero copy had `zIndex: 2`, pointer events were disabled on the meteor field, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844 on `/index.html?qa=hero-meteors-mobile-20260612#home`: the page loaded `styles.css?v=aix-hero-meteors-20260612`, rendered 12 meteor spans, kept the hero orbit centered with stage delta from frame `0`, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-12 - v1.0.1 centered mobile hero orbit

Scope:
- Centered the homepage hero orbit visual on mobile viewports after browser review.
- Changed the mobile hero frame to a single centered column with centered copy and full-width hero actions.
- Changed only the mobile orbit stage from the desktop cropped-right layout to a centered `left: 50%` stage.
- Constrained the mobile orbit stage to `min(24rem, calc(100vw - 48px))` so the visual stays centered without horizontal overflow.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-mobile-hero-centered-20260612`.
- Updated the homepage contract test to preserve the centered mobile hero orbit.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 520x765 on `/index.html?qa=mobile-hero-centered-20260612#home`: the page loaded `styles.css?v=aix-mobile-hero-centered-20260612`, the hero frame resolved to one centered column, orbit and orbit stage centers matched at `centerX: 260`, stage delta from orbit was `0`, the stage stayed inside the viewport, horizontal overflow stayed `0`, and console warning/error logs were empty.
- Browser QA mobile 390x844 on `/index.html?qa=mobile-hero-centered-390-20260612#home`: the page loaded `styles.css?v=aix-mobile-hero-centered-20260612`, orbit and orbit stage centers matched at `centerX: 195`, stage delta from orbit was `0`, the stage stayed inside the viewport, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-12 - v1.0.1 mobile Luma scroll auto-hide

Scope:
- Added scroll-direction behavior to the shared mobile Luma navbar.
- The mobile nav now slides down out of view when the user scrolls down and slides back up when the user scrolls up.
- Kept the nav visible at the top of the page and after nav item clicks.
- Added a small scroll threshold to avoid flickering during tiny scroll movements.
- Disabled pointer and tab focus on the nav while it is hidden.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-luma-scroll-auto-hide-20260612`.
- Bumped the shared footer script cache-bust query to `site-footer.js?v=site-footer-luma-scroll-auto-hide-20260612`.
- Updated the homepage contract test to preserve the scroll auto-hide behavior.

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
- `site-footer.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 520x765 on `/index.html?qa=luma-scroll-auto-hide-20260612#home`: the page loaded `styles.css?v=aix-luma-scroll-auto-hide-20260612` and `site-footer.js?v=site-footer-luma-scroll-auto-hide-20260612`, the nav was visible at the top, scrolling down added `is-hidden`, set `aria-hidden="true"`, `opacity: 0`, `transform: matrix(1, 0, 0, 1, 0, 92)`, disabled shell pointer events, and set nav links to `tabIndex: -1`; scrolling back up removed `is-hidden`, restored `aria-hidden="false"`, `opacity: 1`, `transform: matrix(1, 0, 0, 1, 0, 0)`, restored shell pointer events, and returned nav links to `tabIndex: 0`.
- Browser QA reported no console warning/error logs and no horizontal overflow.

## 2026-06-12 - v1.0.1 softer mobile Luma glow

Scope:
- Reduced the mobile Luma navbar glow after browser review so the selected item no longer produces a strong blue halo.
- Softened the mobile nav shell border, background, shadow, and backdrop blur for dark mobile viewports.
- Reduced the active mobile nav icon scale from `1.18` to `1.08` and tuned the active blue to a softer tone.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-luma-soft-glow-20260612`.
- Updated the homepage contract test to preserve the softer glow settings.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 390x844 on `/index.html?qa=luma-soft-glow-20260612`: dark mode loaded `styles.css?v=aix-luma-soft-glow-20260612`, mobile Luma nav remained visible, the glow computed at `44px` by `44px`, `opacity: 0.38`, `filter: blur(14px)`, active icon scale resolved to `matrix(1.08, 0, 0, 1.08, 0, 0)`, horizontal overflow stayed `0`, and console warning/error logs were empty.

## 2026-06-12 - v1.0.1 DisplayCards hover lift correction

Scope:
- Corrected the homepage `#learning-system` DisplayCards port after browser review so it behaves closer to the supplied component.
- Changed the display cards to a fixed `h-36`-style height with concise one-line descriptions so the text is visible when each card lifts.
- Added card-specific `--card-hover-y` positions matching the original Tailwind hover behavior: first card lifts to `-40px`, second card lifts from `40px` to `-4px`, and third card lifts from `80px` to `40px`.
- Raised hovered cards to `z-index: 10` so pointing at cards behind the stack brings them above the other cards.
- Preserved grayscale-to-color hover behavior and the background overlay fade from the original component.
- Tuned mobile offsets so the hover-ready card stack stays inside the viewport without horizontal overflow.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-display-cards-hover-20260612`.
- Updated the homepage contract test to preserve the hover lift behavior.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "script\.js\?v=|styles\.css\?v=|aix-display-cards-hover|is-lifted|aix-display-cards-20260612" index.html *.html script.js styles.css tests/homepage-contract.test.mjs` confirmed the new stylesheet and script cache-bust versions, `is-lifted` runtime hook, and no stale `aix-display-cards-20260612` references.
- Browser QA desktop 1440x900 on `#learning-system`: pointing/clicking the visible area of the second card set `is-lifted`, changed the transform from `translateY(40px)` to `translateY(-4px)`, raised the card to `z-index: 10`, removed grayscale, exposed the `Work recipe` text, kept horizontal overflow at 0, and reported no console warnings/errors.
- Browser QA mobile 390x844 on `#learning-system`: the responsive card stack loaded `styles.css?v=aix-display-cards-hover-20260612` and `script.js?v=aix-display-cards-hover-20260612`, all cards stayed inside the viewport width, horizontal overflow stayed at 0, the Luma nav remained visible, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 learning system DisplayCards port

Scope:
- Reworked the homepage `#learning-system` section for the headline `จากเรื่องใหม่ในวงการ AI สู่ขั้นตอนที่ทีมเอาไปใช้ได้`.
- Ported the attached 21st.dev `DisplayCards` React/Tailwind component into static HTML/CSS so it fits the current non-React public site runtime.
- Replaced the old learning preview and step-list panel with three stacked display cards: `Update brief`, `Work recipe`, and `Resource pack`.
- Added skewed stacked-card positioning, grayscale-to-color hover behavior, blurred card surfaces, gradient edge masks, responsive mobile offsets, and reduced-motion handling.
- Reused the existing Font Awesome icon stack instead of adding `lucide-react` or a React/Tailwind build path to this static site.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-display-cards-20260612`.
- Expanded the homepage contract test to preserve the DisplayCards section port.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 13 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "styles\.css\?v=|aix-thai-ibm-plex|class=\"aix-learning-panel\"|class=\"aix-system-steps\"" *.html tests/homepage-contract.test.mjs` confirmed public pages now use `styles.css?v=aix-display-cards-20260612` and the homepage no longer renders the old learning panel or step-list classes.
- Browser QA desktop 1440x900 on `#learning-system`: the page loaded `styles.css?v=aix-display-cards-20260612`, rendered 3 `.aix-display-card` items, removed the old learning panel and step list, kept all cards inside the viewport width, had no horizontal overflow, and reported no console warnings/errors.
- Browser QA mobile 390x844 on `#learning-system`: the page loaded `styles.css?v=aix-display-cards-20260612`, rendered 3 responsive display cards, kept the rightmost card within the viewport at 377px of 390px, had no horizontal overflow, kept the Luma mobile nav visible, and reported no console warnings/errors.

## 2026-06-12 - v1.0.1 IBM Plex Thai typography pass

Scope:
- Applied the `praneet-front` typography direction to the public AiX website.
- Replaced the old `Bai Jamjuree` and `Chakra Petch` font loading with the supplied IBM Plex Thai Google Fonts URL on all public HTML pages.
- Updated the global CSS font tokens so body/interface text uses `IBM Plex Sans Thai Looped` and display text uses `IBM Plex Sans Thai`.
- Preserved Thai-safe fallback fonts: `Noto Sans Thai`, `Sukhumvit Set`, `Thonburi`, `system-ui`, and `sans-serif`.
- Added a Thai typography contract for `html[lang="th"]` to keep Thai letter spacing at zero, avoid Thai word-break rules, and keep paragraph/body line-height at `1.7`.
- Capped Thai display and compact UI text at font weight `600` so it matches the supplied IBM Plex Thai font weights instead of relying on synthetic 700-900 rendering.
- Removed old `word-break: break-word` declarations from the stylesheet.
- Bumped the public stylesheet cache-bust query to `styles.css?v=aix-thai-ibm-plex-20260612`.
- Expanded the homepage contract test to preserve the new Thai typography system and font-loading URL.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 12 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "Bai Jamjuree|Chakra Petch|Bai\+Jamjuree|Chakra\+Petch|wght;|word-break:\s*break-(word|all)" styles.css *.html tests/homepage-contract.test.mjs` found no live website references to the old fonts or invalid Thai word-break rules.
- Browser QA desktop 1440x900 on `/index.html`: the loaded stylesheet was `styles.css?v=aix-thai-ibm-plex-20260612`, the only Google Fonts URL was the supplied IBM Plex Thai URL, body text resolved to `IBM Plex Sans Thai Looped`, Hero and nav display text resolved to `IBM Plex Sans Thai`, both loaded font checks passed, no old font links were present, no horizontal overflow occurred, and no console warnings/errors were reported.
- Browser QA mobile 390x844 on `/index.html`: the loaded stylesheet and font URL matched the new IBM Plex Thai system, body text resolved to `IBM Plex Sans Thai Looped`, Hero and mobile Luma nav labels resolved to `IBM Plex Sans Thai`, body text line-height resolved to `27.2px`, mobile bottom padding remained `96px`, no horizontal overflow occurred, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 shared mobile Luma navbar

Scope:
- Added a static HTML/CSS/JS port of the requested futuristic Luma-style navbar for mobile viewports.
- Implemented it through `site-footer.js` so public pages that load the shared footer receive the same mobile bottom nav.
- Kept the active production root dependency-free because the root project is a static HTML/Express app, not a shadcn, Tailwind, TypeScript, or React runtime.
- Added six mobile actions: home, search/catalog, member loop, learning path, pricing, and account.
- Added active glow positioning, mobile-only visibility, safe-area bottom spacing, dark-mode styling, focus labels, and reduced-motion support.
- Hid the homepage hover-gradient top nav on mobile while preserving it on desktop.
- Bumped stylesheet and shared footer cache-bust queries across public HTML pages.
- Expanded the homepage contract test to preserve the shared mobile Luma navbar.

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
- `site-footer.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 11 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA mobile 390x844 on `/`: the Luma mobile nav rendered as `position: fixed`, displayed 6 actions, showed the active glow state on `หน้าแรก`, hid the old homepage top hover-gradient nav, applied `96px` bottom body padding, had no horizontal overflow, and reported no console warnings/errors.
- Browser QA mobile 390x844 on the account/dashboard path: the shared footer script injected the same Luma mobile nav, selected `บัญชี` as the active item, applied `96px` bottom body padding, had no horizontal overflow, and reported no console warnings/errors.
- Browser QA desktop 1440x900 on `/`: the Luma mobile nav resolved to `display: none`, the desktop hover-gradient nav stayed visible in the top header, had no horizontal overflow, and reported no console warnings/errors.

## 2026-06-12 - v1.0.1 homepage brand lockup size reduction

Scope:
- Reduced the homepage header brand lockup size after browser review.
- Shrunk the desktop icon card from 56px to 44px and reduced the title/tagline type scale.
- Shrunk the mobile icon card from 48px to 40px and reduced mobile title/tagline sizes.
- Bumped the homepage stylesheet cache-bust query so the smaller brand lockup loads in the browser.
- Updated the homepage contract test to preserve the smaller logo lockup dimensions.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode: the brand lockup reduced to 196px wide with a 44px icon card, the title rendered at 19.44px, the tagline rendered at 13.68px, the navbar had 82px of clearance from the brand, no horizontal overflow occurred, and no console warnings/errors were reported.
- Browser QA mobile 390x844 in dark mode: the brand lockup reduced to 159px wide with a 40px icon card, the title rendered at 16px, the tagline rendered at 10.56px, no horizontal overflow occurred, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 homepage brand lockup update

Scope:
- Replaced the homepage header's single image logo with a structured brand lockup matching the supplied reference direction.
- Added a black rounded-square AiX icon card, `AiX Club` title, and `AI for business teams` tagline.
- Reused the existing `AiX logo/iconwhite_bgblack.png` asset instead of creating a new logo file.
- Added light/dark/mobile CSS overrides so the icon remains full contrast and the text stays readable.
- Adjusted desktop nav positioning and spacing so the larger left brand lockup does not collide with the centered navbar.
- Bumped the homepage stylesheet cache-bust query so the new brand lockup loads in the browser.
- Expanded the homepage contract test to preserve the brand lockup structure and styling.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode: the brand lockup rendered as a horizontal flex row with a 56px black rounded icon card, `AiX Club` title, `AI for business teams` tagline, `filter: none` on the icon image, 26px gap before the navbar, no collision with the theme toggle, no horizontal overflow, and no console warnings/errors were reported.
- Browser QA mobile 390x844 in dark mode: the brand lockup reduced to a 48px icon card, title and tagline remained visible, the top nav stayed below as a horizontal-scroll icon row, no horizontal overflow occurred, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 desktop navbar top-gap removal

Scope:
- Removed the visible desktop gap above the hover-gradient navbar after browser review.
- Kept the logo and theme toggle visible while moving the desktop nav into the same top header band.
- Added a desktop-only absolute positioning override for the hover-gradient nav so it no longer creates a second header row.
- Bumped the homepage stylesheet cache-bust query so the gapless header nav loads in the browser.
- Updated the homepage contract test to preserve the desktop gapless navbar positioning.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode: the hover-gradient nav resolved to `position: absolute` inside `.aix-home-header`, started 8px below the header top, no longer created a second header row, the Hero started immediately below the compact header, no horizontal overflow occurred, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 hover gradient navbar moved to top header

Scope:
- Moved the hover-gradient homepage navigation from the fixed bottom dock into the sticky top header.
- Replaced the bottom body spacing class with `aix-top-nav-active` so the page no longer reserves space below the viewport.
- Updated the hover-gradient nav CSS to render as a top header row with horizontal scrolling on small screens.
- Bumped the homepage stylesheet cache-bust query so the top navbar layout loads in the browser.
- Updated the homepage contract test to preserve the top-header navbar placement.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900: the hover-gradient nav rendered inside `.aix-home-header`, resolved to `position: relative`, started below the logo/theme row, no bottom body padding remained, no horizontal overflow, and no console warnings/errors were reported.
- Browser QA mobile 390x844: the hover-gradient nav remained inside the top header, labels stayed hidden while 8 icon items were available through horizontal nav scrolling, no page-level horizontal overflow occurred, and no console warnings/errors were reported.

## 2026-06-12 - v1.0.1 hero orbit logo dark contrast fix

Scope:
- Fixed dark-mode Hero orbit logo badges after browser review where black logo text disappeared on the dark Hero background.
- Added a dark-mode override for `.aix-stack-hero .aix-orbit-node` so orbit logos sit on a light badge with a visible border.
- Preserved full-color logo images by keeping `.aix-stack-hero .aix-orbit-logo` unfiltered and fully opaque in dark mode.
- Bumped the homepage stylesheet cache-bust query so the new Hero logo contrast rules load in the browser.
- Expanded the homepage contract test to preserve the dark Hero orbit logo badge contrast rule.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode at `#home`: all 12 Hero `.aix-orbit-node` badges resolved to `rgb(250, 250, 250)` background, `rgb(63, 63, 70)` border, and `rgb(24, 24, 27)` foreground; all orbit logo images resolved to `filter: none` and opacity 1; no horizontal overflow and no console warnings/errors were reported.
- Confirmed the homepage stylesheet cache-bust query is now `styles.css?v=aix-orbit-logo-badge-20260612`.

## 2026-06-12 - v1.0.1 hover gradient navbar replacement

Scope:
- Replaced the homepage top navigation menu with a static HTML/CSS port of the attached `HoverGradientNavBar` React component.
- Kept the active production root static instead of adding React, TypeScript, Tailwind, framer-motion, or lucide dependencies.
- Moved the homepage navigation into a fixed bottom hover-gradient dock with 8 actions: home, membership loop, learning system, catalog, business cases, pricing, login, and signup.
- Left the header as a compact brand and theme-toggle bar so the old top navbar and mobile hamburger no longer duplicate the new navigation.
- Updated the login button UI update logic so member state changes update the new flip-nav labels without destroying the nested icon/face markup.
- Bumped the homepage stylesheet cache-bust query so the new navbar CSS loads instead of cached CSS.
- Expanded the homepage contract test to preserve the hover-gradient navbar replacement.

Changed files:
- `index.html`
- `script.js`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 10 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode: old homepage `.main-nav` and `#mobileMenu` were absent, the fixed bottom hover-gradient nav rendered 8 items, the stylesheet cache-bust query loaded as `styles.css?v=aix-hover-gradient-nav-20260612`, labels were visible, no horizontal overflow, and no console warnings/errors.
- Browser interaction QA: the catalog nav item scrolled to `#catalog`, the hover-nav `#loginBtn` opened the auth modal, the modal closed from its close button, and the nested flip-nav label/icon markup stayed intact.
- Browser QA mobile 390x844 in dark mode: the bottom nav filled the bottom bar, labels were hidden while icons remained visible, the top header kept only the brand and theme toggle, no old hamburger was present, no horizontal overflow, and no console warnings/errors.

## 2026-06-12 - v1.0.1 hero headline English update

Scope:
- Updated the homepage Hero headline after browser review.
- Replaced the selected Thai Hero headline with `Build with Ai Learn with Ai`.
- Expanded the homepage contract test to preserve the new Hero headline and prevent the removed Hero headline from returning.

Changed files:
- `index.html`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 9 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA at 1440x900 in dark mode on `#home`: the Hero H1 rendered `Build with Ai Learn with Ai`, the removed Thai Hero headline was absent, the H1 resolved to readable white text, no horizontal overflow, and no console warnings/errors.

## 2026-06-12 - v1.0.1 resource card icon dark contrast fix

Scope:
- Fixed low-contrast resource card icons in dark mode after browser review.
- Added a dark-mode override for `.aix-resource-section .resource-card i` so the icon uses a dark glyph on a light badge with a visible border.
- Bumped the stylesheet cache-bust query on public HTML pages so the icon contrast fix loads instead of cached CSS.
- Expanded the homepage contract test to preserve the resource card dark-mode icon contrast rule.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 9 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "styles\.css\?v=" *.html` confirmed all public HTML pages now use `styles.css?v=aix-resource-icon-20260612`.
- Browser QA in dark mode at `#member-space`: the visible `#resourceList .resource-card i` badge resolved to `rgb(250, 250, 250)` background, `rgb(24, 24, 27)` icon color, `rgb(63, 63, 70)` border, opacity 1, no horizontal overflow, and no console warnings/errors.

## 2026-06-12 - v1.0.1 minimal background-free footer

Scope:
- Redesigned the shared site footer after browser review so it no longer uses a decorative image, gradient, or overlay background.
- Added a minimal footer treatment with a theme-based surface, thin top divider, cleaner column spacing, and transparent footer brand note.
- Added dark-mode footer overrides so the AiX logo, footer headings, links, and description stay readable on the black theme.
- Bumped the stylesheet cache-bust query on public HTML pages so the new footer design loads instead of cached CSS.
- Expanded the homepage contract test to preserve the background-free footer design.

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
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 9 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- `rg -n "styles\.css\?v=" *.html` confirmed all public HTML pages now use `styles.css?v=aix-footer-minimal-20260612`.
- Browser QA in dark mode at the current in-app viewport: `.site-footer` resolved to no background image, `::before` and `::after` resolved to `display: none` with `background-image: none`, footer text and links were readable, no horizontal overflow, and no console warnings/errors were reported.
- Browser QA at 1440x900 in dark mode: the visible footer resolved to `rgb(10, 10, 10)` background, `background-image: none`, `rgb(39, 39, 42)` border, white logo through the dark-mode logo filter, readable text/links, no horizontal overflow, and no console warnings/errors.

## 2026-06-12 - v1.0.1 catalog dark course-card readability fix

Scope:
- Fixed unreadable dark-mode colors in the `#classesGrid` course catalog selected during browser review.
- Added catalog-specific dark-mode overrides for course cards, course titles, provider labels, descriptions, meta rows, skill chips, badges, and detail buttons.
- Updated the homepage stylesheet cache-bust query so the browser loads the new catalog contrast rules.
- Expanded the homepage contract test to preserve the catalog dark-mode readability rules.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 8 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA in dark mode at the current in-app viewport: `#classesGrid` rendered 5 course cards with dark card backgrounds, dark borders, white titles, `#d4d4d8` descriptions/meta text, readable chips, readable detail buttons, no horizontal overflow, and no console warnings/errors.
- Browser QA at 1440x900 in dark mode: the visible `#classesGrid` course card resolved to `rgb(10, 10, 10)` background, `rgb(39, 39, 42)` border, `rgb(250, 250, 250)` titles/buttons, `rgb(212, 212, 216)` body text, `rgb(228, 228, 231)` chip text, no horizontal overflow, and no console warnings/errors.
- Confirmed the homepage stylesheet cache-bust query is now `styles.css?v=aix-dark-catalog-20260612`, so the catalog contrast rules load in the browser.

## 2026-06-12 - v1.0.1 member-space dark readability fix

Scope:
- Fixed unreadable dark-mode colors in the `#member-space` resource grid selected during browser review.
- Added dark-mode overrides for `.aix-resource-stack` cards, labels, titles, and descriptions.
- Expanded the homepage contract test to preserve resource stack dark-mode contrast rules.

Changed files:
- `index.html`
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 8 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode at `#member-space`: the selected `.aix-resource-stack` cards resolve to dark card backgrounds, dark borders, white titles, `#d4d4d8` body text, readable label chips, no horizontal overflow, and no console warnings/errors were reported.
- Confirmed the homepage stylesheet cache-bust query is now `styles.css?v=aix-dark-resource-20260612`, so the new resource-stack contrast rules load in the browser.

## 2026-06-12 - v1.0.1 dark mode readability pass

Scope:
- Improved dark-mode readability for the homepage after browser review.
- Increased dark header navigation and login text contrast.
- Made the header brand logo render as a crisp white mark in dark mode.
- Made the Hero center logo invert cleanly in dark mode instead of retaining a low-contrast grayscale treatment.
- Raised secondary body text contrast in the Hero, section intro copy, cards, paths, resources, cases, FAQ, and learning preview.
- Expanded the homepage contract test to preserve these dark-mode logo and text contrast rules.

Changed files:
- `styles.css`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 8 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 in dark mode: header logo renders crisp white, header navigation and login text resolve to `rgb(244, 244, 245)`, Hero secondary copy resolves to `rgb(212, 212, 216)`, center logo preserves detail with dark-mode invert filter, no horizontal overflow, and no console warnings/errors were reported.
- Browser QA mobile 659x765 in dark mode: header logo remains visible, Hero secondary copy and section text are readable, center logo stays visible at the cropped edge, and no horizontal overflow or console warnings/errors were reported.

## 2026-06-12 - v1.0.1 homepage light dark toggle

Scope:
- Added a top-right light/dark theme toggle to the homepage header.
- Implemented the toggle in the active static HTML/Express homepage instead of React, because the production root does not run React.
- Reused the existing Font Awesome icon library for the sun/moon icons and kept the switch layout aligned with the requested component behavior.
- Persisted the selected theme in `localStorage` with the `aix-theme` key.
- Applied the `html.dark` class, updated the browser theme color meta tag, and added homepage dark-mode surface/button overrides so the page remains readable.
- Added a homepage contract test to keep the toggle markup, CSS state, and JavaScript wiring in place.

Changed files:
- `index.html`
- `styles.css`
- `script.js`
- `tests/homepage-contract.test.mjs`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `node --test tests/homepage-contract.test.mjs` passed: 8 tests, 0 failures.
- `git diff --check` passed.
- `curl -fsS --max-time 8 http://127.0.0.1:3000/api/health` returned `{"ok":true,"service":"aix-club",...}`.
- Browser QA desktop 1440x900 on `/`: the desktop header toggle is visible at the top right, sized 64x32, switches to dark mode, updates `theme-color` to `#0a0a0a`, persists after reload, switches back to light mode, and no page overflow or console warnings/errors were reported.
- Browser QA mobile 659x765 on `/`: the mobile header toggle is visible at the top right, sized 64x32, the desktop nav-actions parent remains hidden, dark mode persists after reload, light mode restores correctly, and no page overflow or console warnings/errors were reported.

## 2026-06-12 - v1.0.1 shadcn theme toggle component

Scope:
- Verified the active production root is still a static HTML/Express app, not a React, TypeScript, Tailwind, or shadcn root.
- Located the existing ignored shadcn/Vite/TypeScript app at `old aix-club/` and used its configured UI path for the requested component.
- Added the requested `ThemeToggle` component and demo wrapper to the shadcn app without installing duplicate dependencies.
- Documented the current root limitation, correct shadcn paths, dependency status, and future production setup options.

Changed files:
- `old aix-club/client/src/components/ui/theme-toggle.tsx`
- `old aix-club/client/src/components/ui/theme-toggle-demo.tsx`
- `docs/development/SHADCN_THEME_TOGGLE_SETUP.MD`
- `docs/development/UPDATE_LOG.MD`

Validation:
- `npx shadcn@latest info --json` from the production root returned `framework: Manual`, `typescript: false`, `tailwindVersion: null`, and `config: null`.
- `cd old aix-club && npx shadcn@latest info --json` returned `framework: Vite`, `typescript: true`, `tailwindVersion: v4`, global CSS at `client/src/index.css`, and UI path at `client/src/components/ui`.
- `old aix-club/package.json` and `old aix-club/pnpm-lock.yaml` already include `lucide-react`, so no new dependency install was needed.
- `cd old aix-club && npx pnpm@10.4.1 check` still fails from pre-existing missing app modules: `./pages/Login`, `./pages/AIClasses`, `@/components/Navbar`, and `@/components/Footer`.
- Targeted TypeScript check with a temporary tsconfig for `theme-toggle.tsx`, `theme-toggle-demo.tsx`, and `lib/utils.ts` passed.
- `cd old aix-club && npx tsx -e "Promise.all([import('./client/src/components/ui/theme-toggle.tsx'), import('./client/src/components/ui/theme-toggle-demo.tsx')]).then(() => console.log('theme-toggle imports ok'))"` passed.
- `git diff --check` passed.

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
