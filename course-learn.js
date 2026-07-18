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
const challengePanel = document.getElementById("challengePanel");
const notesPanel = document.getElementById("notesPanel");
const downloadsPanel = document.getElementById("downloadsPanel");
const lessonNotes = document.getElementById("lessonNotes");
const prevLessonBtn = document.getElementById("prevLessonBtn");
const nextLessonBtn = document.getElementById("nextLessonBtn");
const focusNotesBtn = document.getElementById("focusNotesBtn");
const backToCourseLink = document.getElementById("backToCourseLink");
const teacherKbLabel = document.getElementById("teacherKbLabel");
const teacherKbSummary = document.getElementById("teacherKbSummary");
const learnAiMessages = document.getElementById("learnAiMessages");
const learnAiForm = document.getElementById("learnAiForm");
const learnAiInput = document.getElementById("learnAiInput");
const labProblemTitle = document.getElementById("labProblemTitle");
const labDifficulty = document.getElementById("labDifficulty");
const labPrompt = document.getElementById("labPrompt");
const labRunResult = document.getElementById("labRunResult");
const runLabBtn = document.getElementById("runLabBtn");
const editorLabel = document.getElementById("editorLabel");
const labModeHint = document.getElementById("labModeHint");
const toast = document.getElementById("toast");

let state = {
  course: null,
  modules: [],
  resources: [],
  replays: [],
  activeIndex: 0,
  editorMode: "prompt",
  lastRun: null
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

function playableVideo(url = "") {
  return url.startsWith("/api/media/replays/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function moduleVideo(module, index) {
  const value = module.videoUrl
    || module.mediaUrl
    || state.replays[index]?.videoUrl
    || state.replays[index]?.mediaUrl
    || "";
  if (!value) return "";
  const accepted = AiXDom.safeUrl(value, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true
  });
  return accepted === "about:blank" ? "" : accepted;
}

function notesKey() {
  return `aix_lesson_notes_${state.course?.id || "course"}_${state.activeIndex}`;
}

function editorKey(mode = state.editorMode) {
  return `aix_lesson_lab_${state.course?.id || "course"}_${state.activeIndex}_${mode}`;
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
    await bootstrapMemberSession();
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
  AiXDom.replace(learnModuleList, state.modules.map((module, index) => {
    const completed = index < completedCount;
    const className = [
      "learn-module-item",
      index === state.activeIndex ? "active" : "",
      completed ? "completed" : ""
    ].filter(Boolean).join(" ");
    const mediaLabel = moduleVideo(module, index) ? "วิดีโอ + อ่านประกอบ" : "อ่านประกอบ";
    return AiXDom.node("button", {
      className,
      attrs: { type: "button", "data-module-index": index }
    }, [
      AiXDom.node("span", {}, [
        completed ? AiXDom.node("i", { className: "fa-solid fa-check" }) : index + 1
      ]),
      AiXDom.node("strong", { text: module.title }),
      AiXDom.node("small", { text: `${mediaLabel}${module.time ? ` · ${module.time}` : ""}` })
    ]);
  }));
}

function renderVideo(module, index) {
  const url = moduleVideo(module, index);
  const content = playableVideo(url)
    ? AiXDom.node("video", {
        attrs: { preload: "metadata" },
        props: { controls: true },
        urls: {
          src: {
            value: url,
            options: { allowedProtocols: ["http:", "https:"], allowRelative: true }
          }
        }
      })
    : AiXDom.node("div", { className: "learn-video-empty" }, [
        AiXDom.node("button", { attrs: { type: "button", "aria-label": "Play preview" } }, [
          AiXDom.node("i", { className: "fa-solid fa-play" })
        ]),
        AiXDom.node("strong", { text: "พื้นที่วิดีโอของบทเรียน" }),
        AiXDom.node("span", { text: "เมื่อ Admin อัปโหลดวิดีโอ ระบบจะแสดงในพื้นที่นี้ทันที" })
      ]);
  AiXDom.replace(learnVideoCard, [content]);
}

function lessonChallenge(module, index) {
  const title = module?.title || "บทเรียน";
  const points = module?.lessons || [];
  const firstPoint = points[0] || "เลือกงานจริงที่ต้องใช้ AI ช่วย";
  const secondPoint = points[1] || "กำหนด input, context และ output ให้ชัดเจน";
  const thirdPoint = points[2] || "ตั้งเกณฑ์ตรวจงานก่อนนำไปใช้";
  const lower = `${title} ${points.join(" ")}`.toLowerCase();
  const isVibe = /vibe|code|prototype|debug|component|mvp|product spec/.test(lower);
  const isAgent = /agent|automation|workflow|trigger|approval|knowledge/.test(lower);
  const isPrompt = /prompt|instruction|context|format|output/.test(lower);
  const type = isVibe ? "Vibe code" : isAgent ? "AI Agent" : isPrompt ? "Prompt" : "AI Workflow";

  return {
    type,
    difficulty: index < 2 ? "Foundation" : index < 5 ? "Applied" : "Project",
    title: `โจทย์ ${index + 1}: ${title}`,
    prompt: `สร้างคำสั่ง AI สำหรับงานจริงโดยยึดจากบทนี้: ${firstPoint}`,
    scenario: `คุณเป็นผู้เรียน AiX ที่ต้องนำหัวข้อ "${title}" ไปใช้กับธุรกิจจริง เลือกหนึ่ง use case แล้วออกแบบคำสั่ง/ขั้นตอนให้ AI ทำงานได้โดยไม่เดาเอง`,
    requirements: [
      `ระบุเป้าหมายงานและ use case ให้ชัดเจน: ${firstPoint}`,
      `ใส่ context, input และข้อจำกัดที่เกี่ยวกับ: ${secondPoint}`,
      `กำหนดรูปแบบ output ที่ตรวจได้ เช่น ตาราง checklist JSON brief หรือ action plan`,
      `เพิ่มเกณฑ์ตรวจคุณภาพและจุดเสี่ยงจากบทเรียน: ${thirdPoint}`,
      "บอกวิธี iterate หาก output รอบแรกยังไม่ดีพอ"
    ],
    testCases: [
      { label: "Role", detail: "มีบทบาทของ AI หรือผู้เชี่ยวชาญที่ต้องจำลอง" },
      { label: "Context", detail: "มีข้อมูลพื้นหลังและข้อจำกัดของงาน" },
      { label: "Task", detail: "ระบุสิ่งที่ต้องทำเป็นขั้นตอน ไม่กำกวม" },
      { label: "Output", detail: "กำหนด format ผลลัพธ์และตัวอย่างช่องข้อมูล" },
      { label: "Evaluation", detail: "มีเกณฑ์ตรวจ/เงื่อนไข pass-fail" }
    ],
    starter: {
      prompt: [
        `Role: คุณคือผู้ช่วย AI สำหรับ ${state.course?.title || "AiX Club"}`,
        `Context: ฉันกำลังทำงานเรื่อง "${title}" และต้องการใช้กับธุรกิจจริง`,
        `Task: ช่วยออกแบบวิธีทำงานตามโจทย์ "${firstPoint}"`,
        "Input: [ใส่ข้อมูลธุรกิจ ลูกค้า เป้าหมาย และข้อจำกัด]",
        "Output format: ตารางที่มีคอลัมน์ ขั้นตอน / เหตุผล / output ที่ต้องได้ / วิธีตรวจ",
        `Constraints: ต้องอิงจากบทเรียนนี้ โดยเฉพาะ ${points.slice(0, 3).join(", ") || title}`,
        "Evaluation: ตรวจว่าคำตอบครบ role, context, task, output และ risk ก่อนสรุป"
      ].join("\n"),
      vibe: [
        `Feature: สร้าง workflow หรือ prototype สำหรับ "${title}"`,
        "User story: ในฐานะผู้ใช้งาน ฉันต้องการ...",
        "Acceptance criteria:",
        "- ผู้ใช้กรอก input หลักได้",
        "- ระบบสร้าง output ตาม format ที่กำหนด",
        "- มีสถานะ error/empty/loading",
        "- มีปุ่มให้ AiX Teacher ตรวจ output",
        "Prompt to AI coder:",
        "ช่วยสร้าง UI/logic ตาม criteria นี้ โดยอธิบายไฟล์ที่แก้และวิธีทดสอบ"
      ].join("\n"),
      output: [
        "วาง output ที่ AI สร้างให้ตรวจตรงนี้",
        "",
        "ตัวอย่าง:",
        "- เป้าหมาย:",
        "- ขั้นตอน:",
        "- Output:",
        "- จุดที่ยังไม่มั่นใจ:"
      ].join("\n")
    }
  };
}

function renderChallenge(module, index) {
  const challenge = lessonChallenge(module, index);
  labProblemTitle.textContent = challenge.title;
  labDifficulty.textContent = challenge.difficulty;
  labPrompt.textContent = challenge.prompt;
  AiXDom.replace(challengePanel, [
    AiXDom.node("div", { className: "learn-challenge-brief" }, [
      AiXDom.node("span", { text: challenge.type }),
      AiXDom.node("h2", { text: challenge.title }),
      AiXDom.node("p", { text: challenge.scenario })
    ]),
    AiXDom.node("div", { className: "learn-challenge-section" }, [
      AiXDom.node("strong", { text: "Requirements" }),
      AiXDom.node("ul", {}, challenge.requirements.map((item) => AiXDom.node("li", { text: item })))
    ]),
    AiXDom.node("div", { className: "learn-challenge-section" }, [
      AiXDom.node("strong", { text: "Test cases" }),
      AiXDom.node("div", { className: "learn-test-list" }, challenge.testCases.map((item) => (
        AiXDom.node("article", {}, [
          AiXDom.node("b", { text: item.label }),
          AiXDom.node("span", { text: item.detail })
        ])
      )))
    ])
  ]);
  return challenge;
}

function renderReading(module, index) {
  const lessons = module.lessons || [];
  const lessonItems = lessons.length
    ? lessons.map((lesson) => AiXDom.node("li", { text: lesson }))
    : [AiXDom.node("li", { text: "อ่านภาพรวมและจดคำถามที่ต้องการให้ AiX Coach ช่วยอธิบาย" })];
  AiXDom.replace(readingPanel, [
    AiXDom.node("div", { className: "learn-book-section" }, [
      AiXDom.node("span", { text: "บทนำ" }),
      AiXDom.node("p", {}, [
        "บทนี้ช่วยให้เข้าใจหัวข้อ ",
        AiXDom.node("strong", { text: module.title }),
        " ผ่านการดูวิดีโอควบคู่กับการอ่านสรุปทีละประเด็น เหมือนมีคู่มือประกอบระหว่างเรียน"
      ])
    ]),
    AiXDom.node("div", { className: "learn-book-section" }, [
      AiXDom.node("span", { text: "สิ่งที่ควรจับประเด็น" }),
      AiXDom.node("ul", {}, lessonItems)
    ]),
    AiXDom.node("div", { className: "learn-book-section" }, [
      AiXDom.node("span", { text: "แนวทางลงมือทำ" }),
      AiXDom.node("p", {
        text: "หลังดูวิดีโอ ให้ลองสรุปด้วยคำของตัวเอง 3 ข้อ แล้วเลือกหนึ่งงานจริงเพื่อทดสอบแนวคิดจากบทนี้ หากติดขัดให้ถาม AiX Coach ด้านขวาเพื่อขอตัวอย่างหรือ checklist เพิ่ม"
      })
    ])
  ]);

  const downloads = state.resources.length
    ? state.resources.slice(0, 5).map((resource) => AiXDom.link({
        href: AiXDom.safeUrl(resource.url || resource.mediaUrl || "#", {
          allowedProtocols: ["http:", "https:"],
          allowRelative: true
        })
      }, [
        AiXDom.node("i", { className: "fa-solid fa-file-arrow-down" }),
        AiXDom.node("span", { text: resource.title })
      ]))
    : [AiXDom.node("p", { text: "ยังไม่มีไฟล์แนบสำหรับคอร์สนี้" })];
  AiXDom.replace(downloadsPanel, [AiXDom.node("div", { className: "learn-download-list" }, downloads)]);
  lessonNotes.value = localStorage.getItem(notesKey()) || "";
}

function aiSeedMessage(module) {
  const firstLesson = module.lessons?.[0] || "เริ่มจากการทำความเข้าใจเป้าหมายของบทนี้";
  return `โหลด knowledge base ของบทนี้แล้ว: "${firstLesson}"\nพิมพ์คำถาม ส่งคำตอบให้ตรวจ หรือใช้คำสั่งด้านบนเพื่อเริ่มเรียนแบบมีอาจารย์ AI ประกบ`;
}

function lessonKnowledgeSummary(module) {
  const points = module.lessons || [];
  return [
    AiXDom.node("span", { text: `lesson-kb/${state.course?.id || "course"}/${state.activeIndex + 1}` }),
    AiXDom.node("strong", { text: module.title }),
    AiXDom.node("small", { text: `${points.length} ประเด็นในบทเรียน · ${module.time || "บทเรียน"}` })
  ];
}

function renderAi(module) {
  teacherKbLabel.textContent = `KB: ${module.title}`;
  AiXDom.replace(teacherKbSummary, lessonKnowledgeSummary(module));
  AiXDom.replace(learnAiMessages, [
    AiXDom.node("article", {
      className: "learn-ai-message assistant",
      attrs: { "data-role": "assistant" }
    }, [
      AiXDom.node("strong", { text: "teacher@aix" }),
      AiXDom.node("p", { text: aiSeedMessage(module) })
    ])
  ]);
}

function editorModeConfig(mode = state.editorMode) {
  const map = {
    prompt: {
      label: "student@aix:~/prompt.md",
      hint: "เขียน prompt ที่จะใช้สั่ง AI ให้ทำงานจริง",
      placeholder: "เขียน prompt ที่มี role, context, task, output format และ criteria"
    },
    vibe: {
      label: "student@aix:~/vibe-spec.md",
      hint: "เขียน spec สำหรับสั่ง AI coder หรือทำ vibe coding",
      placeholder: "เขียน feature brief, user story, acceptance criteria และ prompt to AI coder"
    },
    output: {
      label: "student@aix:~/output.txt",
      hint: "วาง output ที่ AI สร้างมา เพื่อให้ครู AI ตรวจคุณภาพ",
      placeholder: "วาง output หรือคำตอบที่ได้จาก AI แล้วกด Submit ให้ตรวจ"
    }
  };
  return map[mode] || map.prompt;
}

function setEditorMode(mode, saveCurrent = true) {
  if (saveCurrent && learnAiInput && state.course) {
    localStorage.setItem(editorKey(), learnAiInput.value);
  }
  state.editorMode = ["prompt", "vibe", "output"].includes(mode) ? mode : "prompt";
  document.querySelectorAll("[data-editor-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.editorMode === state.editorMode);
  });
  const module = state.modules[state.activeIndex];
  const challenge = lessonChallenge(module, state.activeIndex);
  const config = editorModeConfig();
  editorLabel.textContent = config.label;
  labModeHint.textContent = config.hint;
  learnAiInput.placeholder = config.placeholder;
  learnAiInput.value = localStorage.getItem(editorKey())
    || challenge.starter[state.editorMode]
    || "";
}

function evaluateSubmission(text, challenge) {
  const normalized = text.toLowerCase();
  const checks = [
    { label: "Role", pass: /(role|บทบาท|คุณคือ|ทำหน้าที่)/i.test(text) },
    { label: "Context", pass: /(context|บริบท|ข้อมูล|background|ข้อจำกัด|ธุรกิจ)/i.test(text) },
    { label: "Task", pass: /(task|งาน|ช่วย|สร้าง|วิเคราะห์|ออกแบบ|ตรวจ)/i.test(text) },
    { label: "Output", pass: /(output|ผลลัพธ์|format|รูปแบบ|ตาราง|json|checklist|action plan)/i.test(text) },
    { label: "Evaluation", pass: /(criteria|เกณฑ์|ตรวจ|pass|fail|quality|risk|ความเสี่ยง)/i.test(text) }
  ];
  const lessonHits = (state.modules[state.activeIndex]?.lessons || [])
    .filter((point) => normalized.includes(String(point).slice(0, 14).toLowerCase()));
  const passed = checks.filter((item) => item.pass).length;
  const score = Math.min(100, Math.round((passed / checks.length) * 82) + Math.min(18, lessonHits.length * 6));
  return {
    score,
    passed,
    total: checks.length,
    checks,
    lessonHits,
    verdict: score >= 80 ? "พร้อมส่งให้ AI ใช้งานจริง" : score >= 55 ? "ใช้ได้บางส่วน แต่ควรเพิ่มรายละเอียด" : "ยังไม่พอสำหรับใช้งานจริง"
  };
}

function renderRunResult(result) {
  const statusClass = result.score >= 80 ? "pass" : result.score >= 55 ? "warn" : "fail";
  labRunResult.classList.remove("pass", "warn", "fail");
  labRunResult.classList.add(statusClass);
  AiXDom.replace(labRunResult, [
    AiXDom.node("div", {}, [
      AiXDom.node("strong", { text: "Test Result" }),
      AiXDom.node("span", { text: `${result.score}/100 · ${result.verdict}` })
    ]),
    AiXDom.node("ul", {}, result.checks.map((item) => AiXDom.node("li", {
      className: item.pass ? "pass" : "fail"
    }, [
      AiXDom.node("i", { className: `fa-solid ${item.pass ? "fa-check" : "fa-xmark"}` }),
      item.label
    ]))),
    AiXDom.node("p", {
      text: result.lessonHits.length
        ? `อิงบทเรียนแล้ว ${result.lessonHits.length} จุด`
        : "ยังไม่เห็นคำสำคัญจากบทเรียนในงานที่ส่ง ลองผูกกับ requirements ให้ชัดขึ้น"
    })
  ]);
}

function runLabCheck() {
  const module = state.modules[state.activeIndex];
  if (!module) return null;
  const text = learnAiInput.value.trim();
  if (!text) {
    showToast("เขียนงานลง editor ก่อนกด Run");
    learnAiInput.focus();
    return null;
  }
  localStorage.setItem(editorKey(), text);
  const challenge = lessonChallenge(module, state.activeIndex);
  const result = evaluateSubmission(text, challenge);
  state.lastRun = result;
  renderRunResult(result);
  return result;
}

function aiMessageRoleClass(role) {
  return role === "user" ? "user" : "assistant";
}

function appendAiMessage(role, content, label, loading = false) {
  const normalizedRole = aiMessageRoleClass(role);
  const article = AiXDom.node("article", {
    className: `learn-ai-message ${normalizedRole}${loading ? " is-loading" : ""}`,
    attrs: { "data-role": normalizedRole }
  }, [
    AiXDom.node("strong", { text: label || (normalizedRole === "user" ? "student@aix" : "teacher@aix") }),
    AiXDom.node("p", { text: content })
  ]);
  learnAiMessages.appendChild(article);
  learnAiMessages.scrollTop = learnAiMessages.scrollHeight;
  return article;
}

function setAiBusy(isBusy) {
  learnAiInput.disabled = isBusy;
  const submit = learnAiForm?.querySelector("button[type='submit']");
  if (submit) {
    submit.disabled = isBusy;
    AiXDom.replace(submit, [
      AiXDom.node("i", {
        className: isBusy ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-cloud-arrow-up"
      }),
      isBusy ? " กำลังตรวจ" : " Submit ให้ AiX Teacher ตรวจ"
    ]);
  }
  if (runLabBtn) runLabBtn.disabled = isBusy;
  document.querySelectorAll("[data-ai-command]").forEach((button) => {
    button.disabled = isBusy;
  });
}

function collectAiHistory() {
  return Array.from(learnAiMessages.querySelectorAll(".learn-ai-message"))
    .slice(-6)
    .map((item) => ({
      role: item.dataset.role || "assistant",
      content: item.querySelector("p")?.textContent || ""
    }))
    .filter((item) => item.content);
}

function detectTeacherMode(question) {
  if (/^ตรวจ|ตรวจคำตอบ|คำตอบของฉัน|ถูกไหม|ถูกหรือ/.test(question)) return "check";
  if (/แบบฝึกหัด|ฝึก|quiz/i.test(question)) return "practice";
  if (/สรุป|summary/i.test(question)) return "summarize";
  return "ask";
}

async function requestAiTeacher(question, mode) {
  const module = state.modules[state.activeIndex];
  const challenge = lessonChallenge(module, state.activeIndex);
  await bootstrapMemberSession();
  const response = await apiRequest(`/api/courses/${encodeURIComponent(state.course.id)}/teacher-chat`, {
    method: "POST",
    body: JSON.stringify({
      moduleIndex: state.activeIndex,
      message: question,
      mode,
      notes: lessonNotes.value,
      history: collectAiHistory(),
      exercise: {
        editorMode: state.editorMode,
        challengeTitle: challenge.title,
        challengeType: challenge.type,
        prompt: challenge.prompt,
        requirements: challenge.requirements,
        testCases: challenge.testCases,
        localRun: state.lastRun
          ? {
              score: state.lastRun.score,
              verdict: state.lastRun.verdict,
              checks: state.lastRun.checks
            }
          : null
      }
    })
  });
  return response;
}

function localAiAnswer(question, module) {
  const lessons = (module.lessons || []).slice(0, 3);
  const lower = question.toLowerCase();
  if (lower.includes("ตรวจ") || lower.includes("submit") || lower.includes("output")) {
    const result = state.lastRun || evaluateSubmission(learnAiInput.value || question, lessonChallenge(module, state.activeIndex));
    const missing = result.checks.filter((item) => !item.pass).map((item) => item.label).join(", ");
    return [
      `ผลตรวจสำรอง: ${result.score}/100`,
      `Verdict: ${result.verdict}`,
      missing ? `ต้องเพิ่ม: ${missing}` : "โครงสร้างหลักครบแล้ว",
      "แนะนำให้เพิ่มตัวอย่าง input จริง 1 ชุด และกำหนดเกณฑ์ pass/fail ให้ชัดก่อนใช้กับงานจริง"
    ].join("\n");
  }
  if (lower.includes("hint")) {
    return `Hint: เริ่มจากเขียน Role + Context ก่อน แล้วแปลง ${lessons[0] || module.title} เป็น Task ที่ตรวจ output ได้`;
  }
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
  state.lastRun = null;
  learnModuleMeta.textContent = `รายการที่ ${state.activeIndex + 1} · ${module.time || "บทเรียน"}`;
  learnModuleTitle.textContent = module.title;
  learnProgressText.textContent = `${state.activeIndex + 1}/${state.modules.length} รายการการเรียนรู้`;
  learnProgressBar.style.transform = `scaleX(${(state.activeIndex + 1) / state.modules.length})`;
  prevLessonBtn.disabled = state.activeIndex === 0;
  nextLessonBtn.textContent = state.activeIndex === state.modules.length - 1 ? "เรียนครบแล้ว" : "ไปที่รายการถัดไป";
  renderReading(module, state.activeIndex);
  renderChallenge(module, state.activeIndex);
  setEditorMode(state.editorMode, false);
  labRunResult.classList.remove("pass", "warn", "fail");
  AiXDom.replace(labRunResult, [
    AiXDom.node("strong", { text: "Test Result" }),
    AiXDom.node("p", { text: "กด Run เพื่อเช็กโครง prompt และ output ก่อนส่งให้อาจารย์ AI ตรวจ" })
  ]);
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
  challengePanel.classList.toggle("hidden", tab !== "challenge");
  notesPanel.classList.toggle("hidden", tab !== "notes");
  downloadsPanel.classList.toggle("hidden", tab !== "downloads");
}

async function initLearnPage() {
  const courseId = getCourseId();
  const params = new URLSearchParams(window.location.search);
  if (params.get("ready") !== "1") {
    window.location.replace(`/course/${encodeURIComponent(courseId)}/start`);
    return;
  }

  try {
    await bootstrapMemberSession();
    const data = await apiRequest(`/api/courses/${encodeURIComponent(courseId)}/content`);
    state = {
      course: data.course,
      modules: data.modules || [],
      resources: data.resources || [],
      replays: data.replays || [],
      activeIndex: clampIndex(params.get("module"), data.modules?.length || 0),
      editorMode: "prompt",
      lastRun: null
    };
    document.title = `${state.course.title} | เรียนรู้`;
    learnCourseName.textContent = state.course.title;
    learnSidebarTitle.textContent = state.course.title;
    backToCourseLink.href = `/course/${encodeURIComponent(state.course.id)}/content?ready=1`;
    renderActiveModule();
    document.body.classList.add("learn-ready");
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
    showToast(error.message || "ไม่สามารถเปิดบทเรียนได้");
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

learnAiInput?.addEventListener("input", () => {
  if (state.course) localStorage.setItem(editorKey(), learnAiInput.value);
});

document.querySelectorAll("[data-editor-mode]").forEach((button) => {
  button.addEventListener("click", () => setEditorMode(button.dataset.editorMode));
});

runLabBtn?.addEventListener("click", () => {
  const result = runLabCheck();
  if (result) showToast(`Run เสร็จแล้ว: ${result.score}/100`);
});

learnAiForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const submission = learnAiInput.value.trim();
  const module = state.modules[state.activeIndex];
  if (!submission || !module) return;
  const result = state.lastRun || runLabCheck();
  const challenge = lessonChallenge(module, state.activeIndex);
  const reviewPrompt = [
    `ตรวจงานแบบ AiX Practice Lab`,
    `Mode: ${state.editorMode}`,
    `โจทย์: ${challenge.title}`,
    `คำอธิบายโจทย์: ${challenge.prompt}`,
    `Local run: ${result ? `${result.score}/100 - ${result.verdict}` : "ยังไม่ได้ run"}`,
    "",
    "งานของผู้เรียน:",
    submission
  ].join("\n");
  appendAiMessage("user", `Submit ${state.editorMode}: ${submission.slice(0, 520)}${submission.length > 520 ? "..." : ""}`, "student@aix");
  const pending = appendAiMessage("assistant", "กำลังตรวจงานเทียบกับ rubric, test cases และ knowledge base ของบทนี้...", "teacher@aix", true);
  setAiBusy(true);
  requestAiTeacher(reviewPrompt, "check")
    .then((data) => {
      pending.classList.remove("is-loading");
      const answer = data.answer || localAiAnswer(reviewPrompt, module);
      pending.querySelector("p").textContent = answer;
      if (data.source === "local-fallback") pending.classList.add("fallback");
    })
    .catch(() => {
      pending.classList.remove("is-loading");
      pending.classList.add("fallback");
      pending.querySelector("p").textContent = localAiAnswer(reviewPrompt, module);
      showToast("เชื่อมต่อ AI Teacher ไม่สำเร็จ ระบบใช้คำตอบสำรองจากบทเรียนนี้ก่อน");
    })
    .finally(() => {
      setAiBusy(false);
      learnAiInput.focus();
      learnAiMessages.scrollTop = learnAiMessages.scrollHeight;
    });
});

document.querySelectorAll("[data-ai-command]").forEach((button) => {
  button.addEventListener("click", () => {
    const module = state.modules[state.activeIndex];
    if (!module) return;
    const command = button.dataset.aiCommand;
    if (command === "check") {
      learnAiForm.requestSubmit();
      return;
    }
    if (command === "hint") {
      appendAiMessage("user", "ขอ hint สำหรับโจทย์นี้", "student@aix");
      const pending = appendAiMessage("assistant", "กำลังหา hint จากบทเรียนนี้...", "teacher@aix", true);
      setAiBusy(true);
      requestAiTeacher(`ขอ hint สำหรับโจทย์ ${lessonChallenge(module, state.activeIndex).title} โดยยังไม่เฉลยทั้งหมด`, "ask")
        .then((data) => {
          pending.classList.remove("is-loading");
          const answer = data.answer || localAiAnswer("hint", module);
          pending.querySelector("p").textContent = answer;
        })
        .catch(() => {
          pending.classList.remove("is-loading");
          pending.classList.add("fallback");
          pending.querySelector("p").textContent = localAiAnswer("hint", module);
        })
        .finally(() => setAiBusy(false));
      learnAiInput.focus();
      return;
    }
    appendAiMessage("user", "สรุปโจทย์และ rubric ของบทนี้", "student@aix");
    const pending = appendAiMessage("assistant", "กำลังสรุปโจทย์จาก knowledge base...", "teacher@aix", true);
    setAiBusy(true);
    requestAiTeacher(`สรุปโจทย์ฝึกและ rubric ของ ${lessonChallenge(module, state.activeIndex).title} ให้เป็น checklist สั้นๆ`, "summarize")
      .then((data) => {
        pending.classList.remove("is-loading");
        const answer = data.answer || localAiAnswer("summary", module);
        pending.querySelector("p").textContent = answer;
      })
      .catch(() => {
        pending.classList.remove("is-loading");
        pending.classList.add("fallback");
        pending.querySelector("p").textContent = localAiAnswer("summary", module);
      })
      .finally(() => setAiBusy(false));
  });
});

initLearnPage();
