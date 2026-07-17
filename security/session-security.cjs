const crypto = require("node:crypto");

const MEMBER_COOKIE = "aix_member_session";
const ADMIN_COOKIE = "aix_admin_session";
const RETIRED_MEMBER_COOKIE = "aix_session";
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_IDENTITY_MAX_LENGTH = 512;
const TOKEN_VERSION = 1;
const TOKEN_KEYS = ["email", "exp", "iat", "kind", "nonce", "sub", "v"];
const RELEVANT_COOKIES = new Set([MEMBER_COOKIE, ADMIN_COOKIE]);

function requireSecret(value, label) {
  const secret = String(value || "");
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(`${label} must be at least 32 UTF-8 bytes`);
  }
  return secret;
}

function requireTtl(value, label) {
  const ttl = Number(value);
  if (!Number.isSafeInteger(ttl) || ttl < 1000 || ttl % 1000 !== 0) {
    throw new Error(`${label} must be a positive whole-second lifetime`);
  }
  return ttl;
}

function validIdentityField(value) {
  return typeof value === "string" && value.length > 0 && value.length <= SESSION_IDENTITY_MAX_LENGTH;
}

function strictBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function parseRelevantCookies(req) {
  const header = req?.headers?.cookie;
  if (header === undefined || header === null || header === "") {
    return { invalid: false, values: new Map() };
  }
  if (typeof header !== "string") return { invalid: true, values: new Map() };

  const values = new Map();
  for (const rawPart of header.split(";")) {
    const part = rawPart.trim();
    if (!part) continue;
    const separator = part.indexOf("=");
    if (separator < 0) {
      if (RELEVANT_COOKIES.has(part)) return { invalid: true, values: new Map() };
      continue;
    }

    const name = part.slice(0, separator).trim();
    if (!RELEVANT_COOKIES.has(name)) continue;
    if (values.has(name)) return { invalid: true, values: new Map() };

    try {
      values.set(name, decodeURIComponent(part.slice(separator + 1).trim()));
    } catch {
      return { invalid: true, values: new Map() };
    }
  }
  return { invalid: false, values };
}

function appendSetCookie(res, value) {
  if (typeof res?.append === "function") {
    res.append("Set-Cookie", value);
    return;
  }
  if (typeof res?.setHeader === "function") {
    const current = typeof res.getHeader === "function" ? res.getHeader("Set-Cookie") : undefined;
    const values = current === undefined ? [] : (Array.isArray(current) ? current : [current]);
    res.setHeader("Set-Cookie", [...values, value]);
    return;
  }
  throw new Error("Response does not support Set-Cookie headers");
}

function createSessionSecurity(options = {}) {
  const authSecret = requireSecret(options.authSecret, "authSecret");
  const csrfSecret = requireSecret(options.csrfSecret, "csrfSecret");
  if (authSecret === csrfSecret) throw new Error("authSecret and csrfSecret must be distinct");

  const memberTtlMs = requireTtl(options.memberTtlMs, "memberTtlMs");
  const adminTtlMs = requireTtl(options.adminTtlMs, "adminTtlMs");
  if (adminTtlMs !== ADMIN_SESSION_TTL_MS) {
    throw new Error("admin session TTL must be exactly 8 hours");
  }

  const secure = options.secure === true;
  const now = options.now || Date.now;
  const randomBytes = options.randomBytes || crypto.randomBytes;
  if (typeof now !== "function" || typeof randomBytes !== "function") {
    throw new Error("Session clock and random source must be functions");
  }

  function currentTime() {
    const value = Number(now());
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("Session clock returned an invalid time");
    return value;
  }

  function sessionTtl(kind) {
    return kind === "member" ? memberTtlMs : ADMIN_SESSION_TTL_MS;
  }

  function validClaims(data, expectedKind, timestamp = currentTime()) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return false;
    if (!Object.getPrototypeOf(data) || Object.getPrototypeOf(data) !== Object.prototype) return false;
    if (Object.keys(data).sort().join("\0") !== TOKEN_KEYS.join("\0")) return false;
    if (data.v !== TOKEN_VERSION || data.kind !== expectedKind) return false;
    if (!validIdentityField(data.sub) || !validIdentityField(data.email)) return false;
    if (typeof data.nonce !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(data.nonce)) return false;
    if (!Number.isSafeInteger(data.iat) || !Number.isSafeInteger(data.exp)) return false;
    if (data.iat < 0 || data.iat > timestamp || data.exp <= timestamp || data.exp <= data.iat) return false;
    return data.exp - data.iat === sessionTtl(expectedKind);
  }

  function signature(payload) {
    return crypto.createHmac("sha256", authSecret).update(payload).digest();
  }

  function sign(data, ttlMs) {
    const iat = currentTime();
    const exp = iat + ttlMs;
    if (!Number.isSafeInteger(exp)) throw new Error("Session expiry is outside the safe integer range");
    const claims = { v: TOKEN_VERSION, ...data, iat, exp };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${signature(payload).toString("base64url")}`;
  }

  function verify(token, kind) {
    try {
      if (typeof token !== "string") return null;
      const parts = token.split(".");
      if (parts.length !== 2) return null;
      const [payload, encodedSignature] = parts;
      const payloadBytes = strictBase64Url(payload);
      const providedSignature = strictBase64Url(encodedSignature);
      if (!payloadBytes || !providedSignature || providedSignature.length !== 32) return null;
      if (!crypto.timingSafeEqual(signature(payload), providedSignature)) return null;

      const data = JSON.parse(payloadBytes.toString("utf8"));
      return validClaims(data, kind) ? data : null;
    } catch {
      return null;
    }
  }

  function nonce() {
    const value = randomBytes(18);
    if (!(value instanceof Uint8Array) || value.byteLength !== 18) {
      throw new Error("Session random source must return exactly 18 bytes");
    }
    return Buffer.from(value).toString("base64url");
  }

  function csrfDigest(data) {
    return crypto.createHmac("sha256", csrfSecret)
      .update(`${data.v}:${data.kind}:${data.sub}:${data.email}:${data.nonce}:${data.iat}:${data.exp}`)
      .digest();
  }

  function appendCookie(res, name, value, ttlMs, sameSite) {
    const flags = [
      `${name}=${encodeURIComponent(value)}`,
      `Max-Age=${ttlMs / 1000}`,
      "Path=/",
      "HttpOnly",
      `SameSite=${sameSite}`
    ];
    if (secure) flags.push("Secure");
    appendSetCookie(res, flags.join("; "));
  }

  function clearCookie(res, name, sameSite) {
    const flags = [
      `${name}=`,
      "Max-Age=0",
      "Path=/",
      "HttpOnly",
      `SameSite=${sameSite}`,
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT"
    ];
    if (secure) flags.push("Secure");
    appendSetCookie(res, flags.join("; "));
  }

  function issue(res, kind, sub, email, ttlMs, sameSite) {
    const identity = {
      kind,
      sub: String(sub || ""),
      email: String(email || ""),
      nonce: nonce()
    };
    if (!validIdentityField(identity.sub) || !validIdentityField(identity.email)) {
      throw new Error(`Cannot issue an invalid ${kind} session`);
    }
    const token = sign(identity, ttlMs);
    const signedClaims = decodeIssuedClaims(token);
    appendCookie(res, kind === "member" ? MEMBER_COOKIE : ADMIN_COOKIE, token, ttlMs, sameSite);
    return {
      expiresIn: ttlMs / 1000,
      csrfToken: csrfDigest(signedClaims).toString("base64url")
    };
  }

  function decodeIssuedClaims(token) {
    const payload = token.split(".", 1)[0];
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  }

  function read(req, name, kind) {
    const parsed = parseRelevantCookies(req);
    if (parsed.invalid) return null;
    return verify(parsed.values.get(name), kind);
  }

  return {
    issueMember(res, member) {
      return {
        ...issue(res, "member", member?.id, member?.email, memberTtlMs, "Lax"),
        member
      };
    },
    issueAdmin(res, email) {
      return {
        success: true,
        ...issue(res, "admin", email, email, ADMIN_SESSION_TTL_MS, "Strict")
      };
    },
    readMember(req) {
      return read(req, MEMBER_COOKIE, "member");
    },
    readAdmin(req) {
      return read(req, ADMIN_COOKIE, "admin");
    },
    validCsrf(data, token) {
      const claimsValid = data?.kind === "member"
        ? validClaims(data, "member")
        : data?.kind === "admin" && validClaims(data, "admin");
      const expected = claimsValid ? csrfDigest(data) : csrfDigest({
        v: 0,
        kind: "invalid",
        sub: "invalid",
        email: "invalid",
        nonce: "invalid",
        iat: 0,
        exp: 0
      });
      const decoded = strictBase64Url(typeof token === "string" ? token : "");
      const candidate = decoded?.length === 32 ? decoded : Buffer.alloc(32);
      const equal = crypto.timingSafeEqual(expected, candidate);
      return Boolean(claimsValid && decoded?.length === 32 && equal);
    },
    csrfTokenFor(data) {
      if (data?.kind === "member" && validClaims(data, "member")) return csrfDigest(data).toString("base64url");
      if (data?.kind === "admin" && validClaims(data, "admin")) return csrfDigest(data).toString("base64url");
      return "";
    },
    clearMember(res) {
      clearCookie(res, MEMBER_COOKIE, "Lax");
    },
    clearAdmin(res) {
      clearCookie(res, ADMIN_COOKIE, "Strict");
    },
    expireRetiredMemberCookie(res) {
      clearCookie(res, RETIRED_MEMBER_COOKIE, "Lax");
    }
  };
}

module.exports = {
  MEMBER_COOKIE,
  ADMIN_COOKIE,
  RETIRED_MEMBER_COOKIE,
  ADMIN_SESSION_TTL_MS,
  SESSION_IDENTITY_MAX_LENGTH,
  createSessionSecurity
};
