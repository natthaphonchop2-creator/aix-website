import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import vm from "node:vm";
import { parseHTML } from "linkedom";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const PREMIUM_MARKERS = [
  "ai-work-intake",
  "business-use-case-finder",
  "AI Work Intake Skill",
  "หา Use Case AI ในธุรกิจ"
];

function cookieFrom(response, name) {
  return response.headers.getSetCookie()
    .find((value) => value.startsWith(`${name}=`))
    ?.split(";", 1)[0];
}

async function registerMember(server, email = "tools@example.com") {
  const response = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: { Origin: server.origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Tools Test",
      email,
      phone: "0876543210",
      password: "member-pass-789",
      passwordConfirm: "member-pass-789",
      consentAccepted: true
    })
  });
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = cookieFrom(response, "aix_member_session");
  assert.ok(cookie);
  return { cookie, email };
}

function updateMember(server, email, values) {
  const database = new DatabaseSync(join(server.dataDir, "data.db"));
  try {
    const assignments = Object.keys(values).map((key) => `${key} = ?`).join(", ");
    database.prepare(`UPDATE members SET ${assignments} WHERE email = ?`)
      .run(...Object.values(values), email);
  } finally {
    database.close();
  }
}

function deleteMember(server, email) {
  const database = new DatabaseSync(join(server.dataDir, "data.db"));
  try {
    database.prepare("DELETE FROM members WHERE email = ?").run(email);
  } finally {
    database.close();
  }
}

async function readJson(response) {
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  return response.json();
}

async function assertNoLibrary(response, expectedStatus) {
  assert.equal(response.status, expectedStatus, await response.clone().text());
  const body = await readJson(response);
  assert.equal("skills" in body, false);
  assert.equal("prompts" in body, false);
  const serialized = JSON.stringify(body);
  for (const marker of PREMIUM_MARKERS) assert.doesNotMatch(serialized, new RegExp(marker, "i"));
  return body;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function flushPromises() {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}

const ACTIVE_DASHBOARD = {
  member: { displayName: "Active Member" },
  payment: { active: true, expired: false },
  resources: []
};
const INACTIVE_DASHBOARD = {
  member: { displayName: "Unpaid Member" },
  payment: { active: false, expired: false },
  resources: []
};
const TEST_LIBRARY = {
  skills: [{
    id: "secret-skill",
    slug: "secret-skill",
    title: "Secret Skill",
    description: "protected skill",
    icon: "fa-solid fa-lock",
    tags: ["Secret"],
    useWhen: "paid",
    inputs: ["input"],
    steps: ["step"],
    output: ["output"],
    qualityGate: "gate"
  }],
  prompts: [{
    id: "secret-prompt",
    slug: "secret-prompt",
    title: "Secret Prompt",
    description: "protected prompt",
    icon: "fa-solid fa-lock",
    tags: ["Secret"],
    prompt: "secret prompt body"
  }]
};

async function runToolsClient({
  bootstrap = [{ member: { id: "member_1" } }],
  dashboard = [],
  tools = [],
  logout = []
} = {}) {
  const source = await readFile("tools-box.js", "utf8");
  const safeDomSource = await readFile("safe-dom.js", "utf8");
  const toolsHtml = await readFile("tools-box.html", "utf8");
  const { window } = parseHTML(toolsHtml);
  const { document } = window;
  const elements = new Map(
    [...document.querySelectorAll("[id]")].map((element) => [element.id, element])
  );
  const documentListeners = new Map();
  const requestCalls = [];
  const redirects = [];
  const clipboardWrites = [];
  const downloads = [];
  let cleared = 0;
  let logoutCalls = 0;

  const queueValue = (queue, label) => {
    assert.ok(queue.length, `Unexpected ${label} call`);
    const value = queue.shift();
    if (typeof value === "function") return value();
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value);
  };
  const memberApi = {
    bootstrap: () => queueValue(bootstrap, "bootstrap"),
    request(path) {
      requestCalls.push(path);
      if (path === "/api/member/dashboard") return queueValue(dashboard, path);
      if (path === "/api/member/tools") return queueValue(tools, path);
      throw new Error(`Unexpected request: ${path}`);
    },
    logout() {
      logoutCalls += 1;
      return queueValue(logout, "logout");
    },
    clear() {
      cleared += 1;
    }
  };

  const nativeCreateElement = document.createElement.bind(document);
  document.createElement = (tagName) => {
    const element = nativeCreateElement(tagName);
    if (String(tagName).toLowerCase() === "a") {
      element.click = () => downloads.push({ download: element.download, href: element.href });
    }
    return element;
  };
  const nativeAddEventListener = document.addEventListener.bind(document);
  document.addEventListener = (type, listener, options) => {
    documentListeners.set(type, listener);
    return nativeAddEventListener(type, listener, options);
  };
  document.execCommand = () => true;
  window.AiXApi = { createClient: () => memberApi };
  window.location = { replace: (pathname) => redirects.push(pathname) };
  window.clearTimeout = () => {};
  window.setTimeout = () => 1;
  class TestURL extends URL {}
  TestURL.createObjectURL = () => "blob:test";
  TestURL.revokeObjectURL = () => {};
  const context = vm.createContext({
    window,
    document,
    navigator: {
      clipboard: {
        writeText(value) {
          clipboardWrites.push(value);
          return Promise.resolve();
        }
      }
    },
    Blob,
    URL: TestURL,
    console
  });
  new vm.Script(safeDomSource, { filename: "safe-dom.js" }).runInContext(context);
  context.AiXDom = window.AiXDom;
  new vm.Script(source, { filename: "tools-box.js" }).runInContext(context);
  await flushPromises();

  return {
    context,
    elements,
    requestCalls,
    redirects,
    clipboardWrites,
    downloads,
    cleared: () => cleared,
    logoutCalls: () => logoutCalls,
    async click(button) {
      const listener = documentListeners.get("click");
      assert.equal(typeof listener, "function");
      await listener({ target: { closest: () => button } });
    },
    skillHtml: () => elements.get("toolsSkillLibrary")?.innerHTML || "",
    promptHtml: () => elements.get("toolsPromptLibrary")?.innerHTML || ""
  };
}

test("browser bundle contains no premium tools records", async () => {
  const toolsBoxScript = await readFile("tools-box.js", "utf8");

  assert.doesNotMatch(toolsBoxScript, /const SKILL_PACKS = \[/);
  assert.doesNotMatch(toolsBoxScript, /const PROMPT_PACKS = \[/);
  for (const marker of PREMIUM_MARKERS) assert.doesNotMatch(toolsBoxScript, new RegExp(marker, "i"));
});

test("server-only library preserves the exact moved bytes and returns independent clones", async () => {
  const source = await readFile("content/tools-library.cjs", "utf8");
  assert.equal(Buffer.byteLength(source), 19_234);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    "c5398809527b5648cd988779deb022e8ec5a1f36deec4b9c0bf0d57237a230e0"
  );

  delete require.cache[require.resolve("../content/tools-library.cjs")];
  const { getToolsLibrary } = require("../content/tools-library.cjs");
  const first = getToolsLibrary();
  assert.equal(first.skills.length, 6);
  assert.equal(first.prompts.length, 6);
  first.skills[0].title = "mutated";
  first.prompts.splice(0);
  const second = getToolsLibrary();
  assert.notEqual(second.skills[0].title, "mutated");
  assert.equal(second.prompts.length, 6);
});

test("tools API fails closed for anonymous, bearer, unpaid, expired, suspended, and deleted members", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`), 401);
  await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: { Authorization: "Bearer retired-browser-token" }
  }), 401);

  const member = await registerMember(server);
  const unpaid = await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: { Cookie: member.cookie }
  }), 402);
  assert.equal(unpaid.paymentRequired, true);

  updateMember(server, member.email, {
    paymentStatus: "paid",
    expiresAt: "2000-01-01T00:00:00.000Z"
  });
  const expired = await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: { Cookie: member.cookie }
  }), 402);
  assert.equal(expired.paymentRequired, true);

  updateMember(server, member.email, { expiresAt: "2099-12-31T00:00:00.000Z" });
  await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: {
      Cookie: member.cookie,
      Authorization: "Bearer retired-browser-token"
    }
  }), 401);

  updateMember(server, member.email, { status: "suspended" });
  await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: { Cookie: member.cookie }
  }), 401);

  updateMember(server, member.email, { status: "active" });
  deleteMember(server, member.email);
  await assertNoLibrary(await fetch(`${server.origin}/api/member/tools`, {
    headers: { Cookie: member.cookie }
  }), 401);
});

test("tools API returns the complete library only to an active paid member without shared caching", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const member = await registerMember(server, "active-tools@example.com");
  updateMember(server, member.email, {
    status: "active",
    paymentStatus: "paid",
    expiresAt: "2099-12-31T00:00:00.000Z"
  });

  const response = await fetch(`${server.origin}/api/member/tools`, {
    headers: { Cookie: member.cookie }
  });
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const library = await readJson(response);
  assert.deepEqual(Object.keys(library).sort(), ["prompts", "skills"]);
  assert.equal(library.skills.length, 6);
  assert.equal(library.prompts.length, 6);
  assert.equal(library.skills[0].id, "ai-work-intake");
  assert.equal(library.prompts.at(-1).id, "content-system-from-one-idea");
});

test("tools client requests premium data only after active access and rejects errors or malformed payloads atomically", async () => {
  const inactive = await runToolsClient({ dashboard: [INACTIVE_DASHBOARD] });
  assert.deepEqual(inactive.requestCalls, ["/api/member/dashboard"]);
  assert.equal(inactive.skillHtml(), "");
  assert.equal(inactive.promptHtml(), "");

  const active = await runToolsClient({ dashboard: [ACTIVE_DASHBOARD], tools: [TEST_LIBRARY] });
  assert.deepEqual(active.requestCalls, ["/api/member/dashboard", "/api/member/tools"]);
  assert.match(active.skillHtml(), /Secret Skill/);
  assert.match(active.promptHtml(), /Secret Prompt/);

  const revokedDashboard = {
    ...ACTIVE_DASHBOARD,
    resources: [{ title: "Paid Resource", description: "private", url: "/api/media/resources/paid" }]
  };
  const revoked = await runToolsClient({
    dashboard: [revokedDashboard],
    tools: [Object.assign(new Error("payment required"), { status: 402 })]
  });
  assert.equal(revoked.skillHtml(), "");
  assert.equal(revoked.promptHtml(), "");
  assert.equal(revoked.elements.get("toolsLockedState").hidden, false);
  assert.doesNotMatch(revoked.elements.get("toolsAccessBadge").innerHTML, /ปลดล็อกแล้ว/);
  assert.doesNotMatch(revoked.elements.get("toolsDynamicResources").innerHTML, /Paid Resource/);

  for (const failedLibrary of [
    Object.assign(new Error("server error"), { status: 500 }),
    { skills: TEST_LIBRARY.skills },
    { skills: TEST_LIBRARY.skills, prompts: null },
    { skills: [{}], prompts: TEST_LIBRARY.prompts },
    { skills: TEST_LIBRARY.skills, prompts: ["not-a-prompt"] },
    { skills: [], prompts: TEST_LIBRARY.prompts }
  ]) {
    const failed = await runToolsClient({ dashboard: [ACTIVE_DASHBOARD], tools: [failedLibrary] });
    assert.equal(failed.skillHtml(), "");
    assert.equal(failed.promptHtml(), "");
  }
});

test("tools client ignores stale dashboard and tools responses across concurrent access changes", async () => {
  const oldTools = deferred();
  const accessLoss = await runToolsClient({
    dashboard: [ACTIVE_DASHBOARD, INACTIVE_DASHBOARD],
    tools: [() => oldTools.promise]
  });
  assert.deepEqual(accessLoss.requestCalls, ["/api/member/dashboard", "/api/member/tools"]);
  await accessLoss.context.loadToolsBox();
  oldTools.resolve(TEST_LIBRARY);
  await flushPromises();
  assert.equal(accessLoss.skillHtml(), "");
  assert.equal(accessLoss.promptHtml(), "");

  const oldDashboard = deferred();
  const staleDashboard = await runToolsClient({ dashboard: [() => oldDashboard.promise, INACTIVE_DASHBOARD] });
  await staleDashboard.context.loadToolsBox();
  oldDashboard.resolve(ACTIVE_DASHBOARD);
  await flushPromises();
  assert.deepEqual(staleDashboard.requestCalls, ["/api/member/dashboard", "/api/member/dashboard"]);
  assert.equal(staleDashboard.skillHtml(), "");
  assert.equal(staleDashboard.promptHtml(), "");

  const oldFailure = deferred();
  const newerSuccess = await runToolsClient({
    dashboard: [ACTIVE_DASHBOARD, ACTIVE_DASHBOARD],
    tools: [() => oldFailure.promise, TEST_LIBRARY]
  });
  await newerSuccess.context.loadToolsBox();
  oldFailure.reject(Object.assign(new Error("stale failure"), { status: 500 }));
  await flushPromises();
  assert.match(newerSuccess.skillHtml(), /Secret Skill/);
  assert.match(newerSuccess.promptHtml(), /Secret Prompt/);
});

test("tools client fails closed across bootstrap races and disables stale copy or download actions", async () => {
  const bootstrapFailure = Object.assign(new Error("session expired"), { status: 401 });
  const rejected = await runToolsClient({ bootstrap: [bootstrapFailure] });
  assert.deepEqual(rejected.requestCalls, []);
  assert.equal(rejected.skillHtml(), "");
  assert.equal(rejected.promptHtml(), "");
  assert.equal(rejected.cleared(), 1);

  const pendingBootstrap = deferred();
  const pendingLogout = deferred();
  const pending = await runToolsClient({
    bootstrap: [() => pendingBootstrap.promise],
    logout: [() => pendingLogout.promise]
  });
  const logoutPromise = pending.context.logout();
  pendingBootstrap.resolve({ member: { id: "member_1" } });
  await flushPromises();
  assert.deepEqual(pending.requestCalls, []);
  pendingLogout.resolve(true);
  assert.equal(await logoutPromise, true);

  const actionLogout = deferred();
  const active = await runToolsClient({
    dashboard: [ACTIVE_DASHBOARD],
    tools: [TEST_LIBRARY],
    logout: [() => actionLogout.promise]
  });
  const copyButton = {
    disabled: false,
    dataset: { toolsAction: "copy", toolsKind: "skill", resourceId: "secret-skill" }
  };
  const downloadButton = {
    disabled: false,
    dataset: { toolsAction: "download", toolsKind: "prompt", resourceId: "secret-prompt" }
  };
  await active.click(copyButton);
  await active.click(downloadButton);
  assert.equal(active.clipboardWrites.length, 1);
  assert.match(active.clipboardWrites[0], /# Secret Skill/);
  assert.deepEqual(active.downloads.map((item) => item.download), ["aix-prompt-secret-prompt.md"]);

  const activeLogout = active.context.logout();
  await active.click(copyButton);
  await active.click(downloadButton);
  assert.equal(active.clipboardWrites.length, 1);
  assert.equal(active.downloads.length, 1);
  actionLogout.resolve(true);
  assert.equal(await activeLogout, true);
});

test("tools client clears premium data at logout start and blocks pending or failed logout races", async () => {
  const pendingTools = deferred();
  const pendingLogout = deferred();
  const pending = await runToolsClient({
    dashboard: [ACTIVE_DASHBOARD],
    tools: [() => pendingTools.promise],
    logout: [() => pendingLogout.promise]
  });
  const logoutPromise = pending.context.logout();
  const duplicateLogoutPromise = pending.context.logout();
  assert.equal(pending.logoutCalls(), 1);
  assert.equal(pending.skillHtml(), "");
  assert.equal(pending.promptHtml(), "");
  pendingTools.resolve(TEST_LIBRARY);
  await flushPromises();
  assert.equal(pending.skillHtml(), "");
  assert.equal(pending.promptHtml(), "");
  pendingLogout.resolve(true);
  assert.equal(await logoutPromise, true);
  assert.equal(await duplicateLogoutPromise, true);
  assert.deepEqual(pending.redirects, ["/index.html"]);

  const logoutError = new Error("network failed");
  const failed = await runToolsClient({
    dashboard: [ACTIVE_DASHBOARD],
    tools: [TEST_LIBRARY],
    logout: [logoutError]
  });
  assert.match(failed.skillHtml(), /Secret Skill/);
  const failedLogout = failed.context.logout();
  const duplicateFailedLogout = failed.context.logout();
  assert.equal(failed.logoutCalls(), 1);
  assert.equal(await failedLogout, false);
  assert.equal(await duplicateFailedLogout, false);
  assert.equal(failed.skillHtml(), "");
  assert.equal(failed.promptHtml(), "");
  assert.deepEqual(failed.redirects, []);
});
