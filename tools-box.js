const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

const toolsAccessBadge = document.getElementById("toolsAccessBadge");
const toolsMemberName = document.getElementById("toolsMemberName");
const toolsDynamicResources = document.getElementById("toolsDynamicResources");
const toolsLockedState = document.getElementById("toolsLockedState");
const toolsLockedAction = toolsLockedState?.querySelector("a.primary-btn");
const toolsMobileMenu = document.getElementById("toolsMobileMenu");
const toolsMobilePanel = document.getElementById("toolsMobilePanel");
const toast = document.getElementById("toast");

let toastTimer = null;

function showToast(message) {
  if (!toast) return;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
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

function resourceHref(resource) {
  const href = resource.url || resource.filePath || "#resources";
  if (href === "/dashboard") return "/tools-box#resources";
  return href;
}

function defaultResources() {
  return [
    {
      type: "skill",
      title: "Skill Set Starter",
      description: "เริ่มจาก Prompt Structure, AI Agent Thinking และ Automation Mapping",
      url: "#skill-set",
      tags: ["Skill Set", "AI Agent"]
    },
    {
      type: "file",
      title: "Ebook Library",
      description: "คู่มืออ่านประกอบและ playbook จะถูกรวมไว้ในหมวด Ebook",
      url: "#ebook",
      tags: ["Ebook", "PDF"]
    },
    {
      type: "template",
      title: "Prompt & Workflow Templates",
      description: "ชุด prompt, checklist และ blueprint สำหรับเอาไปปรับใช้กับงานจริง",
      url: "#prompt-pack",
      tags: ["Prompt", "Template"]
    }
  ];
}

function renderResources(resources = []) {
  const list = resources.length ? resources : defaultResources();
  toolsDynamicResources.innerHTML = list.map((resource) => {
    const href = resourceHref(resource);
    const external = /^https?:\/\//.test(href);
    const tags = Array.isArray(resource.tags) ? resource.tags : [];
    return `
      <a class="tools-resource-row" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""}>
        <span class="tools-resource-icon"><i class="${resourceIcon(resource.type)}"></i></span>
        <div>
          <strong>${escapeHtml(resource.title)}</strong>
          <small>${escapeHtml(resource.description || "Resource สำหรับสมาชิก AiX Club")}</small>
          ${tags.length ? `<em>${tags.map(escapeHtml).join(" · ")}</em>` : ""}
        </div>
        <i class="fa-solid fa-arrow-right"></i>
      </a>
    `;
  }).join("");
}

function renderAccess(data, anonymous = false) {
  const member = data.member || {};
  const payment = data.payment || {};
  const active = !anonymous && Boolean(payment.active);
  const expired = Boolean(payment.expired);
  if (!anonymous) localStorage.setItem(SESSION_KEY, JSON.stringify(member));

  toolsMemberName.textContent = anonymous
    ? "เข้าสู่ระบบสมาชิกเพื่อเปิดใช้รายการ resource ของคุณ"
    : active
    ? `${member.displayName || member.name || "AiX Member"} ใช้งาน Tools Box ได้แล้ว`
    : expired
      ? "สมาชิกหมดอายุแล้ว ต่ออายุเพื่อเปิดใช้ Tools Box"
      : "ชำระเงินเพื่อเปิดใช้ Tools Box";

  toolsAccessBadge.innerHTML = anonymous
    ? `<i class="fa-solid fa-user-lock"></i><span>เข้าสู่ระบบก่อนใช้งาน Tools Box</span>`
    : active
    ? `<i class="fa-solid fa-unlock-keyhole"></i><span>ปลดล็อกแล้วสำหรับสมาชิก</span>`
    : expired
      ? `<i class="fa-solid fa-clock-rotate-left"></i><span>สมาชิกหมดอายุ ต้องต่ออายุก่อนใช้งาน</span>`
      : `<i class="fa-solid fa-lock"></i><span>ยังไม่ปลดล็อก Tools Box</span>`;
  toolsAccessBadge.classList.toggle("is-active", active);
  toolsAccessBadge.classList.toggle("is-locked", !active);
  document.body.classList.toggle("tools-locked", !active);
  toolsLockedState.hidden = active;
  if (toolsLockedAction) {
    toolsLockedAction.href = anonymous ? "/index.html?auth=login" : "/payment";
    toolsLockedAction.textContent = anonymous ? "เข้าสู่ระบบ" : "ไปหน้าชำระเงิน";
  }
  renderResources(active ? data.resources || [] : []);
}

async function loadToolsBox() {
  if (!token()) {
    renderAccess({}, true);
    return;
  }

  try {
    const data = await apiRequest("/api/member/dashboard");
    renderAccess(data);
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SESSION_KEY);
    renderAccess({}, true);
    showToast(error.message);
  }
}

async function logout() {
  await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("/index.html");
}

toolsMobileMenu?.addEventListener("click", () => {
  toolsMobilePanel?.classList.toggle("open");
});

document.getElementById("toolsLogoutBtn")?.addEventListener("click", logout);
document.getElementById("toolsMobileLogoutBtn")?.addEventListener("click", logout);

loadToolsBox();
