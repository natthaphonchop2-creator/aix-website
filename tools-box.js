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

const toolsAccessBadge = document.getElementById("toolsAccessBadge");
const toolsMemberName = document.getElementById("toolsMemberName");
const toolsDynamicResources = document.getElementById("toolsDynamicResources");
const toolsLockedState = document.getElementById("toolsLockedState");
const toolsLockedAction = toolsLockedState?.querySelector("a.primary-btn");
const toolsSkillLibrary = document.getElementById("toolsSkillLibrary");
const toolsPromptLibrary = document.getElementById("toolsPromptLibrary");
const toolsMobileMenu = document.getElementById("toolsMobileMenu");
const toolsMobilePanel = document.getElementById("toolsMobilePanel");
const toast = document.getElementById("toast");

let toastTimer = null;

let skillPacks = [];
let promptPacks = [];
let toolsLoadGeneration = 0;
let toolsLogoutPending = false;
let toolsLogoutPromise = null;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function fileSafeName(value) {
  return String(value || "aix-resource")
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "aix-resource";
}

function skillMarkdown(item) {
  return [
    "---",
    `name: ${item.slug}`,
    `description: ${item.description}`,
    "type: aix-public-skill",
    "---",
    "",
    `# ${item.title}`,
    "",
    item.description,
    "",
    "## ใช้เมื่อ",
    item.useWhen,
    "",
    "## Input ที่ควรถามก่อนเริ่ม",
    ...item.inputs.map((input) => `- ${input}`),
    "",
    "## ขั้นตอนทำงาน",
    ...item.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "## Output Format",
    ...item.output.map((output) => `- ${output}`),
    "",
    "## Quality Gate",
    item.qualityGate,
    "",
    "## หมายเหตุการใช้งาน",
    "ปรับคำเรียก เครื่องมือ และข้อจำกัดให้ตรงกับ workspace ของคุณก่อนใช้งานจริง"
  ].join("\n");
}

function promptMarkdown(item) {
  return [
    `# ${item.title}`,
    "",
    item.description,
    "",
    `หมวด: ${item.tags.join(", ")}`,
    "",
    "## Prompt",
    "```text",
    item.prompt,
    "```",
    "",
    "## วิธีปรับใช้",
    "- แทนที่ข้อความในวงเล็บเหลี่ยมด้วยข้อมูลจริง",
    "- ถ้าข้อมูลไม่ครบ ให้สั่ง AI ถามกลับไม่เกิน 3 คำถามก่อนเริ่ม",
    "- ตรวจผลลัพธ์กับบริบทธุรกิจจริงก่อนนำไปใช้งาน"
  ].join("\n");
}

function libraryContent(kind, item) {
  return kind === "skill" ? skillMarkdown(item) : promptMarkdown(item);
}

function libraryFileName(kind, item) {
  return `aix-${kind}-${fileSafeName(item.slug || item.id)}.md`;
}

function findLibraryItem(kind, id) {
  const source = kind === "skill" ? skillPacks : promptPacks;
  return source.find((item) => item.id === id);
}

async function copyText(text, label) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  showToast(`คัดลอก ${label} แล้ว`);
}

function downloadText(fileName, content) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
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
  const href = resource.url || resource.mediaUrl || "#resources";
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

function renderActionCards(container, items, options = {}) {
  if (!container) return;
  const locked = Boolean(options.locked);
  const kind = options.kind || "skill";
  container.innerHTML = items.map((item) => {
    const content = libraryContent(kind, item);
    const preview = content.split("\n").filter(Boolean).slice(0, 4).join(" · ");
    const tags = Array.isArray(item.tags) ? item.tags : [];
    return `
      <article class="tools-action-card ${locked ? "is-locked" : ""}">
        <div class="tools-action-card-top">
          <span class="tools-action-icon"><i class="${escapeHtml(item.icon)}"></i></span>
          <span class="tools-action-type">${kind === "skill" ? "Skill .md" : "Prompt .md"}</span>
        </div>
        <div class="tools-action-body">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <div class="tools-action-tags">
          ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <p class="tools-action-preview">${escapeHtml(preview)}</p>
        <div class="tools-action-buttons">
          <button class="tools-copy-btn" type="button" data-tools-action="copy" data-tools-kind="${kind}" data-resource-id="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}>
            <i class="fa-regular fa-copy"></i><span>คัดลอก</span>
          </button>
          <button class="tools-download-btn" type="button" data-tools-action="download" data-tools-kind="${kind}" data-resource-id="${escapeHtml(item.id)}" ${locked ? "disabled" : ""}>
            <i class="fa-solid fa-download"></i><span>โหลด .md</span>
          </button>
        </div>
        ${locked ? `<small class="tools-action-lock"><i class="fa-solid fa-lock"></i>เข้าสู่ระบบสมาชิกเพื่อคัดลอกหรือโหลดไฟล์</small>` : ""}
      </article>
    `;
  }).join("");
}

function clearPremiumLibrary() {
  skillPacks = [];
  promptPacks = [];
  renderActionCards(toolsSkillLibrary, skillPacks, { kind: "skill" });
  renderActionCards(toolsPromptLibrary, promptPacks, { kind: "prompt" });
}

function isNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTextList(value) {
  return Array.isArray(value) && value.every(isNonEmptyText);
}

function isSkillPack(item) {
  return Boolean(item)
    && typeof item === "object"
    && !Array.isArray(item)
    && [item.id, item.slug, item.title, item.description, item.icon, item.useWhen, item.qualityGate].every(isNonEmptyText)
    && [item.tags, item.inputs, item.steps, item.output].every(isTextList);
}

function isPromptPack(item) {
  return Boolean(item)
    && typeof item === "object"
    && !Array.isArray(item)
    && [item.id, item.slug, item.title, item.description, item.icon, item.prompt].every(isNonEmptyText)
    && isTextList(item.tags);
}

function renderPremiumLibrary(library) {
  const validSkills = Array.isArray(library?.skills)
    && library.skills.length > 0
    && library.skills.every(isSkillPack);
  const validPrompts = Array.isArray(library?.prompts)
    && library.prompts.length > 0
    && library.prompts.every(isPromptPack);
  if (!validSkills || !validPrompts) {
    throw new Error("ข้อมูล Tools Box ไม่สมบูรณ์ กรุณาลองใหม่");
  }

  skillPacks = library.skills;
  promptPacks = library.prompts;
  try {
    renderActionCards(toolsSkillLibrary, skillPacks, { kind: "skill" });
    renderActionCards(toolsPromptLibrary, promptPacks, { kind: "prompt" });
  } catch (error) {
    clearPremiumLibrary();
    throw error;
  }
}

function renderAccess(data, anonymous = false) {
  const member = data.member || {};
  const payment = data.payment || {};
  const active = !anonymous && Boolean(payment.active);
  const expired = Boolean(payment.expired);

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
  if (toolsLogoutPending) return false;
  const generation = ++toolsLoadGeneration;
  let dashboardRendered = false;
  let dashboardData = null;
  clearPremiumLibrary();

  try {
    await bootstrapMemberSession();
    if (generation !== toolsLoadGeneration || toolsLogoutPending) return false;
    const data = await apiRequest("/api/member/dashboard");
    if (generation !== toolsLoadGeneration || toolsLogoutPending) return false;
    dashboardData = data;
    renderAccess(data);
    dashboardRendered = true;
    if (!data?.payment?.active) return true;

    const library = await apiRequest("/api/member/tools");
    if (generation !== toolsLoadGeneration || toolsLogoutPending) return false;
    renderPremiumLibrary(library);
    return true;
  } catch (error) {
    if (generation !== toolsLoadGeneration || toolsLogoutPending) return false;
    clearPremiumLibrary();
    if (error.status === 401) {
      memberApi.clear();
      renderAccess({}, true);
    } else if (error.status === 402 && dashboardData) {
      renderAccess({
        member: dashboardData.member || {},
        payment: { active: false, expired: false },
        resources: []
      });
    } else if (!dashboardRendered) {
      renderAccess({}, true);
    }
    if (error.status !== 401) showToast(error.message);
    return false;
  }
}

async function logout() {
  if (toolsLogoutPromise) return toolsLogoutPromise;
  toolsLogoutPending = true;
  toolsLoadGeneration += 1;
  clearPremiumLibrary();
  const attempt = (async () => {
    try {
      await memberApi.logout("/api/auth/logout");
    } catch (error) {
      toolsLogoutPending = false;
      showToast("ออกจากระบบไม่สำเร็จ ระบบยังคงสถานะเข้าสู่ระบบไว้ กรุณาลองใหม่");
      return false;
    }
    memberSessionPromise = null;
    window.location.replace("/index.html");
    return true;
  })();
  toolsLogoutPromise = attempt;
  const succeeded = await attempt;
  if (!succeeded && toolsLogoutPromise === attempt) toolsLogoutPromise = null;
  return succeeded;
}

toolsMobileMenu?.addEventListener("click", () => {
  toolsMobilePanel?.classList.toggle("open");
});

document.getElementById("toolsLogoutBtn")?.addEventListener("click", logout);
document.getElementById("toolsMobileLogoutBtn")?.addEventListener("click", logout);

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-tools-action]");
  if (!button || button.disabled) return;

  const kind = button.dataset.toolsKind;
  const item = findLibraryItem(kind, button.dataset.resourceId);
  if (!item) return;

  const content = libraryContent(kind, item);
  const fileName = libraryFileName(kind, item);

  try {
    if (button.dataset.toolsAction === "copy") {
      await copyText(content, item.title);
    } else if (button.dataset.toolsAction === "download") {
      downloadText(fileName, content);
      showToast(`โหลด ${fileName} แล้ว`);
    }
  } catch (error) {
    showToast(error.message || "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
});

loadToolsBox();
