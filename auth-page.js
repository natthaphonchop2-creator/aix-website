const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^0\d{9}$/;

const state = {
  mode: window.location.pathname.includes("register") ? "register" : "login",
  googleClientId: "",
  googleReady: false,
  googleInitialized: false
};

const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("emailLoginForm");
const dividerText = document.getElementById("dividerText");
const googleStatus = document.getElementById("googleAuthStatus");
const toast = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "ไม่สามารถเชื่อมต่อระบบได้");
  }
  return response.json();
}

function setSession(result) {
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(SESSION_KEY, JSON.stringify(result.member));
}

function setMode(mode) {
  state.mode = mode;
  document.title = mode === "register" ? "สมัครสมาชิก | AiX Club" : "เข้าสู่ระบบสมาชิก | AiX Club";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  registerForm.classList.toggle("hidden", mode !== "register");
  loginForm.classList.toggle("hidden", mode !== "login");
  dividerText.textContent = mode === "register" ? "หรือสมัครด้วย Email/Password" : "หรือเข้าสู่ระบบด้วย Email/Password";
  googleStatus.textContent = mode === "register"
    ? "สมัครด้วย Google แล้วเข้าหน้าสมาชิกได้ทันที"
    : "เข้าสู่ระบบด้วย Google เป็นช่องทางหลัก";
  history.replaceState(null, "", mode === "register" ? "/register" : "/login");
  renderGoogleButton();
}

function setGoogleFallback(message) {
  const target = document.getElementById("googleAuthButton");
  if (target) {
    target.innerHTML = `
      <button class="google-fallback" type="button" disabled>
        <i class="fa-brands fa-google"></i>
        <span>เข้าสู่ระบบด้วย Google</span>
      </button>
    `;
  }
  googleStatus.textContent = message;
}

async function handleGoogleCredential(response) {
  try {
    const result = await apiRequest("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential, mode: state.mode })
    });
    setSession(result);
    window.location.href = "/dashboard";
  } catch (error) {
    showToast(error.message || "เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
  }
}

function renderGoogleButton() {
  const target = document.getElementById("googleAuthButton");
  if (!target || !state.googleInitialized || !window.google?.accounts?.id) return;
  target.innerHTML = "";
  window.google.accounts.id.renderButton(target, {
    theme: "outline",
    size: "large",
    width: Math.min(380, target.getBoundingClientRect().width || 360),
    text: state.mode === "register" ? "signup_with" : "signin_with",
    locale: "th",
    logo_alignment: "left",
    click_listener: () => {
      state.googleMode = state.mode;
    }
  });
}

async function initGoogle() {
  try {
    const config = await apiRequest("/api/config");
    state.googleClientId = config.googleClientId || "";
    state.googleReady = Boolean(config.googleReady);
  } catch (error) {
    setGoogleFallback("Google Login ยังเชื่อมต่อไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
    return;
  }
  if (!state.googleClientId || !state.googleReady) {
    setGoogleFallback("Google Login ยังไม่ได้เปิดใช้งาน: ตั้งค่า GOOGLE_CLIENT_ID ในไฟล์ .env แล้ว restart server");
    return;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (!window.google?.accounts?.id) {
      if (attempts > 40) {
        window.clearInterval(timer);
        setGoogleFallback("โหลด Google Login ไม่สำเร็จ");
      }
      return;
    }
    window.clearInterval(timer);
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: handleGoogleCredential,
      auto_select: false
    });
    state.googleInitialized = true;
    renderGoogleButton();
  }, 150);
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(registerForm);
  const email = normalizeEmail(data.get("email"));
  const password = normalizeText(data.get("password"));
  const passwordConfirm = normalizeText(data.get("passwordConfirm"));
  const phone = normalizePhone(data.get("phone"));
  if (!normalizeText(data.get("firstName")) || !normalizeText(data.get("lastName"))) return showToast("กรุณากรอกชื่อและนามสกุล");
  if (!EMAIL_RE.test(email)) return showToast("กรุณากรอกอีเมลให้ถูกต้อง");
  if (password.length < 8) return showToast("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  if (password !== passwordConfirm) return showToast("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
  if (phone && !PHONE_RE.test(phone)) return showToast("เบอร์โทรต้องเป็นเลขไทย 10 หลักขึ้นต้นด้วย 0");
  if (!data.get("consentAccepted")) return showToast("กรุณายืนยันการสร้างบัญชีสมาชิก");

  try {
    const result = await apiRequest("/api/members/register", {
      method: "POST",
      body: JSON.stringify({
        firstName: normalizeText(data.get("firstName")),
        lastName: normalizeText(data.get("lastName")),
        displayName: `${normalizeText(data.get("firstName"))} ${normalizeText(data.get("lastName"))}`.trim(),
        email,
        password,
        passwordConfirm,
        phone,
        payment: "online",
        consentAccepted: true
      })
    });
    setSession(result);
    window.location.href = "/dashboard";
  } catch (error) {
    showToast(error.message || "สมัครสมาชิกไม่สำเร็จ");
  }
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const email = normalizeEmail(data.get("email"));
  const password = normalizeText(data.get("password"));
  if (!EMAIL_RE.test(email)) return showToast("กรุณากรอกอีเมลให้ถูกต้อง");
  if (!password) return showToast("กรุณากรอกรหัสผ่าน");

  try {
    const result = await apiRequest("/api/members/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setSession(result);
    window.location.href = "/dashboard";
  } catch (error) {
    showToast(error.message || "เข้าสู่ระบบไม่สำเร็จ");
  }
});

document.querySelectorAll("[data-auth-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.authMode));
});

setMode(state.mode);
initGoogle();
