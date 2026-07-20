import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { startTestServer } from "./helpers/server-harness.mjs";

const require = createRequire(import.meta.url);
const {
  browserHeaderValues,
  cspReportOnlyValue,
  helmetOptions
} = require("../security/browser-headers.cjs");

const EXPECTED_CSP = Object.freeze({
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
  "script-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
  "frame-src": ["https://accounts.google.com", "https://js.stripe.com"],
  "media-src": ["'self'", "https:"],
  "connect-src": [
    "'self'",
    "https://accounts.google.com",
    "https://oauth2.googleapis.com",
    "https://www.googleapis.com",
    "https://api.stripe.com"
  ],
  "form-action": ["'self'"]
});

const COMMON_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy-Report-Only": Object.entries(EXPECTED_CSP)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; "),
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
});

const HSTS_VALUE = "max-age=31536000; includeSubDomains";

function parseCsp(value) {
  const directives = new Map();
  for (const section of String(value || "").split(";")) {
    const tokens = section.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const [name, ...sources] = tokens;
    assert.equal(directives.has(name), false, `duplicate CSP directive: ${name}`);
    directives.set(name, sources);
  }
  return Object.fromEntries(directives);
}

function assertCommonHeaders(response, label) {
  for (const [name, value] of Object.entries(COMMON_HEADERS)) {
    assert.equal(response.headers.get(name), value, `${label}: ${name}`);
  }
  assert.equal(response.headers.get("x-powered-by"), null, `${label}: framework disclosure`);
}

test("report-only CSP has one exact compatible allowlist per directive", () => {
  const value = cspReportOnlyValue();
  assert.deepEqual(parseCsp(value), EXPECTED_CSP);

  const scriptSources = parseCsp(value)["script-src"];
  assert.equal(scriptSources.includes("'unsafe-eval'"), false);
  assert.equal(scriptSources.includes("*"), false);
  assert.equal(scriptSources.includes("blob:"), false);
  assert.equal(scriptSources.includes("data:"), false);
  assert.equal(Object.values(parseCsp(value)).flat().includes("*"), false);
});

test("shared browser policy and Helmet options use production-only HSTS", () => {
  assert.deepEqual(browserHeaderValues(false), COMMON_HEADERS);
  assert.deepEqual(browserHeaderValues(true), {
    ...COMMON_HEADERS,
    "Strict-Transport-Security": HSTS_VALUE
  });

  assert.deepEqual(helmetOptions(false), {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    hsts: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" }
  });
  assert.deepEqual(helmetOptions(true), {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: false },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" }
  });
});

test("local responses carry exact defensive headers without HSTS or framework disclosure", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  for (const [pathname, options, expectedStatus] of [
    ["/", {}, 200],
    ["/api/health", {}, 200],
    ["/admin", {}, 200],
    ["/dashboard", { redirect: "manual" }, 302],
    ["/phase-zero-missing", {}, 404]
  ]) {
    const response = await fetch(`${server.origin}${pathname}`, options);
    assert.equal(response.status, expectedStatus, pathname);
    assertCommonHeaders(response, pathname);
    assert.equal(response.headers.get("strict-transport-security"), null, `${pathname}: local HSTS`);
  }
});

async function startProductionServer(t, appEnv) {
  const server = await startTestServer({
    NODE_ENV: "production",
    APP_ENV: appEnv,
    APP_ORIGINS: "https://www.aixclub.co"
  });
  t.after(() => server.stop());
  return server;
}

test("Express HSTS is fail-closed unless APP_ENV is exactly production", async (t) => {
  for (const [appEnv, expectedHsts] of [
    [undefined, null],
    ["production", HSTS_VALUE],
    ["staging", null]
  ]) {
    const server = await startProductionServer(t, appEnv);
    const response = await fetch(`${server.origin}/api/health`);
    assertCommonHeaders(response, `APP_ENV=${String(appEnv)}`);
    assert.equal(response.headers.get("strict-transport-security"), expectedHsts, String(appEnv));
  }
});

test("Render explicitly declares the production application environment", async () => {
  const source = await readFile(new URL("../render.yaml", import.meta.url), "utf8");
  assert.match(
    source,
    /- key: APP_ENV\s+value: production(?:\s|$)/,
    "Render must opt in to production HSTS with APP_ENV=production"
  );
});

test("browser security middleware precedes CORS and preserves Stripe raw-body order", async () => {
  const source = await readFile(new URL("../server.js", import.meta.url), "utf8");
  const appIndex = source.indexOf("const app = express()");
  const disableIndex = source.indexOf("app.disable('x-powered-by')");
  const proxyIndex = source.indexOf("if (IS_PRODUCTION) app.set('trust proxy', 1)");
  const helmetIndex = source.indexOf("app.use(helmet(helmetOptions(SEND_HSTS)))");
  const explicitHeadersIndex = source.indexOf("app.use((req, res, next) => {", helmetIndex);
  const corsIndex = source.indexOf("app.use(cors(HTTP_SECURITY.corsOptions))");
  const webhookIndex = source.indexOf("app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)");
  const jsonIndex = source.indexOf("app.use(express.json({ limit: '1mb' }))");
  const retiredIndex = source.indexOf("app.use(rejectLegacyClientToken)");
  const originIndex = source.indexOf("app.use(HTTP_SECURITY.requireMutationOrigin)");

  assert.ok(appIndex >= 0 && appIndex < disableIndex, "disable disclosure immediately after app creation");
  assert.ok(disableIndex < proxyIndex, "disclosure is disabled before proxy configuration");
  assert.ok(proxyIndex < helmetIndex, "Helmet follows environment/proxy setup");
  assert.ok(helmetIndex < explicitHeadersIndex, "shared explicit headers override Helmet values");
  assert.ok(explicitHeadersIndex < corsIndex, "browser headers run before CORS");
  assert.ok(corsIndex < webhookIndex, "CORS remains before Stripe webhook");
  assert.ok(webhookIndex < jsonIndex, "Stripe webhook retains raw-body precedence");
  assert.ok(jsonIndex < retiredIndex && retiredIndex < originIndex, "existing JSON/token/Origin order remains intact");
});
