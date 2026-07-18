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

const classroomNavLinks = Array.from(document.querySelectorAll("[data-classroom-nav]"));
const classroomMobileMenu = document.getElementById("classroomMobileMenu");
const classroomMobilePanel = document.getElementById("classroomMobilePanel");

function getCourseId() {
  const pathMatch = window.location.pathname.match(/\/course\/([^/]+)\/content/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : new URLSearchParams(window.location.search).get("id");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function assetUrl(value = "") {
  if (!value) return "/assets/generated/hero-space-learning.jpg";
  if (/^https?:\/\//.test(value) || value.startsWith("/")) return value;
  return `/${value}`;
}

function resourceIcon(type = "") {
  const map = {
    tool: "fa-solid fa-screwdriver-wrench",
    skill: "fa-solid fa-brain",
    template: "fa-solid fa-file-lines",
    file: "fa-solid fa-download",
    link: "fa-solid fa-arrow-up-right-from-square"
  };
  return map[type] || "fa-solid fa-toolbox";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function playableVideo(url = "") {
  return url.startsWith("/uploads/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function courseStartUrl(courseId) {
  return `/course/${encodeURIComponent(courseId)}/start`;
}

function courseLearnUrl(courseId, moduleIndex = 0) {
  return `/course/${encodeURIComponent(courseId)}/learn?module=${moduleIndex}&ready=1`;
}

function learningEntryUrl(href, courseId) {
  const value = String(href || "");
  const match = value.match(/^\/course\/([^/?#]+)\/content(?:[?#].*)?$/);
  if (match) return courseStartUrl(decodeURIComponent(match[1]));
  return value || courseStartUrl(courseId);
}

function renderContent(data) {
  const { course, modules, resources = [], schedule = [] } = data;
  document.title = `${course.title} | AiX Classroom`;
  document.getElementById("courseTitle").textContent = course.title;
  document.getElementById("classroomNavTitle").textContent = course.title;
  document.getElementById("courseSubtitle").textContent = course.overview || course.description || "";
  document.getElementById("courseImage").src = assetUrl(course.image);
  document.getElementById("courseStats").innerHTML = [
    ["fa-regular fa-clock", course.duration],
    ["fa-solid fa-list-check", course.lessons],
    ["fa-solid fa-signal", course.level]
  ].map(([icon, text]) => `<span><i class="${icon}"></i>${escapeHtml(text || "-")}</span>`).join("");

  document.getElementById("courseOverviewText").textContent = course.overview || course.description || "";
  document.getElementById("courseSkillChips").innerHTML = (course.skills || []).map((skill) => `<span>${escapeHtml(skill)}</span>`).join("");
  document.getElementById("courseOutcomes").innerHTML = (course.outcomes || []).slice(0, 6).map((outcome) => `
    <div><i class="fa-solid fa-check"></i><span>${escapeHtml(outcome)}</span></div>
  `).join("") || `<p>รายละเอียดผลลัพธ์การเรียนจะแสดงเมื่อมีข้อมูลในคอร์ส</p>`;
  document.getElementById("heroStartLearning").href = courseLearnUrl(course.id, 0);

  document.getElementById("classResources").innerHTML = resources.length
    ? resources.map((resource) => {
        const href = resource.url || resource.filePath || "#";
        const external = /^https?:\/\//.test(href);
        return `
          <a class="member-resource-card" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""}>
            <span><i class="${resourceIcon(resource.type)}"></i></span>
            <strong>${escapeHtml(resource.title)}</strong>
            <small>${escapeHtml(resource.description || (resource.tags || []).join(", ") || "Resource สำหรับคลาสนี้")}</small>
          </a>
        `;
      }).join("")
    : `<article class="resource-card"><h3>ยังไม่มี Resource</h3><p>Admin สามารถเพิ่ม Tools, Skill Set หรือ Template จากหน้า Admin</p></article>`;

  document.getElementById("classSchedule").innerHTML = schedule.length
    ? schedule.map((item) => `
        <article class="member-schedule-card">
          <span><i class="fa-regular fa-calendar-check"></i>${formatDateTime(item.startsAt)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || item.courseTitle || "AiX Live Class")}</p>
          <a class="secondary-btn" href="${escapeHtml(learningEntryUrl(item.meetingUrl, item.courseId))}">เข้าห้องเรียน</a>
        </article>
      `).join("")
    : `<article class="resource-card"><h3>ยังไม่มีตารางเรียน</h3><p>ตารางสอนใหม่จะแสดงที่นี่เมื่อ Admin เพิ่มในระบบ</p></article>`;

  document.getElementById("moduleList").innerHTML = modules.map((module, index) => `
    <article class="syllabus-item">
      <div class="syllabus-number">${index + 1}</div>
      <div>
        <span>${escapeHtml(module.time || "บทเรียน")}</span>
        <h3>${escapeHtml(module.title)}</h3>
        <ul>${(module.lessons || []).map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}</ul>
        <a class="primary-btn compact learn-now-btn" href="${courseLearnUrl(course.id, index)}">เริ่มเรียนเลย</a>
      </div>
    </article>
  `).join("");
  document.body.classList.add("classroom-ready");
}

function setActiveClassroomNav(id) {
  classroomNavLinks.forEach((link) => {
    const linkId = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", linkId === id);
  });
}

function setupClassroomNav() {
  if (!classroomNavLinks.length) return;

  classroomNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.replace("#", "");
      if (id) setActiveClassroomNav(id);
      classroomMobilePanel?.classList.remove("open");
    });
  });

  const sections = [...new Set(classroomNavLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean))];

  if (!("IntersectionObserver" in window) || !sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) setActiveClassroomNav(visible.target.id);
  }, {
    rootMargin: "-24% 0px -58% 0px",
    threshold: [0.12, 0.35, 0.65]
  });

  sections.forEach((section) => observer.observe(section));
}

async function initContent() {
  const id = getCourseId();
  try {
    await bootstrapMemberSession();
    const data = await apiRequest(`/api/courses/${encodeURIComponent(id)}/content`);
    renderContent(data);
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
    document.getElementById("courseTitle").textContent = error.message || "ไม่สามารถเปิดคอร์สได้";
    document.body.classList.add("classroom-ready");
  }
}

classroomMobileMenu?.addEventListener("click", () => {
  classroomMobilePanel?.classList.toggle("open");
});

setupClassroomNav();
initContent();
