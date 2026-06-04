import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();
const html = await readFile(join(root, "index.html"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");
const script = await readFile(join(root, "script.js"), "utf8");
const footer = await readFile(join(root, "site-footer.js"), "utf8");

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
  /Roboto/i,
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
  assert.match(html, /aix-system-map/);
  assert.match(script, /Job-based Roadmap/);
  assert.match(footer, /แพลตฟอร์มสมาชิกเรียน AI ต่อเนื่องทั้งปี/);
});
