import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { parseHTML } from "linkedom";

async function readProjectFile(name) {
  return readFile(new URL(`../${name}`, import.meta.url), "utf8");
}

function sourceSlice(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function createElementStub(attributes = {}) {
  const attributeMap = new Map(Object.entries(attributes));
  const classes = new Map();
  const focusCalls = [];
  const styles = new Map();

  return {
    hidden: false,
    inert: false,
    value: "",
    classList: {
      toggle(name, enabled) {
        classes.set(name, Boolean(enabled));
      }
    },
    getAttribute(name) {
      return attributeMap.get(name) ?? null;
    },
    setAttribute(name, value) {
      attributeMap.set(name, String(value));
    },
    removeAttribute(name) {
      attributeMap.delete(name);
    },
    toggleAttribute(name, enabled) {
      if (enabled) attributeMap.set(name, "");
      else attributeMap.delete(name);
    },
    focus(options) {
      focusCalls.push(options);
    },
    style: {
      setProperty(name, value) {
        styles.set(name, String(value));
      }
    },
    __attributes: attributeMap,
    __classes: classes,
    __focusCalls: focusCalls,
    __styles: styles
  };
}

test("mobile Admin exposes an accessible off-canvas menu and reachable logout", async () => {
  const { document } = parseHTML(await readProjectFile("admin.html"));
  const menu = document.getElementById("adminMobileMenu");
  const sidebar = document.getElementById("sidebar");
  const logout = document.getElementById("adminLogoutBtn");
  const backdrop = document.getElementById("adminSidebarBackdrop");
  const mainContent = document.getElementById("adminMainContent");

  assert.ok(menu, "mobile menu button");
  assert.equal(menu.localName, "button");
  assert.equal(menu.getAttribute("type"), "button");
  assert.equal(menu.getAttribute("aria-controls"), "sidebar");
  assert.equal(menu.getAttribute("aria-expanded"), "false");
  assert.ok(menu.getAttribute("aria-label")?.trim(), "mobile menu accessible name");
  assert.equal(menu.hasAttribute("onclick"), false, "new menu control uses an event listener");
  assert.ok(sidebar, "controlled sidebar");
  assert.ok(logout, "logout remains reachable inside the opened sidebar");
  assert.equal(logout.localName, "button");
  assert.ok(backdrop, "sidebar backdrop");
  assert.equal(backdrop.hidden, true, "backdrop starts hidden");
  assert.equal(backdrop.getAttribute("aria-hidden"), "true");
  assert.equal(backdrop.hasAttribute("onclick"), false, "new backdrop uses an event listener");
  assert.ok(mainContent, "main content can be made inert while the sidebar overlays it");
});

test("mobile Admin sidebar state synchronizes visual, ARIA, and inert state", async () => {
  const source = await readProjectFile("admin.js");
  const controller = sourceSlice(source, "function setAdminSidebarOpen(open)", "function showAdminLogin()");

  assert.match(controller, /adminMobileQuery\.matches\s*&&\s*Boolean\(open\)/);
  assert.match(controller, /sidebar\.classList\.toggle\(['"]open['"],\s*shouldOpen\)/);
  assert.match(controller, /adminMobileMenu\.setAttribute\(['"]aria-expanded['"],\s*String\(shouldOpen\)\)/);
  assert.match(controller, /const\s+sidebarHidden\s*=\s*adminMobileQuery\.matches\s*&&\s*!shouldOpen/);
  assert.match(controller, /sidebar\.inert\s*=\s*sidebarHidden/);
  assert.match(controller, /sidebar\.setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
  assert.match(controller, /sidebar\.removeAttribute\(['"]aria-hidden['"]\)/);
  assert.match(controller, /adminSidebarBackdrop\.hidden\s*=\s*!shouldOpen/);
  assert.match(controller, /adminSidebarBackdrop\.classList\.toggle\(['"]open['"],\s*shouldOpen\)/);
  assert.match(controller, /adminSidebarBackdrop\.setAttribute\(['"]aria-hidden['"],\s*String\(!shouldOpen\)\)/);
  assert.match(controller, /adminMainContent\.inert\s*=\s*shouldOpen/);
  assert.match(controller, /adminMainContent\.setAttribute\(['"]aria-hidden['"],\s*['"]true['"]\)/);
  assert.match(controller, /adminMainContent\.removeAttribute\(['"]aria-hidden['"]\)/);
  assert.match(controller, /sidebar\.querySelector\([\s\S]*?\)\s*\?\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
  assert.match(controller, /if\s*\(!shouldOpen\s*&&\s*wasOpen[\s\S]*?adminMobileMenu\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

test("mobile Admin moves focus into the opened sidebar, isolates the page, and restores the trigger", async () => {
  const source = await readProjectFile("admin.js");
  const controller = sourceSlice(source, "const adminMobileQuery", "function showAdminLogin()");
  const mediaQuery = { matches: true };
  const firstActionable = createElementStub();
  const sidebar = Object.assign(createElementStub(), {
    querySelector() {
      return firstActionable;
    }
  });
  const menu = createElementStub({ "aria-expanded": "false" });
  const backdrop = createElementStub({ "aria-hidden": "true" });
  backdrop.hidden = true;
  const mainContent = createElementStub();
  const elements = {
    adminEmail: createElementStub(),
    adminPassword: createElementStub(),
    sidebar,
    adminMobileMenu: menu,
    adminSidebarBackdrop: backdrop,
    adminMainContent: mainContent
  };
  const context = {
    document: {
      getElementById(id) {
        return elements[id] ?? null;
      }
    },
    window: {
      matchMedia() {
        return mediaQuery;
      }
    }
  };

  vm.runInNewContext(
    `${controller}\nglobalThis.setAdminSidebarOpenForTest = setAdminSidebarOpen;`,
    context
  );

  context.setAdminSidebarOpenForTest(true);
  assert.equal(sidebar.__classes.get("open"), true);
  assert.equal(mainContent.inert, true);
  assert.equal(mainContent.__attributes.get("aria-hidden"), "true");
  assert.equal(sidebar.__attributes.has("aria-hidden"), false);
  assert.equal(firstActionable.__focusCalls.length, 1);
  assert.equal(firstActionable.__focusCalls[0]?.preventScroll, true);
  assert.equal(menu.__focusCalls.length, 0);

  context.setAdminSidebarOpenForTest(false);
  assert.equal(sidebar.__classes.get("open"), false);
  assert.equal(mainContent.inert, false);
  assert.equal(mainContent.__attributes.has("aria-hidden"), false);
  assert.equal(sidebar.__attributes.get("aria-hidden"), "true");
  assert.equal(menu.__focusCalls.length, 1);
  assert.equal(menu.__focusCalls[0]?.preventScroll, true);

  mediaQuery.matches = false;
  context.setAdminSidebarOpenForTest(true);
  assert.equal(sidebar.__attributes.has("aria-hidden"), false);
  assert.equal(firstActionable.__focusCalls.length, 1, "desktop calls do not steal focus");
});

test("Admin login transition leaves focus on a visible login control", async () => {
  const source = await readProjectFile("admin.js");
  const controller = sourceSlice(source, "const adminMobileQuery", "function showAdminLayout()");
  const mediaQuery = { matches: true };
  const sidebar = Object.assign(createElementStub(), { querySelector: () => createElementStub() });
  const menu = createElementStub({ "aria-expanded": "true" });
  const email = createElementStub();
  const password = createElementStub();
  password.value = "cleared-by-transition";
  const adminLayout = createElementStub();
  const loginPage = createElementStub();
  const elements = {
    adminEmail: email,
    adminPassword: password,
    sidebar,
    adminMobileMenu: menu,
    adminSidebarBackdrop: createElementStub({ "aria-hidden": "false" }),
    adminMainContent: createElementStub(),
    adminLayout,
    loginPage
  };
  const context = {
    document: { getElementById: (id) => elements[id] ?? null },
    window: { matchMedia: () => mediaQuery }
  };

  vm.runInNewContext(
    `const adminEmail = document.getElementById('adminEmail');\nconst adminPassword = document.getElementById('adminPassword');\n${controller}\nglobalThis.showAdminLoginForTest = showAdminLogin;`,
    context
  );
  context.showAdminLoginForTest();

  assert.equal(password.value, "");
  assert.equal(adminLayout.__styles.get("display"), "none");
  assert.equal(loginPage.__styles.get("display"), "");
  assert.equal(email.__focusCalls.length, 1);
  assert.equal(email.__focusCalls[0]?.preventScroll, true);
});

test("mobile Admin closes the sidebar on all navigation and session transitions", async () => {
  const source = await readProjectFile("admin.js");
  const showLogin = sourceSlice(source, "function showAdminLogin()", "function showAdminLayout()");
  const showLayout = sourceSlice(source, "function showAdminLayout()", "async function adminFetch(");
  const logout = sourceSlice(source, "async function adminLogout()", "async function restoreAdminSession()");
  const switchSection = sourceSlice(source, "function switchSection(name)", "// ---- Toast ----");

  assert.match(showLogin, /setAdminSidebarOpen\(false\)/);
  assert.match(showLayout, /setAdminSidebarOpen\(false\)/);
  assert.match(logout, /setAdminSidebarOpen\(false\)/);
  assert.ok(
    logout.indexOf("setAdminSidebarOpen(false)") > logout.indexOf("adminLoggedIn = false"),
    "only a confirmed logout closes the authenticated Admin UI"
  );
  assert.match(switchSection, /setAdminSidebarOpen\(false\)/);

  assert.match(source, /adminMobileMenu\?\.addEventListener\(['"]click['"],/);
  assert.match(source, /adminSidebarBackdrop\?\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*setAdminSidebarOpen\(false\)\)/);
  assert.match(source, /if\s*\(e\.key\s*===\s*['"]Escape['"]\)[\s\S]*?setAdminSidebarOpen\(false\)/);
  assert.match(source, /adminMobileQuery\.addEventListener\(['"]change['"],/);
});

test("mobile Admin menu is visible only at 768px and the backdrop stays below the sidebar", async () => {
  const source = await readProjectFile("admin.css");
  const responsive = sourceSlice(source, "@media (max-width: 768px)", "/* Responsive fit guard");

  assert.match(source, /#adminMobileMenu\s*\{[^}]*display:\s*none;/s);
  assert.match(responsive, /#adminMobileMenu\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(source, /#adminSidebarBackdrop\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*90;/s);
  assert.match(source, /\.sidebar\s*\{[^}]*z-index:\s*100;/s);
  assert.match(source, /#adminSidebarBackdrop\.open\s*\{[^}]*pointer-events:\s*auto;/s);
});
