(function initAiXApi(global) {
  "use strict";

  const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  const RETIRED_AUTH_KEYS = [
    "aix_member_token",
    "aix_member_session",
    "aixAdminToken",
    "aixAdminAuth",
    "aix_members"
  ];
  const GENERIC_ERROR_MESSAGE = "ไม่สามารถเชื่อมต่อระบบได้";

  function removeRetiredAuthStorage() {
    let storage;
    try {
      storage = global.localStorage;
    } catch (error) {
      return;
    }
    if (!storage) return;

    RETIRED_AUTH_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (error) {
        // Storage can be blocked by browser privacy settings. Cookie sessions still work.
      }
    });
  }

  function safeError(status = 0, message = GENERIC_ERROR_MESSAGE) {
    const error = new Error(message);
    error.status = Number.isFinite(Number(status)) ? Number(status) : 0;
    return error;
  }

  function validatedTarget(path) {
    let value;
    let target;
    try {
      value = String(path);
      target = new global.URL(value, global.location.href);
    } catch (error) {
      throw safeError(0);
    }

    if (
      !["http:", "https:"].includes(target.protocol)
      || target.origin !== global.location.origin
      || target.username
      || target.password
    ) {
      throw safeError(0);
    }
    return target.href;
  }

  function isBodyType(body, constructorName) {
    const Constructor = global[constructorName];
    return typeof Constructor === "function" && body instanceof Constructor;
  }

  function bodyIsJsonString(body) {
    if (typeof body !== "string") return false;
    try {
      JSON.parse(body);
      return true;
    } catch (error) {
      return false;
    }
  }

  function prepareHeaders(options, method) {
    const headers = new global.Headers(options.headers || {});
    headers.delete("Authorization");
    headers.delete("X-CSRF-Token");

    const body = options.body;
    if (isBodyType(body, "FormData")) {
      headers.delete("Content-Type");
    } else if (
      bodyIsJsonString(body)
      && !headers.has("Content-Type")
      && !isBodyType(body, "URLSearchParams")
      && !isBodyType(body, "Blob")
    ) {
      headers.set("Content-Type", "application/json");
    }

    return { headers, method };
  }

  async function parseResponse(response) {
    if (response.status === 204 || response.status === 205) return null;
    const text = await response.text();
    if (!text) return null;

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("json")) {
      try {
        return JSON.parse(text);
      } catch (error) {
        return text;
      }
    }
    return text;
  }

  function createClient({ sessionPath } = {}) {
    let csrfToken = "";
    let tokenEpoch = 0;

    function adopt(data) {
      if (data && typeof data.csrfToken === "string") {
        csrfToken = data.csrfToken;
        tokenEpoch += 1;
      }
      return data;
    }

    function clear() {
      csrfToken = "";
      tokenEpoch += 1;
    }

    async function raw(path, options = {}) {
      const requestTarget = validatedTarget(path);
      const method = String(options.method || "GET").trim().toUpperCase() || "GET";
      const prepared = prepareHeaders(options, method);
      if (UNSAFE_METHODS.has(method) && csrfToken) {
        prepared.headers.set("X-CSRF-Token", csrfToken);
      }

      return global.fetch(requestTarget, {
        ...options,
        method: prepared.method,
        headers: prepared.headers,
        credentials: "same-origin",
        redirect: "error"
      });
    }

    async function executeRequest(path, options = {}) {
      let response;
      try {
        response = await raw(path, options);
      } catch (error) {
        if (error && error.status === 0) throw error;
        throw safeError(0);
      }

      let data;
      try {
        data = await parseResponse(response);
      } catch (error) {
        if (!response.ok) throw safeError(response.status);
        throw safeError(response.status);
      }

      if (!response.ok) {
        const message = data && typeof data === "object" && typeof data.error === "string" && data.error.trim()
          ? data.error.trim()
          : GENERIC_ERROR_MESSAGE;
        throw safeError(response.status, message);
      }
      return data;
    }

    async function request(path, options = {}) {
      return adopt(await executeRequest(path, options));
    }

    async function bootstrap() {
      clear();
      const bootstrapEpoch = tokenEpoch;
      try {
        const data = await executeRequest(sessionPath, { cache: "no-store" });
        if (!data || typeof data.csrfToken !== "string" || !data.csrfToken.trim()) {
          throw safeError(0);
        }
        if (tokenEpoch === bootstrapEpoch) adopt(data);
        return data;
      } catch (error) {
        if (tokenEpoch === bootstrapEpoch) clear();
        throw error;
      }
    }

    return Object.freeze({
      request,
      raw,
      bootstrap,
      adopt,
      clear,
      get csrfToken() {
        return csrfToken;
      }
    });
  }

  removeRetiredAuthStorage();
  global.AiXApi = Object.freeze({ createClient });
})(window);
