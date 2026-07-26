import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { parse } from "acorn";

const script = await readFile(join(process.cwd(), "script.js"), "utf8");
const program = parse(script, { ecmaVersion: "latest", sourceType: "script" });

function functionSource(name) {
  const matches = program.body.filter((node) => node.type === "FunctionDeclaration" && node.id?.name === name);
  assert.equal(matches.length, 1, `script.js must declare exactly one function ${name}`);
  return script.slice(matches[0].start, matches[0].end);
}

function createRuntime() {
  const labelNode = { textContent: "" };
  const button = {
    dataset: {},
    hidden: true,
    tabIndex: -1,
    attributes: new Map(),
    querySelector: (selector) => selector === "[data-membership-purchase-label]" ? labelNode : null,
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  };
  const openedAuthModes = [];
  const context = {
    state: { member: null },
    document: {
      querySelectorAll(selector) {
        assert.equal(selector, "[data-membership-purchase]");
        return [button];
      }
    },
    setAuthActionHidden(element, isHidden) {
      element.hidden = isHidden;
      element.tabIndex = isHidden ? -1 : 0;
    },
    openAuthModal(mode) {
      openedAuthModes.push(mode);
    },
    window: { location: { href: "" } }
  };

  vm.createContext(context);
  vm.runInContext([
    functionSource("membershipPurchaseUi"),
    functionSource("syncMembershipPurchaseAction"),
    functionSource("handleMembershipPurchase")
  ].join("\n"), context);

  return { button, context, labelNode, openedAuthModes };
}

test("membership purchase CTA stays visible and follows member payment state", () => {
  const runtime = createRuntime();
  const cases = [
    { member: null, label: "สั่งซื้อสมาชิก 1 ปี", destination: "signup" },
    { member: { paymentStatus: "unpaid" }, label: "ชำระเงิน 1,999 บาท", destination: "payment" },
    { member: { paymentStatus: "paid" }, label: "ไปที่พื้นที่สมาชิก", destination: "dashboard" }
  ];

  for (const expected of cases) {
    runtime.context.state.member = expected.member;
    runtime.context.syncMembershipPurchaseAction();
    assert.equal(runtime.button.hidden, false);
    assert.equal(runtime.button.tabIndex, 0);
    assert.equal(runtime.labelNode.textContent, expected.label);
    assert.equal(runtime.button.attributes.get("aria-label"), expected.label);
    assert.equal(runtime.button.dataset.membershipDestination, expected.destination);
  }
});

test("membership purchase CTA opens signup or routes to the correct member page", () => {
  const runtime = createRuntime();

  runtime.button.dataset.membershipDestination = "signup";
  runtime.context.handleMembershipPurchase(runtime.button);
  assert.deepEqual(runtime.openedAuthModes, ["signup"]);
  assert.equal(runtime.context.window.location.href, "");

  runtime.button.dataset.membershipDestination = "payment";
  runtime.context.handleMembershipPurchase(runtime.button);
  assert.equal(runtime.context.window.location.href, "/payment");

  runtime.button.dataset.membershipDestination = "dashboard";
  runtime.context.handleMembershipPurchase(runtime.button);
  assert.equal(runtime.context.window.location.href, "/dashboard");
});
