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
    image: "assets/generated/course-banner-manus-ai.png",
    rating: "4.9",
    lessons: "8 modules",
    skills: ["AI Agent", "Workflow Automation", "Prompt Engineering"],
    description: "เริ่มตั้งผู้ช่วย AI ให้รับโจทย์ สรุปข้อมูล และส่งต่องานในรูปแบบที่ทีมใช้ต่อได้",
    topics: [
      "เข้าใจว่า AI Agent เหมาะกับงานธุรกิจแบบไหน",
      "สร้าง Agent ตัวแรกด้วย Manus AI",
      "ออกแบบ Prompt Engineering สำหรับงานซับซ้อน",
      "ทำ Deep Research และสรุปรายงานธุรกิจ",
      "วางระบบ Content, Sales และ Customer Service ด้วย AI",
      "ออกแบบระบบลดงานซ้ำจากงานจริง",
      "สร้าง AI Business System ที่นำกลับไปใช้กับธุรกิจของตัวเอง"
    ]
  },
  {
    id: "claude-manus-vibe-coding",
    title: "Claude & Codex Vibe Coding",
    type: "Coming Soon",
    level: "Coding",
    instructor: "AiX Team",
    duration: "3 ชั่วโมง",
    price: 0,
    status: "แจ้งเตือน",
    image: "assets/generated/course-banner-claude-codex-vibe-coding.png",
    rating: "New",
    lessons: "4 modules",
    skills: ["Vibe Coding", "Prototype", "AI Coding"],
    description: "เปลี่ยนไอเดียให้เป็นต้นแบบเว็บหรือระบบ พร้อมสเปกที่คุยกับ AI และส่งต่อให้ทีมได้",
    topics: ["ลำดับงาน Vibe Coding", "เปลี่ยนชุดคำสั่งเป็นต้นแบบ", "ตรวจข้อผิดพลาดกับ AI", "เขียนสเปกส่งต่อให้ทีมพัฒนา"]
  },
  {
    id: "claude-deep-dive",
    title: "Claude Deep Dive",
    type: "Coming Soon",
    level: "Prompt",
    instructor: "AiX Team",
    duration: "4 ชั่วโมง",
    price: 0,
    status: "แจ้งเตือน",
    image: "assets/generated/course-banner-claude-deep-dive.png",
    rating: "New",
    lessons: "5 modules",
    skills: ["Deep Research", "Prompt Chain", "Business Strategy"],
    description: "ใช้ Claude อ่านข้อมูลยาว จับประเด็น และช่วยร่างเอกสารให้พร้อมตรวจและนำไปใช้ต่อ",
    topics: ["Deep Research สำหรับธุรกิจ", "Project Knowledge", "Prompt Chain", "Workflow Documentation"]
  },
  {
    id: "ai-video-graphic",
    title: "AI Video & Graphic",
    type: "Creative",
    level: "Creative",
    instructor: "AiX Team",
    duration: "5 ชั่วโมง",
    price: 0,
    status: "เร็วๆ นี้",
    image: "assets/generated/course-banner-ai-video-graphic.png",
    rating: "New",
    lessons: "6 modules",
    skills: ["Image AI", "AI Video", "Content Marketing"],
    description: "วางทิศทางภาพและวิดีโอด้วย AI ตั้งแต่โจทย์เริ่มต้น จนได้ชิ้นงานที่สื่อสารตรงกับแบรนด์",
    topics: ["AI Image Generation", "AI Video Workflow", "Brand Style Prompt", "Content Repurpose"]
  },
  {
    id: "ai-agent-business",
    title: "AI Agent for Business",
    type: "Business",
    level: "Automation",
    instructor: "AiX Team",
    duration: "6 ชั่วโมง",
    price: 0,
    status: "เร็วๆ นี้",
    image: "assets/generated/course-banner-ai-agent-business.png",
    rating: "New",
    lessons: "7 modules",
    skills: ["Agent Design", "Business Operations", "Customer Service"],
    description: "วางผู้ช่วย AI สำหรับงานประจำ ตั้งขอบเขตให้ชัด และมีจุดให้คนตรวจสอบก่อนใช้งานจริง",
    topics: ["Agent Architecture", "Tool Connection", "Human Approval", "Monitoring & Improvement"]
  }
];

const resources = [
  {
    title: "สรุป AI ที่ควรรู้",
    category: "อัปเดต",
    icon: "fa-arrows-rotate",
    description: "รู้ว่ามีอะไรเปลี่ยน และเรื่องไหนเกี่ยวกับงานของคุณ"
  },
  {
    title: "เส้นทางตามงาน",
    category: "แนวทาง",
    icon: "fa-route",
    description: "เลือกเรื่องถัดไปจากงานที่อยากทำให้ดีขึ้น"
  },
  {
    title: "คลังพร้อมใช้",
    category: "เครื่องมือ",
    icon: "fa-folder-open",
    description: "รวมชุดคำสั่ง แม่แบบ และเช็กลิสต์ไว้ในที่เดียว"
  },
  {
    title: "ดูย้อนหลังและฝึกต่อ",
    category: "ทบทวน",
    icon: "fa-circle-play",
    description: "กลับมาดูบทเรียนและลองกับโจทย์ของตัวเอง"
  }
];

const homepageCourseDescriptions = Object.freeze({
  "manus-ai": "เริ่มตั้งผู้ช่วย AI ให้รับโจทย์ สรุปข้อมูล และส่งต่องานในรูปแบบที่ทีมใช้ต่อได้",
  "claude-manus-vibe-coding": "เปลี่ยนไอเดียให้เป็นต้นแบบเว็บหรือระบบ พร้อมสเปกที่คุยกับ AI และส่งต่อให้ทีมได้",
  "claude-deep-dive": "ใช้ Claude อ่านข้อมูลยาว จับประเด็น และช่วยร่างเอกสารให้พร้อมตรวจและนำไปใช้ต่อ",
  "ai-video-graphic": "วางทิศทางภาพและวิดีโอด้วย AI ตั้งแต่โจทย์เริ่มต้น จนได้ชิ้นงานที่สื่อสารตรงกับแบรนด์",
  "ai-agent-business": "วางผู้ช่วย AI สำหรับงานประจำ ตั้งขอบเขตให้ชัด และมีจุดให้คนตรวจสอบก่อนใช้งานจริง"
});

function homepageCourseDescription(course) {
  return homepageCourseDescriptions[course?.id]
    || course?.description
    || course?.subtitle
    || "";
}

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
  googleInitialized: false,
  googleIdentityInitialized: false,
  googleClientId: "",
  googleTokenClient: null,
  otpPhone: "",
  otpVerifiedPhone: "",
  phoneVerificationToken: "",
  otpCooldownTimer: null,
  smsReady: false,
  smsProvider: "dev"
};

const STORAGE_KEYS = {
  theme: "aix-theme"
};
const memberApi = window.AiXApi.createClient({ sessionPath: "/api/auth/me" });
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
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
let lastAuthTrigger = null;
let lastClassTrigger = null;
const pageEffects = {
  initialized: false,
  progressRaf: 0
};

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

async function apiRequest(path, options = {}) {
  const shouldBypassCache = path === "/api/config" || path.startsWith("/api/platform/courses");
  const requestPath = shouldBypassCache ? `${path}${path.includes("?") ? "&" : "?"}_=${Date.now()}` : path;
  const requestOptions = { ...options };
  if (shouldBypassCache) requestOptions.cache = "no-store";
  return memberApi.request(requestPath, requestOptions);
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
    description: homepageCourseDescription(course),
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

function describedByValues(input) {
  return (input?.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
}

function setDescribedBy(input, id, enabled) {
  if (!input || !id) return;
  const values = new Set(describedByValues(input));
  if (enabled) {
    values.add(id);
  } else {
    values.delete(id);
  }
  const nextValue = [...values].join(" ");
  if (nextValue) {
    input.setAttribute("aria-describedby", nextValue);
  } else {
    input.removeAttribute("aria-describedby");
  }
}

function getFieldErrorId(input) {
  return `${input.id || input.name || "field"}Error`;
}

function setFieldError(input, message) {
  if (!input) return;
  input.classList.toggle("invalid", Boolean(message));
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }

  const label = input.closest("label");
  const errorHost = input.closest(".consent-row") || label;
  if (!errorHost) return;

  const errorId = getFieldErrorId(input);
  let error = errorHost.querySelector(".field-error");
  if (!error && message) {
    error = document.createElement("span");
    error.className = "field-error";
    error.id = errorId;
    error.setAttribute("role", "alert");
    errorHost.appendChild(error);
  }
  if (error) {
    if (!error.id) error.id = errorId;
    error.setAttribute("role", "alert");
    error.textContent = message || "";
    setDescribedBy(input, error.id, Boolean(message));
    if (!message) error.remove();
  }
}

function clearFormErrors(form) {
  form?.querySelectorAll(".invalid").forEach((input) => {
    input.classList.remove("invalid");
    input.removeAttribute("aria-invalid");
  });
  form?.querySelectorAll(".field-error").forEach((error) => {
    if (error.id) {
      form.querySelectorAll(`[aria-describedby~="${error.id}"]`).forEach((input) => {
        setDescribedBy(input, error.id, false);
      });
    }
    error.remove();
  });
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
  const requiredFields = ["firstName", "email", "phone"];
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

  if (!isValidPhone(formData.get("phone"))) {
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
    memberApi.adopt(result);
    return result;
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
    memberApi.adopt(result);
    return result;
  } catch (error) {
    if (/Failed to fetch|NetworkError/i.test(error.message)) {
      throw new Error("กรุณาเปิดผ่าน http://localhost:3000 เพื่อเข้าสู่ระบบสมาชิก");
    }
    return null;
  }
}

function setMember(member) {
  state.member = member || null;
  updateMemberUi();
}

function setAuthActionHidden(element, isHidden) {
  if (!element) return;
  const target = element.closest(".aix-rainbow-shell") || element;
  target.hidden = isHidden;
  target.setAttribute("aria-hidden", isHidden ? "true" : "false");
  target.classList.toggle("is-auth-hidden", isHidden);
  element.tabIndex = isHidden ? -1 : 0;
}

function setHoverGradientNavContent(button, label, iconClass) {
  if (!button) return;
  button.querySelectorAll(".hover-gradient-nav-face span").forEach((span) => {
    span.textContent = label;
  });
  button.querySelectorAll(".hover-gradient-nav-face i").forEach((icon) => {
    icon.className = `fa-solid ${iconClass}`;
  });
  button.setAttribute("aria-label", label);
}

function syncMobileAccountAction(isMember) {
  const mobileAccountLink = document.querySelector(".luma-mobile-item[data-luma-section='account']");
  if (!mobileAccountLink) return;

  const label = isMember ? "ออก" : "เข้าสู่ระบบ";
  const ariaLabel = isMember ? "ลงชื่อออกจากระบบ" : "เข้าสู่ระบบ";
  const icon = mobileAccountLink.querySelector("i");
  const labelNode = mobileAccountLink.querySelector(".luma-mobile-label");

  mobileAccountLink.setAttribute("aria-label", ariaLabel);
  mobileAccountLink.setAttribute("href", isMember ? "#logout" : "/dashboard");
  mobileAccountLink.classList.toggle("is-auth-logout", isMember);
  if (labelNode) labelNode.textContent = label;
  if (icon) icon.className = `fa-solid ${isMember ? "fa-right-from-bracket" : "fa-user"}`;
}

function syncHomepageAuthActions() {
  const isMember = Boolean(state.member);
  const navSignupButton = document.querySelector(".hover-gradient-nav-primary[data-open-signup]");
  const guestSignupButtons = [...document.querySelectorAll("[data-open-signup]")]
    .filter((button) => button !== navSignupButton);
  const guestLoginButtons = [...document.querySelectorAll("[data-open-login]")];

  document.body.classList.toggle("is-member-logged-in", isMember);
  guestSignupButtons.forEach((button) => setAuthActionHidden(button, isMember));
  guestLoginButtons.forEach((button) => setAuthActionHidden(button, isMember));

  if (navSignupButton) {
    navSignupButton.dataset.authLogout = isMember ? "true" : "false";
    navSignupButton.classList.toggle("is-member-logout", isMember);
    setAuthActionHidden(navSignupButton, false);
    setHoverGradientNavContent(
      navSignupButton,
      isMember ? "ลงชื่อออก" : "สมัคร",
      isMember ? "fa-right-from-bracket" : "fa-arrow-right-to-bracket"
    );
  }

  syncMobileAccountAction(isMember);
}

function updateMemberUi() {
  const loginBtn = document.getElementById("loginBtn");
  const mobileLoginBtn = document.getElementById("mobileLoginBtn");
  const label = state.member ? "พื้นที่สมาชิก" : "เข้าสู่ระบบ";

  if (loginBtn) {
    if (loginBtn.classList.contains("hover-gradient-nav-item")) {
      loginBtn.querySelectorAll(".hover-gradient-nav-face span").forEach((span) => {
        span.textContent = label;
      });
      loginBtn.querySelectorAll(".hover-gradient-nav-face i").forEach((icon) => {
        icon.className = `fa-solid ${state.member ? "fa-gauge-high" : "fa-user"}`;
      });
      loginBtn.setAttribute("aria-label", label);
    } else {
      loginBtn.textContent = label;
    }
    loginBtn.classList.toggle("is-member", Boolean(state.member));
  }
  if (mobileLoginBtn) mobileLoginBtn.textContent = label;
  renderCourses();
  syncHomepageAuthActions();
}

async function logoutMember() {
  try {
    await memberApi.logout("/api/auth/logout");
  } catch (error) {
    showToast("ออกจากระบบไม่สำเร็จ ระบบยังคงสถานะเข้าสู่ระบบไว้ กรุณาลองใหม่");
    return false;
  }
  state.googleCredential = "";
  state.googleProfile = null;
  setMember(null);
  closeAuthModal();
  showToast("ลงชื่อออกจากระบบแล้ว");
  return true;
}

async function restoreSession() {
  try {
    const result = await memberApi.bootstrap();
    if (memberApi.csrfToken !== result.csrfToken) return;
    setMember(result.member);
  } catch (error) {
    if (!memberApi.csrfToken) setMember(null);
  }
}

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  mobilePanel?.classList.remove("open");
}

function setThemeMode(mode, persist = true) {
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
  themeColorMeta?.setAttribute("content", "#0a0a0a");
  colorSchemeMeta?.setAttribute("content", "dark");

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.hidden = true;
    button.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", "ธีมมืด");
  });

  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEYS.theme, "dark");
    } catch (error) {
      // Keep the forced dark theme usable when storage is unavailable.
    }
  }
}

function initThemeToggle() {
  setThemeMode("dark", true);
}

function revealComponentOnce(element, visibleClass, options = {}) {
  if (!(element instanceof HTMLElement)) return null;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    element.classList.add(visibleClass);
    return null;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    element.classList.add(visibleClass);
    observer.disconnect();
  }, {
    threshold: options.threshold ?? 0.18,
    rootMargin: options.rootMargin ?? "0px 0px -8% 0px"
  });

  observer.observe(element);
  return observer;
}

function initHoverGradientNav() {
  const nav = document.querySelector(".aix-home-header .hover-gradient-nav-bar");
  if (!nav || nav.dataset.navRuntimeReady === "true") return;

  nav.dataset.navRuntimeReady = "true";
  const items = [...nav.querySelectorAll(".hover-gradient-nav-item")];
  const sectionItems = items
    .map((item) => ({
      item,
      section: document.getElementById(item.dataset.scroll || "")
    }))
    .filter((entry) => entry.section);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pressTimers = new WeakMap();

  const setCurrentItem = (currentItem) => {
    items.forEach((item) => {
      const isCurrent = item === currentItem;
      item.classList.toggle("is-nav-current", isCurrent);
      if (isCurrent) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  };

  items.forEach((item) => {
    item.addEventListener("pointermove", (event) => {
      if (reduceMotion) return;
      const rect = item.getBoundingClientRect();
      item.style.setProperty("--nav-pointer-x", `${event.clientX - rect.left}px`);
      item.style.setProperty("--nav-pointer-y", `${event.clientY - rect.top}px`);
    }, { passive: true });

    item.addEventListener("pointerleave", () => {
      item.style.setProperty("--nav-pointer-x", "50%");
      item.style.setProperty("--nav-pointer-y", "50%");
      item.classList.remove("is-nav-pressed");
    });

    item.addEventListener("pointerdown", () => {
      item.classList.add("is-nav-pressed");
      window.clearTimeout(pressTimers.get(item));
      pressTimers.set(item, window.setTimeout(() => {
        item.classList.remove("is-nav-pressed");
      }, 520));
    });

    item.addEventListener("click", () => {
      if (item.dataset.scroll) setCurrentItem(item);
    });
  });

  if (!sectionItems.length || !("IntersectionObserver" in window)) {
    setCurrentItem(sectionItems[0]?.item || null);
    return;
  }

  const sectionRatios = new Map(sectionItems.map(({ section }) => [section, 0]));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      sectionRatios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
    });

    const current = [...sectionItems]
      .sort((a, b) => (sectionRatios.get(b.section) || 0) - (sectionRatios.get(a.section) || 0))
      .find(({ section }) => (sectionRatios.get(section) || 0) > 0);
    if (current) setCurrentItem(current.item);
  }, {
    threshold: [0, 0.2, 0.45, 0.7],
    rootMargin: "-12% 0px -58% 0px"
  });

  sectionItems.forEach(({ section }) => sectionObserver.observe(section));
}

function initAnimatedHero() {
  const wordSlot = document.querySelector("[data-animated-words]");
  if (!wordSlot) return;

  const words = [...wordSlot.querySelectorAll(".aix-animated-word")];
  if (words.length < 2) return;

  const section = wordSlot.closest(".aix-animated-hero");
  section?.classList.add("is-component-ready");
  section?.setAttribute("data-animated-hero-ready", "true");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = Math.max(0, words.findIndex((word) => word.classList.contains("is-active")));
  let cycleTimer = 0;
  let exitTimer = 0;
  let isVisible = false;
  let hasEntered = false;

  words.forEach((word, index) => {
    word.classList.toggle("is-active", index === activeIndex);
    word.classList.remove("is-exit");
    word.setAttribute("aria-hidden", String(index !== activeIndex));
  });

  const stopCycle = () => {
    if (!cycleTimer) return;
    window.clearInterval(cycleTimer);
    cycleTimer = 0;
    section?.removeAttribute("data-animated-running");
  };

  const advanceWord = () => {
    const previousIndex = activeIndex;
    activeIndex = activeIndex === words.length - 1 ? 0 : activeIndex + 1;

    words.forEach((word, index) => {
      const isActive = index === activeIndex;
      word.classList.toggle("is-active", isActive);
      word.classList.toggle("is-exit", index === previousIndex && !isActive);
      word.setAttribute("aria-hidden", String(!isActive));
    });

    window.clearTimeout(exitTimer);
    exitTimer = window.setTimeout(() => {
      words[previousIndex]?.classList.remove("is-exit");
    }, 650);
  };

  const startCycle = () => {
    if (cycleTimer || prefersReducedMotion || !isVisible || document.hidden) return;
    section?.setAttribute("data-animated-running", "true");
    cycleTimer = window.setInterval(() => {
      advanceWord();
    }, 2200);
  };

  const setVisible = (nextVisible) => {
    isVisible = nextVisible;
    if (isVisible) {
      if (!hasEntered) {
        hasEntered = true;
        activeIndex = 0;
        words.forEach((word, index) => {
          word.classList.toggle("is-active", index === 0);
          word.classList.remove("is-exit");
          word.setAttribute("aria-hidden", String(index !== 0));
        });
      }
      section?.classList.add("is-entered");
      startCycle();
    } else {
      stopCycle();
    }
  };

  if (prefersReducedMotion || !section || !("IntersectionObserver" in window)) {
    setVisible(true);
  } else {
    const observer = new IntersectionObserver((entries) => {
      setVisible(entries.some((entry) => entry.isIntersecting));
    }, {
      threshold: 0.28,
      rootMargin: "0px 0px -8% 0px"
    });
    observer.observe(section);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopCycle();
    } else {
      startCycle();
    }
  });
}

function initFaqAccordion() {
  const accordion = document.querySelector("[data-faq-accordion]");
  if (!accordion) return;

  const items = [...accordion.querySelectorAll(".aix-faq-item")];
  if (!items.length) return;

  accordion.classList.add("is-component-ready");
  accordion.setAttribute("data-faq-runtime-ready", "true");
  revealComponentOnce(accordion, "is-faq-in-view", {
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px"
  });

  const setItemOpen = (item, shouldOpen) => {
    const trigger = item.querySelector(".aix-faq-trigger");
    const answer = item.querySelector(".aix-faq-answer");
    item.classList.toggle("is-open", shouldOpen);
    item.dataset.state = shouldOpen ? "open" : "closed";
    trigger?.setAttribute("aria-expanded", String(shouldOpen));
    trigger?.setAttribute("data-state", shouldOpen ? "open" : "closed");
    answer?.setAttribute("aria-hidden", String(!shouldOpen));
    answer?.setAttribute("data-state", shouldOpen ? "open" : "closed");
  };

  items.forEach((item, index) => {
    setItemOpen(item, item.classList.contains("is-open") || index === 0);
    item.querySelector(".aix-faq-trigger")?.addEventListener("click", () => {
      const shouldOpen = !item.classList.contains("is-open");
      items.forEach((candidate) => setItemOpen(candidate, candidate === item ? shouldOpen : false));
    });
  });
}

function initPricingCard() {
  const card = document.querySelector("[data-pricing-card]");
  if (!card) return;

  const quotes = [...card.querySelectorAll("[data-pricing-quote]")];
  const indicators = [...card.querySelectorAll("[data-pricing-testimonial]")];
  if (!quotes.length) return;

  card.classList.add("is-component-ready");
  card.setAttribute("data-pricing-runtime-ready", "true");
  let activeQuote = Math.max(0, quotes.findIndex((quote) => quote.classList.contains("is-active")));
  let rotationTimer = 0;
  let exitTimer = 0;
  let isInView = false;
  let isPaused = false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setQuote = (nextIndex) => {
    const previousQuote = activeQuote;
    const nextQuote = ((nextIndex % quotes.length) + quotes.length) % quotes.length;
    activeQuote = nextQuote;

    quotes.forEach((quote, index) => {
      const isActive = index === activeQuote;
      quote.classList.toggle("is-active", isActive);
      quote.classList.toggle("is-exiting", index === previousQuote && previousQuote !== activeQuote);
      quote.setAttribute("aria-hidden", String(!isActive));
    });

    window.clearTimeout(exitTimer);
    exitTimer = window.setTimeout(() => {
      quotes.forEach((quote) => quote.classList.remove("is-exiting"));
    }, 440);

    indicators.forEach((button, index) => {
      const isActive = index === activeQuote;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const stopRotation = () => {
    if (!rotationTimer) return;
    window.clearInterval(rotationTimer);
    rotationTimer = 0;
    card.removeAttribute("data-pricing-running");
  };

  const startRotation = () => {
    if (rotationTimer || quotes.length < 2 || reduceMotion || !isInView || isPaused || document.hidden) return;
    card.setAttribute("data-pricing-running", "true");
    rotationTimer = window.setInterval(() => {
      setQuote(activeQuote + 1);
    }, 5000);
  };

  const restartRotation = () => {
    stopRotation();
    startRotation();
  };

  indicators.forEach((button) => {
    button.addEventListener("click", () => {
      setQuote(Number(button.dataset.pricingTestimonial || 0));
      restartRotation();
    });
  });

  setQuote(activeQuote);

  card.addEventListener("pointerenter", () => {
    isPaused = true;
    stopRotation();
  });

  card.addEventListener("pointerleave", () => {
    isPaused = false;
    startRotation();
  });

  card.addEventListener("focusin", () => {
    isPaused = true;
    stopRotation();
  });

  card.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
    isPaused = false;
    startRotation();
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    isInView = true;
    card.classList.add("is-pricing-in-view");
    startRotation();
  } else {
    const observer = new IntersectionObserver((entries) => {
      isInView = entries.some((entry) => entry.isIntersecting);
      if (isInView) {
        card.classList.add("is-pricing-in-view");
        startRotation();
      } else {
        stopRotation();
      }
    }, {
      threshold: 0.3,
      rootMargin: "0px 0px -6% 0px"
    });
    observer.observe(card);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopRotation();
    } else {
      startRotation();
    }
  });
}

let rainbowButtonMutationObserver = null;

function decorateRainbowButton(button) {
  if (!(button instanceof HTMLElement)) return;
  if (button.matches("[disabled], [aria-disabled='true']")) return;
  if (button.matches(".hover-gradient-nav-item, .hover-gradient-nav-primary")) return;
  if (button.closest(".aix-rainbow-shell")) return;

  const shell = document.createElement("span");
  shell.className = "aix-rainbow-shell";
  if (
    button.classList.contains("full") ||
    button.closest(".aix-pricing-actions")
  ) {
    shell.classList.add("is-full");
  }

  button.classList.add("aix-rainbow-button");
  button.parentNode?.insertBefore(shell, button);
  shell.appendChild(button);
}

function initRainbowButtons(root = document) {
  const selector = [
    "button[data-open-signup]:not(.hover-gradient-nav-item):not(.hover-gradient-nav-primary)",
    "button[data-course-signup]",
    "#memberForm .primary-btn[type='submit']"
  ].join(",");

  root.querySelectorAll(selector).forEach(decorateRainbowButton);

  if (!rainbowButtonMutationObserver) {
    rainbowButtonMutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(selector)) decorateRainbowButton(node);
          node.querySelectorAll?.(selector).forEach(decorateRainbowButton);
        });
      });
    });
    rainbowButtonMutationObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function initHeroHighlight() {
  const highlights = document.querySelectorAll("[data-hero-highlight]");
  if (!highlights.length) return;

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  highlights.forEach((highlight) => {
    if (highlight.dataset.heroHighlightReady === "true") return;
    highlight.dataset.heroHighlightReady = "true";
    highlight.classList.add("is-component-ready");
    revealComponentOnce(highlight, "is-highlight-in-view", {
      threshold: 0.2,
      rootMargin: "0px 0px -8% 0px"
    });

    let frame = 0;
    let nextX = 50;
    let nextY = 50;

    const syncPointer = () => {
      frame = 0;
      highlight.style.setProperty("--highlight-x", `${nextX}px`);
      highlight.style.setProperty("--highlight-y", `${nextY}px`);
    };

    highlight.addEventListener("pointermove", (event) => {
      if (reduceMotionQuery.matches) return;
      const rect = highlight.getBoundingClientRect();
      nextX = event.clientX - rect.left;
      nextY = event.clientY - rect.top;
      highlight.classList.add("is-highlight-active");

      if (!frame) {
        frame = window.requestAnimationFrame(syncPointer);
      }
    }, { passive: true });

    highlight.addEventListener("pointerleave", () => {
      highlight.classList.remove("is-highlight-active");
    });
  });
}

function initBentoGrid() {
  const grid = document.querySelector(".aix-bento-grid");
  if (!grid || grid.dataset.bentoRuntimeReady === "true") return;

  grid.dataset.bentoRuntimeReady = "true";
  grid.classList.add("is-component-ready");
  revealComponentOnce(grid, "is-bento-in-view", {
    threshold: 0.12,
    rootMargin: "0px 0px -6% 0px"
  });

  const cards = [...grid.querySelectorAll(".aix-bento-card")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  cards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      if (reduceMotion) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--bento-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--bento-y", `${event.clientY - rect.top}px`);
    }, { passive: true });

    card.addEventListener("pointerenter", () => {
      card.classList.add("is-bento-active");
    });

    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-bento-active");
      card.style.setProperty("--bento-x", "50%");
      card.style.setProperty("--bento-y", "50%");
    });

    card.addEventListener("focusin", () => {
      card.classList.add("is-bento-active");
    });

    card.addEventListener("focusout", (event) => {
      if (event.relatedTarget instanceof Node && card.contains(event.relatedTarget)) return;
      card.classList.remove("is-bento-active");
    });
  });
}

function initWorkproofCompare() {
  document.querySelectorAll("[data-workproof-compare]").forEach((compare) => {
    if (compare.dataset.workproofReady === "true") return;

    const stage = compare.querySelector(".aix-workproof-stage");
    const handle = compare.querySelector("[data-workproof-handle]");
    if (!stage || !handle) return;

    compare.dataset.workproofReady = "true";
    compare.classList.add("is-component-ready");
    revealComponentOnce(compare, "is-workproof-in-view", {
      threshold: 0.16,
      rootMargin: "0px 0px -6% 0px"
    });
    let isDragging = false;
    let inset = Number.parseFloat(handle.getAttribute("aria-valuenow") || "50");

    const setInset = (nextInset) => {
      inset = Math.min(94, Math.max(6, nextInset));
      compare.style.setProperty("--aix-compare-inset", `${inset}%`);
      handle.setAttribute("aria-valuenow", String(Math.round(inset)));
      handle.setAttribute("aria-valuetext", `แสดงผลลัพธ์หลังใช้ AI ${Math.round(100 - inset)} เปอร์เซ็นต์`);
    };

    const updateFromClientX = (clientX) => {
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      setInset(((clientX - rect.left) / rect.width) * 100);
    };

    stage.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") event.preventDefault();
      isDragging = true;
      compare.classList.add("is-dragging");
      stage.setPointerCapture?.(event.pointerId);
      updateFromClientX(event.clientX);
    });

    stage.addEventListener("pointermove", (event) => {
      if (!isDragging && event.pointerType !== "mouse") return;
      updateFromClientX(event.clientX);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      stage.addEventListener(eventName, (event) => {
        if (!isDragging) return;
        isDragging = false;
        compare.classList.remove("is-dragging");
        if (stage.hasPointerCapture?.(event.pointerId)) {
          stage.releasePointerCapture(event.pointerId);
        }
      });
    });

    handle.addEventListener("keydown", (event) => {
      const keyStep = event.shiftKey ? 10 : 5;
      if (["ArrowLeft", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        setInset(inset - keyStep);
      } else if (["ArrowRight", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setInset(inset + keyStep);
      } else if (event.key === "Home") {
        event.preventDefault();
        setInset(6);
      } else if (event.key === "End") {
        event.preventDefault();
        setInset(94);
      }
    });

    setInset(inset);
  });
}

function getModalPanel(modal) {
  return modal?.querySelector(".modal-panel");
}

function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll([
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(","))].filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.hidden || element.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  });
}

function focusElement(element) {
  if (!(element instanceof HTMLElement)) return;
  try {
    element.focus({ preventScroll: true });
  } catch (error) {
    element.focus();
  }
}

function captureFocusTrigger(modal) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && !modal?.contains(active)) return active;
  return null;
}

function restoreFocus(trigger) {
  if (trigger instanceof HTMLElement && document.contains(trigger)) {
    focusElement(trigger);
  }
}

function trapModalFocus(modal, event) {
  if (!modal?.classList.contains("open")) return false;
  const panel = getModalPanel(modal);
  const focusable = getFocusableElements(panel);
  if (!focusable.length) {
    event.preventDefault();
    focusElement(panel);
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    focusElement(last);
    return true;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    focusElement(first);
    return true;
  }
  return false;
}

function openAuthModal(mode = "signup") {
  lastAuthTrigger = captureFocusTrigger(authModal) || lastAuthTrigger;
  authModal?.classList.add("open");
  authModal?.setAttribute("aria-hidden", "false");
  setAuthTab(mode);
}

function closeAuthModal() {
  const wasOpen = authModal?.classList.contains("open");
  authModal?.classList.remove("open");
  authModal?.setAttribute("aria-hidden", "true");
  if (wasOpen) restoreFocus(lastAuthTrigger);
}

function setAuthTab(mode) {
  state.activeAuthTab = mode;
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === mode);
  });
  document.getElementById("signupPane")?.classList.toggle("active", mode === "signup");
  document.getElementById("loginPane")?.classList.toggle("active", mode === "login");
  document.querySelectorAll("[data-auth-head]").forEach((head) => {
    const isActive = head.dataset.authHead === mode;
    head.hidden = !isActive;
    head.classList.toggle("active", isActive);
  });
  const authShell = authModal?.querySelector(".auth-card-shell");
  authShell?.classList.toggle("auth-register-pop", mode === "signup");
  authShell?.setAttribute("aria-labelledby", mode === "signup" ? "signupModalTitle" : "loginModalTitle");
  if (authShell) {
    authShell.scrollTop = 0;
  }
  if (authModal) {
    authModal.scrollTop = 0;
  }

  const form = mode === "signup" ? memberForm : loginForm;
  window.setTimeout(() => {
    renderGoogleAuthButtons();
    initRainbowButtons(authModal || document);
    const focusTarget = mode === "login" ? form?.querySelector("[name='email']") : authShell;
    focusElement(focusTarget);
    if (authShell) {
      authShell.scrollTop = 0;
    }
    if (authModal) {
      authModal.scrollTop = 0;
    }
  }, 80);
}

function prefillSignupFromGoogle(profile) {
  if (!profile || !memberForm) return;
  state.googleProfile = profile;
  memberForm.elements.email.value = profile.email || "";
  memberForm.elements.firstName.value = profile.given_name || profile.name?.split(" ")[0] || "";
  memberForm.elements.email.readOnly = Boolean(profile.email);
  document.getElementById("googleSignupStatus").textContent = "เชื่อมต่อ Google แล้ว กรอกเบอร์โทรเพื่อสร้างบัญชีต่อ";
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
    memberApi.adopt(result);

    if (result.member) {
      setMember(result.member);
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

async function handleGoogleAccessToken(response) {
  if (response?.error) {
    showToast(response.error_description || response.error || "ไม่สามารถเข้าสู่ระบบด้วย Google ได้");
    return;
  }

  const accessToken = response?.access_token;
  if (!accessToken) {
    showToast("ไม่พบข้อมูลยืนยันจาก Google");
    return;
  }

  const mode = state.googleMode || state.activeAuthTab;

  try {
    const result = await apiRequest("/api/auth/google-access-token", {
      method: "POST",
      body: JSON.stringify({ accessToken, mode })
    });
    memberApi.adopt(result);

    if (result.member) {
      setMember(result.member);
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

function googleButtonWidth(target) {
  const boxWidth = target?.closest(".google-box")?.getBoundingClientRect().width || 0;
  const targetWidth = target?.getBoundingClientRect().width || 0;
  const availableWidth = targetWidth || Math.max(0, boxWidth - 24);
  if (!availableWidth) return 320;
  return Math.min(400, Math.max(220, Math.floor(availableWidth)));
}

function waitForGoogleClient(timeoutMs = 8000) {
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 150);
  });
}

async function ensureGoogleAuthClient() {
  if (!state.googleClientId) return false;
  if (state.googleTokenClient) return true;

  const ready = await waitForGoogleClient();
  if (!ready || !window.google?.accounts?.oauth2) return false;

  if (!state.googleIdentityInitialized && window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: state.googleClientId,
      callback: handleGoogleCredential,
      auto_select: false
    });
    state.googleIdentityInitialized = true;
  }

  state.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: state.googleClientId,
    scope: "openid email profile",
    callback: handleGoogleAccessToken
  });

  return true;
}

function renderGoogleButton(target, options) {
  if (!target || !state.googleInitialized) return;
  target.innerHTML = "";
  target.classList.add("aix-google-auth-mounted");
  const mode = options.mode || "login";
  const button = document.createElement("button");
  button.className = "aix-google-auth-button";
  button.type = "button";
  button.setAttribute("aria-label", mode === "signup" ? "สมัครสมาชิกด้วย Google" : "เข้าสู่ระบบด้วย Google");
  button.innerHTML = `
    <span class="aix-google-auth-icon" aria-hidden="true"></span>
    <span>Continue with Google</span>
  `;
  button.addEventListener("click", async () => {
    button.disabled = true;
    state.googleMode = mode;
    const ready = await ensureGoogleAuthClient();
    button.disabled = false;
    if (!ready || !state.googleTokenClient) {
      showToast("Google Login ยังโหลดไม่เสร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }
    state.googleTokenClient.requestAccessToken({ prompt: "select_account" });
  });
  target.append(button);
}

function renderGoogleAuthButtons() {
  renderGoogleButton(document.getElementById("googleSignupButton"), {
    mode: "signup"
  });
  renderGoogleButton(document.getElementById("googleLoginButton"), {
    mode: "login"
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

  state.googleClientId = config.googleClientId;
  state.googleInitialized = true;
  renderGoogleAuthButtons();
  ensureGoogleAuthClient();
}

document.querySelectorAll("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => scrollToId(button.dataset.scroll));
});

document.querySelectorAll("[data-open-signup]").forEach((button) => {
  button.addEventListener("click", (event) => {
    if (button.dataset.authLogout === "true") {
      event.preventDefault();
      logoutMember();
      return;
    }
    openAuthModal("signup");
  });
});

document.querySelectorAll("[data-open-login]").forEach((button) => {
  button.addEventListener("click", () => openAuthModal("login"));
});

document.querySelectorAll("[data-auth-tab]").forEach((button) => {
  button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
});

mobileMenu?.addEventListener("click", () => {
  const isOpen = mobilePanel?.classList.toggle("open") || false;
  mobileMenu.setAttribute("aria-expanded", String(isOpen));
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
  const filters = [
    { value: "ทั้งหมด", label: "ทั้งหมด" },
    { value: "Live", label: "คลาสสด" },
    { value: "Coming Soon", label: "เร็ว ๆ นี้" },
    { value: "Agent", label: "ผู้ช่วย AI" },
    { value: "Automation", label: "ลดงานซ้ำ" },
    { value: "Creative", label: "คอนเทนต์" },
    { value: "Coding", label: "สร้างเว็บ" },
    { value: "Prompt", label: "ชุดคำสั่ง" },
    { value: "Business", label: "ธุรกิจ" }
  ];
  classFilters.innerHTML = filters.map((filter) => (
    `<button class="filter-tab ${filter.value === state.activeFilter ? "active" : ""}" type="button" data-filter="${filter.value}" aria-pressed="${filter.value === state.activeFilter}" aria-controls="classesGrid">${filter.label}</button>`
  )).join("");

  classFilters.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeFilter = button.dataset.filter;
      renderClassFilters();
      renderCourses();
    });
  });
}

const filterAliases = {
  Agent: ["agent", "ai agent"],
  Automation: ["automation", "workflow"],
  Creative: ["creative", "content", "video", "graphic", "image"],
  Coding: ["coding", "prototype", "vibe coding", "developer"],
  Prompt: ["prompt", "prompt engineering", "prompt chain"]
};

function courseSearchText(course) {
  return [
    course.title,
    course.type,
    course.level,
    course.instructor,
    course.description,
    ...(Array.isArray(course.skills) ? course.skills : []),
    ...(Array.isArray(course.topics) ? course.topics : [])
  ].join(" ").toLowerCase();
}

function matchesFilter(course) {
  if (state.activeFilter === "ทั้งหมด") return true;
  const aliases = filterAliases[state.activeFilter] || [state.activeFilter];
  const text = courseSearchText(course);
  return aliases.some((alias) => text.includes(alias.toLowerCase()));
}

function matchesSearch(course) {
  const search = state.search.trim().toLowerCase();
  if (!search) return true;
  return courseSearchText(course).includes(search);
}

function courseCta(course) {
  if (!state.member) {
    return AiXDom.link({
      href: AiXDom.safeUrl(`class-detail.html?id=${encodeURIComponent(course.id)}`),
      className: "secondary-btn"
    }, ["ดูหัวข้อนี้"]);
  }
  if (state.member.paymentStatus === "paid") {
    return AiXDom.link({
      href: AiXDom.safeUrl(`/course/${encodeURIComponent(course.id)}/start`),
      className: "primary-btn full"
    }, ["เริ่มเรียน"]);
  }
  return AiXDom.link({ href: AiXDom.safeUrl("/payment"), className: "primary-btn full" }, ["เปิดสิทธิ์สมาชิก"]);
}

function courseVisualIcon(course) {
  const iconMap = {
    Agent: "fa-robot",
    Automation: "fa-gears",
    Creative: "fa-pen-nib",
    Coding: "fa-code",
    Prompt: "fa-brain"
  };
  return Object.hasOwn(iconMap, course.level) ? iconMap[course.level] : "fa-graduation-cap";
}

function courseTopicIcons(course) {
  const iconsById = {
    "manus-ai": ["fa-wand-magic-sparkles", "fa-diagram-project"],
    "claude-manus-vibe-coding": ["fa-code-branch", "fa-laptop-code"],
    "claude-deep-dive": ["fa-magnifying-glass", "fa-file-lines"],
    "ai-video-graphic": ["fa-clapperboard", "fa-pen-nib"],
    "ai-agent-business": ["fa-gears", "fa-headset"]
  };
  const iconsByLevel = {
    Agent: ["fa-wand-magic-sparkles", "fa-diagram-project"],
    Automation: ["fa-arrows-rotate", "fa-route"],
    Creative: ["fa-image", "fa-video"],
    Coding: ["fa-code-branch", "fa-terminal"],
    Prompt: ["fa-comments", "fa-file-lines"]
  };
  if (Object.hasOwn(iconsById, course.id)) return iconsById[course.id];
  if (Object.hasOwn(iconsByLevel, course.level)) return iconsByLevel[course.level];
  return ["fa-layer-group", "fa-arrow-trend-up"];
}

function courseTopicLogo(course) {
  const logosById = {
    "manus-ai": { src: "assets/ai-logos/manus.webp", label: "Manus", tone: "manus" },
    "claude-manus-vibe-coding": { src: "assets/ai-logos/codex.svg", label: "Codex", tone: "codex" },
    "claude-deep-dive": { src: "assets/ai-logos/claude.svg", label: "Claude", tone: "claude" },
    "ai-video-graphic": { src: "assets/ai-logos/higgsfield.png", label: "Higgsfield", tone: "higgsfield" },
    "ai-agent-business": { src: "assets/ai-logos/chatgpt.svg", label: "ChatGPT", tone: "chatgpt" }
  };
  return Object.hasOwn(logosById, course.id) ? logosById[course.id] : null;
}

function courseTopicVisuals(course) {
  const icons = courseTopicIcons(course);
  const logo = courseTopicLogo(course);
  return [
    { type: "icon", value: icons[0] },
    logo
      ? { type: "logo", value: logo.src, label: logo.label, tone: logo.tone }
      : { type: "icon", value: "fa-robot" },
    { type: "icon", value: icons[1] }
  ];
}

const courseToneByLevel = Object.freeze({
  Agent: "agent",
  Automation: "automation",
  Creative: "creative",
  Coding: "coding",
  Prompt: "prompt",
  Workshop: "workshop",
  Course: "course"
});

function courseVisualTone(course) {
  if (Object.hasOwn(courseToneByLevel, course.level)) return courseToneByLevel[course.level];
  return Object.hasOwn(courseToneByLevel, course.type) ? courseToneByLevel[course.type] : "ai";
}

function courseTopicBadge(course) {
  const labelsById = {
    "manus-ai": "Manus AI",
    "claude-manus-vibe-coding": "Vibe Coding",
    "claude-deep-dive": "Claude",
    "ai-video-graphic": "AI Video",
    "ai-agent-business": "AI Agent"
  };
  return (Object.hasOwn(labelsById, course.id) ? labelsById[course.id] : null)
    || course.skills?.[0]
    || course.level
    || course.type
    || "AI";
}

function renderCourses() {
  const filtered = courses.filter((course) => matchesFilter(course) && matchesSearch(course));
  const cards = filtered.map((course) => {
    const topicTone = courseTopicLogo(course)?.tone || courseVisualTone(course);
    const positions = ["left", "center", "right"];
    const visuals = courseTopicVisuals(course).map((visual, index) => {
      const position = positions[index] || "center";
      const visualClass = visual.type === "logo"
        ? `aix-topic-icon aix-topic-logo aix-topic-logo-${visual.tone} aix-topic-icon-${position}`
        : `aix-topic-icon aix-topic-icon-${position}`;
      const content = visual.type === "logo"
        ? AiXDom.node("img", {
            attrs: { alt: "", loading: "eager", decoding: "async", "data-topic-logo": visual.label },
            urls: { src: { value: visual.value, options: { allowedProtocols: ["http:", "https:"] } } }
          })
        : AiXDom.node("i", { className: `fa-solid ${visual.value}` });
      return AiXDom.node("span", { className: visualClass }, [content]);
    });
    const skills = Array.isArray(course.skills) ? course.skills.slice(0, 2) : [];
    const detailAction = state.member
      ? AiXDom.link({ href: AiXDom.safeUrl(`class-detail.html?id=${encodeURIComponent(course.id)}`), className: "secondary-btn" }, ["ข้อมูลเพิ่มเติม"])
      : null;

    return AiXDom.node("article", { className: `course-card aix-topic-card aix-topic-tone-${topicTone}` }, [
      AiXDom.node("div", { className: "aix-topic-icons", attrs: { "aria-hidden": "true" } }, visuals),
      AiXDom.node("div", { className: "course-body aix-topic-body" }, [
        AiXDom.node("span", { className: "course-badge aix-topic-badge", text: courseTopicBadge(course) }),
        AiXDom.node("h3", { text: course.title }),
        AiXDom.node("p", { text: homepageCourseDescription(course) }),
        AiXDom.node("div", { className: "skill-row aix-topic-skills" }, skills.map((skill) => AiXDom.node("span", { text: skill }))),
        AiXDom.node("div", { className: "course-meta aix-topic-meta" }, [
          AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-regular fa-clock" }), course.duration]),
          AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-list-check" }), course.lessons])
        ]),
        AiXDom.node("div", { className: "course-actions aix-topic-actions" }, [courseCta(course), detailAction])
      ])
    ]);
  });
  AiXDom.replace(classesGrid, cards.length ? cards : [
    AiXDom.node("div", { className: "resource-card catalog-empty-state" }, [
      AiXDom.node("h3", { text: "ยังไม่พบหัวข้อที่ตรงกัน" }),
      AiXDom.node("p", { text: "ลองค้นจากชื่องาน เครื่องมือ หรือเลือกหมวดอื่น" })
    ])
  ]);

  refreshPageEffects();
}

function publicResourceIcon(icon) {
  const map = Object.freeze({
    "fa-arrows-rotate": "fa-arrows-rotate",
    "fa-route": "fa-route",
    "fa-folder-open": "fa-folder-open",
    "fa-circle-play": "fa-circle-play"
  });
  return Object.hasOwn(map, icon) ? map[icon] : "fa-folder-open";
}

function renderResources() {
  AiXDom.replace(resourceList, resources.map((resource) => AiXDom.node("article", { className: "resource-card" }, [
    AiXDom.node("i", { className: `fa-solid ${publicResourceIcon(resource.icon)}` }),
    AiXDom.node("span", { className: "provider", text: resource.category }),
    AiXDom.node("h3", { text: resource.title }),
    AiXDom.node("p", { text: resource.description })
  ])));
}

function openClassModal(id) {
  const course = courses.find((item) => item.id === id);
  if (!course) return;
  lastClassTrigger = captureFocusTrigger(classModal) || lastClassTrigger;
  const price = Number(course.price);
  const meta = [
    ["fa-regular fa-user", course.instructor],
    ["fa-regular fa-clock", course.duration],
    ["fa-solid fa-star", course.rating],
    ["fa-solid fa-tag", Number.isFinite(price) && price > 0 ? `฿${price.toLocaleString("th-TH")}` : "รวมในสมาชิก"]
  ];
  const signupButton = AiXDom.node("button", {
    className: "primary-btn",
    text: "เข้าร่วม AiX Club",
    attrs: { type: "button", "data-course-signup": "" }
  });
  const closeButton = AiXDom.node("button", { className: "secondary-btn", text: "ปิด", attrs: { type: "button" } });
  signupButton.addEventListener("click", () => {
    state.currentCourseId = course.id;
    closeClassModal();
    openAuthModal("signup");
  });
  closeButton.addEventListener("click", closeClassModal);
  const modalTitle = AiXDom.node("h2", { text: course.title });
  modalTitle.id = "classModalTitle";
  AiXDom.replace(classModalContent, [AiXDom.node("div", { className: "modal-content" }, [
    AiXDom.node("span", { className: "provider", text: "AiX Club" }),
    modalTitle,
    AiXDom.node("p", { text: course.description }),
    AiXDom.node("div", { className: "course-meta" }, meta.map(([icon, label]) => (
      AiXDom.node("span", {}, [AiXDom.node("i", { className: icon }), label])
    ))),
    AiXDom.node("h3", { text: "สิ่งที่คุณจะทำได้" }),
    AiXDom.node("div", { className: "modal-topics" }, (Array.isArray(course.topics) ? course.topics : []).map((topic) => (
      AiXDom.node("div", { text: topic })
    ))),
    AiXDom.node("div", { className: "hero-actions" }, [signupButton, closeButton])
  ])]);
  classModal.classList.add("open");
  classModal.setAttribute("aria-hidden", "false");
  focusElement(getModalPanel(classModal));
  initRainbowButtons(classModal);
}

function closeClassModal() {
  const wasOpen = classModal.classList.contains("open");
  classModal.classList.remove("open");
  classModal.setAttribute("aria-hidden", "true");
  if (wasOpen) restoreFocus(lastClassTrigger);
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
  if (event.key === "Tab") {
    if (trapModalFocus(authModal, event) || trapModalFocus(classModal, event)) return;
  }
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
  const firstName = normalizeText(formData.get("firstName"));
  const payload = {
    firstName,
    lastName: "",
    displayName: firstName,
    email: normalizeEmail(formData.get("email")),
    phone: normalizePhone(formData.get("phone")),
    password: normalizeText(formData.get("password")),
    passwordConfirm: normalizeText(formData.get("passwordConfirm")),
    lineId: "",
    business: "",
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
      setMember(result.member);
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

document.addEventListener("click", (event) => {
  const mobileAccountLink = event.target.closest(".luma-mobile-item[data-luma-section='account']");
  if (!mobileAccountLink || !state.member) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  logoutMember();
}, true);

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

  setMember(result.member);
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

function initAuthRouteModal() {
  const params = new URLSearchParams(window.location.search);
  const authMode = params.get("auth");
  if (!authMode) return;

  if (["signup", "register"].includes(authMode)) {
    openAuthModal("signup");
  } else if (authMode === "login") {
    openAuthModal("login");
  } else {
    return;
  }

  params.delete("auth");
  const query = params.toString();
  const cleanPath = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState(null, "", cleanPath);
}

function updateScrollProgress() {
  pageEffects.progressRaf = 0;
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
  document.documentElement.style.setProperty("--aix-scroll-progress", progress.toFixed(4));
}

function requestScrollProgressUpdate() {
  if (pageEffects.progressRaf) return;
  pageEffects.progressRaf = window.requestAnimationFrame(updateScrollProgress);
}

function ensureScrollProgress() {
  if (document.querySelector(".aix-scroll-progress")) return;
  const progress = document.createElement("div");
  progress.className = "aix-scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.prepend(progress);
}

function decoratePageEffects() {
  document.querySelectorAll(".aix-homepage-redesign section").forEach((section) => {
    section.classList.add("aix-section-ambient");
  });
}

function initPageEffects() {
  if (pageEffects.initialized) return;
  pageEffects.initialized = true;
  ensureScrollProgress();

  decoratePageEffects();

  updateScrollProgress();
  window.addEventListener("scroll", requestScrollProgressUpdate, { passive: true });
  window.addEventListener("resize", requestScrollProgressUpdate, { passive: true });
}

function refreshPageEffects() {
  if (!pageEffects.initialized) return;
  decoratePageEffects();
}

renderClassFilters();
renderCourses();
loadCoursesFromDatabase();
renderResources();
restoreSession();
initGoogleLogin();
initThemeToggle();
initHoverGradientNav();
initBentoGrid();
initAnimatedHero();
initFaqAccordion();
initPricingCard();
initRainbowButtons();
initHeroHighlight();
initWorkproofCompare();
initPageEffects();
initAuthRouteModal();
initFromHash();
syncHomepageAuthActions();
