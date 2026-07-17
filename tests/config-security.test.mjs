import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { lstat, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DEVELOPMENT_SIGNING_SECRETS,
  parseAllowedOrigins,
  validateSecurityConfig
} = require("../security/config-security.cjs");

const strongProduction = {
  NODE_ENV: "production",
  AUTH_SECRET: "a".repeat(32),
  CSRF_SECRET: "b".repeat(32),
  SMS_OTP_SECRET: "c".repeat(32),
  ADMIN_EMAIL: "owner@example.com",
  ADMIN_PASSWORD: "correct-horse-battery-staple",
  APP_ORIGINS: "https://www.aixclub.co"
};

test("normalizes whitespace, root slashes, default ports, and duplicate origins", () => {
  assert.deepEqual([
    ...parseAllowedOrigins(
      " https://WWW.AIXCLUB.CO:443/ , https://aixclub.co, https://www.aixclub.co "
    )
  ], [
    "https://www.aixclub.co",
    "https://aixclub.co"
  ]);
});

test("allows an exact HTTP development origin", () => {
  assert.deepEqual(
    [...parseAllowedOrigins("http://127.0.0.1:3000/")],
    ["http://127.0.0.1:3000"]
  );
});

test("preserves valid IDN and IPv6 origin normalization", () => {
  assert.deepEqual(
    [...parseAllowedOrigins("https://bücher.example/, https://[2001:db8::1]:443/")],
    ["https://xn--bcher-kva.example", "https://[2001:db8::1]"]
  );
});

for (const value of [
  "https://%2A.example.com",
  "https://%2a.example.com",
  "https://%2A%2Eexample.com",
  "https://%2a%2eexample.com"
]) {
  test(`rejects a wildcard introduced by authority decoding: ${value}`, () => {
    assert.throws(
      () => parseAllowedOrigins(value),
      (error) => {
        assert.match(error.message, /security configuration.*APP_ORIGINS/i);
        assert.equal(
          error.message.includes(value),
          false,
          "error must not echo the configured origin"
        );
        return true;
      }
    );
  });
}

for (const value of [
  "https://user%40alias:pass@example.com",
  "https://%75ser:%70ass@example.com",
  "https://trusted.example%2f@evil.example",
  "https://trusted.example%3f@evil.example",
  "https://trusted.example%23@evil.example"
]) {
  test("rejects encoded credential or authority delimiters without echoing input", () => {
    assert.throws(
      () => parseAllowedOrigins(value),
      (error) => {
        assert.match(error.message, /security configuration.*APP_ORIGINS/i);
        assert.equal(
          error.message.includes(value),
          false,
          "error must not echo the configured origin"
        );
        return true;
      }
    );
  });
}

for (const [name, value] of [
  ["malformed URL", "not-an-origin"],
  ["credentials", "https://user:password@example.com"],
  ["empty user information", "https://@example.com"],
  ["wildcard host", "https://*.example.com"],
  ["opaque URL", "data:text/plain,hello"],
  ["configured path", "https://example.com/private"],
  ["dot-normalized configured path", "https://example.com/private/.."],
  ["query string", "https://example.com/?source=test"],
  ["fragment", "https://example.com/#section"],
  ["repeated root slash", "https://example.com//"],
  ["backslash path", "https://example.com\\private"]
]) {
  test(`rejects ${name} in an allowed origin`, () => {
    assert.throws(
      () => parseAllowedOrigins(value),
      /security configuration.*APP_ORIGINS/i
    );
  });
}

test("accepts strong distinct production configuration", () => {
  assert.deepEqual(
    [...validateSecurityConfig(strongProduction).allowedOrigins],
    ["https://www.aixclub.co"]
  );
});

test("rejects every exact purpose-specific development signing default in production", () => {
  assert.ok(DEVELOPMENT_SIGNING_SECRETS, "development defaults must be exported from the validator module");
  assert.deepEqual(
    Object.keys(DEVELOPMENT_SIGNING_SECRETS).sort(),
    ["AUTH_SECRET", "CSRF_SECRET", "SMS_OTP_SECRET"]
  );
  assert.equal(new Set(Object.values(DEVELOPMENT_SIGNING_SECRETS)).size, 3);

  for (const name of ["AUTH_SECRET", "CSRF_SECRET", "SMS_OTP_SECRET"]) {
    assert.throws(
      () => validateSecurityConfig({
        ...strongProduction,
        [name]: DEVELOPMENT_SIGNING_SECRETS[name]
      }),
      new RegExp(`security configuration.*${name}`, "i"),
      name
    );
  }
});

test("server consumes the centralized development signing defaults", async () => {
  const serverSource = await readFile(join(process.cwd(), "server.js"), "utf8");
  assert.equal(
    serverSource.includes("DEVELOPMENT_SIGNING_SECRETS"),
    true,
    "server must import the centralized development defaults"
  );
  assert.equal(
    serverSource.includes("function deriveDevelopmentSigningSecret"),
    false,
    "server must not duplicate the derivation helper"
  );
  for (const name of ["AUTH_SECRET", "CSRF_SECRET", "SMS_OTP_SECRET"]) {
    assert.equal(
      serverSource.includes(`DEVELOPMENT_SIGNING_SECRETS.${name}`),
      true,
      `server must consume ${name}`
    );
  }
});

test("measures signing-secret strength in UTF-8 bytes", () => {
  const multibyte = {
    ...strongProduction,
    AUTH_SECRET: "🔐".repeat(8),
    CSRF_SECRET: "🧩".repeat(8),
    SMS_OTP_SECRET: "🚀".repeat(8)
  };
  assert.equal(Buffer.byteLength(multibyte.AUTH_SECRET, "utf8"), 32);
  assert.doesNotThrow(() => validateSecurityConfig(multibyte));

  assert.throws(
    () => validateSecurityConfig({ ...multibyte, AUTH_SECRET: "🔐".repeat(7) }),
    /security configuration.*AUTH_SECRET/i
  );
});

test("does not require production-only values in development or test", () => {
  assert.deepEqual(
    [...validateSecurityConfig({
      NODE_ENV: "test",
      APP_ORIGINS: "http://127.0.0.1:3000"
    }).allowedOrigins],
    ["http://127.0.0.1:3000"]
  );
});

for (const [name, change] of [
  ["missing auth secret", { AUTH_SECRET: "" }],
  ["missing csrf secret", { CSRF_SECRET: "" }],
  ["missing sms secret", { SMS_OTP_SECRET: "" }],
  ["short auth secret", { AUTH_SECRET: "a".repeat(31) }],
  ["short csrf secret", { CSRF_SECRET: "short" }],
  ["reused signing secrets", { CSRF_SECRET: "a".repeat(32) }],
  ["missing admin email", { ADMIN_EMAIL: "" }],
  ["invalid admin email", { ADMIN_EMAIL: "owner@example" }],
  ["missing admin password", { ADMIN_PASSWORD: "" }],
  ["default admin password", { ADMIN_PASSWORD: "admin1234" }],
  ["short admin password", { ADMIN_PASSWORD: "thirteen-char" }],
  ["missing origins", { APP_ORIGINS: "" }],
  ["insecure production origin", { APP_ORIGINS: "http://example.com" }],
  ["production origin path", { APP_ORIGINS: "https://example.com/private" }]
]) {
  test(`rejects ${name} in production`, () => {
    assert.throws(
      () => validateSecurityConfig({ ...strongProduction, ...change }),
      /security configuration/i
    );
  });
}

async function spawnWeakProductionServer(dataDir) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      AIX_SKIP_LOCAL_ENV: "1",
      NODE_ENV: "production",
      PORT: "0",
      DATA_DIR: dataDir,
      UPLOAD_DIR: join(dataDir, "uploads"),
      DATABASE_URL: "",
      SUPABASE_DATABASE_URL: "",
      SUPABASE_DB_URL: "",
      AUTH_SECRET: "short",
      CSRF_SECRET: "short",
      SMS_OTP_SECRET: "short",
      ADMIN_EMAIL: "owner@example.com",
      ADMIN_PASSWORD: "admin1234",
      APP_ORIGINS: "https://www.aixclub.co"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });

  const timeout = setTimeout(() => child.kill("SIGKILL"), 3_000);
  timeout.unref();
  const [code, signal] = await once(child, "close");
  clearTimeout(timeout);
  return { code, signal, output };
}

test("weak production startup exits before creating data, database, or upload paths", async (t) => {
  const sandbox = await mkdtemp(join(tmpdir(), "aix-config-security-"));
  const dataDir = join(sandbox, "must-not-exist");
  const sentinel = join(sandbox, "outside-sentinel.txt");
  await writeFile(sentinel, "untouched");
  t.after(() => rm(sandbox, { recursive: true, force: true }));

  const result = await spawnWeakProductionServer(dataDir);

  assert.equal(result.signal, null, "server must fail itself rather than reach the timeout");
  assert.notEqual(result.code, 0);
  assert.match(result.output, /Invalid production security configuration: AUTH_SECRET/i);
  await assert.rejects(lstat(dataDir), { code: "ENOENT" });
  assert.equal(await readFile(sentinel, "utf8"), "untouched");
});
