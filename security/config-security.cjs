const DEFAULT_VALUES = new Set([
  "admin1234",
  "change-me",
  "changeme",
  "secret",
  "password"
]);

function failOrigin(message) {
  throw new Error(`Invalid security configuration: APP_ORIGINS ${message}`);
}

function parseAllowedOrigins(value) {
  const origins = new Set();
  for (const item of String(value || "").split(",")) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.includes("\\") || /[\u0000-\u0020\u007f]/.test(trimmed)) {
      failOrigin("contains invalid whitespace or path separators");
    }
    if (trimmed.includes("*")) failOrigin("cannot contain a wildcard");

    const exactOrigin = trimmed.match(/^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)(.*)$/s);
    if (!exactOrigin) failOrigin("must be an absolute HTTP or HTTPS origin");
    const [, , authority, suffix] = exactOrigin;
    if (authority.includes("@")) failOrigin("cannot contain credentials");
    if (suffix !== "" && suffix !== "/") {
      failOrigin("cannot contain a path, query string, or fragment");
    }

    let url;
    try {
      url = new URL(trimmed);
    } catch {
      failOrigin("contains a malformed URL");
    }
    if (
      !url
      || (url.protocol !== "http:" && url.protocol !== "https:")
      || url.origin === "null"
      || !url.hostname
    ) {
      failOrigin("must be a non-opaque HTTP or HTTPS origin");
    }
    if (url.username || url.password) failOrigin("cannot contain credentials");
    origins.add(url.origin);
  }
  return origins;
}

function failProduction(message) {
  throw new Error(`Invalid production security configuration: ${message}`);
}

function validateSecurityConfig(env = {}) {
  const allowedOrigins = parseAllowedOrigins(env.APP_ORIGINS);
  if (env.NODE_ENV !== "production") return { allowedOrigins };

  const secrets = ["AUTH_SECRET", "CSRF_SECRET", "SMS_OTP_SECRET"].map((name) => {
    const value = String(env[name] || "");
    const normalized = value.trim().toLowerCase();
    if (
      Buffer.byteLength(value, "utf8") < 32
      || !normalized
      || DEFAULT_VALUES.has(normalized)
    ) {
      failProduction(`${name} is missing, default, or shorter than 32 UTF-8 bytes`);
    }
    return value;
  });
  if (new Set(secrets).size !== secrets.length) {
    failProduction("AUTH_SECRET, CSRF_SECRET, and SMS_OTP_SECRET must all differ");
  }

  const email = String(env.ADMIN_EMAIL || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    failProduction("ADMIN_EMAIL is missing or invalid");
  }

  const password = String(env.ADMIN_PASSWORD || "");
  const normalizedPassword = password.trim().toLowerCase();
  if (
    [...password].length < 14
    || !normalizedPassword
    || DEFAULT_VALUES.has(normalizedPassword)
  ) {
    failProduction("ADMIN_PASSWORD is missing, default, or shorter than 14 characters");
  }

  if (!allowedOrigins.size) {
    failProduction("APP_ORIGINS must contain at least one HTTPS origin");
  }
  for (const origin of allowedOrigins) {
    if (new URL(origin).protocol !== "https:") {
      failProduction("APP_ORIGINS must contain only HTTPS origins");
    }
  }

  return { allowedOrigins };
}

module.exports = { parseAllowedOrigins, validateSecurityConfig };
