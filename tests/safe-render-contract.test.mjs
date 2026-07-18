import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parse } from "acorn";

const rendererFunctions = {
  "script.js": ["courseCta", "renderCourses", "renderResources", "openClassModal"],
  "class-detail.js": ["renderBrandLogo", "updateDetailCtas", "renderDetail"],
  "dashboard.js": [
    "renderCourseCard", "receiptAction", "renderPaymentHistory", "renderResources",
    "renderSchedule", "renderNotifications", "renderDashboard"
  ],
  "tools-box.js": ["resourceHref", "renderResources", "renderActionCards", "renderAccess"],
  "course-content.js": ["assetUrl", "learningEntryUrl", "renderContent"],
  "course-learn.js": [
    "moduleVideo", "renderSidebar", "renderVideo", "renderChallenge", "renderReading",
    "lessonKnowledgeSummary", "renderAi", "renderRunResult", "appendAiMessage", "setAiBusy",
    "renderActiveModule"
  ],
  "admin.js": [
    "refreshDashboard", "courseOptions", "renderCourses", "renderReplays", "openReplayModal",
    "renderResourcesAdmin", "openResourceModal", "renderSchedules", "openScheduleModal",
    "renderLeads", "viewLeadDetail", "renderMembers", "editMember", "renderPackages",
    "addFeatureRow"
  ]
};

const sources = Object.fromEntries(await Promise.all(
  Object.keys(rendererFunctions).map(async (filename) => [filename, await readFile(filename, "utf8")])
));

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== "string") return;
  visit(node, parent);
  for (const [key, value] of Object.entries(node)) {
    if (["start", "end", "loc"].includes(key)) continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit, node);
    } else if (value && typeof value.type === "string") {
      walk(value, visit, node);
    }
  }
}

function memberName(node) {
  if (node?.type !== "MemberExpression") return null;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  if (node.computed && node.property.type === "Literal") return node.property.value;
  return null;
}

function isAiXCall(node, method = null) {
  if (node?.type !== "CallExpression" || node.callee?.type !== "MemberExpression") return false;
  const isAiXDom = node.callee.object?.type === "Identifier" && node.callee.object.name === "AiXDom";
  return isAiXDom && (!method || memberName(node.callee) === method);
}

function containsAiXCall(node, method = null) {
  let found = false;
  walk(node, (child) => { if (isAiXCall(child, method)) found = true; });
  return found;
}

function programFor(filename) {
  return parse(sources[filename], {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true
  });
}

function functionNode(filename, name) {
  const matches = [];
  walk(programFor(filename), (node) => {
    if (node.type === "FunctionDeclaration" && node.id?.name === name) matches.push(node);
  });
  assert.equal(matches.length, 1, `${filename} must declare exactly one function ${name}`);
  return matches[0];
}

function functionSource(filename, name) {
  const node = functionNode(filename, name);
  return sources[filename].slice(node.start, node.end);
}

function assertSafeRenderer(filename, name) {
  const node = functionNode(filename, name);
  const failures = [];

  walk(node.body, (child) => {
    if (child.type === "AssignmentExpression" && child.left.type === "MemberExpression") {
      const property = memberName(child.left);
      if (["innerHTML", "outerHTML", "className", "style"].includes(property)) {
        failures.push(`${property} assignment at line ${child.loc.start.line}`);
      }
      if (["href", "src", "poster"].includes(property) && !containsAiXCall(child.right, "safeUrl")) {
        failures.push(`raw ${property} assignment at line ${child.loc.start.line}`);
      }
    }

    if (child.type !== "CallExpression" || child.callee.type !== "MemberExpression") return;
    const method = memberName(child.callee);
    if (method === "insertAdjacentHTML") failures.push(`insertAdjacentHTML at line ${child.loc.start.line}`);
    if (method === "write" && child.callee.object?.type === "Identifier" && child.callee.object.name === "document") {
      failures.push(`document.write at line ${child.loc.start.line}`);
    }
    if (method !== "setAttribute" || child.arguments[0]?.type !== "Literal") return;
    const attribute = String(child.arguments[0].value || "").toLowerCase();
    if (/^on/.test(attribute) || ["style", "srcdoc", "action", "formaction", "xlink:href", "xmlns"].includes(attribute)) {
      failures.push(`unsafe ${attribute} attribute at line ${child.loc.start.line}`);
    }
    if (["href", "src", "poster"].includes(attribute) && !containsAiXCall(child.arguments[1], "safeUrl")) {
      failures.push(`raw ${attribute} attribute at line ${child.loc.start.line}`);
    }
  });

  assert.deepEqual(failures, [], `${filename}:${name}\n${failures.join("\n")}`);
  assert.equal(
    containsAiXCall(node.body),
    true,
    `${filename}:${name} must construct, replace, link, or validate through AiXDom`
  );
}

test("every server-data renderer has an AST-enforced safe DOM boundary", () => {
  for (const [filename, names] of Object.entries(rendererFunctions)) {
    for (const name of names) assertSafeRenderer(filename, name);
  }
});

test("affected scripts contain no generated inline handlers, script URLs, or private file paths", () => {
  for (const [filename, source] of Object.entries(sources)) {
    assert.doesNotMatch(source, /\bfilePath\b/, filename);
    assert.doesNotMatch(source, /on(?:click|change)\s*=\s*["']/i, filename);
    assert.doesNotMatch(source, /javascript\s*:/i, filename);
  }
});

test("runtime action IDs use listeners and dynamic API path segments are encoded", () => {
  assert.match(functionSource("dashboard.js", "renderNotifications"), /addEventListener\("click", \(\) => markNotificationRead\(notice\.id\)\)/);
  assert.match(
    functionSource("script.js", "openClassModal"),
    /data-course-signup/,
    "the rebuilt modal CTA must remain discoverable by initRainbowButtons"
  );

  for (const name of [
    "renderCourses", "renderReplays", "renderResourcesAdmin", "renderSchedules", "renderLeads",
    "renderMembers", "renderPackages", "addFeatureRow"
  ]) assert.match(functionSource("admin.js", name), /addEventListener\("(?:click|change)"/, name);

  const adminSource = sources["admin.js"];
  assert.doesNotMatch(adminSource, /\/\$\{(?:id|idStr|leadId|item\.id|l\.id|m\.id)\}/);
  for (const idName of ["idStr", "id", "leadId"]) {
    assert.match(adminSource, new RegExp(`encodeURIComponent\\(${idName}\\)`), idName);
  }
});

test("runtime classes and icons come from fixed maps or authored boolean branches", () => {
  assert.match(sources["script.js"], /const courseToneByLevel = Object\.freeze\(\{/);
  assert.match(sources["script.js"], /if \(Object\.hasOwn\(courseToneByLevel, course\.level\)\) return courseToneByLevel\[course\.level\];/);
  assert.match(sources["dashboard.js"], /function resourceIcon\([\s\S]*?const map = \{/);
  assert.match(sources["dashboard.js"], /function scheduleStatus\([\s\S]*?className: "is-live"/);
  assert.match(sources["tools-box.js"], /function toolLibraryIcon\(kind\)[\s\S]*?kind === "prompt"/);
  assert.match(sources["course-learn.js"], /function aiMessageRoleClass\(role\)[\s\S]*?role === "user"/);
  assert.match(sources["admin.js"], /const adminClassMaps = Object\.freeze\(\{/);
  assert.match(sources["admin.js"], /function adminMappedClass\(group, value, fallback = ""\)/);
  assert.match(sources["script.js"], /function publicResourceIcon\(icon\)[\s\S]*?Object\.hasOwn\(map, icon\)/);
  assert.doesNotMatch(functionSource("script.js", "renderResources"), /className:\s*`[^`]*\$\{resource\.icon\}/);
});

test("fixed maps reject inherited prototype keys", () => {
  assert.match(sources["script.js"], /Object\.hasOwn\(iconMap, course\.level\)/);
  assert.match(sources["script.js"], /Object\.hasOwn\(iconsById, course\.id\)/);
  assert.match(sources["script.js"], /Object\.hasOwn\(logosById, course\.id\)/);
  assert.match(sources["script.js"], /Object\.hasOwn\(courseToneByLevel, course\.level\)/);
  assert.match(sources["dashboard.js"], /Object\.hasOwn\(map, type\)/);
  assert.match(sources["course-content.js"], /Object\.hasOwn\(map, type\)/);
  assert.match(sources["tools-box.js"], /Object\.hasOwn\(map, type\)/);
  assert.match(sources["class-detail.js"], /Object\.hasOwn\(aiBrandCatalog, name\)/);
  assert.match(
    functionSource("class-detail.js", "getCourse"),
    /Object\.hasOwn\(detailCourses, id\)/,
    "URL-controlled course IDs must not resolve Object prototype members"
  );
  assert.match(sources["admin.js"], /Object\.hasOwn\(map, key\)/);
});

test("dashboard keeps bounded progress and raw values for text-node rendering", () => {
  assert.match(sources["dashboard.js"], /function boundedProgressNumber\(value,[\s\S]*?Number\.isFinite\(number\)/);
  assert.match(functionSource("dashboard.js", "courseLearnUrl"), /boundedProgressNumber\(moduleIndex/);
  assert.match(functionSource("dashboard.js", "mergeServerProgress"), /boundedProgressNumber\(progress\.completedCount\)/);
  assert.match(sources["dashboard.js"], /return value \? String\(method\) : "Stripe";/);
  assert.doesNotMatch(sources["dashboard.js"], /return value \? escapeHtml\(method\) : "Stripe";/);
});

test("dashboard progress rejects non-finite values and clamps storage, styles, and navigation", () => {
  let stored = JSON.stringify({
    courses: {
      bad: { totalModules: "Infinity", completedCount: "NaN", activeIndex: "Infinity" },
      capped: { totalModules: 50000, completedCount: 50000, activeIndex: 50000 }
    }
  });
  const context = {
    localStorage: {
      getItem: () => stored,
      setItem: (_key, value) => { stored = value; }
    }
  };
  const functions = [
    "courseStartUrl", "boundedProgressNumber", "courseLearnUrl", "numberFromText",
    "readLearningProgress", "mergeServerProgress", "courseLearningProgress"
  ].map((name) => functionSource("dashboard.js", name)).join("\n");

  vm.runInNewContext(`
    const PROGRESS_KEY = "progress-test";
    const MAX_PROGRESS_MODULES = 10000;
    ${functions}
    resultBad = courseLearningProgress({ id: "bad", lessonsCount: Infinity, lessons: "NaN modules" });
    resultCapped = courseLearningProgress({ id: "capped", lessonsCount: 0, lessons: "0 modules" });
    mergeServerProgress([{ courseId: "server", completedCount: Infinity, totalModules: Infinity, activeIndex: Infinity }]);
    resultStored = JSON.parse(localStorage.getItem(PROGRESS_KEY));
  `, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.resultBad)), {
    totalModules: 0,
    completedCount: 0,
    activeIndex: 0,
    percent: 0,
    started: false,
    url: "/course/bad/start"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.resultCapped)), {
    totalModules: 10000,
    completedCount: 10000,
    activeIndex: 9999,
    percent: 100,
    started: true,
    url: "/course/capped/learn?module=9999&ready=1"
  });
  assert.deepEqual(JSON.parse(JSON.stringify(context.resultStored.courses.server)), {
    courseId: "server",
    completedCount: 0,
    totalModules: 0,
    activeIndex: 0
  });
});

test("course content fails closed when an internal course path has malformed encoding", () => {
  const source = functionSource("course-content.js", "learningEntryUrl");
  assert.match(source, /try \{[\s\S]*?courseStartUrl\(decodeURIComponent\(match\[1\]\)\)[\s\S]*?\} catch \{/);
  assert.match(source, /catch \{[\s\S]*?destination = courseStartUrl\(courseId\);/);
  assert.match(source, /return AiXDom\.safeUrl\(destination,/);
});

test("every affected page loads safe-dom after the API client and before its renderer", async () => {
  const pages = {
    "index.html": /(?:^|\/)script\.js(?:\?|$)/,
    "class-detail.html": /(?:^|\/)class-detail\.js(?:\?|$)/,
    "dashboard.html": /(?:^|\/)dashboard\.js(?:\?|$)/,
    "tools-box.html": /(?:^|\/)tools-box\.js(?:\?|$)/,
    "course-content.html": /(?:^|\/)course-content\.js(?:\?|$)/,
    "course-learn.html": /(?:^|\/)course-learn\.js(?:\?|$)/,
    "admin.html": /(?:^|\/)admin\.js(?:\?|$)/
  };

  for (const [filename, pageScript] of Object.entries(pages)) {
    const html = await readFile(filename, "utf8");
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map((match) => match[1]);
    const apiIndex = scripts.findIndex((src) => /^\/aix-api-client\.js(?:\?|$)/.test(src));
    const domIndex = scripts.findIndex((src) => /^\/safe-dom\.js(?:\?|$)/.test(src));
    const rendererIndex = scripts.findIndex((src) => pageScript.test(src));
    assert.ok(apiIndex >= 0, `${filename} API client`);
    assert.ok(domIndex > apiIndex, `${filename} safe-dom must load after API client`);
    assert.ok(rendererIndex > domIndex, `${filename} safe-dom must load before renderer`);
  }
});

test("the safe helper is public while member and admin shells keep their existing boundaries", async () => {
  const manifest = await readFile("security/publication-manifest.cjs", "utf8");
  assert.match(manifest, /"safe-dom\.js"/);
  for (const privateFile of [
    "dashboard.html", "dashboard.js", "tools-box.html", "tools-box.js", "course-content.html",
    "course-content.js", "course-learn.html", "course-learn.js", "admin.html", "admin.js"
  ]) assert.doesNotMatch(manifest, new RegExp(`^[\\s\\S]*PUBLIC_ROOT_FILES[\\s\\S]*?"${privateFile.replace(".", "\\.")}"`), privateFile);
});

test("JSON-LD and teacher answers remain on non-parsing textContent sinks", () => {
  assert.match(sources["class-detail.js"], /script\.type = "application\/ld\+json";[\s\S]*?script\.textContent = JSON\.stringify\(jsonLd\);/);
  assert.doesNotMatch(functionSource("class-detail.js", "renderDetail"), /courseJsonLd[\s\S]*?innerHTML/);
  assert.match(sources["course-learn.js"], /\.querySelector\("p"\)\.textContent = answer/);
});

test("Task 2 media projections and Task 3 premium fetch boundaries remain intact", () => {
  for (const filename of ["dashboard.js", "tools-box.js", "course-content.js", "course-learn.js", "admin.js"]) {
    assert.doesNotMatch(sources[filename], /\bfilePath\b/, filename);
  }
  const toolsSource = sources["tools-box.js"];
  assert.match(toolsSource, /apiRequest\("\/api\/member\/tools"\)/);
  assert.match(toolsSource, /if \(!data\?\.payment\?\.active\) return true;/);
  assert.match(toolsSource, /generation !== toolsLoadGeneration \|\| toolsLogoutPending/);
  assert.match(toolsSource, /function clearPremiumLibrary\(\)/);
  assert.doesNotMatch(toolsSource, /const SKILL_PACKS|const PROMPT_PACKS/);
});
