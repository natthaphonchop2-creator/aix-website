# AiX Phase 0C Protected Content Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect uploaded replay/resource files and premium tools, validate every upload, render server content safely, apply browser security headers, and finish Phase 0 with patched dependencies and integrated browser/security verification.

**Architecture:** Multer writes to an upload-root staging directory under route-specific limits; a pure upload-policy module verifies extension and content signature before atomic placement. Member projections expose opaque protected-media URLs, never filesystem paths. Premium tools move to a server-only content module. A small UMD DOM helper provides safe URLs and text-node construction across public/member/admin renderers.

**Tech Stack:** Node.js 22, Express 5, Multer 2.2.0, Helmet 8.3.0, Wrangler 4.112.0, Node streams, Node test runner, existing browser JavaScript.

## Global Constraints

- Complete Plans 0A and 0B first; this plan consumes their publication manifest, cookie sessions, CSRF protection, and test harness.
- Local repository only; no production deployment, production upload access, customer-data mutation, CDN purge, or external API mutation.
- Remove the public `/uploads` mount permanently.
- Replay uploads: MP4 or WebM, maximum 500 MB.
- Resource uploads: PDF, ZIP, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPEG, or WebP, maximum 50 MB.
- Reject HTML, SVG, executable/script formats, mismatched signatures/extensions, traversal, dotfiles, and double-extension disguises.
- Rejected, failed, and aborted uploads leave no staging file or database row.
- Media lookup uses an opaque database ID; member access requires an active paid membership; admin access uses the admin cookie.
- Replay delivery supports valid byte ranges; resources use attachment disposition and a server-defined content type.
- Public/member projections never contain internal `filePath` values.
- Server-originated strings are inserted through `textContent`, DOM construction, or safe URL setters; no product rich-text feature is added in Phase 0.
- CSP starts in report-only mode and must not contain `unsafe-eval`.
- Dependency target: zero known high or critical vulnerabilities; do not use `npm audit fix --force`.
- Before every task commit, update the current Phase 0 entry in `docs/development/UPDATE_LOG.MD` with exact files, commands, results, audit output, and unresolved risks; stage that log with the task files.

---

## File structure

- Create `security/upload-policy.cjs`: route policies, staging names, magic-byte detection, containment, validation, atomic placement, safe deletion.
- Create `security/media-delivery.cjs`: range parsing, content headers, contained streaming helpers.
- Create `tests/upload-policy.test.mjs` and `tests/protected-media.test.mjs`.
- Create `content/tools-library.cjs`: premium skill/prompt records moved out of public JavaScript.
- Create `tests/tools-protection.test.mjs`.
- Create `safe-dom.js`: UMD `AiXDom` helper for safe URLs, nodes, attributes, and replacement.
- Create `tests/safe-dom.test.mjs` and `tests/safe-render-contract.test.mjs`.
- Create `security/browser-headers.cjs` and `tests/browser-headers.test.mjs`.
- Modify `server.js`: route-specific uploads, protected delivery, tools API, projections, Helmet/report-only CSP.
- Modify `admin.js`, `dashboard.js`, `tools-box.js`, `course-content.js`, `course-learn.js`, `class-detail.js`, and `script.js`: consume opaque URLs and safe DOM helpers.
- Modify the corresponding HTML pages: load `safe-dom.js` before page code.
- Modify `security/publication-manifest.cjs`: publish `safe-dom.js`.
- Modify `package.json` and `package-lock.json`: exact patched dependencies and test scripts.
- Modify `docs/development/UPDATE_LOG.MD`: final evidence, audit result, browser matrix, and unresolved lower-severity items.

### Task 1: Upload validation and safe file lifecycle

**Files:**
- Create: `security/upload-policy.cjs`
- Create: `tests/upload-policy.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `UPLOAD_POLICIES`, `safeUploadFilename`, `resolveInside`, `validateStagedUpload(file, policy)`, `placeStagedUpload(file, directory)`, and `removeContainedFile(root, relativePath)`.

- [ ] **Step 1: Upgrade Multer before exercising upload code**

Run: `npm install multer@2.2.0`

Expected: package records `^2.2.0`; install succeeds without `--force`.

- [ ] **Step 2: Write failing upload-policy tests**

```js
// tests/upload-policy.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { UPLOAD_POLICIES, validateStagedUpload, placeStagedUpload, resolveInside } = require("../security/upload-policy.cjs");

test("accepts matching PDF and rejects HTML disguised as PDF", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "aix-upload-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const good = join(root, "good.pdf");
  const bad = join(root, "bad.pdf");
  await writeFile(good, Buffer.from("%PDF-1.7\n"));
  await writeFile(bad, Buffer.from("<html><script>alert(1)</script>"));
  await assert.doesNotReject(validateStagedUpload({ path: good, originalname: "guide.pdf", size: 9 }, UPLOAD_POLICIES.resource));
  await assert.rejects(validateStagedUpload({ path: bad, originalname: "guide.pdf", size: 36 }, UPLOAD_POLICIES.resource), /signature/i);
});

test("accepts MP4/WebM signatures and rejects mismatched or oversized video", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "aix-video-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const mp4 = join(root, "clip.mp4");
  await writeFile(mp4, Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]));
  await assert.doesNotReject(validateStagedUpload({ path: mp4, originalname: "clip.mp4", size: 12 }, UPLOAD_POLICIES.replay));
  await assert.rejects(validateStagedUpload({ path: mp4, originalname: "clip.webm", size: 12 }, UPLOAD_POLICIES.replay), /signature/i);
  await assert.rejects(validateStagedUpload({ path: mp4, originalname: "clip.mp4", size: 500 * 1024 * 1024 + 1 }, UPLOAD_POLICIES.replay), /size/i);
});

test("rejects dangerous names and path escapes", async () => {
  for (const name of ["payload.html", "image.svg", "guide.pdf.exe", "guide.exe.pdf", ".hidden.pdf", "../guide.pdf"]) {
    await assert.rejects(validateStagedUpload({ path: "/nonexistent", originalname: name, size: 1 }, UPLOAD_POLICIES.resource));
  }
  assert.equal(resolveInside("/safe/root", "../escape"), null);
});

test("atomically places a validated staged file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "aix-place-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const staged = join(root, "staged.tmp");
  await writeFile(staged, "%PDF-1.7\n");
  const placed = await placeStagedUpload({ path: staged, originalname: "guide.pdf" }, join(root, "resources"));
  assert.equal(await readFile(placed.absolutePath, "utf8"), "%PDF-1.7\n");
  assert.match(placed.filename, /^[0-9]+-[a-f0-9]{8}-guide\.pdf$/);
});
```

- [ ] **Step 3: Run tests and verify failure**

Run: `node --test tests/upload-policy.test.mjs`

Expected: FAIL because the upload-policy module is absent.

- [ ] **Step 4: Implement signatures, containment, and lifecycle**

```js
// security/upload-policy.cjs
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const MB = 1024 * 1024;
const UPLOAD_POLICIES = {
  replay: { maxBytes: 500 * MB, extensions: new Set([".mp4", ".webm"]) },
  resource: { maxBytes: 50 * MB, extensions: new Set([".pdf", ".zip", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".webp"]) }
};
const DANGEROUS_EXTENSION = /\.(?:html?|svg|js|mjs|cjs|exe|dll|sh|bat|cmd|com|scr|php|jar)$/i;
const DANGEROUS_PART = new Set(["html", "htm", "svg", "js", "mjs", "cjs", "exe", "dll", "sh", "bat", "cmd", "com", "scr", "php", "jar"]);

function resolveInside(root, relative) {
  const absoluteRoot = path.resolve(root);
  const candidate = path.resolve(absoluteRoot, relative);
  return candidate.startsWith(`${absoluteRoot}${path.sep}`) ? candidate : null;
}

function safeUploadFilename(originalName) {
  const clean = path.basename(String(originalName || ""));
  const extension = path.extname(clean).toLowerCase();
  const base = path.basename(clean, extension).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "file";
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${base}${extension}`;
}

function signature(buffer) {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return ".pdf";
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return ".zip";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return ".webp";
  if (buffer.subarray(4, 8).toString() === "ftyp") return ".mp4";
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return ".webm";
  return "";
}

async function validateStagedUpload(file, policy) {
  const original = String(file?.originalname || "");
  const base = path.basename(original);
  const extension = path.extname(base).toLowerCase();
  const innerParts = base.toLowerCase().split(".").slice(0, -1);
  if (!base || base !== original || base.startsWith(".") || DANGEROUS_EXTENSION.test(base) || innerParts.some((part) => DANGEROUS_PART.has(part)) || !policy.extensions.has(extension)) throw new Error("Upload extension is not allowed");
  if (Number(file.size || 0) > policy.maxBytes) throw new Error("Upload size exceeds policy");
  const handle = await fs.open(file.path, "r");
  const buffer = Buffer.alloc(4100);
  const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
  await handle.close();
  const head = buffer.subarray(0, bytesRead);
  const detected = signature(head);
  const zipOffice = new Set([".zip", ".docx", ".xlsx", ".pptx"]);
  if ([".txt", ".csv"].includes(extension)) {
    new TextDecoder("utf-8", { fatal: true }).decode(head);
    if (/^\s*</.test(head.toString("utf8"))) throw new Error("Upload signature looks like markup");
  } else if (zipOffice.has(extension)) {
    if (detected !== ".zip") throw new Error("Upload signature does not match ZIP/Office format");
  } else if (detected !== (extension === ".jpeg" ? ".jpg" : extension)) {
    throw new Error("Upload signature does not match extension");
  }
  return { extension, detected };
}

async function placeStagedUpload(file, directory) {
  await fs.mkdir(directory, { recursive: true });
  const filename = safeUploadFilename(file.originalname);
  const absolutePath = path.join(directory, filename);
  await fs.rename(file.path, absolutePath);
  return { filename, absolutePath };
}

async function removeContainedFile(root, relativePath) {
  const absolute = resolveInside(root, relativePath);
  if (!absolute) return false;
  await fs.rm(absolute, { force: true });
  return true;
}

module.exports = { UPLOAD_POLICIES, safeUploadFilename, resolveInside, validateStagedUpload, placeStagedUpload, removeContainedFile };
```

- [ ] **Step 5: Run tests and audit direct Multer finding**

Run: `node --test tests/upload-policy.test.mjs && npm audit --omit=dev`

Expected: upload tests pass; no high/critical production dependency finding for Multer.

- [ ] **Step 6: Commit**

```bash
git add security/upload-policy.cjs tests/upload-policy.test.mjs package.json package-lock.json docs/development/UPDATE_LOG.MD
git commit -m "security: validate staged uploads"
```

### Task 2: Protected media routes and opaque projections

**Files:**
- Create: `security/media-delivery.cjs`
- Create: `tests/protected-media.test.mjs`
- Modify: `server.js:2874-2910`
- Modify: `server.js:3240-3728`
- Modify: `dashboard.js`, `tools-box.js`, `course-content.js`, `course-learn.js`, `admin.js`.
- Modify: `tests/api-route-policy.test.mjs`.

**Interfaces:**
- Produces: `/api/media/replays/:id` and `/api/media/resources/:id`.
- Member replay/resource projections expose `mediaUrl`; admin projections expose `hasUpload` and the same protected preview URL, never `filePath`.
- Produces: `parseByteRange(header, size)` and `streamMedia(req, res, options)`.

- [ ] **Step 1: Write failing range/unit tests and HTTP authorization tests**

```js
// tests/protected-media.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const { parseByteRange } = require("../security/media-delivery.cjs");

test("parses one bounded byte range", () => {
  assert.deepEqual(parseByteRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseByteRange("bytes=900-", 1000), { start: 900, end: 999 });
  assert.equal(parseByteRange("bytes=1000-1001", 1000), null);
  assert.equal(parseByteRange("bytes=0-1,4-5", 1000), null);
});

test("anonymous and retired bearer requests cannot fetch media", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  assert.equal((await fetch(`${server.origin}/api/media/replays/missing`)).status, 401);
  assert.equal((await fetch(`${server.origin}/api/media/resources/missing`, { headers: { Authorization: "Bearer leaked" } })).status, 401);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test tests/protected-media.test.mjs`

Expected: FAIL because the media module/routes are absent.

- [ ] **Step 3: Implement contained range delivery**

```js
// security/media-delivery.cjs
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

function parseByteRange(header, size) {
  const match = String(header || "").match(/^bytes=(\d+)-(\d*)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start || end >= size) return null;
  return { start, end };
}

async function streamMedia(req, res, { absolutePath, contentType, disposition = "inline", downloadName }) {
  const stat = await fsp.stat(absolutePath);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(path.basename(downloadName || absolutePath))}`);
  if (!req.get("range")) {
    res.setHeader("Content-Length", stat.size);
    return fs.createReadStream(absolutePath).pipe(res);
  }
  const range = parseByteRange(req.get("range"), stat.size);
  if (!range) { res.setHeader("Content-Range", `bytes */${stat.size}`); return res.sendStatus(416); }
  res.status(206);
  res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
  res.setHeader("Content-Length", range.end - range.start + 1);
  return fs.createReadStream(absolutePath, range).pipe(res);
}

module.exports = { parseByteRange, streamMedia };
```

- [ ] **Step 4: Replace upload middleware and add protected routes**

In `server.js`, create separate staging Multer instances with `limits.fileSize`, `limits.fields`, and `limits.fieldNameSize`; their disk destination is `${UPLOAD_ROOT}/.staging`. Wrap each upload middleware so Multer errors and aborted requests remove `req.file.path` before returning.

```js
const replayUpload = multer({ storage: stagingStorage, limits: { fileSize: 500 * 1024 * 1024, fields: 20, fieldNameSize: 100 } }).single("video");
const resourceUpload = multer({ storage: stagingStorage, limits: { fileSize: 50 * 1024 * 1024, fields: 20, fieldNameSize: 100 } }).single("file");

async function finalizeUpload(file, policy, directory) {
  if (!file) return null;
  try {
    await validateStagedUpload(file, policy);
    return await placeStagedUpload(file, directory);
  } catch (error) {
    await fs.promises.rm(file.path, { force: true });
    throw error;
  }
}
```

Convert replay/resource create/update handlers to `async`. Validate course/title/body first after Multer parsing, validate/place the new file, perform the database insert/update, then delete the previous contained file only after the database succeeds. On a database error, delete the newly placed file. Delete handlers remove the database row first, then remove the contained old file.

Add opaque projections:

```js
function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
}

function memberReplay(replay) {
  const item = publicReplay(replay);
  return { ...item, videoUrl: replay.filePath ? `/api/media/replays/${encodeURIComponent(replay.id)}` : safeExternalUrl(replay.videoUrl), mediaUrl: replay.filePath ? `/api/media/replays/${encodeURIComponent(replay.id)}` : "" };
}
function memberResource(resource) {
  const item = publicResource(resource);
  return { ...item, url: resource.filePath ? `/api/media/resources/${encodeURIComponent(resource.id)}` : safeExternalUrl(resource.url), mediaUrl: resource.filePath ? `/api/media/resources/${encodeURIComponent(resource.id)}` : "" };
}
```

Remove `filePath` from `publicReplay` and `publicResource`. Add admin-only `hasUpload: Boolean(row.filePath)`.

Add these exact authorization and path helpers before the media routes:

```js
function allowMediaSession(req, res, next) {
  const adminSession = SESSION_SECURITY.readAdmin(req);
  if (adminSession && adminSession.email === ADMIN_EMAIL) {
    req.mediaRole = "admin";
    return next();
  }
  const memberSession = SESSION_SECURITY.readMember(req);
  if (!memberSession) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
  const member = db.prepare("SELECT * FROM members WHERE id = ?").get(memberSession.sub);
  try { assertLoginAllowed(member); } catch (error) { return res.status(401).json({ error: error.message }); }
  if (!memberAccess(member).active) return res.status(403).json({ error: "สมาชิกยังไม่มีสิทธิ์เข้าถึงไฟล์นี้" });
  req.mediaRole = "member";
  req.member = member;
  next();
}

function resolveStoredUpload(filePath) {
  const prefix = "/uploads/";
  if (!String(filePath || "").startsWith(prefix)) return null;
  return resolveInside(UPLOAD_ROOT, String(filePath).slice(prefix.length));
}

function contentTypeFor(filePath) {
  return ({
    ".pdf": "application/pdf", ".zip": "application/zip",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv; charset=utf-8", ".txt": "text/plain; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"
  })[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}
```

```js
app.get("/api/media/replays/:id", allowMediaSession, async (req, res) => {
  const replay = db.prepare("SELECT * FROM course_replays WHERE id = ?").get(req.params.id);
  if (!replay?.filePath) return res.sendStatus(404);
  const absolutePath = resolveStoredUpload(replay.filePath);
  if (!absolutePath) return res.sendStatus(404);
  await streamMedia(req, res, { absolutePath, contentType: replay.filePath.endsWith(".webm") ? "video/webm" : "video/mp4", downloadName: replay.title });
});

app.get("/api/media/resources/:id", allowMediaSession, async (req, res) => {
  const resource = db.prepare("SELECT * FROM member_resources WHERE id = ?").get(req.params.id);
  if (!resource?.filePath) return res.sendStatus(404);
  const absolutePath = resolveStoredUpload(resource.filePath);
  if (!absolutePath) return res.sendStatus(404);
  await streamMedia(req, res, { absolutePath, contentType: contentTypeFor(resource.filePath), disposition: "attachment", downloadName: resource.fileName || resource.title });
});
```

Update dashboard/tools/course/admin clients to use `mediaUrl`, `url`, or `videoUrl`; delete every fallback to `filePath`.

Add a `protectedMedia` group to `API_ROUTE_POLICIES`:

```js
protectedMedia: ["GET /api/media/replays/:id", "GET /api/media/resources/:id"]
```

Add this policy assertion:

```js
for (const route of API_ROUTE_POLICIES.protectedMedia) {
  const [method, routePath] = route.split(" ");
  const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(source, new RegExp(`app\\.${method.toLowerCase()}\\('${escaped}',\\s*allowMediaSession`));
}
```

- [ ] **Step 5: Complete real paid-member range and cleanup fixtures**

Add the following imports and test to `tests/protected-media.test.mjs`:

```js
import { DatabaseSync } from "node:sqlite";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

test("paid member receives a bounded replay range and rejected upload leaves no file or row", async (t) => {
  const server = await startTestServer({
    ADMIN_EMAIL: "owner@example.com",
    ADMIN_PASSWORD: "correct-horse-battery-staple"
  });
  t.after(() => server.stop());
  const origin = server.origin;

  const registration = await fetch(`${origin}/api/members/register`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Media Test", email: "media@example.com", phone: "0865432109",
      password: "member-pass-987", passwordConfirm: "member-pass-987"
    })
  });
  assert.equal(registration.status, 200);
  const memberCookie = registration.headers.getSetCookie().find((value) => value.startsWith("aix_member_session="))?.split(";")[0];
  assert.ok(memberCookie);

  const database = new DatabaseSync(join(server.dataDir, "data.db"));
  database.prepare("UPDATE members SET paymentStatus = 'paid', expiresAt = ? WHERE email = ?")
    .run("2099-12-31T00:00:00.000Z", "media@example.com");
  const courseId = database.prepare("SELECT id FROM courses ORDER BY id LIMIT 1").get().id;
  const replayDirectory = join(server.dataDir, "uploads", "replays");
  await mkdir(replayDirectory, { recursive: true });
  await writeFile(join(replayDirectory, "replay-test.mp4"), Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]));
  database.prepare("INSERT INTO course_replays (id, courseId, title, filePath) VALUES (?, ?, ?, ?)")
    .run("replay_test", courseId, "Replay Test", "/uploads/replays/replay-test.mp4");
  database.close();

const rangeResponse = await fetch(`${server.origin}/api/media/replays/replay_test`, {
  headers: { Cookie: memberCookie, Range: "bytes=0-3" }
});
assert.equal(rangeResponse.status, 206);
assert.equal(rangeResponse.headers.get("content-range"), "bytes 0-3/12");
assert.equal((await rangeResponse.arrayBuffer()).byteLength, 4);

  const adminLogin = await fetch(`${origin}/api/admin/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "owner@example.com", password: "correct-horse-battery-staple" })
  });
  assert.equal(adminLogin.status, 200);
  const adminBody = await adminLogin.json();
  const adminCookie = adminLogin.headers.getSetCookie().find((value) => value.startsWith("aix_admin_session="))?.split(";")[0];
  const invalidForm = new FormData();
  invalidForm.set("courseId", courseId);
  invalidForm.set("title", "Disguised HTML");
  invalidForm.set("file", new Blob(["<html><script>alert(1)</script></html>"], { type: "application/pdf" }), "guide.pdf");
  const rejected = await fetch(`${origin}/api/admin/resources`, {
    method: "POST",
    headers: { Origin: origin, Cookie: adminCookie, "X-CSRF-Token": adminBody.csrfToken },
    body: invalidForm
  });
  assert.equal(rejected.status, 400);

  const check = new DatabaseSync(join(server.dataDir, "data.db"));
  assert.equal(check.prepare("SELECT COUNT(*) AS count FROM member_resources WHERE title = ?").get("Disguised HTML").count, 0);
  check.close();
  const staged = await readdir(join(server.dataDir, "uploads", ".staging")).catch(() => []);
  assert.deepEqual(staged, []);
});
```

Before the final database/staging assertions in the same test, add:

```js
const validForm = new FormData();
validForm.set("courseId", courseId);
validForm.set("title", "Valid PDF");
validForm.set("file", new Blob(["%PDF-1.7\n"], { type: "application/pdf" }), "guide.pdf");
const accepted = await fetch(`${origin}/api/admin/resources`, {
  method: "POST",
  headers: { Origin: origin, Cookie: adminCookie, "X-CSRF-Token": adminBody.csrfToken },
  body: validForm
});
assert.equal(accepted.status, 200);
const resource = await accepted.json();
assert.equal("filePath" in resource, false);
assert.match(resource.mediaUrl, /^\/api\/media\/resources\//);
const download = await fetch(`${origin}${resource.mediaUrl}`, { headers: { Cookie: memberCookie } });
assert.equal(download.status, 200);
assert.match(download.headers.get("content-disposition") || "", /^attachment;/);
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test tests/upload-policy.test.mjs tests/protected-media.test.mjs tests/client-auth-contract.test.mjs`

Expected: all pass.

```bash
git add security/media-delivery.cjs tests/protected-media.test.mjs tests/api-route-policy.test.mjs server.js dashboard.js tools-box.js course-content.js course-learn.js admin.js docs/development/UPDATE_LOG.MD
git commit -m "security: protect uploaded member media"
```

### Task 3: Move premium tools behind active membership

**Files:**
- Create: `content/tools-library.cjs`
- Create: `tests/tools-protection.test.mjs`
- Modify: `tools-box.js:1-470`
- Modify: `server.js` member API section.
- Modify: `tests/api-route-policy.test.mjs`.

**Interfaces:**
- Produces: `getToolsLibrary() -> { skills, prompts }` from a server-only module.
- Produces: `GET /api/member/tools`, requiring member session and `memberAccess(member).active`.

- [ ] **Step 1: Write failing protection tests**

```js
// tests/tools-protection.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { startTestServer } from "./helpers/server-harness.mjs";

test("public tools bundle contains no premium records", async () => {
  const source = await readFile("tools-box.js", "utf8");
  assert.doesNotMatch(source, /const SKILL_PACKS|const PROMPT_PACKS|AI Work Intake Skill|Prompt QA Skill/);
});

test("tools API rejects anonymous access", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  assert.equal((await fetch(`${server.origin}/api/member/tools`)).status, 401);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test tests/tools-protection.test.mjs`

Expected: FAIL because premium constants remain in `tools-box.js` and the API is absent.

- [ ] **Step 3: Move records and add the protected API**

Use `apply_patch` to move the complete contiguous block `tools-box.js:18-357`—the existing `SKILL_PACKS` and `PROMPT_PACKS` declarations—byte-for-byte into `content/tools-library.cjs`. Do not shorten, regenerate, or duplicate the record bodies. Add only the strict-mode line before that moved block and the function/export lines after it:

```js
// content/tools-library.cjs
"use strict";

// The unchanged SKILL_PACKS declaration moved from tools-box.js:18-200 is directly above.
// The unchanged PROMPT_PACKS declaration moved from tools-box.js:202-357 follows it directly.
function getToolsLibrary() {
  return { skills: structuredClone(SKILL_PACKS), prompts: structuredClone(PROMPT_PACKS) };
}
module.exports = { getToolsLibrary };
```

```js
// server.js
const { getToolsLibrary } = require("./content/tools-library.cjs");
app.get("/api/member/tools", requireMemberSession, (req, res) => {
  const access = memberAccess(req.member);
  if (!access.active) return res.status(402).json({ error: "กรุณาชำระเงินเพื่อเปิด Tools Box", paymentRequired: true });
  res.setHeader("Cache-Control", "no-store");
  res.json(getToolsLibrary());
});
```

In `tools-box.js`, initialize empty arrays, fetch the library only after `/api/member/dashboard` confirms active access, assign the returned arrays, then call the existing render functions. The locked state receives no library response.

```js
let skillPacks = [];
let promptPacks = [];
async function loadPremiumLibrary() {
  const library = await apiRequest("/api/member/tools");
  skillPacks = Array.isArray(library.skills) ? library.skills : [];
  promptPacks = Array.isArray(library.prompts) ? library.prompts : [];
  renderSkillLibrary(skillPacks);
  renderPromptLibrary(promptPacks);
}
```

Add `GET /api/member/tools` to the member policy list in `tests/api-route-policy.test.mjs`.

- [ ] **Step 4: Test active/unpaid behavior and commit**

Add this test to `tests/tools-protection.test.mjs`:

```js
import { DatabaseSync } from "node:sqlite";

test("tools API returns no library to unpaid members and returns it after active payment", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const registration = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: { Origin: server.origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Tools Test",
      email: "tools@example.com",
      phone: "0876543210",
      password: "member-pass-789",
      passwordConfirm: "member-pass-789"
    })
  });
  assert.equal(registration.status, 200);
  const cookie = registration.headers.getSetCookie().find((value) => value.startsWith("aix_member_session="))?.split(";")[0];
  assert.ok(cookie);

  const unpaid = await fetch(`${server.origin}/api/member/tools`, { headers: { Cookie: cookie } });
  assert.equal(unpaid.status, 402);
  assert.equal("skills" in await unpaid.json(), false);

  const database = new DatabaseSync(`${server.dataDir}/data.db`);
  database.prepare("UPDATE members SET paymentStatus = 'paid', expiresAt = ? WHERE email = ?")
    .run("2099-12-31T00:00:00.000Z", "tools@example.com");
  database.close();

  const paid = await fetch(`${server.origin}/api/member/tools`, { headers: { Cookie: cookie } });
  assert.equal(paid.status, 200);
  const library = await paid.json();
  assert.ok(library.skills.length > 0);
  assert.ok(library.prompts.length > 0);
});
```

Run: `node --test tests/tools-protection.test.mjs tests/api-route-policy.test.mjs`

Expected: all pass.

```bash
git add content/tools-library.cjs tools-box.js server.js tests/tools-protection.test.mjs tests/api-route-policy.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "security: protect premium tools content"
```

### Task 4: Safe rendering for server-originated content

**Files:**
- Create: `safe-dom.js`
- Create: `tests/safe-dom.test.mjs`
- Create: `tests/safe-render-contract.test.mjs`
- Modify: `security/publication-manifest.cjs`.
- Modify: `index.html`, `class-detail.html`, `dashboard.html`, `tools-box.html`, `course-content.html`, `course-learn.html`, `admin.html`.
- Modify: `script.js`, `class-detail.js`, `dashboard.js`, `tools-box.js`, `course-content.js`, `course-learn.js`, `admin.js`.

**Interfaces:**
- Produces: `AiXDom.safeUrl`, `AiXDom.node`, `AiXDom.link`, and `AiXDom.replace`.
- Only `http:`, `https:`, `mailto:`, `tel:`, same-origin absolute paths, query strings, hashes, and `about:blank` are accepted according to call options.

- [ ] **Step 1: Write failing safe-DOM unit tests**

```js
// tests/safe-dom.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { safeUrl } = require("../safe-dom.js");

test("allows internal and HTTPS URLs", () => {
  assert.equal(safeUrl("/api/media/resources/r1"), "/api/media/resources/r1");
  assert.equal(safeUrl("assets/generated/course-ai-agent.jpg"), "assets/generated/course-ai-agent.jpg");
  assert.equal(safeUrl("https://example.com/file.pdf"), "https://example.com/file.pdf");
});

test("rejects script data and protocol-relative URLs", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,x", "//evil.example/x", "vbscript:x", "  javascript:x"]) {
    assert.equal(safeUrl(value), "about:blank", value);
  }
});
```

- [ ] **Step 2: Implement UMD helper**

```js
// safe-dom.js
(function initAiXDom(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AiXDom = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function factory() {
  function safeUrl(value) {
    const text = String(value || "").trim();
    if (/^(?:\/[^/]|#|\?)/.test(text)) return text;
    if (!text.includes("\\") && !text.startsWith("//") && !text.split("/").includes("..") && /^[A-Za-z0-9._~/-]+(?:[?#].*)?$/.test(text)) return text;
    try {
      const url = new URL(text);
      return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : "about:blank";
    } catch { return "about:blank"; }
  }
  function node(tag, options = {}, children = []) {
    const element = document.createElement(tag);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text);
    for (const [name, value] of Object.entries(options.attrs || {})) {
      if (name.startsWith("on") || name === "style") continue;
      element.setAttribute(name, String(value));
    }
    for (const child of children.flat()) if (child) element.append(child.nodeType ? child : document.createTextNode(String(child)));
    return element;
  }
  function link(options = {}, children = []) {
    const href = safeUrl(options.href);
    const element = node("a", { ...options, attrs: { ...(options.attrs || {}), href } }, children);
    if (/^https?:/.test(href)) { element.target = "_blank"; element.rel = "noopener noreferrer"; }
    return element;
  }
  function replace(target, children) { target.replaceChildren(...children.flat().filter(Boolean)); return target; }
  return { safeUrl, node, link, replace };
});
```

Add `safe-dom.js` to the public manifest and add `<script src="/safe-dom.js"></script>` before each listed page script.

- [ ] **Step 3: Convert each server-data renderer**

For every listed file, replace template interpolation of API/DB fields with `AiXDom.node(..., { text })`, `AiXDom.link({ href })`, and `replaceChildren`. Static empty-state/icon markup may remain as constants, but no server field may enter `innerHTML`, an inline event handler, `className`, `style`, or URL without a fixed mapping/safe URL.

Required function conversions:

```js
// script.js
renderCourses, renderResources, openClassModal
// class-detail.js
renderCourseDetails, render outcomes/skills/tools/info/syllabus/FAQ
// dashboard.js
renderPaymentHistory, renderResources, renderSchedule, renderNotifications, renderDashboard course cards
// course-content.js
renderCourse, render resources/schedule/modules
// course-learn.js
renderModules, renderVideo, renderReading, renderDownloads, appendTeacherMessage
// tools-box.js
renderDynamicResources, renderSkillLibrary, renderPromptLibrary
// admin.js
all table/card/detail/form-option render functions fed by API rows
```

Example required shape:

```js
function resourceCard(resource) {
  return AiXDom.link({ href: resource.url || resource.mediaUrl || "about:blank", className: "member-resource-card" }, [
    AiXDom.node("strong", { text: resource.title }),
    AiXDom.node("small", { text: resource.description || (resource.tags || []).join(", ") || "Resource สำหรับสมาชิก" })
  ]);
}
AiXDom.replace(memberResources, resources.map(resourceCard));
```

Replace notification `onclick` strings with `button.addEventListener("click", () => markNotificationRead(notice.id))`. Map icon classes from fixed internal enums; never accept a class string from an API row.

- [ ] **Step 4: Add source contracts for every affected renderer**

```js
// tests/safe-render-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = ["script.js", "class-detail.js", "dashboard.js", "course-content.js", "course-learn.js", "tools-box.js", "admin.js"];
test("server-data renderers use the safe DOM helper", async () => {
  for (const filename of files) {
    const source = await readFile(filename, "utf8");
    assert.match(source, /AiXDom\.(?:node|link|replace|safeUrl)/, filename);
    assert.doesNotMatch(source, /onclick=["']|javascript:/i, filename);
  }
});
```

Run: `node --test tests/safe-dom.test.mjs tests/safe-render-contract.test.mjs tests/homepage-contract.test.mjs`

Expected: all pass. If homepage regex contracts assert old `innerHTML` templates, rewrite them to assert the equivalent safe node structure rather than weakening the security contract.

- [ ] **Step 5: Commit**

```bash
git add safe-dom.js security/publication-manifest.cjs index.html class-detail.html dashboard.html tools-box.html course-content.html course-learn.html admin.html script.js class-detail.js dashboard.js tools-box.js course-content.js course-learn.js admin.js tests/safe-dom.test.mjs tests/safe-render-contract.test.mjs tests/homepage-contract.test.mjs docs/development/UPDATE_LOG.MD
git commit -m "security: render server content as safe DOM"
```

### Task 5: Security headers, patched toolchain, and final Phase 0 gate

**Files:**
- Create: `security/browser-headers.cjs`
- Create: `tests/browser-headers.test.mjs`
- Modify: `server.js` middleware section.
- Modify: `package.json`, `package-lock.json`.
- Modify: `docs/development/UPDATE_LOG.MD`.

**Interfaces:**
- Produces: `helmetOptions(isProduction)` and `cspReportOnlyValue()`.
- Final runtime sends HSTS only in production, `nosniff`, strict referrer policy, frame denial, restrictive permissions policy, and report-only CSP without `unsafe-eval`.

- [ ] **Step 1: Install exact patched direct packages**

Run: `npm install helmet@8.3.0 multer@2.2.0 && npm install --save-dev wrangler@4.112.0`

Expected: exact compatible ranges in package files; no forced audit rewrite.

- [ ] **Step 2: Write failing header tests**

```js
// tests/browser-headers.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const { cspReportOnlyValue } = require("../security/browser-headers.cjs");

test("report-only CSP names exact origins and excludes unsafe-eval", () => {
  const value = cspReportOnlyValue();
  assert.match(value, /default-src 'self'/);
  assert.match(value, /object-src 'none'/);
  assert.match(value, /frame-ancestors 'none'/);
  assert.doesNotMatch(value, /unsafe-eval/);
});

test("local response has defensive headers and no framework disclosure", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const response = await fetch(`${server.origin}/`);
  assert.equal(response.headers.get("x-powered-by"), null);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.ok(response.headers.get("content-security-policy-report-only"));
});
```

- [ ] **Step 3: Implement Helmet and report-only CSP**

```js
// security/browser-headers.cjs
function cspReportOnlyValue() {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "img-src 'self' data: https:",
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
    "script-src 'self' 'unsafe-inline' https://accounts.google.com",
    "frame-src https://accounts.google.com https://js.stripe.com",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.stripe.com",
    "form-action 'self'"
  ].join("; ");
}

function helmetOptions(isProduction) {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" }
  };
}

module.exports = { cspReportOnlyValue, helmetOptions };
```

```js
// server.js, after app creation and before routes
const helmet = require("helmet");
const { cspReportOnlyValue, helmetOptions } = require("./security/browser-headers.cjs");
app.disable("x-powered-by");
app.use(helmet(helmetOptions(IS_PRODUCTION)));
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy-Report-Only", cspReportOnlyValue());
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});
```

- [ ] **Step 4: Run automated Phase 0 verification**

Run:

```bash
npm test
npm audit --json | node -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const v=JSON.parse(s).metadata.vulnerabilities; console.log(v); if (v.high || v.critical) process.exit(1); })'
npm run cf:check
git diff --check
```

Expected: all tests pass; audit exits 0 with high=0 and critical=0; Wrangler dry run exits 0; diff check exits 0.

- [ ] **Step 5: Run browser smoke matrix**

Start the isolated local server with test-only credentials and use the Playwright skill. Verify desktop 1440×900 and mobile 390×844:

1. Public homepage and class detail load with no broken approved assets.
2. Login without password fails generically; valid login sets no localStorage auth keys.
3. Dashboard, course, payment, tools, replay/resource, and logout work through cookies.
4. A mutation without CSRF returns `403`; normal UI mutation succeeds.
5. Admin login/read/mutation/logout work without bearer/localStorage auth.
6. Seeded `<img onerror>`, `<script>`, and `javascript:` values render as text or `about:blank`; no dialog, network request, or console execution occurs.
7. Direct private `.html`, internal documents, raw `/uploads`, and premium bundle paths remain inaccessible.
8. Replay range request succeeds and resource download uses attachment disposition.

Capture screenshots and console/network summaries under `output/playwright/phase0-local/`; do not log cookies, CSRF values, passwords, or customer data.

- [ ] **Step 6: Update the log and commit**

Record exact test totals, audit severities, Wrangler result, browser viewport results, screenshots, and any low/moderate residual dependency path in `docs/development/UPDATE_LOG.MD`.

```bash
git add security/browser-headers.cjs tests/browser-headers.test.mjs server.js package.json package-lock.json docs/development/UPDATE_LOG.MD
git commit -m "security: complete phase zero hardening"
```

## Plan 0C and Phase 0 completion gate

Phase 0 is complete only when:

- Plans 0A, 0B, and 0C commits are present and focused.
- `npm test`, `npm audit`, `npm run cf:check`, and `git diff --check` pass.
- High and critical audit counts are zero, or the owner explicitly approves a documented non-exploitable exception.
- Browser smoke proves cookie/CSRF behavior and safe rendering, not only source regexes.
- Inaccessible-password account count is reported read-only for rollout planning.
- No production deployment, secret rotation, external notification, CDN purge, or customer-data mutation occurred.
- A separate owner approval is still required before production rollout and incident-response actions.
