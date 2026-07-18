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

function courseLearnUrl(courseId, moduleIndex = 0) {
  return `/course/${encodeURIComponent(courseId)}/learn?module=${Math.max(Number(moduleIndex) || 0, 0)}&ready=1`;
}

function learningEntryUrl(href, courseId) {
  const value = String(href || "");
  const match = value.match(/^\/course\/([^/?#]+)\/content(?:[?#].*)?$/);
  if (match) return courseStartUrl(decodeURIComponent(match[1]));
  return value || courseStartUrl(courseId);
}

function liveRoomUrl(scheduleId) {
  return `/live/${encodeURIComponent(scheduleId)}`;
}

function numberFromText(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
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
  const courses = store.courses && typeof store.courses === "object" ? store.courses : {};

  progressList.forEach((progress) => {
    if (!progress?.courseId) return;
    const existing = courses[progress.courseId] || {};
    const serverTime = Date.parse(progress.updatedAt || 0);
    const localTime = Date.parse(existing.updatedAt || 0);
    const shouldUseServer = !existing.courseId
      || Number(progress.completedCount || 0) > Number(existing.completedCount || 0)
      || serverTime >= localTime;
    if (!shouldUseServer) return;

    courses[progress.courseId] = {
      ...existing,
      ...progress,
      completedCount: Number(progress.completedCount || 0),
      totalModules: Number(progress.totalModules || 0),
      activeIndex: Number(progress.activeIndex || 0)
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
  const record = store.courses?.[course.id] || {};
  const total = Math.max(
    Number(record.totalModules) || 0,
    Number(course.lessonsCount) || 0,
    numberFromText(course.lessons)
  );
  const completedRaw = Number(record.completedCount) || 0;
  const completed = total ? Math.min(completedRaw, total) : completedRaw;
  const activeIndex = Math.min(
    Math.max(Number(record.activeIndex) || 0, 0),
    Math.max((total || 1) - 1, 0)
  );
  const percent = total ? Math.round((completed / total) * 100) : 0;
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
  return `
    <article class="course-card member-course-card ${progress.started ? "in-progress" : ""}">
      <div class="course-image">
        <img src="${escapeHtml(course.image || "assets/generated/hero-space-learning.jpg")}" alt="${escapeHtml(course.title)}" loading="lazy">
        <span class="course-badge">${escapeHtml(badge)}</span>
      </div>
      <div class="course-body">
        <span class="provider">AiX Club</span>
        <h3>${escapeHtml(course.title)}</h3>
        <p>${escapeHtml(course.description || course.subtitle || "")}</p>
        <div class="course-progress-row">
          <div><span style="width:${progress.percent}%"></span></div>
          <strong>${escapeHtml(progressLabel(progress))}</strong>
        </div>
        <div class="course-meta">
          <span><i class="fa-regular fa-clock"></i>${escapeHtml(course.duration || "-")}</span>
          <span><i class="fa-solid fa-list-check"></i>${escapeHtml(course.lessons || "-")}</span>
        </div>
        <a class="primary-btn full" href="${escapeHtml(progress.url)}">${actionLabel}</a>
      </div>
    </article>
  `;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
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
  return map[type] || "fa-solid fa-toolbox";
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
  return value ? escapeHtml(method) : "Stripe";
}

function receiptAction(payment, receiptUrl, discount = 0) {
  if (receiptUrl) {
    return `<a class="secondary-btn compact" href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener">ดูใบเสร็จ</a>`;
  }
  const amount = Number(payment.amount || 0);
  const status = String(payment.status || "").toLowerCase();
  if (amount <= 0 && discount > 0) {
    return `<span class="receipt-pending">ส่วนลดเต็มจำนวน ไม่มีการตัดเงินจริง</span>`;
  }
  if (status === "paid") {
    return `<span class="receipt-pending">กำลังรอใบเสร็จจาก Stripe</span>`;
  }
  return `<span class="receipt-pending">ยังไม่มีใบเสร็จ</span>`;
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
    paymentHistory.innerHTML = `
      <article class="payment-history-empty">
        <span><i class="fa-solid fa-receipt"></i></span>
        <div>
          <h3>${paid ? "ยังไม่มีรายการใบเสร็จ" : "ยังไม่มีประวัติชำระเงิน"}</h3>
          <p>${paid ? "รายการเก่าจะถูกนำมาแสดงเมื่อ Stripe ส่งข้อมูล session กลับมา" : "หลังชำระเงินสำเร็จ ระบบจะแสดงรายการและลิงก์ใบเสร็จตรงนี้"}</p>
        </div>
      </article>
    `;
    return;
  }

  paymentHistory.innerHTML = payments.map((payment) => {
    const receiptUrl = payment.receiptUrl || payment.invoiceUrl || "";
    const paidAt = payment.paidAt || payment.createdAt;
    const discount = Number(payment.amountDiscount || 0);
    return `
      <article class="payment-history-card">
        <div class="payment-history-main">
          <span class="payment-history-icon"><i class="fa-solid fa-receipt"></i></span>
          <div>
            <small>${escapeHtml(paymentRecordStatusLabel(payment.status))}</small>
            <h3>${escapeHtml(payment.productName || "AiX Member")}</h3>
            <p>${formatDate(paidAt)} · ${paymentRecordMethodLabel(payment.paymentMethod)}</p>
            ${discount > 0 ? `<p class="payment-discount">ส่วนลด ${formatMoney(discount, payment.currency)}${payment.couponName ? ` · ${escapeHtml(payment.couponName)}` : ""}</p>` : ""}
          </div>
        </div>
        <div class="payment-history-side">
          <strong>${formatMoney(payment.amount, payment.currency)}</strong>
          ${receiptAction(payment, receiptUrl, discount)}
        </div>
      </article>
    `;
  }).join("");
}

function renderResources(paid, resources = []) {
  if (!paid) {
    memberResources.innerHTML = [
      ["fa-solid fa-credit-card", "ชำระเงิน", "ปลดล็อกคอร์สและ Resource สำหรับสมาชิก", "/payment"],
      ["fa-solid fa-toolbox", "Tools Box", "ปลดล็อก Skill Set, Ebook, Prompt Pack และ Template", "/payment"],
      ["fa-solid fa-list-check", "ดูคอร์สทั้งหมด", "สำรวจคลาส AI ที่พร้อมเข้าเรียนหลังชำระเงิน", "/index.html#catalog"]
    ].map(([icon, title, copy, href]) => `
      <a class="member-resource-card" href="${href}">
        <span><i class="${icon}"></i></span>
        <strong>${title}</strong>
        <small>${copy}</small>
      </a>
    `).join("");
    return;
  }

  const toolsBoxCard = `
    <a class="member-resource-card tools-box-entry" href="/tools-box">
      <span><i class="fa-solid fa-toolbox"></i></span>
      <strong>เปิด Tools Box</strong>
      <small>เข้า Skill Set, Ebook, Prompt Pack, Workflow Blueprint และ Template ทั้งหมด</small>
    </a>
  `;

  if (!resources.length) {
    memberResources.innerHTML = `${toolsBoxCard}<article class="resource-card"><h3>ยังไม่มี Resource เพิ่มเติม</h3><p>เริ่มใช้งานจาก Tools Box ได้เลย เมื่อ Admin เพิ่มไฟล์ใหม่ รายการจะแสดงตรงนี้</p></article>`;
    return;
  }

  memberResources.innerHTML = toolsBoxCard + resources.map((resource) => {
    const rawHref = resource.url || resource.mediaUrl || "#";
    const href = rawHref === "/dashboard" ? "/tools-box#resources" : rawHref;
    const external = /^https?:\/\//.test(href);
    return `
      <a class="member-resource-card" href="${href}" ${external ? 'target="_blank" rel="noopener"' : ""}>
        <span><i class="${resourceIcon(resource.type)}"></i></span>
        <strong>${resource.title}</strong>
        <small>${resource.description || (resource.tags || []).join(", ") || "Resource สำหรับสมาชิก"}</small>
      </a>
    `;
  }).join("");
}

function renderSchedule(paid, schedules = []) {
  if (!paid) {
    memberSchedule.innerHTML = `<article class="resource-card"><h3>ยังไม่ปลดล็อกตารางเรียน</h3><p>ชำระเงินเพื่อดูตารางคลาสสดและลิงก์เข้าเรียน</p></article>`;
    return;
  }

  if (!schedules.length) {
    memberSchedule.innerHTML = `<article class="resource-card"><h3>ยังไม่มีตารางเรียนใหม่</h3><p>เมื่อมีตารางสอนใหม่ ระบบจะแจ้งเตือนใน Dashboard นี้</p></article>`;
    return;
  }

  memberSchedule.innerHTML = schedules.map((item) => {
    const status = scheduleStatus(item.startsAt, item.endsAt);
    return `
    <article class="member-schedule-card live-class-card ${status.className}">
      <div class="live-class-top">
        <span class="live-class-badge"><i class="fa-solid fa-video"></i> สอนสดออนไลน์</span>
        <strong>${escapeHtml(status.label)}</strong>
      </div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description || item.courseTitle || "AiX Live Class")}</p>
      <div class="live-class-meta">
        <span><i class="fa-regular fa-calendar-check"></i>${formatDateTime(item.startsAt)}</span>
        ${item.courseTitle ? `<span><i class="fa-solid fa-graduation-cap"></i>${escapeHtml(item.courseTitle)}</span>` : ""}
        ${item.meetingUrl ? `<span><i class="fa-solid fa-video"></i>Google Meet พร้อม</span>` : `<span><i class="fa-solid fa-link-slash"></i>รอลิงก์ Meet</span>`}
      </div>
      <a class="primary-btn full" href="${escapeHtml(liveRoomUrl(item.id))}">${status.live ? "เข้าห้องสอนสดตอนนี้" : "เตรียมเข้าเรียนสด"}</a>
    </article>
  `;
  }).join("");
}

function renderNotifications(paid, notifications = []) {
  if (!paid) {
    memberAlerts.innerHTML = `<article class="member-alert-card"><span><i class="fa-solid fa-lock"></i></span><div><strong>แจ้งเตือนจะเปิดหลังชำระเงิน</strong><small>ระบบจะใช้ Dashboard นี้แจ้งตารางสอนและประกาศสำคัญ</small></div></article>`;
    return;
  }

  if (!notifications.length) {
    memberAlerts.innerHTML = `<article class="member-alert-card"><span><i class="fa-regular fa-bell"></i></span><div><strong>ยังไม่มีแจ้งเตือนใหม่</strong><small>ตารางสอนใหม่จะขึ้นตรงนี้อัตโนมัติ</small></div></article>`;
    return;
  }

  memberAlerts.innerHTML = notifications.slice(0, 4).map((notice) => {
    const isLiveNotice = Boolean(notice.scheduleId) || /ตาราง|สอน|เรียนสด|live/i.test(`${notice.title} ${notice.message}`);
    return `
    <article class="member-alert-card ${notice.status === "unread" ? "unread" : ""} ${isLiveNotice ? "live-notice-card" : ""}">
      <span><i class="${isLiveNotice ? "fa-solid fa-video" : "fa-regular fa-bell"}"></i></span>
      <div>
        ${isLiveNotice ? `<em>สอนสดออนไลน์</em>` : ""}
        <strong>${escapeHtml(notice.title)}</strong>
        <small>${escapeHtml(notice.message)}</small>
      </div>
      ${notice.status === "unread" ? `<button type="button" onclick="markNotificationRead('${notice.id}')">อ่านแล้ว</button>` : ""}
    </article>
  `;
  }).join("");
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

  memberAvatar.src = member.avatarUrl || "AiX%20logo/iconblack.png";
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
  memberCourses.innerHTML = paid
    ? courses.map(renderCourseCard).join("")
    : `<article class="resource-card"><h3>${expired ? "สมาชิกหมดอายุแล้ว" : "ยังไม่ได้ปลดล็อกคอร์ส"}</h3><p>${expired ? "ต่ออายุสมาชิกเพื่อกลับเข้าเรียนคอร์ส AiX Club" : "กดชำระเงินเพื่อเข้าเรียนคอร์ส AiX Club ทั้งหมดที่เปิดให้สมาชิก"}</p></article>`;
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
