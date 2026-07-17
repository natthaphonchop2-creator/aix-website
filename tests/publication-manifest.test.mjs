import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

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

test("allows every approved asset extension and denies document or archive extensions", () => {
  for (const extension of [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".ico", ".woff", ".woff2", ".avif"]) {
    assert.equal(classifyPublicPath(`/assets/sample${extension}`)?.kind, "asset", extension);
  }
  for (const extension of [".html", ".zip", ".tar.gz", ".pdf", ".docx", ".xlsx"]) {
    assert.equal(classifyPublicPath(`/assets/sample${extension}`), null, extension);
  }
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

test("rejects file and directory symlinks that escape the publication root", () => {
  const publicationRoot = mkdtempSync(join(tmpdir(), "aix-publication-root-"));
  const outsideRoot = mkdtempSync(join(tmpdir(), "aix-publication-outside-"));
  try {
    mkdirSync(join(publicationRoot, "assets"));
    writeFileSync(join(outsideRoot, "outside-file.png"), "outside");
    symlinkSync(join(outsideRoot, "outside-file.png"), join(publicationRoot, "assets", "file-link.png"));
    mkdirSync(join(outsideRoot, "outside-directory"));
    writeFileSync(join(outsideRoot, "outside-directory", "inside.png"), "outside");
    symlinkSync(join(outsideRoot, "outside-directory"), join(publicationRoot, "assets", "directory-link"), "dir");

    assert.equal(resolvePublicPath(publicationRoot, "/assets/file-link.png"), null);
    assert.equal(resolvePublicPath(publicationRoot, "/assets/directory-link/inside.png"), null);
  } finally {
    rmSync(publicationRoot, { recursive: true, force: true });
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});
