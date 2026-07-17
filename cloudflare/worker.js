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
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : url.pathname;

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

    if (pathname.startsWith("/api/")) {
      return json(
        { error: "API unavailable in static preview." },
        { status: 503 }
      );
    }

    return env.ASSETS.fetch(request);
  }
};
