const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";

const courseGateIntro = document.getElementById("courseGateIntro");
const courseGateForm = document.getElementById("courseGateForm");
const commitmentCheck = document.getElementById("commitmentCheck");
const startCourseBtn = document.getElementById("startCourseBtn");
const closeGateLink = document.getElementById("closeGateLink");
const toast = document.getElementById("toast");

let courseId = "";
let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function getCourseId() {
  const pathMatch = window.location.pathname.match(/\/course\/([^/]+)\/start/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : new URLSearchParams(window.location.search).get("id");
}

function courseContentUrl(id) {
  return `/course/${encodeURIComponent(id)}/content?ready=1`;
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: token() ? { Authorization: `Bearer ${token()}` } : {}
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error || "ไม่สามารถเข้าเรียนได้");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function initCourseGate() {
  courseId = getCourseId();
  if (!token()) {
    window.location.replace("/index.html?auth=login");
    return;
  }

  try {
    const data = await apiRequest(`/api/courses/${encodeURIComponent(courseId)}/content`);
    const title = data.course?.title || "คอร์ส AiX Club";
    document.title = `ความมุ่งมั่นของฉัน | ${title}`;
    courseGateIntro.textContent = `ฉันกำลังเริ่มต้นการเรียนรู้ใน ${title}`;
    closeGateLink.href = "/dashboard#courses";
    document.body.classList.add("course-gate-ready");
  } catch (error) {
    window.location.replace(error.status === 402 ? "/payment" : "/index.html?auth=login");
  }
}

commitmentCheck?.addEventListener("change", () => {
  startCourseBtn.disabled = !commitmentCheck.checked;
});

courseGateForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!commitmentCheck.checked) {
    showToast("กรุณายืนยันความมุ่งมั่นก่อนเริ่มหลักสูตร");
    return;
  }
  localStorage.setItem(`aix_course_commitment_${courseId}`, new Date().toISOString());
  window.location.href = courseContentUrl(courseId);
});

initCourseGate();
