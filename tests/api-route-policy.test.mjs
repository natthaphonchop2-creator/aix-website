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

const HTTP_ROUTE_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

function unsupportedRouting(message) {
  return new Error(`Unsupported API routing syntax: ${message}`);
}

function tokenizeJavaScript(sourceText) {
  const tokens = [];
  const templateExpressions = [];
  let index = 0;

  function push(type, value, start, end = index) {
    tokens.push({ type, value, start, end });
  }

  function readQuotedString(quote) {
    const start = index;
    index += 1;
    let value = "";
    const escapes = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v", 0: "\0" };
    while (index < sourceText.length) {
      const char = sourceText[index];
      if (char === quote) {
        index += 1;
        push("string", value, start);
        return;
      }
      if (char === "\\") {
        index += 1;
        if (index >= sourceText.length) throw unsupportedRouting("unterminated string literal");
        const escaped = sourceText[index];
        index += 1;
        if (escaped === "\n") continue;
        if (escaped === "\r") {
          if (sourceText[index] === "\n") index += 1;
          continue;
        }
        value += escapes[escaped] ?? escaped;
        continue;
      }
      value += char;
      index += 1;
    }
    throw unsupportedRouting("unterminated string literal");
  }

  function readTemplate(openingBacktick = true) {
    const start = index;
    if (openingBacktick) index += 1;
    let value = "";
    while (index < sourceText.length) {
      const char = sourceText[index];
      const next = sourceText[index + 1];
      if (char === "\\") {
        value += char;
        index += 1;
        if (index < sourceText.length) {
          value += sourceText[index];
          index += 1;
        }
        continue;
      }
      if (char === "`") {
        index += 1;
        push("template", value, start);
        return;
      }
      if (char === "$" && next === "{") {
        push("template", value, start);
        const expressionStart = index;
        index += 2;
        push("punctuator", "{", expressionStart);
        templateExpressions.push({ braceDepth: 0 });
        return;
      }
      value += char;
      index += 1;
    }
    throw unsupportedRouting("unterminated template literal");
  }

  function regexCanStart() {
    const previous = tokens.at(-1);
    if (!previous) return true;
    if (previous.type === "identifier") {
      return new Set([
        "return", "throw", "case", "delete", "void", "typeof", "instanceof", "in", "of",
        "yield", "await", "else", "do"
      ]).has(previous.value);
    }
    if (previous.value === ")") {
      let depth = 0;
      for (let tokenIndex = tokens.length - 1; tokenIndex >= 0; tokenIndex -= 1) {
        if (tokens[tokenIndex].value === ")") depth += 1;
        if (tokens[tokenIndex].value !== "(") continue;
        depth -= 1;
        if (depth !== 0) continue;
        return new Set(["if", "while", "for", "with", "switch"]).has(tokens[tokenIndex - 1]?.value);
      }
    }
    return previous.type === "punctuator" && new Set([
      "(", "[", "{", ",", ";", "=", ":", "!", "?", "&", "|", "+", "-", "*", "%", "~", "<", ">"
    ]).has(previous.value);
  }

  function readRegex() {
    const start = index;
    let value = "/";
    index += 1;
    let inClass = false;
    while (index < sourceText.length) {
      const char = sourceText[index];
      value += char;
      index += 1;
      if (char === "\\") {
        if (index < sourceText.length) {
          value += sourceText[index];
          index += 1;
        }
        continue;
      }
      if (char === "[") inClass = true;
      else if (char === "]") inClass = false;
      else if (char === "/" && !inClass) {
        while (/[A-Za-z]/.test(sourceText[index] || "")) {
          value += sourceText[index];
          index += 1;
        }
        push("regex", value, start);
        return;
      }
    }
    throw unsupportedRouting("unterminated regular expression literal");
  }

  while (index < sourceText.length) {
    const char = sourceText[index];
    const next = sourceText[index + 1];
    if (templateExpressions.length && char === "}") {
      const expression = templateExpressions.at(-1);
      if (expression.braceDepth === 0) {
        const start = index;
        index += 1;
        push("punctuator", "}", start);
        templateExpressions.pop();
        readTemplate(false);
        continue;
      }
      expression.braceDepth -= 1;
    } else if (templateExpressions.length && char === "{") {
      templateExpressions.at(-1).braceDepth += 1;
    }
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (char === "/" && next === "/") {
      index += 2;
      while (index < sourceText.length && !/[\r\n]/.test(sourceText[index])) index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const close = sourceText.indexOf("*/", index + 2);
      if (close === -1) throw unsupportedRouting("unterminated block comment");
      index = close + 2;
      continue;
    }
    if (char === "'" || char === '"') {
      readQuotedString(char);
      continue;
    }
    if (char === "`") {
      readTemplate();
      continue;
    }
    if (char === "/" && regexCanStart()) {
      readRegex();
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      index += 1;
      while (/[A-Za-z0-9_$]/.test(sourceText[index] || "")) index += 1;
      push("identifier", sourceText.slice(start, index), start);
      continue;
    }
    if (/[0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (/[A-Za-z0-9_.]/.test(sourceText[index] || "")) index += 1;
      push("number", sourceText.slice(start, index), start);
      continue;
    }
    const start = index;
    index += 1;
    push("punctuator", char, start);
  }

  return tokens;
}

function parseCallArguments(tokens, openParenthesisIndex) {
  const closingFor = { "(": ")", "[": "]", "{": "}" };
  const stack = [")"];
  const argumentsList = [];
  let current = [];

  for (let index = openParenthesisIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "punctuator" && closingFor[token.value]) {
      stack.push(closingFor[token.value]);
      current.push(token);
      continue;
    }
    if (token.type === "punctuator" && token.value === stack.at(-1)) {
      if (stack.length === 1) {
        if (current.length || argumentsList.length) argumentsList.push(current);
        return { arguments: argumentsList, endIndex: index };
      }
      stack.pop();
      current.push(token);
      continue;
    }
    if (token.type === "punctuator" && token.value === "," && stack.length === 1) {
      argumentsList.push(current);
      current = [];
      continue;
    }
    current.push(token);
  }

  throw unsupportedRouting("unterminated app call expression");
}

function literalStringArgument(argumentTokens) {
  return argumentTokens?.length === 1 && argumentTokens[0].type === "string"
    ? argumentTokens[0].value
    : null;
}

function argumentReferencesApi(argumentTokens = []) {
  return argumentTokens.some((token) => {
    if (token.type === "string" || token.type === "template") {
      return token.value === "/api" || token.value.startsWith("/api/");
    }
    return token.type === "regex" && /api/i.test(token.value);
  });
}

function isFunctionArgument(argumentTokens = []) {
  if (argumentTokens[0]?.type === "identifier" && argumentTokens[0].value === "function") return true;
  return argumentTokens.some((token, index) => (
    token.value === "=" && argumentTokens[index + 1]?.value === ">"
  ));
}

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function parseAppRoutes(sourceText = source) {
  const tokens = tokenizeJavaScript(sourceText);
  const routes = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];

    if (token.type === "identifier" && token.value === "app" && next?.value === "[") {
      throw unsupportedRouting("computed app[...] access");
    }
    if (
      token.type === "identifier" && token.value === "express"
      && next?.value === "." && afterNext?.type === "identifier" && afterNext.value === "Router"
      && tokens[index + 3]?.value === "("
    ) {
      throw unsupportedRouting("express.Router() requires explicit API classification");
    }
    if (token.value === "=" && next?.type === "identifier" && next.value === "app") {
      throw unsupportedRouting("an alias of app can hide API routes");
    }

    if (
      token.type !== "identifier" || next?.value !== "."
      || afterNext?.type !== "identifier" || tokens[index + 3]?.value !== "("
    ) continue;

    const receiver = token.value;
    const method = afterNext.value;
    const parsed = parseCallArguments(tokens, index + 3);
    const firstArgument = parsed.arguments[0] || [];
    const pathname = literalStringArgument(firstArgument);
    const referencesApi = argumentReferencesApi(firstArgument);

    if (receiver === "app" && HTTP_ROUTE_METHODS.has(method)) {
      if (pathname !== null && isApiPath(pathname)) {
        routes.push({
          method: method.toUpperCase(),
          path: pathname,
          arguments: parsed.arguments
        });
      } else if (pathname === null && referencesApi) {
        throw unsupportedRouting(`computed API pathname in app.${method}()`);
      } else if (pathname === null && firstArgument[0]?.type !== "template") {
        throw unsupportedRouting(`non-literal pathname in app.${method}()`);
      }
    } else if (receiver === "app" && (method === "use" || method === "route")) {
      if (
        (pathname !== null && isApiPath(pathname))
        || (!isFunctionArgument(firstArgument) && referencesApi)
        || (method === "use" && pathname === null && parsed.arguments.length > 1)
        || (method === "route" && pathname === null)
      ) {
        throw unsupportedRouting(`app.${method}() API mount`);
      }
    } else if (receiver === "app" && pathname !== null && isApiPath(pathname)) {
      throw unsupportedRouting(`unsupported app.${method}() API method`);
    } else if (
      receiver !== "app"
      && HTTP_ROUTE_METHODS.has(method)
      && pathname !== null
      && isApiPath(pathname)
    ) {
      throw unsupportedRouting(`${receiver}.${method}() may be an API router alias`);
    }
  }

  return routes;
}

function declaredRoutes(sourceText = source) {
  return parseAppRoutes(sourceText)
    .map((route) => `${route.method} ${route.path}`)
    .sort();
}

function argumentIdentifier(argumentTokens) {
  return argumentTokens?.length === 1 && argumentTokens[0].type === "identifier"
    ? argumentTokens[0].value
    : null;
}

function routesByKey(sourceText = source) {
  return new Map(parseAppRoutes(sourceText).map((route) => [`${route.method} ${route.path}`, route]));
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
  const synthetic = `
    app.get('/api/single', publicHandler);
    app
      .post(
        "/api/double",
        requireMemberSession,
        memberHandler
      );
  `;
  assert.deepEqual(declaredRoutes(synthetic), ["GET /api/single", "POST /api/double"]);
});

test("route discovery ignores comments and ordinary strings", () => {
  const synthetic = `
    // app.get('/api/comment', requireMemberSession, handler);
    /* app.post('/api/block-comment', requireMemberSession, handler); */
    const sample = "app.delete('/api/string', requireAdminSession, handler)";
    app.get('/not-api', publicHandler);
  `;
  assert.deepEqual(declaredRoutes(synthetic), []);
});

test("route discovery scans active template interpolations", () => {
  const synthetic = "const result = `${app.get('/api/template-expression', handler)}`;";
  assert.deepEqual(declaredRoutes(synthetic), ["GET /api/template-expression"]);
});

test("route discovery ignores regular expression contents after control flow", () => {
  const synthetic = String.raw`if (enabled) /app.get('\/api\/regex-fake', handler)/.test(value);`;
  assert.deepEqual(declaredRoutes(synthetic), []);
});

test("middleware identity comes from the matched call arguments", () => {
  const synthetic = `
    app.get('/api/member/example', otherMiddleware, () => {
      const unrelated = "requireMemberSession";
    });
  `;
  const route = routesByKey(synthetic).get("GET /api/member/example");
  assert.equal(argumentIdentifier(route?.arguments[1]), "otherMiddleware");
});

test("route discovery fails closed for unsupported API routing forms", () => {
  for (const synthetic of [
    "app['get']('/api/computed', handler);",
    "const router = express.Router();",
    "app.use('/api', apiRouter);",
    "const prefix = '/api'; app.use(prefix, apiRouter);",
    "router.get('/api/alias', handler);",
    "const apiApp = app; apiApp.get('/api/direct-alias', handler);"
  ]) {
    assert.throws(() => parseAppRoutes(synthetic), /Unsupported API routing syntax/, synthetic);
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
  const { token } = await loginResponse.json();
  assert.equal(typeof token, "string");

  const createResponse = await fetch(`${server.origin}/api/courses`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
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
