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

const memberAvatar = document.getElementById("memberAvatar");
const memberName = document.getElementById("memberName");
const memberEmail = document.getElementById("memberEmail");
const paymentBadge = document.getElementById("paymentBadge");
const paymentTitle = document.getElementById("paymentTitle");
const paymentCopy = document.getElementById("paymentCopy");
const payBtn = document.getElementById("payBtn");
const memberCourses = document.getElementById("memberCourses");
const courseSummary = document.getElementById("courseSummary");
const accountStatusText = document.getElementById("accountStatusText");
const paymentMethodText = document.getElementById("paymentMethodText");
const expiresAtText = document.getElementById("expiresAtText");
const coursesCountText = document.getElementById("coursesCountText");
const memberResources = document.getElementById("memberResources");
const memberAlerts = document.getElementById("memberAlerts");
const memberSchedule = document.getElementById("memberSchedule");
const paymentHistory = document.getElementById("paymentHistory");
const continueLearningTitle = document.getElementById("continueLearningTitle");
const continueLearningMeta = document.getElementById("continueLearningMeta");
const continueProgressBar = document.getElementById("continueProgressBar");
const continueProgressText = document.getElementById("continueProgressText");
const continueLearningLink = document.getElementById("continueLearningLink");
const quickContinueLink = document.getElementById("quickContinueLink");
const toast = document.getElementById("toast");
const dashboardNavLinks = Array.from(document.querySelectorAll("[data-dashboard-nav]"));
const dashboardMobilePanel = document.getElementById("dashboardMobilePanel");
const dashboardMobileMenu = document.getElementById("dashboardMobileMenu");
const PROGRESS_KEY = "aix_learning_progress_v1";
const MAX_PROGRESS_MODULES = 10000;

let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function courseStartUrl(courseId) {
  return `/course/${encodeURIComponent(courseId)}/start`;
}

function boundedProgressNumber(value, maximum = MAX_PROGRESS_MODULES) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 0;
  const finiteMaximum = Number.isFinite(maximum)
    ? Math.max(Math.floor(maximum), 0)
    : MAX_PROGRESS_MODULES;
  return Math.min(Math.floor(number), finiteMaximum);
}

function courseLearnUrl(courseId, moduleIndex = 0) {
  const safeIndex = boundedProgressNumber(moduleIndex, MAX_PROGRESS_MODULES - 1);
  return `/course/${encodeURIComponent(courseId)}/learn?module=${safeIndex}&ready=1`;
}

function liveRoomUrl(scheduleId) {
  return `/live/${encodeURIComponent(scheduleId)}`;
}

function numberFromText(value) {
  const match = String(value || "").match(/\d+/);
  return match ? boundedProgressNumber(match[0]) : 0;
}

function readLearningProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function mergeServerProgress(progressList = []) {
  if (!Array.isArray(progressList) || !progressList.length) return;
  const store = readLearningProgress();
  const storedCourses = store.courses && typeof store.courses === "object" ? store.courses : {};
  const courses = Object.assign(Object.create(null), storedCourses);

  progressList.forEach((progress) => {
    if (!progress?.courseId) return;
    const courseId = String(progress.courseId);
    const existing = Object.hasOwn(courses, courseId) && courses[courseId] && typeof courses[courseId] === "object"
      ? courses[courseId]
      : {};
    const serverCompleted = boundedProgressNumber(progress.completedCount);
    const localCompleted = boundedProgressNumber(existing.completedCount);
    const serverTime = Date.parse(progress.updatedAt || 0);
    const localTime = Date.parse(existing.updatedAt || 0);
    const shouldUseServer = !existing.courseId
      || serverCompleted > localCompleted
      || serverTime >= localTime;
    if (!shouldUseServer) return;

    courses[courseId] = {
      ...existing,
      ...progress,
      completedCount: serverCompleted,
      totalModules: boundedProgressNumber(progress.totalModules),
      activeIndex: boundedProgressNumber(progress.activeIndex, MAX_PROGRESS_MODULES - 1)
    };
  });

  const latestCourseId = Object.values(courses)
    .sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0))[0]?.courseId || store.latestCourseId;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    ...store,
    latestCourseId,
    courses
  }));
}

function courseLearningProgress(course) {
  const store = readLearningProgress();
  const storedCourses = store.courses && typeof store.courses === "object" ? store.courses : {};
  const candidate = Object.hasOwn(storedCourses, course.id) ? storedCourses[course.id] : null;
  const record = candidate && typeof candidate === "object" ? candidate : {};
  const total = Math.max(
    boundedProgressNumber(record.totalModules),
    boundedProgressNumber(course.lessonsCount),
    numberFromText(course.lessons)
  );
  const completedRaw = boundedProgressNumber(record.completedCount);
  const completed = total ? Math.min(completedRaw, total) : completedRaw;
  const activeIndex = boundedProgressNumber(record.activeIndex, Math.max((total || 1) - 1, 0));
  const percent = total ? boundedProgressNumber(Math.round((completed / total) * 100), 100) : 0;
  const started = completed > 0;
  return {
    ...record,
    activeIndex,
    completedCount: completed,
    totalModules: total,
    percent,
    started,
    url: started ? courseLearnUrl(course.id, activeIndex) : courseStartUrl(course.id)
  };
}

function latestLearningProgress(courses = []) {
  const candidates = courses.map((course) => ({
    course,
    progress: courseLearningProgress(course)
  }));
  return candidates
    .filter((item) => item.progress.started)
    .sort((a, b) => Date.parse(b.progress.updatedAt || 0) - Date.parse(a.progress.updatedAt || 0))[0]
    || candidates[0]
    || null;
}

function progressLabel(progress) {
  if (!progress?.started) return "ยังไม่ได้เริ่มเรียน";
  if (!progress.totalModules) return "เริ่มเรียนแล้ว";
  return `เรียนไปแล้ว ${progress.completedCount}/${progress.totalModules} บท · ${progress.percent}%`;
}

function renderCourseCard(course) {
  const progress = courseLearningProgress(course);
  const actionLabel = progress.started ? "เรียนต่อ" : "เริ่มเรียน";
  const badge = progress.started ? `เรียนแล้ว ${progress.percent}%` : (course.status || "พร้อมเรียน");
  const progressFill = AiXDom.node("span");
  progressFill.style.width = `${progress.percent}%`;
  return AiXDom.node("article", { className: `course-card member-course-card ${progress.started ? "in-progress" : ""}` }, [
    AiXDom.node("div", { className: "course-image" }, [
      AiXDom.node("img", {
        attrs: { alt: course.title, loading: "lazy" },
        urls: { src: { value: course.image, options: { fallback: "assets/generated/hero-space-learning.jpg" } } }
      }),
      AiXDom.node("span", { className: "course-badge", text: badge })
    ]),
    AiXDom.node("div", { className: "course-body" }, [
      AiXDom.node("span", { className: "provider", text: "AiX Club" }),
      AiXDom.node("h3", { text: course.title }),
      AiXDom.node("p", { text: course.description || course.subtitle || "" }),
      AiXDom.node("div", { className: "course-progress-row" }, [
        AiXDom.node("div", {}, [progressFill]),
        AiXDom.node("strong", { text: progressLabel(progress) })
      ]),
      AiXDom.node("div", { className: "course-meta" }, [
        AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-regular fa-clock" }), course.duration || "-"]),
        AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-list-check" }), course.lessons || "-"])
      ]),
      AiXDom.link({ href: AiXDom.safeUrl(progress.url), className: "primary-btn full" }, [actionLabel])
    ])
  ]);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function formatMoney(amount, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: String(currency || "THB").toUpperCase()
  }).format(Number(amount || 0) / 100);
}

function paymentMethodLabel(member) {
  const method = String(member.paymentMethod || member.payment || "").toLowerCase();
  if (method === "promptpay") return "PromptPay ผ่าน Stripe";
  if (method === "card") return "บัตรผ่าน Stripe";
  if (method.includes("stripe")) return "Stripe";
  return member.paymentStatus === "paid" ? "ชำระแล้ว" : "ยังไม่ชำระ";
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

function paymentRecordStatusLabel(status = "") {
  const value = String(status).toLowerCase();
  if (value === "paid") return "ชำระแล้ว";
  if (value === "unpaid") return "ยังไม่ชำระ";
  if (value === "open" || value === "pending") return "รอดำเนินการ";
  if (value === "refunded") return "คืนเงินแล้ว";
  return value || "ไม่ทราบสถานะ";
}

function paymentRecordMethodLabel(method = "") {
  const value = String(method).toLowerCase();
  if (value === "promptpay") return "PromptPay";
  if (value === "card") return "บัตรเครดิต / เดบิต";
  if (value.includes("card")) return "บัตรเครดิต / เดบิต";
  if (value.includes("promptpay")) return "PromptPay";
  return value ? String(method) : "Stripe";
}

function receiptAction(payment, receiptUrl, discount = 0) {
  if (receiptUrl) {
    return AiXDom.link({ href: AiXDom.safeUrl(receiptUrl), className: "secondary-btn compact" }, ["ดูใบเสร็จ"]);
  }
  const amount = Number(payment.amount || 0);
  const status = String(payment.status || "").toLowerCase();
  if (amount <= 0 && discount > 0) {
    return AiXDom.node("span", { className: "receipt-pending", text: "ส่วนลดเต็มจำนวน ไม่มีการตัดเงินจริง" });
  }
  if (status === "paid") {
    return AiXDom.node("span", { className: "receipt-pending", text: "กำลังรอใบเสร็จจาก Stripe" });
  }
  return AiXDom.node("span", { className: "receipt-pending", text: "ยังไม่มีใบเสร็จ" });
}

function renderContinueLearning(paid, courses = [], expired = false) {
  if (!continueLearningTitle || !continueLearningLink) return;

  if (!paid) {
    continueLearningTitle.textContent = expired ? "สมาชิกหมดอายุแล้ว" : "ยังไม่ได้ปลดล็อกคอร์ส";
    continueLearningMeta.textContent = expired
      ? "ต่ออายุสมาชิกเพื่อกลับเข้าเรียนต่อจากบทล่าสุด"
      : "ชำระเงินเพื่อเริ่มเรียนและให้ระบบจำบทล่าสุด";
    continueProgressBar.style.width = "0%";
    continueProgressText.textContent = "0%";
    continueLearningLink.href = "/payment";
    continueLearningLink.textContent = expired ? "ต่ออายุสมาชิก" : "ชำระเงินเพื่อเข้าเรียน";
    if (quickContinueLink) quickContinueLink.href = "/payment";
    quickContinueLink?.querySelector("span") && (quickContinueLink.querySelector("span").textContent = expired ? "ต่ออายุสมาชิก" : "ชำระเงินก่อนเรียน");
    return;
  }

  const latest = latestLearningProgress(courses);
  if (!latest) {
    continueLearningTitle.textContent = "ยังไม่มีคอร์สพร้อมเรียน";
    continueLearningMeta.textContent = "เมื่อมีคอร์สใหม่ ระบบจะแสดงปุ่มเรียนต่อที่นี่";
    continueProgressBar.style.width = "0%";
    continueProgressText.textContent = "0%";
    continueLearningLink.href = "#courses";
    continueLearningLink.textContent = "ดูคอร์สของฉัน";
    if (quickContinueLink) quickContinueLink.href = "#courses";
    quickContinueLink?.querySelector("span") && (quickContinueLink.querySelector("span").textContent = "ดูคอร์สของฉัน");
    return;
  }

  const { course, progress } = latest;
  continueLearningTitle.textContent = course.title;
  continueLearningMeta.textContent = progress.started
    ? `บทล่าสุด: ${progress.moduleTitle || `รายการที่ ${progress.activeIndex + 1}`}`
    : "เริ่มคอร์สนี้เป็นคอร์สแรก";
  continueProgressBar.style.width = `${progress.percent}%`;
  continueProgressText.textContent = progress.started ? `${progress.percent}%` : "0%";
  continueLearningLink.href = progress.url;
  continueLearningLink.textContent = progress.started ? "เรียนต่อจากล่าสุด" : "เริ่มเรียน";
  if (quickContinueLink) quickContinueLink.href = progress.url;
  quickContinueLink?.querySelector("span") && (quickContinueLink.querySelector("span").textContent = progress.started ? "เรียนต่อจากล่าสุด" : "เริ่มเรียน");
}

function renderPaymentHistory(payments = [], paid = false) {
  if (!paymentHistory) return;
  if (!payments.length) {
    AiXDom.replace(paymentHistory, [AiXDom.node("article", { className: "payment-history-empty" }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-receipt" })]),
      AiXDom.node("div", {}, [
        AiXDom.node("h3", { text: paid ? "ยังไม่มีรายการใบเสร็จ" : "ยังไม่มีประวัติชำระเงิน" }),
        AiXDom.node("p", { text: paid ? "รายการเก่าจะถูกนำมาแสดงเมื่อ Stripe ส่งข้อมูล session กลับมา" : "หลังชำระเงินสำเร็จ ระบบจะแสดงรายการและลิงก์ใบเสร็จตรงนี้" })
      ])
    ])]);
    return;
  }

  AiXDom.replace(paymentHistory, payments.map((payment) => {
    const receiptUrl = payment.receiptUrl || payment.invoiceUrl || "";
    const paidAt = payment.paidAt || payment.createdAt;
    const discount = Number(payment.amountDiscount || 0);
    const discountNode = discount > 0
      ? AiXDom.node("p", {
          className: "payment-discount",
          text: `ส่วนลด ${formatMoney(discount, payment.currency)}${payment.couponName ? ` · ${payment.couponName}` : ""}`
        })
      : null;
    return AiXDom.node("article", { className: "payment-history-card" }, [
      AiXDom.node("div", { className: "payment-history-main" }, [
        AiXDom.node("span", { className: "payment-history-icon" }, [AiXDom.node("i", { className: "fa-solid fa-receipt" })]),
        AiXDom.node("div", {}, [
          AiXDom.node("small", { text: paymentRecordStatusLabel(payment.status) }),
          AiXDom.node("h3", { text: payment.productName || "AiX Member" }),
          AiXDom.node("p", { text: `${formatDate(paidAt)} · ${paymentRecordMethodLabel(payment.paymentMethod)}` }),
          discountNode
        ])
      ]),
      AiXDom.node("div", { className: "payment-history-side" }, [
        AiXDom.node("strong", { text: formatMoney(payment.amount, payment.currency) }),
        receiptAction(payment, receiptUrl, discount)
      ])
    ]);
  }));
}

function renderResources(paid, resources = []) {
  if (!paid) {
    AiXDom.replace(memberResources, [
      ["fa-solid fa-credit-card", "ชำระเงิน", "ปลดล็อกคอร์สและ Resource สำหรับสมาชิก", "/payment"],
      ["fa-solid fa-toolbox", "Tools Box", "ปลดล็อก Skill Set, Ebook, Prompt Pack และ Template", "/payment"],
      ["fa-solid fa-list-check", "ดูคอร์สทั้งหมด", "สำรวจคลาส AI ที่พร้อมเข้าเรียนหลังชำระเงิน", "/index.html#catalog"]
    ].map(([icon, title, copy, href]) => AiXDom.link({ href: AiXDom.safeUrl(href), className: "member-resource-card" }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: icon })]),
      AiXDom.node("strong", { text: title }),
      AiXDom.node("small", { text: copy })
    ])));
    return;
  }

  const toolsBoxCard = AiXDom.link({ href: AiXDom.safeUrl("/tools-box"), className: "member-resource-card tools-box-entry" }, [
    AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-toolbox" })]),
    AiXDom.node("strong", { text: "เปิด Tools Box" }),
    AiXDom.node("small", { text: "เข้า Skill Set, Ebook, Prompt Pack, Workflow Blueprint และ Template ทั้งหมด" })
  ]);

  if (!resources.length) {
    AiXDom.replace(memberResources, [toolsBoxCard, AiXDom.node("article", { className: "resource-card" }, [
      AiXDom.node("h3", { text: "ยังไม่มี Resource เพิ่มเติม" }),
      AiXDom.node("p", { text: "เริ่มใช้งานจาก Tools Box ได้เลย เมื่อ Admin เพิ่มไฟล์ใหม่ รายการจะแสดงตรงนี้" })
    ])]);
    return;
  }

  AiXDom.replace(memberResources, [toolsBoxCard, ...resources.map((resource) => {
    const rawHref = resource.url || resource.mediaUrl || "#";
    const href = rawHref === "/dashboard" ? "/tools-box#resources" : rawHref;
    const tags = Array.isArray(resource.tags) ? resource.tags : [];
    return AiXDom.link({ href: AiXDom.safeUrl(href), className: "member-resource-card" }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: resourceIcon(resource.type) })]),
      AiXDom.node("strong", { text: resource.title }),
      AiXDom.node("small", { text: resource.description || tags.join(", ") || "Resource สำหรับสมาชิก" })
    ]);
  })]);
}

function renderSchedule(paid, schedules = []) {
  if (!paid) {
    AiXDom.replace(memberSchedule, [AiXDom.node("article", { className: "resource-card" }, [
      AiXDom.node("h3", { text: "ยังไม่ปลดล็อกตารางเรียน" }),
      AiXDom.node("p", { text: "ชำระเงินเพื่อดูตารางคลาสสดและลิงก์เข้าเรียน" })
    ])]);
    return;
  }

  if (!schedules.length) {
    AiXDom.replace(memberSchedule, [AiXDom.node("article", { className: "resource-card" }, [
      AiXDom.node("h3", { text: "ยังไม่มีตารางเรียนใหม่" }),
      AiXDom.node("p", { text: "เมื่อมีตารางสอนใหม่ ระบบจะแจ้งเตือนใน Dashboard นี้" })
    ])]);
    return;
  }

  AiXDom.replace(memberSchedule, schedules.map((item) => {
    const status = scheduleStatus(item.startsAt, item.endsAt);
    return AiXDom.node("article", { className: `member-schedule-card live-class-card ${status.className}` }, [
      AiXDom.node("div", { className: "live-class-top" }, [
        AiXDom.node("span", { className: "live-class-badge" }, [AiXDom.node("i", { className: "fa-solid fa-video" }), " สอนสดออนไลน์"]),
        AiXDom.node("strong", { text: status.label })
      ]),
      AiXDom.node("h3", { text: item.title }),
      AiXDom.node("p", { text: item.description || item.courseTitle || "AiX Live Class" }),
      AiXDom.node("div", { className: "live-class-meta" }, [
        AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-regular fa-calendar-check" }), formatDateTime(item.startsAt)]),
        item.courseTitle ? AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-graduation-cap" }), item.courseTitle]) : null,
        AiXDom.node("span", {}, [
          AiXDom.node("i", { className: item.meetingUrl ? "fa-solid fa-video" : "fa-solid fa-link-slash" }),
          item.meetingUrl ? "Google Meet พร้อม" : "รอลิงก์ Meet"
        ])
      ]),
      AiXDom.link({ href: AiXDom.safeUrl(liveRoomUrl(item.id)), className: "primary-btn full" }, [status.live ? "เข้าห้องสอนสดตอนนี้" : "เตรียมเข้าเรียนสด"])
    ]);
  }));
}

function renderNotifications(paid, notifications = []) {
  if (!paid) {
    AiXDom.replace(memberAlerts, [AiXDom.node("article", { className: "member-alert-card" }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-solid fa-lock" })]),
      AiXDom.node("div", {}, [
        AiXDom.node("strong", { text: "แจ้งเตือนจะเปิดหลังชำระเงิน" }),
        AiXDom.node("small", { text: "ระบบจะใช้ Dashboard นี้แจ้งตารางสอนและประกาศสำคัญ" })
      ])
    ])]);
    return;
  }

  if (!notifications.length) {
    AiXDom.replace(memberAlerts, [AiXDom.node("article", { className: "member-alert-card" }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: "fa-regular fa-bell" })]),
      AiXDom.node("div", {}, [
        AiXDom.node("strong", { text: "ยังไม่มีแจ้งเตือนใหม่" }),
        AiXDom.node("small", { text: "ตารางสอนใหม่จะขึ้นตรงนี้อัตโนมัติ" })
      ])
    ])]);
    return;
  }

  AiXDom.replace(memberAlerts, notifications.slice(0, 4).map((notice) => {
    const isLiveNotice = Boolean(notice.scheduleId) || /ตาราง|สอน|เรียนสด|live/i.test(`${notice.title} ${notice.message}`);
    const unread = notice.status === "unread";
    const readButton = unread ? AiXDom.node("button", { text: "อ่านแล้ว", attrs: { type: "button" } }) : null;
    readButton?.addEventListener("click", () => markNotificationRead(notice.id));
    return AiXDom.node("article", { className: `member-alert-card ${unread ? "unread" : ""} ${isLiveNotice ? "live-notice-card" : ""}` }, [
      AiXDom.node("span", {}, [AiXDom.node("i", { className: isLiveNotice ? "fa-solid fa-video" : "fa-regular fa-bell" })]),
      AiXDom.node("div", {}, [
        isLiveNotice ? AiXDom.node("em", { text: "สอนสดออนไลน์" }) : null,
        AiXDom.node("strong", { text: notice.title }),
        AiXDom.node("small", { text: notice.message })
      ]),
      readButton
    ]);
  }));
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function scheduleStatus(startsAt, endsAt) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isNaN(start)) return { label: "รอตารางเวลา", className: "", live: false };
  const now = Date.now();
  const liveEnd = Number.isNaN(end) ? start + (2 * 60 * 60 * 1000) : end;
  if (now >= start && now <= liveEnd) return { label: "กำลังสอนสด", className: "is-live", live: true };
  const diff = start - now;
  if (diff < 0) return { label: "เพิ่งจบคลาส", className: "is-recent", live: false };
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return { label: `เริ่มใน ${minutes} นาที`, className: "is-soon", live: false };
  const hours = Math.round(diff / 3600000);
  if (hours < 24) return { label: `วันนี้ · อีก ${hours} ชม.`, className: "is-soon", live: false };
  const days = Math.ceil(diff / 86400000);
  return { label: `อีก ${days} วัน`, className: "", live: false };
}

function renderDashboard(data) {
  const { member, payment, courses, resources = [], schedule = [], notifications = [], payments = [], progress = [] } = data;
  mergeServerProgress(progress);

  memberAvatar.src = AiXDom.safeUrl(member.avatarUrl, { fallback: "AiX%20logo/iconblack.png" });
  memberName.textContent = member.displayName || member.name || "AiX Member";
  memberEmail.textContent = member.email;

  const paid = Boolean(payment.active);
  const expired = Boolean(payment.expired);
  const phoneVerified = Boolean(member.phoneVerified);
  paymentBadge.textContent = paid ? "ชำระแล้ว" : expired ? "หมดอายุ" : "ยังไม่ชำระ";
  paymentBadge.classList.toggle("paid", paid);
  paymentBadge.classList.toggle("expired", expired);
  paymentTitle.textContent = paid
    ? "ปลดล็อกคอร์สแล้ว"
    : !phoneVerified
      ? "ยืนยันเบอร์ก่อนชำระเงิน"
      : expired
        ? "สมาชิกหมดอายุแล้ว"
        : "ชำระเงินเพื่อเข้าเรียน";
  paymentCopy.textContent = paid
    ? `สิทธิ์ใช้งานถึง ${formatDate(payment.expiresAt)}`
    : !phoneVerified
      ? "สมัครเรียบร้อยแล้ว กรุณายืนยันเบอร์โทรด้วย SMS ก่อนเข้าสู่ขั้นตอนชำระเงิน"
      : expired
        ? `สิทธิ์ใช้งานหมดอายุเมื่อ ${formatDate(payment.expiresAt)} ต่ออายุเพื่อเข้าเรียนต่อ`
        : `ยอดชำระ AiX Member ${payment.amount.toLocaleString("th-TH")} บาท ชำระผ่าน Stripe หรือ PromptPay เพื่อปลดล็อกคอร์ส`;
  payBtn.hidden = paid;
  payBtn.textContent = !phoneVerified ? "ยืนยันเบอร์ก่อนชำระเงิน" : expired ? "ต่ออายุสมาชิก" : "ชำระเงินเพื่อเข้าเรียน";

  accountStatusText.textContent = member.status === "active" ? "Active" : "Suspended";
  paymentMethodText.textContent = expired ? "หมดอายุ" : paymentMethodLabel(member);
  expiresAtText.textContent = paid || expired ? formatDate(payment.expiresAt) : "หลังชำระเงิน";
  coursesCountText.textContent = `${courses.length.toLocaleString("th-TH")} คอร์ส`;
  renderContinueLearning(paid, courses, expired);

  courseSummary.textContent = paid
    ? `คุณมีสิทธิ์เข้าเรียน ${courses.length} คอร์ส`
    : expired
      ? "ต่ออายุสมาชิกเพื่อปลดล็อกคอร์สอีกครั้ง"
    : "คอร์สจะถูกปลดล็อกทันทีหลังชำระเงิน";
  AiXDom.replace(memberCourses, paid
    ? courses.map(renderCourseCard)
    : [AiXDom.node("article", { className: "resource-card" }, [
        AiXDom.node("h3", { text: expired ? "สมาชิกหมดอายุแล้ว" : "ยังไม่ได้ปลดล็อกคอร์ส" }),
        AiXDom.node("p", { text: expired ? "ต่ออายุสมาชิกเพื่อกลับเข้าเรียนคอร์ส AiX Club" : "กดชำระเงินเพื่อเข้าเรียนคอร์ส AiX Club ทั้งหมดที่เปิดให้สมาชิก" })
      ])]);
  renderSchedule(paid, schedule);
  renderPaymentHistory(payments, paid);
  renderResources(paid, resources);
  renderNotifications(paid, notifications);
  document.body.classList.add("dashboard-ready");
}

async function loadDashboard() {
  try {
    await bootstrapMemberSession();
    const data = await apiRequest("/api/member/dashboard");
    renderDashboard(data);
  } catch (error) {
    if (error.status === 401) {
      memberApi.clear();
      window.location.replace("/index.html?auth=login");
      return;
    }
    showToast(error.message || "ไม่สามารถโหลด Dashboard ได้");
  }
}

payBtn?.addEventListener("click", () => {
  window.location.href = "/payment";
});

async function markNotificationRead(id) {
  try {
    await bootstrapMemberSession();
    await apiRequest(`/api/member/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
    const data = await apiRequest("/api/member/dashboard");
    renderDashboard(data);
  } catch (error) {
    showToast(error.message);
  }
}

async function logout() {
  try {
    await memberApi.logout("/api/auth/logout");
  } catch (error) {
    showToast("ออกจากระบบไม่สำเร็จ ระบบยังคงสถานะเข้าสู่ระบบไว้ กรุณาลองใหม่");
    return false;
  }
  memberSessionPromise = null;
  window.location.replace("/index.html");
  return true;
}

function setActiveDashboardNav(id) {
  dashboardNavLinks.forEach((link) => {
    const linkId = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", linkId === id);
  });
}

function setupDashboardNav() {
  if (!dashboardNavLinks.length) return;

  dashboardNavLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.replace("#", "");
      if (id) setActiveDashboardNav(id);
      dashboardMobilePanel?.classList.remove("open");
    });
  });

  const sections = [...new Set(dashboardNavLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean))];

  if (!("IntersectionObserver" in window) || !sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) setActiveDashboardNav(visible.target.id);
  }, {
    rootMargin: "-25% 0px -58% 0px",
    threshold: [0.12, 0.35, 0.65]
  });

  sections.forEach((section) => observer.observe(section));
}

dashboardMobileMenu?.addEventListener("click", () => {
  dashboardMobilePanel?.classList.toggle("open");
});

document.getElementById("logoutBtn")?.addEventListener("click", logout);
document.getElementById("mobileLogoutBtn")?.addEventListener("click", logout);

setupDashboardNav();
loadDashboard();
