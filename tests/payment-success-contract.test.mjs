import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const html = await readFile(join(root, "payment-success.html"), "utf8");
const script = await readFile(join(root, "payment-success.js"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");

test("payment success page polls PromptPay status with a bounded retry flow", () => {
  assert.match(html, /id="paymentResultCard" aria-busy="true"/);
  assert.match(html, /id="paymentResultMeta" role="status" aria-live="polite"/);
  assert.match(html, /id="paymentRetryButton" type="button" hidden>ตรวจอีกครั้ง<\/button>/);
  assert.match(html, /หน้านี้จะตรวจสถานะซ้ำโดยอัตโนมัติ/);
  assert.match(html, /payment-success\.js\?v=payment-success-4/);

  assert.match(script, /const PAYMENT_POLL_DELAYS_MS = Object\.freeze\(\[2000, 3000, 5000, 8000, 12000, 15000\]\);/);
  assert.match(script, /const PAYMENT_POLL_MAX_MS = 60000;/);
  assert.match(script, /const PAYMENT_REQUEST_TIMEOUT_MS = 12000;/);
  assert.match(script, /function requestPaymentStatus\(path\)/);
  assert.match(script, /new AbortController\(\)/);
  assert.match(script, /Promise\.race\(/);
  assert.match(script, /apiRequest\(path, \{ signal: controller\.signal \}\)/);
  assert.match(script, /function scheduleNextVerification\(\)/);
  assert.match(script, /pollTimer = window\.setTimeout\(\(\) => verifyPayment\(\), delay\);/);
  assert.match(script, /paymentRetryButton\?\.addEventListener\("click", \(\) => verifyPayment\(\{ restart: true \}\)\);/);
  assert.match(script, /window\.addEventListener\("pagehide", clearPolling\);/);
  assert.match(script, /function resumeVerification\(event\)/);
  assert.match(script, /event\.persisted/);
  assert.match(script, /window\.addEventListener\("pageshow", resumeVerification\);/);
  assert.match(script, /if \(data\.paymentStatus === "paid"\)/);
  assert.match(script, /if \(data\.status === "expired"\)/);
  assert.match(script, /ยังรอการยืนยันจาก Stripe/);
  assert.match(script, /คุณกดตรวจอีกครั้งได้โดยไม่ต้องชำระซ้ำ/);
  assert.doesNotMatch(script, /resultIcon\.innerHTML/);

  assert.match(css, /\.payment-result-meta\s*\{[\s\S]*?min-height:/);
  assert.match(css, /\.payment-result-card\[aria-busy="true"\] \.result-icon i\s*\{[\s\S]*?animation:/);
});
