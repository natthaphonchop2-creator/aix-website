# AiX Phase 0B Auth and Session Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser bearer-token authentication with separate secure member/admin cookie sessions, enforce production configuration, CSRF/origin checks and rate limits, and close passwordless, legacy-token, and suspended-account paths.

**Architecture:** Focused CommonJS modules own production configuration validation, signed session cookies, and HTTP security decisions. Existing database/member logic remains in `server.js`, but all session issuance and verification flows through the new module. One small browser client keeps CSRF only in memory and is reused by public, member, payment, course, live, tools, and admin pages.

**Tech Stack:** Node.js 22, Express 5, `cors` 2.8, `express-rate-limit` 8.6.0, Web Fetch API, Node test runner, existing SQLite/Postgres adapter.

## Global Constraints

- Complete Phase 0A first; this plan consumes its public manifest and server harness.
- Local repository only; no production deployment, member-data mutation outside temporary test databases, credential rotation, or external OAuth/SMS/Stripe mutation.
- Member cookie name: `aix_member_session`; `HttpOnly`; `SameSite=Lax`; `Path=/`; no `Domain`; `Secure` in production.
- Admin cookie name: `aix_admin_session`; `HttpOnly`; `SameSite=Strict`; `Path=/`; no `Domain`; `Secure` in production; eight-hour lifetime.
- Reject authentication through `Authorization: Bearer`, retired `aix_session`, and client token fields.
- Required production values: `AUTH_SECRET`, `CSRF_SECRET`, `SMS_OTP_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `APP_ORIGINS`.
- Signing secrets must contain at least 32 bytes, must differ, and must not equal defaults; admin password must contain at least 14 characters and must not equal defaults.
- Member login limits: 10/IP/15 minutes and 5/normalized identity/15 minutes. Admin login: 5/IP/15 minutes. OTP request: 5/phone/10 minutes and 20/IP/hour. Password-reset limit is not implemented because Phase 0 does not add a reset route.
- All authenticated `POST`, `PUT`, `PATCH`, and `DELETE` requests require exact approved Origin plus a session-bound `X-CSRF-Token`; Stripe webhook remains exempt.
- Keep current membership price, payment policy, Google provider verification, and database schema.
- Before every task commit, update the current Phase 0 entry in `docs/development/UPDATE_LOG.MD` with exact files, commands, results, compatibility counts, and unresolved risks; stage that log with the task files.

---

## File structure

- Create `security/config-security.cjs`: origin parsing and fail-closed production configuration checks.
- Create `security/session-security.cjs`: signed member/admin cookies, retired-cookie expiry, CSRF derivation, constant-time verification.
- Create `security/http-security.cjs`: unsafe-method Origin/CSRF middleware and configured rate-limiters.
- Create `security/account-policy.cjs`: login-status invariant shared by password and Google flows.
- Create `aix-api-client.js`: browser cookie/CSRF client and retired-auth-storage cleanup.
- Create `tests/config-security.test.mjs`, `tests/session-security.test.mjs`, `tests/http-security.test.mjs`, `tests/auth-integration.test.mjs`, and `tests/client-auth-contract.test.mjs`.
- Modify `server.js`: use all security modules, remove bearer support and passwordless branch, preserve suspended status, add admin session endpoint, protect logout, disable legacy auth.
- Modify `.env.example`: list the new non-secret configuration contract and generation commands.
- Modify `package.json` and `package-lock.json`: add exact `express-rate-limit` 8.6.0.
- Modify `security/publication-manifest.cjs`: publish `aix-api-client.js`.
- Modify `index.html`, all member HTML files, and `admin.html`: load the shared client before page code.
- Modify `script.js`, `dashboard.js`, `tools-box.js`, `live-class.js`, `payment.js`, `payment-success.js`, `course-start.js`, `course-content.js`, `course-learn.js`, and `admin.js`: remove bearer/local-auth state and adopt the shared client.
- Modify `docs/development/UPDATE_LOG.MD`: exact execution evidence and compatibility count.

### Task 1: Fail-closed security configuration

**Files:**
- Create: `security/config-security.cjs`
- Create: `tests/config-security.test.mjs`
- Modify: `.env.example`
- Modify: `server.js:315-373`

**Interfaces:**
- Produces: `parseAllowedOrigins(value) -> Set<string>` and `validateSecurityConfig(env) -> { allowedOrigins: Set<string> }`.
- Throws before database or upload initialization when production configuration is unsafe.

- [ ] **Step 1: Write failing configuration tests**

```js
// tests/config-security.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseAllowedOrigins, validateSecurityConfig } = require("../security/config-security.cjs");

const strong = {
  NODE_ENV: "production",
  AUTH_SECRET: "a".repeat(32),
  CSRF_SECRET: "b".repeat(32),
  SMS_OTP_SECRET: "c".repeat(32),
  ADMIN_EMAIL: "owner@example.com",
  ADMIN_PASSWORD: "correct-horse-battery-staple",
  APP_ORIGINS: "https://www.aixclub.co"
};

test("normalizes exact allowed origins", () => {
  assert.deepEqual([...parseAllowedOrigins("https://www.aixclub.co, https://aixclub.co/")], [
    "https://www.aixclub.co", "https://aixclub.co"
  ]);
});

test("accepts strong distinct production configuration", () => {
  assert.deepEqual([...validateSecurityConfig(strong).allowedOrigins], ["https://www.aixclub.co"]);
});

for (const [name, change] of [
  ["missing auth secret", { AUTH_SECRET: "" }],
  ["short csrf secret", { CSRF_SECRET: "short" }],
  ["reused secrets", { CSRF_SECRET: "a".repeat(32) }],
  ["default admin password", { ADMIN_PASSWORD: "admin1234" }],
  ["short admin password", { ADMIN_PASSWORD: "short" }],
  ["missing origins", { APP_ORIGINS: "" }],
  ["insecure production origin", { APP_ORIGINS: "http://example.com" }]
]) {
  test(`rejects ${name}`, () => {
    assert.throws(() => validateSecurityConfig({ ...strong, ...change }), /security configuration/i);
  });
}
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/config-security.test.mjs`

Expected: FAIL because `security/config-security.cjs` does not exist.

- [ ] **Step 3: Implement exact validation**

```js
// security/config-security.cjs
const DEFAULT_VALUES = new Set(["admin1234", "change-me", "changeme", "secret", "password"]);

function parseAllowedOrigins(value) {
  const origins = new Set();
  for (const item of String(value || "").split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const url = new URL(trimmed);
    origins.add(url.origin);
  }
  return origins;
}

function fail(message) {
  throw new Error(`Invalid production security configuration: ${message}`);
}

function validateSecurityConfig(env) {
  const allowedOrigins = parseAllowedOrigins(env.APP_ORIGINS);
  if (env.NODE_ENV !== "production") return { allowedOrigins };

  const secrets = ["AUTH_SECRET", "CSRF_SECRET", "SMS_OTP_SECRET"].map((name) => {
    const value = String(env[name] || "");
    if (Buffer.byteLength(value, "utf8") < 32 || DEFAULT_VALUES.has(value.toLowerCase())) fail(`${name} is missing or weak`);
    return value;
  });
  if (new Set(secrets).size !== secrets.length) fail("signing secrets must differ");

  const email = String(env.ADMIN_EMAIL || "").trim();
  const password = String(env.ADMIN_PASSWORD || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("ADMIN_EMAIL is invalid");
  if (password.length < 14 || DEFAULT_VALUES.has(password.toLowerCase())) fail("ADMIN_PASSWORD is missing or weak");
  if (!allowedOrigins.size || [...allowedOrigins].some((origin) => !origin.startsWith("https://"))) fail("APP_ORIGINS must contain HTTPS origins");
  return { allowedOrigins };
}

module.exports = { parseAllowedOrigins, validateSecurityConfig };
```

- [ ] **Step 4: Wire validation before filesystem/database initialization**

```js
// server.js, immediately after loadLocalEnv()
const { validateSecurityConfig } = require("./security/config-security.cjs");
const SECURITY_CONFIG = validateSecurityConfig(process.env);
```

Delete production random fallbacks for `AUTH_SECRET` and `SMS_OTP_SECRET`. Development/test may retain deterministic local fallbacks, but the production branch must use only validated environment values. Add `CSRF_SECRET` and derive development/test fallback independently from `AUTH_SECRET` and `SMS_OTP_SECRET`.

```dotenv
# .env.example security contract
# Generate each signing value independently: openssl rand -hex 32
AUTH_SECRET=
CSRF_SECRET=
SMS_OTP_SECRET=
APP_ORIGINS=https://www.aixclub.co
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

- [ ] **Step 5: Run unit and production-startup checks**

Run: `node --test tests/config-security.test.mjs`

Run: `env AIX_SKIP_LOCAL_ENV=1 NODE_ENV=production PORT=0 AUTH_SECRET=short CSRF_SECRET=short SMS_OTP_SECRET=short ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD=admin1234 APP_ORIGINS=https://www.aixclub.co node server.js`

Expected: tests pass; production start exits non-zero before listening with `Invalid production security configuration`.

- [ ] **Step 6: Commit**

```bash
git add security/config-security.cjs tests/config-security.test.mjs server.js .env.example docs/development/UPDATE_LOG.MD
git commit -m "security: fail closed on weak production config"
```

### Task 2: Signed cookie sessions and account-status policy

**Files:**
- Create: `security/session-security.cjs`
- Create: `security/account-policy.cjs`
- Create: `tests/session-security.test.mjs`
- Modify: `server.js:1130-1238`
- Modify: `server.js:2050-2160`
- Modify: `server.js:2335-2440`
- Modify: `server.js:2786-2824`
- Modify: `server.js:4007-4021`

**Interfaces:**
- Produces: `createSessionSecurity(options)` with `issueMember`, `issueAdmin`, `readMember`, `readAdmin`, `clearMember`, `clearAdmin`, `validCsrf`, and `expireRetiredMemberCookie`.
- Produces: `assertLoginAllowed(member)`; throws status `401` unless `member.status === 'active'`.
- Server middleware sets `req.authSession` and `req.member` for later CSRF checks.

- [ ] **Step 1: Write failing session and account-policy tests**

```js
// tests/session-security.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createSessionSecurity } = require("../security/session-security.cjs");
const { assertLoginAllowed } = require("../security/account-policy.cjs");

function responseRecorder() {
  const headers = new Map();
  return {
    append(name, value) { headers.set(name.toLowerCase(), [...(headers.get(name.toLowerCase()) || []), value]); },
    values(name) { return headers.get(name.toLowerCase()) || []; }
  };
}

const sessions = createSessionSecurity({
  authSecret: "a".repeat(32), csrfSecret: "b".repeat(32), secure: true,
  memberTtlMs: 60_000, adminTtlMs: 30_000
});

test("member session is HttpOnly secure Lax and contains no bearer response token", () => {
  const res = responseRecorder();
  const body = sessions.issueMember(res, { id: "member_1", email: "m@example.com" });
  assert.equal("token" in body, false);
  const cookie = res.values("set-cookie")[0];
  assert.match(cookie, /^aix_member_session=/);
  for (const flag of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"]) assert.match(cookie, new RegExp(flag));
  assert.ok(body.csrfToken);
});

test("admin and member tokens are not interchangeable", () => {
  const memberRes = responseRecorder();
  const adminRes = responseRecorder();
  sessions.issueMember(memberRes, { id: "member_1", email: "m@example.com" });
  sessions.issueAdmin(adminRes, "owner@example.com");
  const memberCookie = memberRes.values("set-cookie")[0].split(";")[0];
  const adminCookie = adminRes.values("set-cookie")[0].split(";")[0];
  assert.equal(sessions.readAdmin({ headers: { cookie: memberCookie } }), null);
  assert.equal(sessions.readMember({ headers: { cookie: adminCookie } }), null);
});

test("csrf token is bound to the signed session nonce", () => {
  const res = responseRecorder();
  const body = sessions.issueMember(res, { id: "member_1", email: "m@example.com" });
  const cookie = res.values("set-cookie")[0].split(";")[0];
  const payload = sessions.readMember({ headers: { cookie } });
  assert.equal(sessions.validCsrf(payload, body.csrfToken), true);
  assert.equal(sessions.validCsrf(payload, "wrong"), false);
});

test("suspended accounts cannot receive a session", () => {
  assert.throws(() => assertLoginAllowed({ id: "m", status: "suspended" }), /ไม่สามารถใช้งาน/);
  assert.doesNotThrow(() => assertLoginAllowed({ id: "m", status: "active" }));
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `node --test tests/session-security.test.mjs`

Expected: FAIL because both security modules are missing.

- [ ] **Step 3: Implement session security**

```js
// security/session-security.cjs
const crypto = require("node:crypto");

const MEMBER_COOKIE = "aix_member_session";
const ADMIN_COOKIE = "aix_admin_session";

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cookies(req) {
  return Object.fromEntries(String(req.headers?.cookie || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([name]) => name));
}

function createSessionSecurity({ authSecret, csrfSecret, secure, memberTtlMs, adminTtlMs }) {
  function sign(data, ttlMs) {
    const payload = Buffer.from(JSON.stringify({ ...data, iat: Date.now(), exp: Date.now() + ttlMs })).toString("base64url");
    return `${payload}.${crypto.createHmac("sha256", authSecret).update(payload).digest("base64url")}`;
  }
  function verify(token, kind) {
    try {
      const [payload, signature] = String(token || "").split(".");
      const expected = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
      if (!payload || !signature || !safeEqual(signature, expected)) return null;
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      return data.kind === kind && data.exp >= Date.now() ? data : null;
    } catch { return null; }
  }
  function csrf(data) {
    return crypto.createHmac("sha256", csrfSecret).update(`${data.kind}:${data.sub}:${data.nonce}`).digest("base64url");
  }
  function appendCookie(res, name, value, maxAge, sameSite) {
    const flags = [`${name}=${encodeURIComponent(value)}`, `Max-Age=${Math.floor(maxAge / 1000)}`, "Path=/", "HttpOnly", `SameSite=${sameSite}`];
    if (secure) flags.push("Secure");
    res.append("Set-Cookie", flags.join("; "));
  }
  function clear(res, name, sameSite) {
    const flags = [`${name}=`, "Max-Age=0", "Path=/", "HttpOnly", `SameSite=${sameSite}`];
    if (secure) flags.push("Secure");
    res.append("Set-Cookie", flags.join("; "));
  }
  function issue(res, kind, sub, email, ttlMs, sameSite) {
    const data = { kind, sub, email, nonce: crypto.randomBytes(18).toString("base64url") };
    appendCookie(res, kind === "member" ? MEMBER_COOKIE : ADMIN_COOKIE, sign(data, ttlMs), ttlMs, sameSite);
    return { expiresIn: Math.floor(ttlMs / 1000), csrfToken: csrf(data) };
  }
  return {
    issueMember(res, member) { return { ...issue(res, "member", member.id, member.email, memberTtlMs, "Lax"), member }; },
    issueAdmin(res, email) { return { success: true, ...issue(res, "admin", email, email, adminTtlMs, "Strict") }; },
    readMember(req) { return verify(cookies(req)[MEMBER_COOKIE], "member"); },
    readAdmin(req) { return verify(cookies(req)[ADMIN_COOKIE], "admin"); },
    validCsrf(data, token) { return Boolean(data && safeEqual(csrf(data), token)); },
    csrfTokenFor(data) { return data ? csrf(data) : ""; },
    clearMember(res) { clear(res, MEMBER_COOKIE, "Lax"); },
    clearAdmin(res) { clear(res, ADMIN_COOKIE, "Strict"); },
    expireRetiredMemberCookie(res) { clear(res, "aix_session", "Lax"); }
  };
}

module.exports = { MEMBER_COOKIE, ADMIN_COOKIE, createSessionSecurity };
```

```js
// security/account-policy.cjs
function assertLoginAllowed(member) {
  if (!member || member.status !== "active") {
    const error = new Error("บัญชีนี้ไม่สามารถใช้งานได้");
    error.status = 401;
    throw error;
  }
  return member;
}
module.exports = { assertLoginAllowed };
```

- [ ] **Step 4: Replace server bearer/session flows**

Instantiate one `SESSION_SECURITY` from validated secrets and TTL values. Delete `createSignedToken`, `verifySignedToken`, `createAuthToken`, `verifyAuthToken`, `createAdminToken`, `getBearerToken`, `getRequestToken`, `setSessionCookie`, `clearSessionCookie`, the old `aix_session` issue/read path, and response `token` fields.

```js
const { createSessionSecurity } = require("./security/session-security.cjs");
const { assertLoginAllowed } = require("./security/account-policy.cjs");

const SESSION_SECURITY = createSessionSecurity({
  authSecret: AUTH_SECRET,
  csrfSecret: CSRF_SECRET,
  secure: IS_PRODUCTION,
  memberTtlMs: AUTH_SESSION_TTL_MS,
  adminTtlMs: ADMIN_SESSION_TTL_MS
});

function rejectLegacyClientToken(req, res, next) {
  if (/^\s*Bearer\s+/i.test(req.get("authorization") || "")) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบใหม่" });
  }
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "token")) {
    return res.status(400).json({ error: "ไม่รับ token จาก browser" });
  }
  next();
}

function requireMemberSession(req, res, next) {
  const data = SESSION_SECURITY.readMember(req);
  if (!data) return res.status(401).json({ error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(data.sub);
  try { assertLoginAllowed(member); } catch (error) { return res.status(error.status).json({ error: error.message }); }
  req.authSession = data;
  req.member = member;
  next();
}

function requireAdminSession(req, res, next) {
  const data = SESSION_SECURITY.readAdmin(req);
  if (!data || data.email !== ADMIN_EMAIL) return res.status(401).json({ error: "Admin session หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  req.authSession = data;
  next();
}

function hasValidMemberSession(req) {
  const data = SESSION_SECURITY.readMember(req);
  if (!data) return false;
  const member = db.prepare("SELECT id, status FROM members WHERE id = ?").get(data.sub);
  return Boolean(member && member.status === "active");
}

function issueMemberSession(res, member) {
  assertLoginAllowed(member);
  SESSION_SECURITY.expireRetiredMemberCookie(res);
  const issued = SESSION_SECURITY.issueMember(res, publicMember(member));
  return { ...issued, member: publicMember(member) };
}
```

Specific route changes:

```js
// No passwordless email+phone branch.
app.post("/api/members/login", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  if (!EMAIL_RE.test(email) || !password) return res.status(400).json({ error: "กรุณากรอกอีเมลและรหัสผ่าน" });
  const member = db.prepare("SELECT * FROM members WHERE email = ?").get(email);
  if (!member || !verifyPassword(password, member.passwordHash)) return res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  try { assertLoginAllowed(member); } catch (error) { return res.status(error.status).json({ error: error.message }); }
  const now = new Date().toISOString();
  db.prepare("UPDATE members SET lastLoginAt = ?, updatedAt = ? WHERE id = ?").run(now, now, member.id);
  res.json(issueMemberSession(res, db.prepare("SELECT * FROM members WHERE id = ?").get(member.id)));
});

app.get("/api/auth/me", requireMemberSession, (req, res) => {
  SESSION_SECURITY.expireRetiredMemberCookie(res);
  res.json({ member: publicMember(req.member), csrfToken: SESSION_SECURITY.csrfTokenFor(req.authSession) });
});

app.post("/api/auth/logout", requireMemberSession, (req, res) => {
  SESSION_SECURITY.clearMember(res);
  SESSION_SECURITY.expireRetiredMemberCookie(res);
  res.json({ ok: true });
});
```

```js
// Legacy routes
app.post("/api/auth/signup", (req, res) => res.status(410).json({ error: "เส้นทางนี้ยกเลิกแล้ว กรุณาใช้ระบบสมาชิก AiX" }));
app.post("/api/auth/login", (req, res) => res.status(410).json({ error: "เส้นทางนี้ยกเลิกแล้ว กรุณาใช้ระบบสมาชิก AiX" }));

// Admin cookie routes
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Email หรือ Password ไม่ถูกต้อง" });
  res.json(SESSION_SECURITY.issueAdmin(res, ADMIN_EMAIL));
});
app.get("/api/admin/session", requireAdminSession, (req, res) => {
  res.json({ success: true, csrfToken: SESSION_SECURITY.csrfTokenFor(req.authSession) });
});
app.post("/api/admin/logout", requireAdminSession, (req, res) => {
  SESSION_SECURITY.clearAdmin(res);
  res.json({ ok: true });
});
```

In `upsertGoogleMember`, remove `status = 'active'` from the update SQL. After every Google upsert and before `issueMemberSession`, call `assertLoginAllowed(result.member)`. Add a startup read-only count:

```js
const inaccessiblePasswordCount = db.prepare(`
  SELECT COUNT(*) AS count FROM members
  WHERE COALESCE(passwordHash, '') = '' AND COALESCE(googleSub, '') = ''
`).get().count;
if (inaccessiblePasswordCount > 0) console.warn(`[SECURITY] ${inaccessiblePasswordCount} member account(s) require a reviewed password-setup migration.`);
```

- [ ] **Step 5: Run the completed unit tests**

Run: `node --test tests/session-security.test.mjs`

Expected: all session/account tests pass.

- [ ] **Step 6: Commit**

```bash
git add security/session-security.cjs security/account-policy.cjs tests/session-security.test.mjs server.js docs/development/UPDATE_LOG.MD
git commit -m "security: move auth to isolated cookies"
```

### Task 3: Origin, CSRF, CORS, and rate limits

**Files:**
- Create: `security/http-security.cjs`
- Create: `tests/http-security.test.mjs`
- Modify: `server.js:401-455` and protected middleware.
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `allowedOrigins`, `SESSION_SECURITY`, `req.authSession`.
- Produces: `createHttpSecurity(options)` with `corsOptions`, `requireMutationOrigin`, `requireSessionCsrf`, and named auth limiters.

- [ ] **Step 1: Install the exact limiter version**

Run: `npm install express-rate-limit@8.6.0`

Expected: `package.json` records `^8.6.0`, lockfile updates, and install exits 0 without `--force`.

- [ ] **Step 2: Write failing HTTP-security tests**

```js
// tests/http-security.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createHttpSecurity } = require("../security/http-security.cjs");

function responseRecorder() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

const http = createHttpSecurity({
  allowedOrigins: new Set(["https://www.aixclub.co"]),
  validCsrf: (session, token) => session?.nonce === "n" && token === "valid"
});

test("rejects unsafe request without exact approved Origin", () => {
  for (const origin of [undefined, "https://evil.example", "https://www.aixclub.co.evil.example"]) {
    const req = { method: "POST", get: (name) => name.toLowerCase() === "origin" ? origin : "" };
    const res = responseRecorder();
    http.requireMutationOrigin(req, res, () => assert.fail("must not continue"));
    assert.equal(res.statusCode, 403);
  }
});

test("accepts safe methods and exact approved Origin", () => {
  let calls = 0;
  http.requireMutationOrigin({ method: "GET", get: () => "" }, responseRecorder(), () => { calls += 1; });
  http.requireMutationOrigin({ method: "POST", get: () => "https://www.aixclub.co" }, responseRecorder(), () => { calls += 1; });
  assert.equal(calls, 2);
});

test("requires a session-bound csrf header for unsafe authenticated requests", () => {
  const req = { method: "POST", authSession: { nonce: "n" }, get: (name) => name.toLowerCase() === "x-csrf-token" ? "valid" : "" };
  let called = false;
  http.requireSessionCsrf(req, responseRecorder(), () => { called = true; });
  assert.equal(called, true);
  req.get = () => "wrong";
  const res = responseRecorder();
  http.requireSessionCsrf(req, res, () => assert.fail("must not continue"));
  assert.equal(res.statusCode, 403);
});
```

- [ ] **Step 3: Implement HTTP security and limiters**

```js
// security/http-security.cjs
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function createHttpSecurity({ allowedOrigins, validCsrf }) {
  const exactOrigin = (req) => allowedOrigins.has(String(req.get("origin") || ""));
  function requireMutationOrigin(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!exactOrigin(req)) return res.status(403).json({ error: "Origin ไม่ได้รับอนุญาต" });
    next();
  }
  function requireSessionCsrf(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (!validCsrf(req.authSession, req.get("x-csrf-token"))) return res.status(403).json({ error: "CSRF token ไม่ถูกต้อง" });
    next();
  }
  const common = { standardHeaders: "draft-8", legacyHeaders: false, message: { error: "ลองใหม่ภายหลัง" } };
  return {
    corsOptions: {
      credentials: true,
      origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin)); }
    },
    requireMutationOrigin,
    requireSessionCsrf,
    memberLoginIp: rateLimit({ ...common, windowMs: 15 * 60_000, limit: 10 }),
    memberLoginIdentity: rateLimit({ ...common, windowMs: 15 * 60_000, limit: 5, keyGenerator: (req) => `member:${String(req.body?.email || "").trim().toLowerCase() || ipKeyGenerator(req.ip)}` }),
    adminLoginIp: rateLimit({ ...common, windowMs: 15 * 60_000, limit: 5 }),
    otpPhone: rateLimit({ ...common, windowMs: 10 * 60_000, limit: 5, keyGenerator: (req) => `otp:${String(req.body?.phone || "").replace(/\D/g, "") || ipKeyGenerator(req.ip)}` }),
    otpIp: rateLimit({ ...common, windowMs: 60 * 60_000, limit: 20 })
  };
}

module.exports = { createHttpSecurity };
```

- [ ] **Step 4: Integrate middleware in the safe order**

```js
const HTTP_SECURITY = createHttpSecurity({
  allowedOrigins: SECURITY_CONFIG.allowedOrigins.size
    ? SECURITY_CONFIG.allowedOrigins
    : new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]),
  validCsrf: (session, token) => SESSION_SECURITY.validCsrf(session, token)
});

if (IS_PRODUCTION) app.set("trust proxy", 1);
app.use(cors(HTTP_SECURITY.corsOptions));
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.use(express.json({ limit: "1mb" }));
app.use(rejectLegacyClientToken);
app.use(HTTP_SECURITY.requireMutationOrigin);
```

At the end of both `requireMemberSession` and `requireAdminSession`, replace `next()` with:

```js
HTTP_SECURITY.requireSessionCsrf(req, res, next);
```

Register the limiters before the corresponding route declarations:

```js
app.use("/api/members/login", HTTP_SECURITY.memberLoginIp, HTTP_SECURITY.memberLoginIdentity);
app.use("/api/admin/login", HTTP_SECURITY.adminLoginIp);
app.use(["/api/members/otp/send", "/api/members/otp/verify"], HTTP_SECURITY.otpIp, HTTP_SECURITY.otpPhone);
```

The already-registered Stripe webhook remains before the global Origin/JSON middleware.

- [ ] **Step 5: Run tests**

Run: `node --test tests/http-security.test.mjs tests/session-security.test.mjs tests/api-route-policy.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add security/http-security.cjs tests/http-security.test.mjs server.js package.json package-lock.json docs/development/UPDATE_LOG.MD
git commit -m "security: enforce origin csrf and auth limits"
```

### Task 4: Shared cookie/CSRF browser client

**Files:**
- Create: `aix-api-client.js`
- Create: `tests/client-auth-contract.test.mjs`
- Modify: `security/publication-manifest.cjs`
- Modify: `index.html`, `dashboard.html`, `tools-box.html`, `live-class.html`, `payment.html`, `payment-success.html`, `course-start.html`, `course-content.html`, `course-learn.html`, `admin.html`.
- Modify: `script.js`, `dashboard.js`, `tools-box.js`, `live-class.js`, `payment.js`, `payment-success.js`, `course-start.js`, `course-content.js`, `course-learn.js`, `admin.js`.

**Interfaces:**
- Produces: `window.AiXApi.createClient({ sessionPath })` with `request`, `bootstrap`, `adopt`, `clear`, and `csrfToken`.
- All page clients use cookies via `credentials: 'same-origin'`; CSRF remains closure memory only.

- [ ] **Step 1: Write failing browser-source contracts**

```js
// tests/client-auth-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const scripts = [
  "script.js", "dashboard.js", "tools-box.js", "live-class.js", "payment.js", "payment-success.js",
  "course-start.js", "course-content.js", "course-learn.js", "admin.js"
];
const pages = [
  "index.html", "dashboard.html", "tools-box.html", "live-class.html", "payment.html", "payment-success.html",
  "course-start.html", "course-content.html", "course-learn.html", "admin.html"
];

test("browser scripts contain no bearer or auth-token storage", async () => {
  for (const filename of scripts) {
    const source = await readFile(filename, "utf8");
    assert.doesNotMatch(source, /Authorization\s*[:=]|Bearer\s+\$\{|aix_member_token|aixAdminToken|aixAdminAuth/, filename);
  }
});

test("each auth-aware page loads the shared client before page code", async () => {
  for (const filename of pages) {
    const html = await readFile(filename, "utf8");
    const shared = html.indexOf("/aix-api-client.js");
    const lastPageScript = html.lastIndexOf(".js");
    assert.ok(shared >= 0 && shared < lastPageScript, filename);
  }
});

test("shared client keeps csrf in memory and sends same-origin cookies", async () => {
  const source = await readFile("aix-api-client.js", "utf8");
  assert.match(source, /credentials:\s*["']same-origin["']/);
  assert.match(source, /X-CSRF-Token/);
  assert.doesNotMatch(source, /localStorage\.setItem/);
});
```

- [ ] **Step 2: Run contracts and verify failure**

Run: `node --test tests/client-auth-contract.test.mjs`

Expected: FAIL on current bearer/localStorage code and missing shared client.

- [ ] **Step 3: Implement the shared client**

```js
// aix-api-client.js
(function initAiXApi(global) {
  "use strict";
  const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const RETIRED_KEYS = ["aix_member_token", "aix_member_session", "aixAdminToken", "aixAdminAuth"];
  RETIRED_KEYS.forEach((key) => localStorage.removeItem(key));

  function createClient({ sessionPath }) {
    let csrfToken = "";
    function adopt(data) {
      if (data && typeof data.csrfToken === "string") csrfToken = data.csrfToken;
      return data;
    }
    async function raw(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const headers = new Headers(options.headers || {});
      if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (UNSAFE.has(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
      return fetch(path, { ...options, method, headers, credentials: "same-origin" });
    }
    async function request(path, options = {}) {
      const response = await raw(path, options);
      const type = response.headers.get("content-type") || "";
      const data = type.includes("application/json") ? await response.json() : await response.text();
      if (!response.ok) {
        const error = new Error(data?.error || "ไม่สามารถเชื่อมต่อระบบได้");
        error.status = response.status;
        throw error;
      }
      return adopt(data);
    }
    return {
      request,
      raw,
      adopt,
      bootstrap() { return request(sessionPath, { cache: "no-store" }); },
      clear() { csrfToken = ""; },
      get csrfToken() { return csrfToken; }
    };
  }
  global.AiXApi = Object.freeze({ createClient });
})(window);
```

Add `aix-api-client.js` to `PUBLIC_ROOT_FILES`. Add `<script src="/aix-api-client.js"></script>` immediately before the page-specific script in every listed HTML file.

- [ ] **Step 4: Convert each page to the shared client**

Use these exact initializers:

```js
// script.js and every member/payment/course/live/tools script
const memberApi = window.AiXApi.createClient({ sessionPath: "/api/auth/me" });
const apiRequest = (path, options = {}) => memberApi.request(path, options);

// admin.js
const adminApi = window.AiXApi.createClient({ sessionPath: "/api/admin/session" });
async function adminFetch(url, options = {}) {
  const response = await adminApi.raw(url, options);
  if (response.status === 401 || response.status === 403) {
    adminApi.clear();
    adminLoggedIn = false;
    showAdminLogin();
    throw new Error("Admin session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
  return response;
}
```

Apply the following file-specific replacements:

```js
// script.js
function setMember(member) { state.member = member || null; updateMemberUi(); }
async function restoreSession() {
  try { setMember((await memberApi.bootstrap()).member); }
  catch { setMember(null); }
}
// After register/password/Google success:
memberApi.adopt(result);
setMember(result.member);
// logoutMember:
await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
memberApi.clear(); setMember(null);
```

```js
// dashboard.js, payment.js, payment-success.js, tools-box.js
// Delete token(), requireToken(), TOKEN_KEY, and auth localStorage reads/writes.
// Bootstrap by calling the page's existing first protected API; a 401 redirects.
const data = await apiRequest("/api/member/dashboard");
// Keep only learning-progress, notes, theme, and other non-auth localStorage keys.
```

```js
// course-start.js, course-content.js, course-learn.js, live-class.js
// Delete token checks and Authorization headers.
// Call the existing protected endpoint through apiRequest; redirect only on error.status === 401.
```

```js
// admin.js initialization/login/logout
let adminLoggedIn = false;
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
function showAdminLayout() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("adminLayout").style.display = "flex";
}
async function restoreAdminSession() {
  try { await adminApi.bootstrap(); adminLoggedIn = true; showAdminLayout(); await initDashboard(); }
  catch { adminLoggedIn = false; showAdminLogin(); }
}
async function adminLogin() {
  const data = await adminApi.request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail.value.trim(), password: adminPassword.value })
  });
  adminApi.adopt(data); adminLoggedIn = true; showAdminLayout(); await initDashboard();
}
async function adminLogout() {
  await adminApi.request("/api/admin/logout", { method: "POST" }).catch(() => {});
  adminApi.clear(); adminLoggedIn = false; showAdminLogin();
}
window.addEventListener("DOMContentLoaded", restoreAdminSession);
```

The existing admin CRUD callers continue receiving a real `Response` from `adminFetch`; only login, session bootstrap, logout, and the removed localStorage helpers change their response handling.

- [ ] **Step 5: Run client and homepage contracts**

Run: `node --test tests/client-auth-contract.test.mjs tests/homepage-contract.test.mjs tests/publication-manifest.test.mjs`

Expected: all pass; homepage total may increase, but failures remain 0.

- [ ] **Step 6: Commit**

```bash
git add aix-api-client.js security/publication-manifest.cjs index.html dashboard.html tools-box.html live-class.html payment.html payment-success.html course-start.html course-content.html course-learn.html admin.html script.js dashboard.js tools-box.js live-class.js payment.js payment-success.js course-start.js course-content.js course-learn.js admin.js tests/client-auth-contract.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "security: remove browser bearer sessions"
```

### Task 5: Real auth integration and abuse tests

**Files:**
- Create: `tests/auth-integration.test.mjs`
- Modify: `tests/api-route-policy.test.mjs` to add `/api/admin/session` and `/api/admin/logout` as admin routes.
- Modify: `server.js` only for defects revealed by the tests.
- Modify: `docs/development/UPDATE_LOG.MD`.

**Interfaces:**
- Consumes: `startTestServer`, member/admin cookie endpoints, exact Origin and CSRF headers.
- Produces: real HTTP proof for session flags, no-password denial, retired-token denial, CSRF, suspended status, rate limits, and legacy `410`.

- [ ] **Step 1: Write end-to-end auth tests**

```js
// tests/auth-integration.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/server-harness.mjs";

function cookieFrom(response, name) {
  return response.headers.getSetCookie().find((value) => value.startsWith(`${name}=`))?.split(";")[0] || "";
}

test("member login requires password and returns cookie plus csrf without token", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const origin = server.origin;
  const registration = await fetch(`${origin}/api/members/register`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ firstName: "Test", email: "test@example.com", phone: "0812345678", password: "member-pass-123", passwordConfirm: "member-pass-123" })
  });
  assert.equal(registration.status, 200);
  const registrationBody = await registration.json();
  assert.equal("token" in registrationBody, false);
  assert.ok(registrationBody.csrfToken);
  assert.match(registration.headers.getSetCookie().join("\n"), /aix_member_session=.*HttpOnly.*SameSite=Lax/);

  const noPassword = await fetch(`${origin}/api/members/login`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test@example.com", phone: "0812345678" })
  });
  assert.equal(noPassword.status, 400);
});

test("rejects bearer and retired cookie and enforces csrf on member mutation", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const origin = server.origin;
  assert.equal((await fetch(`${origin}/api/member/dashboard`, { headers: { Authorization: "Bearer leaked" } })).status, 401);
  assert.equal((await fetch(`${origin}/api/member/dashboard`, { headers: { Cookie: "aix_session=leaked" } })).status, 401);
  const registration = await fetch(`${origin}/api/members/register`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "CSRF Test",
      email: "csrf@example.com",
      phone: "0898765432",
      password: "member-pass-456",
      passwordConfirm: "member-pass-456"
    })
  });
  assert.equal(registration.status, 200);
  const registrationBody = await registration.json();
  const memberCookie = cookieFrom(registration, "aix_member_session");
  assert.ok(memberCookie);
  assert.ok(registrationBody.csrfToken);

  const withoutCsrf = await fetch(`${origin}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: origin, Cookie: memberCookie }
  });
  assert.equal(withoutCsrf.status, 403);

  const withCsrf = await fetch(`${origin}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: origin, Cookie: memberCookie, "X-CSRF-Token": registrationBody.csrfToken }
  });
  assert.equal(withCsrf.status, 200);
});

test("legacy auth is gone and admin limiter activates on sixth failure", async (t) => {
  const server = await startTestServer({ ADMIN_EMAIL: "owner@example.com", ADMIN_PASSWORD: "correct-horse-battery-staple" });
  t.after(() => server.stop());
  const origin = server.origin;
  assert.equal((await fetch(`${origin}/api/auth/signup`, { method: "POST", headers: { Origin: origin } })).status, 410);
  assert.equal((await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { Origin: origin } })).status, 410);
  let status = 0;
  for (let index = 0; index < 6; index += 1) {
    status = (await fetch(`${origin}/api/admin/login`, {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "wrong" })
    })).status;
  }
  assert.equal(status, 429);
});
```

- [ ] **Step 2: Run and verify failures**

Run: `node --test tests/auth-integration.test.mjs`

Expected: FAIL on any remaining cookie, CSRF, limiter, legacy, or retired-token defect.

- [ ] **Step 3: Fix only the observed auth defects and add suspended-account source contract**

Add to `tests/auth-integration.test.mjs`:

```js
import { readFile } from "node:fs/promises";
const serverSource = await readFile("server.js", "utf8");
test("Google upsert cannot reactivate a suspended account", () => {
  const functionBody = serverSource.match(/function upsertGoogleMember[\s\S]*?\n}\n/)?.[0] || "";
  assert.doesNotMatch(functionBody, /status\s*=\s*'active'/);
  assert.match(serverSource, /assertLoginAllowed\(result\.member\)/);
});
```

The source assertion complements unit coverage of `assertLoginAllowed` without faking Google network verification.

- [ ] **Step 4: Run the full auth gate**

Run:

```bash
node --test tests/config-security.test.mjs tests/session-security.test.mjs tests/http-security.test.mjs tests/client-auth-contract.test.mjs tests/auth-integration.test.mjs tests/api-route-policy.test.mjs
```

Expected: all tests pass; no test contacts Google, SMS, Stripe, Supabase, or production.

- [ ] **Step 5: Report the local compatibility count without mutation**

Run:

```bash
node -e 'const { DatabaseSync } = require("node:sqlite"); const db = new DatabaseSync("data.db", { readOnly: true }); const row = db.prepare("SELECT COUNT(*) AS count FROM members WHERE (passwordHash IS NULL OR length(passwordHash) = 0) AND (googleSub IS NULL OR length(googleSub) = 0)").get(); console.log(JSON.stringify({ inaccessiblePasswordAccounts: row.count })); db.close();'
```

Expected: one JSON object containing only the count. Do not print member identifiers, names, email addresses, phone numbers, or hashes. If the local repository is configured only for Supabase and has no readable local database, record `local count unavailable; production query not authorized` instead of connecting externally.

- [ ] **Step 6: Update log and commit**

Record the read-only inaccessible-password count from the temporary test database as `0`, list the exact commands/results, then:

```bash
git add tests/auth-integration.test.mjs tests/api-route-policy.test.mjs server.js docs/development/UPDATE_LOG.MD
git commit -m "test: verify hardened auth flows"
```

## Plan 0B completion gate

Run:

```bash
npm test
npm audit
git diff --check
```

Expected:

- All current tests pass.
- Member/admin response bodies contain no authentication bearer.
- Cookie flags, Origin, CSRF, logout, status preservation, legacy denial, and rate-limit thresholds are verified over HTTP.
- `Authorization: Bearer`, `aix_session`, and browser token fields cannot authenticate.
- `npm audit` result is recorded; remaining Multer/Wrangler findings are resolved in Plan 0C.
- No production or external state changed.
