const memberApi = window.AiXApi.createClient({ sessionPath: "/api/auth/me" });
const apiRequest = (path, options = {}) => memberApi.request(path, options);

let memberSessionPromise = null;

function bootstrapMemberSession() {
  if (!memberSessionPromise) {
    memberSessionPromise = memberApi.bootstrap().catch((error) => {
      memberSessionPromise = null;
      throw error;
    });
  }
  return memberSessionPromise;
}

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

async function initCourseGate() {
  courseId = getCourseId();

  try {
    await bootstrapMemberSession();
    const data = await apiRequest(`/api/courses/${encodeURIComponent(courseId)}/content`);
    const title = data.course?.title || "คอร์ส AiX Club";
    document.title = `ความมุ่งมั่นของฉัน | ${title}`;
    courseGateIntro.textContent = `ฉันกำลังเริ่มต้นการเรียนรู้ใน ${title}`;
    closeGateLink.href = "/dashboard#courses";
    document.body.classList.add("course-gate-ready");
  } catch (error) {
    if (error.status === 401) {
      memberApi.clear();
      window.location.replace("/index.html?auth=login");
      return;
    }
    if (error.status === 402) {
      window.location.replace("/payment");
      return;
    }
    showToast(error.message || "ไม่สามารถเปิดคอร์สได้");
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
