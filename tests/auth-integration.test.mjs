import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/server-harness.mjs";

const BEARER_FIELDS = [
  "token",
  "authToken",
  "adminToken",
  "sessionToken",
  "accessToken",
  "refreshToken",
  "idToken",
  "jwt",
  "bearerToken"
];
const BEARER_FIELD_SET = new Set(BEARER_FIELDS);

function mutationHeaders(server, extra = {}) {
  return { origin: server.origin, ...extra };
}

function jsonMutationHeaders(server, extra = {}) {
  return mutationHeaders(server, { "content-type": "application/json", ...extra });
}

function cookieFrom(response, name) {
  return response.headers.getSetCookie()
    .find((value) => value.startsWith(`${name}=`))
    ?.split(";", 1)[0] || "";
}

function fullCookieFrom(response, name) {
  return response.headers.getSetCookie()
    .find((value) => value.startsWith(`${name}=`)) || "";
}

function assertNoBearerCredential(body) {
  function visit(value, path) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      assert.equal(BEARER_FIELD_SET.has(key), false, `${path}.${key}`);
      visit(child, `${path}.${key}`);
    }
  }
  visit(body, "$response");
  assert.doesNotMatch(JSON.stringify(body), /Bearer\s/i);
}

function assertIssuedCookie(response, { name, maxAge, sameSite }) {
  const value = fullCookieFrom(response, name);
  const [pair, ...attributes] = value.split(";").map((part) => part.trim());
  assert.match(pair || "", new RegExp(`^${name}=[^;]+$`));
  assert.deepEqual(attributes, [
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${sameSite}`
  ]);
  assert.doesNotMatch(value, /(?:^|;\s*)Domain=/i);
  assert.doesNotMatch(value, /(?:^|;\s*)Secure(?:;|$)/i);
}

function clearedCookieValue(name, sameSite) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=${sameSite}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function assertRateLimitDirective(header, name, expected) {
  const requested = String(name).toLowerCase();
  const values = String(header || "")
    .split(";")
    .slice(1)
    .flatMap((segment) => {
      const match = segment.trim().match(/^([a-z][a-z0-9_-]*)=(-?(?:0|[1-9]\d*))$/i);
      if (!match || match[1].toLowerCase() !== requested) return [];
      return [Number(match[2])];
    });
  assert.deepEqual(values, [expected], `${requested} directive`);
}

async function registerMember(server, overrides = {}) {
  const input = {
    firstName: "Integration",
    lastName: "Member",
    email: "integration-member@example.com",
    phone: "0812345678",
    password: "member-pass-123",
    passwordConfirm: "member-pass-123",
    consentAccepted: true,
    ...overrides
  };
  const response = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify(input)
  });
  const body = await response.json();
  return { input, response, body };
}

async function loginMember(server, email, password) {
  const response = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify({ email, password })
  });
  const body = await response.json();
  return { response, body };
}

test("no-bearer response guard rejects credential fields at every nesting depth", () => {
  for (const key of BEARER_FIELDS) {
    assert.throws(
      () => assertNoBearerCredential({ member: { sessions: [{ [key]: "secret" }] } }),
      { name: "AssertionError" },
      key
    );
  }
});

test("rate-limit directive guard rejects numeric prefixes and key suffixes", () => {
  const falseMatches = [
    { header: '"ignored"; r=01; t=731', name: "r", expected: 0 },
    { header: '"ignored"; q=50; w=900', name: "q", expected: 5 },
    { header: '"ignored"; q=5; w=9000', name: "w", expected: 900 },
    { header: '"ignored"; xr=0; t=731', name: "r", expected: 0 }
  ];
  for (const sample of falseMatches) {
    assert.throws(
      () => assertRateLimitDirective(sample.header, sample.name, sample.expected),
      { name: "AssertionError" },
      `${sample.name}=${sample.expected}`
    );
  }
  assert.doesNotThrow(() => assertRateLimitDirective('"different label"; r=0; t=417', "r", 0));
  assert.doesNotThrow(() => assertRateLimitDirective('"different label"; q=5; w=900', "q", 5));
  assert.doesNotThrow(() => assertRateLimitDirective('"different label"; q=5; w=900', "w", 900));
});

test("member registration and password login issue only host cookies plus session-bound csrf", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const registration = await registerMember(server);
  assert.equal(registration.response.status, 200);
  assertNoBearerCredential(registration.body);
  assert.equal(typeof registration.body.csrfToken, "string");
  assert.ok(registration.body.csrfToken);
  assertIssuedCookie(registration.response, {
    name: "aix_member_session",
    maxAge: 604800,
    sameSite: "Lax"
  });

  const noPassword = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify({ email: registration.input.email, phone: registration.input.phone })
  });
  assert.equal(noPassword.status, 400);

  const login = await loginMember(server, registration.input.email, registration.input.password);
  assert.equal(login.response.status, 200);
  assertNoBearerCredential(login.body);
  assert.equal(typeof login.body.csrfToken, "string");
  assert.ok(login.body.csrfToken);
  assertIssuedCookie(login.response, {
    name: "aix_member_session",
    maxAge: 604800,
    sameSite: "Lax"
  });

  const currentSession = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: cookieFrom(login.response, "aix_member_session") }
  });
  assert.equal(currentSession.status, 200);
  const currentBody = await currentSession.json();
  assertNoBearerCredential(currentBody);
  assert.equal(currentBody.csrfToken, login.body.csrfToken);
});

test("retired browser credentials cannot authenticate and logout requires exact origin plus matching csrf", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const bearer = await fetch(`${server.origin}/api/member/dashboard`, {
    headers: { authorization: "Bearer leaked-browser-token" }
  });
  assert.equal(bearer.status, 401);

  const retired = await fetch(`${server.origin}/api/member/dashboard`, {
    headers: { cookie: "aix_session=retired-browser-session" }
  });
  assert.equal(retired.status, 401);
  assert.deepEqual(retired.headers.getSetCookie(), [
    clearedCookieValue("aix_session", "Lax")
  ]);

  const browserTokenBody = await fetch(`${server.origin}/api/members/login`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify({
      email: "nobody@example.com",
      password: "not-a-real-password",
      token: "retired-browser-token"
    })
  });
  assert.equal(browserTokenBody.status, 400);

  const registration = await registerMember(server, {
    email: "csrf-integration@example.com",
    phone: "0898765432",
    password: "member-pass-456",
    passwordConfirm: "member-pass-456"
  });
  assert.equal(registration.response.status, 200);
  const firstCookie = cookieFrom(registration.response, "aix_member_session");

  const bearerWithValidCookie = await fetch(`${server.origin}/api/auth/me`, {
    headers: {
      authorization: "Bearer retired-browser-token",
      cookie: firstCookie
    }
  });
  assert.equal(bearerWithValidCookie.status, 401);

  const secondSession = await loginMember(server, registration.input.email, registration.input.password);
  assert.equal(secondSession.response.status, 200);
  assert.notEqual(secondSession.body.csrfToken, registration.body.csrfToken);

  const missingOrigin = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: {
      cookie: firstCookie,
      "x-csrf-token": registration.body.csrfToken
    }
  });
  assert.equal(missingOrigin.status, 403);

  const missingCsrf = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: mutationHeaders(server, { cookie: firstCookie })
  });
  assert.equal(missingCsrf.status, 403);

  const wrongCsrf = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: mutationHeaders(server, { cookie: firstCookie, "x-csrf-token": "wrong-token" })
  });
  assert.equal(wrongCsrf.status, 403);

  const crossSessionCsrf = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: mutationHeaders(server, {
      cookie: firstCookie,
      "x-csrf-token": secondSession.body.csrfToken
    })
  });
  assert.equal(crossSessionCsrf.status, 403);

  const wrongOrigin = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: {
      origin: "https://evil.invalid",
      cookie: firstCookie,
      "x-csrf-token": registration.body.csrfToken
    }
  });
  assert.equal(wrongOrigin.status, 403);

  const sessionBeforeLogout = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: firstCookie }
  });
  assert.equal(sessionBeforeLogout.status, 200);
  assert.equal((await sessionBeforeLogout.json()).csrfToken, registration.body.csrfToken);

  const validLogout = await fetch(`${server.origin}/api/auth/logout`, {
    method: "POST",
    headers: mutationHeaders(server, {
      cookie: firstCookie,
      "x-csrf-token": registration.body.csrfToken
    })
  });
  assert.equal(validLogout.status, 200);
  assertNoBearerCredential(await validLogout.json());
  assert.deepEqual(validLogout.headers.getSetCookie(), [
    clearedCookieValue("aix_member_session", "Lax"),
    clearedCookieValue("aix_session", "Lax")
  ]);
});

test("legacy auth stays retired and a fresh admin limiter blocks the sixth failed login", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of ["/api/auth/signup", "/api/auth/login"]) {
    const response = await fetch(`${server.origin}${pathname}`, {
      method: "POST",
      headers: jsonMutationHeaders(server),
      body: "{}"
    });
    assert.equal(response.status, 410, pathname);
  }

  for (let index = 0; index < 5; index += 1) {
    const response = await fetch(`${server.origin}/api/admin/login`, {
      method: "POST",
      headers: jsonMutationHeaders(server),
      body: JSON.stringify({ email: "owner@example.com", password: `wrong-${index}` })
    });
    assert.equal(response.status, 401, String(index));
  }

  const blocked = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify({ email: "owner@example.com", password: "wrong-six" })
  });
  assert.equal(blocked.status, 429);
  assertRateLimitDirective(blocked.headers.get("ratelimit"), "r", 0);
  assertRateLimitDirective(blocked.headers.get("ratelimit-policy"), "q", 5);
  assertRateLimitDirective(blocked.headers.get("ratelimit-policy"), "w", 900);
  for (const name of ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
    assert.equal(blocked.headers.get(name), null, name);
  }
  assert.doesNotMatch(server.output(), /ValidationError|ERR_ERL_/i);
});

test("suspending a member through the real admin flow invalidates its cookie and password login", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const registration = await registerMember(server, {
    email: "suspended-integration@example.com",
    phone: "0823456789",
    password: "member-pass-789",
    passwordConfirm: "member-pass-789"
  });
  assert.equal(registration.response.status, 200);
  const memberCookie = cookieFrom(registration.response, "aix_member_session");

  const adminLogin = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: jsonMutationHeaders(server),
    body: JSON.stringify({
      email: "owner@example.com",
      password: "correct-horse-battery-staple"
    })
  });
  assert.equal(adminLogin.status, 200);
  const adminLoginBody = await adminLogin.json();
  assertNoBearerCredential(adminLoginBody);
  assertIssuedCookie(adminLogin, {
    name: "aix_admin_session",
    maxAge: 28800,
    sameSite: "Strict"
  });
  const adminCookie = cookieFrom(adminLogin, "aix_admin_session");

  const adminSession = await fetch(`${server.origin}/api/admin/session`, {
    headers: { cookie: adminCookie }
  });
  assert.equal(adminSession.status, 200);
  const adminSessionBody = await adminSession.json();
  assertNoBearerCredential(adminSessionBody);
  assert.equal(adminSessionBody.csrfToken, adminLoginBody.csrfToken);

  const suspend = await fetch(`${server.origin}/api/members/${encodeURIComponent(registration.body.member.id)}`, {
    method: "PUT",
    headers: jsonMutationHeaders(server, {
      cookie: adminCookie,
      "x-csrf-token": adminSessionBody.csrfToken
    }),
    body: JSON.stringify({ status: "suspended" })
  });
  assert.equal(suspend.status, 200);
  assert.equal((await suspend.json()).status, "suspended");

  const existingCookie = await fetch(`${server.origin}/api/auth/me`, {
    headers: { cookie: memberCookie }
  });
  assert.equal(existingCookie.status, 401);

  const passwordLogin = await loginMember(server, registration.input.email, registration.input.password);
  assert.equal(passwordLogin.response.status, 401);
  assertNoBearerCredential(passwordLogin.body);
  assert.doesNotMatch(server.output(), /googleapis|twilio|thaibulksms|stripe\.com|supabase/i);
});
