const courses = [
  {
    id: "manus-ai",
    title: "Manus AI สำหรับธุรกิจ",
    type: "Live",
    level: "Agent",
    instructor: "AiX Team",
    duration: "6 ชั่วโมง",
    price: 1999,
    status: "เปิดรับ",
    image: "assets/generated/course-ai-agent.jpg",
    rating: "4.9",
    lessons: "8 modules",
    skills: ["AI Agent", "Workflow Automation", "Prompt Engineering"],
    description: "คอร์สเรียน Manus AI สำหรับสร้าง AI Agent ช่วยตอบลูกค้า สรุปรายงาน วางแผนคอนเทนต์ และจัดการ workflow ธุรกิจอัตโนมัติ",
    topics: [
      "เข้าใจว่า AI Agent เหมาะกับงานธุรกิจแบบไหน",
      "สร้าง Agent ตัวแรกด้วย Manus AI",
      "ออกแบบ Prompt Engineering สำหรับงานซับซ้อน",
      "ทำ Deep Research และสรุปรายงานธุรกิจ",
      "วางระบบ Content, Sales และ Customer Service ด้วย AI",
      "เชื่อม workflow ด้วย Make / n8n",
      "สร้าง AI Business System ที่นำกลับไปใช้กับธุรกิจของตัวเอง"
    ]
  },
  {
    id: "claude-manus-vibe-coding",
    title: "Claude & Manus Vibe Coding",
    type: "Coming Soon",
    level: "Coding",
    instructor: "AiX Team",
    duration: "3 ชั่วโมง",
    price: 0,
    status: "แจ้งเตือน",
    image: "assets/generated/course-ai-coding.jpg",
    rating: "New",
    lessons: "4 modules",
    skills: ["Vibe Coding", "Prototype", "AI Coding"],
    description: "เรียนใช้ Claude และ Manus ช่วยสร้าง prototype เว็บ แอป และ workflow สำหรับธุรกิจ โดยเริ่มจาก prompt และสเปกที่ชัดเจน",
    topics: ["Vibe Coding workflow", "เปลี่ยน Prompt เป็น Prototype", "Debug กับ AI", "เขียนสเปกส่งต่อให้ Developer"]
  },
  {
    id: "claude-deep-dive",
    title: "Claude แบบลงลึก",
    type: "Coming Soon",
    level: "Prompt",
    instructor: "AiX Team",
    duration: "4 ชั่วโมง",
    price: 0,
    status: "แจ้งเตือน",
    image: "assets/generated/course-ai-coding.jpg",
    rating: "New",
    lessons: "5 modules",
    skills: ["Deep Research", "Prompt Chain", "Business Strategy"],
    description: "คอร์สเรียน Claude สำหรับคิดกลยุทธ์ ทำ Deep Research วิเคราะห์เอกสาร และสร้าง Prompt Chain ที่ใช้ซ้ำได้ในงานธุรกิจ",
    topics: ["Deep Research สำหรับธุรกิจ", "Project Knowledge", "Prompt Chain", "Workflow Documentation"]
  },
  {
    id: "ai-video-graphic",
    title: "AI Video & Graphic",
    type: "Creative",
    level: "Creative",
    instructor: "AiX Team",
    duration: "3 ชั่วโมง",
    price: 0,
    status: "เร็วๆ นี้",
    image: "assets/generated/course-creative-ai.jpg",
    rating: "New",
    lessons: "4 modules",
    skills: ["Image AI", "AI Video", "Content Marketing"],
    description: "เรียนสร้างภาพ วิดีโอ กราฟิก และคอนเทนต์การตลาดด้วย AI ให้เข้ากับ Brand Identity ตั้งแต่ไอเดียจนพร้อมเผยแพร่",
    topics: ["AI Image Generation", "AI Video Workflow", "Brand Style Prompt", "Content Repurpose"]
  },
  {
    id: "ai-agent-business",
    title: "AI Agent สำหรับธุรกิจ",
    type: "Business",
    level: "Automation",
    instructor: "AiX Team",
    duration: "5 ชั่วโมง",
    price: 0,
    status: "เร็วๆ นี้",
    image: "assets/generated/course-ai-agent.jpg",
    rating: "New",
    lessons: "6 modules",
    skills: ["Agent Design", "Business Operations", "Customer Service"],
    description: "เรียนออกแบบ AI Agent สำหรับงาน operation ตอบลูกค้า สรุปเอกสาร และประสานงานหลายเครื่องมือแทนทีมธุรกิจ",
    topics: ["Agent Architecture", "Tool Connection", "Human Approval", "Monitoring & Improvement"]
  }
];

const resources = [
  {
    title: "Prompt Templates",
    category: "Prompt Engineering",
    icon: "fa-message",
    description: "ชุด Prompt สำหรับคิดกลยุทธ์ เขียนคอนเทนต์ วิเคราะห์ลูกค้า สรุปรายงาน และสั่งงาน AI ให้ได้ผลลัพธ์ซ้ำได้"
  },
  {
    title: "Agent Workflow",
    category: "Agent",
    icon: "fa-robot",
    description: "Blueprint สำหรับสร้าง AI Agent แบบเป็นขั้นตอน ตั้งแต่กำหนดหน้าที่ เครื่องมือ ข้อมูล ไปจนถึงการอนุมัติผลลัพธ์"
  },
  {
    title: "Research Playbook",
    category: "Research",
    icon: "fa-brain",
    description: "Template สำหรับทำ Deep Research วิเคราะห์เอกสาร สรุป insight และวางแผนโปรเจกต์ด้วย AI"
  },
  {
    title: "Automation Checklist",
    category: "Automation",
    icon: "fa-gears",
    description: "เช็กลิสต์การเชื่อมฟอร์ม CRM, Sheet, Email, AI และ workflow automation ให้ทำงานต่อกันอย่างเป็นระบบ"
  }
];

const state = {
  activeFilter: "ทั้งหมด",
  search: "",
  toastTimer: null,
  currentCourseId: "aix-membership-gen-zero",
  member: null,
  activeAuthTab: "signup",
  googleCredential: "",
  googleProfile: null,
  googleMode: "signup",
  otpPhone: "",
  otpVerifiedPhone: "",
  phoneVerificationToken: "",
  otpCooldownTimer: null,
  smsReady: false,
  smsProvider: "dev"
};

const API_ORIGIN = window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin;
const STORAGE_KEYS = {
  members: "aix_members",
  session: "aix_member_session",
  token: "aix_member_token"
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^0\d{9}$/;

const classFilters = document.getElementById("classFilters");
const classesGrid = document.getElementById("classesGrid");
const resourceList = document.getElementById("resourceList");
const classModal = document.getElementById("classModal");
const classModalContent = document.getElementById("classModalContent");
const authModal = document.getElementById("authModal");
const toast = document.getElementById("toast");
const memberForm = document.getElementById("memberForm");
const loginForm = document.getElementById("loginForm");
const signupOtpBox = document.getElementById("signupOtpBox");
const sendOtpBtn = document.getElementById("sendOtpBtn");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const otpCodeInput = document.getElementById("otpCode");
const otpStatus = document.getElementById("otpStatus");
const globalSearch = document.getElementById("globalSearch");
const catalogSearch = document.getElementById("catalogSearch");
const mobileMenu = document.getElementById("mobileMenu");
const mobilePanel = document.getElementById("mobilePanel");
const initialHash = window.location.hash.replace("#", "");

if (initialHash) {
  history.replaceState(null, "", window.location.pathname);
  window.scrollTo(0, 0);
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d]/g, "");
}

function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

function isValidPhone(phone) {
  return PHONE_RE.test(normalizePhone(phone));
}

function apiUrl(path) {
  return `${API_ORIGIN}${path}`;
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  const response = await fetch(apiUrl(path), {
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

function normalizeCourseCard(course) {
  return {
    id: course.id,
    title: course.title || course.name,
    type: course.type || "AI",
    level: course.level || "Practical",
    instructor: course.instructor || "AiX Team",
    duration: course.duration || "",
    price: course.price || 0,
    status: course.status || "พร้อมเรียน",
    image: course.image || "assets/generated/hero-space-learning.jpg",
    rating: course.rating || "New",
    lessons: course.lessons || "",
    skills: Array.isArray(course.skills) ? course.skills : [],
    description: course.description || course.subtitle || "",
    topics: Array.isArray(course.outcomes) ? course.outcomes : []
  };
}

async function loadCoursesFromDatabase() {
  try {
    const databaseCourses = await apiRequest("/api/platform/courses");
    if (!Array.isArray(databaseCourses) || databaseCourses.length === 0) return;
    courses.splice(0, courses.length, ...databaseCourses.map(normalizeCourseCard));
    renderClassFilters();
    renderCourses();
  } catch (error) {
    // Static course data remains available when the local server is not running.
  }
}

function getLocalMembers() {
  try {
    const members = JSON.parse(localStorage.getItem(STORAGE_KEYS.members) || "[]");
    const cleanMembers = members.filter((member) => !/@aix\.test$/.test(String(member.email || "")));
    if (cleanMembers.length !== members.length) setLocalMembers(cleanMembers);
    return cleanMembers;
  } catch (error) {
    return [];
  }
}

function setLocalMembers(members) {
  localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members));
}

function saveLocalMember(payload) {
  const members = getLocalMembers();
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const duplicate = members.find((member) => normalizeEmail(member.email) === email || normalizePhone(member.phone) === phone);

  if (duplicate) {
    throw new Error("อีเมลหรือเบอร์โทรนี้มีบัญชีสมาชิกอยู่แล้ว");
  }

  const member = {
    id: `local_member_${Date.now()}`,
    ...payload,
    email,
    phone,
    status: "active",
    paymentStatus: "unpaid",
    authProvider: payload.googleCredential ? "google" : "email",
    createdAt: new Date().toISOString()
  };
  members.unshift(member);
  setLocalMembers(members);
  return member;
}

function setFieldError(input, message) {
  if (!input) return;
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");

  const label = input.closest("label");
  const errorHost = input.closest(".consent-row") || label;
  if (!errorHost) return;

  let error = errorHost.querySelector(".field-error");
  if (!error && message) {
    error = document.createElement("span");
    error.className = "field-error";
    errorHost.appendChild(error);
  }
  if (error) {
    error.textContent = message || "";
    if (!message) error.remove();
  }
}

function clearFormErrors(form) {
  form?.querySelectorAll(".invalid").forEach((input) => {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  });
  form?.querySelectorAll(".field-error").forEach((error) => error.remove());
}

function setOtpStatus(message, type = "neutral") {
  if (!otpStatus || !signupOtpBox) return;
  otpStatus.textContent = message;
  signupOtpBox.classList.toggle("verified", type === "verified");
  signupOtpBox.classList.toggle("error", type === "error");
}

function setOtpButtons({ sending = false, verifying = false } = {}) {
  if (sendOtpBtn) sendOtpBtn.disabled = sending || verifying;
  if (verifyOtpBtn) verifyOtpBtn.disabled = sending || verifying;
}

function resetOtpVerification(message = "กรอกเบอร์โทรแล้วกดส่งรหัส") {
  window.clearInterval(state.otpCooldownTimer);
  state.otpPhone = "";
  state.otpVerifiedPhone = "";
  state.phoneVerificationToken = "";
  if (memberForm?.elements.phoneVerificationToken) memberForm.elements.phoneVerificationToken.value = "";
  if (otpCodeInput) otpCodeInput.value = "";
  if (sendOtpBtn) {
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = "ส่งรหัส SMS";
  }
  if (verifyOtpBtn) verifyOtpBtn.disabled = false;
  setOtpStatus(message);
}

function startOtpCooldown(seconds) {
  window.clearInterval(state.otpCooldownTimer);
  let remaining = Number(seconds || 0);
  if (!sendOtpBtn || remaining <= 0) return;

  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = `ส่งใหม่ใน ${remaining}s`;
  state.otpCooldownTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(state.otpCooldownTimer);
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = "ส่งรหัส SMS";
      return;
    }
    sendOtpBtn.textContent = `ส่งใหม่ใน ${remaining}s`;
  }, 1000);
}

async function sendSignupOtp() {
  clearFormErrors(memberForm);
  const phone = normalizePhone(memberForm?.elements.phone?.value);
  const email = normalizeEmail(memberForm?.elements.email?.value);

  if (!isValidPhone(phone)) {
    setFieldError(memberForm.elements.phone, "กรุณากรอกเบอร์โทร 10 หลัก เริ่มต้นด้วย 0");
    setOtpStatus("กรุณาตรวจเบอร์โทร", "error");
    return;
  }
  if (email && !isValidEmail(email)) {
    setFieldError(memberForm.elements.email, "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com");
    setOtpStatus("กรุณาตรวจอีเมล", "error");
    return;
  }

  try {
    setOtpButtons({ sending: true });
    const result = await apiRequest("/api/members/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone, email })
    });
    state.otpPhone = phone;
    state.otpVerifiedPhone = "";
    state.phoneVerificationToken = "";
    if (memberForm.elements.phoneVerificationToken) memberForm.elements.phoneVerificationToken.value = "";
    setOtpStatus(result.devCode
      ? `โหมดทดสอบ: ใช้รหัส ${result.devCode} (ยังไม่ได้ส่ง SMS จริง)`
      : "ส่ง SMS จริงแล้ว กรุณาตรวจข้อความในมือถือ");
    startOtpCooldown(result.resendIn || 60);
  } catch (error) {
    setOtpStatus(error.message || "ส่งรหัสไม่สำเร็จ", "error");
  } finally {
    if (verifyOtpBtn) verifyOtpBtn.disabled = false;
  }
}

async function verifySignupOtp() {
  const phone = normalizePhone(memberForm?.elements.phone?.value);
  const code = normalizePhone(otpCodeInput?.value).slice(0, 6);

  if (!isValidPhone(phone)) {
    setFieldError(memberForm.elements.phone, "กรุณากรอกเบอร์โทร 10 หลัก เริ่มต้นด้วย 0");
    setOtpStatus("กรุณาตรวจเบอร์โทร", "error");
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    setFieldError(otpCodeInput, "กรุณากรอกรหัส SMS 6 หลัก");
    setOtpStatus("กรอกรหัส 6 หลัก", "error");
    return;
  }

  try {
    setOtpButtons({ verifying: true });
    const result = await apiRequest("/api/members/otp/verify", {
      method: "POST",
      body: JSON.stringify({ phone, code })
    });
    state.otpVerifiedPhone = phone;
    state.phoneVerificationToken = result.phoneVerificationToken;
    if (memberForm.elements.phoneVerificationToken) memberForm.elements.phoneVerificationToken.value = result.phoneVerificationToken;
    setOtpStatus("ยืนยันเบอร์โทรเรียบร้อย", "verified");
  } catch (error) {
    setOtpStatus(error.message || "ยืนยันรหัสไม่สำเร็จ", "error");
  } finally {
    setOtpButtons();
  }
}

function validateSignupForm() {
  clearFormErrors(memberForm);
  const formData = new FormData(memberForm);
  let valid = true;
  const requiredFields = ["firstName", "lastName", "email"];
  if (!state.googleCredential) requiredFields.push("password", "passwordConfirm");

  requiredFields.forEach((name) => {
    const input = memberForm.elements[name];
    if (!normalizeText(formData.get(name))) {
      setFieldError(input, "กรุณากรอกข้อมูลช่องนี้");
      valid = false;
    }
  });

  if (formData.get("email") && !isValidEmail(formData.get("email"))) {
    setFieldError(memberForm.elements.email, "กรุณากรอกอีเมลให้ถูกต้อง เช่น name@example.com");
    valid = false;
  }

  if (normalizeText(formData.get("phone")) && !isValidPhone(formData.get("phone"))) {
    setFieldError(memberForm.elements.phone, "กรุณากรอกเบอร์โทร 10 หลัก เริ่มต้นด้วย 0");
    valid = false;
  }

  if (!state.googleCredential && normalizeText(formData.get("password")).length < 8) {
    setFieldError(memberForm.elements.password, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
    valid = false;
  }

  if (!state.googleCredential && normalizeText(formData.get("password")) !== normalizeText(formData.get("passwordConfirm"))) {
    setFieldError(memberForm.elements.passwordConfirm, "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
    valid = false;
  }

  if (!memberForm.elements.consentAccepted.checked) {
    setFieldError(memberForm.elements.consentAccepted, "ต้องยืนยันข้อมูลก่อนสมัครสมาชิก");
    valid = false;
  }

  return valid;
}

function validateLoginForm() {
  clearFormErrors(loginForm);
  const formData = new FormData(loginForm);
  let valid = true;

  if (!isValidEmail(formData.get("email"))) {
    setFieldError(loginForm.elements.email, "กรุณากรอกอีเมลให้ถูกต้อง");
    valid = false;
  }

  if (normalizeText(formData.get("password")).length < 1) {
    setFieldError(loginForm.elements.password, "กรุณากรอกรหัสผ่าน");
    valid = false;
  }

  return valid;
}

async function registerMember(payload) {
  try {
    const result = await apiRequest("/api/members/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { member: result.member, token: result.token, source: "server" };
  } catch (error) {
    if (/Failed to fetch|NetworkError/i.test(error.message)) {
      throw new Error("ระบบสมัครสมาชิกต้องเปิดผ่าน http://localhost:3000 เพื่อส่งรหัส SMS");
    }
    throw error;
  }
}

async function findMember(email, password) {
  const payload = {
    email: normalizeEmail(email),
    password: String(password || "")
  };

  try {
    const result = await apiRequest("/api/members/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return result;
  } catch (error) {
    if (/Failed to fetch|NetworkError/i.test(error.message)) {
      throw new Error("กรุณาเปิดผ่าน http://localhost:3000 เพื่อเข้าสู่ระบบสมาชิก");
    }
    return null;
  }
}

function setMember(member, token = null) {
  state.member = member;
  if (member) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(member));
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.session);
    localStorage.removeItem(STORAGE_KEYS.token);
  }
  updateMemberUi();
}

function updateMemberUi() {
  const loginBtn = document.getElementById("loginBtn");
  const mobileLoginBtn = document.getElementById("mobileLoginBtn");
  const label = state.member ? "Dashboard" : "เข้าสู่ระบบ";

  if (loginBtn) {
    loginBtn.textContent = label;
    loginBtn.classList.toggle("is-member", Boolean(state.member));
  }
  if (mobileLoginBtn) mobileLoginBtn.textContent = label;
  renderCourses();
}

async function restoreSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null");
    const token = localStorage.getItem(STORAGE_KEYS.token);
    if (!saved || !token || /@aix\.test$/.test(String(saved.email || ""))) {
      setMember(null);
      return;
    }
    setMember(saved);
    const result = await apiRequest("/api/auth/me");
    setMember(result.member);
  } catch (error) {
    setMember(null);
  }
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  mobilePanel?.classList.remove("open");
}

function openAuthModal(mode = "signup") {
  authModal?.classList.add("open");
  authModal?.setAttribute("aria-hidden", "false");
  setAuthTab(mode);
}

function closeAuthModal() {
  authModal?.classList.remove("open");
  authModal?.setAttribute("aria-hidden", "true");
}

function setAuthTab(mode) {
  state.activeAuthTab = mode;
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === mode);
  });
  document.getElementById("signupPane")?.classList.toggle("active", mode === "signup");
  document.getElementById("loginPane")?.classList.toggle("active", mode === "login");

  const form = mode === "signup" ? memberForm : loginForm;
  window.setTimeout(() => {
    form?.querySelector("[name='email']")?.focus();
  }, 80);
}

function prefillSignupFromGoogle(profile) {
  if (!profile || !memberForm) return;
  state.googleProfile = profile;
  memberForm.elements.email.value = profile.email || "";
  memberForm.elements.firstName.value = profile.given_name || profile.name?.split(" ")[0] || "";
  memberForm.elements.lastName.value = profile.family_name || profile.name?.split(" ").slice(1).join(" ") || "";
  memberForm.elements.email.readOnly = Boolean(profile.email);
  document.getElementById("googleSignupStatus").textContent = "เชื่อม Google แล้ว สามารถสร้างบัญชีสมาชิกได้ทันที";
}

async function handleGoogleCredential(response) {
  const credential = response?.credential;
  if (!credential) {
    showToast("ไม่พบข้อมูลยืนยันจาก Google");
    return;
  }

  state.googleCredential = credential;
  const mode = state.googleMode || state.activeAuthTab;

  try {
    const result = await apiRequest("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, mode })
    });

    if (result.member) {
      setMember(result.member, result.token);
      closeAuthModal();
      window.location.href = "dashboard.html";
      return;
    }

    if (result.profile) {
      openAuthModal("signup");
      prefillSignupFromGoogle(result.profile);
      showToast("กรุณากรอกเบอร์โทรเพื่อสมัครสมาชิกให้ครบ");
    }
  } catch (error) {
    showToast(error.message || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
  }
}

function setGoogleFallback(message) {
  document.querySelectorAll(".google-box").forEach((box) => {
    box.hidden = false;
    box.removeAttribute("hidden");
  });
  ["googleSignupButton", "googleLoginButton"].forEach((id) => {
    const target = document.getElementById(id);
    if (target) {
      target.innerHTML = `
        <button class="google-fallback" type="button" disabled>
          <i class="fa-brands fa-google"></i>
          <span>เข้าสู่ระบบด้วย Google</span>
        </button>
      `;
    }
  });
  ["googleSignupStatus", "googleLoginStatus"].forEach((id) => {
    const target = document.getElementById(id);
    if (target) target.textContent = message;
  });
}

async function initGoogleLogin() {
  let config;
  try {
    config = await apiRequest("/api/config");
    state.smsReady = Boolean(config.smsReady);
    state.smsProvider = config.smsProvider || "dev";
    if (!state.smsReady) {
      setOtpStatus("โหมดทดสอบ SMS: ระบบจะแสดงรหัสในหน้านี้");
    }
  } catch (error) {
    setGoogleFallback("Google Login ยังเชื่อมต่อไม่ได้ กรุณาตรวจการตั้งค่าระบบ");
    setOtpStatus("ต้องเปิดผ่าน localhost เพื่อใช้ SMS");
    return;
  }

  if (!config.googleClientId || !config.googleReady) {
    setGoogleFallback("Google Login ยังไม่ได้เปิดใช้งาน: ตั้งค่า GOOGLE_CLIENT_ID ในไฟล์ .env แล้ว restart server");
    return;
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    if (!window.google?.accounts?.id) {
      if (attempts > 40) {
        window.clearInterval(timer);
        setGoogleFallback("โหลด Google login ไม่สำเร็จ");
      }
      return;
    }

    window.clearInterval(timer);
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: handleGoogleCredential,
      auto_select: false
    });

    window.google.accounts.id.renderButton(document.getElementById("googleSignupButton"), {
      theme: "outline",
      size: "large",
      width: 360,
      text: "signup_with",
      locale: "th",
      logo_alignment: "left",
      click_listener: () => {
        state.googleMode = "signup";
      }
    });

    window.google.accounts.id.renderButton(document.getElementById("googleLoginButton"), {
      theme: "outline",
      size: "large",
      width: 360,
      text: "signin_with",
      locale: "th",
      logo_alignment: "left",
      click_listener: () => {
        state.googleMode = "login";
      }
    });
  }, 150);
}

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => scrollToId(button.dataset.scroll));
});

document.querySelectorAll("[data-open-signup]").forEach((button) => {
  button.addEventListener("click", () => openAuthModal("signup"));
});

document.querySelectorAll("[data-open-login]").forEach((button) => {
  button.addEventListener("click", () => openAuthModal("login"));
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
});

mobileMenu?.addEventListener("click", () => {
  mobilePanel?.classList.toggle("open");
});

document.querySelectorAll("[data-filter-shortcut]").forEach((button) => {
  button.addEventListener("click", () => {
    state.activeFilter = button.dataset.filterShortcut;
    renderClassFilters();
    renderCourses();
    scrollToId("catalog");
  });
});

function renderClassFilters() {
  const filters = ["ทั้งหมด", "Live", "Coming Soon", "Agent", "Automation", "Creative", "Coding", "Prompt"];
  classFilters.innerHTML = filters.map((filter) => (
    `<button class="filter-tab ${filter === state.activeFilter ? "active" : ""}" data-filter="${filter}">${filter}</button>`
  )).join("");

  classFilters.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      renderClassFilters();
      renderCourses();
    });
  });
}

function matchesFilter(course) {
  if (state.activeFilter === "ทั้งหมด") return true;
  return course.type === state.activeFilter || course.level === state.activeFilter || course.skills.includes(state.activeFilter);
}

function matchesSearch(course) {
  const search = state.search.trim().toLowerCase();
  if (!search) return true;
  return [
    course.title,
    course.type,
    course.level,
    course.instructor,
    course.description,
    ...course.skills
  ].join(" ").toLowerCase().includes(search);
}

function courseCta(course) {
  if (!state.member) {
    return `<a class="secondary-btn" href="class-detail.html?id=${course.id}">ดูรายละเอียด</a>`;
  }
  if (state.member.paymentStatus === "paid") {
    return `<a class="primary-btn full" href="/course/${course.id}/content">เข้าเรียน</a>`;
  }
  return `<a class="primary-btn full" href="/payment">ชำระเงินเพื่อเข้าเรียน</a>`;
}

function renderCourses() {
  const filtered = courses.filter((course) => matchesFilter(course) && matchesSearch(course));
  classesGrid.innerHTML = filtered.map((course) => `
    <article class="course-card">
      <div class="course-image">
        <img src="${course.image}" alt="${course.title}" loading="lazy">
        <span class="course-badge">${course.status}</span>
      </div>
      <div class="course-body">
        <span class="provider">AiX Club</span>
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <div class="skill-row">
          ${course.skills.map((skill) => `<span>${skill}</span>`).join("")}
        </div>
        <div class="course-meta">
          <span><i class="fa-regular fa-user"></i>${course.instructor}</span>
          <span><i class="fa-regular fa-clock"></i>${course.duration}</span>
          <span><i class="fa-solid fa-star"></i>${course.rating}</span>
          <span><i class="fa-solid fa-list-check"></i>${course.lessons}</span>
          <span><i class="fa-solid fa-tag"></i>${course.price ? `฿${course.price.toLocaleString()}` : "รวมในสมาชิก"}</span>
        </div>
        <div class="course-actions">
          ${courseCta(course)}
          ${state.member ? `<a class="secondary-btn" href="class-detail.html?id=${course.id}">รายละเอียด</a>` : ""}
        </div>
      </div>
    </article>
  `).join("") || `<div class="resource-card"><h3>ไม่พบคอร์ส</h3><p>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ใหม่</p></div>`;
}

function renderResources() {
  resourceList.innerHTML = resources.map((resource) => `
    <article class="resource-card">
      <i class="fa-solid ${resource.icon}"></i>
      <span class="provider">${resource.category}</span>
      <h3>${resource.title}</h3>
      <p>${resource.description}</p>
    </article>
  `).join("");
}

function openClassModal(id) {
  const course = courses.find((item) => item.id === id);
  if (!course) return;
  classModalContent.innerHTML = `
    <div class="modal-content">
      <span class="provider">AiX Club</span>
      <h2>${course.title}</h2>
      <p>${course.description}</p>
      <div class="course-meta">
        <span><i class="fa-regular fa-user"></i>${course.instructor}</span>
        <span><i class="fa-regular fa-clock"></i>${course.duration}</span>
        <span><i class="fa-solid fa-star"></i>${course.rating}</span>
        <span><i class="fa-solid fa-tag"></i>${course.price ? `฿${course.price.toLocaleString()}` : "รวมในสมาชิก"}</span>
      </div>
      <h3>สิ่งที่จะได้เรียน</h3>
      <div class="modal-topics">
        ${course.topics.map((topic) => `<div>${topic}</div>`).join("")}
      </div>
      <div class="hero-actions">
        <button class="primary-btn" data-course-signup="${course.id}">สมัคร AiX Member</button>
        <button class="secondary-btn" data-close-modal>ปิด</button>
      </div>
    </div>
  `;
  classModal.classList.add("open");
  classModal.setAttribute("aria-hidden", "false");

  classModal.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeClassModal);
  });
  classModal.querySelector("[data-course-signup]")?.addEventListener("click", () => {
    state.currentCourseId = course.id;
    closeClassModal();
    openAuthModal("signup");
  });
}

function closeClassModal() {
  classModal.classList.remove("open");
  classModal.setAttribute("aria-hidden", "true");
}

classModal?.addEventListener("click", (event) => {
  if (event.target === classModal) closeClassModal();
});

authModal?.addEventListener("click", (event) => {
  if (event.target === authModal) closeAuthModal();
});

authModal?.querySelectorAll("[data-close-auth]").forEach((button) => {
  button.addEventListener("click", closeAuthModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeClassModal();
    closeAuthModal();
  }
});

document.querySelectorAll(".payment-option").forEach((option) => {
  option.addEventListener("click", () => {
    document.querySelectorAll(".payment-option").forEach((item) => item.classList.remove("active"));
    option.classList.add("active");
  });
});

function syncSearch(value, source) {
  state.search = value;
  if (source !== globalSearch && globalSearch) globalSearch.value = value;
  if (source !== catalogSearch && catalogSearch) catalogSearch.value = value;
  renderCourses();
}

globalSearch?.addEventListener("input", () => {
  syncSearch(globalSearch.value, globalSearch);
  if (globalSearch.value.trim()) scrollToId("catalog");
});

catalogSearch?.addEventListener("input", () => {
  syncSearch(catalogSearch.value, catalogSearch);
});

sendOtpBtn?.addEventListener("click", sendSignupOtp);
verifyOtpBtn?.addEventListener("click", verifySignupOtp);

memberForm?.elements.phone?.addEventListener("input", () => {
  const phone = normalizePhone(memberForm.elements.phone.value);
  memberForm.elements.phone.value = phone;
  if (state.otpVerifiedPhone && phone !== state.otpVerifiedPhone) {
    resetOtpVerification("เบอร์โทรเปลี่ยน กรุณายืนยัน SMS ใหม่");
  }
});

memberForm?.elements.email?.addEventListener("input", () => {
  if (state.phoneVerificationToken) return;
  setOtpStatus("กรอกเบอร์โทรแล้วกดส่งรหัส");
});

otpCodeInput?.addEventListener("input", () => {
  otpCodeInput.value = normalizePhone(otpCodeInput.value).slice(0, 6);
});

memberForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateSignupForm()) {
    showToast("กรุณาตรวจข้อมูลสมัครสมาชิกอีกครั้ง");
    return;
  }

  const formData = new FormData(memberForm);
  const payload = {
    firstName: normalizeText(formData.get("firstName")),
    lastName: normalizeText(formData.get("lastName")),
    displayName: `${normalizeText(formData.get("firstName"))} ${normalizeText(formData.get("lastName"))}`.trim(),
    email: normalizeEmail(formData.get("email")),
    phone: normalizePhone(formData.get("phone")),
    password: normalizeText(formData.get("password")),
    passwordConfirm: normalizeText(formData.get("passwordConfirm")),
    lineId: normalizeText(formData.get("lineId")),
    business: normalizeText(formData.get("business")),
    courseId: state.currentCourseId,
    membership: "aix-member",
    payment: formData.get("payment"),
    consentAccepted: Boolean(formData.get("consentAccepted")),
    marketingConsent: Boolean(formData.get("marketingConsent")),
    phoneVerificationToken: state.phoneVerificationToken,
    googleCredential: state.googleCredential
  };

  try {
    const result = await registerMember(payload);
    setMember(result.member, result.token);
    closeAuthModal();
    memberForm.reset();
    memberForm.elements.email.readOnly = false;
    resetOtpVerification();
    state.currentCourseId = "aix-membership-gen-zero";
    state.googleCredential = "";
    state.googleProfile = null;
    document.querySelectorAll(".payment-option").forEach((item, index) => item.classList.toggle("active", index === 0));
    window.location.href = "/dashboard";
  } catch (error) {
    showToast(error.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
});

document.getElementById("loginBtn")?.addEventListener("click", () => {
  if (state.member) {
    window.location.href = "/dashboard";
    return;
  }
  openAuthModal("login");
});

document.getElementById("mobileLoginBtn")?.addEventListener("click", () => {
  mobilePanel?.classList.remove("open");
  if (state.member) {
    window.location.href = "/dashboard";
    return;
  }
  openAuthModal("login");
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateLoginForm()) {
    showToast("กรุณาตรวจอีเมลและเบอร์โทรอีกครั้ง");
    return;
  }

  const formData = new FormData(loginForm);
  let result;
  try {
    result = await findMember(formData.get("email"), formData.get("password"));
  } catch (error) {
    showToast(error.message || "เข้าสู่ระบบไม่สำเร็จ");
    return;
  }

  if (!result?.member) {
    showToast("ไม่พบข้อมูลสมาชิกจากอีเมลและรหัสผ่านนี้");
    return;
  }

  setMember(result.member, result.token);
  closeAuthModal();
  window.location.href = "/dashboard";
});

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  state.toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 3600);
}

function initFromHash() {
  if (initialHash) {
    window.setTimeout(() => scrollToId(initialHash), 160);
  }
}

renderClassFilters();
renderCourses();
loadCoursesFromDatabase();
renderResources();
restoreSession();
initGoogleLogin();
initFromHash();
