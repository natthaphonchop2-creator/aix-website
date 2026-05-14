const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";

function getCourseId() {
  const pathMatch = window.location.pathname.match(/\/course\/([^/]+)\/content/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : new URLSearchParams(window.location.search).get("id");
}

async function apiRequest(path) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const err = new Error(error.error || "ไม่สามารถเข้าเรียนได้");
    err.status = response.status;
    throw err;
  }
  return response.json();
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

function renderReplayPlayer(replay) {
  const player = document.getElementById("replayPlayer");
  if (!replay) {
    player.innerHTML = `
      <div class="empty-video-state">
        <i class="fa-regular fa-circle-play"></i>
        <strong>ยังไม่มีคลิปย้อนหลัง</strong>
        <span>เมื่อ Admin อัปโหลดคลิป รายการจะเล่นจากพื้นที่นี้</span>
      </div>
    `;
    return;
  }

  const url = replay.videoUrl || replay.filePath || "";
  player.innerHTML = playableVideo(url)
    ? `<video controls preload="metadata" src="${escapeHtml(url)}"></video><h3>${escapeHtml(replay.title)}</h3><p>${escapeHtml(replay.description || "")}</p>`
    : `<div class="empty-video-state"><i class="fa-solid fa-arrow-up-right-from-square"></i><strong>${escapeHtml(replay.title)}</strong><span>${escapeHtml(replay.description || "เปิดวิดีโอจากลิงก์ภายนอก")}</span><a class="primary-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener">เปิดวิดีโอ</a></div>`;
}

function selectReplay(id) {
  const replay = (window.__courseReplays || []).find((item) => item.id === id);
  renderReplayPlayer(replay);
  document.querySelectorAll(".classroom-replay-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.replayId === id);
  });
}

function renderContent(data) {
  const { course, modules, replays = [], resources = [], schedule = [] } = data;
  document.title = `${course.title} | AiX Classroom`;
  document.getElementById("courseTitle").textContent = course.title;
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

  window.__courseReplays = replays;
  renderReplayPlayer(replays[0]);
  document.getElementById("replayList").innerHTML = replays.length
    ? replays.map((replay, index) => `
        <button type="button" class="classroom-replay-card ${index === 0 ? "active" : ""}" data-replay-id="${escapeHtml(replay.id)}" onclick="selectReplay('${escapeHtml(replay.id)}')">
          <i class="fa-regular fa-circle-play"></i>
          <span>
            <strong>${escapeHtml(replay.title)}</strong>
            <small>${escapeHtml(replay.durationText || replay.duration || "คลิปย้อนหลัง")}</small>
          </span>
        </button>
      `).join("")
    : `<article class="resource-card"><h3>ยังไม่มีคลิปย้อนหลัง</h3><p>เมื่อ Admin เพิ่มคลิป ระบบจะแสดงรายการตรงนี้</p></article>`;

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
          <a class="secondary-btn" href="${escapeHtml(item.meetingUrl || `/course/${item.courseId}/content`)}">เข้าห้องเรียน</a>
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
      </div>
    </article>
  `).join("");
}

async function initContent() {
  const id = getCourseId();
  if (!localStorage.getItem(TOKEN_KEY)) {
    window.location.replace("/login");
    return;
  }
  try {
    const data = await apiRequest(`/api/courses/${encodeURIComponent(id)}/content`);
    renderContent(data);
  } catch (error) {
    window.location.replace(error.status === 402 ? "/payment" : "/login");
  }
}

initContent();
