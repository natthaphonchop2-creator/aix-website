import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const source = await readFile(join(process.cwd(), "payment-success.js"), "utf8");

function createElement(id) {
  const listeners = new Map();
  const glyph = { className: "fa-solid fa-spinner" };
  return {
    id,
    textContent: "",
    className: "",
    hidden: false,
    disabled: false,
    href: "",
    attributes: new Map(),
    classList: {
      add() {},
      remove() {}
    },
    querySelector(selector) {
      return selector === "i" ? glyph : null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    listeners,
    glyph
  };
}

function createHarness({ bootstrap, request }) {
  const ids = [
    "paymentResultIcon",
    "paymentResultTitle",
    "paymentResultCopy",
    "paymentResultMeta",
    "paymentResultCard",
    "dashboardLink",
    "receiptLink",
    "paymentRetryButton",
    "toast"
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, createElement(id)]));
  elements.receiptLink.hidden = true;
  elements.paymentRetryButton.hidden = true;

  let nextTimerId = 1;
  const timers = new Map();
  const windowListeners = new Map();
  let clearCount = 0;
  let requestCount = 0;

  const memberApi = {
    bootstrap,
    request(path, options) {
      requestCount += 1;
      return request(path, options);
    },
    clear() {
      clearCount += 1;
    }
  };

  const fakeWindow = {
    AiXApi: { createClient: () => memberApi },
    location: {
      search: "?session_id=cs_test_123",
      replace() {}
    },
    setTimeout(callback, delay) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    addEventListener(name, listener) {
      windowListeners.set(name, listener);
    }
  };

  const evaluation = runInNewContext(source, {
    window: fakeWindow,
    document: { getElementById: (id) => elements[id] || null },
    URLSearchParams,
    AbortController,
    Intl,
    Date,
    encodeURIComponent,
    console
  });

  return {
    evaluation,
    elements,
    timers,
    windowListeners,
    get clearCount() { return clearCount; },
    get requestCount() { return requestCount; }
  };
}

test("a stalled payment verification times out and exposes a manual retry", async () => {
  const never = new Promise(() => {});
  const harness = createHarness({
    bootstrap: () => never,
    request: async () => ({ paymentStatus: "unpaid", status: "open" })
  });

  const timeout = [...harness.timers.values()].find((timer) => timer.delay === 12000);
  assert.ok(timeout, "verification timeout was not scheduled");
  timeout.callback();
  await harness.evaluation;

  assert.equal(harness.elements.paymentResultCard.attributes.get("aria-busy"), "false");
  assert.equal(harness.elements.paymentRetryButton.hidden, false);
  assert.match(harness.elements.paymentResultMeta.textContent, /ตรวจอีกครั้งได้โดยไม่ต้องชำระซ้ำ/);
  assert.equal(harness.clearCount, 1);
});

test("a BFCache restore resumes polling after pagehide cleared the timer", async () => {
  const harness = createHarness({
    bootstrap: async () => ({ csrfToken: "csrf" }),
    request: async () => ({ paymentStatus: "unpaid", status: "open" })
  });

  await harness.evaluation;
  assert.equal(harness.requestCount, 1);
  assert.ok([...harness.timers.values()].some((timer) => timer.delay === 2000));

  harness.windowListeners.get("pagehide")();
  assert.equal(harness.timers.size, 0);

  await harness.windowListeners.get("pageshow")({ persisted: true });
  assert.equal(harness.requestCount, 2);
  assert.ok([...harness.timers.values()].some((timer) => timer.delay === 2000));
});
