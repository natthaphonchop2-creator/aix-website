import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { METHODS } from "node:http";
import { parse } from "acorn";

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
    "GET /api/admin/session", "POST /api/admin/logout",
    "GET /api/admin/replays", "POST /api/admin/replays", "PUT /api/admin/replays/:id", "DELETE /api/admin/replays/:id",
    "GET /api/admin/resources", "POST /api/admin/resources", "PUT /api/admin/resources/:id", "DELETE /api/admin/resources/:id",
    "GET /api/admin/schedules", "POST /api/admin/schedules", "PUT /api/admin/schedules/:id", "DELETE /api/admin/schedules/:id",
    "POST /api/admin/schedules/:id/notify", "GET /api/leads", "POST /api/leads", "PUT /api/leads/:id", "DELETE /api/leads/:id",
    "GET /api/users", "GET /api/users/:id", "PUT /api/users/:id", "DELETE /api/users/:id", "POST /api/users/:id/enroll",
    "GET /api/packages", "PUT /api/packages/:id", "GET /api/stats"
  ],
  disabled: ["POST /api/auth/signup", "POST /api/auth/login"]
};

const POLICY_ROUTE_METHODS = new Set(["get", "post", "put", "patch", "delete"]);
const EXPRESS_ROUTE_METHODS = new Set([...METHODS.map((method) => method.toLowerCase()), "all"]);
const ROUTER_METHODS = new Set([...EXPRESS_ROUTE_METHODS, "use", "route"]);

function unsupportedRouting(message, node) {
  const location = node?.loc?.start ? ` at line ${node.loc.start.line}` : "";
  return new Error(`Unsupported API routing syntax${location}: ${message}`);
}

function parseProgram(sourceText) {
  try {
    return parse(sourceText, {
      ecmaVersion: "latest",
      sourceType: "script",
      locations: true
    });
  } catch (error) {
    throw unsupportedRouting(`JavaScript parse failed: ${error.message}`);
  }
}

function walkAst(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    if (Array.isArray(value)) {
      for (const child of value) walkAst(child, visit, node);
    } else if (value && typeof value.type === "string") {
      walkAst(value, visit, node);
    }
  }
}

function isIdentifier(node, name) {
  return node?.type === "Identifier" && node.name === name;
}

function bindingPatternContainsName(pattern, name) {
  if (!pattern) return false;
  if (pattern.type === "Identifier") return pattern.name === name;
  if (pattern.type === "RestElement") return bindingPatternContainsName(pattern.argument, name);
  if (pattern.type === "AssignmentPattern") return bindingPatternContainsName(pattern.left, name);
  if (pattern.type === "ArrayPattern") {
    return pattern.elements.some((element) => bindingPatternContainsName(element, name));
  }
  if (pattern.type === "ObjectPattern") {
    return pattern.properties.some((property) => (
      property.type === "RestElement"
        ? bindingPatternContainsName(property.argument, name)
        : bindingPatternContainsName(property.value, name)
    ));
  }
  return false;
}

function isExpressFactoryCall(node) {
  return node?.type === "CallExpression"
    && isIdentifier(node.callee, "express")
    && node.arguments.length === 0
    && !node.optional;
}

function findExpressAppDeclarator(program) {
  const matches = [];
  for (const statement of program.body) {
    if (
      statement.type !== "VariableDeclaration"
      || statement.kind !== "const"
      || statement.declarations.length !== 1
    ) continue;
    const declarator = statement.declarations[0];
    if (isIdentifier(declarator.id, "app") && isExpressFactoryCall(declarator.init)) {
      matches.push(declarator);
    }
  }
  if (matches.length !== 1) {
    throw unsupportedRouting("expected exactly one top-level `const app = express()` binding", program);
  }
  return matches[0];
}

function rejectShadowedAppBinding(node, expressAppDeclarator) {
  if (node.type === "VariableDeclarator" && bindingPatternContainsName(node.id, "app")) {
    if (node !== expressAppDeclarator) throw unsupportedRouting("another variable binding shadows app", node);
    return;
  }
  if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") {
    if (bindingPatternContainsName(node.id, "app")) {
      throw unsupportedRouting("a function name shadows app", node);
    }
    if (node.params.some((parameter) => bindingPatternContainsName(parameter, "app"))) {
      throw unsupportedRouting("a function parameter shadows app", node);
    }
    return;
  }
  if (node.type === "ClassDeclaration" || node.type === "ClassExpression") {
    if (bindingPatternContainsName(node.id, "app")) {
      throw unsupportedRouting("a class name shadows app", node);
    }
    return;
  }
  if (node.type === "CatchClause" && bindingPatternContainsName(node.param, "app")) {
    throw unsupportedRouting("a catch parameter shadows app", node);
  }
}

function memberPropertyName(member) {
  if (member?.type !== "MemberExpression") return null;
  if (!member.computed && member.property.type === "Identifier") return member.property.name;
  if (member.computed && member.property.type === "Literal" && typeof member.property.value === "string") {
    return member.property.value;
  }
  return null;
}

function plainStringLiteral(node) {
  return node?.type === "Literal" && typeof node.value === "string" ? node.value : null;
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function parseAppRoutes(sourceText = source) {
  const routes = [];
  const program = parseProgram(sourceText);
  const expressAppDeclarator = findExpressAppDeclarator(program);

  walkAst(program, (node, parent) => {
    rejectShadowedAppBinding(node, expressAppDeclarator);
    if (node.type === "WithStatement") {
      throw unsupportedRouting("with statements can shadow the Express app binding", node);
    }
    if (node.type === "VariableDeclarator" && isIdentifier(node.init, "app")) {
      throw unsupportedRouting("an alias of app can hide API routes", node);
    }
    if (node.type === "AssignmentExpression") {
      if (isIdentifier(node.right, "app")) {
        throw unsupportedRouting("an assignment alias of app can hide API routes", node);
      }
      if (bindingPatternContainsName(node.left, "app")) {
        throw unsupportedRouting("the Express app binding cannot be reassigned", node);
      }
    }
    if (node.type === "UpdateExpression" && bindingPatternContainsName(node.argument, "app")) {
      throw unsupportedRouting("the Express app binding cannot be updated", node);
    }
    if (
      (node.type === "ForInStatement" || node.type === "ForOfStatement")
      && node.left.type !== "VariableDeclaration"
      && bindingPatternContainsName(node.left, "app")
    ) {
      throw unsupportedRouting("the Express app binding cannot be reassigned by iteration", node);
    }
    if (node.type === "MemberExpression" && isIdentifier(node.object, "app")) {
      const method = memberPropertyName(node);
      const directCall = parent?.type === "CallExpression" && parent.callee === node;
      if (node.computed || node.optional) {
        throw unsupportedRouting("computed or optional app route access", node);
      }
      if (ROUTER_METHODS.has(method) && !directCall) {
        throw unsupportedRouting(`an alias of app.${method} can hide API routes`, node);
      }
    }
    if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") return;

    const callee = node.callee;
    const method = memberPropertyName(callee);
    const pathname = plainStringLiteral(node.arguments[0]);
    const directApp = isIdentifier(callee.object, "app");
    const optionalCall = Boolean(node.optional || callee.optional || parent?.type === "ChainExpression");

    if (isIdentifier(callee.object, "express") && method === "Router") {
      throw unsupportedRouting("express.Router() requires explicit API classification", node);
    }

    if (directApp && (callee.computed || optionalCall)) {
      throw unsupportedRouting("computed or optional app route access", node);
    }

    if (directApp && EXPRESS_ROUTE_METHODS.has(method)) {
      if (pathname === null) {
        throw unsupportedRouting(`dynamic pathname in app.${method}()`, node.arguments[0] || node);
      }
      if (!POLICY_ROUTE_METHODS.has(method)) {
        if (isApiPath(pathname)) {
          throw unsupportedRouting(`app.${method}() is outside the approved API policy methods`, node);
        }
        return;
      }
      if (isApiPath(pathname)) {
        routes.push({
          method: method.toUpperCase(),
          path: pathname,
          arguments: node.arguments
        });
      }
      return;
    }

    if (directApp && method === "use") {
      if (pathname !== null && isApiPath(pathname)) {
        throw unsupportedRouting("app.use() API mount", node);
      }
      if (pathname === null && node.arguments.length > 1) {
        throw unsupportedRouting("computed app.use() mount path", node);
      }
      return;
    }

    if (directApp && method === "route") {
      if (pathname === null) throw unsupportedRouting("dynamic app.route() pathname", node);
      if (isApiPath(pathname)) throw unsupportedRouting("app.route() API mount", node);
      return;
    }

    if (directApp && pathname !== null && isApiPath(pathname)) {
      throw unsupportedRouting(`unsupported app.${method || "<computed>"}() API method`, node);
    }

    if (!directApp && ROUTER_METHODS.has(method) && pathname !== null && isApiPath(pathname)) {
      throw unsupportedRouting(`${method}() on a non-app receiver may hide an API router alias`, node);
    }
  });

  return routes;
}

function declaredRoutes(sourceText = source) {
  return parseAppRoutes(sourceText)
    .map((route) => `${route.method} ${route.path}`)
    .sort();
}

function argumentIdentifier(argumentNode) {
  return argumentNode?.type === "Identifier" ? argumentNode.name : null;
}

function routesByKey(sourceText = source) {
  return new Map(parseAppRoutes(sourceText).map((route) => [`${route.method} ${route.path}`, route]));
}

function withExpressApp(body) {
  return `const app = express();\n${body}`;
}

test("every API route has exactly one policy", () => {
  const policyRoutes = Object.values(API_ROUTE_POLICIES).flat().sort();
  assert.deepEqual(policyRoutes, declaredRoutes());
  assert.equal(new Set(policyRoutes).size, policyRoutes.length);
});

test("member and admin declarations include their auth middleware", () => {
  const routes = routesByKey();
  for (const route of API_ROUTE_POLICIES.member) {
    assert.equal(argumentIdentifier(routes.get(route)?.arguments[1]), "requireMemberSession", route);
  }
  for (const route of API_ROUTE_POLICIES.admin) {
    assert.equal(argumentIdentifier(routes.get(route)?.arguments[1]), "requireAdminSession", route);
  }
});

test("route discovery recognizes single and double quoted multiline app calls", () => {
  const synthetic = withExpressApp(`
    app.get('/api/single', publicHandler);
    app
      .post(
        "/api/double",
        requireMemberSession,
        memberHandler
      );
  `);
  assert.deepEqual(declaredRoutes(synthetic), ["GET /api/single", "POST /api/double"]);
});

test("route discovery ignores comments and ordinary strings", () => {
  const synthetic = withExpressApp(`
    // app.get('/api/comment', requireMemberSession, handler);
    /* app.post('/api/block-comment', requireMemberSession, handler); */
    const sample = "app.delete('/api/string', requireAdminSession, handler)";
    app.get('/not-api', publicHandler);
  `);
  assert.deepEqual(declaredRoutes(synthetic), []);
});

test("route discovery scans active template interpolations", () => {
  const synthetic = withExpressApp("const result = `${app.get('/api/template-expression', handler)}`;");
  assert.deepEqual(declaredRoutes(synthetic), ["GET /api/template-expression"]);
});

test("route discovery ignores regular expression contents after control flow", () => {
  const synthetic = withExpressApp(String.raw`if (enabled) /app.get('\/api\/regex-fake', handler)/.test(value);`);
  assert.deepEqual(declaredRoutes(synthetic), []);
});

test("route discovery ignores regular expression contents after a closed block", () => {
  const synthetic = withExpressApp(String.raw`if (enabled) {} /app.get('\/api\/block-regex-fake', handler)/.test(value);`);
  assert.deepEqual(declaredRoutes(synthetic), []);
});

test("middleware identity comes from the matched call arguments", () => {
  const synthetic = withExpressApp(`
    app.get('/api/member/example', otherMiddleware, () => {
      const unrelated = "requireMemberSession";
    });
  `);
  const route = routesByKey(synthetic).get("GET /api/member/example");
  assert.equal(argumentIdentifier(route?.arguments[1]), "otherMiddleware");
});

test("route discovery requires one exact top-level Express app binding", async (t) => {
  for (const synthetic of [
    "app.get('/api/missing-binding', handler);",
    "const app = makeApp(); app.get('/api/wrong-factory', handler);",
    "let app = express(); app.get('/api/mutable-binding', handler);",
    "const app = express('unexpected'); app.get('/api/factory-argument', handler);",
    "const app = express(), extra = true; app.get('/api/multi-declarator', handler);"
  ]) {
    await t.test(synthetic, () => {
      assert.throws(() => parseAppRoutes(synthetic), /Unsupported API routing syntax/);
    });
  }
});

test("route discovery fails closed for unsupported API routing forms", async (t) => {
  for (const body of [
    "app['get']('/api/computed', handler);",
    "const router = express.Router();",
    "app.use('/api', apiRouter);",
    "const prefix = '/api'; app.use(prefix, apiRouter);",
    "app.route('/api/chained').get(handler);",
    "app.head('/api/head', handler);",
    "app.options('/api/preflight', handler);",
    "app.all('/api/all', handler);",
    "app.options(apiPrefix, handler);",
    "app.propfind(apiPrefix, handler);",
    "router.get('/api/alias', handler);",
    "const apiApp = app; apiApp.get('/api/direct-alias', handler);",
    "wrapper.app.get('/api/nested-app', handler);",
    "factory().get('/api/call-result', handler);",
    "app?.get('/api/optional', handler);",
    "app.get(`${prefix}/secret`, handler);",
    "const register = app['get'].bind(app); register('/api/computed-alias', handler);",
    "const register = app.get; register('/api/method-alias', handler);",
    "const register = app.all; register('/api/all-alias', handler);",
    "function fake(app) { app.get('/api/members', requireAdminSession, handler); }",
    "function fake() { const app = makeApp(); app.get('/api/members', requireAdminSession, handler); }",
    "const fake = ({ app }) => app.get('/api/members', requireAdminSession, handler);",
    "const fake = (app = makeApp()) => app.get('/api/members', handler);",
    "const fake = (...app) => app[0].get('/api/members', handler);",
    "try {} catch (app) { app.get('/api/members', handler); }",
    "{ function app() {} }",
    "{ class app {} }",
    "{ const [app] = makeApps(); }",
    "{ const { nested: app } = makeApps(); }",
    "({ app } = replacement);",
    "for (app of apps) {}",
    "app = makeApp();",
    "app++;",
    "with ({ app: makeApp() }) { app.get('/api/members', handler); }"
  ]) {
    const synthetic = withExpressApp(body);
    await t.test(synthetic, () => {
      assert.throws(() => parseAppRoutes(synthetic), /Unsupported API routing syntax/);
    });
  }
});

test("anonymous config and course projections use exact public allowlists", async (t) => {
  const { startTestServer } = await import("./helpers/server-harness.mjs");
  const server = await startTestServer();
  t.after(() => server.stop());

  const configResponse = await fetch(`${server.origin}/api/config`);
  assert.equal(configResponse.status, 200);
  const config = await configResponse.json();
  assert.deepEqual(Object.keys(config).sort(), [
    "googleClientId", "googleReady", "memberPrice", "sessionTtlDays",
    "smsProvider", "smsReady", "stripePaymentMethods", "stripeReady"
  ].sort());

  const loginResponse = await fetch(`${server.origin}/api/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "owner@example.com",
      password: "correct-horse-battery-staple"
    })
  });
  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json();
  assert.equal(typeof loginBody.csrfToken, "string");
  assert.equal("token" in loginBody, false);
  const adminCookie = loginResponse.headers.getSetCookie()
    .find((cookie) => cookie.startsWith("aix_admin_session="))
    ?.split(";", 1)[0];
  assert.match(adminCookie || "", /^aix_admin_session=/);

  const createResponse = await fetch(`${server.origin}/api/courses`, {
    method: "POST",
    headers: {
      cookie: adminCookie,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      name: "Projection Boundary Fixture",
      description: "Created through the protected admin flow",
      price: 990,
      featured: true
    })
  });
  assert.equal(createResponse.status, 200);
  const created = await createResponse.json();
  assert.equal(created.featured, true, "admin fixture must contain an admin-only field");
  assert.equal("sortOrder" in created, true, "admin fixture must contain its internal ordering field");

  const publicCourseKeys = [
    "brandFocus", "description", "duration", "faq", "hours", "id", "image", "info",
    "instructor", "learners", "lessons", "lessonsCount", "level", "name", "originalPrice",
    "outcomes", "overview", "price", "project", "rating", "ratingCount", "schedule", "skills",
    "status", "students", "subtitle", "syllabus", "title", "tools", "topics", "type"
  ].sort();

  const listResponse = await fetch(`${server.origin}/api/platform/courses`);
  assert.equal(listResponse.status, 200);
  const courses = await listResponse.json();
  assert.equal(Array.isArray(courses), true);
  assert.ok(courses.length > 0, "public course list must be non-empty");
  assert.ok(courses.some((course) => course.id === created.id), "admin fixture must reach the public list");
  for (const course of courses) {
    assert.deepEqual(Object.keys(course).sort(), publicCourseKeys, `public list projection: ${course.id}`);
  }

  const detailResponse = await fetch(`${server.origin}/api/platform/courses/${encodeURIComponent(created.id)}`);
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.id, created.id);
  assert.deepEqual(Object.keys(detail).sort(), publicCourseKeys, "public detail projection");
});
