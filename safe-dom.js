(function initAiXDom(root, factory) {
  const api = Object.freeze(factory());
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AiXDom = api;
})(typeof window !== "undefined" ? window : null, function factory() {
  "use strict";

  const allowedTags = new Set([
    "article", "aside", "b", "button", "details", "div", "em", "h1", "h2", "h3", "h4",
    "i", "img", "input", "li", "ol", "option", "p", "select", "small", "source", "span",
    "strong", "summary", "table", "tbody", "td", "th", "tr", "ul", "video"
  ]);
  const allowedAttributes = new Set([
    "alt", "colspan", "decoding", "loading", "preload", "role", "rowspan", "tabindex",
    "title", "type"
  ]);
  const allowedProperties = new Set([
    "value", "selected", "checked", "disabled", "hidden", "open", "controls"
  ]);
  const booleanProperties = new Set(["selected", "checked", "disabled", "hidden", "open", "controls"]);
  const allowedUrlProperties = Object.freeze({
    img: new Set(["src"]),
    video: new Set(["src", "poster"]),
    source: new Set(["src"])
  });

  function decodeNumericEntities(value) {
    return value.replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi, (match, hex, decimal) => {
      const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    });
  }

  function policyDecode(value) {
    let decoded = decodeNumericEntities(value);
    for (let pass = 0; pass < 2; pass += 1) {
      if (!/%[0-9a-f]{2}/i.test(decoded)) break;
      try {
        decoded = decodeNumericEntities(decodeURIComponent(decoded));
      } catch {
        return null;
      }
    }
    return decoded;
  }

  function evaluateUrl(value, options) {
    const original = String(value ?? "");
    if (!original || /[\x00-\x1f\x7f]/.test(original)) return null;
    const text = original.trim();
    if (!text || /["'<>\\]/.test(text) || /%(?![0-9a-f]{2})/i.test(text)) return null;

    const policy = policyDecode(text);
    if (!policy || /[\x00-\x1f\x7f"'<>\\]/.test(policy) || policy !== policy.trim()) return null;
    if (/^(?:\/\/|\\\\)/.test(policy)) return null;
    if (/(?:^|\/)\.{1,2}(?:\/|$|[?#])/.test(policy)) return null;

    if (policy === "about:blank" && text === "about:blank") return "about:blank";
    if (policy === "/" || /^(?:\/[^/]|[?#])/.test(policy)) {
      if (!options.allowRelative || !(text === "/" || /^(?:\/[^/]|[?#])/.test(text))) return null;
      return text;
    }

    const decodedScheme = policy.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    const rawScheme = text.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    if (decodedScheme) {
      if (!rawScheme || rawScheme !== decodedScheme) return null;
      if (decodedScheme === "mailto" && !options.allowMailto) return null;
      if (decodedScheme === "tel" && !options.allowTel) return null;
      const protocol = `${decodedScheme}:`;
      if (![...options.allowedProtocols, options.allowMailto ? "mailto:" : "", options.allowTel ? "tel:" : ""].includes(protocol)) {
        return null;
      }
      if (["http:", "https:"].includes(protocol)) {
        const authorityMatch = text.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i);
        if (!authorityMatch || authorityMatch[1].includes("%")) return null;
      }
      try {
        const parsed = new URL(text);
        if (["http:", "https:"].includes(protocol) && (parsed.username || parsed.password)) return null;
        return parsed.protocol.toLowerCase() === protocol ? parsed.href : null;
      } catch {
        return null;
      }
    }

    if (rawScheme || !options.allowRelative || /:/.test(policy)) return null;
    if (!/^[A-Za-z0-9._~!$&()*+,;=@%/-]+(?:[?#][^\s"'<>\\]*)?$/.test(text)) return null;
    if (text.startsWith("/") || text.split(/[?#]/, 1)[0].split("/").some((part) => part === "." || part === "..")) return null;
    return text;
  }

  function safeUrl(value, options = {}) {
    const policy = {
      allowedProtocols: (Array.isArray(options.allowedProtocols)
        ? options.allowedProtocols.map((protocol) => String(protocol).toLowerCase())
        : ["http:", "https:"]).filter((protocol) => protocol === "http:" || protocol === "https:"),
      allowRelative: options.allowRelative !== false,
      allowMailto: options.allowMailto === true,
      allowTel: options.allowTel === true
    };
    const accepted = evaluateUrl(value, policy);
    if (accepted) return accepted;
    const fallback = options.fallback === undefined ? "about:blank" : options.fallback;
    return evaluateUrl(fallback, policy) || "about:blank";
  }

  function flattenChildren(values, output = []) {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (Array.isArray(value)) {
        flattenChildren(value, output);
      } else if (value !== null && value !== undefined && value !== false) {
        output.push(value);
      }
    }
    return output;
  }

  function attributeAllowed(name) {
    return allowedAttributes.has(name) || /^aria-[a-z0-9_.-]+$/.test(name) || /^data-[a-z0-9_.-]+$/.test(name);
  }

  function createNode(tag, options = {}, children = [], allowAnchor = false) {
    const normalizedTag = String(tag || "").toLowerCase();
    if ((!allowedTags.has(normalizedTag) && !(allowAnchor && normalizedTag === "a")) || normalizedTag !== tag) {
      throw new TypeError(`Unsafe DOM tag: ${tag}`);
    }

    const element = document.createElement(normalizedTag);
    if (options.className) element.className = String(options.className);
    if (options.text !== undefined) element.textContent = String(options.text);

    for (const [rawName, value] of Object.entries(options.attrs || {})) {
      const name = String(rawName).toLowerCase();
      if (!attributeAllowed(name)) continue;
      element.setAttribute(name, String(value));
    }

    for (const [rawName, value] of Object.entries(options.props || {})) {
      const name = String(rawName).toLowerCase();
      if (!allowedProperties.has(name)) continue;
      element[name] = booleanProperties.has(name) ? Boolean(value) : String(value ?? "");
    }

    for (const [rawName, descriptor] of Object.entries(options.urls || {})) {
      const name = String(rawName).toLowerCase();
      if (!allowedUrlProperties[normalizedTag]?.has(name)) {
        throw new TypeError(`Unsafe URL property for ${normalizedTag}: ${rawName}`);
      }
      const config = descriptor && typeof descriptor === "object" && Object.hasOwn(descriptor, "value")
        ? descriptor
        : { value: descriptor };
      element.setAttribute(name, safeUrl(config.value, config.options || {}));
    }

    for (const child of flattenChildren(children)) {
      element.append(child && typeof child === "object" && typeof child.nodeType === "number"
        ? child
        : document.createTextNode(String(child)));
    }
    return element;
  }

  function node(tag, options = {}, children = []) {
    return createNode(tag, options, children, false);
  }

  function link(options = {}, children = []) {
    const href = safeUrl(options.href, options.urlOptions || {});
    const element = createNode("a", options, children, true);
    element.setAttribute("href", href);
    if (/^https?:\/\//i.test(href)) {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
    return element;
  }

  function replace(target, children = []) {
    const safeChildren = flattenChildren(children).map((child) => (
      child && typeof child === "object" && typeof child.nodeType === "number"
        ? child
        : document.createTextNode(String(child))
    ));
    target.replaceChildren(...safeChildren);
    return target;
  }

  return { safeUrl, node, link, replace };
});
