const HTML_ROUTES = new Map([
  ["/admin", "/admin.html"],
  ["/dashboard", "/dashboard.html"],
  ["/login", "/auth.html"],
  ["/register", "/auth.html"],
  ["/payment", "/payment.html"],
  ["/payment/success", "/payment-success.html"],
  ["/payment/cancel", "/payment.html"]
]);

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

    if (pathname === "/api/health") {
      return json({
        ok: true,
        service: "aix-website-static-preview",
        backendMode: env.BACKEND_MODE || "static-preview",
        note: "Express/SQLite API is not running on this Worker yet."
      });
    }

    if (pathname.startsWith("/api/")) {
      return json(
        {
          error: "Cloudflare Worker static preview only. Migrate Express/SQLite API to Workers + D1/R2, or proxy API to a Node origin."
        },
        { status: 501 }
      );
    }

    const courseContent = pathname.match(/^\/course\/[^/]+\/content$/);
    const courseStart = pathname.match(/^\/course\/[^/]+\/start$/);
    const courseLearn = pathname.match(/^\/course\/[^/]+\/learn$/);
    const assetPath = courseLearn
      ? "/course-learn.html"
      : courseStart
        ? "/course-start.html"
        : courseContent
          ? "/course-content.html"
          : HTML_ROUTES.get(pathname);

    if (assetPath) {
      const assetUrl = new URL(assetPath, url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    return env.ASSETS.fetch(request);
  }
};
