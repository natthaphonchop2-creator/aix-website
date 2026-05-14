const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";

const liveStatusBadge = document.getElementById("liveStatusBadge");
const liveTitle = document.getElementById("liveTitle");
const liveDescription = document.getElementById("liveDescription");
const liveDateText = document.getElementById("liveDateText");
const liveCourseText = document.getElementById("liveCourseText");
const liveCountdownText = document.getElementById("liveCountdownText");
const liveHelpText = document.getElementById("liveHelpText");
const joinMeetBtn = document.getElementById("joinMeetBtn");
const openLessonBtn = document.getElementById("openLessonBtn");
const liveNotes = document.getElementById("liveNotes");
const liveMobileMenu = document.getElementById("liveMobileMenu");
const liveMobilePanel = document.getElementById("liveMobilePanel");
const toast = document.getElementById("toast");

let toastTimer = null;
let activeSchedule = null;

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

async function apiRequest(path) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "ไม่สามารถโหลดห้องเรียนสดได้");
  }
  return response.json();
}

function scheduleIdFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === "live" ? decodeURIComponent(parts[1] || "") : "";
}

function formatDateTimeRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue || startValue);
  if (Number.isNaN(start.getTime())) return "-";
  const dateText = start.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const startTime = start.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  const endTime = Number.isNaN(end.getTime()) ? "" : end.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${dateText} · ${startTime}${endTime ? `-${endTime} น.` : " น."}`;
}

function updateTimeStatus(schedule) {
  const start = Date.parse(schedule.startsAt);
  const end = Date.parse(schedule.endsAt) || start + (2 * 60 * 60 * 1000);
  const now = Date.now();
  if (Number.isNaN(start)) {
    liveCountdownText.textContent = "รอเวลาเริ่มเรียน";
    return;
  }

  liveStatusBadge.classList.remove("is-live", "is-soon", "is-ended");
  if (now >= start && now <= end) {
    liveStatusBadge.classList.add("is-live");
    liveStatusBadge.innerHTML = `<i class="fa-solid fa-signal"></i><span>กำลังสอนสดออนไลน์</span>`;
    liveCountdownText.textContent = "คลาสกำลังออนไลน์";
    return;
  }
  if (now > end) {
    liveStatusBadge.classList.add("is-ended");
    liveStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>คลาสนี้จบแล้ว</span>`;
    liveCountdownText.textContent = "คลาสจบแล้ว";
    return;
  }

  const minutes = Math.max(Math.ceil((start - now) / 60000), 0);
  liveStatusBadge.classList.toggle("is-soon", minutes <= 60);
  liveStatusBadge.innerHTML = `<i class="fa-regular fa-clock"></i><span>กำลังจะเริ่มเรียนสด</span>`;
  if (minutes < 60) {
    liveCountdownText.textContent = `เริ่มใน ${minutes} นาที`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remain = minutes % 60;
    liveCountdownText.textContent = `อีก ${hours} ชม.${remain ? ` ${remain} นาที` : ""}`;
  }
}

function setupNotes(scheduleId) {
  const key = `aix_live_notes_${scheduleId}`;
  liveNotes.value = localStorage.getItem(key) || "";
  liveNotes.addEventListener("input", () => {
    localStorage.setItem(key, liveNotes.value);
  });
}

function renderLiveRoom(data) {
  const schedule = data.schedule;
  activeSchedule = schedule;
  document.title = `${schedule.title} | AiX Live Classroom`;
  liveTitle.textContent = schedule.title;
  liveDescription.textContent = schedule.description || "ห้องเรียนสดสำหรับสมาชิก AiX Club";
  liveDateText.textContent = formatDateTimeRange(schedule.startsAt, schedule.endsAt);
  liveCourseText.textContent = schedule.courseTitle || data.course?.title || "AiX Live Class";
  openLessonBtn.href = data.learningUrl || "/dashboard#courses";

  if (schedule.meetingUrl) {
    joinMeetBtn.href = schedule.meetingUrl;
    joinMeetBtn.classList.remove("disabled");
    joinMeetBtn.removeAttribute("aria-disabled");
    liveHelpText.textContent = "กดเข้า Google Meet จากปุ่มหลัก แล้วเปิดหน้านี้ไว้สำหรับโน้ตและเข้าเนื้อหาประกอบ";
  } else {
    joinMeetBtn.href = "#";
    joinMeetBtn.classList.add("disabled");
    joinMeetBtn.setAttribute("aria-disabled", "true");
    liveHelpText.textContent = "ยังไม่ได้ใส่ลิงก์ Google Meet สำหรับคลาสนี้ ระบบจะแสดงปุ่มเข้า Meet ทันทีเมื่อ Admin เพิ่มลิงก์";
  }

  setupNotes(schedule.id);
  updateTimeStatus(schedule);
  window.setInterval(() => activeSchedule && updateTimeStatus(activeSchedule), 30000);
}

async function loadLiveRoom() {
  const scheduleId = scheduleIdFromPath();
  if (!token()) {
    window.location.replace("/login");
    return;
  }
  if (!scheduleId) {
    window.location.replace("/dashboard#schedule");
    return;
  }

  try {
    const data = await apiRequest(`/api/member/schedules/${encodeURIComponent(scheduleId)}`);
    renderLiveRoom(data);
  } catch (error) {
    showToast(error.message);
    liveStatusBadge.classList.add("is-ended");
    liveStatusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>เปิดห้องเรียนสดไม่ได้</span>`;
    liveTitle.textContent = "ไม่พบห้องเรียนสด";
    liveDescription.textContent = error.message;
    joinMeetBtn.classList.add("disabled");
    joinMeetBtn.setAttribute("aria-disabled", "true");
    joinMeetBtn.href = "#";
  }
}

joinMeetBtn?.addEventListener("click", (event) => {
  if (joinMeetBtn.classList.contains("disabled")) {
    event.preventDefault();
    showToast("ยังไม่ได้ใส่ลิงก์ Google Meet สำหรับคลาสนี้");
  }
});

liveMobileMenu?.addEventListener("click", () => {
  liveMobilePanel?.classList.toggle("open");
});

loadLiveRoom();
