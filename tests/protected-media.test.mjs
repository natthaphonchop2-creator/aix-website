import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createConnection } from "node:net";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { Readable, Writable } from "node:stream";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const fileSystemPromises = require("node:fs/promises");
const { parseByteRange, streamMedia } = require("../security/media-delivery.cjs");

const PDF = Buffer.from("%PDF-1.7\n");
const MEDIA_BYTES = Buffer.from("0123456789ab");
const MP4 = Buffer.from([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
  0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
  0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32
]);
const WEBM = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);
const ADMIN_EMAIL = "owner@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

function openDatabase(server) {
  return new DatabaseSync(join(server.dataDir, "data.db"));
}

function withDatabase(server, callback) {
  const database = openDatabase(server);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function firstCourseId(server) {
  return withDatabase(server, (database) => database.prepare(
    "SELECT id FROM courses WHERE featured = 1 ORDER BY sortOrder, id LIMIT 1"
  ).get().id);
}

function cookieFrom(response, name) {
  return response.headers.getSetCookie()
    .find((value) => value.startsWith(`${name}=`))
    ?.split(";", 1)[0];
}

async function registerMember(server, email = "media@example.com") {
  const response = await fetch(`${server.origin}/api/members/register`, {
    method: "POST",
    headers: { Origin: server.origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Media Test",
      email,
      phone: `08${String(Math.abs(email.length * 7919)).padStart(8, "0").slice(0, 8)}`,
      password: "member-pass-987",
      passwordConfirm: "member-pass-987",
      consentAccepted: true
    })
  });
  assert.equal(response.status, 200, await response.clone().text());
  const cookie = cookieFrom(response, "aix_member_session");
  assert.ok(cookie);
  return { cookie, email };
}

function setMember(server, email, values) {
  const assignments = Object.keys(values).map((key) => `${key} = ?`).join(", ");
  withDatabase(server, (database) => {
    database.prepare(`UPDATE members SET ${assignments} WHERE email = ?`).run(...Object.values(values), email);
  });
}

async function paidMember(server, email = "media@example.com") {
  const member = await registerMember(server, email);
  setMember(server, email, {
    paymentStatus: "paid",
    expiresAt: "2099-12-31T00:00:00.000Z",
    status: "active"
  });
  return member;
}

async function adminSession(server) {
  const response = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: { Origin: server.origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });
  assert.equal(response.status, 200, await response.clone().text());
  const body = await response.json();
  const cookie = cookieFrom(response, "aix_admin_session");
  assert.ok(cookie);
  assert.ok(body.csrfToken);
  return { cookie, csrfToken: body.csrfToken };
}

async function writeUpload(server, family, filename, contents = MEDIA_BYTES) {
  const directory = join(server.dataDir, "uploads", family);
  await mkdir(directory, { recursive: true });
  const absolutePath = join(directory, filename);
  await writeFile(absolutePath, contents);
  return absolutePath;
}

async function insertReplay(server, {
  id = "replay_test",
  courseId = firstCourseId(server),
  filename = "replay-test.mp4",
  filePath = `/uploads/replays/${filename}`,
  title = "Replay Test",
  videoUrl = "",
  visibility = "members",
  contents = MEDIA_BYTES,
  write = Boolean(filePath)
} = {}) {
  if (write) await writeUpload(server, "replays", filename, contents);
  withDatabase(server, (database) => database.prepare(`
    INSERT INTO course_replays (id, courseId, title, videoUrl, filePath, visibility)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, courseId, title, videoUrl, filePath, visibility));
  return id;
}

async function insertResource(server, {
  id = "resource_test",
  courseId = "",
  filename = "resource-test.pdf",
  filePath = `/uploads/resources/${filename}`,
  fileName = filename,
  title = "Resource Test",
  url = "",
  visibility = "members",
  contents = PDF,
  write = Boolean(filePath)
} = {}) {
  if (write) await writeUpload(server, "resources", filename, contents);
  withDatabase(server, (database) => database.prepare(`
    INSERT INTO member_resources (id, courseId, title, url, filePath, fileName, visibility)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, courseId, title, url, filePath, fileName, visibility));
  return id;
}

function assertNoKey(value, forbidden, location = "response") {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) {
    assert.equal(Object.prototype.hasOwnProperty.call(value, forbidden), false, `${location}.${forbidden}`);
  }
  for (const [key, child] of Object.entries(value)) assertNoKey(child, forbidden, `${location}.${key}`);
}

function resourceForm({
  courseId = "",
  type = "file",
  title = "Uploaded Resource",
  description = "",
  url = "",
  tags = "",
  visibility = "members",
  sortOrder = "0",
  file = PDF,
  filename = "guide.pdf",
  fileType = "application/pdf"
} = {}) {
  const form = new FormData();
  form.set("courseId", courseId);
  form.set("type", type);
  form.set("title", title);
  form.set("description", description);
  form.set("url", url);
  form.set("tags", tags);
  form.set("visibility", visibility);
  form.set("sortOrder", sortOrder);
  if (file !== null) form.set("file", new Blob([file], { type: fileType }), filename);
  return form;
}

function replayForm({
  courseId,
  title = "Uploaded Replay",
  description = "",
  videoUrl = "",
  durationText = "1 นาที",
  visibility = "members",
  sortOrder = "0",
  file = MP4,
  filename = "clip.mp4",
  fileType = "video/mp4"
} = {}) {
  const form = new FormData();
  form.set("courseId", courseId);
  form.set("title", title);
  form.set("description", description);
  form.set("videoUrl", videoUrl);
  form.set("durationText", durationText);
  form.set("visibility", visibility);
  form.set("sortOrder", sortOrder);
  if (file !== null) form.set("video", new Blob([file], { type: fileType }), filename);
  return form;
}

async function adminUpload(server, session, path, form, method = "POST") {
  return fetch(`${server.origin}${path}`, {
    method,
    headers: {
      Origin: server.origin,
      Cookie: session.cookie,
      "X-CSRF-Token": session.csrfToken
    },
    body: form
  });
}

async function assertGenericAssetFailure(response) {
  assert.equal(response.status, 500);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/u);
  const body = await response.json();
  assert.deepEqual(body, { error: "ไม่สามารถดำเนินการกับไฟล์ได้" });
  assert.doesNotMatch(JSON.stringify(body), /forced|trigger|sqlite|uploads|\.pdf|path/iu);
}

async function assertSafeUploadRejection(response, expectedStatus, forbiddenPath = "") {
  assert.equal(response.status, expectedStatus);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/u);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.doesNotMatch(body.error, /ENOENT|EACCES|EPERM|injected|node:fs|\.staging|data\/uploads|\/private\/|\/tmp\//iu);
  if (forbiddenPath) assert.equal(body.error.includes(forbiddenPath), false);
  return body;
}

async function directoryNames(pathname) {
  return readdir(pathname).catch((error) => error?.code === "ENOENT" ? [] : Promise.reject(error));
}

async function stagedNames(stagingRoot) {
  return [
    ...(await directoryNames(join(stagingRoot, "replays"))),
    ...(await directoryNames(join(stagingRoot, "resources")))
  ];
}

async function pathExists(pathname) {
  try {
    await access(pathname);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function writableMediaResponse({ abortOnWrite = false } = {}) {
  const headers = new Map();
  const response = new Writable({
    write(chunk, encoding, callback) {
      callback();
      if (abortOnWrite && !this.destroyed) this.destroy();
    }
  });
  response.statusCode = 200;
  response.setHeader = (name, value) => headers.set(String(name).toLowerCase(), String(value));
  response.status = (statusCode) => {
    response.statusCode = statusCode;
    return response;
  };
  response.headerValues = headers;
  return response;
}

test("parseByteRange supports bounded, open, suffix, and clamped single ranges", () => {
  assert.deepEqual(parseByteRange("bytes=0-3", 12), { start: 0, end: 3 });
  assert.deepEqual(parseByteRange("bytes=8-", 12), { start: 8, end: 11 });
  assert.deepEqual(parseByteRange("bytes=-4", 12), { start: 8, end: 11 });
  assert.deepEqual(parseByteRange("bytes=-99", 12), { start: 0, end: 11 });
  assert.deepEqual(parseByteRange("bytes=8-99", 12), { start: 8, end: 11 });
  assert.deepEqual(parseByteRange("bytes=0-99", 12), { start: 0, end: 11 });
});

test("parseByteRange rejects malformed, multi, empty, zero-size, and unsafe ranges", () => {
  for (const value of [
    "bytes=", "bytes=-", "bytes=-0", "bytes=12-", "bytes=9-8", "bytes=0-1,4-5",
    "bytes =0-1", "bytes=+0-1", "bytes=0-1junk",
    `bytes=${Number.MAX_SAFE_INTEGER + 1}-`, "items=0-1"
  ]) {
    assert.equal(parseByteRange(value, 12), null, value);
  }
  assert.equal(parseByteRange("bytes=0-0", 0), null);
  assert.equal(parseByteRange("bytes=0-0", -1), null);
  assert.equal(parseByteRange("bytes=0-0", Number.MAX_SAFE_INTEGER + 1), null);
});

test("streamMedia destroys and closes its source on destination abort and propagates open or read failures", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "aix-media-pipeline-"));
  const filename = join(sandbox, "large.mp4");
  await writeFile(filename, Buffer.alloc(1024 * 1024, 0x61));
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const originalOpen = fileSystemPromises.open;
  let openedHandle;
  let openedSource;
  try {
    fileSystemPromises.open = async (...args) => {
      openedHandle = await originalOpen(...args);
      const createReadStream = openedHandle.createReadStream.bind(openedHandle);
      openedHandle.createReadStream = (options) => {
        openedSource = createReadStream(options);
        return openedSource;
      };
      return openedHandle;
    };
    await streamMedia(
      { method: "GET", headers: {} },
      writableMediaResponse({ abortOnWrite: true }),
      { absolutePath: filename, root: sandbox, contentType: "video/mp4" }
    );
    assert.equal(openedSource?.destroyed, true);
    await assert.rejects(openedHandle.stat(), /closed|EBADF|invalid state/i);
  } finally {
    fileSystemPromises.open = originalOpen;
    await openedHandle?.close().catch(() => {});
  }

  const openFailure = Object.assign(new Error("injected open failure"), { code: "EACCES" });
  const openFailureResponse = writableMediaResponse();
  try {
    fileSystemPromises.open = async () => { throw openFailure; };
    await assert.rejects(
      streamMedia(
        { method: "GET", headers: {} },
        openFailureResponse,
        { absolutePath: filename, root: sandbox, contentType: "video/mp4" }
      ),
      (error) => error === openFailure
    );
    assert.equal(openFailureResponse.headerValues.size, 0);
  } finally {
    fileSystemPromises.open = originalOpen;
  }

  const readFailure = Object.assign(new Error("injected read failure"), { code: "EIO" });
  let readHandle;
  let readSource;
  try {
    fileSystemPromises.open = async (...args) => {
      readHandle = await originalOpen(...args);
      readHandle.createReadStream = () => {
        readSource = new Readable({
          read() {
            this.destroy(readFailure);
          },
          destroy(error, callback) {
            readHandle.close().then(() => callback(error), () => callback(error));
          }
        });
        return readSource;
      };
      return readHandle;
    };
    await assert.rejects(
      streamMedia(
        { method: "GET", headers: {} },
        writableMediaResponse(),
        { absolutePath: filename, root: sandbox, contentType: "video/mp4" }
      ),
      (error) => error === readFailure
    );
    assert.equal(readSource?.destroyed, true);
    await assert.rejects(readHandle.stat(), /closed|EBADF|invalid state/i);
  } finally {
    fileSystemPromises.open = originalOpen;
    await readHandle?.close().catch(() => {});
  }
});

test("media authorization is cookie-only and enforces access, visibility, and course exposure", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const courseId = firstCourseId(server);
  await insertReplay(server, { id: "visible_replay", courseId });
  await insertReplay(server, { id: "hidden_replay", courseId, filename: "hidden.mp4", visibility: "hidden" });
  await insertResource(server, { id: "external_only", filePath: "", write: false, url: "https://example.com/file.pdf" });
  withDatabase(server, (database) => database.prepare(
    "INSERT INTO courses (id, name, featured) VALUES ('hidden_course', 'Hidden Course', 0)"
  ).run());
  await insertReplay(server, {
    id: "unfeatured_replay",
    courseId: "hidden_course",
    filename: "unfeatured.mp4"
  });
  await insertResource(server, { id: "hidden_resource", filename: "hidden.pdf", visibility: "hidden" });
  await insertResource(server, {
    id: "unfeatured_resource",
    courseId: "hidden_course",
    filename: "unfeatured.pdf"
  });

  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`)).status, 401);
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Authorization: "Bearer leaked" }
  })).status, 401);

  const retired = await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: "aix_session=retired" }
  });
  assert.equal(retired.status, 401);
  assert.ok(retired.headers.getSetCookie().some((value) => value.startsWith("aix_session=") && /Max-Age=0/i.test(value)));

  const member = await registerMember(server);
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 403);

  setMember(server, member.email, { paymentStatus: "paid", expiresAt: "2000-01-01T00:00:00.000Z" });
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 403);

  setMember(server, member.email, { expiresAt: "2099-12-31T00:00:00.000Z", status: "suspended" });
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 401);

  setMember(server, member.email, { status: "active" });
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: member.cookie, Authorization: "Bearer leaked" }
  })).status, 401);
  assert.equal((await fetch(`${server.origin}/api/media/replays/visible_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 200);
  assert.equal((await fetch(`${server.origin}/api/media/replays/hidden_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
  assert.equal((await fetch(`${server.origin}/api/media/replays/unfeatured_replay`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
  assert.equal((await fetch(`${server.origin}/api/media/resources/external_only`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
  assert.equal((await fetch(`${server.origin}/api/media/resources/hidden_resource`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
  assert.equal((await fetch(`${server.origin}/api/media/resources/unfeatured_resource`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
  assert.equal((await fetch(`${server.origin}/api/media/replays/missing`, {
    headers: { Cookie: member.cookie }
  })).status, 404);

  const admin = await adminSession(server);
  assert.equal((await fetch(`${server.origin}/api/media/replays/hidden_replay`, {
    headers: { Cookie: admin.cookie }
  })).status, 200);
  assert.equal((await fetch(`${server.origin}/api/media/replays/unfeatured_replay`, {
    headers: { Cookie: admin.cookie }
  })).status, 200);
  assert.equal((await fetch(`${server.origin}/api/media/resources/hidden_resource`, {
    headers: { Cookie: admin.cookie }
  })).status, 200);
  assert.equal((await fetch(`${server.origin}/api/media/resources/unfeatured_resource`, {
    headers: { Cookie: admin.cookie }
  })).status, 200);
});

test("GET and HEAD media delivery implement the complete range and zero-size contract", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const member = await paidMember(server, "ranges@example.com");
  await insertReplay(server, { id: "range_replay", contents: MEDIA_BYTES });
  await insertReplay(server, { id: "zero_replay", filename: "zero.mp4", contents: Buffer.alloc(0) });
  const url = `${server.origin}/api/media/replays/range_replay`;

  const full = await fetch(url, { headers: { Cookie: member.cookie } });
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("accept-ranges"), "bytes");
  assert.equal(full.headers.get("content-length"), "12");
  assert.equal(full.headers.get("content-range"), null);
  assert.equal(full.headers.get("cache-control"), "private, no-store");
  assert.equal(full.headers.get("x-content-type-options"), "nosniff");
  assert.match(full.headers.get("content-disposition") || "", /^inline;/);
  assert.deepEqual(Buffer.from(await full.arrayBuffer()), MEDIA_BYTES);

  for (const [range, expectedRange, expectedBody] of [
    ["bytes=0-3", "bytes 0-3/12", "0123"],
    ["bytes=8-", "bytes 8-11/12", "89ab"],
    ["bytes=-4", "bytes 8-11/12", "89ab"],
    ["bytes=-99", "bytes 0-11/12", "0123456789ab"],
    ["bytes=0-99", "bytes 0-11/12", "0123456789ab"],
    ["bytes=8-99", "bytes 8-11/12", "89ab"]
  ]) {
    const response = await fetch(url, { headers: { Cookie: member.cookie, Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get("content-range"), expectedRange, range);
    assert.equal(response.headers.get("content-length"), String(expectedBody.length), range);
    assert.equal(await response.text(), expectedBody, range);
  }

  for (const range of ["bytes=-0", "bytes=12-", "bytes=9-8", "bytes=0-1,4-5", "bytes=9007199254740992-"]) {
    const response = await fetch(url, { headers: { Cookie: member.cookie, Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get("content-range"), "bytes */12", range);
  }

  const head = await fetch(url, { method: "HEAD", headers: { Cookie: member.cookie } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "12");
  assert.equal((await head.arrayBuffer()).byteLength, 0);

  const headRange = await fetch(url, { method: "HEAD", headers: { Cookie: member.cookie, Range: "bytes=0-3" } });
  assert.equal(headRange.status, 206);
  assert.equal(headRange.headers.get("content-range"), "bytes 0-3/12");
  assert.equal(headRange.headers.get("content-length"), "4");
  assert.equal((await headRange.arrayBuffer()).byteLength, 0);

  const headInvalid = await fetch(url, { method: "HEAD", headers: { Cookie: member.cookie, Range: "bytes=-0" } });
  assert.equal(headInvalid.status, 416);
  assert.equal(headInvalid.headers.get("content-range"), "bytes */12");
  assert.equal((await headInvalid.arrayBuffer()).byteLength, 0);

  const zeroUrl = `${server.origin}/api/media/replays/zero_replay`;
  const zero = await fetch(zeroUrl, { headers: { Cookie: member.cookie } });
  assert.equal(zero.status, 200);
  assert.equal(zero.headers.get("content-length"), "0");
  assert.equal((await zero.arrayBuffer()).byteLength, 0);
  const zeroRange = await fetch(zeroUrl, { headers: { Cookie: member.cookie, Range: "bytes=0-0" } });
  assert.equal(zeroRange.status, 416);
  assert.equal(zeroRange.headers.get("content-range"), "bytes */0");
  const zeroHead = await fetch(zeroUrl, { method: "HEAD", headers: { Cookie: member.cookie } });
  assert.equal(zeroHead.status, 200);
  assert.equal(zeroHead.headers.get("content-length"), "0");
  assert.equal((await zeroHead.arrayBuffer()).byteLength, 0);
});

test("media paths reject traversal, wrong families, directories, and final or ancestor symlinks", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const member = await paidMember(server, "paths@example.com");
  const outside = join(server.dataDir, "outside-media");
  await mkdir(outside, { recursive: true });
  await writeFile(join(outside, "outside.mp4"), MEDIA_BYTES);
  await writeFile(join(outside, "outside.pdf"), PDF);
  await symlink(join(outside, "outside.mp4"), join(server.dataDir, "uploads", "replays", "final-link.mp4"));
  await symlink(outside, join(server.dataDir, "uploads", "replays", "linked-parent"));
  await mkdir(join(server.dataDir, "uploads", "replays", "directory.mp4"));
  await mkdir(join(server.dataDir, "uploads", "replays", "nested"));
  await writeFile(join(server.dataDir, "uploads", "replays", "nested", "inside.mp4"), MEDIA_BYTES);
  await writeUpload(server, "replays", "encoded%2fseparator.mp4", MEDIA_BYTES);
  await writeUpload(server, "replays", "encoded%5cseparator.mp4", MEDIA_BYTES);
  await writeUpload(server, "resources", "wrong-family.mp4", MEDIA_BYTES);
  await writeUpload(server, "replays", "wrong-family.pdf", PDF);

  const rows = [
    ["missing_disk", "/uploads/replays/missing-on-disk.mp4"],
    ["traversal", "/uploads/replays/../resources/wrong-family.mp4"],
    ["wrong_family", "/uploads/resources/wrong-family.mp4"],
    ["final_link", "/uploads/replays/final-link.mp4"],
    ["parent_link", "/uploads/replays/linked-parent/outside.mp4"],
    ["directory", "/uploads/replays/directory.mp4"],
    ["nested_real", "/uploads/replays/nested/inside.mp4"],
    ["encoded_slash", "/uploads/replays/encoded%2fseparator.mp4"],
    ["encoded_backslash", "/uploads/replays/encoded%5cseparator.mp4"]
  ];
  for (const [id, filePath] of rows) {
    await insertReplay(server, { id, filePath, write: false });
    const response = await fetch(`${server.origin}/api/media/replays/${id}`, { headers: { Cookie: member.cookie } });
    assert.equal(response.status, 404, id);
  }
  await insertResource(server, { id: "resource_wrong_family", filePath: "/uploads/replays/wrong-family.pdf", write: false });
  assert.equal((await fetch(`${server.origin}/api/media/resources/resource_wrong_family`, {
    headers: { Cookie: member.cookie }
  })).status, 404);
});

test("opaque member and admin projections preserve safe links and recursively omit filePath", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const member = await paidMember(server, "projection@example.com");
  const admin = await adminSession(server);
  const courseId = firstCourseId(server);
  const poisonedNestedJson = JSON.stringify([{
    title: "Nested projection",
    filePath: "/uploads/replays/course-leak.mp4",
    children: [{ filePath: "/uploads/resources/child-leak.pdf" }]
  }]);
  withDatabase(server, (database) => database.prepare(`
    UPDATE courses
    SET skills = ?, tools = ?, outcomes = ?, info = ?, syllabus = ?, faq = ?, brandFocus = ?
    WHERE id = ?
  `).run(
    poisonedNestedJson, poisonedNestedJson, poisonedNestedJson, poisonedNestedJson,
    poisonedNestedJson, poisonedNestedJson, poisonedNestedJson, courseId
  ));

  await insertResource(server, { id: "local_resource", filename: "local.pdf" });
  withDatabase(server, (database) => database.prepare(
    "UPDATE member_resources SET tags = ? WHERE id = 'local_resource'"
  ).run(poisonedNestedJson));
  await insertResource(server, { id: "https_resource", filePath: "", write: false, url: "https://example.com/file.pdf" });
  await insertResource(server, { id: "safe_percent_resource", filePath: "", write: false, url: "/downloads/100%25-guide.pdf" });
  const unsafeLinks = [
    ["http_resource", "http://example.com/file.pdf"],
    ["script_resource", "javascript:alert(1)"],
    ["data_resource", "data:text/html,bad"],
    ["protocol_resource", "//evil.example/file"],
    ["credential_resource", "https://user:pass@example.com/file"],
    ["uploads_resource", "/uploads/resources/secret.pdf"],
    ["encoded_uploads_resource", "/uploads%2fsecret"],
    ["encoded_parent_resource", "/%2e%2e/x"],
    ["encoded_backslash_resource", "/safe%5cevil"],
    ["encoded_control_resource", "/safe%0d%0aevil"],
    ["double_uploads_resource", "/uploads%252fsecret"],
    ["double_parent_resource", "/%252e%252e/x"],
    ["double_backslash_resource", "/safe%255cevil"],
    ["double_control_resource", "/safe%250d%250aevil"]
  ];
  for (const [id, url] of unsafeLinks) {
    await insertResource(server, { id, filePath: "", write: false, url });
  }
  await insertReplay(server, { id: "local_replay", courseId, filename: "local.mp4" });
  await insertReplay(server, {
    id: "external_replay",
    courseId,
    filePath: "",
    write: false,
    videoUrl: "https://example.com/replay.mp4"
  });

  const catalogResponse = await fetch(`${server.origin}/api/platform/courses/${encodeURIComponent(courseId)}`);
  assert.equal(catalogResponse.status, 200);
  assertNoKey(await catalogResponse.json(), "filePath");

  const dashboardResponse = await fetch(`${server.origin}/api/member/dashboard`, { headers: { Cookie: member.cookie } });
  assert.equal(dashboardResponse.status, 200);
  const dashboard = await dashboardResponse.json();
  assertNoKey(dashboard, "filePath");
  for (const expected of ["/tools-box#workflow", "/tools-box#skill-set", "/course/claude-deep-dive/start"]) {
    assert.ok(dashboard.resources.some((item) => item.url === expected), expected);
  }
  assert.equal(dashboard.resources.find((item) => item.id === "local_resource").url, "/api/media/resources/local_resource");
  assert.equal(dashboard.resources.find((item) => item.id === "local_resource").mediaUrl, "/api/media/resources/local_resource");
  assert.equal(dashboard.resources.find((item) => item.id === "https_resource").url, "https://example.com/file.pdf");
  assert.equal(dashboard.resources.find((item) => item.id === "safe_percent_resource").url, "/downloads/100%25-guide.pdf");
  for (const [id] of unsafeLinks) {
    const item = dashboard.resources.find((entry) => entry.id === id);
    assert.equal(item.url, "", id);
    assert.equal(item.mediaUrl, "", id);
  }

  const contentResponse = await fetch(`${server.origin}/api/courses/${encodeURIComponent(courseId)}/content`, {
    headers: { Cookie: member.cookie }
  });
  assert.equal(contentResponse.status, 200);
  const content = await contentResponse.json();
  assertNoKey(content, "filePath");
  assert.equal(content.replays.find((item) => item.id === "local_replay").videoUrl, "/api/media/replays/local_replay");
  assert.equal(content.replays.find((item) => item.id === "local_replay").mediaUrl, "/api/media/replays/local_replay");
  assert.equal(content.replays.find((item) => item.id === "external_replay").videoUrl, "https://example.com/replay.mp4");
  assert.ok(content.modules.some((item) => item.videoUrl === "/api/media/replays/local_replay"));

  const adminReplays = await fetch(`${server.origin}/api/admin/replays`, { headers: { Cookie: admin.cookie } }).then((response) => response.json());
  const adminResources = await fetch(`${server.origin}/api/admin/resources`, { headers: { Cookie: admin.cookie } }).then((response) => response.json());
  assertNoKey(adminReplays, "filePath");
  assertNoKey(adminResources, "filePath");
  assert.equal(adminReplays.find((item) => item.id === "local_replay").hasUpload, true);
  assert.equal(adminReplays.find((item) => item.id === "local_replay").videoUrl, "/api/media/replays/local_replay");
  assert.equal(adminReplays.find((item) => item.id === "local_replay").mediaUrl, "/api/media/replays/local_replay");
  assert.equal(adminReplays.find((item) => item.id === "external_replay").hasUpload, false);
  assert.equal(adminResources.find((item) => item.id === "local_resource").hasUpload, true);
  assert.equal(adminResources.find((item) => item.id === "local_resource").url, "/api/media/resources/local_resource");
  assert.equal(adminResources.find((item) => item.id === "local_resource").mediaUrl, "/api/media/resources/local_resource");
  assert.equal(adminResources.find((item) => item.id === "https_resource").hasUpload, false);
});

test("Content-Disposition is injection-safe and supports Thai and malformed Unicode names", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const member = await paidMember(server, "filename@example.com");
  await insertResource(server, {
    id: "thai_resource",
    filename: "thai.pdf",
    fileName: "../คู่มือ\\ภาษาไทย\r\nX-Evil: yes.pdf"
  });
  await insertResource(server, {
    id: "surrogate_resource",
    filename: "surrogate.pdf",
    fileName: `broken-${String.fromCharCode(0xd800)}-name.pdf`
  });
  await insertResource(server, {
    id: "long_resource",
    filename: "long.pdf",
    fileName: `${"ชื่อยาว".repeat(100)}.pdf`
  });
  await insertReplay(server, {
    id: "named_replay",
    filename: "actual-video.mp4",
    title: "คลิป/ย้อนหลัง\\ชื่อ\r\nX-Replay: bad"
  });

  for (const id of ["thai_resource", "surrogate_resource", "long_resource"]) {
    const response = await fetch(`${server.origin}/api/media/resources/${id}`, { headers: { Cookie: member.cookie } });
    assert.equal(response.status, 200, id);
    const disposition = response.headers.get("content-disposition") || "";
    assert.match(disposition, /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/u, id);
    assert.doesNotMatch(disposition, /[\r\n]/u, id);
    assert.equal(response.headers.get("x-evil"), null, id);
    assert.ok(Buffer.byteLength(disposition, "utf8") < 900, id);
  }
  const replay = await fetch(`${server.origin}/api/media/replays/named_replay`, { headers: { Cookie: member.cookie } });
  assert.equal(replay.status, 200);
  const replayDisposition = replay.headers.get("content-disposition") || "";
  assert.match(replayDisposition, /^inline; filename="[\x20-\x7e]+\.mp4"; filename\*=UTF-8''.*\.mp4$/u);
  assert.doesNotMatch(replayDisposition, /[\r\n]/u);
});

test("route-specific multipart limits reject bad inputs and leave staging and database clean", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const admin = await adminSession(server);
  const staging = join(server.dataDir, "uploads", ".staging");
  const resources = join(server.dataDir, "uploads", "resources");

  const cases = [];
  cases.push(resourceForm({ title: "Disguised HTML", file: "<html><script>bad</script>", filename: "guide.pdf" }));
  cases.push(resourceForm({ title: "Wrong Extension", filename: "guide.exe" }));
  cases.push(resourceForm({ title: "", filename: "blank.pdf" }));
  cases.push(resourceForm({ title: "Unsafe URL", url: "javascript:alert(1)", filename: "unsafe-url.pdf" }));
  const unknown = new FormData();
  unknown.append("title", "Unknown Field");
  unknown.append("unexpected", "value");
  cases.push(unknown);
  const duplicate = new FormData();
  duplicate.append("title", "Duplicate Field");
  duplicate.append("title", "Shadow Title");
  cases.push(duplicate);
  const nested = new FormData();
  nested.append("title[nested]", "Nested Field");
  cases.push(nested);
  const longName = resourceForm({ title: "Long Field", filename: "long.pdf" });
  longName.set("x".repeat(101), "value");
  cases.push(longName);
  const longValue = resourceForm({ title: "Long Value", description: "x".repeat(16 * 1024 + 1), filename: "long-value.pdf" });
  cases.push(longValue);
  const extraFile = resourceForm({ title: "Extra File", filename: "first.pdf" });
  extraFile.append("file", new Blob([PDF], { type: "application/pdf" }), "second.pdf");
  cases.push(extraFile);

  for (const form of cases) {
    const response = await adminUpload(server, admin, "/api/admin/resources", form);
    await assertSafeUploadRejection(response, 400, server.dataDir);
    assert.deepEqual(await stagedNames(staging), []);
  }

  const oversized = resourceForm({
    title: "Oversized",
    file: new Uint8Array(50 * 1024 * 1024 + 1),
    filename: "oversized.pdf"
  });
  const oversizedResponse = await adminUpload(server, admin, "/api/admin/resources", oversized);
  await assertSafeUploadRejection(oversizedResponse, 413, server.dataDir);
  assert.deepEqual(await stagedNames(staging), []);

  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE title LIKE 'Duplicate Field%' OR title IN ('Disguised HTML','Wrong Extension','Unknown Field','Oversized')"
  ).get().count), 0);
  assert.deepEqual(await directoryNames(resources), []);

  for (const directory of [
    join(server.dataDir, "uploads"),
    staging,
    join(staging, "replays"),
    join(staging, "resources"),
    join(server.dataDir, "uploads", "replays"),
    join(server.dataDir, "uploads", "resources")
  ]) {
    const details = await stat(directory);
    assert.equal(details.mode & 0o777, 0o700, directory);
  }

  await rm(join(staging, "resources"), { recursive: true, force: true });
  const lowLevelFailure = await adminUpload(server, admin, "/api/admin/resources", resourceForm({
    title: "Low Level Failure",
    filename: "low-level.pdf"
  }));
  const lowLevelBody = await assertSafeUploadRejection(lowLevelFailure, 400, server.dataDir);
  assert.equal(lowLevelBody.error, "ข้อมูลอัปโหลดไม่ถูกต้อง");
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE title = 'Low Level Failure'"
  ).get().count), 0);
});

test("resource create update and delete use compensating cleanup around forced SQLite failures", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const admin = await adminSession(server);
  const staging = join(server.dataDir, "uploads", ".staging");
  const finalDirectory = join(server.dataDir, "uploads", "resources");

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_resource_insert BEFORE INSERT ON member_resources
    WHEN NEW.title = 'Force Insert Failure'
    BEGIN SELECT RAISE(ABORT, 'forced resource insert'); END;
  `));
  const failedCreate = await adminUpload(server, admin, "/api/admin/resources", resourceForm({
    title: "Force Insert Failure",
    filename: "force-insert.pdf"
  }));
  await assertGenericAssetFailure(failedCreate);
  assert.deepEqual(await stagedNames(staging), []);
  assert.deepEqual(await directoryNames(finalDirectory), []);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE title = 'Force Insert Failure'"
  ).get().count), 0);

  const created = await adminUpload(server, admin, "/api/admin/resources", resourceForm({
    title: "Lifecycle Resource",
    filename: "old.pdf"
  }));
  assert.equal(created.status, 200, await created.clone().text());
  const createdBody = await created.json();
  assertNoKey(createdBody, "filePath");
  assert.equal(createdBody.hasUpload, true);
  assert.match(createdBody.mediaUrl, /^\/api\/media\/resources\//u);
  const oldFiles = await directoryNames(finalDirectory);
  assert.equal(oldFiles.length, 1);
  const oldPath = join(finalDirectory, oldFiles[0]);

  const missingUpdate = await adminUpload(server, admin, "/api/admin/resources/missing", resourceForm({
    title: "Missing Update",
    filename: "missing.pdf"
  }), "PUT");
  assert.equal(missingUpdate.status, 404);
  assert.deepEqual(await stagedNames(staging), []);
  assert.deepEqual(await directoryNames(finalDirectory), oldFiles);

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_resource_update BEFORE UPDATE ON member_resources
    WHEN NEW.title = 'Force Update Failure'
    BEGIN SELECT RAISE(ABORT, 'forced resource update'); END;
  `));
  const failedUpdate = await adminUpload(server, admin, `/api/admin/resources/${createdBody.id}`, resourceForm({
    title: "Force Update Failure",
    filename: "failed-new.pdf"
  }), "PUT");
  await assertGenericAssetFailure(failedUpdate);
  assert.deepEqual(await stagedNames(staging), []);
  assert.deepEqual(await directoryNames(finalDirectory), oldFiles);
  assert.equal(await pathExists(oldPath), true);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT title FROM member_resources WHERE id = ?"
  ).get(createdBody.id).title), "Lifecycle Resource");

  const updated = await adminUpload(server, admin, `/api/admin/resources/${createdBody.id}`, resourceForm({
    title: "Lifecycle Updated",
    filename: "new.pdf"
  }), "PUT");
  assert.equal(updated.status, 200, await updated.clone().text());
  const newFiles = await directoryNames(finalDirectory);
  assert.equal(newFiles.length, 1);
  assert.notDeepEqual(newFiles, oldFiles);
  assert.equal(await pathExists(oldPath), false);
  const newPath = join(finalDirectory, newFiles[0]);

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_resource_delete BEFORE DELETE ON member_resources
    WHEN OLD.id = '${createdBody.id.replaceAll("'", "''")}'
    BEGIN SELECT RAISE(ABORT, 'forced resource delete'); END;
  `));
  const failedDelete = await fetch(`${server.origin}/api/admin/resources/${createdBody.id}`, {
    method: "DELETE",
    headers: { Origin: server.origin, Cookie: admin.cookie, "X-CSRF-Token": admin.csrfToken }
  });
  await assertGenericAssetFailure(failedDelete);
  assert.equal(await pathExists(newPath), true);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE id = ?"
  ).get(createdBody.id).count), 1);

  withDatabase(server, (database) => database.exec("DROP TRIGGER force_resource_delete"));
  const deleted = await fetch(`${server.origin}/api/admin/resources/${createdBody.id}`, {
    method: "DELETE",
    headers: { Origin: server.origin, Cookie: admin.cookie, "X-CSRF-Token": admin.csrfToken }
  });
  assert.equal(deleted.status, 200);
  assert.equal(await pathExists(newPath), false);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE id = ?"
  ).get(createdBody.id).count), 0);
});

test("replay upload exposes protected media and rolls back a forced database insert", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const admin = await adminSession(server);
  const courseId = firstCourseId(server);
  const finalDirectory = join(server.dataDir, "uploads", "replays");
  const staging = join(server.dataDir, "uploads", ".staging");

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_replay_insert BEFORE INSERT ON course_replays
    WHEN NEW.title = 'Force Replay Failure'
    BEGIN SELECT RAISE(ABORT, 'forced replay insert'); END;
  `));
  const failed = await adminUpload(server, admin, "/api/admin/replays", replayForm({
    courseId,
    title: "Force Replay Failure"
  }));
  await assertGenericAssetFailure(failed);
  assert.deepEqual(await stagedNames(staging), []);
  assert.deepEqual(await directoryNames(finalDirectory), []);

  const accepted = await adminUpload(server, admin, "/api/admin/replays", replayForm({
    courseId,
    title: "Valid Replay"
  }));
  assert.equal(accepted.status, 200, await accepted.clone().text());
  const body = await accepted.json();
  assertNoKey(body, "filePath");
  assert.equal(body.hasUpload, true);
  assert.equal(body.videoUrl, `/api/media/replays/${encodeURIComponent(body.id)}`);
  assert.equal(body.mediaUrl, body.videoUrl);
  const oldFiles = await directoryNames(finalDirectory);
  assert.equal(oldFiles.length, 1);
  const oldPath = join(finalDirectory, oldFiles[0]);

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_replay_update BEFORE UPDATE ON course_replays
    WHEN NEW.title = 'Force Replay Update'
    BEGIN SELECT RAISE(ABORT, 'forced replay update'); END;
  `));
  const failedUpdate = await adminUpload(server, admin, `/api/admin/replays/${body.id}`, replayForm({
    courseId,
    title: "Force Replay Update",
    file: WEBM,
    filename: "failed.webm",
    fileType: "video/webm"
  }), "PUT");
  await assertGenericAssetFailure(failedUpdate);
  assert.deepEqual(await directoryNames(finalDirectory), oldFiles);
  assert.equal(await pathExists(oldPath), true);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT title FROM course_replays WHERE id = ?"
  ).get(body.id).title), "Valid Replay");

  const updated = await adminUpload(server, admin, `/api/admin/replays/${body.id}`, replayForm({
    courseId,
    title: "Updated WebM Replay",
    file: WEBM,
    filename: "updated.webm",
    fileType: "video/webm"
  }), "PUT");
  assert.equal(updated.status, 200, await updated.clone().text());
  const newFiles = await directoryNames(finalDirectory);
  assert.equal(newFiles.length, 1);
  assert.notDeepEqual(newFiles, oldFiles);
  assert.equal(await pathExists(oldPath), false);
  const newPath = join(finalDirectory, newFiles[0]);

  withDatabase(server, (database) => database.exec(`
    CREATE TRIGGER force_replay_delete BEFORE DELETE ON course_replays
    WHEN OLD.id = '${body.id.replaceAll("'", "''")}'
    BEGIN SELECT RAISE(ABORT, 'forced replay delete'); END;
  `));
  const failedDelete = await fetch(`${server.origin}/api/admin/replays/${body.id}`, {
    method: "DELETE",
    headers: { Origin: server.origin, Cookie: admin.cookie, "X-CSRF-Token": admin.csrfToken }
  });
  await assertGenericAssetFailure(failedDelete);
  assert.equal(await pathExists(newPath), true);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM course_replays WHERE id = ?"
  ).get(body.id).count), 1);

  withDatabase(server, (database) => database.exec("DROP TRIGGER force_replay_delete"));
  const deleted = await fetch(`${server.origin}/api/admin/replays/${body.id}`, {
    method: "DELETE",
    headers: { Origin: server.origin, Cookie: admin.cookie, "X-CSRF-Token": admin.csrfToken }
  });
  assert.equal(deleted.status, 200);
  assert.equal(await pathExists(newPath), false);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM course_replays WHERE id = ?"
  ).get(body.id).count), 0);
});

test("aborted multipart requests leave no staged upload or database row", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  const admin = await adminSession(server);
  const { hostname, port } = new URL(server.origin);
  const boundary = "----aix-abort-boundary";
  const prefix = [
    `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nAborted Upload\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="aborted.pdf"\r\n`,
    "Content-Type: application/pdf\r\n\r\n%PDF-1.7\npartial"
  ].join("");

  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: hostname, port: Number(port) });
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.write([
        "POST /api/admin/resources HTTP/1.1",
        `Host: ${hostname}:${port}`,
        `Origin: ${server.origin}`,
        `Cookie: ${admin.cookie}`,
        `X-CSRF-Token: ${admin.csrfToken}`,
        `Content-Type: multipart/form-data; boundary=${boundary}`,
        `Content-Length: ${Buffer.byteLength(prefix) + 100000}`,
        "Connection: close",
        "",
        prefix
      ].join("\r\n"));
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, 40);
    });
  });

  const staging = join(server.dataDir, "uploads", ".staging");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const files = [
      ...(await directoryNames(join(staging, "replays"))),
      ...(await directoryNames(join(staging, "resources")))
    ];
    if (files.length === 0) break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.deepEqual(await directoryNames(join(staging, "resources")), []);
  assert.equal(withDatabase(server, (database) => database.prepare(
    "SELECT COUNT(*) AS count FROM member_resources WHERE title = 'Aborted Upload'"
  ).get().count), 0);
});

test("raw upload paths remain unpublished for GET and HEAD", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());
  await writeUpload(server, "resources", "raw.pdf", PDF);
  for (const method of ["GET", "HEAD"]) {
    const response = await fetch(`${server.origin}/uploads/resources/raw.pdf`, { method });
    assert.equal(response.status, 404, method);
    if (method === "HEAD") assert.equal((await response.arrayBuffer()).byteLength, 0, method);
  }
});

test("authorized clients never consume filePath and the Admin form advertises exact upload types", async () => {
  for (const filename of ["dashboard.js", "tools-box.js", "course-content.js", "course-learn.js", "admin.js"]) {
    const source = await readFile(filename, "utf8");
    assert.doesNotMatch(source, /\bfilePath\b/u, filename);
  }
  const courseLearn = await readFile("course-learn.js", "utf8");
  assert.match(courseLearn, /\/api\/media\/replays\//u);
  const adminHtml = await readFile("admin.html", "utf8");
  assert.match(adminHtml, /accept="\.mp4,\.webm"/u);
  assert.match(adminHtml, /ขนาดสูงสุด 500MB/u);
  assert.match(adminHtml, /accept="\.pdf,\.zip,\.docx,\.xlsx,\.pptx,\.csv,\.txt,\.png,\.jpg,\.jpeg,\.webp"/u);
  assert.match(adminHtml, /ขนาดสูงสุด 50MB/u);
  const serverSource = await readFile("server.js", "utf8");
  assert.match(serverSource, /fileSize:\s*UPLOAD_POLICIES\.replay\.maxBytes/u);
  assert.match(serverSource, /fileSize:\s*UPLOAD_POLICIES\.resource\.maxBytes/u);
  assert.match(serverSource, /files:\s*1/u);
  assert.match(serverSource, /fieldNestingDepth:\s*0/u);
});
