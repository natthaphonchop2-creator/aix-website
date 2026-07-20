const CSP_DIRECTIVES = Object.freeze([
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "frame-src https://accounts.google.com https://js.stripe.com",
  "media-src 'self' https:",
  "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://api.stripe.com",
  "form-action 'self'"
]);

const HSTS_VALUE = "max-age=31536000; includeSubDomains";

function cspReportOnlyValue() {
  return CSP_DIRECTIVES.join("; ");
}

function helmetOptions(isProduction) {
  return {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    hsts: isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: false }
      : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "deny" }
  };
}

function browserHeaderValues(isProduction) {
  const values = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy-Report-Only": cspReportOnlyValue(),
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
  };
  if (isProduction) values["Strict-Transport-Security"] = HSTS_VALUE;
  return values;
}

module.exports = { browserHeaderValues, cspReportOnlyValue, helmetOptions };
