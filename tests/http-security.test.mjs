import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import express from "express";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const { createHttpSecurity } = require("../security/http-security.cjs");
const { ipKeyGenerator } = require("express-rate-limit");

const APPROVED_ORIGIN = "https://www.aixclub.co";
const serverSource = await readFile("server.js", "utf8");

function canonicalEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized) ? normalized : "";
}

function canonicalPhone(value) {
  const normalized = String(value || "").replace(/[^\d]/g, "");
  return /^0\d{9}$/.test(normalized) ? normalized : "";
}

function createSecurity(overrides = {}) {
  return createHttpSecurity({
    allowedOrigins: new Set([APPROVED_ORIGIN]),
    validCsrf: (session, token) => token === `csrf:${session?.nonce || ""}`,
    canonicalEmail,
    canonicalPhone,
    ...overrides
  });
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function requestRecorder({ method = "GET", origin, csrfToken, session } = {}) {
  const values = new Map();
  if (origin !== undefined) values.set("origin", origin);
  if (csrfToken !== undefined) values.set("x-csrf-token", csrfToken);
  return {
    method,
    authSession: session,
    get(name) {
      return values.get(String(name).toLowerCase());
    }
  };
}

async function corsDecision(corsOptions, origin) {
  return new Promise((resolve, reject) => {
    corsOptions.origin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(allowed);
    });
  });
}

async function startLimiterServer(t, register) {
  const app = express();
  const security = createSecurity();
  app.use(express.json());
  register(app, security);

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  }));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function postJson(origin, pathname, body) {
  return fetch(`${origin}${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function assertRateLimitHeaders(response) {
  assert.match(response.headers.get("ratelimit") || "", /r=/i);
  assert.match(response.headers.get("ratelimit-policy") || "", /q=/i);
  assert.equal(response.headers.get("x-ratelimit-limit"), null);
}

function responseCookie(response, name) {
  return response.headers.getSetCookie()
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(";", 1)[0] || "";
}

function exactOriginHeaders(server, extra = {}) {
  return { origin: server.origin, ...extra };
}

function assertNoLimiterValidationWarnings(server) {
  assert.doesNotMatch(server.output(), /ValidationError|ERR_ERL_/i);
}

function hashedIdentityKey(namespace, canonical) {
  return `${namespace}:${crypto.createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

test("preserves the original interface with safe optional canonicalizer defaults", () => {
  assert.doesNotThrow(() => createHttpSecurity({
    allowedOrigins: new Set([APPROVED_ORIGIN]),
    validCsrf: () => true
  }));
});

test("pure IP limiters retain the library default IPv6-safe key and diagnostics", async (t) => {
  let limiter;
  const origin = await startLimiterServer(t, (app, security) => {
    limiter = security.adminLoginIp;
    app.post("/admin", limiter, (req, res) => res.json({ ok: true }));
  });

  assert.equal((await postJson(origin, "/admin", {})).status, 200);
  const safeIp = ipKeyGenerator("127.0.0.1");
  assert.ok(await limiter.getKey(safeIp));
  assert.equal(await limiter.getKey(`admin-login-ip:${safeIp}`), undefined);
});

test("canonical identity limiters retain only a fixed-length SHA-256 key", async (t) => {
  let limiter;
  const origin = await startLimiterServer(t, (app, security) => {
    limiter = security.memberLoginIdentity;
    app.post("/login", limiter, (req, res) => res.json({ ok: true }));
  });
  const email = "member@example.com";

  assert.equal((await postJson(origin, "/login", { email })).status, 200);
  assert.equal(await limiter.getKey(`member-login-email:${email}`), undefined);
  assert.ok(await limiter.getKey(hashedIdentityKey("member-login-email", email)));
});

test("server bounds canonical email acceptance before rate-limit key creation", () => {
  assert.match(
    serverSource,
    /email\.length <= SESSION_IDENTITY_MAX_LENGTH\s*&&\s*EMAIL_RE\.test\(email\)/
  );
});

test("CORS accepts only an absent or exact configured Origin with credentials", async () => {
  const security = createSecurity();
  assert.equal(security.corsOptions.credentials, true);
  assert.equal(await corsDecision(security.corsOptions, undefined), true);
  assert.equal(await corsDecision(security.corsOptions, APPROVED_ORIGIN), true);

  for (const origin of [
    null,
    "",
    "null",
    `${APPROVED_ORIGIN}/`,
    `${APPROVED_ORIGIN}.evil.example`,
    `prefix.${APPROVED_ORIGIN}`,
    `${APPROVED_ORIGIN}, https://evil.example`
  ]) {
    assert.equal(await corsDecision(security.corsOptions, origin), false, String(origin));
  }
});

test("mutation Origin middleware accepts safe methods and one exact configured Origin", () => {
  const security = createSecurity();
  let calls = 0;

  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    security.requireMutationOrigin(
      requestRecorder({ method, origin: "https://evil.example" }),
      responseRecorder(),
      () => { calls += 1; }
    );
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    security.requireMutationOrigin(
      requestRecorder({ method, origin: APPROVED_ORIGIN }),
      responseRecorder(),
      () => { calls += 1; }
    );
  }
  assert.equal(calls, 7);

  for (const origin of [
    undefined,
    "",
    "null",
    "https://evil.example",
    `${APPROVED_ORIGIN}/`,
    `${APPROVED_ORIGIN}.evil.example`,
    `https://prefix-${APPROVED_ORIGIN.slice(8)}`,
    `${APPROVED_ORIGIN}, https://evil.example`
  ]) {
    const response = responseRecorder();
    security.requireMutationOrigin(
      requestRecorder({ method: "POST", origin }),
      response,
      () => assert.fail("unsafe request must not continue")
    );
    assert.equal(response.statusCode, 403, String(origin));
  }
});

test("session CSRF middleware is safe-method neutral and binds unsafe requests to one session", () => {
  const security = createSecurity();
  const first = { nonce: "first" };
  const second = { nonce: "second" };
  let calls = 0;

  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    security.requireSessionCsrf(
      requestRecorder({ method, session: first }),
      responseRecorder(),
      () => { calls += 1; }
    );
  }
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    security.requireSessionCsrf(
      requestRecorder({ method, session: first, csrfToken: "csrf:first" }),
      responseRecorder(),
      () => { calls += 1; }
    );
  }
  assert.equal(calls, 7);

  for (const [session, csrfToken] of [
    [first, undefined],
    [first, "wrong"],
    [second, "csrf:first"],
    [undefined, "csrf:first"]
  ]) {
    const response = responseRecorder();
    security.requireSessionCsrf(
      requestRecorder({ method: "DELETE", session, csrfToken }),
      response,
      () => assert.fail("invalid CSRF request must not continue")
    );
    assert.equal(response.statusCode, 403);
  }
});

test("member login enforces five attempts per canonical email independently of its IP budget", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    app.post("/login", security.memberLoginIp, security.memberLoginIdentity, (req, res) => {
      res.json({ ok: true });
    });
  });

  for (const email of [
    " MEMBER@example.com ",
    "member@EXAMPLE.com",
    "member@example.com",
    "Member@Example.Com",
    " member@example.com"
  ]) {
    const response = await postJson(origin, "/login", { email });
    assert.equal(response.status, 200, email);
    assertRateLimitHeaders(response);
  }
  const blocked = await postJson(origin, "/login", { email: "member@example.com" });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
});

test("member login enforces ten attempts per IPv4 or IPv6-safe IP independently of email", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    app.post("/login", security.memberLoginIp, security.memberLoginIdentity, (req, res) => {
      res.json({ ok: true });
    });
  });

  for (let index = 0; index < 10; index += 1) {
    const response = await postJson(origin, "/login", { email: `member-${index}@example.com` });
    assert.equal(response.status, 200, String(index));
  }
  const blocked = await postJson(origin, "/login", { email: "member-10@example.com" });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
});

test("admin login enforces five attempts per IPv4 or IPv6-safe IP", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    app.post("/admin", security.adminLoginIp, (req, res) => res.json({ ok: true }));
  });

  for (let index = 0; index < 5; index += 1) {
    assert.equal((await postJson(origin, "/admin", {})).status, 200);
  }
  const blocked = await postJson(origin, "/admin", {});
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
});

test("all OTP routes share five attempts per canonical phone", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    const middlewares = [security.otpIp, security.otpPhone];
    for (const pathname of ["/otp/public/send", "/otp/public/verify", "/otp/member/send", "/otp/member/verify"]) {
      app.post(pathname, ...middlewares, (req, res) => res.json({ ok: true }));
    }
  });

  for (const [pathname, phone] of [
    ["/otp/public/send", "081-234-5678"],
    ["/otp/public/verify", "081 234 5678"],
    ["/otp/member/send", "(081)2345678"],
    ["/otp/member/verify", "0812345678"],
    ["/otp/public/send", " 0812345678 "]
  ]) {
    assert.equal((await postJson(origin, pathname, { phone })).status, 200, phone);
  }
  const blocked = await postJson(origin, "/otp/member/verify", { phone: "0812345678" });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
});

test("OTP routes share twenty attempts per IP across distinct valid phones", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    const middlewares = [security.otpIp, security.otpPhone];
    for (const pathname of ["/otp/public/send", "/otp/public/verify", "/otp/member/send", "/otp/member/verify"]) {
      app.post(pathname, ...middlewares, (req, res) => res.json({ ok: true }));
    }
  });

  const paths = ["/otp/public/send", "/otp/public/verify", "/otp/member/send", "/otp/member/verify"];
  for (let index = 0; index < 20; index += 1) {
    const phone = `08${String(index).padStart(8, "0")}`;
    const pathname = paths[index % paths.length];
    assert.equal((await postJson(origin, pathname, { phone })).status, 200, phone);
  }
  const blocked = await postJson(origin, "/otp/member/send", { phone: "0899999999" });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
});

test("invalid attacker-controlled identities fall back to a safe IP key", async (t) => {
  const origin = await startLimiterServer(t, (app, security) => {
    app.post("/email", security.memberLoginIdentity, (req, res) => res.json({ ok: true }));
    app.post("/phone", security.otpPhone, (req, res) => res.json({ ok: true }));
  });

  for (let index = 0; index < 5; index += 1) {
    assert.equal((await postJson(origin, "/email", { email: `invalid-${index}` })).status, 200);
    assert.equal((await postJson(origin, "/phone", { phone: `invalid-${index}` })).status, 200);
  }
  assert.equal((await postJson(origin, "/email", { email: "another-invalid" })).status, 429);
  assert.equal((await postJson(origin, "/phone", { phone: "+66-invalid" })).status, 429);
});

test("server preserves Stripe raw-body precedence and wires global HTTP security in exact order", () => {
  assert.match(serverSource, /require\(['"]\.\/security\/http-security\.cjs['"]\)/);
  assert.match(serverSource, /if \(IS_PRODUCTION\) app\.set\(['"]trust proxy['"], 1\)/);

  const corsIndex = serverSource.indexOf("app.use(cors(HTTP_SECURITY.corsOptions))");
  const webhookNeedle = "app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)";
  const webhookIndex = serverSource.indexOf(webhookNeedle);
  const jsonIndex = serverSource.indexOf("app.use(express.json({ limit: '1mb' }))");
  const retiredIndex = serverSource.indexOf("app.use(rejectLegacyClientToken)");
  const originIndex = serverSource.indexOf("app.use(HTTP_SECURITY.requireMutationOrigin)");
  assert.ok(corsIndex >= 0, "configured CORS middleware must exist");
  assert.ok(corsIndex < webhookIndex, "CORS must be configured before the webhook route");
  assert.ok(webhookIndex < jsonIndex, "Stripe webhook must remain before global JSON parsing");
  assert.ok(jsonIndex < retiredIndex, "legacy-token rejection must remain after JSON parsing");
  assert.ok(retiredIndex < originIndex, "global mutation Origin must follow retired-token rejection");
  assert.equal(serverSource.split(webhookNeedle).length - 1, 1, "Stripe webhook route must not be duplicated");

  for (const declaration of [
    "app.post('/api/members/login', HTTP_SECURITY.memberLoginIp, HTTP_SECURITY.memberLoginIdentity,",
    "app.post('/api/admin/login', HTTP_SECURITY.adminLoginIp,",
    "app.post('/api/members/otp/send', HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone,",
    "app.post('/api/members/otp/verify', HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone,",
    "app.post('/api/member/phone/otp/send', requireMemberSession, HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone,",
    "app.post('/api/member/phone/otp/verify', requireMemberSession, HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone,"
  ]) {
    assert.ok(serverSource.includes(declaration), declaration);
  }
  assert.doesNotMatch(serverSource, /\/api\/[^'"\s]*(?:password[^'"\s]*reset|reset[^'"\s]*password)/i);
});

test("real CORS responses reflect only the exact configured Origin with credentials", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const allowed = await fetch(`${server.origin}/api/config`, {
    headers: { origin: server.origin }
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("access-control-allow-origin"), server.origin);
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");

  for (const origin of [
    "null",
    `${server.origin}/`,
    `${server.origin}.evil.example`,
    `https://prefix-${new URL(server.origin).host}`,
    `${server.origin}, https://evil.example`
  ]) {
    const response = await fetch(`${server.origin}/api/config`, { headers: { origin } });
    assert.equal(response.status, 200, origin);
    assert.equal(response.headers.get("access-control-allow-origin"), null, origin);
    assert.equal(response.headers.get("access-control-allow-credentials"), null, origin);
  }

  const preflight = await fetch(`${server.origin}/api/config`, {
    method: "OPTIONS",
    headers: {
      origin: server.origin,
      "access-control-request-method": "GET"
    }
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), server.origin);
  assert.equal(preflight.headers.get("access-control-allow-credentials"), "true");
});

test("real global Origin gate covers unknown unsafe routes while safe methods remain unaffected", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const origin of [
    undefined,
    "null",
    `${server.origin}/`,
    `${server.origin}.evil.example`,
    `https://prefix-${new URL(server.origin).host}`,
    `${server.origin}, https://evil.example`
  ]) {
    const headers = { "content-type": "application/json" };
    if (origin !== undefined) headers.origin = origin;
    const response = await fetch(`${server.origin}/api/not-classified`, {
      method: "POST",
      headers,
      body: "{}"
    });
    assert.equal(response.status, 403, String(origin));
  }

  const allowedUnknown = await fetch(`${server.origin}/api/not-classified`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: "{}"
  });
  assert.equal(allowedUnknown.status, 404);

  for (const method of ["GET", "HEAD"]) {
    const response = await fetch(`${server.origin}/api/config`, {
      method,
      headers: { origin: "https://evil.example" }
    });
    assert.equal(response.status, 200, method);
  }
});

test("real member and admin mutations require their own session-bound CSRF token", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  async function adminLogin() {
    const response = await fetch(`${server.origin}/api/admin/login`, {
      method: "POST",
      headers: exactOriginHeaders(server, { "content-type": "application/json" }),
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct-horse-battery-staple"
      })
    });
    assert.equal(response.status, 200);
    return {
      body: await response.json(),
      cookie: responseCookie(response, "aix_admin_session")
    };
  }

  const firstAdmin = await adminLogin();
  const secondAdmin = await adminLogin();
  const courseBody = JSON.stringify({ name: "CSRF Fixture", description: "Boundary", price: 990 });

  const safeAdminSession = await fetch(`${server.origin}/api/admin/session`, {
    headers: { cookie: firstAdmin.cookie, "x-csrf-token": "wrong" }
  });
  assert.equal(safeAdminSession.status, 200);

  const adminAttempts = [
    { headers: { cookie: firstAdmin.cookie, "content-type": "application/json", "x-csrf-token": firstAdmin.body.csrfToken } },
    { headers: exactOriginHeaders(server, { cookie: firstAdmin.cookie, "content-type": "application/json" }) },
    { headers: exactOriginHeaders(server, { cookie: firstAdmin.cookie, "content-type": "application/json", "x-csrf-token": "wrong" }) },
    { headers: exactOriginHeaders(server, { cookie: firstAdmin.cookie, "content-type": "application/json", "x-csrf-token": secondAdmin.body.csrfToken }) }
  ];
  for (const options of adminAttempts) {
    const response = await fetch(`${server.origin}/api/courses`, {
      method: "POST",
      body: courseBody,
      ...options
    });
    assert.equal(response.status, 403);
  }

  const adminMutation = await fetch(`${server.origin}/api/courses`, {
    method: "POST",
    headers: exactOriginHeaders(server, {
      cookie: firstAdmin.cookie,
      "content-type": "application/json",
      "x-csrf-token": firstAdmin.body.csrfToken
    }),
    body: courseBody
  });
  assert.equal(adminMutation.status, 200);

  const registration = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: JSON.stringify({
      firstName: "CSRF",
      lastName: "Member",
      email: "csrf-member@example.com",
      phone: "0812345678",
      password: "correct-password",
      passwordConfirm: "correct-password",
      consentAccepted: true
    })
  });
  assert.equal(registration.status, 200);
  const firstMemberBody = await registration.json();
  const firstMemberCookie = responseCookie(registration, "aix_member_session");

  const secondMemberLogin = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: JSON.stringify({ email: "csrf-member@example.com", password: "correct-password" })
  });
  assert.equal(secondMemberLogin.status, 200);
  const secondMemberBody = await secondMemberLogin.json();

  const safeMemberSession = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: firstMemberCookie, "x-csrf-token": "wrong" }
  });
  assert.equal(safeMemberSession.status, 200);

  const crossSessionLogout = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: exactOriginHeaders(server, {
      cookie: firstMemberCookie,
      "x-csrf-token": secondMemberBody.csrfToken
    })
  });
  assert.equal(crossSessionLogout.status, 403);

  const memberLogout = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: exactOriginHeaders(server, {
      cookie: firstMemberCookie,
      "x-csrf-token": firstMemberBody.csrfToken
    })
  });
  assert.equal(memberLogout.status, 200);
});

test("real admin login stops the sixth request from one IP with standard headers", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (let index = 0; index < 5; index += 1) {
    const response = await fetch(`${server.origin}/api/admin/login`, {
      method: "POST",
      headers: exactOriginHeaders(server, { "content-type": "application/json" }),
      body: JSON.stringify({ email: "owner@example.com", password: `wrong-${index}` })
    });
    assert.equal(response.status, 401);
  }
  const blocked = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: JSON.stringify({ email: "owner@example.com", password: "wrong-six" })
  });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
  assertNoLimiterValidationWarnings(server);
});

test("real member login stops the sixth canonical email attempt before its IP budget", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const variants = [
    " MEMBER@example.com ",
    "member@EXAMPLE.com",
    "member@example.com",
    "Member@Example.Com",
    " member@example.com",
    "member@example.com"
  ];

  for (let index = 0; index < variants.length; index += 1) {
    const response = await fetch(`${server.origin}/api/members/login`, {
      method: "POST",
      headers: exactOriginHeaders(server, { "content-type": "application/json" }),
      body: JSON.stringify({ email: variants[index], password: "wrong-password" })
    });
    assert.equal(response.status, index < 5 ? 401 : 429, variants[index]);
    if (index === 5) assertRateLimitHeaders(response);
  }
  assertNoLimiterValidationWarnings(server);
});

test("real member login stops the eleventh distinct email from one IP", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (let index = 0; index < 11; index += 1) {
    const response = await fetch(`${server.origin}/api/members/login`, {
      method: "POST",
      headers: exactOriginHeaders(server, { "content-type": "application/json" }),
      body: JSON.stringify({ email: `unknown-${index}@example.com`, password: "wrong-password" })
    });
    assert.equal(response.status, index < 10 ? 401 : 429, String(index));
    if (index === 10) assertRateLimitHeaders(response);
  }
  assertNoLimiterValidationWarnings(server);
});

test("real public OTP send and verify share one canonical-phone budget", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const send = await fetch(`${server.origin}/api/members/otp/send`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: JSON.stringify({ phone: "081-234-5678", email: "otp@example.com" })
  });
  assert.equal(send.status, 200);

  for (const phone of ["081 234 5678", "(081)2345678", "0812345678", " 0812345678 "]) {
    const response = await fetch(`${server.origin}/api/members/otp/verify`, {
      method: "POST",
      headers: exactOriginHeaders(server, { "content-type": "application/json" }),
      body: JSON.stringify({ phone, code: "000000" })
    });
    assert.equal(response.status, 400, phone);
  }

  const blocked = await fetch(`${server.origin}/api/members/otp/verify`, {
    method: "POST",
    headers: exactOriginHeaders(server, { "content-type": "application/json" }),
    body: JSON.stringify({ phone: "0812345678", code: "000000" })
  });
  assert.equal(blocked.status, 429);
  assertRateLimitHeaders(blocked);
  assertNoLimiterValidationWarnings(server);
});

test("real Stripe webhook accepts a valid raw signed event without an Origin", async (t) => {
  const webhookSecret = "whsec_local_task3_only";
  const server = await startTestServer({
    STRIPE_SECRET_KEY: "sk_test_local_task3_only",
    STRIPE_WEBHOOK_SECRET: webhookSecret
  });
  t.after(() => server.stop());

  const payload = JSON.stringify({
    id: "evt_task3_local",
    object: "event",
    type: "task3.inert",
    data: { object: {} }
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const response = await fetch(`${server.origin}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`
    },
    body: payload
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true });
});
