const API_ORIGIN = window.location.origin;
const TOKEN_KEY = "aix_member_token";
const SESSION_KEY = "aix_member_session";

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

const SKILL_PACKS = [
  {
    id: "ai-work-intake",
    slug: "ai-work-intake",
    title: "AI Work Intake Skill",
    description: "แปลงงานที่เล่าแบบกระจัดกระจายให้เป็น brief ที่ AI หรือ agent เข้าใจและเริ่มทำงานต่อได้",
    icon: "fa-solid fa-clipboard-list",
    tags: ["Brief", "Context", "Workflow"],
    useWhen: "ใช้ก่อนเริ่มงานใหม่ทุกครั้ง โดยเฉพาะงานที่ยังไม่ชัดว่า input, output และข้อจำกัดคืออะไร",
    inputs: [
      "เป้าหมายของงาน",
      "คนที่จะใช้ผลลัพธ์",
      "ข้อมูลหรือไฟล์ที่มี",
      "ข้อจำกัดเรื่องเวลา รูปแบบ และความเสี่ยง"
    ],
    steps: [
      "สรุปเป้าหมายเป็นประโยคเดียว",
      "แยก input ที่มีจริงออกจากสมมติฐาน",
      "ถามคำถามสำคัญไม่เกิน 3 ข้อ ถ้าข้อมูลไม่พอ",
      "เขียน output format ที่ต้องการให้ชัด",
      "ปิดท้ายด้วย checklist ตรวจงานก่อนส่ง"
    ],
    output: [
      "Objective",
      "Available context",
      "Missing context",
      "Task plan",
      "Output format",
      "Quality checklist"
    ],
    qualityGate: "ถ้าอ่าน brief แล้วคนอื่นเริ่มทำงานต่อได้โดยไม่ต้องถามซ้ำ ถือว่าผ่าน"
  },
  {
    id: "prompt-qa",
    slug: "prompt-qa-review",
    title: "Prompt QA Skill",
    description: "ตรวจ prompt ก่อนใช้งานจริง ลดคำสั่งกำกวมและเพิ่มเกณฑ์ประเมินผลลัพธ์",
    icon: "fa-solid fa-list-check",
    tags: ["Prompt", "Review", "QA"],
    useWhen: "ใช้เมื่อจะส่ง prompt ให้ทีมใช้ซ้ำ หรือก่อนเอา prompt ไปผูกกับ workflow อัตโนมัติ",
    inputs: [
      "prompt ต้นฉบับ",
      "ตัวอย่าง output ที่อยากได้",
      "งานหรือสถานการณ์ที่ prompt จะถูกใช้"
    ],
    steps: [
      "ตรวจ role ว่าบอกบทบาทของ AI ชัดหรือยัง",
      "ตรวจ context ว่ามีข้อมูลธุรกิจและข้อจำกัดพอหรือไม่",
      "ตรวจ output format ว่าวัดผลและนำไปใช้ต่อได้หรือไม่",
      "เพิ่มตัวอย่าง good/bad output ถ้าจำเป็น",
      "คืน prompt เวอร์ชันปรับปรุงพร้อมเหตุผลสั้นๆ"
    ],
    output: [
      "Prompt score",
      "What is unclear",
      "Improved prompt",
      "Expected output format",
      "Test cases"
    ],
    qualityGate: "prompt ต้องบอก role, context, task, output และเกณฑ์ตรวจผลลัพธ์ครบ"
  },
  {
    id: "agent-workflow",
    slug: "agent-workflow",
    title: "Agent Workflow Skill",
    description: "แตกเป้าหมายใหญ่ให้เป็นงานย่อย เครื่องมือที่ต้องใช้ และ checkpoint สำหรับ agent",
    icon: "fa-solid fa-route",
    tags: ["Agent", "Task", "Checkpoint"],
    useWhen: "ใช้เมื่องานมีหลายขั้นตอน หรืออยากให้ AI ทำงานต่อเนื่องโดยไม่หลุดเป้าหมาย",
    inputs: [
      "goal หลักของงาน",
      "เครื่องมือหรือไฟล์ที่ใช้ได้",
      "ขอบเขตสิ่งที่ห้ามทำ",
      "จุดที่ต้องให้มนุษย์ตรวจ"
    ],
    steps: [
      "แปลง goal เป็น success criteria",
      "แตกงานเป็น task sequence ที่ทำตามลำดับได้",
      "กำหนด tool ต่อ task",
      "ใส่ checkpoint ก่อน action ที่เสี่ยงหรือแก้กลับยาก",
      "สรุป final handoff ให้มนุษย์ตรวจเร็ว"
    ],
    output: [
      "Goal",
      "Task sequence",
      "Tool map",
      "Human checkpoints",
      "Done criteria"
    ],
    qualityGate: "ทุก task ต้องมีเหตุผล เครื่องมือ และผลลัพธ์ที่ตรวจได้"
  },
  {
    id: "automation-map",
    slug: "automation-map",
    title: "Automation Mapping Skill",
    description: "ทำแผนที่งาน manual ให้เห็น trigger, data, action และ review ก่อนต่อระบบจริง",
    icon: "fa-solid fa-diagram-project",
    tags: ["Automation", "SOP", "System"],
    useWhen: "ใช้ก่อนเชื่อม Make, n8n, Zapier, Sheet, CRM หรือระบบหลังบ้าน",
    inputs: [
      "ขั้นตอน manual ปัจจุบัน",
      "ข้อมูลที่เข้าและออกในแต่ละขั้น",
      "เงื่อนไขการตัดสินใจ",
      "คนที่รับผิดชอบ"
    ],
    steps: [
      "เขียน workflow ปัจจุบันแบบ step-by-step",
      "หา trigger ที่เริ่มงานอัตโนมัติได้",
      "ระบุ data field ที่ต้องมี",
      "แยก action ที่ automate ได้กับ action ที่ต้องให้คนตรวจ",
      "สร้าง rollout plan แบบเริ่มเล็กก่อน"
    ],
    output: [
      "Current workflow",
      "Automation candidates",
      "Required data fields",
      "Human review points",
      "MVP automation plan"
    ],
    qualityGate: "ต้องรู้ชัดว่าขั้นไหน automate ได้ทันที และขั้นไหนยังต้องใช้ human review"
  },
  {
    id: "content-repurpose",
    slug: "content-repurpose",
    title: "Content Repurpose Skill",
    description: "เปลี่ยนหนึ่งไอเดียหรือบทเรียนให้เป็น post, script, email และ checklist ได้หลายชิ้น",
    icon: "fa-solid fa-wand-magic-sparkles",
    tags: ["Content", "Script", "Marketing"],
    useWhen: "ใช้หลังเรียนคลาส จบ live หรือมี insight หนึ่งเรื่องที่อยากต่อยอดเป็นคอนเทนต์",
    inputs: [
      "ไอเดียหลักหรือ transcript",
      "กลุ่มเป้าหมาย",
      "ช่องทางที่จะลง",
      "โทนภาษา"
    ],
    steps: [
      "ดึง insight หลัก 3-5 ข้อ",
      "เลือกมุมเล่าให้ตรงกับ audience",
      "แตกเป็น format สั้น กลาง ยาว",
      "เพิ่ม call to action ที่ไม่ขายแข็ง",
      "ทำ checklist สำหรับตรวจภาษาและความถูกต้อง"
    ],
    output: [
      "Content angles",
      "Short post",
      "Video script",
      "Email draft",
      "Repurpose checklist"
    ],
    qualityGate: "แต่ละชิ้นต้องมีประเด็นเดียวชัด อ่านง่าย และไม่ใช่การสรุปกว้างๆ"
  },
  {
    id: "research-brief",
    slug: "research-brief",
    title: "Research Brief Skill",
    description: "จัดงานค้นคว้าให้มี source, insight, risk และ action item ที่เอาไปตัดสินใจต่อได้",
    icon: "fa-solid fa-magnifying-glass-chart",
    tags: ["Research", "Decision", "Brief"],
    useWhen: "ใช้เมื่อต้องวิเคราะห์ตลาด เครื่องมือ คู่แข่ง หรือตัวเลือกก่อนเริ่มโปรเจกต์",
    inputs: [
      "คำถามวิจัย",
      "ขอบเขตการค้นหา",
      "เกณฑ์การตัดสินใจ",
      "แหล่งข้อมูลที่เชื่อถือได้"
    ],
    steps: [
      "แยกคำถามหลักกับคำถามรอง",
      "กำหนด source ที่ควรใช้และ source ที่ควรหลีกเลี่ยง",
      "สรุป finding แบบ evidence-first",
      "แยก insight ออกจาก opinion",
      "ปิดด้วย recommendation และ next action"
    ],
    output: [
      "Research question",
      "Sources reviewed",
      "Key findings",
      "Risks and unknowns",
      "Recommendation",
      "Next actions"
    ],
    qualityGate: "ทุกข้อสรุปสำคัญต้องโยงกลับไปที่หลักฐานหรือข้อจำกัดที่ตรวจได้"
  }
];

const PROMPT_PACKS = [
  {
    id: "business-use-case-finder",
    slug: "business-use-case-finder",
    title: "หา Use Case AI ในธุรกิจ",
    description: "ช่วยค้นหางานที่ควรเริ่มใช้ AI ก่อน โดยเรียงจากทำง่ายและเห็นผลเร็ว",
    icon: "fa-solid fa-bullseye",
    tags: ["Business", "Use Case"],
    prompt: [
      "คุณคือ AI strategist สำหรับธุรกิจขนาดเล็กและทีมปฏิบัติการ",
      "ช่วยวิเคราะห์ธุรกิจของฉันแล้วเสนอ use case AI ที่ควรเริ่มทำก่อน",
      "",
      "ข้อมูลธุรกิจ:",
      "- ประเภทธุรกิจ: [ใส่ประเภทธุรกิจ]",
      "- ทีมที่เกี่ยวข้อง: [เช่น sales, marketing, admin, operation]",
      "- งานที่ทำซ้ำบ่อย: [ใส่รายการงาน]",
      "- เครื่องมือที่ใช้อยู่: [เช่น Google Sheet, Line, CRM, Notion]",
      "",
      "สิ่งที่ต้องการ:",
      "1. เสนอ use case 5 ข้อ",
      "2. ให้คะแนน Impact / Ease / Risk ข้อละ 1-5",
      "3. แนะนำ 1 use case ที่ควรเริ่มก่อน",
      "4. เขียนขั้นตอนทดลองทำใน 7 วัน",
      "5. บอกข้อมูลที่ต้องเตรียมก่อนเริ่ม"
    ].join("\n")
  },
  {
    id: "customer-faq-builder",
    slug: "customer-faq-builder",
    title: "สร้าง FAQ จากแชทลูกค้า",
    description: "เปลี่ยนคำถามซ้ำจากลูกค้าให้เป็น FAQ, SOP และคำตอบมาตรฐานสำหรับทีม",
    icon: "fa-solid fa-comments",
    tags: ["FAQ", "Customer Service"],
    prompt: [
      "คุณคือ customer support lead ที่ช่วยจัดระบบความรู้ให้ทีมตอบลูกค้าเร็วขึ้น",
      "จากข้อความแชทด้านล่าง ช่วยสร้าง FAQ และคำตอบมาตรฐาน",
      "",
      "ข้อความแชท:",
      "[วางแชทหรือคำถามลูกค้า]",
      "",
      "ผลลัพธ์ที่ต้องการ:",
      "1. กลุ่มคำถามซ้ำ 5-10 หมวด",
      "2. คำตอบสั้นสำหรับตอบในแชท",
      "3. คำตอบละเอียดสำหรับหน้าเว็บหรือเอกสาร",
      "4. ข้อมูลที่ต้องถามเพิ่มก่อนตอบ",
      "5. SOP การส่งต่อเคสที่ตอบเองไม่ได้"
    ].join("\n")
  },
  {
    id: "weekly-live-to-action",
    slug: "weekly-live-to-action",
    title: "สรุป Live เป็น Action Plan",
    description: "เปลี่ยนโน้ตหรือ transcript จาก live class ให้เป็นแผนลงมือทำและ checklist",
    icon: "fa-solid fa-video",
    tags: ["Live", "Action Plan"],
    prompt: [
      "คุณคือผู้ช่วยสรุปคลาสที่เน้นให้ผู้เรียนเอาไปลงมือทำจริง",
      "ช่วยสรุปเนื้อหาด้านล่างให้กลายเป็น action plan",
      "",
      "โน้ตหรือ transcript:",
      "[วางเนื้อหาจาก live หรือ replay]",
      "",
      "จัดผลลัพธ์เป็น:",
      "1. บทเรียนสำคัญ 5 ข้อ",
      "2. Checklist สิ่งที่ต้องทำหลังเรียน",
      "3. Prompt หรือคำสั่ง AI ที่ควรลอง",
      "4. งานฝึก 30 นาที",
      "5. สิ่งที่ควรกลับมาทบทวนในสัปดาห์หน้า"
    ].join("\n")
  },
  {
    id: "sop-checklist-generator",
    slug: "sop-checklist-generator",
    title: "ทำ SOP + Checklist จากงานจริง",
    description: "เปลี่ยนขั้นตอนงานในหัวให้เป็น SOP ที่ทีมอ่านแล้วทำตามได้",
    icon: "fa-solid fa-clipboard-check",
    tags: ["SOP", "Checklist"],
    prompt: [
      "คุณคือ operation designer ที่ถนัดแปลงงานจริงเป็น SOP",
      "ช่วยสร้าง SOP จากรายละเอียดงานนี้",
      "",
      "รายละเอียดงาน:",
      "- เป้าหมาย: [ใส่เป้าหมาย]",
      "- คนที่ทำงานนี้: [ตำแหน่ง/ทีม]",
      "- ขั้นตอนที่ทำอยู่ตอนนี้: [วางขั้นตอนคร่าวๆ]",
      "- เครื่องมือที่ใช้: [เครื่องมือ]",
      "- ปัญหาที่เจอบ่อย: [ปัญหา]",
      "",
      "ผลลัพธ์ที่ต้องการ:",
      "1. SOP แบบ step-by-step",
      "2. Checklist ก่อนเริ่ม / ระหว่างทำ / ก่อนส่ง",
      "3. จุดที่ใช้ AI ช่วยได้",
      "4. จุดที่ต้องให้คนตรวจ",
      "5. ตัวชี้วัดว่างานนี้ทำสำเร็จ"
    ].join("\n")
  },
  {
    id: "agent-spec-prompt",
    slug: "agent-spec-prompt",
    title: "ออกแบบ AI Agent Spec",
    description: "ช่วยระบุ role, tools, memory, workflow และข้อห้ามก่อนทำ agent จริง",
    icon: "fa-solid fa-robot",
    tags: ["Agent", "Spec"],
    prompt: [
      "คุณคือ AI agent architect",
      "ช่วยออกแบบ spec สำหรับ AI Agent จากงานนี้",
      "",
      "งานที่อยากให้ agent ทำ:",
      "[อธิบายงาน]",
      "",
      "บริบท:",
      "- ผู้ใช้หลัก: [ใครใช้]",
      "- แหล่งข้อมูล: [ไฟล์/API/เว็บ/ฐานข้อมูล]",
      "- เครื่องมือที่ agent ใช้ได้: [เครื่องมือ]",
      "- สิ่งที่ห้ามทำ: [ข้อจำกัด]",
      "",
      "ช่วยส่งออกเป็น:",
      "1. Agent role",
      "2. Inputs และ outputs",
      "3. Tools map",
      "4. Memory ที่ควรจำ",
      "5. Workflow 5-8 ขั้น",
      "6. Human approval checkpoint",
      "7. Test cases ก่อนใช้งานจริง"
    ].join("\n")
  },
  {
    id: "content-system-from-one-idea",
    slug: "content-system-from-one-idea",
    title: "แตกคอนเทนต์จาก 1 ไอเดีย",
    description: "เปลี่ยนหนึ่งประเด็นให้เป็นโพสต์ สคริปต์ และ email โดยยังคุม message เดียวกัน",
    icon: "fa-solid fa-pen-nib",
    tags: ["Content", "Marketing"],
    prompt: [
      "คุณคือ content strategist สำหรับธุรกิจที่อยากสื่อสารแบบจริงใจ ไม่ขายแข็ง",
      "ช่วยแตกคอนเทนต์จากไอเดียนี้",
      "",
      "ไอเดียหลัก:",
      "[ใส่ไอเดียหรือ insight]",
      "",
      "กลุ่มเป้าหมาย:",
      "[ใส่กลุ่มเป้าหมาย]",
      "",
      "โทนภาษา:",
      "[เช่น มืออาชีพ เป็นกันเอง ตรงประเด็น]",
      "",
      "สร้างให้เป็น:",
      "1. Hook 10 แบบ",
      "2. โพสต์ Facebook/LinkedIn 1 ชิ้น",
      "3. สคริปต์วิดีโอสั้น 45 วินาที",
      "4. Email สั้น 1 ฉบับ",
      "5. CTA ที่นุ่มและชัด",
      "6. Checklist ตรวจว่าคอนเทนต์ไม่หลุดประเด็น"
    ].join("\n")
  }
];

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
  const source = kind === "skill" ? SKILL_PACKS : PROMPT_PACKS;
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
  renderActionCards(toolsSkillLibrary, SKILL_PACKS, { kind: "skill", locked: !active });
  renderActionCards(toolsPromptLibrary, PROMPT_PACKS, { kind: "prompt", locked: !active });
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
