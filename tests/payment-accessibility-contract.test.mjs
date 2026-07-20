import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const html = await readFile(join(root, "payment.html"), "utf8");
const script = await readFile(join(root, "payment.js"), "utf8");
const css = await readFile(join(root, "styles.css"), "utf8");

test("payment methods keep native radio semantics and visible keyboard focus", () => {
  assert.match(html, /<fieldset class="payment-method-group">\s*<legend class="visually-hidden">วิธีชำระเงิน<\/legend>/);
  assert.equal((html.match(/class="visually-hidden" type="radio" name="paymentMethod"/g) || []).length, 2);
  assert.match(html, /value="card" aria-describedby="cardPaymentDescription" checked/);
  assert.match(html, /value="promptpay" aria-describedby="promptPayDescription"/);
  assert.match(html, /id="cardPaymentDescription">จ่ายผ่าน Stripe Checkout<\/small>/);
  assert.match(html, /id="promptPayDescription">จ่ายพร้อมเพย์ผ่าน Stripe<\/small>/);

  assert.doesNotMatch(css, /\.payment-method input\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.payment-method:has\(input:checked\)\s*\{[\s\S]*?border-color:/);
  assert.match(css, /\.payment-method:has\(input:focus-visible\)\s*\{[\s\S]*?outline:/);
  assert.match(css, /\.payment-method:has\(input:disabled\)\s*\{[\s\S]*?cursor:\s*not-allowed;/);

  assert.doesNotMatch(script, /method\.addEventListener\("click"|querySelector\("input"\)\?\.click\(\)/);
  assert.match(script, /firstAvailable\.checked = true;/);
});
