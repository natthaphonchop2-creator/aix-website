const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

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
const toast = document.getElementById("toast");

let toastTimer = null;

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
  }
  return response.json();
}

function requireToken() {
  if (!token()) window.location.replace("/login");
}

function renderCourseCard(course) {
  return `
    <article class="course-card">
      <div class="course-image">
        <img src="${course.image || "assets/generated/hero-space-learning.jpg"}" alt="${course.title}" loading="lazy">
        <span class="course-badge">${course.status || "พร้อมเรียน"}</span>
      </div>
      <div class="course-body">
        <span class="provider">AiX Club</span>
        <h3>${course.title}</h3>
        <p>${course.description || course.subtitle || ""}</p>
        <div class="course-meta">
          <span><i class="fa-regular fa-clock"></i>${course.duration || "-"}</span>
          <span><i class="fa-solid fa-list-check"></i>${course.lessons || "-"}</span>
        </div>
        <a class="primary-btn full" href="/course/${course.id}/content">เข้าเรียน</a>
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
          ${receiptUrl
            ? `<a class="secondary-btn compact" href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener">ดูใบเสร็จ</a>`
            : `<span class="receipt-pending">ยังไม่มีใบเสร็จ</span>`}
        </div>
      </article>
    `;
  }).join("");
}

function renderResources(paid, resources = []) {
  if (!paid) {
    memberResources.innerHTML = [
      ["fa-solid fa-credit-card", "ชำระเงิน", "ปลดล็อกคอร์สและ Resource สำหรับสมาชิก", "/payment"],
      ["fa-solid fa-list-check", "ดูคอร์สทั้งหมด", "สำรวจคลาส AI ที่พร้อมเข้าเรียนหลังชำระเงิน", "/index.html#catalog"],
      ["fa-solid fa-circle-info", "ตรวจข้อมูลบัญชี", "อีเมลและสถานะสมาชิกจะใช้สำหรับออกสิทธิ์เข้าเรียน", "#payment"]
    ].map(([icon, title, copy, href]) => `
      <a class="member-resource-card" href="${href}">
        <span><i class="${icon}"></i></span>
        <strong>${title}</strong>
        <small>${copy}</small>
      </a>
    `).join("");
    return;
  }

  if (!resources.length) {
    memberResources.innerHTML = `<article class="resource-card"><h3>ยังไม่มี Resource</h3><p>เมื่อ Admin เพิ่ม tools หรือ skill set ใหม่ รายการจะแสดงตรงนี้</p></article>`;
    return;
  }

  memberResources.innerHTML = resources.map((resource) => {
    const href = resource.url || resource.filePath || "#";
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

  memberSchedule.innerHTML = schedules.map((item) => `
    <article class="member-schedule-card">
      <span><i class="fa-regular fa-calendar-check"></i>${formatDateTime(item.startsAt)}</span>
      <h3>${item.title}</h3>
      <p>${item.description || item.courseTitle || "AiX Live Class"}</p>
      <a class="secondary-btn" href="${item.meetingUrl || `/course/${item.courseId}/content`}">เข้าห้องเรียน</a>
    </article>
  `).join("");
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

  memberAlerts.innerHTML = notifications.slice(0, 4).map((notice) => `
    <article class="member-alert-card ${notice.status === "unread" ? "unread" : ""}">
      <span><i class="fa-regular fa-bell"></i></span>
      <div>
        <strong>${notice.title}</strong>
        <small>${notice.message}</small>
      </div>
      ${notice.status === "unread" ? `<button type="button" onclick="markNotificationRead('${notice.id}')">อ่านแล้ว</button>` : ""}
    </article>
  `).join("");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function renderDashboard(data) {
  const { member, payment, courses, resources = [], schedule = [], notifications = [], payments = [] } = data;
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));

  memberAvatar.src = member.avatarUrl || "AiX%20logo/iconblack.png";
  memberName.textContent = member.displayName || member.name || "AiX Member";
  memberEmail.textContent = member.email;

  const paid = member.paymentStatus === "paid";
  paymentBadge.textContent = paid ? "ชำระแล้ว" : "ยังไม่ชำระ";
  paymentBadge.classList.toggle("paid", paid);
  paymentTitle.textContent = paid ? "ปลดล็อกคอร์สแล้ว" : "ชำระเงินเพื่อเข้าเรียน";
  paymentCopy.textContent = paid
    ? `สิทธิ์ใช้งานถึง ${formatDate(payment.expiresAt)}`
    : `ยอดชำระ AiX Member ${payment.amount.toLocaleString("th-TH")} บาท ชำระผ่าน Stripe หรือ PromptPay เพื่อปลดล็อกคอร์ส`;
  payBtn.hidden = paid;

  accountStatusText.textContent = member.status === "active" ? "Active" : "Suspended";
  paymentMethodText.textContent = paymentMethodLabel(member);
  expiresAtText.textContent = paid ? formatDate(payment.expiresAt) : "หลังชำระเงิน";
  coursesCountText.textContent = `${courses.length.toLocaleString("th-TH")} คอร์ส`;

  courseSummary.textContent = paid
    ? `คุณมีสิทธิ์เข้าเรียน ${courses.length} คอร์ส`
    : "คอร์สจะถูกปลดล็อกทันทีหลังชำระเงิน";
  memberCourses.innerHTML = paid
    ? courses.map(renderCourseCard).join("")
    : `<article class="resource-card"><h3>ยังไม่ได้ปลดล็อกคอร์ส</h3><p>กดชำระเงินเพื่อเข้าเรียนคอร์ส AiX Club ทั้งหมดที่เปิดให้สมาชิก</p></article>`;
  renderNotifications(paid, notifications);
  renderPaymentHistory(payments, paid);
  renderSchedule(paid, schedule);
  renderResources(paid, resources);
}

async function loadDashboard() {
  requireToken();
  try {
    const data = await apiRequest("/api/member/dashboard");
    renderDashboard(data);
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    window.location.replace("/login");
  }
}

payBtn?.addEventListener("click", () => {
  window.location.href = "/payment";
});

async function markNotificationRead(id) {
  try {
    await apiRequest(`/api/member/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
    const data = await apiRequest("/api/member/dashboard");
    renderDashboard(data);
  } catch (error) {
    showToast(error.message);
  }
}

async function logout() {
  await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("/index.html");
}

document.getElementById("dashboardMobileMenu")?.addEventListener("click", () => {
  document.getElementById("dashboardMobilePanel")?.classList.toggle("open");
});

document.getElementById("logoutBtn")?.addEventListener("click", logout);
document.getElementById("mobileLogoutBtn")?.addEventListener("click", logout);

loadDashboard();
