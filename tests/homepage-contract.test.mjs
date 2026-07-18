import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const html = await readFile(join(root, "index.html"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");
const script = await readFile(join(root, "script.js"), "utf8");
const classDetailHtml = await readFile(join(root, "class-detail.html"), "utf8");
const classDetailScript = await readFile(join(root, "class-detail.js"), "utf8");
const toolsBoxHtml = await readFile(join(root, "tools-box.html"), "utf8");
const toolsBoxScript = await readFile(join(root, "tools-box.js"), "utf8");
const serverScript = await readFile(join(root, "server.js"), "utf8");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const envExample = await readFile(join(root, ".env.example"), "utf8");
const renderYaml = await readFile(join(root, "render.yaml"), "utf8");
const supabaseMigration = await readFile(join(root, "supabase/migrations/20260701000000_aix_initial_schema.sql"), "utf8");
const supabasePolicyMigration = await readFile(join(root, "supabase/migrations/20260701001000_aix_server_only_rls_policies.sql"), "utf8");
const postgresWorker = await readFile(join(root, "postgres-worker.js"), "utf8");
const footer = await readFile(join(root, "site-footer.js"), "utf8");
const themeTokens = await readFile(join(root, "docs/development/AIX_THEME_TOKENS.MD"), "utf8");
const authMascot = await readFile(join(root, "assets/mascot/aix-auth-mascot.png"));
const authRegisterMascot = await readFile(join(root, "assets/mascot/aix-auth-mascot-register-peek-no-panel.png"));
const manusLogo = await readFile(join(root, "assets/ai-logos/manus.webp"));
const workproofBefore = await readFile(join(root, "assets/generated/aix-real-work-before-generated.png"));
const workproofAfter = await readFile(join(root, "assets/generated/aix-real-work-after-generated.png"));
const currentCssCacheBust = /styles\.css\?v=aix-(?:hero-title-refined-v70|hero-empty-state-polish-v68)-20260703/;
const currentScriptCacheBust = /script\.js\?v=aix-hero-empty-state-hardfix-v69-20260703/;

function cssRuleBlock(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `Missing CSS rule for ${selector}`);
  const end = css.indexOf("\n}", start);
  assert.notEqual(end, -1, `Missing CSS rule end for ${selector}`);
  return css.slice(start, end + 2);
}

const publicFiles = [
  "index.html",
  "site-footer.js",
  "script.js",
  "styles.css",
  "class-detail.html",
  "course-content.html",
  "course-learn.html",
  "course-start.html",
  "dashboard.html",
  "live-class.html",
  "payment.html",
  "payment-success.html",
  "tools-box.html"
];

const requiredHooks = [
  'id="classFilters"',
  'id="classesGrid"',
  'id="resourceList"',
  'id="authModal"',
  'id="toast"',
  'id="memberForm"',
  'id="loginForm"',
  'id="sendOtpBtn"',
  'id="verifyOtpBtn"',
  'data-open-signup',
  'data-open-login'
];

const bannedPublicPatterns = [
  /aix-companion/i,
  /aix-class-mascot/i,
  /aix-mascot/i,
  /Ax Class Companion/i,
  /AiX Assistant/i,
  /footer-mascot/i,
  /hero-mascot/i,
  /cta-mascot/i,
  /decor-mascot/i,
  /signup-mascot/i,
  /course-visual-mascot/i,
  /mascot-1/i,
  /มาสคอต/,
  /assets\/generated\/home/i,
  /aix-hero-stage/i,
  /aix-hero-visual/i,
  /aix-live-note/i,
  /aix-learning-screen/i,
  /aix-motion-strip/i,
  /Poppins/i,
  /Open Sans/i,
  /Inconsolata/i,
  /\bInter\b/i
];

test("homepage rebuild has the new AiX brand surface and keeps runtime hooks", async () => {
  assert.doesNotMatch(html, /class="skip-link"|ข้ามไปเนื้อหาหลัก|ข้ามไปหน้าเนื้อหา/);
  assert.match(html, /<main id="main-content" class="aix-homepage-redesign" tabindex="-1">/);
  assert.doesNotMatch(css, /\.skip-link/);
  assert.match(html, /class="brand brand-lockup"/);
  assert.match(html, /src="AiX%20logo\/iconwhite_bgblack\.png"/);
  assert.match(html, /<span class="brand-title">AiX Club<\/span>/);
  assert.match(html, /<span class="brand-tagline">AI for business teams<\/span>/);
  assert.doesNotMatch(html, /<a class="brand" href="#home" aria-label="AiX Club home">\s*<img src="AiX%20logo\/textblack\.png"/);
  assert.match(css, /\.brand-lockup\s*\{[\s\S]*?gap:\s*9px;[\s\S]*?text-decoration:\s*none;/);
  assert.match(css, /\.aix-home-header \.brand-lockup\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;/);
  assert.match(css, /\.brand-icon-card\s*\{[\s\S]*?width:\s*44px;[\s\S]*?border-radius:\s*14px;[\s\S]*?background:\s*#050505;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.brand-icon-card\s*\{[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;[\s\S]*?border-radius:\s*13px;/);
  assert.match(css, /\.brand-title\s*\{[\s\S]*?font-weight:\s*850;[\s\S]*?white-space:\s*nowrap;/);
  assert.match(css, /\.brand-tagline\s*\{[\s\S]*?color:\s*var\(--muted-foreground\);[\s\S]*?font-weight:\s*800;/);
  assert.match(css, /\.dark \.brand-lockup \.brand-icon\s*\{[\s\S]*?filter:\s*none;[\s\S]*?opacity:\s*1;/);
  assert.match(html, /Build with[\s\S]*?Learn with[\s\S]*?Ai/);
  assert.doesNotMatch(html, /เรียน AI ต่อเนื่องทั้งปี ด้วยระบบที่พาคุณใช้กับงานจริง/);
  assert.match(html, /1,999 บาทต่อปี/);
  assert.match(html, /ไม่ต้องไล่ตาม <span class="aix-highlight-mark">AI คนเดียว<\/span>/);
  assert.match(html, /id="member-loop"/);
  assert.match(html, /id="learning-system"/);
  assert.match(html, /id="catalog"/);
  assert.match(html, /id="membership"/);
  assert.match(html, /id="faq"/);

  for (const hook of requiredHooks) {
    assert.ok(html.includes(hook), `missing homepage runtime hook ${hook}`);
  }
});

test("homepage auth modal uses the shadcn-style sign-in card port without breaking hooks", () => {
  assert.match(html, /class="modal-panel auth-panel auth-card-shell" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle" tabindex="-1"/);
  assert.match(html, /<div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="classModalTitle" tabindex="-1">/);
  assert.match(html, /class="auth-register-back-row" data-auth-head="signup" hidden/);
  assert.doesNotMatch(html, /auth-card-head-login|data-auth-head="login"|fa-user-lock|ระบบสมาชิก AiX|เข้าสู่พื้นที่สมาชิกเพื่อเรียน AI และจัดการ resource ของคุณ/);
  assert.doesNotMatch(html, /auth-card-head-signup|fa-user-plus|สร้างบัญชีเพื่อเข้าเรียนและเก็บ resource ที่ใช้กับทีมได้/);
  assert.match(html, /class="auth-back-btn" type="button" data-auth-tab="login" aria-label="ย้อนกลับไปหน้าเข้าสู่ระบบ"/);
  assert.match(html, /id="googleSignupButton"/);
  assert.match(html, /id="googleLoginButton"/);
  assert.equal((html.match(/class="auth-mascot-head auth-mascot-head-/g) || []).length, 2);
  assert.equal((html.match(/assets\/mascot\/aix-auth-mascot\.png/g) || []).length, 1);
  assert.equal((html.match(/assets\/mascot\/aix-auth-mascot-register-peek-no-panel\.png/g) || []).length, 1);
  assert.equal((html.match(/class="auth-mascot-speech"/g) || []).length, 1);
  assert.match(html, /class="auth-mascot-speech">ยินดีต้อนรับ<br>กลับมาครับ!<\/p>/);
  assert.match(html, /class="auth-copy auth-copy-login">[\s\S]*?<h2 id="loginModalTitle">AiX Club<\/h2>[\s\S]*?เข้าสู่ระบบเพื่อเรียน AI และจัดการ resource ของคุณ/);
  assert.match(html, /class="auth-copy auth-copy-register">[\s\S]*?<h2 id="signupModalTitle">สมัครสมาชิก AiX Club<\/h2>[\s\S]*?สร้างบัญชีก่อน แล้วระบบจะให้ยืนยันเบอร์ก่อนเข้าสู่ขั้นตอนชำระเงิน/);
  assert.deepEqual([...authMascot.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...authRegisterMascot.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.doesNotMatch(html, /id="googleLoginStatus"|เข้าสู่ระบบด้วย Google เป็นช่องทางหลัก/);
  assert.match(html, /id="googleSignupStatus">สมัครด้วย Google แล้วค่อยยืนยันเบอร์ก่อนชำระเงิน<\/p>/);
  assert.match(html, /id="memberForm" class="member-form auth-form"/);
  assert.match(html, /id="loginForm" class="member-form auth-form"/);
  assert.match(html, /<section class="auth-pane active" id="loginPane">/);
  assert.match(html, /<section class="auth-pane" id="signupPane">/);
  assert.doesNotMatch(html, /class="auth-tabs"/);
  assert.match(html, /id="sendOtpBtn" type="button"/);
  assert.match(html, /id="verifyOtpBtn" type="button"/);
  assert.match(html, /<span>ให้เรียกคุณว่าอะไรดี<\/span>/);
  assert.match(html, /<input id="signupFirstName" name="firstName" autocomplete="given-name" required placeholder="เช่น คุณภูมิ">/);
  assert.match(html, /<input id="signupPhone" name="phone" inputmode="tel" autocomplete="tel" required placeholder="08x-xxx-xxxx">/);
  assert.doesNotMatch(html, /signupLastName|name="lastName"|นามสกุล/);
  assert.doesNotMatch(html, /signupLineId|name="lineId"|Line ID/);
  assert.doesNotMatch(html, /signupBusiness|name="business"|ธุรกิจ \/ งานที่ทำ/);
  assert.doesNotMatch(html, /ไม่จำเป็นต้องกรอก/);
  assert.equal((html.match(/class="auth-input-wrap"/g) || []).length, 8);
  assert.equal((html.match(/fa-regular fa-envelope/g) || []).length, 3);
  assert.equal((html.match(/fa-solid fa-lock/g) || []).length, 3);
  assert.match(html, /<p class="auth-switch-copy">ยังไม่มีบัญชี\? <button type="button" data-auth-tab="signup">สมัครสมาชิก<\/button><\/p>/);
  assert.match(css, /\/\* Static port of the shadcn sign-in form card for the existing AiX auth modal \*\//);
  assert.match(css, /\.modal-backdrop:has\(\.auth-card-shell\)\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*100;/);
  assert.match(css, /\.auth-card-shell\s*\{[\s\S]*?width:\s*min\(392px,\s*calc\(100vw - 36px\)\);[\s\S]*?overflow:\s*visible;[\s\S]*?border-radius:\s*18px;[\s\S]*?background:[\s\S]*?#09090b;/);
  assert.match(css, /@media \(min-width:\s*561px\)\s*\{[\s\S]*?\.modal-backdrop:has\(\.auth-card-shell:not\(\.auth-register-pop\)\)\s*\{[\s\S]*?align-items:\s*flex-start;[\s\S]*?padding-top:\s*clamp\(118px,\s*17vh,\s*136px\);/);
  assert.match(css, /\.auth-register-back-row\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?padding-right:\s*42px;/);
  assert.match(css, /\.auth-mascot-head\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?pointer-events:\s*none;/);
  assert.match(css, /\.auth-mascot-head-login\s*\{[\s\S]*?top:\s*-108px;[\s\S]*?left:\s*-10px;/);
  assert.match(css, /\.modal-backdrop:has\(\.auth-card-shell\)\s*\{[\s\S]*?overflow-x:\s*hidden;/);
  assert.match(css, /\.auth-mascot-head-register\s*\{[\s\S]*?right:\s*-208px;[\s\S]*?overflow:\s*visible;/);
  assert.match(css, /\.auth-mascot-head-register img\s*\{[\s\S]*?width:\s*264px;[\s\S]*?transform:\s*none;/);
  assert.match(css, /\.auth-card-shell \.auth-copy-login\s*\{[\s\S]*?justify-items:\s*center;[\s\S]*?padding-inline:\s*12px;[\s\S]*?text-align:\s*center;/);
  assert.doesNotMatch(css, /\.auth-card-shell \.auth-copy-login\s*\{[\s\S]*?margin-top:\s*116px;/);
  assert.doesNotMatch(css, /@media \(max-width:\s*560px\)\s*\{[\s\S]*?\.auth-card-shell \.auth-copy-login\s*\{[\s\S]*?margin-top:\s*108px;/);
  assert.match(css, /\.auth-mascot-speech\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?border-radius:\s*14px;[\s\S]*?font-weight:\s*900;/);
  assert.match(css, /\.auth-mascot-speech::before\s*\{[\s\S]*?transform:\s*translateY\(-50%\) rotate\(45deg\);/);
  assert.match(css, /\.dark \.auth-mascot-speech\s*\{[\s\S]*?background:\s*#18181b;/);
  assert.match(css, /\.auth-back-btn\s*\{[\s\S]*?min-height:\s*34px;[\s\S]*?border-radius:\s*999px;/);
  assert.match(css, /\.modal-backdrop:has\(\.auth-card-shell\.auth-register-pop\)\s*\{[\s\S]*?align-items:\s*flex-start;[\s\S]*?overflow-y:\s*auto;/);
  assert.match(css, /\.auth-card-shell\.auth-register-pop\s*\{[\s\S]*?width:\s*min\(472px,\s*calc\(100vw - 36px\)\);/);
  assert.match(css, /\.auth-input-wrap\s*\{[\s\S]*?min-height:\s*42px;[\s\S]*?display:\s*flex;[\s\S]*?border:\s*1px solid rgba\(244,\s*244,\s*245,\s*0\.16\);/);
  assert.match(css, /\.auth-input-wrap:focus-within\s*\{[\s\S]*?box-shadow:\s*0 0 0 3px rgba\(250,\s*250,\s*250,\s*0\.1\);/);
  assert.match(css, /#googleSignupButton,\s*[\s\S]*?#googleLoginButton,\s*[\s\S]*?#googleAuthButton\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*visible;/);
  assert.match(css, /#googleSignupButton iframe,\s*[\s\S]*?#googleLoginButton iframe,\s*[\s\S]*?#googleAuthButton iframe\s*\{[\s\S]*?display:\s*block !important;[\s\S]*?min-height:\s*48px !important;/);
  assert.match(css, /\.auth-card-shell \.google-box\s*\{[\s\S]*?overflow:\s*visible;[\s\S]*?border:\s*1px solid rgba\(244,\s*244,\s*245,\s*0\.16\);/);
  assert.match(css, /\.auth-card-shell \.google-box > div\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*50px;[\s\S]*?overflow:\s*visible;/);
  assert.match(css, /\.dark \.auth-card-shell\s*\{[\s\S]*?background:\s*#0a0a0a;[\s\S]*?border-color:\s*#27272a;/);
  assert.match(css, /@media \(max-width:\s*560px\)\s*\{[\s\S]*?\.auth-card-shell\s*\{[\s\S]*?width:\s*min\(100%,\s*calc\(100vw - 40px\)\);/);
  assert.match(script, /document\.querySelectorAll\("\[data-auth-tab\]"\)/);
  assert.match(script, /document\.getElementById\("signupPane"\)\?\.classList\.toggle\("active",\s*mode === "signup"\)/);
  assert.match(script, /document\.getElementById\("loginPane"\)\?\.classList\.toggle\("active",\s*mode === "login"\)/);
  assert.match(script, /document\.querySelectorAll\("\[data-auth-head\]"\)\.forEach/);
  assert.match(script, /authShell\?\.classList\.toggle\("auth-register-pop",\s*mode === "signup"\)/);
  assert.match(script, /authShell\?\.setAttribute\("aria-labelledby",\s*mode === "signup" \? "signupModalTitle" : "loginModalTitle"\)/);
  assert.match(script, /authShell\.scrollTop = 0;/);
  assert.match(script, /authModal\.scrollTop = 0;/);
  assert.match(script, /const focusTarget = mode === "login" \? form\?\.querySelector\("\[name='email'\]"\) : authShell;/);
  assert.match(script, /focusElement\(focusTarget\);/);
  assert.match(script, /function googleButtonWidth\(target\)[\s\S]*?const availableWidth = targetWidth \|\| Math\.max\(0,\s*boxWidth - 24\);[\s\S]*?return Math\.min\(400,\s*Math\.max\(220,\s*Math\.floor\(availableWidth\)\)\);/);
  assert.match(script, /function trapModalFocus\(modal,\s*event\)/);
  assert.match(script, /lastAuthTrigger = captureFocusTrigger\(authModal\) \|\| lastAuthTrigger;/);
  assert.match(script, /const requiredFields = \["firstName",\s*"email",\s*"phone"\];/);
  assert.doesNotMatch(script, /const requiredFields = \["firstName",\s*"lastName",\s*"email"\]/);
  assert.match(script, /lastName:\s*""/);
  assert.match(script, /displayName:\s*firstName/);
  assert.match(html, currentScriptCacheBust);
  assert.match(script, /function initAuthRouteModal\(\)/);
  assert.match(script, /params\.get\("auth"\)/);
  assert.match(script, /openAuthModal\("signup"\)/);
  assert.match(script, /openAuthModal\("login"\)/);
  assert.match(script, /window\.history\.replaceState\(null,\s*"",\s*cleanPath\)/);
  assert.match(serverScript, /app\.get\('\/login',\s*\(req,\s*res\) => \{[\s\S]*?res\.redirect\('\/index\.html\?auth=login'\);[\s\S]*?\}\);/);
  assert.match(serverScript, /app\.get\('\/register',\s*\(req,\s*res\) => \{[\s\S]*?res\.redirect\('\/index\.html\?auth=signup'\);[\s\S]*?\}\);/);
  assert.doesNotMatch(serverScript, /sendFile\(path\.join\(__dirname,\s*'auth\.html'\)\)/);
  assert.doesNotMatch(html, /auth-page\.js|auth-page/);
  assert.match(serverScript, /if \(!firstName \|\| !email \|\| !phone\) \{/);
  assert.match(serverScript, /if \(!PHONE_RE\.test\(phone\)\) \{/);
  assert.match(serverScript, /function upsertGoogleMember\(profile\)\s*\{[\s\S]*?SELECT \* FROM members WHERE googleSub = \? OR email = \?/);
  assert.match(serverScript, /app\.post\('\/api\/auth\/google',\s*async \(req,\s*res\) => \{[\s\S]*?const result = upsertGoogleMember\(profile\);/);
  assert.match(serverScript, /UPDATE members[\s\S]*?lastLoginAt = \?[\s\S]*?googleSub = COALESCE\(NULLIF\(googleSub,\s*''\),\s*\?\)[\s\S]*?WHERE id = \?/);
  assert.match(serverScript, /INSERT INTO members \([\s\S]*?authProvider,\s*googleSub,\s*picture,\s*avatarUrl,\s*emailVerified[\s\S]*?`auth_google_\$\{profile\.sub\}`/);
  assert.match(serverScript, /res\.json\(\{ \.\.\.issueMemberSession\(res,\s*result\.member\),\s*profile,\s*created:\s*result\.created \}\)/);
});

test("homepage applies modern web guidance semantics for forms dialogs theme and offscreen rendering", () => {
  assert.match(html, /<html lang="th" class="dark">/);
  assert.match(html, /<meta name="theme-color" content="#0a0a0a">/);
  assert.match(html, /<meta name="color-scheme" content="dark">/);
  assert.match(html, /document\.documentElement\.classList\.add\("dark"\);/);
  assert.match(html, /document\.documentElement\.style\.colorScheme = "dark";/);
  assert.match(html, /localStorage\.setItem\("aix-theme",\s*"dark"\);/);
  assert.match(html, /<span class="visually-hidden">ค้นหาหัวข้อเรียน<\/span>[\s\S]*?<input id="catalogSearch" type="search" placeholder="ค้นหาหัวข้อ">/);
  assert.match(html, /<div class="toast" id="toast" role="status" aria-live="polite" aria-atomic="true"><\/div>/);
  assert.match(html, /class="aix-review-stats" role="list" aria-label="สรุปรีวิวผู้เรียน AiX"/);
  assert.match(html, /class="aix-pricing-benefits" role="list" aria-label="สิ่งที่รวมในสมาชิก"/);
  assert.match(html, /class="aix-pricing-features" role="list" aria-label="ฟีเจอร์สมาชิก AiX Club"/);
  assert.match(css, /\.visually-hidden\s*\{[\s\S]*?clip-path:\s*inset\(50%\);/);
  assert.match(css, /\.aix-system,\s*[\s\S]*?\.aix-faq\s*\{[\s\S]*?content-visibility:\s*auto;[\s\S]*?contain-intrinsic-size:\s*auto 760px;/);
  assert.match(script, /const colorSchemeMeta = document\.querySelector\('meta\[name="color-scheme"\]'\);/);
  assert.match(script, /colorSchemeMeta\?\.setAttribute\("content",\s*"dark"\);/);
  assert.match(script, /function setDescribedBy\(input,\s*id,\s*enabled\)/);
  assert.match(script, /input\.setAttribute\("aria-describedby",\s*nextValue\);/);
  assert.match(script, /error\.setAttribute\("role",\s*"alert"\);/);
  assert.match(script, /type="button" data-filter="\$\{filter\}" aria-pressed="\$\{filter === state\.activeFilter\}" aria-controls="classesGrid"/);
});

test("public website no longer references mascot or companion assets", async () => {
  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const content = await readFile(join(root, file), "utf8");
    for (const pattern of bannedPublicPatterns) {
      assert.doesNotMatch(content, pattern, `${file} still matches ${pattern}`);
    }
  }
});

test("public pages do not load the removed moving-light motion layer", async () => {
  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const content = await readFile(join(root, file), "utf8");
    assert.doesNotMatch(content, /site-motion\.js/, `${file} still loads site-motion.js`);
    assert.doesNotMatch(content, /assets\/vendor\/gsap\.min\.js/, `${file} still loads GSAP for site motion`);
  }
});

test("public pages inherit landing page dark-first theme shell", async () => {
  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const content = await readFile(join(root, file), "utf8");
    assert.match(content, /<html lang="th" class="dark">/, `${file} does not start with dark html shell`);
    assert.match(content, /<meta name="theme-color" content="#0a0a0a">/, `${file} missing dark theme color`);
    assert.match(content, /<meta name="color-scheme" content="dark">/, `${file} missing dark color scheme`);
    assert.match(content, /document\.documentElement\.classList\.add\("dark"\);/, `${file} missing forced dark class sync`);
    assert.match(content, /localStorage\.setItem\("aix-theme",\s*"dark"\);/, `${file} missing forced dark theme storage write`);
    assert.ok(
      content.indexOf("localStorage.setItem(\"aix-theme\", \"dark\")") < content.indexOf("styles.css?v="),
      `${file} initializes theme after CSS and may flash light`
    );
  }
});

test("inner pages share the landing page visual language", () => {
  assert.match(css, /AiX landing design propagation for non-home pages 2026-06-30/);
  assert.match(css, /Inner pages contrast guard for light and dark themes 2026-06-30/);
  assert.match(css, /:where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\{/);
  assert.match(css, /:where\(\.site-header:not\(\.aix-home-header\), \.dashboard-header, \.classroom-header, \.tools-header, \.live-header, \.course-gate-header, \.learn-topbar\)\s*\{/);
  assert.match(css, /\.dark :where\(\.site-header:not\(\.aix-home-header\), \.dashboard-header, \.classroom-header, \.tools-header, \.live-header, \.course-gate-header, \.learn-topbar\)\s*\{/);
  assert.match(css, /:where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\(\s*\.dashboard-profile,[\s\S]*?\.course-gate-content\s*\)\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\);/);
  assert.match(css, /:where\(\.dashboard-page, \.tools-box-page, \.live-class-page, #detailRoot, \.course-gate-page, \.learn-shell\)\s*\n\s*\.primary-btn:not\(\.disabled\):not\(\[aria-disabled="true"\]\)\s*\{[\s\S]*?background:\s*linear-gradient\(135deg, #dbeafe 0%, #60a5fa 48%, #8b5cf6 100%\);/);
  assert.match(css, /\.dark :where\(\.dashboard-page, \.tools-box-page, \.live-class-page, #detailRoot, \.course-gate-page, \.learn-shell\)\s*\n\s*\.primary-btn:not\(\.disabled\):not\(\[aria-disabled="true"\]\)\s*\{[\s\S]*?background:\s*linear-gradient\(135deg, #e0f2fe 0%, #93c5fd 46%, #a78bfa 100%\);/);
  assert.match(css, /\.learn-topbar\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;[\s\S]*?z-index:\s*55;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.learn-shell\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(footer, /ensureSiteMeteors\(\);/);
  assert.match(footer, /ensureMobileLumaNav\(\);/);
});

test("inner pages keep dashboard and member UI readable in light and dark themes", () => {
  assert.match(css, /html:not\(\.dark\) :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\{[\s\S]*?color:\s*#0f172a;[\s\S]*?linear-gradient\(180deg,\s*#f8fbff 0%,\s*#ffffff 42%,\s*#f8fafc 100%\);/);
  assert.match(css, /html:not\(\.dark\) :where\(\.dashboard-header, \.classroom-header, \.tools-header, \.live-header, \.course-gate-header, \.learn-topbar\)\s*\{[\s\S]*?background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\);/);
  assert.match(css, /html:not\(\.dark\) :where\(\.dashboard-nav-link:hover, \.dashboard-nav-link\.active, \.classroom-nav-link:hover, \.classroom-nav-link\.active\)\s*\{[\s\S]*?color:\s*#0f172a;[\s\S]*?background:\s*#ffffff;/);
  assert.match(css, /html:not\(\.dark\) :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\([\s\S]*?\.dashboard-profile,[\s\S]*?\.tools-action-card,[\s\S]*?\.course-gate-content[\s\S]*?\)\s*\{[\s\S]*?color:\s*#0f172a;[\s\S]*?background:[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.88\);/);
  assert.match(css, /html:not\(\.dark\) :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\(h1, h2, h3, h4, strong,[\s\S]*?\.tools-action-body h3\)\s*\{[\s\S]*?color:\s*#0f172a;/);
  assert.match(css, /html:not\(\.dark\) :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\(p, small, em,[\s\S]*?\.tools-action-body p\)\s*\{[\s\S]*?color:\s*#475569;/);
  assert.match(css, /\.dark :where\(\.dashboard-nav-link:hover, \.dashboard-nav-link\.active, \.classroom-nav-link:hover, \.classroom-nav-link\.active\)\s*\{[\s\S]*?color:\s*#0a0a0a;[\s\S]*?background:\s*#fafafa;/);
  assert.match(css, /\.dark :where\(\.dashboard-home-link, \.classroom-home-link, \.dashboard-header \.link-btn, \.tools-header \.link-btn, \.live-header \.link-btn\)\s*\{[\s\S]*?color:\s*#e4e4e7;[\s\S]*?background:\s*rgba\(24,\s*24,\s*27,\s*0\.78\);/);
  assert.match(css, /Dashboard readability refresh 2026-06-30/);
  assert.match(css, /\.dark \.dashboard-page\s*\{[\s\S]*?linear-gradient\(180deg, #050505 0%, #09090b 48%, #050505 100%\);/);
  assert.match(css, /\.dark \.dashboard-header \.dashboard-nav-link:hover,[\s\S]*?\.dark \.dashboard-header \.dashboard-nav-link\.active\s*\{[\s\S]*?color:\s*#0a0a0a !important;[\s\S]*?background:\s*#fafafa !important;/);
  assert.match(css, /\.dark \.dashboard-profile,[\s\S]*?\.dark \.dashboard-quick-actions a\s*\{[\s\S]*?color:\s*#fafafa !important;[\s\S]*?backdrop-filter:\s*none !important;/);
  assert.match(css, /\.dark \.dashboard-hero-art\s*\{[\s\S]*?opacity:\s*0\.08;[\s\S]*?mix-blend-mode:\s*screen;/);
  assert.match(css, /Dashboard lower sections contrast fix 2026-06-30/);
  assert.match(css, /\.dark \.dashboard-page :where\([\s\S]*?\.payment-history-section,[\s\S]*?\.billing-section[\s\S]*?\)\s*\{[\s\S]*?background:\s*transparent !important;/);
  assert.match(css, /\.dark \.dashboard-page \.section-head h2\s*\{[\s\S]*?color:\s*#fafafa !important;/);
  assert.match(css, /\.dark \.dashboard-page :where\([\s\S]*?\.payment-history-card,[\s\S]*?\.payment-history-empty,[\s\S]*?\.resource-card[\s\S]*?\)\s*\{[\s\S]*?color:\s*#fafafa !important;[\s\S]*?backdrop-filter:\s*none !important;/);
  assert.match(css, /\.dark \.dashboard-page :where\([\s\S]*?\.payment-history-empty p,[\s\S]*?\.receipt-pending[\s\S]*?\)\s*\{[\s\S]*?color:\s*#d4d4d8 !important;/);
  assert.match(css, /Inner page full contrast sweep 2026-06-30/);
  assert.match(css, /\.dark :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\{[\s\S]*?linear-gradient\(180deg, #050505 0%, #09090b 48%, #050505 100%\);/);
  assert.match(css, /\.dark :where\(\.site-header:not\(\.aix-home-header\), \.dashboard-header, \.classroom-header, \.tools-header, \.live-header, \.course-gate-header, \.learn-topbar\)[\s\S]*?background:\s*rgba\(5,\s*5,\s*5,\s*0\.9\) !important;/);
  assert.match(css, /\.dark :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\([\s\S]*?\.payment-summary,[\s\S]*?\.tools-topic-panel,[\s\S]*?\.live-note-card,[\s\S]*?\.classroom-panel,[\s\S]*?\.learn-reading-card,[\s\S]*?\.course-gate-content[\s\S]*?\)\s*\{[\s\S]*?color:\s*#fafafa !important;[\s\S]*?backdrop-filter:\s*none !important;/);
  assert.match(css, /\.dark :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\(p, small, em, li, span,[\s\S]*?\.learn-run-result p\)\s*\{[\s\S]*?color:\s*#d4d4d8 !important;/);
  assert.match(css, /\.dark :where\(#detailRoot, \.dashboard-page, \.tools-box-page, \.live-class-page, \.course-gate-page, \.learn-shell\)\s*\n\s*:where\(input, textarea, select,[\s\S]*?#learnAiInput\)\s*\{[\s\S]*?background:\s*rgba\(10,\s*10,\s*10,\s*0\.92\) !important;/);
});

test("tools box exposes protected downloadable and copyable skill and prompt libraries", () => {
  assert.match(toolsBoxHtml, /id="toolsSkillLibrary"/);
  assert.match(toolsBoxHtml, /id="toolsPromptLibrary"/);
  assert.match(toolsBoxHtml, /Skill Set ที่แจกให้ใช้/);
  assert.match(toolsBoxHtml, /Prompt พร้อมใช้/);
  assert.match(toolsBoxHtml, /tools-box\.js\?v=tools-box-protected-library-v2/);
  assert.match(toolsBoxScript, /let skillPacks = \[\];/);
  assert.match(toolsBoxScript, /let promptPacks = \[\];/);
  assert.doesNotMatch(toolsBoxScript, /const SKILL_PACKS|const PROMPT_PACKS/);
  assert.doesNotMatch(toolsBoxScript, /AI Work Intake Skill|Prompt QA Skill|หา Use Case AI ในธุรกิจ|สร้าง FAQ จากแชทลูกค้า/);
  assert.match(toolsBoxScript, /apiRequest\("\/api\/member\/tools"\)/);
  assert.match(toolsBoxScript, /Array\.isArray\(library\?\.skills\)/);
  assert.match(toolsBoxScript, /Array\.isArray\(library\?\.prompts\)/);
  assert.match(toolsBoxScript, /clearPremiumLibrary/);
  assert.match(toolsBoxScript, /navigator\.clipboard\?\.writeText/);
  assert.match(toolsBoxScript, /document\.execCommand\("copy"\)/);
  assert.match(toolsBoxScript, /new Blob\(\[content\], \{ type: "text\/markdown;charset=utf-8" \}\)/);
  assert.match(toolsBoxScript, /anchor\.download = fileName/);
  assert.match(toolsBoxScript, /data-tools-action="copy"/);
  assert.match(toolsBoxScript, /data-tools-action="download"/);
  assert.match(toolsBoxScript, /renderActionCards\(toolsSkillLibrary, skillPacks, \{ kind: "skill" \}\)/);
  assert.match(toolsBoxScript, /renderActionCards\(toolsPromptLibrary, promptPacks, \{ kind: "prompt" \}\)/);
  assert.match(css, /\.tools-action-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*280px\),\s*1fr\)\);/);
  assert.match(css, /\.tools-action-card\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?border-radius:\s*var\(--radius\);/);
  assert.match(css, /\.tools-action-buttons\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*720px\)\s*\{[\s\S]*?\.tools-action-buttons\s*\{[\s\S]*?grid-template-columns:\s*1fr;/);
});

test("homepage CSS includes responsive and motion safety rules", () => {
  assert.match(css, /\.aix-homepage-redesign/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /text-wrap: balance/);
  assert.match(css, /(?:^|\n)\s*background-clip:\s*text/);
  assert.match(html, /family=IBM\+Plex\+Sans\+Thai:wght@400;500;600&family=IBM\+Plex\+Sans\+Thai\+Looped:wght@400;500&display=swap/);
  assert.doesNotMatch(html, /Bai\+Jamjuree|Chakra\+Petch/);
  assert.doesNotMatch(html, />01</);
  assert.doesNotMatch(html, />02</);
  assert.doesNotMatch(html, />03</);
  assert.match(html, /aix-stack-hero/);
  assert.match(html, /aix-stack-orbit/);
  assert.match(script, /Job-based Roadmap/);
  assert.match(footer, /สมาชิกเรียน AI ต่อเนื่องทั้งปี พร้อม Live, replay/);
});

test("homepage adds full-page polish effects with responsive motion safeguards", () => {
  assert.match(script, /const pageEffects = \{/);
  assert.match(script, /function updateScrollProgress\(\)/);
  assert.match(script, /document\.documentElement\.style\.setProperty\("--aix-scroll-progress",\s*progress\.toFixed\(4\)\)/);
  assert.match(script, /function ensureScrollProgress\(\)/);
  assert.match(script, /progress\.className = "aix-scroll-progress"/);
  assert.match(script, /function pageEffectTargets\(\)/);
  assert.match(script, /\.aix-catalog \.course-card/);
  assert.match(script, /function decoratePageEffects\(\)/);
  assert.match(script, /section\.classList\.add\("aix-section-ambient"\)/);
  assert.match(script, /target\.classList\.add\("aix-reveal"\)/);
  assert.match(script, /new IntersectionObserver/);
  assert.match(script, /rootMargin:\s*"0px 0px -12% 0px"/);
  assert.match(script, /window\.addEventListener\("scroll",\s*requestScrollProgressUpdate,\s*\{ passive:\s*true \}\)/);
  assert.match(script, /refreshPageEffects\(\);/);
  assert.match(script, /initPageEffects\(\);/);
  assert.match(css, /\/\* AiX full-page polish effects 2026-06-23 \*\//);
  assert.match(css, /\.aix-scroll-progress\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?height:\s*3px;[\s\S]*?transform:\s*scaleX\(var\(--aix-scroll-progress\)\);/);
  assert.match(css, /\.aix-section-ambient::before\s*\{[\s\S]*?radial-gradient\(closest-side at 18% 50%,\s*rgba\(var\(--aix-polish-blue\),\s*0\.14\),\s*transparent 72%\)/);
  assert.match(css, /\.aix-homepage-redesign :where\([\s\S]*?\.aix-catalog \.course-card,[\s\S]*?\.aix-faq-item[\s\S]*?\):hover\s*\{[\s\S]*?box-shadow:/);
  assert.match(css, /\.aix-homepage-redesign \.primary-btn::after\s*\{[\s\S]*?linear-gradient\(110deg,[\s\S]*?transform:\s*translateX\(-70%\);/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\.aix-reveal\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transform:\s*translateY\(clamp\(14px,\s*2vw,\s*28px\)\) scale\(0\.985\);[\s\S]*?\.aix-reveal\.is-visible\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\) scale\(1\);/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.aix-reveal\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*none;[\s\S]*?\.aix-section-ambient::before,[\s\S]*?\.aix-homepage-redesign \.primary-btn::after\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-scroll-progress\s*\{[\s\S]*?height:\s*2px;[\s\S]*?\.aix-section-ambient::before\s*\{[\s\S]*?inset-inline:\s*16px;/);
});

test("public Thai typography uses the IBM Plex Thai system from praneet-front", async () => {
  const ibmPlexUrl = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans+Thai+Looped:wght@400;500&display=swap";
  assert.ok(html.includes(ibmPlexUrl), "homepage missing IBM Plex Thai Google Fonts link");
  assert.ok(css.includes(`@import url("${ibmPlexUrl}");`), "styles.css missing IBM Plex Thai import");
  assert.match(css, /--lh-body:\s*1\.7;/);
  assert.match(css, /--font-thai-body:\s*"IBM Plex Sans Thai Looped",\s*"Noto Sans Thai",\s*"Sukhumvit Set",\s*"Thonburi",\s*system-ui,\s*sans-serif;/);
  assert.match(css, /--font-thai-display:\s*"IBM Plex Sans Thai",\s*"IBM Plex Sans Thai Looped",\s*"Noto Sans Thai",\s*"Sukhumvit Set",\s*"Thonburi",\s*system-ui,\s*sans-serif;/);
  assert.match(css, /html\[lang="th"\] body\s*\{[\s\S]*?font-family:\s*var\(--font-thai-body\);[\s\S]*?line-height:\s*var\(--lh-body\);/);
  assert.match(css, /html\[lang="th"\] \*,\s*html\[lang="th"\] \*::before,\s*html\[lang="th"\] \*::after\s*\{[\s\S]*?letter-spacing:\s*0;/);
  assert.match(css, /html\[lang="th"\] :where\([\s\S]*?h1,[\s\S]*?h6[\s\S]*?\)\s*\{[\s\S]*?font-family:\s*var\(--font-thai-display\);[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*var\(--lh-heading\);/);
  assert.match(css, /html\[lang="th"\] :where\([\s\S]*?\.brand-title,[\s\S]*?\.luma-mobile-label[\s\S]*?\)\s*\{[\s\S]*?font-family:\s*var\(--font-thai-display\);[\s\S]*?font-weight:\s*600;[\s\S]*?line-height:\s*1\.35;/);
  assert.match(css, /html\[lang="th"\] :where\([\s\S]*?p,[\s\S]*?\.hero-lead,[\s\S]*?\)\s*\{[\s\S]*?line-height:\s*var\(--lh-body\);/);
  assert.doesNotMatch(css, /Bai Jamjuree|Chakra Petch/);
  assert.doesNotMatch(css, /word-break:\s*break-(all|word)/);

  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const content = await readFile(join(root, file), "utf8");
    assert.match(content, currentCssCacheBust, `${file} missing current CSS cache bust`);
    assert.doesNotMatch(content, /Bai\+Jamjuree|Chakra\+Petch/, `${file} still loads old Thai fonts`);
  }
});

test("homepage hero uses the shared meteor page background without the old gray split", () => {
  assert.match(css, /\.aix-homepage-redesign\s*\{[\s\S]*?position:\s*relative;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /\.aix-stack-hero\s*\{[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(css, /\.aix-hero\s*\{[\s\S]*?linear-gradient\(90deg,\s*#ffffff\s+0\s+52%,\s*#f0f0f0\s+52%\s+100%\)/);
});

test("learning system section uses the static animated hero port", () => {
  assert.match(html, /<section class="aix-system aix-animated-hero" id="learning-system" aria-labelledby="learningSystemTitle">/);
  assert.match(html, /<h2 id="learningSystemTitle" class="aix-animated-title" aria-label="เรื่องใหม่ใน AI สู่ขั้นตอนที่ทีมใช้ได้">/);
  assert.match(html, /<span>เรื่องใหม่ใน AI<\/span>/);
  assert.match(html, /<span>สู่ขั้นตอนที่ทีม<\/span>/);
  assert.match(html, /class="aix-animated-word-slot" data-animated-words aria-live="polite"/);
  for (const copy of [
    "ใช้ได้",
    "ทำซ้ำได้",
    "สอนต่อได้",
    "วัดผลได้",
    "ดูหัวข้อที่เปิดใน Platform",
    "เริ่มด้วยสมาชิก 1 ปี",
    "AiX แปลงข่าว เครื่องมือ และ workflow ใหม่ให้เป็นบทเรียนสั้น"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(html, /จากเรื่องใหม่ในวงการ AI สู่ขั้นตอนที่ทีมเอาไปใช้ได้/);
  assert.doesNotMatch(html, /จับเรื่องใหม่ให้เข้าใจเร็ว|สรุป AI update เป็นภาษาธุรกิจ/);
  assert.doesNotMatch(html, /class="aix-display-cards"|class="aix-display-card /);
  assert.doesNotMatch(html, /ระบบเรียนรู้ของ AiX/);
  assert.doesNotMatch(html, /class="aix-learning-panel"/);
  assert.doesNotMatch(html, /class="aix-system-steps"/);
  assert.match(css, /\/\* Static port of the 21st\.dev animated-hero component for AiX learning-system \*\//);
  assert.match(css, /\.aix-animated-hero-wrap\s*\{[\s\S]*?min-height:\s*clamp\(500px,\s*58svh,\s*640px\);[\s\S]*?place-items:\s*center;/);
  assert.match(css, /\.aix-animated-title\s*\{[\s\S]*?font-size:\s*clamp\(2\.45rem,\s*6\.2vw,\s*5\.65rem\);[\s\S]*?text-wrap:\s*balance;/);
  assert.match(css, /\.aix-animated-word\s*\{[\s\S]*?transform:\s*translateY\(110%\);[\s\S]*?transition:\s*opacity 420ms ease,\s*transform 620ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/);
  assert.match(css, /\.aix-animated-word\.is-active\s*\{[\s\S]*?opacity:\s*1;[\s\S]*?transform:\s*translateY\(0\);/);
  assert.match(css, /\.aix-homepage-redesign \.aix-animated-actions \.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-shell-bg:\s*rgba\(96,\s*165,\s*250,\s*0\.14\);[\s\S]*?--rainbow-beam:\s*rgba\(224,\s*242,\s*254,\s*0\.86\);/);
  assert.match(css, /\.aix-homepage-redesign \.aix-animated-actions \.aix-rainbow-shell > \.aix-rainbow-button\.primary-btn\s*\{[\s\S]*?color:\s*#fafafa;[\s\S]*?background:\s*linear-gradient\(135deg,\s*#0f172a 0%,\s*#2563eb 52%,\s*#7c3aed 100%\);[\s\S]*?border-color:\s*rgba\(191,\s*219,\s*254,\s*0\.28\);/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-animated-hero-wrap\s*\{[\s\S]*?padding-block:\s*52px;[\s\S]*?\.aix-animated-title\s*\{[\s\S]*?font-size:\s*clamp\(2\.15rem,\s*12vw,\s*3\.45rem\);/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.aix-animated-word\s*\{[\s\S]*?transition:\s*none;[\s\S]*?\.aix-animated-word:not\(\.is-active\)\s*\{[\s\S]*?display:\s*none;/);
  assert.match(script, /function initAnimatedHero\(\)/);
  assert.match(script, /document\.querySelector\("\[data-animated-words\]"\)/);
  assert.match(script, /window\.setInterval\(\(\) => \{/);
  assert.match(script, /initAnimatedHero\(\)/);
  assert.doesNotMatch(script, /initDisplayCards/);
  assert.match(html, currentScriptCacheBust);
});

test("member loop section ports the hero highlight treatment statically", () => {
  assert.match(html, /<section class="aix-loop aix-hero-highlight" id="member-loop" aria-labelledby="memberLoopTitle" data-hero-highlight>/);
  assert.match(html, /<h2 id="memberLoopTitle">ไม่ต้องไล่ตาม <span class="aix-highlight-mark">AI คนเดียว<\/span><\/h2>/);
  assert.match(css, /\/\* Static port of the HeroHighlight component for the member loop section \*\//);
  assert.match(css, /\.aix-hero-highlight\s*\{[\s\S]*?--highlight-x:\s*50%;[\s\S]*?--highlight-y:\s*50%;[\s\S]*?isolation:\s*isolate;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.aix-hero-highlight::before,\s*[\s\S]*?\.aix-hero-highlight::after\s*\{[\s\S]*?background-size:\s*16px 16px;[\s\S]*?radial-gradient\(circle,\s*rgb\(212 212 212\) 1px,\s*transparent 1px\);/);
  assert.match(css, /\.aix-hero-highlight::after\s*\{[\s\S]*?rgb\(99 102 241\) 1px[\s\S]*?mask-image:\s*radial-gradient\(200px circle at var\(--highlight-x\) var\(--highlight-y\),\s*#000 0%,\s*transparent 100%\);/);
  assert.match(css, /\.aix-hero-highlight\.is-highlight-active::after,\s*[\s\S]*?\.aix-hero-highlight:hover::after\s*\{[\s\S]*?opacity:\s*0\.78;/);
  assert.match(css, /\.aix-highlight-mark\s*\{[\s\S]*?background-image:\s*linear-gradient\(90deg,\s*#a5b4fc 0%,\s*#d8b4fe 100%\);[\s\S]*?animation:\s*aixHighlightSweep 2s linear 0\.5s forwards;/);
  assert.match(css, /@keyframes aixHighlightSweep\s*\{[\s\S]*?background-size:\s*100% 100%;/);
  assert.match(css, /\.dark \.aix-hero-highlight::before\s*\{[\s\S]*?rgb\(38 38 38\) 1px/);
  assert.match(css, /\.dark \.aix-highlight-mark\s*\{[\s\S]*?color:\s*#ffffff;[\s\S]*?linear-gradient\(90deg,\s*#6366f1 0%,\s*#a855f7 100%\);/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.aix-highlight-mark\s*\{[\s\S]*?animation:\s*none;[\s\S]*?background-size:\s*100% 100%;/);
  assert.match(script, /function initHeroHighlight\(\)/);
  assert.match(script, /document\.querySelectorAll\("\[data-hero-highlight\]"\)/);
  assert.match(script, /highlight\.style\.setProperty\("--highlight-x",\s*`\$\{nextX\}px`\)/);
  assert.match(script, /highlight\.addEventListener\("pointermove"/);
  assert.match(script, /highlight\.addEventListener\("pointerleave"/);
  assert.match(script, /initHeroHighlight\(\)/);
});

test("homepage sections use concise copy and tighter spacing", () => {
  for (const copy of [
    "AiX คัดเรื่อง AI ที่ควรรู้ จัดเป็นเส้นทางเรียน",
    "ใช้ AiX เป็นพื้นที่ประจำสำหรับเช็กเรื่องใหม่",
    "บทเรียนพร้อมคลัง resource",
    "เลือกจากงานที่อยากพัฒนา แล้วค่อยจับคู่เครื่องมือ AI",
    "หัวข้อในแพลตฟอร์ม",
    "เรียนจากงานจริง"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(html, /โดยไม่ต้องนั่งไล่ตามทุก tool เอง/);
  assert.doesNotMatch(html, /ไม่ได้จบที่ดูบทเรียน แต่กลับมาใช้เป็นคลังทำงานได้/);
  assert.doesNotMatch(html, /หัวข้อที่สมาชิกเรียนต่อได้ในราคาเดียว/);
  assert.doesNotMatch(html, /เรียนเพื่อเปลี่ยนวิธีทำงาน ไม่ใช่จำชื่อเครื่องมือ/);
  assert.match(css, /\.aix-loop,\s*[\s\S]*?\.aix-paths,\s*[\s\S]*?\.aix-faq\s*\{[\s\S]*?padding:\s*clamp\(44px,\s*6vw,\s*76px\) 0;/);
  assert.match(css, /\.aix-system,\s*[\s\S]*?\.aix-business\s*\{[\s\S]*?padding:\s*clamp\(48px,\s*6vw,\s*84px\) 0;/);
  assert.match(css, /\.aix-resource-section,\s*[\s\S]*?\.aix-catalog\s*\{[\s\S]*?padding:\s*clamp\(48px,\s*6vw,\s*84px\) 0;/);
  assert.match(css, /\.aix-catalog \.course-body p\s*\{[\s\S]*?-webkit-line-clamp:\s*2;/);
  assert.match(css, /\.aix-catalog \.course-grid\s*\{[\s\S]*?align-items:\s*start;/);
  assert.match(css, /\.aix-catalog \.course-card\s*\{[\s\S]*?min-height:\s*0;/);
  assert.match(css, /\.aix-catalog \.catalog-toolbar\s*\{[\s\S]*?background:\s*color-mix\(in srgb,\s*var\(--card\) 88%,\s*var\(--muted\)\);/);
  assert.match(css, /\.aix-catalog \.catalog-toolbar\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?gap:\s*12px;[\s\S]*?padding:\s*16px;[\s\S]*?overflow:\s*visible;/);
  assert.match(css, /\.aix-catalog \.catalog-toolbar \.filter-tabs\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(104px,\s*1fr\)\);[\s\S]*?gap:\s*10px;/);
  assert.match(css, /\.aix-catalog \.catalog-toolbar \.filter-tab\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*42px;[\s\S]*?min-height:\s*42px;[\s\S]*?justify-content:\s*center;/);
  assert.match(css, /\.aix-catalog \.catalog-toolbar \.catalog-search\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*44px;/);
  assert.match(css, /\.aix-catalog \.filter-tab\s*\{[\s\S]*?color:\s*var\(--muted-foreground\);[\s\S]*?box-shadow:\s*none;/);
  assert.match(css, /\.aix-catalog \.catalog-search input\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/);
  assert.match(css, /\.aix-catalog \.aix-topic-card\s*\{[\s\S]*?text-align:\s*center;[\s\S]*?border:\s*2px dashed var\(--border\);/);
  assert.match(css, /\.aix-topic-icons\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*center;[\s\S]*?min-height:\s*76px;/);
  assert.match(css, /\.aix-topic-logo\s*\{[\s\S]*?width:\s*66px;[\s\S]*?height:\s*66px;[\s\S]*?background:\s*#ffffff;[\s\S]*?border-color:\s*#e4e4e7;/);
  assert.match(css, /\.aix-topic-logo img\s*\{[\s\S]*?object-fit:\s*contain;[\s\S]*?filter:\s*none;/);
  assert.match(css, /\.aix-topic-logo-deepseek\s*\{[\s\S]*?background:\s*#eef2ff;[\s\S]*?border-color:\s*#c7d2fe;/);
  assert.match(css, /\.aix-topic-logo-manus\s*\{[\s\S]*?background:\s*#eef2ff;[\s\S]*?border-color:\s*#bfdbfe;/);
  assert.match(css, /\.aix-topic-logo-antigravity\s*\{[\s\S]*?linear-gradient\(135deg,\s*#f8fafc 0%,\s*#dbeafe 52%,\s*#ede9fe 100%\);/);
  assert.match(css, /\.aix-topic-logo-claude\s*\{[\s\S]*?background:\s*#fff7ed;[\s\S]*?border-color:\s*#fed7aa;/);
  assert.match(css, /\.aix-topic-logo-higgsfield\s*\{[\s\S]*?background:\s*#d7ff00;[\s\S]*?border-color:\s*#c8f500;/);
  assert.match(css, /\.aix-topic-logo-codex\s*\{[\s\S]*?background:\s*#0f172a;[\s\S]*?border-color:\s*#334155;/);
  assert.match(css, /\/\* Catalog topic color accents \*\//);
  assert.match(css, /\.aix-catalog \.aix-topic-card\s*\{[\s\S]*?--topic-accent-rgb:\s*37,\s*99,\s*235;[\s\S]*?--topic-accent-soft:\s*rgba\(var\(--topic-accent-rgb\),\s*0\.1\);[\s\S]*?border-color:\s*var\(--topic-accent-border\);/);
  assert.match(css, /\.aix-catalog \.aix-topic-tone-manus\s*\{[\s\S]*?--topic-accent-rgb:\s*37,\s*99,\s*235;/);
  assert.match(css, /\.aix-catalog \.aix-topic-tone-claude\s*\{[\s\S]*?--topic-accent-rgb:\s*217,\s*119,\s*6;/);
  assert.match(css, /\.aix-catalog \.aix-topic-tone-higgsfield\s*\{[\s\S]*?--topic-accent-rgb:\s*132,\s*204,\s*22;/);
  assert.match(css, /\.aix-catalog \.aix-topic-tone-codex\s*\{[\s\S]*?--topic-accent-rgb:\s*14,\s*165,\s*233;/);
  assert.match(css, /\.aix-catalog \.aix-topic-badge\s*\{[\s\S]*?color:\s*color-mix\(in srgb,\s*var\(--topic-accent\) 72%,\s*var\(--foreground\)\);[\s\S]*?background:\s*var\(--topic-accent-chip\);/);
  assert.match(css, /\.aix-topic-card:hover \.aix-topic-icon-left,\s*[\s\S]*?\.aix-topic-card:focus-within \.aix-topic-icon-left\s*\{[\s\S]*?rotate\(-15deg\) scale\(1\.08\);/);
  assert.match(css, /\.aix-catalog \.course-body\s*\{[\s\S]*?flex:\s*0 0 auto;/);
  assert.match(css, /\.aix-catalog \.provider,\s*[\s\S]*?\.aix-catalog \.skill-row\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.aix-catalog \.course-meta\s*\{[\s\S]*?margin:\s*0 0 6px;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-resource-stack\s*\{[\s\S]*?display:\s*none;[\s\S]*?\.aix-resource-section \.resource-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-catalog \.catalog-toolbar\s*\{[\s\S]*?gap:\s*10px;[\s\S]*?padding:\s*14px;[\s\S]*?\.aix-catalog \.catalog-toolbar \.filter-tabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*8px;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-catalog \.aix-topic-card\s*\{[\s\S]*?min-height:\s*268px;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-topic-icon\.aix-topic-logo\s*\{[\s\S]*?width:\s*60px;[\s\S]*?height:\s*60px;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-catalog \.course-card:nth-child\(n \+ 4\)\s*\{[\s\S]*?display:\s*none;[\s\S]*?\.aix-catalog \.course-image\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.dark \.aix-catalog \.catalog-toolbar\s*\{[\s\S]*?background:\s*rgba\(10,\s*10,\s*10,\s*0\.72\);[\s\S]*?border-color:\s*#27272a;/);
  assert.match(css, /\.dark \.aix-catalog \.filter-tab\s*\{[\s\S]*?background:\s*#18181b;[\s\S]*?border-color:\s*#27272a;/);
  assert.match(css, /\.dark \.aix-catalog \.filter-tab\.active,\s*[\s\S]*?\.dark \.aix-catalog \.filter-tab:hover\s*\{[\s\S]*?background:\s*#fafafa;/);
  assert.match(css, /\.dark \.aix-catalog \.catalog-search input\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?border:\s*0;[\s\S]*?box-shadow:\s*none;/);
  assert.match(css, /\.dark \.aix-catalog \.aix-topic-card\s*\{[\s\S]*?background:\s*#0a0a0a;[\s\S]*?border-color:\s*#3f3f46;/);
  assert.match(css, /\.dark \.aix-topic-logo\s*\{[\s\S]*?background:\s*#ffffff;[\s\S]*?border-color:\s*#e4e4e7;/);
  assert.match(script, /function courseTopicIcons\(course\)/);
  assert.match(script, /function courseTopicLogo\(course\)/);
  assert.match(script, /function courseTopicBadge\(course\)/);
  assert.match(script, /"claude-manus-vibe-coding":\s*"Vibe Coding"/);
  assert.match(script, /<span class="course-badge aix-topic-badge">\$\{courseTopicBadge\(course\)\}<\/span>/);
  assert.doesNotMatch(script, /<span class="course-badge aix-topic-badge">\$\{course\.status\}<\/span>/);
  assert.match(script, /"manus-ai":\s*\{\s*src:\s*"assets\/ai-logos\/manus\.webp",\s*label:\s*"Manus",\s*tone:\s*"manus"\s*\}/);
  assert.match(script, /"claude-manus-vibe-coding":\s*\{\s*src:\s*"assets\/ai-logos\/codex\.svg",\s*label:\s*"Codex",\s*tone:\s*"codex"\s*\}/);
  assert.match(script, /"claude-deep-dive":\s*\{\s*src:\s*"assets\/ai-logos\/claude\.svg",\s*label:\s*"Claude",\s*tone:\s*"claude"\s*\}/);
  assert.match(script, /"ai-video-graphic":\s*\{\s*src:\s*"assets\/ai-logos\/higgsfield\.png",\s*label:\s*"Higgsfield",\s*tone:\s*"higgsfield"\s*\}/);
  assert.match(script, /"ai-agent-business":\s*\{\s*src:\s*"assets\/ai-logos\/chatgpt\.svg",\s*label:\s*"ChatGPT",\s*tone:\s*"chatgpt"\s*\}/);
  assert.equal(manusLogo.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(manusLogo.subarray(8, 12).toString("ascii"), "WEBP");
  assert.match(script, /course\.skills\.slice\(0,\s*2\)/);
  const renderCoursesSource = script.slice(script.indexOf("function renderCourses()"), script.indexOf("function renderResources()"));
  assert.match(renderCoursesSource, /const topicTone = courseTopicLogo\(course\)\?\.tone \|\| courseVisualTone\(course\);/);
  assert.match(renderCoursesSource, /class="course-card aix-topic-card aix-topic-tone-\$\{topicTone\}"/);
  assert.match(renderCoursesSource, /class="aix-topic-icons"/);
  assert.match(renderCoursesSource, /courseTopicVisuals\(course\)\.map/);
  assert.match(script, /logo\s*\?\s*\{ type: "logo"/);
  assert.match(script, /\{ type: "icon", value: "fa-robot" \}/);
  assert.match(renderCoursesSource, /aix-topic-logo-\$\{visual\.tone\}/);
  assert.match(renderCoursesSource, /<img src="\$\{visual\.value\}" alt="" loading="eager" decoding="async" data-topic-logo="\$\{visual\.label\}">/);
  assert.doesNotMatch(renderCoursesSource, /course-visual-window|course-visual-panel|course-image course-visual/);
  assert.doesNotMatch(renderCoursesSource, /fa-regular fa-user/);
  assert.match(renderCoursesSource, /fa-regular fa-clock/);
});

test("class detail pages use real AI logo assets and updated course copy", () => {
  assert.match(classDetailHtml, /class-detail\.js\?v=aix-brand-logos-v2-20260703/);
  assert.match(classDetailScript, /"Claude & Codex Vibe Coding"/);
  assert.doesNotMatch(classDetailScript, /Claude & Manus Vibe Coding/);
  assert.match(classDetailScript, /"Codex"/);
  assert.match(classDetailScript, /"Higgsfield"/);
  assert.match(classDetailScript, /"Perplexity"/);
  assert.match(classDetailScript, /tools:\s*\["Manus AI",\s*"Claude",\s*"ChatGPT"\]/);
  assert.match(classDetailScript, /tools:\s*\["Claude",\s*"Codex",\s*"Cursor",\s*"Copilot"\]/);
  assert.match(classDetailScript, /tools:\s*\["Claude",\s*"Perplexity",\s*"ChatGPT"\]/);
  assert.match(classDetailScript, /tools:\s*\["Higgsfield",\s*"ChatGPT",\s*"Perplexity"\]/);
  assert.match(classDetailScript, /tools:\s*\["ChatGPT",\s*"Claude",\s*"Manus AI",\s*"Perplexity"\]/);
  assert.match(classDetailScript, /"Manus AI":\s*\{[^}]*logo:\s*"assets\/ai-logos\/manus\.webp"/);
  assert.match(classDetailScript, /"Claude":\s*\{[^}]*logo:\s*"assets\/ai-logos\/claude\.svg"/);
  assert.match(classDetailScript, /"Codex":\s*\{[^}]*logo:\s*"assets\/ai-logos\/codex\.svg"/);
  assert.match(classDetailScript, /"Cursor":\s*\{[^}]*logo:\s*"assets\/ai-logos\/cursor\.svg"/);
  assert.match(classDetailScript, /"Copilot":\s*\{[^}]*logo:\s*"assets\/ai-logos\/copilot\.svg"/);
  assert.match(classDetailScript, /"ChatGPT":\s*\{[^}]*logo:\s*"assets\/ai-logos\/chatgpt\.svg"/);
  assert.match(classDetailScript, /"Perplexity":\s*\{[^}]*logo:\s*"assets\/ai-logos\/perplexity\.svg"/);
  assert.match(classDetailScript, /"Higgsfield":\s*\{[^}]*logo:\s*"assets\/ai-logos\/higgsfield\.png"/);
  assert.doesNotMatch(classDetailScript, /"GitHub":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"Browser DevTools":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"Google Sheets":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"Google Docs":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"Google Workspace":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"Canva":\s*\{/);
  assert.doesNotMatch(classDetailScript, /"CapCut":\s*\{/);
  assert.match(classDetailScript, /detailBrandStrip\.hidden = courseTools\.length === 0;/);
  assert.match(classDetailScript, /detailBrandBoard\.hidden = courseTools\.length === 0;/);
  assert.match(classDetailScript, /detailTools\.hidden = courseTools\.length === 0;/);
  assert.match(classDetailScript, /tools:\s*Array\.isArray\(course\.tools\)\s*\?\s*course\.tools\s*:\s*fallback\.tools/);
  assert.match(classDetailScript, /brandFocus:\s*Array\.isArray\(course\.brandFocus\)\s*\?\s*course\.brandFocus\s*:\s*fallback\.brandFocus/);
  assert.match(classDetailScript, /<img class="brand-logo-img" src="\$\{brand\.logo\}" alt="" loading="lazy" decoding="async">/);
  assert.match(css, /\.brand-logo-img\s*\{[\s\S]*?object-fit:\s*contain;[\s\S]*?filter:\s*none;/);
  assert.match(css, /\.brand-higgsfield\s*\{[\s\S]*?--brand-accent:\s*#bfff00;/);
  assert.match(css, /#detailRoot \.ai-brand-chip \.brand-logo-img,\s*[\s\S]*?#detailRoot \.ai-brand-chip\.compact \.brand-logo-img\s*\{[\s\S]*?filter:\s*none !important;[\s\S]*?opacity:\s*1 !important;/);
});

test("job path section ports the attached bento grid component statically", () => {
  assert.match(html, /<section class="aix-paths" id="paths" aria-labelledby="pathsTitle">/);
  assert.match(html, /<div class="aix-path-grid aix-bento-grid" aria-label="เลือกหัวข้อตามงานที่อยากพัฒนา">/);
  assert.equal((html.match(/class="aix-path-card aix-bento-card/g) || []).length, 4);
  assert.equal((html.match(/aix-path-card-wide/g) || []).length, 2);

  for (const className of [
    "aix-path-card-active",
    "aix-path-tone-agent",
    "aix-path-tone-creative",
    "aix-path-tone-automation",
    "aix-path-tone-prompt",
    "aix-bento-pattern",
    "aix-bento-tags"
  ]) {
    assert.match(html, new RegExp(className));
  }

  for (const shortcut of ["Agent", "Creative", "Automation", "Prompt"]) {
    assert.match(html, new RegExp(`data-filter-shortcut="${shortcut}"`));
  }

  for (const copy of [
    "เจ้าของธุรกิจ",
    "ระบบหลังบ้าน",
    "ทีมและองค์กร",
    "ทำ playbook กลาง SOP และ prompt มาตรฐานให้ทีมใช้ซ้ำ",
    "#Prompt",
    "#Template",
    "#Team"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(css, /\/\* Static port of the Bento Grid component for job-based paths \*\//);
  assert.match(css, /\.aix-path-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*12px;/);
  assert.match(css, /\.aix-bento-card\s*\{[\s\S]*?--path-accent-rgb:\s*37,\s*99,\s*235;[\s\S]*?min-height:\s*188px;[\s\S]*?overflow:\s*hidden;/);
  assert.match(css, /\.aix-path-card-wide\s*\{[\s\S]*?grid-column:\s*span 2;/);
  assert.match(css, /\.aix-bento-pattern\s*\{[\s\S]*?background-image:\s*radial-gradient\(circle at center,\s*currentColor 1px,\s*transparent 1px\);/);
  assert.match(css, /\.aix-bento-card:hover,\s*[\s\S]*?\.aix-bento-card:focus-within\s*\{[\s\S]*?transform:\s*translateY\(-3px\);/);
  assert.match(css, /html:not\(\.dark\) \.aix-paths \.aix-bento-card\s*\{[\s\S]*?linear-gradient\(180deg,\s*rgba\(255,\s*255,\s*255,\s*0\.94\),\s*rgba\(248,\s*250,\s*252,\s*0\.82\)\);/);
  assert.match(css, /\.dark \.aix-paths \.aix-bento-card\s*\{[\s\S]*?linear-gradient\(180deg,\s*rgba\(24,\s*24,\s*27,\s*0\.86\),\s*rgba\(10,\s*10,\s*10,\s*0\.9\)\);/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-path-card-wide\s*\{[\s\S]*?grid-column:\s*span 1;/);
});

test("homepage section notes render as plain text without badge decoration", () => {
  assert.doesNotMatch(html, /ระบบเรียนรู้ของ AiX/);
  assert.match(css, /\.aix-status-pill,\s*\.aix-section-note\s*\{[\s\S]*?display:\s*block;[\s\S]*?padding:\s*0;[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /\.aix-status-pill::before,\s*\.aix-section-note::before\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(css, /\.aix-status-pill,\s*\.aix-section-note\s*\{[^}]*inline-flex/);
  assert.doesNotMatch(css, /@media \(max-width:\s*460px\)\s*\{[^}]*\.aix-status-pill,\s*\.aix-section-note\s*\{[^}]*width:\s*100%;/);
  assert.doesNotMatch(css, /\.dark \.aix-system \.aix-section-note,\s*\.dark \.aix-business \.aix-section-note\s*\{[^}]*background:\s*var\(--secondary\);/);
});

test("membership pricing closely ports the 21st.dev single pricing card layout", () => {
  assert.match(html, /<section class="aix-membership aix-pricing-section" id="membership" aria-labelledby="membershipTitle">/);
  assert.match(html, /class="aix-status-pill aix-pricing-header-badge"[\s\S]*?fa-regular fa-credit-card[\s\S]*?<span>Simple Pricing<\/span>/);
  assert.match(html, /<h2 id="membershipTitle">เลือกสมาชิก AiX Club<\/h2>/);
  assert.match(html, /class="aix-single-pricing-card" data-pricing-card aria-label="ราคา AiX Club รายเดือนและรายปี"/);
  assert.match(html, /class="aix-pricing-hover-wash" aria-hidden="true"/);
  assert.match(html, /class="aix-pricing-badge"[\s\S]*?fa-solid fa-crown[\s\S]*?Premium Membership/);
  assert.match(html, /<strong>1,999 บาท<\/strong>\s*<span class="aix-price-period">ต่อปี<\/span>/);
  assert.match(css, /\.aix-price-period\s*\{[\s\S]*?border-radius:\s*999px;[\s\S]*?font-weight:\s*800;/);
  assert.match(css, /\.dark \.aix-price-period\s*\{[\s\S]*?color:\s*#bfdbfe;[\s\S]*?background:\s*rgba\(37,\s*99,\s*235,\s*0\.14\);/);
  for (const copy of [
    "Simple Pricing",
    "Premium Membership",
    "1,999 บาทต่อปี",
    "249 บาทต่อเดือน",
    "หรือเริ่มรายเดือน 249 บาท / เดือน",
    "ประหยัด 989 บาท",
    "สมัครรายปี",
    "เริ่มรายเดือน",
    "AI update brief อ่านเร็ว",
    "Prompt และ SOP library",
    "Practice room ตามโจทย์จริง",
    "Live สอนสดทุกอาทิตย์",
    "มีรอบสด ถามตอบ และ replay ย้อนหลังให้ตามเรื่องใหม่",
    "หัวข้อใหม่ + replay",
    "ดูซ้ำตอนต้องใช้จริง",
    "Template + checklist",
    "เอาไปปรับใช้กับทีม",
    "สำหรับธุรกิจและทีม",
    "ขาย การตลาด operation"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal((html.match(/class="aix-pricing-features"[\s\S]*?role="listitem"/g) || []).length, 1);
  assert.equal((html.match(/fa-solid fa-check/g) || []).length, 13);
  assert.match(html, /class="aix-pricing-benefits" role="list" aria-label="สิ่งที่รวมในสมาชิก"/);
  assert.equal((html.match(/class="aix-pricing-benefit-item" role="listitem"/g) || []).length, 3);
  assert.match(html, /class="aix-pricing-benefit-item" role="listitem"><i class="fa-solid fa-check" aria-hidden="true"><\/i><strong>หัวข้อใหม่ \+ replay<\/strong><small>ดูซ้ำตอนต้องใช้จริง<\/small>/);
  assert.match(html, /class="aix-pricing-benefit-item" role="listitem"><i class="fa-solid fa-shield-heart" aria-hidden="true"><\/i><strong>Template \+ checklist<\/strong><small>เอาไปปรับใช้กับทีม<\/small>/);
  assert.match(html, /class="aix-pricing-benefit-item" role="listitem"><i class="fa-solid fa-heart" aria-hidden="true"><\/i><strong>สำหรับธุรกิจและทีม<\/strong><small>ขาย การตลาด operation<\/small>/);
  assert.match(html, /<p class="aix-pricing-monthly-note">หรือเริ่มรายเดือน 249 บาท \/ เดือน<\/p>\s*<div class="aix-pricing-actions">/);
  assert.match(html, /<\/div>\s*<div class="aix-pricing-live-note" aria-label="Live สอนสดทุกอาทิตย์">/);
  assert.match(html, /class="aix-pricing-features" role="list" aria-label="ฟีเจอร์สมาชิก AiX Club"/);
  assert.match(html, /class="aix-pricing-separator" role="presentation"/);
  assert.match(html, /class="aix-pricing-testimonials" data-pricing-testimonials aria-label="สรุปเสียงจากผู้เรียน"/);
  assert.equal((html.match(/class="aix-pricing-quote-meta"/g) || []).length, 3);
  assert.equal((html.match(/สรุปจากรีวิวผู้เรียน/g) || []).length, 3);
  assert.match(html, /ได้เรียนรู้แบบนำไปใช้กับงานจริง เห็นตัวอย่างชัด และเข้าใจภาพรวม automation มากขึ้น/);
  assert.match(html, /จากเดิมใช้ AI แค่ถามตอบ ตอนนี้เริ่มเห็นวิธีตั้งงานให้ AI ช่วยงานแทนเราได้จริง/);
  assert.match(html, /เหมาะกับคนไม่มีพื้นฐาน เพราะเริ่มจากภาพรวมก่อน แล้วค่อยต่อยอดด้วย replay กลับมาทวนได้/);
  assert.doesNotMatch(html, /class="aix-pricing-avatar"|class="aix-pricing-stars"|aria-label="5 ดาว"|AI work assistant|Beginner-friendly|Replay & template/);
  assert.match(html, /class="primary-btn full aix-pricing-button" type="button" data-open-signup>[\s\S]*?fa-solid fa-cart-shopping[\s\S]*?สมัครรายปี[\s\S]*?fa-solid fa-chevron-right/);
  assert.match(html, /class="secondary-btn full aix-pricing-button" type="button" data-open-signup data-monthly-plan>[\s\S]*?เริ่มรายเดือน[\s\S]*?fa-solid fa-arrow-up-right-from-square/);
  assert.match(html, /"name": "AiX Member รายปี"[\s\S]*?"price": "1999"/);
  assert.match(html, /"name": "AiX Member รายเดือน"[\s\S]*?"price": "249"/);
  assert.doesNotMatch(html, /<h2 id="membershipTitle">เรียน AI ทั้งปี 1,999 บาท<\/h2>/);
  assert.doesNotMatch(html, /class="aix-membership-lead"|class="aix-membership-points"|class="aix-price-panel"/);
  assert.doesNotMatch(html, /data-plan-option=|data-plan-price|data-plan-period|data-plan-note|data-pricing-primary/);
  assert.doesNotMatch(html, /สมาชิกปีละ 1,999 บาท เข้าเรียน AI ต่อเนื่องทั้งปี/);
  assert.doesNotMatch(html, /ราคาเดียวสำหรับ platform learning, resource และหัวข้อที่อัปเดตตามการเปลี่ยนแปลงของ AI/);
  assert.doesNotMatch(html, /ออกแบบสำหรับเจ้าของธุรกิจและทีมที่ไม่ใช่สายเทคนิค/);
  assert.doesNotMatch(html, /<p class="aix-section-note">คำถามที่พบบ่อย<\/p>/);
  assert.doesNotMatch(html, /<details open>/);
  assert.match(css, /\/\* Static port of the 21st\.dev SinglePricingCard component for AiX membership pricing \*\//);
  assert.match(css, /\.aix-pricing-section\s*\{[\s\S]*?display:\s*flex;[\s\S]*?padding:\s*clamp\(18px,\s*3vw,\s*34px\) 0 clamp\(20px,\s*4vw,\s*42px\);/);
  assert.match(css, /\.aix-pricing-wrap\s*\{[\s\S]*?isolation:\s*isolate;[\s\S]*?overflow:\s*hidden;[\s\S]*?border:\s*1px solid var\(--border\);[\s\S]*?border-radius:\s*var\(--radius\);[\s\S]*?background:\s*var\(--card\);/);
  assert.match(css, /\.aix-pricing-header-badge\s*\{[\s\S]*?display:\s*inline-flex;[\s\S]*?border-radius:\s*999px;/);
  assert.match(css, /\.aix-single-pricing-card\s*\{[\s\S]*?width:\s*min\(100%,\s*672px\);[\s\S]*?border-radius:\s*12px;/);
  assert.match(css, /\.aix-pricing-hover-wash\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?opacity:\s*0;/);
  assert.match(css, /\.aix-single-pricing-card-inner\s*\{[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*row;/);
  assert.match(css, /\.aix-pricing-main-col\s*\{[\s\S]*?width:\s*50%;/);
  assert.match(css, /\.aix-pricing-feature-col\s*\{[\s\S]*?width:\s*50%;[\s\S]*?border-left:/);
  assert.match(css, /\.aix-pricing-live-note\s*\{[\s\S]*?display:\s*grid;[\s\S]*?border:\s*1px solid var\(--border\);[\s\S]*?background:\s*var\(--background\);/);
  assert.match(css, /\.aix-pricing-live-note strong\s*\{[\s\S]*?font-family:\s*var\(--font-thai-display\);/);
  assert.match(css, /\/\* Prominent membership benefits \*\//);
  assert.match(css, /\.aix-pricing-actions\s*\{[\s\S]*?gap:\s*10px;[\s\S]*?margin:\s*0 0 14px;[\s\S]*?padding-top:\s*0;/);
  assert.match(css, /\.aix-pricing-benefits\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[\s\S]*?gap:\s*8px;/);
  assert.match(css, /\.aix-pricing-benefits \.aix-pricing-benefit-item\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?border-radius:\s*12px;/);
  assert.match(css, /\.aix-pricing-benefits \.aix-pricing-benefit-item i\s*\{[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px;[\s\S]*?background:\s*linear-gradient\(135deg,\s*#16a34a,\s*#2563eb\);/);
  assert.match(css, /html:not\(\.dark\) \.aix-pricing-benefits \.aix-pricing-benefit-item\s*\{[\s\S]*?background:[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.9\);/);
  assert.match(css, /\.aix-pricing-testimonials\s*\{[\s\S]*?position:\s*relative;[\s\S]*?display:\s*grid;[\s\S]*?overflow:\s*visible;[\s\S]*?border-left:\s*3px solid var\(--primary\);/);
  assert.match(css, /\.aix-pricing-quote\s*\{[\s\S]*?position:\s*static;[\s\S]*?min-height:\s*112px;/);
  assert.match(css, /\.aix-pricing-quote-meta\s*\{[\s\S]*?display:\s*flex;[\s\S]*?border-top:/);
  assert.doesNotMatch(css, /\.aix-pricing-avatar|\.aix-pricing-stars/);
  assert.doesNotMatch(css, /\.aix-pricing-quote\s*\{[^}]*position:\s*absolute;/);
  assert.doesNotMatch(css, /\.aix-pricing-quote\s*\{[^}]*inset:\s*0;/);
  assert.match(css, /\.aix-pricing-quote-dots\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?gap:\s*6px;[\s\S]*?min-height:\s*10px;/);
  assert.match(css, /\.aix-pricing-quote-dots button\s*\{[\s\S]*?width:\s*5px;[\s\S]*?height:\s*5px;[\s\S]*?min-width:\s*0;[\s\S]*?min-height:\s*0;[\s\S]*?font-size:\s*0;[\s\S]*?line-height:\s*0;[\s\S]*?opacity:\s*0\.78;/);
  assert.match(css, /\.aix-pricing-quote-dots button\.is-active\s*\{[\s\S]*?width:\s*7px;[\s\S]*?height:\s*7px;[\s\S]*?transform:\s*scale\(1\.08\);/);
  assert.match(css, /@media \(max-width:\s*899px\)\s*\{[\s\S]*?\.aix-single-pricing-card-inner\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-pricing-section\s*\{[\s\S]*?padding-block:\s*20px 24px;[\s\S]*?\.aix-pricing-wrap\s*\{[\s\S]*?gap:\s*24px;[\s\S]*?padding:\s*18px;/);
  assert.match(script, /function initPricingCard\(\)/);
  assert.doesNotMatch(script, /const plans =|data-plan-option|primaryButton\.textContent|dataset\.planOption/);
  assert.match(script, /data-pricing-testimonial/);
  assert.match(script, /initPricingCard\(\)/);
  assert.doesNotMatch(css, /\.aix-membership-points|\.aix-price-panel|\.aix-membership-grid|\.aix-plan-toggle|\.aix-plan-option/);
});

test("homepage applies the rotating rainbow treatment only to signup buttons", () => {
  assert.match(css, /\/\* Static port of the rotating rainbow wrapper for signup buttons \*\//);
  assert.match(css, /\.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-shell-bg:\s*rgba\(255,\s*255,\s*255,\s*0\.15\);[\s\S]*?display:\s*inline-flex;[\s\S]*?padding:\s*2px;[\s\S]*?overflow:\s*hidden;[\s\S]*?border-radius:\s*999px;[\s\S]*?transition:\s*transform 300ms ease;/);
  assert.match(css, /\.aix-rainbow-shell::before\s*\{[\s\S]*?left:\s*-50%;[\s\S]*?top:\s*-50%;[\s\S]*?width:\s*200%;[\s\S]*?height:\s*200%;[\s\S]*?background-size:\s*50% 30%;[\s\S]*?filter:\s*blur\(6px\);[\s\S]*?animation:\s*aixRainbowRotate 4s linear infinite;/);
  assert.match(css, /\.aix-rainbow-shell:hover\s*\{[\s\S]*?transform:\s*scale\(1\.05\);/);
  assert.match(css, /\.aix-rainbow-shell:active\s*\{[\s\S]*?transform:\s*scale\(1\);/);
  assert.match(css, /\.aix-rainbow-button,\s*[\s\S]*?\.aix-rainbow-shell > \.aix-rainbow-button\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*1;[\s\S]*?border-radius:\s*999px;/);
  assert.match(css, /\.aix-stack-hero-actions \.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-shell-bg:\s*rgba\(96,\s*165,\s*250,\s*0\.16\);[\s\S]*?--rainbow-beam:\s*rgba\(224,\s*242,\s*254,\s*0\.88\);/);
  assert.match(css, /\.aix-stack-hero-actions \.aix-rainbow-shell > \.aix-rainbow-button\.primary-btn\s*\{[\s\S]*?color:\s*#fafafa;[\s\S]*?background:\s*linear-gradient\(135deg,\s*#0f172a 0%,\s*#2563eb 52%,\s*#7c3aed 100%\);/);
  assert.match(css, /\.aix-pricing-actions \.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-shell-bg:\s*rgba\(96,\s*165,\s*250,\s*0\.14\);[\s\S]*?--rainbow-beam:\s*rgba\(224,\s*242,\s*254,\s*0\.88\);/);
  assert.match(css, /\.aix-pricing-actions \.aix-rainbow-shell > \.aix-pricing-button\.primary-btn\s*\{[\s\S]*?color:\s*#fafafa;[\s\S]*?background:\s*linear-gradient\(135deg,\s*#0f172a 0%,\s*#2563eb 52%,\s*#7c3aed 100%\);/);
  assert.match(css, /\.dark \.aix-stack-hero-actions \.aix-rainbow-shell,\s*[\s\S]*?\.dark \.aix-pricing-actions \.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-beam:\s*rgba\(224,\s*242,\s*254,\s*0\.9\);/);
  assert.match(css, /\.dark \.aix-stack-hero-actions \.aix-rainbow-shell > \.aix-rainbow-button\.primary-btn,\s*[\s\S]*?\.dark \.aix-pricing-actions \.aix-rainbow-shell > \.aix-pricing-button\.primary-btn\s*\{[\s\S]*?color:\s*#06121f;[\s\S]*?background:\s*linear-gradient\(135deg,\s*#e0f2fe 0%,\s*#60a5fa 44%,\s*#a78bfa 100%\);/);
  assert.match(css, /@keyframes aixRainbowRotate\s*\{[\s\S]*?transform:\s*rotate\(1turn\);/);
  assert.doesNotMatch(css, /\.aix-star-button/);
  assert.doesNotMatch(css, /aixStarButtonLight/);
  assert.match(script, /function decorateRainbowButton\(button\)/);
  assert.match(script, /shell\.className = "aix-rainbow-shell"/);
  assert.match(script, /button\.closest\("\.aix-pricing-actions"\)/);
  assert.doesNotMatch(script, /button\.closest\("\.aix-pricing-actions, \.aix-stack-hero-actions"\)/);
  assert.match(script, /button\.classList\.add\("aix-rainbow-button"\)/);
  assert.match(script, /function initRainbowButtons\(root = document\)/);
  assert.match(script, /"button\[data-open-signup\]:not\(\.hover-gradient-nav-item\):not\(\.hover-gradient-nav-primary\):not\(\[data-monthly-plan\]\)"/);
  assert.doesNotMatch(script, /"button\[data-open-signup\]:not\(\.hover-gradient-nav-item\):not\(\.hover-gradient-nav-primary\)"/);
  assert.match(script, /"button\[data-course-signup\]"/);
  assert.match(script, /"#memberForm \.primary-btn\[type='submit'\]"/);
  assert.match(script, /button\.matches\("\.hover-gradient-nav-item, \.hover-gradient-nav-primary"\)/);
  assert.doesNotMatch(script, /"\.aix-homepage-redesign \.primary-btn"/);
  assert.doesNotMatch(script, /"\.aix-homepage-redesign \.secondary-btn\.large"/);
  assert.doesNotMatch(script, /"\.aix-homepage-redesign \.aix-pricing-actions \.secondary-btn"/);
  assert.doesNotMatch(script, /"\.aix-home-header \.hover-gradient-nav-primary"/);
  assert.doesNotMatch(script, /"\.modal-panel \.primary-btn"/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-stack-hero-actions \.aix-rainbow-shell\s*\{[\s\S]*?width:\s*100%;[\s\S]*?display:\s*flex;[\s\S]*?\.aix-stack-hero-actions \.aix-rainbow-shell > \.aix-rainbow-button\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(script, /new MutationObserver\(\(mutations\) =>/);
  assert.match(script, /initRainbowButtons\(authModal \|\| document\)/);
  assert.match(script, /initRainbowButtons\(classModal\)/);
  assert.match(script, /initRainbowButtons\(\);\s*initHeroHighlight\(\);\s*initWorkproofCompare\(\);\s*initPageEffects\(\);\s*initAuthRouteModal\(\);\s*initFromHash\(\);/);
  assert.doesNotMatch(script, /initStarButtons\(authModal \|\| document\)/);
  assert.doesNotMatch(script, /initStarButtons\(classModal\)/);
  assert.doesNotMatch(script, /initStarButtons\(\);\s*initFromHash\(\);/);
});

test("homepage FAQ uses the static FAQ accordion port", () => {
  const faqStart = html.indexOf('<section class="aix-faq aix-faq-section"');
  const faqHtml = html.slice(faqStart, html.indexOf("</section>", faqStart) + "</section>".length);
  assert.match(faqHtml, /<section class="aix-faq aix-faq-section" id="faq" aria-labelledby="faqTitle">/);
  assert.match(faqHtml, /<div class="aix-faq-head">[\s\S]*?<h2 id="faqTitle">คำถามที่พบบ่อย<\/h2>[\s\S]*?<p>เรื่องที่ควรรู้ก่อนสมัคร AiX Club<\/p>/);
  assert.match(faqHtml, /class="faq-grid aix-faq-list" data-faq-accordion/);
  assert.equal((faqHtml.match(/class="aix-faq-item/g) || []).length, 5);
  assert.equal((faqHtml.match(/class="aix-faq-trigger"/g) || []).length, 5);
  assert.equal((faqHtml.match(/class="aix-faq-answer"/g) || []).length, 5);
  assert.match(faqHtml, /<article class="aix-faq-item is-open">[\s\S]*?aria-expanded="true" aria-controls="faqAnswer1" id="faqQuestion1"/);
  assert.equal((faqHtml.match(/class="aix-faq-answer"[^>]*aria-hidden="true"/g) || []).length, 4);
  assert.match(faqHtml, /role="region" aria-labelledby="faqQuestion3" aria-hidden="true"/);
  assert.match(faqHtml, /<div class="aix-faq-contact">[\s\S]*?ยังมีคำถามอยู่ไหม\?[\s\S]*?data-open-login>เข้าสู่ระบบเพื่อติดต่อทีม<\/button>/);
  assert.doesNotMatch(faqHtml, /<details|<summary|<\/details>/);
  assert.match(css, /\/\* Static port of the 21st\.dev FAQ accordion for AiX \*\//);
  assert.match(css, /\.aix-faq-section\s*\{[\s\S]*?linear-gradient\(180deg,\s*transparent 0%,\s*rgba\(244,\s*244,\s*245,\s*0\.72\)\s+46%,\s*transparent 100%\)/);
  assert.match(css, /\.aix-faq-list\s*\{[\s\S]*?width:\s*min\(100%,\s*720px\);[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(css, /\.aix-faq-item\.is-open\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*var\(--background\),\s*rgba\(244,\s*244,\s*245,\s*0\.74\),\s*var\(--background\)\);/);
  assert.match(css, /\.aix-faq-trigger\s*\{[\s\S]*?justify-content:\s*space-between;[\s\S]*?font-family:\s*var\(--font-thai-display\);/);
  assert.match(css, /\.aix-faq-item\.is-open \.aix-faq-trigger i\s*\{[\s\S]*?transform:\s*rotate\(180deg\) scale\(1\.08\);/);
  assert.match(css, /\.aix-faq-answer\[aria-hidden="true"\]\s*\{[\s\S]*?grid-template-rows:\s*0fr;[\s\S]*?opacity:\s*0;/);
  assert.match(css, /\.dark \.aix-faq-item\.is-open\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#0a0a0a,\s*rgba\(24,\s*24,\s*27,\s*0\.82\),\s*#0a0a0a\);/);
  assert.match(script, /function initFaqAccordion\(\)/);
  assert.match(script, /document\.querySelector\("\[data-faq-accordion\]"\)/);
  assert.match(script, /trigger\?\.setAttribute\("aria-expanded",\s*String\(shouldOpen\)\)/);
  assert.match(script, /answer\?\.setAttribute\("aria-hidden",\s*String\(!shouldOpen\)\)/);
  assert.match(script, /initFaqAccordion\(\)/);
});

test("homepage uses the stack feature section hero from the 21st.dev direction", () => {
  assert.match(html, /class="aix-stack-hero"/);
  assert.match(html, /class="container aix-stack-hero-frame"/);
  assert.match(html, /class="aix-stack-orbit-stage"/);
  assert.doesNotMatch(html, /<div class="aix-stack-hero-copy">\s*<p class="aix-status-pill">/);
  assert.doesNotMatch(html, /สมาชิก AiX Club, 1,999 บาทต่อปี/);
  assert.doesNotMatch(html, /class="aix-meteor-field"|class="aix-site-meteor-field"/);
  assert.equal((html.match(/class="aix-orbit-ring/g) || []).length, 3);
  assert.equal((html.match(/class="aix-orbit-node/g) || []).length, 12);
  assert.equal((html.match(/class="aix-orbit-logo/g) || []).length, 12);
  assert.equal((html.match(/--x: 100%; --y: 50%;/g) || []).length, 3);
  assert.equal((html.match(/--x: 0%; --y: 50%;/g) || []).length, 3);
  assert.doesNotMatch(html, /--x: (7|93)%; --y: 50%;/);
  assert.doesNotMatch(html, /aix-system-map/);
  assert.doesNotMatch(html, /Stack Feature Section/);
  assert.doesNotMatch(html, /<span>AiX<\/span>/);
  assert.doesNotMatch(html, /class="aix-orbit-node"[^>]*><i class=/);
  for (const logo of [
    "assets/ai-logos/chatgpt.svg",
    "assets/ai-logos/claude.svg",
    "assets/ai-logos/grok.svg",
    "assets/ai-logos/perplexity.svg",
    "assets/ai-logos/deepseek.svg",
    "assets/ai-logos/qwen.svg",
    "assets/ai-logos/xai.svg",
    "assets/ai-logos/copilot.svg",
    "assets/ai-logos/ollama.svg",
    "assets/ai-logos/cursor.svg",
    "assets/ai-logos/codex.svg",
    "assets/ai-logos/higgsfield.png"
  ]) {
    assert.match(html, new RegExp(logo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /@keyframes aixOrbitSpin/);
  assert.match(css, /\.aix-orbit-ring/);
  assert.match(css, /\.aix-homepage-redesign \.aix-orbit-logo\s*\{[\s\S]*?filter:\s*none;/);
  assert.match(css, /\.dark \.aix-stack-hero \.aix-orbit-node\s*\{[\s\S]*?color:\s*#18181b;[\s\S]*?background:\s*#fafafa;[\s\S]*?border-color:\s*#3f3f46;/);
  assert.match(css, /\.dark \.aix-stack-hero \.aix-orbit-logo\s*\{[\s\S]*?filter:\s*none;[\s\S]*?opacity:\s*1;/);
  assert.doesNotMatch(css, /\.aix-stack-center span/);
  assert.match(css, /\.aix-stack-hero-frame\s*\{[\s\S]*?height:\s*clamp\(530px,\s*58svh,\s*560px\);[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(360px,\s*1fr\);/);
  assert.match(css, /\.aix-stack-orbit-stage\s*\{[\s\S]*?left:\s*100%;[\s\S]*?width:\s*min\(50rem,\s*68vw\);[\s\S]*?transform:\s*translate\(-50%,\s*-50%\);/);
  assert.match(css, /\.aix-orbit-ring-one\s*\{[\s\S]*?width:\s*14rem;[\s\S]*?height:\s*14rem;/);
  assert.match(css, /\.aix-orbit-ring-two\s*\{[\s\S]*?width:\s*22rem;[\s\S]*?height:\s*22rem;/);
  assert.match(css, /\.aix-orbit-ring-three\s*\{[\s\S]*?width:\s*30rem;[\s\S]*?height:\s*30rem;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-stack-hero-frame\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?justify-items:\s*center;[\s\S]*?text-align:\s*center;[\s\S]*?\.aix-stack-orbit\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*330px;[\s\S]*?height:\s*clamp\(330px,\s*42svh,\s*370px\);[\s\S]*?justify-content:\s*center;[\s\S]*?overflow:\s*visible;[\s\S]*?\.aix-stack-orbit-stage\s*\{[\s\S]*?left:\s*50%;[\s\S]*?width:\s*min\(27\.5rem,\s*calc\(100vw - 28px\)\);[\s\S]*?\.aix-orbit-ring-one\s*\{[\s\S]*?width:\s*9\.75rem;[\s\S]*?\.aix-orbit-ring-two\s*\{[\s\S]*?width:\s*14\.25rem;[\s\S]*?\.aix-orbit-ring-three\s*\{[\s\S]*?width:\s*18\.5rem;[\s\S]*?height:\s*18\.5rem;[\s\S]*?\.aix-orbit-node\s*\{[\s\S]*?width:\s*38px;/);
});

test("homepage includes learner reviews and 40+ social proof", () => {
  assert.match(html, /<section class="aix-reviews" id="reviews" aria-labelledby="reviewsTitle">/);
  assert.match(html, /40\+ คนเริ่มใช้ AI กับงานจริง/);
  assert.match(html, /ข้อความบางส่วนจากผู้เรียน AiX/);
  assert.match(html, /<strong>40\+<\/strong>/);
  assert.match(html, /<strong>6 ชม\.<\/strong>/);
  assert.match(html, /<strong>Replay<\/strong>/);
  assert.equal((html.match(/class="aix-testimonial-card/g) || []).length, 12);
  assert.doesNotMatch(html, /<span>ตัวอย่างงานจริง<\/span>/);
  assert.doesNotMatch(html, /class="aix-review-screenshots"|class="aix-review-shot"|assets\/reviews\//);
  assert.doesNotMatch(css, /\.aix-review-screenshots|\.aix-review-shot/);
  for (const copy of [
    "นำไปประยุกต์ใช้งานได้จริง",
    "AI กลายเป็นผู้ช่วยทำงาน",
    "ผู้สอนตอบคำถามได้ดี",
    "วิดีโอย้อนหลัง"
  ]) {
    assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /\.aix-reviews\s*\{[\s\S]*?padding:\s*clamp\(48px,\s*7vw,\s*88px\)\s+0;[\s\S]*?background:\s*var\(--background\);/);
  assert.match(css, /\.aix-reviews::before\s*\{[\s\S]*?radial-gradient\(circle at 14% 14%,\s*rgba\(56,\s*189,\s*248,\s*0\.2\)[\s\S]*?content:\s*"";/);
  assert.match(css, /\.aix-reviews\.aix-section-ambient::before\s*\{[\s\S]*?height:\s*clamp\(220px,\s*30vw,\s*360px\);[\s\S]*?rgba\(168,\s*85,\s*247,\s*0\.18\)/);
  assert.match(css, /\.aix-reviews-copy h2::after\s*\{[\s\S]*?background:\s*linear-gradient\(90deg,\s*#60a5fa,\s*#34d399\s*48%,\s*#f59e0b\);/);
  assert.match(css, /\.aix-review-stats div::before\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#60a5fa,\s*#22d3ee\);/);
  assert.match(css, /\.aix-testimonial-card:nth-child\(3n\s*\+\s*2\)::before\s*\{[\s\S]*?background:\s*linear-gradient\(90deg,\s*#34d399,\s*#14b8a6\);/);
  assert.match(css, /\.aix-testimonial-columns\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?max-height:\s*260px;[\s\S]*?margin-bottom:\s*0;[\s\S]*?mask-image:\s*linear-gradient/);
  assert.match(css, /@keyframes aixReviewMarquee/);
  assert.match(css, /\.aix-testimonial-track\s*\{[\s\S]*?animation:\s*aixReviewMarquee 28s linear infinite;/);
  assert.doesNotMatch(css, /animation-play-state:\s*paused/);
  assert.match(css, /\.dark \.aix-review-stats div,\s*[\s\S]*?\.dark \.aix-testimonial-card\s*\{/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-testimonial-columns\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.aix-testimonial-column-two\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-review-stats\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.aix-testimonial-track\s*\{[\s\S]*?animation:\s*none !important;/);
});

test("neutral theme tokens are installed and documented", () => {
  for (const token of [
    "--background: #ffffff;",
    "--foreground: #0a0a0a;",
    "--primary: #18181b;",
    "--muted: #f4f4f5;",
    "--muted-foreground: #71717a;",
    "--radius: 0.625rem;"
  ]) {
    assert.ok(css.includes(token), `styles.css missing ${token}`);
    assert.ok(themeTokens.includes(token), `AIX_THEME_TOKENS.MD missing ${token}`);
  }

  assert.match(themeTokens, /@theme inline/);
  assert.doesNotMatch(css, /color:\s*var\(--muted\)/);
});

test("site footer uses a minimal background-free design", () => {
  assert.match(footer, /AiX Weekly/);
  assert.match(footer, /Live, replay, template/);
  assert.match(footer, /<strong>Platform<\/strong>/);
  assert.match(footer, /<strong>ติดต่อทีม<\/strong>/);
  assert.doesNotMatch(footer, /AiX Learning OS/);
  assert.doesNotMatch(footer, /แพลตฟอร์มสมาชิกเรียน AI ต่อเนื่องทั้งปี สำหรับผู้ประกอบการ/);
  assert.match(
    css,
    /\/\* AiX minimal footer redesign 2026-06-12 \*\/[\s\S]*?\.site-footer\s*\{[\s\S]*?background:\s*var\(--background\);[\s\S]*?border-top:\s*1px solid var\(--border\);/
  );
  assert.match(
    css,
    /\/\* AiX minimal footer redesign 2026-06-12 \*\/[\s\S]*?\.site-footer::before,\s*\.site-footer::after\s*\{[\s\S]*?display:\s*none;[\s\S]*?background:\s*none;/
  );
  assert.match(
    css,
    /\/\* AiX minimal footer redesign 2026-06-12 \*\/[\s\S]*?\.footer-brand-note\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/
  );
  assert.match(
    css,
    /\/\* AiX minimal footer redesign 2026-06-12 \*\/[\s\S]*?\.dark \.site-footer\s*\{[\s\S]*?background:\s*#0a0a0a;[\s\S]*?border-color:\s*#27272a;/
  );
  assert.match(
    css,
    /\/\* AiX minimal footer redesign 2026-06-12 \*\/[\s\S]*?\.dark \.site-footer \.footer-logo\s*\{[\s\S]*?filter:\s*brightness\(0\)\s+invert\(1\)\s+contrast\(1\.35\)/
  );
  assert.match(css, /\.site-footer \.footer-grid\s*\{[\s\S]*?width:\s*min\(var\(--container\),\s*calc\(100% - clamp\(48px,\s*8vw,\s*128px\)\)\);[\s\S]*?max-width:\s*1180px;[\s\S]*?margin-inline:\s*auto;[\s\S]*?grid-template-columns:\s*minmax\(260px,\s*1\.2fr\)\s+minmax\(120px,\s*0\.62fr\)\s+minmax\(120px,\s*0\.62fr\)\s+minmax\(190px,\s*0\.86fr\);/);
  assert.match(css, /\.site-footer \.footer-grid > div\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(css, /\.site-footer a\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?overflow-wrap:\s*anywhere;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.site-footer\s*\{[\s\S]*?padding:\s*32px 0 calc\(112px \+ env\(safe-area-inset-bottom\)\);[\s\S]*?\.footer-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/);
  assert.doesNotMatch(css, /@media \(min-width:\s*360px\) and \(max-width:\s*760px\)[\s\S]*?\.site-footer \.footer-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\);/);
  assert.match(css, /@media \(min-width:\s*560px\) and \(max-width:\s*760px\)[\s\S]*?\.site-footer \.footer-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\);/);
  assert.match(css, /@media \(min-width:\s*761px\) and \(max-width:\s*1040px\)\s*\{[\s\S]*?\.footer-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s+minmax\(0,\s*0\.85fr\);/);
  assert.match(html, currentCssCacheBust);
});

test("homepage keeps the hover gradient nav bar in the top header", () => {
  assert.match(html, /<body class="aix-top-nav-active">/);
  assert.match(html, /<header class="site-header aix-home-header">[\s\S]*?<nav class="hover-gradient-nav-bar" aria-label="เมนูหลัก AiX">[\s\S]*?<\/nav>\s*<\/header>/);
  assert.match(html, /class="hover-gradient-nav-bar"/);
  assert.match(html, /class="hover-gradient-nav-list"/);
  assert.equal((html.match(/class="hover-gradient-nav-item/g) || []).length, 8);
  assert.equal((html.match(/class="hover-gradient-nav-glow"/g) || []).length, 8);
  assert.match(html, /data-scroll="home"/);
  assert.match(html, /data-scroll="member-loop"/);
  assert.match(html, /data-scroll="learning-system"/);
  assert.match(html, /data-scroll="catalog"/);
  assert.match(html, /data-scroll="business-cases"/);
  assert.match(html, /data-scroll="membership"/);
  assert.match(html, /id="loginBtn" type="button"/);
  assert.match(html, /class="mobile-panel" id="mobilePanel" hidden/);
  assert.doesNotMatch(html, /<nav class="main-nav" aria-label="เมนูหลัก">/);
  assert.doesNotMatch(html, /id="mobileMenu"/);
  assert.match(css, /\/\* Static port of the 21st\.dev hover gradient nav bar \*\//);
  assert.match(css, /\.hover-gradient-nav-bar\s*\{[\s\S]*?position:\s*relative;[\s\S]*?padding:\s*0 12px 12px;/);
  assert.match(css, /@media \(min-width:\s*1024px\)\s*\{[\s\S]*?\.hover-gradient-nav-bar\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*8px;[\s\S]*?left:\s*calc\(50% \+ 52px\);[\s\S]*?transform:\s*translateX\(-50%\);/);
  assert.match(css, /\.hover-gradient-nav-list\s*\{[\s\S]*?backdrop-filter:\s*blur\(18px\);/);
  assert.match(css, /\.hover-gradient-nav-list\s*\{[\s\S]*?overflow-x:\s*auto;/);
  assert.match(css, /\.hover-gradient-nav-item:hover \.hover-gradient-nav-front,\s*[\s\S]*?transform:\s*rotateX\(-90deg\);/);
  assert.match(css, /\.hover-gradient-nav-item:hover \.hover-gradient-nav-back,\s*[\s\S]*?transform:\s*rotateX\(0\);/);
  assert.match(css, /\.dark \.hover-gradient-nav-list\s*\{[\s\S]*?background:\s*rgba\(10,\s*10,\s*10,\s*0\.82\);/);
  assert.match(script, /loginBtn\.classList\.contains\("hover-gradient-nav-item"\)/);
  assert.match(script, /loginBtn\.querySelectorAll\("\.hover-gradient-nav-face span"\)/);
});

test("shared footer injects the Luma mobile navbar across public pages", async () => {
  assert.match(footer, /function ensureSiteMeteors\(\)/);
  assert.match(footer, /className = "aix-site-meteor-field"/);
  assert.match(footer, /field\.setAttribute\("aria-hidden",\s*"true"\)/);
  assert.match(footer, /document\.body\.insertBefore\(field,\s*document\.body\.firstChild\)/);
  assert.equal((footer.match(/--meteor-left:/g) || []).length, 1);
  assert.equal((footer.match(/left: "/g) || []).length, 16);
  assert.match(footer, /ensureSiteMeteors\(\);\s*ensureMobileLumaNav\(\);\s*ensureSharedThemeToggle\(\);/);
  assert.match(footer, /function ensureMobileLumaNav\(\)/);
  assert.match(footer, /className = "luma-mobile-nav"/);
  assert.match(footer, /class="luma-mobile-shell"/);
  assert.match(footer, /class="luma-mobile-glow"/);
  assert.equal((footer.match(/class="luma-mobile-item/g) || []).length, 1);
  for (const label of ["หน้าแรก", "ค้นหา", "สมาชิก", "วิธีเรียน", "ราคา", "เข้าสู่ระบบ"]) {
    assert.match(footer, new RegExp(label));
  }
  assert.doesNotMatch(footer, /label:\s*"บัญชี"/);
  assert.match(footer, /data-luma-section="\$\{item\.section\}"/);
  assert.match(footer, /link\.dataset\.lumaSection === "account"/);
  assert.match(footer, /event\.preventDefault\(\);\s*const loginButton = document\.getElementById\("loginBtn"\)/);
  assert.match(footer, /loginButton\.click\(\);/);
  assert.match(footer, /const modalLoginButton = document\.querySelector\("\[data-open-login\]"\)/);
  assert.match(footer, /function ensureMobileLumaNav\(\)/);
  assert.match(footer, /const setNavHidden = \(hidden\) =>/);
  assert.match(footer, /nav\.classList\.toggle\("is-hidden",\s*hidden\)/);
  assert.match(footer, /window\.addEventListener\("scroll",\s*requestVisibilitySync,\s*\{ passive:\s*true \}\)/);
  assert.match(footer, /delta > 8/);
  assert.match(footer, /delta < -8/);
  assert.match(footer, /window\.requestAnimationFrame\(syncActive\)/);
  assert.match(footer, /window\.requestAnimationFrame\(syncVisibility\)/);
  assert.match(css, /\.luma-mobile-nav\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.luma-mobile-nav\.is-hidden \.luma-mobile-shell\s*\{[\s\S]*?pointer-events:\s*none;/);
  assert.match(css, /\.luma-mobile-shell\s*\{[\s\S]*?box-shadow:\s*0\s+12px\s+30px\s+rgba\(10,\s*10,\s*10,\s*0\.12\);[\s\S]*?backdrop-filter:\s*blur\(18px\);/);
  assert.match(css, /\.luma-mobile-glow\s*\{[\s\S]*?width:\s*44px;[\s\S]*?height:\s*44px;[\s\S]*?background:\s*linear-gradient\(135deg,\s*rgba\(96,\s*165,\s*250,\s*0\.44\),\s*rgba\(168,\s*85,\s*247,\s*0\.34\)\);[\s\S]*?opacity:\s*0\.38;[\s\S]*?filter:\s*blur\(14px\);/);
  assert.match(css, /\.luma-mobile-item\.is-active\s*\{[\s\S]*?transform:\s*scale\(1\.08\);/);
  assert.match(css, /\/\* Static site-wide port of the 21st\.dev Meteors background effect \*\//);
  assert.match(css, /@keyframes aixMeteor/);
  assert.match(css, /body > :not\(\.aix-site-meteor-field\):not\(\.luma-mobile-nav\):not\(\.modal-backdrop\):not\(main\):not\(script\):not\(style\),\s*body > main:not\(\.aix-homepage-redesign\)\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*1;/);
  assert.match(css, /\.aix-homepage-redesign \.container\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*1;/);
  assert.match(css, /\.aix-site-meteor-field\s*\{[\s\S]*?--meteor-core:\s*rgba\(37,\s*99,\s*235,\s*0\.86\);[\s\S]*?--meteor-field-opacity:\s*0\.4;[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*0;[\s\S]*?pointer-events:\s*none;[\s\S]*?opacity:\s*var\(--meteor-field-opacity\);[\s\S]*?mix-blend-mode:\s*var\(--meteor-blend-mode\);/);
  assert.match(css, /\.aix-site-meteor-field::before\s*\{[\s\S]*?radial-gradient\(circle at 18% 10%,\s*rgba\(59,\s*130,\s*246,\s*0\.12\),\s*transparent 28%\)/);
  assert.match(css, /\.aix-site-meteor-field span\s*\{[\s\S]*?width:\s*2px;[\s\S]*?height:\s*2px;[\s\S]*?background:\s*var\(--meteor-core\);[\s\S]*?box-shadow:[\s\S]*?0 0 16px var\(--meteor-halo\);[\s\S]*?animation:\s*aixMeteor var\(--meteor-duration,\s*10s\) linear infinite;/);
  assert.match(css, /\.aix-site-meteor-field span::before\s*\{[\s\S]*?width:\s*68px;[\s\S]*?background:\s*linear-gradient\(90deg,\s*var\(--meteor-trail\),\s*transparent\);/);
  assert.match(css, /\.dark \.aix-site-meteor-field\s*\{[\s\S]*?--meteor-core:\s*rgba\(224,\s*242,\s*254,\s*0\.96\);[\s\S]*?--meteor-trail:\s*rgba\(125,\s*211,\s*252,\s*0\.82\);[\s\S]*?--meteor-field-opacity:\s*0\.48;[\s\S]*?--meteor-blend-mode:\s*screen;/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.aix-site-meteor-field span\s*\{[\s\S]*?animation:\s*none;[\s\S]*?opacity:\s*0\.32;/);
  assert.match(css, /@media \(max-width:\s*767px\)\s*\{[\s\S]*?body,\s*body\.aix-top-nav-active\s*\{[\s\S]*?padding-bottom:\s*calc\(96px \+ env\(safe-area-inset-bottom\)\);/);
  assert.match(css, /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.aix-home-header \.hover-gradient-nav-bar\s*\{[\s\S]*?display:\s*none;[\s\S]*?\.luma-mobile-nav\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*calc\(16px \+ env\(safe-area-inset-bottom\)\);[\s\S]*?transition:\s*transform 280ms cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\),\s*opacity 200ms ease;[\s\S]*?\.luma-mobile-nav\.is-hidden\s*\{[\s\S]*?transform:\s*translateY\(calc\(100% \+ 28px \+ env\(safe-area-inset-bottom\)\)\);/);

  for (const file of publicFiles.filter((name) => name.endsWith(".html"))) {
    const content = await readFile(join(root, file), "utf8");
    assert.match(content, currentCssCacheBust, `${file} missing current CSS cache bust`);
    assert.match(content, /site-footer\.js\?v=site-footer-responsive-v61-20260624/, `${file} missing current footer script cache bust`);
  }
});

test("homepage runs as a dark-only theme and hides legacy theme toggles", () => {
  assert.match(html, /document\.documentElement\.classList\.add\("dark"\);/);
  assert.match(html, /localStorage\.setItem\("aix-theme",\s*"dark"\);/);
  assert.match(footer, /function ensureSharedThemeToggle\(\)/);
  assert.match(footer, /localStorage\.setItem\("aix-theme",\s*"dark"\)/);
  assert.match(footer, /button\.hidden = true;/);
  assert.match(css, /\/\* Dark-only mode 2026-07-03 \*\//);
  assert.match(css, /\[data-theme-toggle\],\s*[\s\S]*?\.aix-shared-theme-toggle\s*\{[\s\S]*?display:\s*none !important;/);
  assert.equal((html.match(/data-theme-toggle/g) || []).length, 0);
  assert.doesNotMatch(html, /class="theme-toggle/);
  assert.match(css, /\.dark \.brand img\s*\{[\s\S]*?filter:\s*brightness\(0\)\s+invert\(1\)\s+contrast\(1\.35\)/);
  assert.match(css, /\.dark \.aix-stack-center img\s*\{[\s\S]*?filter:\s*invert\(1\)\s+grayscale\(1\)\s+contrast\(1\.25\);/);
  assert.match(css, /\.dark \.aix-resource-stack article,\s*[\s\S]*?\.dark \.aix-resource-section \.resource-card/);
  assert.match(css, /\.dark \.aix-resource-stack p,\s*[\s\S]*?\.dark \.aix-path-grid p/);
  assert.match(css, /\.dark \.aix-resource-stack span\s*\{[\s\S]*?color:\s*var\(--primary-foreground\);[\s\S]*?background:\s*var\(--primary\);/);
  assert.match(css, /\.dark \.aix-resource-stack strong\s*\{[\s\S]*?color:\s*var\(--foreground\);/);
  assert.match(css, /\.dark \.aix-resource-section \.resource-card i\s*\{[\s\S]*?color:\s*#18181b;[\s\S]*?background:\s*#fafafa;[\s\S]*?border:\s*1px solid #3f3f46;/);
  assert.match(css, /\.dark \.aix-home-header \.main-nav button,\s*[\s\S]*?\.dark \.aix-home-header \.link-btn\s*\{[\s\S]*?color:\s*#f4f4f5;/);
  assert.match(css, /\.dark \.aix-catalog \.course-card\s*\{[\s\S]*?background:\s*#0a0a0a;[\s\S]*?border-color:\s*#27272a;/);
  assert.match(css, /\.dark \.aix-catalog \.course-body h3,\s*[\s\S]*?\.dark \.aix-catalog \.provider\s*\{[\s\S]*?color:\s*#fafafa;/);
  assert.match(css, /\.dark \.aix-catalog \.course-body p,\s*[\s\S]*?\.dark \.aix-catalog \.course-meta i\s*\{[\s\S]*?color:\s*#d4d4d8;/);
  assert.match(css, /\.dark \.aix-catalog \.skill-row span\s*\{[\s\S]*?color:\s*#e4e4e7;[\s\S]*?background:\s*#18181b;/);
  assert.match(css, /\.dark \.aix-catalog \.course-card \.secondary-btn\s*\{[\s\S]*?color:\s*#fafafa;/);
  assert.match(css, /\.dark \.aix-stack-hero-lead,\s*[\s\S]*?\.dark \.aix-homepage-redesign \.course-body p/);
  assert.match(css, /\.dark \.aix-stack-hero-lead,[\s\S]*?\{[\s\S]*?color:\s*#d4d4d8;/);
  assert.match(css, /\.dark \.aix-homepage-redesign \.primary-btn,\s*[\s\S]*?\.dark \.aix-home-header \.primary-btn\s*\{[\s\S]*?color:\s*var\(--primary-foreground\);/);
  assert.match(script, /function setThemeMode\(mode,\s*persist = true\)/);
  assert.match(script, /document\.documentElement\.classList\.add\("dark"\)/);
  assert.match(script, /localStorage\.setItem\(STORAGE_KEYS\.theme,\s*"dark"\)/);
  assert.match(script, /function initThemeToggle\(\)/);
  assert.match(script, /querySelectorAll\("\[data-theme-toggle\]"\)/);
});

test("real-work section uses clear image comparison assets", () => {
  assert.match(html, /<section class="aix-business aix-workproof" id="business-cases" aria-labelledby="businessTitle">/);
  assert.match(html, /ดูตัวอย่างงานจริงจากแชท รายงาน และโน้ตที่กระจัดกระจาย/);
  assert.match(html, /data-workproof-compare/);
  assert.match(html, /role="slider"[\s\S]*?aria-valuenow="50"[\s\S]*?data-workproof-handle/);
  assert.match(html, /assets\/generated\/aix-real-work-before-generated\.png/);
  assert.match(html, /assets\/generated\/aix-real-work-after-generated\.png/);
  assert.ok(workproofBefore.byteLength > 800_000);
  assert.ok(workproofAfter.byteLength > 900_000);
  assert.match(css, /\/\* Static port of the image comparison feature for real-work examples \*\//);
  assert.match(css, /\.aix-workproof-compare\s*\{[\s\S]*?--aix-compare-inset:\s*50%;[\s\S]*?isolation:\s*isolate;/);
  assert.match(css, /\.aix-workproof-stage\s*\{[\s\S]*?aspect-ratio:\s*16 \/ 9;[\s\S]*?touch-action:\s*none;[\s\S]*?cursor:\s*ew-resize;/);
  assert.match(css, /\.aix-workproof-after\s*\{[\s\S]*?clip-path:\s*inset\(0 0 0 var\(--aix-compare-inset\)\);/);
  assert.match(css, /\.aix-workproof-handle\s*\{[\s\S]*?cursor:\s*ew-resize;[\s\S]*?touch-action:\s*none;/);
  assert.match(script, /function initWorkproofCompare\(\)/);
  assert.match(script, /document\.querySelectorAll\("\[data-workproof-compare\]"\)/);
  assert.match(script, /compare\.style\.setProperty\("--aix-compare-inset",\s*`\$\{inset\}%`\)/);
  assert.match(script, /stage\.addEventListener\("pointerdown"/);
  assert.match(script, /handle\.addEventListener\("keydown"/);
  assert.match(script, /initWorkproofCompare\(\)/);
});

test("homepage dark-only mode keeps the updated decorative treatment", () => {
  assert.match(css, /\/\* Dark-only mode 2026-07-03 \*\//);
  assert.match(css, /html\s*\{[\s\S]*?color-scheme:\s*dark !important;[\s\S]*?background:\s*#050505 !important;/);
  assert.match(css, /body\s*\{[\s\S]*?background-color:\s*#050505;/);
  assert.match(css, /\.dark \.aix-site-meteor-field\s*\{[\s\S]*?--meteor-core:\s*rgba\(224,\s*242,\s*254,\s*0\.96\);[\s\S]*?--meteor-field-opacity:\s*0\.48;[\s\S]*?--meteor-blend-mode:\s*screen;/);
  assert.match(css, /\.aix-stack-hero-frame\s*\{[\s\S]*?background:[\s\S]*?rgba\(10,\s*10,\s*10,\s*0\.78\);[\s\S]*?backdrop-filter:\s*blur\(18px\);/);
  assert.match(css, /\.dark \.aix-stack-hero-actions \.aix-rainbow-shell,\s*[\s\S]*?\.dark \.aix-pricing-actions \.aix-rainbow-shell\s*\{[\s\S]*?--rainbow-shell-bg:\s*rgba\(125,\s*211,\s*252,\s*0\.16\);[\s\S]*?--rainbow-beam:\s*rgba\(224,\s*242,\s*254,\s*0\.9\);/);
  assert.match(html, currentCssCacheBust);
});

test("server can run against Supabase Postgres with the migrated AiX schema", () => {
  assert.equal(packageJson.dependencies.pg, "^8.22.0");
  assert.match(serverScript, /process\.env\.SUPABASE_DATABASE_URL \|\| process\.env\.DATABASE_URL \|\| process\.env\.SUPABASE_DB_URL/);
  assert.match(serverScript, /class PostgresCompatDatabase/);
  assert.match(serverScript, /new Worker\(path\.join\(__dirname,\s*'postgres-worker\.js'\)/);
  assert.match(serverScript, /fs\.readdirSync\(migrationsDir\)[\s\S]*?\.filter\(\(filename\) => filename\.endsWith\('\.sql'\)\)[\s\S]*?\.sort\(\)/);
  assert.match(serverScript, /Supabase Postgres/);
  assert.match(serverScript, /pathParts\.includes\('supabase'\)/);
  assert.match(postgresWorker, /types\.setTypeParser\(20,\s*\(value\) => Number\(value\)\)/);
  assert.match(postgresWorker, /types\.setTypeParser\(1700,\s*\(value\) => Number\(value\)\)/);
  assert.match(envExample, /SUPABASE_DATABASE_URL=/);
  assert.match(envExample, /SUPABASE_DB_SSL=true/);
  assert.match(envExample, /SUPABASE_DB_POOL_MAX=4/);
  assert.match(renderYaml, /key: SUPABASE_DATABASE_URL[\s\S]*?sync: false/);
  assert.match(renderYaml, /key: SUPABASE_DB_SSL[\s\S]*?value: "true"/);
  assert.match(renderYaml, /key: SUPABASE_DB_POOL_MAX[\s\S]*?value: "4"/);
  assert.match(supabaseMigration, /create table if not exists public\.members/);
  assert.match(supabaseMigration, /create table if not exists public\.courses/);
  assert.match(supabaseMigration, /create table if not exists public\.payment_records/);
  assert.match(supabaseMigration, /alter table public\.members enable row level security/);
  assert.match(supabaseMigration, /revoke all on all tables in schema public from anon, authenticated/);
  assert.match(supabaseMigration, /grant select, insert, update, delete on all tables in schema public to service_role/);
  assert.match(supabasePolicyMigration, /server_only_no_browser_access/);
  assert.match(supabasePolicyMigration, /for all to anon, authenticated using \(false\) with check \(false\)/);
});
