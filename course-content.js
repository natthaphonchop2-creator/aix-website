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

function assetUrl(value = "") {
  const fallback = "/assets/generated/hero-space-learning.jpg";
  if (!value) return fallback;
  const accepted = AiXDom.safeUrl(value, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true,
    fallback
  });
  if (accepted === fallback || /^https?:\/\//i.test(accepted) || accepted.startsWith("/")) return accepted;
  if (accepted.startsWith("?") || accepted.startsWith("#") || accepted === "about:blank") return fallback;
  return AiXDom.safeUrl(`/${accepted}`, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true,
    fallback
  });
}

function resourceIcon(type = "") {
  const map = {
    tool: "fa-solid fa-screwdriver-wrench",
    skill: "fa-solid fa-brain",
    template: "fa-solid fa-file-lines",
    file: "fa-solid fa-download",
    link: "fa-solid fa-arrow-up-right-from-square"
  };
  return Object.hasOwn(map, type) ? map[type] : "fa-solid fa-toolbox";
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function playableVideo(url = "") {
  return url.startsWith("/api/media/replays/") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
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
  let destination = value || courseStartUrl(courseId);
  if (match) {
    try {
      destination = courseStartUrl(decodeURIComponent(match[1]));
    } catch {
      destination = courseStartUrl(courseId);
    }
  }
  return AiXDom.safeUrl(destination, {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true,
    fallback: courseStartUrl(courseId)
  });
}

function renderContent(data) {
  const { course, modules, resources = [], schedule = [] } = data;
  document.title = `${course.title} | AiX Classroom`;
  document.getElementById("courseTitle").textContent = course.title;
  document.getElementById("classroomNavTitle").textContent = course.title;
  document.getElementById("courseSubtitle").textContent = course.overview || course.description || "";
  document.getElementById("courseImage").src = AiXDom.safeUrl(assetUrl(course.image), {
    allowedProtocols: ["http:", "https:"],
    allowRelative: true,
    fallback: "/assets/generated/hero-space-learning.jpg"
  });
  AiXDom.replace(document.getElementById("courseStats"), [
    ["fa-regular fa-clock", course.duration],
    ["fa-solid fa-list-check", course.lessons],
    ["fa-solid fa-signal", course.level]
  ].map(([icon, text]) => AiXDom.node("span", {}, [
    AiXDom.node("i", { className: icon }),
    text || "-"
  ])));

  document.getElementById("courseOverviewText").textContent = course.overview || course.description || "";
  AiXDom.replace(
    document.getElementById("courseSkillChips"),
    (course.skills || []).map((skill) => AiXDom.node("span", { text: skill }))
  );
  const outcomeNodes = (course.outcomes || []).slice(0, 6).map((outcome) => AiXDom.node("div", {}, [
    AiXDom.node("i", { className: "fa-solid fa-check" }),
    AiXDom.node("span", { text: outcome })
  ]));
  AiXDom.replace(
    document.getElementById("courseOutcomes"),
    outcomeNodes.length
      ? outcomeNodes
      : [AiXDom.node("p", { text: "รายละเอียดผลลัพธ์การเรียนจะแสดงเมื่อมีข้อมูลในคอร์ส" })]
  );
  document.getElementById("heroStartLearning").href = AiXDom.safeUrl(courseLearnUrl(course.id, 0));

  const resourceNodes = resources.length
    ? resources.map((resource) => {
        const href = AiXDom.safeUrl(resource.url || resource.mediaUrl || "#", {
          allowedProtocols: ["http:", "https:"],
          allowRelative: true
        });
        const tags = Array.isArray(resource.tags) ? resource.tags : [];
        return AiXDom.link({ href, className: "member-resource-card" }, [
          AiXDom.node("span", {}, [AiXDom.node("i", { className: resourceIcon(resource.type) })]),
          AiXDom.node("strong", { text: resource.title }),
          AiXDom.node("small", {
            text: resource.description || tags.join(", ") || "Resource สำหรับคลาสนี้"
          })
        ]);
      })
    : [AiXDom.node("article", { className: "resource-card" }, [
        AiXDom.node("h3", { text: "ยังไม่มี Resource" }),
        AiXDom.node("p", { text: "Admin สามารถเพิ่ม Tools, Skill Set หรือ Template จากหน้า Admin" })
      ])];
  AiXDom.replace(document.getElementById("classResources"), resourceNodes);

  const scheduleNodes = schedule.length
    ? schedule.map((item) => AiXDom.node("article", { className: "member-schedule-card" }, [
        AiXDom.node("span", {}, [
          AiXDom.node("i", { className: "fa-regular fa-calendar-check" }),
          formatDateTime(item.startsAt)
        ]),
        AiXDom.node("h3", { text: item.title }),
        AiXDom.node("p", { text: item.description || item.courseTitle || "AiX Live Class" }),
        AiXDom.link({
          href: learningEntryUrl(item.meetingUrl, item.courseId),
          className: "secondary-btn"
        }, ["เข้าห้องเรียน"])
      ]))
    : [AiXDom.node("article", { className: "resource-card" }, [
        AiXDom.node("h3", { text: "ยังไม่มีตารางเรียน" }),
        AiXDom.node("p", { text: "ตารางสอนใหม่จะแสดงที่นี่เมื่อ Admin เพิ่มในระบบ" })
      ])];
  AiXDom.replace(document.getElementById("classSchedule"), scheduleNodes);

  AiXDom.replace(document.getElementById("moduleList"), modules.map((module, index) => (
    AiXDom.node("article", { className: "syllabus-item" }, [
      AiXDom.node("div", { className: "syllabus-number", text: index + 1 }),
      AiXDom.node("div", {}, [
        AiXDom.node("span", { text: module.time || "บทเรียน" }),
        AiXDom.node("h3", { text: module.title }),
        AiXDom.node("ul", {}, (module.lessons || []).map((lesson) => AiXDom.node("li", { text: lesson }))),
        AiXDom.link({
          href: AiXDom.safeUrl(courseLearnUrl(course.id, index)),
          className: "primary-btn compact learn-now-btn"
        }, ["เริ่มเรียนเลย"])
      ])
    ])
  )));
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
