import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const CLIENT_FILE = join(ROOT, "aix-api-client.js");
const MEMBER_SESSION_PATH = "/api/auth/me";
const ADMIN_SESSION_PATH = "/api/admin/session";
const RETIRED_AUTH_KEYS = [
  "aix_member_token",
  "aix_member_session",
  "aixAdminToken",
  "aixAdminAuth",
  "aix_members"
];

const PAGE_SCRIPTS = new Map([
  ["index.html", "script.js"],
  ["class-detail.html", "class-detail.js"],
  ["dashboard.html", "dashboard.js"],
  ["tools-box.html", "tools-box.js"],
  ["live-class.html", "live-class.js"],
  ["payment.html", "payment.js"],
  ["payment-success.html", "payment-success.js"],
  ["course-start.html", "course-start.js"],
  ["course-content.html", "course-content.js"],
  ["course-learn.html", "course-learn.js"],
  ["admin.html", "admin.js"]
]);

const MEMBER_SCRIPTS = [...PAGE_SCRIPTS.values()].filter((name) => name !== "admin.js");
const ALL_SCRIPTS = [...PAGE_SCRIPTS.values()];
const AUXILIARY_RUNTIME_SCRIPTS = ["site-footer.js", "member-resource-glow.js"];

function makeResponse({ status = 200, type = "application/json", body = "{}", text } = {}) {
  const headers = new Headers();
  if (type) headers.set("content-type", type);
  let textCalls = 0;
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers,
    async text() {
      textCalls += 1;
      if (typeof text === "function") return text();
      return body;
    }
  };
  Object.defineProperty(response, "textCalls", { get: () => textCalls });
  return response;
}

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const removed = [];
  return {
    values,
    removed,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      removed.push(key);
      values.delete(key);
    }
  };
}

async function loadClient({ fetchImpl, storage = makeStorage(), storageGetter } = {}) {
  const source = await readFile(CLIENT_FILE, "utf8");
  const calls = [];
  const request = fetchImpl || (async (path, options) => {
    calls.push({ path, options });
    return makeResponse();
  });
  const window = {
    location: new URL("https://www.aix.test/dashboard?from=test"),
    document: { baseURI: "https://attacker.invalid/redirected-base/" },
    URL,
    Headers,
    FormData,
    Blob,
    URLSearchParams,
    Error,
    fetch: request
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: storageGetter || (() => storage)
  });
  window.window = window;
  const context = vm.createContext({
    window,
    URL,
    Headers,
    FormData,
    Blob,
    URLSearchParams,
    Error,
    fetch: request,
    console
  });
  vm.runInContext(source, context, { filename: "aix-api-client.js" });
  return { window, calls, storage };
}

async function captureRequest(client, path, options = {}) {
  return client.raw(path, options);
}

function scriptSources(html) {
  const sources = [];
  const pattern = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>\s*<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) sources.push(match[2]);
  return sources;
}

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : source.length;
  assert.notEqual(end, -1, `missing ${endMarker}`);
  return source.slice(start, end);
}

test("shared client removes only inventoried legacy auth keys and survives blocked storage", async () => {
  const initial = Object.fromEntries(RETIRED_AUTH_KEYS.map((key) => [key, "legacy-secret"]));
  initial["aix-theme"] = "dark";
  initial["aix_learning_progress_v1"] = "keep-progress";
  initial["aixCourses"] = "keep-admin-seed";
  const storage = makeStorage(initial);

  const { window } = await loadClient({ storage });
  assert.deepEqual(storage.removed, RETIRED_AUTH_KEYS);
  for (const key of RETIRED_AUTH_KEYS) assert.equal(storage.values.has(key), false, key);
  assert.equal(storage.values.get("aix-theme"), "dark");
  assert.equal(storage.values.get("aix_learning_progress_v1"), "keep-progress");
  assert.equal(storage.values.get("aixCourses"), "keep-admin-seed");
  assert.equal(typeof window.AiXApi.createClient, "function");

  const throwingStorage = {
    removeItem() {
      throw new DOMException("blocked", "SecurityError");
    }
  };
  const blockedRemove = await loadClient({ storage: throwingStorage });
  assert.equal(typeof blockedRemove.window.AiXApi.createClient, "function");

  const blockedGetter = await loadClient({
    storageGetter() {
      throw new DOMException("blocked", "SecurityError");
    }
  });
  assert.equal(typeof blockedGetter.window.AiXApi.createClient, "function");
});

test("request validates same-origin URLs before fetch and owns cookie and CSRF headers", async () => {
  const observed = [];
  const { window } = await loadClient({
    fetchImpl: async (path, options) => {
      observed.push({ path, options });
      return makeResponse({ body: "{}" });
    }
  });
  const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
  client.adopt({ csrfToken: "csrf-secret" });

  await client.request("api/member/profile", {
    method: "  post  ",
    credentials: "include",
    redirect: "follow",
    headers: {
      Authorization: "Bearer attacker-token",
      "X-CSRF-Token": "attacker-csrf",
      "X-Feature": "enabled"
    },
    body: JSON.stringify({ displayName: "AiX" })
  });
  assert.equal(observed.length, 1);
  assert.equal(observed[0].path, "https://www.aix.test/api/member/profile", "fetch must receive the validated canonical URL, never a document-base-relative string");
  assert.equal(observed[0].options.method, "POST");
  assert.equal(observed[0].options.credentials, "same-origin");
  assert.equal(observed[0].options.redirect, "error", "CSRF-bearing requests must never follow redirects");
  assert.equal(observed[0].options.headers.get("Authorization"), null);
  assert.equal(observed[0].options.headers.get("X-CSRF-Token"), "csrf-secret");
  assert.equal(observed[0].options.headers.get("X-Feature"), "enabled");

  await client.request("https://www.aix.test/api/member/dashboard", {
    method: "GET",
    credentials: "omit",
    headers: { "X-CSRF-Token": "attacker-csrf" }
  });
  assert.equal(observed.length, 2);
  assert.equal(observed[1].options.credentials, "same-origin");
  assert.equal(observed[1].options.headers.get("X-CSRF-Token"), null);

  for (const target of [
    "https://evil.test/api",
    "//evil.test/api",
    "/\\\\evil.test/api",
    "https://www.aix.test@evil.test/api",
    "blob:https://www.aix.test/id",
    "javascript:alert(1)"
  ]) {
    await assert.rejects(() => client.request(target), (error) => {
      assert.equal(error instanceof Error, true);
      assert.doesNotMatch(error.message, /evil\.test|javascript|blob:/i);
      return true;
    }, target);
  }
  assert.equal(observed.length, 2, "invalid URL must be rejected before fetch");
});

test("clients keep CSRF in independent closures across adopt, bootstrap, failure, and clear", async () => {
  const responses = [
    makeResponse({ body: JSON.stringify({ member: { id: "m1" }, csrfToken: "fresh-one" }) }),
    makeResponse({ body: JSON.stringify({ member: { id: "m1" } }) }),
    makeResponse({ status: 401, body: JSON.stringify({ error: "expired", csrfToken: "do-not-adopt" }) })
  ];
  const observed = [];
  const { window } = await loadClient({
    fetchImpl: async (path, options) => {
      observed.push({ path, options });
      return responses.shift();
    }
  });
  const first = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
  const second = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
  first.adopt({ csrfToken: "old-first" });
  second.adopt({ csrfToken: "second-only" });

  const session = await first.bootstrap();
  assert.equal(session.member.id, "m1");
  assert.equal(first.csrfToken, "fresh-one");
  assert.equal(second.csrfToken, "second-only");
  assert.equal(observed[0].path, `https://www.aix.test${MEMBER_SESSION_PATH}`);
  assert.equal(observed[0].options.cache, "no-store");
  assert.equal(observed[0].options.credentials, "same-origin");

  await assert.rejects(() => first.bootstrap());
  assert.equal(first.csrfToken, "");
  first.adopt({ csrfToken: "restored-before-error" });
  await assert.rejects(() => first.bootstrap(), (error) => {
    assert.equal(error.status, 401);
    return true;
  });
  assert.equal(first.csrfToken, "");
  assert.equal(second.csrfToken, "second-only");
  second.clear();
  assert.equal(second.csrfToken, "");
  assert.equal(Object.isFrozen(window.AiXApi), true);
  assert.equal(Object.isFrozen(first), true);
});

test("a stale bootstrap cannot clear or overwrite a later login token", async () => {
  for (const staleSessionResponse of [
    makeResponse({ status: 401, body: JSON.stringify({ error: "stale session" }) }),
    makeResponse({ body: JSON.stringify({ member: { id: "old-member" }, csrfToken: "old-bootstrap-token" }) })
  ]) {
    let resolveSession;
    const sessionResponse = new Promise((resolve) => {
      resolveSession = resolve;
    });
    const { window } = await loadClient({
      fetchImpl: async (path) => {
        const pathname = new URL(path, "https://www.aix.test").pathname;
        if (pathname === MEMBER_SESSION_PATH) return sessionResponse;
        if (pathname === "/api/members/login") {
          return makeResponse({ body: JSON.stringify({ member: { id: "new-member" }, csrfToken: "new-login-token" }) });
        }
        throw new Error("unexpected request");
      }
    });
    const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
    const pendingBootstrap = client.bootstrap();
    await client.request("/api/members/login", { method: "POST", body: "{}" });
    assert.equal(client.csrfToken, "new-login-token");

    resolveSession(staleSessionResponse);
    if (staleSessionResponse.ok) {
      await pendingBootstrap;
    } else {
      await assert.rejects(() => pendingBootstrap);
    }
    assert.equal(client.csrfToken, "new-login-token");
  }
});

test("request adopts CSRF only from successful responses", async () => {
  const responses = [
    makeResponse({ body: JSON.stringify({ ok: true, csrfToken: "login-token" }) }),
    makeResponse({ status: 403, body: JSON.stringify({ error: "denied", csrfToken: "error-token" }) })
  ];
  const { window } = await loadClient({ fetchImpl: async () => responses.shift() });
  const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
  await client.request("/api/members/login", { method: "POST", body: "{}" });
  assert.equal(client.csrfToken, "login-token");
  await assert.rejects(() => client.request("/api/member/profile", { method: "PATCH", body: "{}" }));
  assert.equal(client.csrfToken, "login-token");
});

test("body handling preserves browser-owned types and labels only JSON strings", async () => {
  const observed = [];
  const { window } = await loadClient({
    fetchImpl: async (path, options) => {
      observed.push({ path, options });
      return makeResponse({ status: 204, type: "", body: "" });
    }
  });
  const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });
  const form = new FormData();
  form.set("name", "AiX");
  const params = new URLSearchParams({ q: "ai" });
  const blob = new Blob(["file"], { type: "text/plain" });

  await captureRequest(client, "/form", { method: "POST", body: form, headers: { "Content-Type": "multipart/form-data" } });
  await captureRequest(client, "/params", { method: "POST", body: params });
  await captureRequest(client, "/blob", { method: "POST", body: blob });
  await captureRequest(client, "/json", { method: "POST", body: JSON.stringify({ ok: true }) });
  await captureRequest(client, "/plain", { method: "POST", body: "plain text" });
  await captureRequest(client, "/explicit", { method: "POST", body: "plain text", headers: { "Content-Type": "text/plain" } });

  assert.equal(observed[0].options.headers.get("Content-Type"), null, "FormData boundary belongs to fetch");
  assert.equal(observed[1].options.headers.get("Content-Type"), null, "URLSearchParams must not be mislabeled JSON");
  assert.equal(observed[2].options.headers.get("Content-Type"), null, "Blob must not be mislabeled JSON");
  assert.equal(observed[3].options.headers.get("Content-Type"), "application/json");
  assert.equal(observed[4].options.headers.get("Content-Type"), null);
  assert.equal(observed[5].options.headers.get("Content-Type"), "text/plain");
});

test("request parses JSON, text, empty, malformed JSON, and no-content responses", async () => {
  const noContent = makeResponse({ status: 204, type: "application/json", text: () => {
    throw new Error("204 body must not be read");
  } });
  const responses = [
    makeResponse({ body: JSON.stringify({ value: 42 }) }),
    makeResponse({ type: "text/plain", body: "พร้อมใช้งาน" }),
    makeResponse({ type: "application/json", body: "" }),
    makeResponse({ type: "application/problem+json", body: "not-json" }),
    noContent
  ];
  const { window } = await loadClient({ fetchImpl: async () => responses.shift() });
  const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });

  const json = await client.request("/json");
  assert.equal(json.value, 42);
  assert.equal(await client.request("/text"), "พร้อมใช้งาน");
  assert.equal(await client.request("/empty"), null);
  assert.equal(await client.request("/malformed"), "not-json");
  assert.equal(await client.request("/no-content"), null);
  assert.equal(noContent.textCalls, 0);
});

test("normalized errors expose status and safe messages without response secrets", async () => {
  const secret = "private-cookie-session-secret";
  const responses = [
    makeResponse({ status: 422, body: JSON.stringify({ error: "ข้อมูลไม่ครบ" }) }),
    makeResponse({ status: 500, type: "text/plain", body: `${secret} https://evil.test/debug` }),
    makeResponse({ status: 502, type: "application/json", body: "{broken" })
  ];
  const { window } = await loadClient({ fetchImpl: async () => responses.shift() });
  const client = window.AiXApi.createClient({ sessionPath: MEMBER_SESSION_PATH });

  await assert.rejects(() => client.request("/safe-error"), (error) => {
    assert.equal(error.status, 422);
    assert.equal(error.message, "ข้อมูลไม่ครบ");
    return true;
  });
  for (const path of ["/secret-error", "/broken-json-error"]) {
    await assert.rejects(() => client.request(path), (error) => {
      assert.equal(typeof error.status, "number");
      assert.doesNotMatch(error.message, /private-cookie|evil\.test|broken|secret/i);
      assert.doesNotMatch(error.message, new RegExp(path.replace("/", "\\/")));
      return true;
    });
  }
});

test("raw returns the original Response-compatible object", async () => {
  const response = makeResponse({ status: 202, type: "text/plain", body: "accepted" });
  const { window } = await loadClient({ fetchImpl: async () => response });
  const client = window.AiXApi.createClient({ sessionPath: ADMIN_SESSION_PATH });
  assert.equal(await client.raw("/api/admin/jobs"), response);
});

test("every page loads exactly one shared client immediately before its page script", async () => {
  for (const [page, pageScript] of PAGE_SCRIPTS) {
    const html = await readFile(join(ROOT, page), "utf8");
    const sources = scriptSources(html);
    const sharedIndexes = sources
      .map((source, index) => source.split("?")[0] === "/aix-api-client.js" ? index : -1)
      .filter((index) => index >= 0);
    const pageIndex = sources.findIndex((source) => source.split("?")[0].replace(/^\//, "") === pageScript);
    assert.deepEqual(sharedIndexes, [pageIndex - 1], `${page}: shared client must be the one script immediately before ${pageScript}`);
  }
});

test("page scripts use scoped clients and contain no bearer or auth-storage implementation", async () => {
  const allowedLocalStorageCalls = new Map([
    ["script.js", 1],
    ["class-detail.js", 0],
    ["dashboard.js", 2],
    ["tools-box.js", 0],
    ["live-class.js", 2],
    ["payment.js", 0],
    ["payment-success.js", 0],
    ["course-start.js", 1],
    ["course-content.js", 0],
    ["course-learn.js", 9],
    ["admin.js", 6]
  ]);

  for (const filename of ALL_SCRIPTS) {
    const source = await readFile(join(ROOT, filename), "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(/, `${filename}: raw fetch bypasses shared client`);
    assert.doesNotMatch(source, /\bAuthorization\b|\bBearer\b|X-CSRF-Token/, `${filename}: caller-owned auth header`);
    assert.doesNotMatch(source, /sessionStorage|document\.cookie/, `${filename}: browser auth material outside closure`);
    for (const key of RETIRED_AUTH_KEYS) assert.doesNotMatch(source, new RegExp(key), `${filename}: ${key}`);
    assert.equal((source.match(/\blocalStorage\s*\./g) || []).length, allowedLocalStorageCalls.get(filename), `${filename}: unexpected storage call inventory`);
  }

  for (const filename of MEMBER_SCRIPTS) {
    const source = await readFile(join(ROOT, filename), "utf8");
    assert.match(source, /window\.AiXApi\.createClient\(\{\s*sessionPath:\s*["']\/api\/auth\/me["']\s*\}\)/, filename);
    assert.match(source, /memberApi\.request\(/, filename);
    assert.match(source, /memberApi\.bootstrap\(/, `${filename}: session must bootstrap before protected work`);
  }
  const adminSource = await readFile(join(ROOT, "admin.js"), "utf8");
  assert.match(adminSource, /window\.AiXApi\.createClient\(\{\s*sessionPath:\s*["']\/api\/admin\/session["']\s*\}\)/);
  assert.match(adminSource, /adminApi\.raw\(/);
  assert.match(adminSource, /adminApi\.bootstrap\(/);
});

test("the complete active browser runtime has no legacy auth implementation outside cleanup", async () => {
  const forbidden = /\bAuthorization\b|\bBearer\b|sessionStorage|document\.cookie/;
  for (const filename of AUXILIARY_RUNTIME_SCRIPTS) {
    const source = await readFile(join(ROOT, filename), "utf8");
    assert.doesNotMatch(source, forbidden, filename);
    for (const key of RETIRED_AUTH_KEYS) assert.doesNotMatch(source, new RegExp(key), `${filename}: ${key}`);
  }
  for (const page of PAGE_SCRIPTS.keys()) {
    const html = await readFile(join(ROOT, page), "utf8");
    assert.doesNotMatch(html, /\bAuthorization\b|\bBearer\b|sessionStorage|document\.cookie/, page);
    for (const key of RETIRED_AUTH_KEYS) assert.doesNotMatch(html, new RegExp(key), `${page}: ${key}`);
  }

  const clientSource = await readFile(CLIENT_FILE, "utf8");
  assert.doesNotMatch(clientSource, /localStorage\.(?:getItem|setItem)|sessionStorage|document\.cookie/);
  for (const key of RETIRED_AUTH_KEYS) {
    assert.equal((clientSource.match(new RegExp(key, "g")) || []).length, 1, `${key}: cleanup inventory only`);
  }
});

test("homepage auth lifecycle adopts server sessions and clears CSRF on logout", async () => {
  const source = await readFile(join(ROOT, "script.js"), "utf8");
  const setMember = sourceSlice(source, "function setMember(", "function setAuthActionHidden(");
  assert.doesNotMatch(setMember, /localStorage|token/i);

  const restore = sourceSlice(source, "async function restoreSession()", "function scrollToId(");
  assert.match(restore, /memberApi\.bootstrap\(\)/);
  assert.match(restore, /if\s*\(memberApi\.csrfToken\s*!==\s*result\.csrfToken\)\s*return/);
  assert.match(restore, /if\s*\(!memberApi\.csrfToken\)\s*setMember\(null\)/);
  assert.match(restore, /setMember\([^)]*\.member\)/);

  const logout = sourceSlice(source, "async function logoutMember()", "async function restoreSession()");
  assert.match(logout, /memberApi\.bootstrap\(\)/);
  assert.match(logout, /apiRequest\(["']\/api\/auth\/logout["']/);
  assert.ok(logout.indexOf("memberApi.clear()") > logout.indexOf("/api/auth/logout"));

  for (const endpoint of ["/api/members/register", "/api/members/login", "/api/auth/google", "/api/auth/google-access-token"]) {
    const endpointIndex = source.indexOf(endpoint);
    assert.notEqual(endpointIndex, -1, endpoint);
    const nextAdopt = source.indexOf("memberApi.adopt(", endpointIndex);
    assert.ok(nextAdopt > endpointIndex, `${endpoint}: response must be adopted`);
  }
});

test("admin restore cannot overwrite a newer login or logout lifecycle", async () => {
  const source = await readFile(join(ROOT, "admin.js"), "utf8");
  const restore = sourceSlice(source, "async function restoreAdminSession()", "adminPassword?.addEventListener");
  assert.match(restore, /const\s+result\s*=\s*await\s+adminApi\.bootstrap\(\)/);
  assert.match(restore, /if\s*\(adminApi\.csrfToken\s*!==\s*result\.csrfToken\)\s*return/);
  assert.match(restore, /if\s*\(adminApi\.csrfToken\)\s*return/);
  assert.ok(restore.indexOf("adminLoggedIn = true") > restore.indexOf("adminApi.csrfToken !== result.csrfToken"));
});

test("protected mutation flows bootstrap before the first unsafe request", async () => {
  const contracts = [
    ["dashboard.js", "/api/member/notifications/"],
    ["tools-box.js", "/api/auth/logout"],
    ["payment.js", "/api/payments/stripe/checkout"],
    ["course-learn.js", "/api/member/progress"],
    ["admin.js", "adminApi.raw("]
  ];
  for (const [filename, mutationMarker] of contracts) {
    const source = await readFile(join(ROOT, filename), "utf8");
    const bootstrap = filename === "admin.js" ? source.indexOf("adminApi.bootstrap(") : source.indexOf("memberApi.bootstrap(");
    const mutation = source.indexOf(mutationMarker);
    assert.notEqual(bootstrap, -1, `${filename}: bootstrap`);
    assert.notEqual(mutation, -1, `${filename}: mutation`);
    assert.ok(bootstrap < mutation, `${filename}: bootstrap source path must precede unsafe request path`);
  }
});

test("shared client is published and included in the security suite", async () => {
  const manifestSource = await readFile(join(ROOT, "security/publication-manifest.cjs"), "utf8");
  assert.match(manifestSource, /["']aix-api-client\.js["']/);
  const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  assert.match(packageJson.scripts["test:security"], /tests\/client-auth-contract\.test\.mjs/);
});
