import browserHeadersPolicy from "../security/browser-headers.cjs";

const { browserHeaderValues } = browserHeadersPolicy;
const PRIVATE_PATH = /^(?:\/admin(?:\/|$)|\/dashboard(?:\/|$)|\/tools-box(?:\/|$)|\/live(?:\/|$)|\/payment(?:\/|$)|\/course\/[^/]+\/(?:start|content|learn)(?:\/|$))/;

function withBrowserHeaders(response, isProduction) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(browserHeaderValues(isProduction))) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(body, isProduction, init = {}) {
  const response = Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
  return withBrowserHeaders(response, isProduction);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isProduction = env.APP_ENV === "production";
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return json({ error: "Malformed request path." }, isProduction, { status: 400 });
    }
    if (pathname.includes("\0") || pathname.includes("\\")) {
      return json({ error: "Malformed request path." }, isProduction, { status: 400 });
    }
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "") || "/";

    if (pathname === "/login" || pathname === "/register") {
      const mode = pathname === "/login" ? "login" : "signup";
      return withBrowserHeaders(
        Response.redirect(new URL(`/index.html?auth=${mode}`, url), 302),
        isProduction
      );
    }

    if (PRIVATE_PATH.test(pathname)) {
      return json(
        { error: "Private AiX routes require the Node application origin." },
        isProduction,
        { status: 503 }
      );
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return json(
        { error: "API unavailable in static preview." },
        isProduction,
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
