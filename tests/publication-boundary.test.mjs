import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/server-harness.mjs";

const MEMBER_PAGE_ASSETS = [
  "/dashboard.js",
  "/tools-box.js",
  "/live-class.js",
  "/payment.js",
  "/payment-success.js",
  "/course-start.js",
  "/course-content.js",
  "/course-learn.js"
];

test("serves approved public files and hides repository internals", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of [
    "/",
    "/index.html",
    "/class-detail.html",
    "/styles.css",
    "/assets/ai-logos/chatgpt.svg"
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 200, pathname);
  }

  for (const pathname of [
    "/Agent.MD",
    "/PRODUCT.md",
    "/package.json",
    "/server.js",
    "/data.db",
    "/customer_exports/example.md",
    "/docs/Client%20Proposal.pdf",
    "/tmp/log.txt",
    "/dashboard.html",
    "/tools-box.html",
    "/course-content.html",
    "/live-class.html",
    "/payment.html",
    "/uploads/replays/example.mp4",
    "/assets/vendor/gsap.min.js",
    "/assets/%2e%2e/server.js"
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 404, pathname);
  }
});

test("guards canonical member routes and exposes only explicit admin shell files", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of [
    "/dashboard",
    "/tools-box",
    "/payment",
    "/payment/success",
    "/course/manus-ai/start",
    "/live/demo"
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 302, `${pathname}: ${response.status}`);
    assert.equal(response.headers.get("location"), "/index.html?auth=login", pathname);
  }

  for (const pathname of MEMBER_PAGE_ASSETS) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.ok([302, 404].includes(response.status), `${pathname} must never be public: ${response.status}`);
    if (response.status === 302) {
      assert.equal(response.headers.get("location"), "/index.html?auth=login", pathname);
    }
  }

  const adminRedirect = await fetch(`${server.origin}/admin.html`, { redirect: "manual" });
  assert.equal(adminRedirect.status, 308);
  assert.equal(adminRedirect.headers.get("location"), "/admin");

  for (const pathname of ["/admin", "/admin.css", "/admin.js"]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 200, pathname);
  }
});

test("applies the publication boundary to HEAD requests", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of ["/", "/styles.css", "/assets/ai-logos/chatgpt.svg"]) {
    const response = await fetch(`${server.origin}${pathname}`, {
      method: "HEAD",
      redirect: "manual"
    });
    assert.equal(response.status, 200, pathname);
    assert.equal(await response.text(), "", `${pathname} HEAD response must not have a body`);
  }

  for (const pathname of ["/Agent.MD", "/dashboard.html", "/uploads/replays/example.mp4"]) {
    const response = await fetch(`${server.origin}${pathname}`, {
      method: "HEAD",
      redirect: "manual"
    });
    assert.equal(response.status, 404, pathname);
    assert.equal(await response.text(), "", `${pathname} HEAD response must not have a body`);
  }
});

test("fails closed for malformed encoding and encoded private paths", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of ["/%", "/%ZZ", "/%E0%A4%A"]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.ok([400, 404].includes(response.status), `${pathname}: ${response.status}`);
  }

  for (const pathname of [
    "/%64ashboard.html",
    "/dashboard%2ehtml",
    "/%74ools-box.html",
    "/course-content%2ehtml"
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 404, `${pathname}: ${response.status}`);
  }
});

test("returns a closed 404 response for unknown API and file routes", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const apiResponse = await fetch(`${server.origin}/api/not-classified`, { redirect: "manual" });
  assert.equal(apiResponse.status, 404);
  assert.match(apiResponse.headers.get("content-type") || "", /application\/json/);
  assert.deepEqual(await apiResponse.json(), { error: "Not found" });

  const fileResponse = await fetch(`${server.origin}/not-public.txt`, { redirect: "manual" });
  assert.equal(fileResponse.status, 404);
});
