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
