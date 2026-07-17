import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const {
  ADMIN_SESSION_TTL_MS,
  createSessionSecurity
} = require("../security/session-security.cjs");
const { assertLoginAllowed } = require("../security/account-policy.cjs");

const AUTH_SECRET = "a".repeat(32);
const OTHER_AUTH_SECRET = "c".repeat(32);
const CSRF_SECRET = "b".repeat(32);
const MEMBER_TTL_MS = 60_000;
const FIXED_NOW = 1_800_000_000_000;
const serverSource = await readFile("server.js", "utf8");

function responseRecorder() {
  const headers = new Map();
  return {
    append(name, value) {
      const key = String(name).toLowerCase();
      headers.set(key, [...(headers.get(key) || []), value]);
    },
    values(name) {
      return headers.get(String(name).toLowerCase()) || [];
    }
  };
}

function sequentialRandom() {
  let value = 1;
  return (size) => {
    const bytes = Buffer.alloc(size, value);
    value += 1;
    return bytes;
  };
}

function sessions(overrides = {}) {
  return createSessionSecurity({
    authSecret: AUTH_SECRET,
    csrfSecret: CSRF_SECRET,
    secure: true,
    memberTtlMs: MEMBER_TTL_MS,
    adminTtlMs: ADMIN_SESSION_TTL_MS,
    now: () => FIXED_NOW,
    randomBytes: sequentialRandom(),
    ...overrides
  });
}

function cookieValue(res, name) {
  const cookie = res.values("set-cookie").find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie, `missing ${name}`);
  return decodeURIComponent(cookie.slice(name.length + 1).split(";", 1)[0]);
}

function cookiePair(res, name) {
  return `${name}=${encodeURIComponent(cookieValue(res, name))}`;
}

function requestWithCookie(cookie) {
  return { headers: { cookie } };
}

function decodeClaims(token) {
  const [payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function signClaims(claims, secret = AUTH_SECRET) {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function assertNoBearerCredential(body) {
  for (const key of ["token", "authToken", "adminToken", "sessionToken"]) {
    assert.equal(Object.prototype.hasOwnProperty.call(body, key), false, key);
  }
  assert.doesNotMatch(JSON.stringify(body), /Bearer\s/i);
}

test("member and admin cookies use isolated production attributes and exact lifetimes", () => {
  const security = sessions();
  const memberRes = responseRecorder();
  const adminRes = responseRecorder();

  const memberBody = security.issueMember(memberRes, {
    id: "member_1",
    email: "member@example.com",
    status: "active"
  });
  const adminBody = security.issueAdmin(adminRes, "owner@example.com");

  const memberCookie = memberRes.values("set-cookie")[0];
  assert.match(memberCookie, /^aix_member_session=/);
  assert.match(memberCookie, /Max-Age=60(?:;|$)/);
  for (const flag of ["Path=/", "HttpOnly", "SameSite=Lax", "Secure"]) {
    assert.match(memberCookie, new RegExp(`(?:^|; )${flag}(?:;|$)`));
  }
  assert.doesNotMatch(memberCookie, /(?:^|; )Domain=/i);

  const adminCookie = adminRes.values("set-cookie")[0];
  assert.match(adminCookie, /^aix_admin_session=/);
  assert.match(adminCookie, /Max-Age=28800(?:;|$)/);
  for (const flag of ["Path=/", "HttpOnly", "SameSite=Strict", "Secure"]) {
    assert.match(adminCookie, new RegExp(`(?:^|; )${flag}(?:;|$)`));
  }
  assert.doesNotMatch(adminCookie, /(?:^|; )Domain=/i);
  assertNoBearerCredential(memberBody);
  assertNoBearerCredential(adminBody);
  assert.equal(memberBody.expiresIn, 60);
  assert.equal(adminBody.expiresIn, 28_800);
});

test("nonproduction cookies omit Secure and every clear operation expires only host cookies", () => {
  const security = sessions({ secure: false });
  const issued = responseRecorder();
  security.issueMember(issued, { id: "member_1", email: "member@example.com", status: "active" });
  security.issueAdmin(issued, "owner@example.com");
  for (const cookie of issued.values("set-cookie")) {
    assert.doesNotMatch(cookie, /(?:^|; )Secure(?:;|$)/);
    assert.doesNotMatch(cookie, /(?:^|; )Domain=/i);
  }

  const cleared = responseRecorder();
  security.clearMember(cleared);
  security.clearAdmin(cleared);
  security.expireRetiredMemberCookie(cleared);
  const [member, admin, retired] = cleared.values("set-cookie");
  assert.match(member, /^aix_member_session=; Max-Age=0;/);
  assert.match(member, /SameSite=Lax/);
  assert.match(admin, /^aix_admin_session=; Max-Age=0;/);
  assert.match(admin, /SameSite=Strict/);
  assert.match(retired, /^aix_session=; Max-Age=0;/);
  assert.match(retired, /SameSite=Lax/);
  for (const cookie of [member, admin, retired]) {
    assert.match(cookie, /(?:^|; )Path=\/(?:;|$)/);
    assert.match(cookie, /(?:^|; )HttpOnly(?:;|$)/);
    assert.doesNotMatch(cookie, /(?:^|; )Domain=/i);
    assert.doesNotMatch(cookie, /(?:^|; )Secure(?:;|$)/);
  }
});

test("admin lifetime cannot drift from exactly eight hours", () => {
  assert.throws(
    () => sessions({ adminTtlMs: ADMIN_SESSION_TTL_MS - 1 }),
    /eight hours|8 hours|admin.*ttl/i
  );
});

test("member and admin sessions are valid only for their own cookie and kind", () => {
  const security = sessions();
  const memberRes = responseRecorder();
  const adminRes = responseRecorder();
  security.issueMember(memberRes, { id: "member_1", email: "member@example.com", status: "active" });
  security.issueAdmin(adminRes, "owner@example.com");
  const memberCookie = cookiePair(memberRes, "aix_member_session");
  const adminCookie = cookiePair(adminRes, "aix_admin_session");

  assert.equal(security.readAdmin(requestWithCookie(memberCookie)), null);
  assert.equal(security.readMember(requestWithCookie(adminCookie)), null);
  assert.equal(security.readMember(requestWithCookie(`${memberCookie}; ${adminCookie}`))?.sub, "member_1");
  assert.equal(security.readAdmin(requestWithCookie(`${memberCookie}; ${adminCookie}`))?.email, "owner@example.com");
});

test("tampered expired wrong-secret extra-segment and malformed session tokens fail closed", () => {
  let now = FIXED_NOW;
  const security = sessions({ now: () => now });
  const res = responseRecorder();
  security.issueMember(res, { id: "member_1", email: "member@example.com", status: "active" });
  const token = cookieValue(res, "aix_member_session");
  const [payload, signature] = token.split(".");
  const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;

  const malformed = [
    `${payload}.${tamperedSignature}`,
    `${token}.extra`,
    `${payload}.`,
    `.${signature}`,
    "not-a-token",
    "%",
    ""
  ];
  for (const candidate of malformed) {
    assert.doesNotThrow(() => security.readMember(requestWithCookie(`aix_member_session=${encodeURIComponent(candidate)}`)));
    assert.equal(security.readMember(requestWithCookie(`aix_member_session=${encodeURIComponent(candidate)}`)), null);
  }

  const wrongSecretReader = sessions({ authSecret: OTHER_AUTH_SECRET });
  assert.equal(wrongSecretReader.readMember(requestWithCookie(cookiePair(res, "aix_member_session"))), null);
  now = FIXED_NOW + MEMBER_TTL_MS;
  assert.equal(security.readMember(requestWithCookie(cookiePair(res, "aix_member_session"))), null);
});

test("verification rejects duplicate and malformed relevant cookies without throwing", () => {
  const security = sessions();
  const res = responseRecorder();
  security.issueMember(res, { id: "member_1", email: "member@example.com", status: "active" });
  const pair = cookiePair(res, "aix_member_session");

  for (const cookie of [
    `${pair}; ${pair}`,
    `${pair}; aix_member_session=other`,
    "aix_member_session=%ZZ",
    "aix_member_session",
    "aix_member_session=valid; aix_admin_session=%ZZ"
  ]) {
    assert.doesNotThrow(() => security.readMember(requestWithCookie(cookie)), cookie);
    assert.equal(security.readMember(requestWithCookie(cookie)), null, cookie);
  }

  assert.equal(security.readMember(requestWithCookie(`unrelated=%ZZ; ${pair}`))?.sub, "member_1");
});

test("verification requires an exact payload shape and finite internally consistent claims", () => {
  const security = sessions();
  const res = responseRecorder();
  security.issueMember(res, { id: "member_1", email: "member@example.com", status: "active" });
  const validClaims = decodeClaims(cookieValue(res, "aix_member_session"));

  assert.throws(
    () => security.issueMember(responseRecorder(), {
      id: "member_2",
      email: `${"a".repeat(501)}@example.com`,
      status: "active"
    }),
    /invalid member session/i
  );

  const invalidClaims = [
    { ...validClaims, exp: "1800000060000" },
    { ...validClaims, exp: null },
    { ...validClaims, iat: FIXED_NOW + 1 },
    { ...validClaims, exp: validClaims.iat },
    { ...validClaims, exp: validClaims.exp + 1 },
    { ...validClaims, nonce: "" },
    { ...validClaims, sub: "" },
    { ...validClaims, kind: "other" },
    { ...validClaims, unexpected: true }
  ];

  for (const claims of invalidClaims) {
    const cookie = `aix_member_session=${encodeURIComponent(signClaims(claims))}`;
    assert.equal(security.readMember(requestWithCookie(cookie)), null, JSON.stringify(claims));
  }
});

test("csrf tokens are bound to one signed session nonce, kind, subject and secret", () => {
  const security = sessions();
  const memberResOne = responseRecorder();
  const memberResTwo = responseRecorder();
  const adminRes = responseRecorder();
  const first = security.issueMember(memberResOne, { id: "member_1", email: "member@example.com", status: "active" });
  const second = security.issueMember(memberResTwo, { id: "member_1", email: "member@example.com", status: "active" });
  const admin = security.issueAdmin(adminRes, "owner@example.com");
  const firstSession = security.readMember(requestWithCookie(cookiePair(memberResOne, "aix_member_session")));
  const secondSession = security.readMember(requestWithCookie(cookiePair(memberResTwo, "aix_member_session")));
  const adminSession = security.readAdmin(requestWithCookie(cookiePair(adminRes, "aix_admin_session")));

  assert.equal(security.validCsrf(firstSession, first.csrfToken), true);
  assert.equal(security.validCsrf(secondSession, first.csrfToken), false);
  assert.equal(security.validCsrf(adminSession, first.csrfToken), false);
  assert.equal(security.validCsrf(adminSession, admin.csrfToken), true);
  assert.equal(sessions({ csrfSecret: "d".repeat(32) }).validCsrf(firstSession, first.csrfToken), false);
  for (const candidate of [null, undefined, "", "wrong", "%ZZ", {}, []]) {
    assert.doesNotThrow(() => security.validCsrf(firstSession, candidate));
    assert.equal(security.validCsrf(firstSession, candidate), false);
  }
  assert.equal(security.csrfTokenFor(firstSession), first.csrfToken);
});

test("account policy accepts only an explicitly active member and rejects every other state with 401", () => {
  const active = { id: "member_1", status: "active" };
  assert.equal(assertLoginAllowed(active), active);

  for (const member of [
    null,
    undefined,
    {},
    { id: "member_1", status: "" },
    { id: "member_1", status: "pending" },
    { id: "member_1", status: "inactive" },
    { id: "member_1", status: "suspended" },
    { id: "member_1", status: "cancelled" },
    { id: "member_1", status: "Active" }
  ]) {
    assert.throws(
      () => assertLoginAllowed(member),
      (error) => error?.status === 401 && /ไม่สามารถใช้งาน/.test(error.message),
      JSON.stringify(member)
    );
  }
});

test("server removes legacy token helpers and wires cookie-only middleware after Stripe raw parsing", () => {
  for (const retired of [
    "createSignedToken",
    "verifySignedToken",
    "createAuthToken",
    "verifyAuthToken",
    "createAdminToken",
    "getBearerToken",
    "getRequestToken",
    "setSessionCookie",
    "clearSessionCookie"
  ]) {
    assert.doesNotMatch(serverSource, new RegExp(`function\\s+${retired}\\b`), retired);
  }

  assert.match(serverSource, /require\(['"]\.\/security\/session-security\.cjs['"]\)/);
  assert.match(serverSource, /require\(['"]\.\/security\/account-policy\.cjs['"]\)/);
  assert.match(serverSource, /const SESSION_SECURITY = createSessionSecurity\(/);
  const webhookIndex = serverSource.indexOf("app.post('/api/stripe/webhook'");
  const jsonIndex = serverSource.indexOf("app.use(express.json())");
  const retiredTokenIndex = serverSource.indexOf("app.use(rejectLegacyClientToken)");
  assert.ok(webhookIndex >= 0 && webhookIndex < jsonIndex, "Stripe webhook must retain raw-body precedence");
  assert.ok(jsonIndex < retiredTokenIndex, "legacy token rejection must run after JSON parsing");
  assert.doesNotMatch(serverSource, /\btoken\s*:\s*createAdminToken\(/);
  assert.doesNotMatch(serverSource, /\btoken\s*,\s*\n\s*expiresIn/);
});

test("server audits every issuance path and never reactivates an existing account", () => {
  const issueHelper = serverSource.match(/function issueMemberSession[\s\S]*?\n}\n/)?.[0] || "";
  assert.match(issueHelper, /assertLoginAllowed\(member\)[\s\S]*SESSION_SECURITY\.issueMember/);

  const googleUpsert = serverSource.match(/function upsertGoogleMember[\s\S]*?\n}\n\napp\.get\('\/api\/config'/)?.[0] || "";
  const existingGoogleUpdate = googleUpsert.match(/if \(member\)[\s\S]*?created: false[^\n]*\n\s*}/)?.[0] || "";
  assert.ok(existingGoogleUpdate, "existing Google-member update must remain directly auditable");
  assert.doesNotMatch(existingGoogleUpdate, /status\s*=\s*['"]active['"]/);
  assert.doesNotMatch(serverSource, /status\s*=\s*CASE\s+WHEN status IN \(['"]suspended/);

  const loginRoute = serverSource.match(/app\.post\('\/api\/members\/login'[\s\S]*?\n}\);/)?.[0] || "";
  assert.match(loginRoute, /verifyPassword/);
  assert.doesNotMatch(loginRoute, /req\.body\.phone|email\s*=\s*\?\s+AND\s+phone/);
  assert.match(loginRoute, /assertLoginAllowed\(member\)/);

  for (const route of ["signup", "login"]) {
    assert.match(
      serverSource,
      new RegExp(`app\\.post\\(['"]\\/api\\/auth\\/${route}['"][\\s\\S]{0,240}?status\\(410\\)`),
      route
    );
  }

  assert.match(
    serverSource,
    /SELECT COUNT\(\*\) AS count FROM members[\s\S]*COALESCE\(passwordHash, ['"]['"]\)[\s\S]*COALESCE\(googleSub, ['"]['"]\)/
  );
  assert.equal((serverSource.match(/issueMemberSession\(res,/g) || []).length, 5);
});

function responseCookie(response, name) {
  return response.headers.getSetCookie()
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(";", 1)[0] || "";
}

test("live server uses isolated cookies, rejects retired clients, and blocks suspended sessions", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of ["/api/auth/signup", "/api/auth/login"]) {
    const response = await fetch(`${server.origin}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    });
    assert.equal(response.status, 410, pathname);
  }

  const bearer = await fetch(`${server.origin}/api/stats`, {
    headers: { authorization: "Bearer retired-browser-token" }
  });
  assert.equal(bearer.status, 401);

  const bodyToken = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "owner@example.com",
      password: "correct-horse-battery-staple",
      adminToken: "retired-browser-token"
    })
  });
  assert.equal(bodyToken.status, 400);

  const adminLogin = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "owner@example.com",
      password: "correct-horse-battery-staple"
    })
  });
  assert.equal(adminLogin.status, 200);
  const adminBody = await adminLogin.json();
  assertNoBearerCredential(adminBody);
  assert.equal(typeof adminBody.csrfToken, "string");
  const adminCookie = responseCookie(adminLogin, "aix_admin_session");
  assert.match(adminCookie, /^aix_admin_session=/);

  const adminSession = await fetch(`${server.origin}/api/admin/session`, {
    headers: { cookie: adminCookie }
  });
  assert.equal(adminSession.status, 200);
  assert.equal(typeof (await adminSession.json()).csrfToken, "string");

  const oversizedEmail = `${"a".repeat(501)}@example.com`;
  const oversizedRegistration = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Oversized",
      lastName: "Identity",
      email: oversizedEmail,
      phone: "0899999999",
      password: "correct-password",
      passwordConfirm: "correct-password",
      consentAccepted: true
    })
  });
  assert.equal(oversizedRegistration.status, 400);
  const membersAfterOversizedRegistration = await fetch(`${server.origin}/api/members`, {
    headers: { cookie: adminCookie }
  });
  assert.equal(membersAfterOversizedRegistration.status, 200);
  assert.equal(
    (await membersAfterOversizedRegistration.json()).some((member) => member.email === oversizedEmail),
    false
  );

  const registration = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      firstName: "Session",
      lastName: "Member",
      email: "session-member@example.com",
      phone: "0812345678",
      password: "correct-password",
      passwordConfirm: "correct-password",
      consentAccepted: true
    })
  });
  assert.equal(registration.status, 200);
  const registrationBody = await registration.json();
  assertNoBearerCredential(registrationBody);
  assert.equal(typeof registrationBody.csrfToken, "string");
  const memberCookie = responseCookie(registration, "aix_member_session");
  assert.match(memberCookie, /^aix_member_session=/);

  const memberSession = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: memberCookie }
  });
  assert.equal(memberSession.status, 200);
  assert.equal(typeof (await memberSession.json()).csrfToken, "string");

  const passwordless = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "session-member@example.com", phone: "0812345678" })
  });
  assert.equal(passwordless.status, 400);

  const suspend = await fetch(`${server.origin}/api/members/${encodeURIComponent(registrationBody.member.id)}`, {
    method: "PUT",
    headers: { cookie: adminCookie, "content-type": "application/json" },
    body: JSON.stringify({ status: "suspended" })
  });
  assert.equal(suspend.status, 200);

  const suspendedRead = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: memberCookie }
  });
  assert.equal(suspendedRead.status, 401);

  const suspendedLogin = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "session-member@example.com", password: "correct-password" })
  });
  assert.equal(suspendedLogin.status, 401);

  const retiredCookie = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: "aix_session=retired-session" }
  });
  assert.equal(retiredCookie.status, 401);
  assert.match(
    retiredCookie.headers.getSetCookie().find((cookie) => cookie.startsWith("aix_session=")) || "",
    /^aix_session=; Max-Age=0;/
  );

  const adminLogout = await fetch(`${server.origin}/api/admin/logout`, {
    method: "POST",
    headers: { cookie: adminCookie }
  });
  assert.equal(adminLogout.status, 200);
  assert.match(
    adminLogout.headers.getSetCookie().find((cookie) => cookie.startsWith("aix_admin_session=")) || "",
    /^aix_admin_session=; Max-Age=0;/
  );
});
