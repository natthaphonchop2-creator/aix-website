const crypto = require("node:crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RATE_LIMIT_MESSAGE = Object.freeze({ error: "ลองใหม่ภายหลัง" });
const MAX_CANONICAL_IDENTITY_LENGTH = 512;

function defaultCanonicalEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= MAX_CANONICAL_IDENTITY_LENGTH
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ? email
    : "";
}

function defaultCanonicalPhone(value) {
  const phone = String(value || "").replace(/[^\d]/g, "");
  return /^0\d{9}$/.test(phone) ? phone : "";
}

function createHttpSecurity(options = {}) {
  const allowedOrigins = options.allowedOrigins;
  const validCsrf = options.validCsrf;
  const canonicalEmail = typeof options.canonicalEmail === "function"
    ? options.canonicalEmail
    : defaultCanonicalEmail;
  const canonicalPhone = typeof options.canonicalPhone === "function"
    ? options.canonicalPhone
    : defaultCanonicalPhone;

  if (!(allowedOrigins instanceof Set)) throw new Error("allowedOrigins must be a Set");
  if (typeof validCsrf !== "function") throw new Error("validCsrf must be a function");

  function isSafeMethod(req) {
    return SAFE_METHODS.has(String(req?.method || "").toUpperCase());
  }

  function requestHeader(req, name) {
    if (typeof req?.get !== "function") return undefined;
    return req.get(name);
  }

  function exactOrigin(req) {
    const origin = requestHeader(req, "origin");
    return typeof origin === "string" && allowedOrigins.has(origin);
  }

  function requireMutationOrigin(req, res, next) {
    if (isSafeMethod(req)) return next();
    if (!exactOrigin(req)) {
      return res.status(403).json({ error: "Origin ไม่ได้รับอนุญาต" });
    }
    return next();
  }

  function requireSessionCsrf(req, res, next) {
    if (isSafeMethod(req)) return next();
    let valid = false;
    try {
      valid = validCsrf(req?.authSession, requestHeader(req, "x-csrf-token")) === true;
    } catch {
      valid = false;
    }
    if (!valid) {
      return res.status(403).json({ error: "CSRF token ไม่ถูกต้อง" });
    }
    return next();
  }

  function safeCanonical(normalize, value) {
    try {
      const canonical = normalize(value);
      return typeof canonical === "string"
        && canonical.length > 0
        && canonical.length <= MAX_CANONICAL_IDENTITY_LENGTH
        ? canonical
        : "";
    } catch {
      return "";
    }
  }

  function safeIp(req) {
    return ipKeyGenerator(req.ip);
  }

  function identityKey(namespace, canonical) {
    const digest = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
    return `${namespace}:${digest}`;
  }

  function limiter({ identifier, windowMs, limit, keyGenerator }) {
    const config = {
      identifier,
      windowMs,
      limit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: RATE_LIMIT_MESSAGE
    };
    if (typeof keyGenerator === "function") config.keyGenerator = keyGenerator;
    return rateLimit(config);
  }

  const memberLoginIp = limiter({
    identifier: "member-login-ip",
    windowMs: 15 * 60_000,
    limit: 10
  });
  const memberLoginIdentity = limiter({
    identifier: "member-login-email",
    windowMs: 15 * 60_000,
    limit: 5,
    keyGenerator(req) {
      const email = safeCanonical(canonicalEmail, req.body?.email);
      return email
        ? identityKey("member-login-email", email)
        : `member-login-email-ip:${safeIp(req)}`;
    }
  });
  const adminLoginIp = limiter({
    identifier: "admin-login-ip",
    windowMs: 15 * 60_000,
    limit: 5
  });
  const otpPhone = limiter({
    identifier: "otp-phone",
    windowMs: 10 * 60_000,
    limit: 5,
    keyGenerator(req) {
      const phone = safeCanonical(canonicalPhone, req.body?.phone || req.member?.phone);
      return phone
        ? identityKey("otp-phone", phone)
        : `otp-phone-ip:${safeIp(req)}`;
    }
  });
  const otpIp = limiter({
    identifier: "otp-ip",
    windowMs: 60 * 60_000,
    limit: 20
  });

  return {
    corsOptions: {
      credentials: true,
      origin(origin, callback) {
        const accepted = origin === undefined
          || (typeof origin === "string" && allowedOrigins.has(origin));
        callback(null, accepted);
      }
    },
    requireMutationOrigin,
    requireSessionCsrf,
    memberLoginIp,
    memberLoginIdentity,
    adminLoginIp,
    otpPhone,
    otpIp
  };
}

module.exports = { createHttpSecurity };
