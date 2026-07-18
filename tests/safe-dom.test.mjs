import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { parseHTML } from "linkedom";

const require = createRequire(import.meta.url);

function loadApi() {
  return require("../safe-dom.js");
}

function withDom(run) {
  const { window } = parseHTML("<!doctype html><html><head></head><body></body></html>");
  const previousDocument = globalThis.document;
  globalThis.document = window.document;
  try {
    return run({ window, document: window.document, api: loadApi() });
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test("safeUrl accepts only approved relative and network URLs", () => {
  const { safeUrl } = loadApi();
  for (const value of [
    "/api/media/resources/r1",
    "/api/media/replays/v1",
    "/",
    "/assets/generated/x.png",
    "assets/generated/x.png",
    "?tab=1",
    "#resources",
    "https://example.com/file.pdf",
    "https://example.com/My%20File.pdf",
    "https://example.com/%E0%B9%84%E0%B8%9F%E0%B8%A5%E0%B9%8C.pdf",
    "https://example.com/download?signature=a%2Fb%2Bc%3D&name=My%20File.pdf",
    "http://example.com/x",
    "about:blank"
  ]) assert.equal(safeUrl(value), value, value);

  assert.equal(safeUrl("mailto:hello@example.com"), "about:blank");
  assert.equal(safeUrl("tel:+6620000000"), "about:blank");
  assert.equal(safeUrl("mailto:hello@example.com", { allowMailto: true }), "mailto:hello@example.com");
  assert.equal(safeUrl("tel:+6620000000", { allowTel: true }), "tel:+6620000000");
  assert.equal(
    safeUrl("http://example.com/x", { allowedProtocols: ["https:"] }),
    "about:blank"
  );
});

test("safeUrl rejects executable schemes, network-path references, backslashes, and dot segments", () => {
  const { safeUrl } = loadApi();
  for (const value of [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,x",
    "vbscript:x",
    "file:///etc/passwd",
    "blob:https://example.com/id",
    "//evil.example/x",
    "\\\\evil.example/x",
    "/\\evil.example/x",
    "../x",
    "assets/../x",
    "/assets/../x",
    "https://example.com/a/../x",
    "https://example.com/a/%2e%2e/x",
    "https%3A%2F%2Fevil.example/x",
    "h&#116;tps://evil.example/x",
    "https:evil.example/x",
    "http:/evil.example/x",
    "https:///evil.example/x",
    "https://%65vil.example/x",
    "https://example.com/\" onclick=\"hit",
    "/assets/<svg>",
    "assets/%ZZ.png",
    "https://example.com/%ZZ"
  ]) assert.equal(safeUrl(value), "about:blank", value);

  for (const scheme of ["javascript:", "data:", "file:", "blob:"]) {
    const value = `${scheme}${scheme === "javascript:" ? "alert(1)" : "payload"}`;
    assert.equal(safeUrl(value, { allowedProtocols: [scheme] }), "about:blank", `caller opt-in ${scheme}`);
  }
  assert.equal(safeUrl("https://user:secret@example.com/x"), "about:blank");
  assert.equal(safeUrl("http://user@example.com/x"), "about:blank");
});

test("safeUrl rejects encoded, entity, and ASCII-control obfuscation", () => {
  const { safeUrl } = loadApi();
  for (const value of [
    "javascript%3Aalert(1)",
    "java%73cript:alert(1)",
    "java&#x73;cript:alert(1)",
    "&#106;avascript:alert(1)",
    "%2f%2fevil.example/x",
    "%252f%252fevil.example/x",
    "%2e%2e/x",
    "assets/%252e%252e/x",
    "\0https://example.com",
    "\thttps://example.com",
    "\nhttps://example.com",
    "https://exam\u0007ple.com/x"
  ]) assert.equal(safeUrl(value), "about:blank", JSON.stringify(value));
});

test("node preserves hostile strings as exact text without creating active markup", () => withDom(({ document, api }) => {
  const payloads = [
    '<img src=x onerror="globalThis.hit=1">',
    "&lt;img src=x onerror=hit&gt;",
    "&#x3c;svg onload=hit&#x3e;",
    "%3Cscript%3Ehit%3C/script%3E",
    '</script><script id="xss">globalThis.hit=1</script>',
    '<svg><a xlink:href="javascript:hit">x</a></svg>',
    '<math><annotation-xml encoding="text/html"><img onerror=hit></annotation-xml></math>',
    "<template><img src=x onerror=hit></template>"
  ];
  const target = api.node("div", {}, payloads.map((payload) => api.node("p", { text: payload })));
  document.body.append(target);

  assert.deepEqual([...target.children].map((element) => element.textContent), payloads);
  assert.equal(target.querySelector("img,script,svg,math,template"), null);
  assert.equal(document.getElementById("xss"), null);
}));

test("node rejects unsafe tags and custom or namespaced element names", () => withDom(({ api }) => {
  for (const tag of [
    "a", "script", "style", "iframe", "object", "embed", "template", "svg", "math",
    "x-widget", "svg:path"
  ]) assert.throws(() => api.node(tag), /tag/i, tag);
}));

test("node allowlists ordinary attributes, typed properties, and URL properties", () => withDom(({ api }) => {
  const titlePayload = '\"><svg onload=hit>';
  const element = api.node("input", {
    attrs: {
      title: titlePayload,
      id: "runtime-controlled-id",
      role: "switch",
      "aria-label": "สถานะ",
      "data-record-id": "x');globalThis.hit=1;//",
      onclick: "hit()",
      ONCLICK: "hit()",
      OnError: "hit()",
      style: "background:url(javascript:hit)",
      STYLE: "display:none",
      srcdoc: "<script>hit()</script>",
      action: "javascript:hit()",
      formaction: "javascript:hit()",
      "xlink:href": "javascript:hit()",
      xmlns: "http://www.w3.org/2000/svg",
      href: "javascript:hit()",
      src: "javascript:hit()"
    },
    props: {
      value: titlePayload,
      checked: true,
      disabled: false,
      onclick: "hit()",
      style: "display:none"
    }
  });

  assert.equal(element.getAttribute("title"), titlePayload);
  assert.equal(element.getAttribute("role"), "switch");
  assert.equal(element.getAttribute("aria-label"), "สถานะ");
  assert.equal(element.getAttribute("data-record-id"), "x');globalThis.hit=1;//");
  assert.equal(element.hasAttribute("id"), false);
  assert.equal(element.value, titlePayload);
  assert.equal(element.checked, true);
  for (const name of [
    "onclick", "onerror", "style", "srcdoc", "action", "formaction", "xlink:href", "xmlns", "href", "src"
  ]) assert.equal(element.hasAttribute(name), false, name);

  const image = api.node("img", {
    attrs: { alt: titlePayload, loading: "lazy", decoding: "async" },
    urls: {
      src: { value: "javascript:alert(1)" }
    }
  });
  assert.equal(image.getAttribute("src"), "about:blank");
  assert.equal(image.getAttribute("alt"), titlePayload);

  const video = api.node("video", {
    props: { controls: true },
    urls: {
      src: { value: "/api/media/replays/r1" },
      poster: { value: "https://example.com/poster.png" }
    }
  });
  assert.equal(video.controls, true);
  assert.equal(video.getAttribute("src"), "/api/media/replays/r1");
  assert.equal(video.getAttribute("poster"), "https://example.com/poster.png");
  assert.throws(() => api.node("div", { urls: { src: { value: "/x" } } }), /url/i);
}));

test("link applies safe URL policy and isolates absolute HTTP links", () => withDom(({ api }) => {
  const external = api.link({
    href: "https://example.com/file.pdf",
    className: "download",
    attrs: { href: "javascript:hit()", target: "_self", rel: "opener" }
  }, ["ดาวน์โหลด"]);
  assert.equal(external.getAttribute("href"), "https://example.com/file.pdf");
  assert.equal(external.getAttribute("target"), "_blank");
  assert.equal(external.getAttribute("rel"), "noopener noreferrer");

  const internal = api.link({ href: "/dashboard#courses" }, ["Dashboard"]);
  assert.equal(internal.getAttribute("href"), "/dashboard#courses");
  assert.equal(internal.hasAttribute("target"), false);
  assert.equal(internal.hasAttribute("rel"), false);

  const blocked = api.link({ href: "javascript:globalThis.hit=1" }, ["blocked"]);
  assert.equal(blocked.getAttribute("href"), "about:blank");
  assert.equal(blocked.hasAttribute("target"), false);
}));

test("node preserves authored structure, zero, empty text, Thai, and multiline content", () => withDom(({ api }) => {
  const multiline = "คำตอบบรรทัดแรก\nคำตอบบรรทัดสอง\n<img onerror=hit>";
  const article = api.node("article", { className: "trusted-card" }, [
    api.node("strong", { text: "หัวข้อ" }),
    api.node("p", { text: multiline }),
    api.node("ul", {}, [
      api.node("li", { text: 0 }),
      api.node("li", {}, [""])
    ]),
    api.link({ href: "#next" }, ["ต่อไป"])
  ]);

  assert.equal(article.className, "trusted-card");
  assert.equal(article.querySelector("p").textContent, multiline);
  assert.equal(article.querySelector("img"), null);
  assert.deepEqual([...article.querySelectorAll("li")].map((item) => item.textContent), ["0", ""]);
  assert.equal(article.querySelector("a").getAttribute("href"), "#next");
}));

test("replace removes stale DOM and appends flattened safe children in order", () => withDom(({ document, api }) => {
  const target = document.createElement("div");
  target.innerHTML = '<img id="stale" src=x><span>old</span>';
  const returned = api.replace(target, [
    api.node("strong", { text: "ใหม่" }),
    [0, "", null, undefined, false, '<svg id="xss"></svg>']]
  );

  assert.equal(returned, target);
  assert.equal(target.querySelector("#stale"), null);
  assert.equal(target.querySelector("svg"), null);
  assert.equal(target.textContent, 'ใหม่0<svg id="xss"></svg>');
  assert.equal(target.childNodes.length, 4);
}));

test("event listeners capture hostile IDs without creating or evaluating inline JavaScript", () => withDom(({ window, api }) => {
  const hostileId = "x');globalThis.hit=1;//";
  let received = null;
  globalThis.hit = 0;
  const button = api.node("button", {
    text: "อ่านแล้ว",
    attrs: { type: "button", ONCLICK: "globalThis.hit=1" }
  });
  button.addEventListener("click", () => { received = hostileId; });
  button.dispatchEvent(new window.Event("click"));

  assert.equal(button.hasAttribute("onclick"), false);
  assert.equal(received, hostileId);
  assert.equal(globalThis.hit, 0);
  delete globalThis.hit;
}));

test("JSON-LD and ordinary text retain raw script-close payloads without HTML parsing", () => withDom(({ document, api }) => {
  const payload = '</script><script id="xss">globalThis.hit=1</script>';
  document.body.append(api.node("p", { text: payload }));
  const jsonLd = document.createElement("script");
  jsonLd.id = "courseJsonLd";
  jsonLd.type = "application/ld+json";
  jsonLd.textContent = JSON.stringify({ name: payload });
  document.head.append(jsonLd);

  assert.equal(document.querySelectorAll('script[type="application/ld+json"]').length, 1);
  assert.equal(document.getElementById("xss"), null);
  assert.equal(JSON.parse(jsonLd.textContent).name, payload);
  assert.equal(document.querySelector("p").textContent, payload);
}));

test("UMD helper exports CommonJS and a frozen browser global", async () => {
  const commonJsApi = loadApi();
  assert.deepEqual(Object.keys(commonJsApi).sort(), ["link", "node", "replace", "safeUrl"]);

  const source = await readFile(new URL("../safe-dom.js", import.meta.url), "utf8");
  const { window } = parseHTML("<!doctype html><html><body></body></html>");
  vm.runInNewContext(source, { window, document: window.document, URL });
  assert.deepEqual(Object.keys(window.AiXDom).sort(), ["link", "node", "replace", "safeUrl"]);
  assert.equal(Object.isFrozen(window.AiXDom), true);
});
