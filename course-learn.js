const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const PROGRESS_KEY = "aix_learning_progress_v1";

const learnCourseName = document.getElementById("learnCourseName");
const learnSidebarTitle = document.getElementById("learnSidebarTitle");
const learnProgressText = document.getElementById("learnProgressText");
const learnProgressBar = document.getElementById("learnProgressBar");
const learnModuleList = document.getElementById("learnModuleList");
const learnVideoCard = document.getElementById("learnVideoCard");
const learnModuleMeta = document.getElementById("learnModuleMeta");
const learnModuleTitle = document.getElementById("learnModuleTitle");
const readingPanel = document.getElementById("readingPanel");
const notesPanel = document.getElementById("notesPanel");
const downloadsPanel = document.getElementById("downloadsPanel");
const lessonNotes = document.getElementById("lessonNotes");
const prevLessonBtn = document.getElementById("prevLessonBtn");
const nextLessonBtn = document.getElementById("nextLessonBtn");
const focusNotesBtn = document.getElementById("focusNotesBtn");
const backToCourseLink = document.getElementById("backToCourseLink");
const learnAiMessages = document.getElementById("learnAiMessages");
const learnAiForm = document.getElementById("learnAiForm");
const learnAiInput = document.getElementById("learnAiInput");
const toast = document.getElementById("toast");

let state = {
  course: null,
  modules: [],
  resources: [],
  replays: [],
  activeIndex: 0
};
let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function getCourseId() {
  const pathMatch = window.location.pathname.match(/\/course\/([^/]+)\/learn/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : new URLSearchParams(window.location.search).get("id");
}

function clampIndex(index, total) {
  return Math.min(Math.max(Number(index) || 0, 0), Math.max(total - 1, 0));
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    }
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

function playableVideo(url = "") {
  return url.startsWith("/uploads/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function moduleVideo(module, index) {
  return module.videoUrl || state.replays[index]?.videoUrl || state.replays[index]?.filePath || "";
}

function notesKey() {
  return `aix_lesson_notes_${state.course?.id || "course"}_${state.activeIndex}`;
}

function readLearningProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function currentCourseProgress() {
  const store = readLearningProgress();
  return store.courses?.[state.course?.id] || {};
}

function saveLearningProgress(module) {
  if (!state.course || !state.modules.length) return;
  const store = readLearningProgress();
  const courses = store.courses && typeof store.courses === "object" ? store.courses : {};
  const existing = courses[state.course.id] || {};
  const completedCount = Math.max(Number(existing.completedCount) || 0, state.activeIndex + 1);
  courses[state.course.id] = {
    ...existing,
    courseId: state.course.id,
    courseTitle: state.course.title,
    activeIndex: state.activeIndex,
    completedCount,
    totalModules: state.modules.length,
    moduleTitle: module?.title || "",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    ...store,
    latestCourseId: state.course.id,
    courses
  }));
  syncLearningProgress(courses[state.course.id]);
}

async function syncLearningProgress(progress) {
  if (!progress?.courseId) return;
  try {
    const data = await apiRequest("/api/member/progress", {
      method: "POST",
      body: JSON.stringify({
        courseId: progress.courseId,
        activeIndex: progress.activeIndex,
        completedCount: progress.completedCount,
        totalModules: progress.totalModules,
        moduleTitle: progress.moduleTitle
      })
    });
    if (data.progress) {
      const store = readLearningProgress();
      const courses = store.courses && typeof store.courses === "object" ? store.courses : {};
      courses[data.progress.courseId] = {
        ...courses[data.progress.courseId],
        ...data.progress
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        ...store,
        latestCourseId: data.progress.courseId,
        courses
      }));
    }
  } catch (error) {
    // Local progress remains available if the network drops during a lesson.
  }
}

function updateUrl() {
  const url = `/course/${encodeURIComponent(state.course.id)}/learn?module=${state.activeIndex}&ready=1`;
  window.history.replaceState(null, "", url);
}

function renderSidebar() {
  const progress = currentCourseProgress();
  const completedCount = Number(progress.completedCount) || 0;
  learnModuleList.innerHTML = state.modules.map((module, index) => `
    <button class="learn-module-item ${index === state.activeIndex ? "active" : ""} ${index < completedCount ? "completed" : ""}" type="button" data-module-index="${index}">
      <span>${index < completedCount ? '<i class="fa-solid fa-check"></i>' : index + 1}</span>
      <strong>${escapeHtml(module.title)}</strong>
      <small>${escapeHtml((module.videoUrl || state.replays[index]) ? "วิดีโอ + อ่านประกอบ" : "อ่านประกอบ")}${module.time ? ` · ${escapeHtml(module.time)}` : ""}</small>
    </button>
  `).join("");
}

function renderVideo(module, index) {
  const url = moduleVideo(module, index);
  learnVideoCard.innerHTML = playableVideo(url)
    ? `<video controls preload="metadata" src="${escapeHtml(url)}"></video>`
    : `
      <div class="learn-video-empty">
        <button type="button" aria-label="Play preview"><i class="fa-solid fa-play"></i></button>
        <strong>พื้นที่วิดีโอของบทเรียน</strong>
        <span>เมื่อ Admin อัปโหลดวิดีโอ ระบบจะแสดงในพื้นที่นี้ทันที</span>
      </div>
    `;
}

function renderReading(module, index) {
  const lessons = module.lessons || [];
  readingPanel.innerHTML = `
    <div class="learn-book-section">
      <span>บทนำ</span>
      <p>บทนี้ช่วยให้เข้าใจหัวข้อ <strong>${escapeHtml(module.title)}</strong> ผ่านการดูวิดีโอควบคู่กับการอ่านสรุปทีละประเด็น เหมือนมีคู่มือประกอบระหว่างเรียน</p>
    </div>
    <div class="learn-book-section">
      <span>สิ่งที่ควรจับประเด็น</span>
      <ul>${lessons.map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("") || "<li>อ่านภาพรวมและจดคำถามที่ต้องการให้ AiX Coach ช่วยอธิบาย</li>"}</ul>
    </div>
    <div class="learn-book-section">
      <span>แนวทางลงมือทำ</span>
      <p>หลังดูวิดีโอ ให้ลองสรุปด้วยคำของตัวเอง 3 ข้อ แล้วเลือกหนึ่งงานจริงเพื่อทดสอบแนวคิดจากบทนี้ หากติดขัดให้ถาม AiX Coach ด้านขวาเพื่อขอตัวอย่างหรือ checklist เพิ่ม</p>
    </div>
  `;
  downloadsPanel.innerHTML = `
    <div class="learn-download-list">
      ${state.resources.length
        ? state.resources.slice(0, 5).map((resource) => {
            const href = resource.url || resource.filePath || "#";
            const external = /^https?:\/\//.test(href);
            return `<a href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""}><i class="fa-solid fa-file-arrow-down"></i><span>${escapeHtml(resource.title)}</span></a>`;
          }).join("")
        : `<p>ยังไม่มีไฟล์แนบสำหรับคอร์สนี้</p>`}
    </div>
  `;
  lessonNotes.value = localStorage.getItem(notesKey()) || "";
}

function aiSeedMessage(module) {
  const firstLesson = module.lessons?.[0] || "เริ่มจากการทำความเข้าใจเป้าหมายของบทนี้";
  return `บทนี้เริ่มจาก "${firstLesson}" ถ้าต้องการ ผมช่วยสรุปเป็น checklist, prompt ตัวอย่าง หรือแผนลงมือทำ 10 นาทีได้`;
}

function renderAi(module) {
  learnAiMessages.innerHTML = `
    <article class="learn-ai-message assistant">
      <strong>AiX Coach</strong>
      <p>${escapeHtml(aiSeedMessage(module))}</p>
    </article>
  `;
}

function localAiAnswer(question, module) {
  const lessons = (module.lessons || []).slice(0, 3);
  const lower = question.toLowerCase();
  if (lower.includes("prompt")) {
    return `ลองใช้ prompt นี้: "ช่วยอธิบาย ${module.title} ให้เป็นขั้นตอนสำหรับงานจริงของฉัน โดยแบ่งเป็น เป้าหมาย, input, ขั้นตอน, output และจุดที่ต้องตรวจสอบ"`;
  }
  if (lower.includes("สรุป") || lower.includes("summary")) {
    return `สรุปบทนี้: ${lessons.join(" / ") || module.title}. จุดสำคัญคือดูเป้าหมายของงานก่อน แล้วค่อยเลือกวิธีใช้ AI ให้เหมาะกับผลลัพธ์ที่ต้องการ`;
  }
  return `คำแนะนำจากบท "${module.title}": เริ่มจาก ${lessons[0] || "ทำความเข้าใจภาพรวม"} จากนั้นลองทำตัวอย่างเล็กๆ แล้วจดสิ่งที่ยังไม่ชัดเจนเพื่อถามต่อได้`;
}

function renderActiveModule() {
  const module = state.modules[state.activeIndex];
  if (!module) return;
  updateUrl();
  saveLearningProgress(module);
  renderSidebar();
  renderVideo(module, state.activeIndex);
  learnModuleMeta.textContent = `รายการที่ ${state.activeIndex + 1} · ${module.time || "บทเรียน"}`;
  learnModuleTitle.textContent = module.title;
  learnProgressText.textContent = `${state.activeIndex + 1}/${state.modules.length} รายการการเรียนรู้`;
  learnProgressBar.style.width = `${Math.round(((state.activeIndex + 1) / state.modules.length) * 100)}%`;
  prevLessonBtn.disabled = state.activeIndex === 0;
  nextLessonBtn.textContent = state.activeIndex === state.modules.length - 1 ? "เรียนครบแล้ว" : "ไปที่รายการถัดไป";
  renderReading(module, state.activeIndex);
  renderAi(module);
}

function setActiveModule(index) {
  state.activeIndex = clampIndex(index, state.modules.length);
  renderActiveModule();
}

function setTab(tab) {
  document.querySelectorAll("[data-learn-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.learnTab === tab);
  });
  readingPanel.classList.toggle("hidden", tab !== "reading");
  notesPanel.classList.toggle("hidden", tab !== "notes");
  downloadsPanel.classList.toggle("hidden", tab !== "downloads");
}

async function initLearnPage() {
  const courseId = getCourseId();
  const params = new URLSearchParams(window.location.search);
  if (!token()) {
    window.location.replace("/login");
    return;
  }
  if (params.get("ready") !== "1") {
    window.location.replace(`/course/${encodeURIComponent(courseId)}/start`);
    return;
  }

  try {
    const data = await apiRequest(`/api/courses/${encodeURIComponent(courseId)}/content`);
    state = {
      course: data.course,
      modules: data.modules || [],
      resources: data.resources || [],
      replays: data.replays || [],
      activeIndex: clampIndex(params.get("module"), data.modules?.length || 0)
    };
    document.title = `${state.course.title} | เรียนรู้`;
    learnCourseName.textContent = state.course.title;
    learnSidebarTitle.textContent = state.course.title;
    backToCourseLink.href = `/course/${encodeURIComponent(state.course.id)}/content?ready=1`;
    renderActiveModule();
    document.body.classList.add("learn-ready");
  } catch (error) {
    window.location.replace(error.status === 402 ? "/payment" : "/login");
  }
}

learnModuleList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-module-index]");
  if (!button) return;
  setActiveModule(button.dataset.moduleIndex);
});

prevLessonBtn?.addEventListener("click", () => setActiveModule(state.activeIndex - 1));
nextLessonBtn?.addEventListener("click", () => {
  if (state.activeIndex >= state.modules.length - 1) {
    showToast("คุณเปิดดูรายการสุดท้ายแล้ว");
    return;
  }
  setActiveModule(state.activeIndex + 1);
});

document.querySelectorAll("[data-learn-tab]").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.learnTab));
});

focusNotesBtn?.addEventListener("click", () => {
  setTab("notes");
  lessonNotes.focus();
});

lessonNotes?.addEventListener("input", () => {
  localStorage.setItem(notesKey(), lessonNotes.value);
});

learnAiForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = learnAiInput.value.trim();
  const module = state.modules[state.activeIndex];
  if (!question || !module) return;
  learnAiMessages.insertAdjacentHTML("beforeend", `<article class="learn-ai-message user"><strong>คุณ</strong><p>${escapeHtml(question)}</p></article>`);
  learnAiMessages.insertAdjacentHTML("beforeend", `<article class="learn-ai-message assistant"><strong>AiX Coach</strong><p>${escapeHtml(localAiAnswer(question, module))}</p></article>`);
  learnAiInput.value = "";
  learnAiMessages.scrollTop = learnAiMessages.scrollHeight;
});

initLearnPage();
