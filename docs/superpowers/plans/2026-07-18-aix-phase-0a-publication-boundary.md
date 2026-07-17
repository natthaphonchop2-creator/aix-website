# AiX Phase 0A Publication Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace repository-wide static serving with one deny-by-default publication policy shared by Express and Cloudflare, while keeping approved public pages working and guarding every private page and API category.

**Architecture:** A CommonJS manifest classifies normalized request paths and resolves only approved files. Express uses it for anonymous assets; explicit routes serve member/admin shells and private scripts. The Cloudflare build imports the same manifest, copies only approved files, and refuses a sensitive output tree.

**Tech Stack:** Node.js 22, Express 5, CommonJS server modules, Node test runner, Cloudflare Workers/Wrangler.

## Global Constraints

- Local repository only; no production deployment, data deletion, credential rotation, CDN purge, or external-system mutation.
- Anonymous marketing pages are limited to `index.html`, `class-detail.html`, their exact root dependencies, `robots.txt`, `sitemap.xml`, and safe image/font assets under `assets/`, `AiX logo/`, and `ai logo/`.
- Safe asset extensions are `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.gif`, `.ico`, `.woff`, `.woff2`, and `.avif`; dotfiles, symlinks, HTML, JavaScript, archives, and documents inside asset directories are denied.
- Sensitive and unknown static paths return `404`, including encoded traversal and direct private `.html` variants.
- Do not restore `express.static(__dirname)` or broad `/uploads` static serving.
- Preserve the Stripe raw-body webhook ordering.
- Before every task commit, update the current Phase 0 entry in `docs/development/UPDATE_LOG.MD` with the task's exact files, commands, results, and unresolved risks; stage only that log and the files listed by the task.

---

## File structure

- Create `security/publication-manifest.cjs`: canonical public root files, safe asset directories/extensions, path normalization, containment-safe resolver.
- Create `tests/helpers/server-harness.mjs`: isolated temporary database/upload server process for HTTP security tests.
- Create `tests/publication-manifest.test.mjs`: unit contracts for path classification and containment.
- Create `tests/publication-boundary.test.mjs`: real HTTP checks for public, private, sensitive, and traversal requests.
- Create `tests/api-route-policy.test.mjs`: explicit method/route authorization matrix checked against `server.js`.
- Create `scripts/prepare-cloudflare-assets.cjs`: safe manifest-driven copy and output scan.
- Create `tests/cloudflare-publication.test.mjs`: temporary and real-output packaging checks.
- Modify `server.js`: remove broad static mounts, add manifest middleware and explicit protected page/asset routes.
- Modify `cloudflare/worker.js`: serve marketing only and fail closed for private/static-preview routes.
- Modify `wrangler.jsonc`: align Worker-first route patterns with the new behavior.
- Modify `package.json`: add test/build scripts without changing runtime dependencies in this plan.
- Modify `docs/development/UPDATE_LOG.MD`: record exact files, commands, results, and remaining risks.

### Task 1: Canonical publication manifest

**Files:**
- Create: `security/publication-manifest.cjs`
- Create: `tests/publication-manifest.test.mjs`

**Interfaces:**
- Consumes: repository root path and URL pathname.
- Produces: `PUBLIC_ROOT_FILES`, `PUBLIC_ASSET_DIRECTORIES`, `SAFE_ASSET_EXTENSIONS`, `classifyPublicPath(pathname)`, and `resolvePublicPath(root, pathname)`.

- [ ] **Step 1: Write the failing manifest tests**

```js
// tests/publication-manifest.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const {
  PUBLIC_ROOT_FILES,
  classifyPublicPath,
  resolvePublicPath
} = require("../security/publication-manifest.cjs");

const root = process.cwd();

test("publishes only approved anonymous root files", () => {
  assert.equal(PUBLIC_ROOT_FILES.has("index.html"), true);
  assert.equal(PUBLIC_ROOT_FILES.has("class-detail.html"), true);
  assert.equal(PUBLIC_ROOT_FILES.has("server.js"), false);
  assert.equal(classifyPublicPath("/styles.css")?.relativePath, "styles.css");
  assert.equal(classifyPublicPath("/dashboard.html"), null);
});

test("allows safe asset extensions and rejects executable or hidden assets", () => {
  assert.equal(classifyPublicPath("/assets/ai-logos/chatgpt.svg")?.kind, "asset");
  assert.equal(classifyPublicPath("/AiX%20logo/iconblack.png")?.kind, "asset");
  assert.equal(classifyPublicPath("/assets/vendor/gsap.min.js"), null);
  assert.equal(classifyPublicPath("/assets/.DS_Store"), null);
});

test("rejects traversal, encoded traversal, backslashes, null bytes, and internal paths", () => {
  for (const pathname of [
    "/../Agent.MD",
    "/%2e%2e/Agent.MD",
    "/assets/%2e%2e/server.js",
    "/assets\\..\\server.js",
    "/assets/logo.png%00.js",
    "/customer_exports/report.md",
    "/docs/Client%20Proposal.pdf"
  ]) assert.equal(classifyPublicPath(pathname), null, pathname);
});

test("resolved files remain contained by the repository root", () => {
  assert.equal(resolvePublicPath(root, "/styles.css"), resolve(root, "styles.css"));
  assert.equal(resolvePublicPath(root, "/../server.js"), null);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/publication-manifest.test.mjs`

Expected: FAIL with `Cannot find module '../security/publication-manifest.cjs'`.

- [ ] **Step 3: Implement the manifest**

```js
// security/publication-manifest.cjs
const path = require("node:path");

const PUBLIC_ROOT_FILES = new Set([
  "index.html",
  "class-detail.html",
  "styles.css",
  "script.js",
  "class-detail.js",
  "site-footer.js",
  "member-resource-glow.css",
  "member-resource-glow.js",
  "google-auth-fix.css",
  "reviews-color-polish.css",
  "robots.txt",
  "sitemap.xml"
]);

const PUBLIC_ASSET_DIRECTORIES = new Set(["assets", "AiX logo", "ai logo"]);
const SAFE_ASSET_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".woff", ".woff2", ".avif"
]);

function decodePathname(pathname) {
  try {
    const decoded = decodeURIComponent(String(pathname || "/"));
    if (decoded.includes("\0") || decoded.includes("\\")) return null;
    return decoded;
  } catch {
    return null;
  }
}

function classifyPublicPath(pathname) {
  const decoded = decodePathname(pathname);
  if (!decoded) return null;
  const raw = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const parts = raw.split("/");
  if (!raw || parts.some((part) => !part || part === "." || part === ".." || part.startsWith("."))) return null;

  if (parts.length === 1 && PUBLIC_ROOT_FILES.has(raw)) {
    return { kind: "root", relativePath: raw };
  }

  if (!PUBLIC_ASSET_DIRECTORIES.has(parts[0])) return null;
  if (!SAFE_ASSET_EXTENSIONS.has(path.posix.extname(raw).toLowerCase())) return null;
  return { kind: "asset", relativePath: raw };
}

function resolvePublicPath(root, pathname) {
  const entry = classifyPublicPath(pathname);
  if (!entry) return null;
  const absoluteRoot = path.resolve(root);
  const candidate = path.resolve(absoluteRoot, entry.relativePath);
  if (candidate !== absoluteRoot && !candidate.startsWith(`${absoluteRoot}${path.sep}`)) return null;
  return candidate;
}

module.exports = {
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRECTORIES,
  SAFE_ASSET_EXTENSIONS,
  classifyPublicPath,
  resolvePublicPath
};
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `node --test tests/publication-manifest.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add security/publication-manifest.cjs tests/publication-manifest.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "security: define public file manifest"
```

### Task 2: Express static and private-page boundary

**Files:**
- Create: `tests/helpers/server-harness.mjs`
- Create: `tests/publication-boundary.test.mjs`
- Modify: `server.js:344-456`
- Modify: `server.js:4024-4085`

**Interfaces:**
- Consumes: `resolvePublicPath(__dirname, req.path)` from Task 1.
- Produces: `serveApprovedPublicFile`, `requireMemberPage`, explicit member/admin asset routes, isolated test server helper.

- [ ] **Step 1: Write the isolated server harness**

```js
// tests/helpers/server-harness.mjs
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

export async function startTestServer(overrides = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), "aix-phase0-"));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AIX_SKIP_LOCAL_ENV: "1",
      NODE_ENV: "test",
      PORT: String(port),
      DATA_DIR: dataDir,
      UPLOAD_DIR: join(dataDir, "uploads"),
      DATABASE_URL: "",
      SUPABASE_DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      APP_ORIGINS: origin,
      AUTH_SECRET: "test-auth-secret-000000000000000000000000",
      CSRF_SECRET: "test-csrf-secret-000000000000000000000000",
      SMS_OTP_SECRET: "test-sms-secret-0000000000000000000000000",
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "correct-horse-battery-staple",
      GOOGLE_CLIENT_ID: "",
      STRIPE_SECRET_KEY: "",
      STRIPE_API_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      OPENAI_API_KEY: "",
      THAIBULKSMS_API_KEY: "",
      THAIBULKSMS_API_SECRET: "",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      TWILIO_FROM_NUMBER: "",
      ...overrides
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Server exited early:\n${output}`);
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {
        return {
          origin,
          dataDir,
          output: () => output,
          async stop() {
            child.kill("SIGTERM");
            await new Promise((resolve) => child.once("exit", resolve));
            await rm(dataDir, { recursive: true, force: true });
          }
        };
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  child.kill("SIGTERM");
  await rm(dataDir, { recursive: true, force: true });
  throw new Error(`Server did not become ready:\n${output}`);
}
```

- [ ] **Step 2: Write failing real-HTTP boundary tests**

```js
// tests/publication-boundary.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { startTestServer } from "./helpers/server-harness.mjs";

test("serves approved public files and hides repository internals", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const pathname of ["/", "/index.html", "/class-detail.html", "/styles.css", "/assets/ai-logos/chatgpt.svg"]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 200, pathname);
  }

  for (const pathname of [
    "/Agent.MD", "/PRODUCT.md", "/package.json", "/server.js", "/data.db",
    "/customer_exports/example.md", "/docs/Client%20Proposal.pdf", "/tmp/log.txt",
    "/dashboard.html", "/tools-box.html", "/course-content.html", "/uploads/replays/example.mp4",
    "/assets/vendor/gsap.min.js", "/assets/%2e%2e/server.js"
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.equal(response.status, 404, pathname);
  }
});

test("guards canonical member routes and direct private scripts", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  for (const pathname of ["/dashboard", "/tools-box", "/payment", "/course/manus-ai/start", "/live/demo", "/dashboard.js", "/tools-box.js"]) {
    const response = await fetch(`${server.origin}${pathname}`, { redirect: "manual" });
    assert.ok([302, 404].includes(response.status), `${pathname}: ${response.status}`);
  }
  assert.equal((await fetch(`${server.origin}/admin.html`, { redirect: "manual" })).status, 308);
});
```

- [ ] **Step 3: Run the HTTP tests and verify the known leaks fail**

Run: `node --test tests/publication-boundary.test.mjs`

Expected: FAIL because `/Agent.MD`, private `.html` files, `/uploads`, or private scripts return `200`.

- [ ] **Step 4: Replace broad static middleware with the manifest boundary**

```js
// server.js imports and environment loader
const { resolvePublicPath } = require("./security/publication-manifest.cjs");

function loadLocalEnv() {
  if (process.env.AIX_SKIP_LOCAL_ENV === "1") return;
  [".env", ".env.local"].forEach((filename) => {
    const envPath = path.join(__dirname, filename);
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return;
      const key = match[1];
      const value = match[2].replace(/^["']|["']$/g, "");
      if (process.env[key] === undefined || filename === ".env.local") process.env[key] = value;
    });
  });
}

function serveApprovedPublicFile(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const filename = resolvePublicPath(__dirname, req.path);
  if (!filename || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) return next();
  return res.sendFile(filename, { dotfiles: "deny" });
}

// Keep the Stripe webhook before JSON parsing, then:
app.use(serveApprovedPublicFile);
// Delete app.use('/uploads', express.static(UPLOAD_ROOT));
// Delete app.use(express.static(path.join(__dirname)));
// Delete the static filename blocklist; deny-by-default replaces it.
```

```js
// server.js private page/asset routes, placed after auth helpers are defined
const MEMBER_PAGE_ASSETS = [
  "dashboard.js", "tools-box.js", "live-class.js", "payment.js", "payment-success.js",
  "course-start.js", "course-content.js", "course-learn.js"
];

function requireMemberPage(req, res, next) {
  if (!hasValidMemberSession(req)) return res.redirect("/index.html?auth=login");
  next();
}

for (const filename of MEMBER_PAGE_ASSETS) {
  app.get(`/${filename}`, requireMemberPage, (req, res) => {
    res.sendFile(path.join(__dirname, filename));
  });
}

app.get("/admin.html", (req, res) => res.redirect(308, "/admin"));
app.get("/admin.css", (req, res) => res.sendFile(path.join(__dirname, "admin.css")));
app.get("/admin.js", (req, res) => res.sendFile(path.join(__dirname, "admin.js")));

app.get("/dashboard", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "dashboard.html")));
app.get("/tools-box", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "tools-box.html")));
app.get("/live/:id", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "live-class.html")));
app.get("/payment", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "payment.html")));
app.get("/payment/success", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "payment-success.html")));
app.get("/payment/cancel", requireMemberPage, (req, res) => res.redirect("/payment?cancelled=1"));
app.get("/course/:id/start", requireMemberPage, (req, res) => res.sendFile(path.join(__dirname, "course-start.html")));
app.get("/course/:id/content", requireMemberPage, (req, res) => {
  if (req.query.ready !== "1") return res.redirect(`/course/${encodeURIComponent(req.params.id)}/start`);
  res.sendFile(path.join(__dirname, "course-content.html"));
});
app.get("/course/:id/learn", requireMemberPage, (req, res) => {
  if (req.query.ready !== "1") return res.redirect(`/course/${encodeURIComponent(req.params.id)}/start`);
  res.sendFile(path.join(__dirname, "course-learn.html"));
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" });
  res.sendStatus(404);
});
```

- [ ] **Step 5: Run manifest, HTTP, and existing homepage contracts**

Run: `node --test tests/publication-manifest.test.mjs tests/publication-boundary.test.mjs tests/homepage-contract.test.mjs`

Expected: all tests pass; the existing homepage suite remains 32/32 or its new total with 0 failures.

- [ ] **Step 6: Commit**

```bash
git add server.js tests/helpers/server-harness.mjs tests/publication-boundary.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "security: deny unlisted static files"
```

### Task 3: Explicit API authorization matrix

**Files:**
- Create: `tests/api-route-policy.test.mjs`
- Modify: `server.js` only if a route lacks its required middleware.

**Interfaces:**
- Consumes: every literal `app.get/post/put/delete/patch('/api/...')` declaration in `server.js`.
- Produces: one exhaustive `API_ROUTE_POLICIES` object whose flattened entries exactly match the source route set.

- [ ] **Step 1: Write the failing exhaustive policy test**

```js
// tests/api-route-policy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("server.js", "utf8");
const API_ROUTE_POLICIES = {
  publicRead: [
    "GET /api/health", "GET /api/config", "GET /api/platform/courses", "GET /api/platform/courses/:id"
  ],
  publicAuth: [
    "POST /api/auth/google", "POST /api/auth/google-access-token", "POST /api/members/otp/send",
    "POST /api/members/otp/verify", "POST /api/members/register", "POST /api/members/login",
    "POST /api/admin/login"
  ],
  signedWebhook: ["POST /api/stripe/webhook"],
  member: [
    "GET /api/auth/me", "POST /api/auth/logout", "GET /api/member/dashboard",
    "GET /api/member/schedules/:id", "GET /api/member/notifications",
    "POST /api/member/notifications/:id/read", "POST /api/member/progress",
    "GET /api/member/payments", "POST /api/member/phone/otp/send",
    "POST /api/member/phone/otp/verify", "GET /api/payments/config",
    "POST /api/payments/stripe/checkout", "GET /api/payments/stripe/session/:sessionId",
    "POST /api/payments/confirm", "GET /api/courses/:id/content",
    "POST /api/courses/:id/teacher-chat"
  ],
  admin: [
    "GET /api/members", "GET /api/members/:id", "PUT /api/members/:id", "DELETE /api/members/:id",
    "GET /api/courses", "GET /api/courses/:id", "POST /api/courses", "PUT /api/courses/:id", "DELETE /api/courses/:id",
    "GET /api/admin/replays", "POST /api/admin/replays", "PUT /api/admin/replays/:id", "DELETE /api/admin/replays/:id",
    "GET /api/admin/resources", "POST /api/admin/resources", "PUT /api/admin/resources/:id", "DELETE /api/admin/resources/:id",
    "GET /api/admin/schedules", "POST /api/admin/schedules", "PUT /api/admin/schedules/:id", "DELETE /api/admin/schedules/:id",
    "POST /api/admin/schedules/:id/notify", "GET /api/leads", "POST /api/leads", "PUT /api/leads/:id", "DELETE /api/leads/:id",
    "GET /api/users", "GET /api/users/:id", "PUT /api/users/:id", "DELETE /api/users/:id", "POST /api/users/:id/enroll",
    "GET /api/packages", "PUT /api/packages/:id", "GET /api/stats"
  ],
  disabled: ["POST /api/auth/signup", "POST /api/auth/login"]
};

function declaredRoutes() {
  return [...source.matchAll(/app\.(get|post|put|patch|delete)\('([^']+)'/g)]
    .filter((match) => match[2].startsWith("/api/"))
    .map((match) => `${match[1].toUpperCase()} ${match[2]}`)
    .sort();
}

test("every API route has exactly one policy", () => {
  const policyRoutes = Object.values(API_ROUTE_POLICIES).flat().sort();
  assert.deepEqual(policyRoutes, declaredRoutes());
  assert.equal(new Set(policyRoutes).size, policyRoutes.length);
});

test("member and admin declarations include their auth middleware", () => {
  for (const route of API_ROUTE_POLICIES.member) {
    const [method, path] = route.split(" ");
    assert.match(source, new RegExp(`app\\.${method.toLowerCase()}\\('${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}',\\s*requireMemberSession`));
  }
  for (const route of API_ROUTE_POLICIES.admin) {
    const [method, path] = route.split(" ");
    assert.match(source, new RegExp(`app\\.${method.toLowerCase()}\\('${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}',\\s*requireAdminSession`));
  }
});

test("anonymous config and course projections contain no protected fields", async (t) => {
  const { startTestServer } = await import("./helpers/server-harness.mjs");
  const server = await startTestServer();
  t.after(() => server.stop());
  const config = await (await fetch(`${server.origin}/api/config`)).json();
  assert.deepEqual(Object.keys(config).sort(), [
    "googleClientId", "googleReady", "memberPrice", "sessionTtlDays",
    "smsProvider", "smsReady", "stripePaymentMethods", "stripeReady"
  ].sort());
  const courses = await (await fetch(`${server.origin}/api/platform/courses`)).json();
  for (const course of courses) {
    for (const field of ["filePath", "videoUrl", "meetingUrl", "passwordHash", "googleSub", "members", "resources", "replays"]) {
      assert.equal(field in course, false, `${course.id}:${field}`);
    }
  }
});
```

- [ ] **Step 2: Run the test and verify any classification drift**

Run: `node --test tests/api-route-policy.test.mjs`

Expected: FAIL until the matrix matches every current route and `/api/auth/logout` is protected by `requireMemberSession`.

- [ ] **Step 3: Make the minimum route middleware corrections**

```js
// Required correction in server.js; later plans add CSRF inside requireMemberSession.
app.post("/api/auth/logout", requireMemberSession, (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
```

Keep the matrix literal exhaustive. If the source contains a route not listed above, classify it explicitly instead of weakening the equality assertion.

- [ ] **Step 4: Run the policy and HTTP suites**

Run: `node --test tests/api-route-policy.test.mjs tests/publication-boundary.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server.js tests/api-route-policy.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "test: enforce API authorization matrix"
```

### Task 4: Manifest-driven Cloudflare package

**Files:**
- Create: `scripts/prepare-cloudflare-assets.cjs`
- Create: `tests/cloudflare-publication.test.mjs`
- Modify: `package.json`
- Modify: `cloudflare/worker.js`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: all exports from `security/publication-manifest.cjs`.
- Produces: `prepareCloudflareAssets(root, destination)` and `assertSafePreparedTree(destination)`.

- [ ] **Step 1: Write failing packaging tests**

```js
// tests/cloudflare-publication.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { prepareCloudflareAssets } = require("../scripts/prepare-cloudflare-assets.cjs");

test("copies approved files and excludes sensitive or executable asset files", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "aix-cf-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "assets", "vendor"), { recursive: true });
  await writeFile(join(root, "index.html"), "public");
  await writeFile(join(root, "server.js"), "secret");
  await writeFile(join(root, "assets", "logo.png"), "image");
  await writeFile(join(root, "assets", "vendor", "bad.js"), "code");
  const destination = join(root, "cloudflare", "assets");
  await prepareCloudflareAssets(root, destination);
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "public");
  await assert.rejects(readFile(join(destination, "server.js")));
  await assert.rejects(readFile(join(destination, "assets", "vendor", "bad.js")));
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/cloudflare-publication.test.mjs`

Expected: FAIL because the prepare script does not exist.

- [ ] **Step 3: Implement safe copy and output scanning**

```js
// scripts/prepare-cloudflare-assets.cjs
const fs = require("node:fs/promises");
const path = require("node:path");
const {
  PUBLIC_ROOT_FILES,
  PUBLIC_ASSET_DIRECTORIES,
  classifyPublicPath
} = require("../security/publication-manifest.cjs");

async function copySafeDirectory(root, destination, directory) {
  const sourceBase = path.join(root, directory);
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || entry.name.startsWith(".")) continue;
      const source = path.join(current, entry.name);
      const relative = path.relative(root, source).split(path.sep).join("/");
      if (entry.isDirectory()) await walk(source);
      else if (entry.isFile() && classifyPublicPath(`/${relative}`)) {
        const target = path.join(destination, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
      }
    }
  }
  try { await walk(sourceBase); } catch (error) { if (error.code !== "ENOENT") throw error; }
}

async function assertSafePreparedTree(destination) {
  async function walk(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = path.relative(destination, full).split(path.sep).join("/");
      if (entry.isSymbolicLink()) throw new Error(`Symlink in Cloudflare assets: ${relative}`);
      if (entry.isDirectory()) await walk(full);
      else if (!classifyPublicPath(`/${relative}`)) throw new Error(`Unlisted Cloudflare asset: ${relative}`);
    }
  }
  await walk(destination);
}

async function prepareCloudflareAssets(root, destination) {
  const resolvedRoot = path.resolve(root);
  const resolvedDestination = path.resolve(destination);
  const expected = path.join(resolvedRoot, "cloudflare", "assets");
  if (resolvedDestination !== expected) throw new Error(`Unsafe Cloudflare destination: ${resolvedDestination}`);
  await fs.rm(resolvedDestination, { recursive: true, force: true });
  await fs.mkdir(resolvedDestination, { recursive: true });
  for (const filename of PUBLIC_ROOT_FILES) {
    const source = path.join(resolvedRoot, filename);
    try { await fs.copyFile(source, path.join(resolvedDestination, filename)); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (const directory of PUBLIC_ASSET_DIRECTORIES) {
    await copySafeDirectory(resolvedRoot, resolvedDestination, directory);
  }
  await assertSafePreparedTree(resolvedDestination);
}

if (require.main === module) {
  prepareCloudflareAssets(process.cwd(), path.join(process.cwd(), "cloudflare", "assets"))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { prepareCloudflareAssets, assertSafePreparedTree };
```

- [ ] **Step 4: Replace the rsync script and fail closed in the Worker**

```json
// package.json scripts
{
  "test": "node --test tests/*.test.mjs",
  "test:security": "node --test tests/publication-manifest.test.mjs tests/publication-boundary.test.mjs tests/api-route-policy.test.mjs tests/cloudflare-publication.test.mjs",
  "cf:prepare": "node scripts/prepare-cloudflare-assets.cjs"
}
```

```js
// cloudflare/worker.js route behavior
const PRIVATE_PATH = /^(?:\/admin(?:\/|$)|\/dashboard(?:\/|$)|\/tools-box(?:\/|$)|\/live(?:\/|$)|\/payment(?:\/|$)|\/course\/[^/]+\/(?:start|content|learn)(?:\/|$))/;

if (pathname === "/login" || pathname === "/register") {
  const mode = pathname === "/login" ? "login" : "signup";
  return Response.redirect(new URL(`/index.html?auth=${mode}`, url), 302);
}
if (PRIVATE_PATH.test(pathname)) {
  return json({ error: "Private AiX routes require the Node application origin." }, { status: 503 });
}
if (pathname.startsWith("/api/")) {
  return json({ error: "API unavailable in static preview." }, { status: 503 });
}
return env.ASSETS.fetch(request);
```

Remove private HTML asset mappings from `HTML_ROUTES`; none of those files exist in the prepared tree. Keep Worker-first patterns for `/api/*`, login/register, and private route prefixes so they receive the deny-by-default response instead of asset fallback.

- [ ] **Step 5: Run package and dry-run verification**

Run: `node --test tests/cloudflare-publication.test.mjs && npm run cf:check`

Expected: tests pass; Wrangler dry run exits 0; `cloudflare/assets` contains no private HTML/JS, package files, source, databases, customer exports, docs, tests, tmp, or uploads.

- [ ] **Step 6: Update the log and commit**

Record all commands and actual counts in `docs/development/UPDATE_LOG.MD`, then:

```bash
git add package.json cloudflare/worker.js wrangler.jsonc scripts/prepare-cloudflare-assets.cjs tests/cloudflare-publication.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "build: publish only approved Cloudflare assets"
```

## Plan 0A completion gate

Run:

```bash
npm test
npm run cf:check
git diff --check
```

Expected:

- All tests pass.
- Anonymous `GET` requests for seeded sensitive paths return `404`.
- Canonical private routes redirect unauthenticated users; direct private `.html` and script requests cannot bypass the guard.
- Cloudflare output contains only manifest-approved files.
- No production or external state changed.
