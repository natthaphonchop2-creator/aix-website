"use strict";

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

function getToolsLibrary() {
  return { skills: structuredClone(SKILL_PACKS), prompts: structuredClone(PROMPT_PACKS) };
}
module.exports = { getToolsLibrary };
