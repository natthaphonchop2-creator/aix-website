import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("server uses an explicit project-specific listen host with safe defaults", async () => {
  const source = await readFile(new URL("../server.js", import.meta.url), "utf8");

  assert.match(
    source,
    /const DEFAULT_LISTEN_HOST = IS_PRODUCTION \? '0\.0\.0\.0' : '127\.0\.0\.1';/,
    "production must remain externally reachable while nonproduction defaults to loopback"
  );
  assert.match(
    source,
    /const LISTEN_HOST = String\(process\.env\.AIX_LISTEN_HOST \|\| ''\)\.trim\(\) \|\| DEFAULT_LISTEN_HOST;/,
    "blank or whitespace-only AIX_LISTEN_HOST must fall back to the environment-safe default"
  );
  assert.doesNotMatch(source, /process\.env\.HOST\b/, "generic HOST must not control the listener");
  assert.match(
    source,
    /app\.listen\(PORT, LISTEN_HOST, \(\) => \{/,
    "the HTTP listener must bind to the resolved host"
  );
});

test("disposable server harness binds explicitly to loopback", async () => {
  const source = await readFile(new URL("./helpers/server-harness.mjs", import.meta.url), "utf8");
  assert.match(
    source,
    /AIX_LISTEN_HOST: "127\.0\.0\.1",/,
    "security tests must not expose their disposable fixture on wildcard interfaces"
  );
});
