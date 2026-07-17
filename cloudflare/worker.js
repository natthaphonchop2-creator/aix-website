const PRIVATE_PATH = /^(?:\/admin(?:\/|$)|\/dashboard(?:\/|$)|\/tools-box(?:\/|$)|\/live(?:\/|$)|\/payment(?:\/|$)|\/course\/[^/]+\/(?:start|content|learn)(?:\/|$))/;

function json(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return json({ error: "Malformed request path." }, { status: 400 });
    }
    if (pathname.includes("\0") || pathname.includes("\\")) {
      return json({ error: "Malformed request path." }, { status: 400 });
    }
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "") || "/";

    if (pathname === "/login" || pathname === "/register") {
      const mode = pathname === "/login" ? "login" : "signup";
      return Response.redirect(new URL(`/index.html?auth=${mode}`, url), 302);
    }

    if (PRIVATE_PATH.test(pathname)) {
      return json(
        { error: "Private AiX routes require the Node application origin." },
        { status: 503 }
      );
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return json(
        { error: "API unavailable in static preview." },
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
