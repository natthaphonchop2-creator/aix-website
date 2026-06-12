import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const html = await readFile(join(root, "index.html"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");
const script = await readFile(join(root, "script.js"), "utf8");
const footer = await readFile(join(root, "site-footer.js"), "utf8");
const themeTokens = await readFile(join(root, "docs/development/AIX_THEME_TOKENS.MD"), "utf8");

const publicFiles = [
  "index.html",
  "site-footer.js",
  "script.js",
  "styles.css",
  "auth.html",
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
  /Noto Sans Thai/i,
  /Open Sans/i,
  /Inconsolata/i,
  /\bInter\b/i
];

test("homepage rebuild has the new AiX brand surface and keeps runtime hooks", async () => {
  assert.match(html, /<main id="main-content" class="aix-homepage-redesign"/);
  assert.match(html, /เรียน AI ต่อเนื่องทั้งปี/);
  assert.match(html, /1,999 บาทต่อปี/);
  assert.match(html, /ไม่ต้องไล่ตาม AI คนเดียว/);
  assert.match(html, /id="member-loop"/);
  assert.match(html, /id="learning-system"/);
  assert.match(html, /id="catalog"/);
  assert.match(html, /id="membership"/);
  assert.match(html, /id="faq"/);

  for (const hook of requiredHooks) {
    assert.ok(html.includes(hook), `missing homepage runtime hook ${hook}`);
  }
});

test("public website no longer references mascot or companion assets", async () => {
  for (const file of publicFiles) {
    const content = await readFile(join(root, file), "utf8");
    for (const pattern of bannedPublicPatterns) {
      assert.doesNotMatch(content, pattern, `${file} still matches ${pattern}`);
    }
  }
});

test("public pages do not load the removed moving-light motion layer", async () => {
  for (const file of publicFiles) {
    const content = await readFile(join(root, file), "utf8");
    assert.doesNotMatch(content, /site-motion\.js/, `${file} still loads site-motion.js`);
    assert.doesNotMatch(content, /assets\/vendor\/gsap\.min\.js/, `${file} still loads GSAP for site motion`);
  }
});

test("homepage CSS includes responsive and motion safety rules", () => {
  assert.match(css, /\.aix-homepage-redesign/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /text-wrap: balance/);
  assert.doesNotMatch(css, /background-clip:\s*text/);
  assert.match(html, /family=Bai\+Jamjuree/);
  assert.match(html, /family=Chakra\+Petch/);
  assert.doesNotMatch(html, />01</);
  assert.doesNotMatch(html, />02</);
  assert.doesNotMatch(html, />03</);
  assert.match(html, /aix-stack-hero/);
  assert.match(html, /aix-stack-orbit/);
  assert.match(script, /Job-based Roadmap/);
  assert.match(footer, /แพลตฟอร์มสมาชิกเรียน AI ต่อเนื่องทั้งปี/);
});

test("homepage hero uses a clean white background without the old gray split", () => {
  assert.match(css, /\.aix-stack-hero\s*\{[\s\S]*?background:\s*var\(--background\);/);
  assert.doesNotMatch(css, /\.aix-hero\s*\{[\s\S]*?linear-gradient\(90deg,\s*#ffffff\s+0\s+52%,\s*#f0f0f0\s+52%\s+100%\)/);
});

test("homepage uses the stack feature section hero from the 21st.dev direction", () => {
  assert.match(html, /class="aix-stack-hero"/);
  assert.match(html, /class="container aix-stack-hero-frame"/);
  assert.match(html, /class="aix-stack-orbit-stage"/);
  assert.doesNotMatch(html, /<div class="aix-stack-hero-copy">\s*<p class="aix-status-pill">/);
  assert.doesNotMatch(html, /สมาชิก AiX Club, 1,999 บาทต่อปี/);
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
  assert.doesNotMatch(css, /\.aix-stack-center span/);
  assert.match(css, /\.aix-stack-hero-frame\s*\{[\s\S]*?height:\s*clamp\(530px,\s*58svh,\s*560px\);[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(360px,\s*1fr\);/);
  assert.match(css, /\.aix-stack-orbit-stage\s*\{[\s\S]*?left:\s*100%;[\s\S]*?width:\s*min\(50rem,\s*68vw\);[\s\S]*?transform:\s*translate\(-50%,\s*-50%\);/);
  assert.match(css, /\.aix-orbit-ring-one\s*\{[\s\S]*?width:\s*14rem;[\s\S]*?height:\s*14rem;/);
  assert.match(css, /\.aix-orbit-ring-two\s*\{[\s\S]*?width:\s*22rem;[\s\S]*?height:\s*22rem;/);
  assert.match(css, /\.aix-orbit-ring-three\s*\{[\s\S]*?width:\s*30rem;[\s\S]*?height:\s*30rem;/);
  assert.match(css, /@media \(max-width:\s*760px\)\s*\{[\s\S]*?\.aix-stack-orbit\s*\{[\s\S]*?height:\s*clamp\(280px,\s*38svh,\s*300px\);[\s\S]*?\.aix-stack-orbit-stage\s*\{[\s\S]*?left:\s*100%;[\s\S]*?width:\s*min\(24rem,\s*120vw\);[\s\S]*?\.aix-orbit-ring-three\s*\{[\s\S]*?width:\s*16rem;[\s\S]*?height:\s*16rem;/);
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
