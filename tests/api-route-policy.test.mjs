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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("every API route has exactly one policy", () => {
  const policyRoutes = Object.values(API_ROUTE_POLICIES).flat().sort();
  assert.deepEqual(policyRoutes, declaredRoutes());
  assert.equal(new Set(policyRoutes).size, policyRoutes.length);
});

test("member and admin declarations include their auth middleware", () => {
  for (const route of API_ROUTE_POLICIES.member) {
    const [method, path] = route.split(" ");
    assert.match(source, new RegExp(`app\\.${method.toLowerCase()}\\('${escapeRegex(path)}',\\s*requireMemberSession`));
  }
  for (const route of API_ROUTE_POLICIES.admin) {
    const [method, path] = route.split(" ");
    assert.match(source, new RegExp(`app\\.${method.toLowerCase()}\\('${escapeRegex(path)}',\\s*requireAdminSession`));
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
