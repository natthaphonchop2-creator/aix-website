const detailCourses = {
  "manus-ai": {
    id: "manus-ai",
    title: "Manus AI สำหรับธุรกิจ",
    type: "Live Class",
    status: "เปิดรับสมาชิก",
    subtitle: "สร้าง AI Agent และ workflow automation ที่ช่วยตอบลูกค้า สรุปรายงาน วางแผนคอนเทนต์ และลดงานซ้ำในธุรกิจ",
    overview: "คอร์สนี้พาผู้เรียนตั้งแต่การเลือก use case ที่เหมาะกับธุรกิจ ไปจนถึงการสร้าง Agent ที่มีหน้าที่ชัดเจน ใช้ prompt ได้แม่นยำ และเชื่อม workflow เพื่อเอาผลลัพธ์ไปใช้กับงานจริง",
    instructor: "AiX Team",
    image: "assets/generated/course-ai-agent.jpg",
    price: 1999,
    rating: "4.9",
    learners: "เหมาะกับผู้ประกอบการและทีมธุรกิจ",
    duration: "6 ชั่วโมง",
    level: "Beginner to Practical",
    schedule: "เรียนสด + ดูย้อนหลัง",
    lessons: "8 modules",
    outcomes: [
      "ออกแบบ AI Agent ให้มีหน้าที่ ข้อมูล และขอบเขตการทำงานชัดเจน",
      "เขียน prompt สำหรับงานธุรกิจ เช่น สรุปรายงาน ตอบลูกค้า และวางแผนคอนเทนต์",
      "ทำ Deep Research และเปลี่ยน insight ให้เป็น action plan",
      "เชื่อม workflow ด้วยเครื่องมือ automation เช่น Make หรือ n8n",
      "วางระบบ Content, Sales และ Customer Service ที่ใช้ซ้ำได้"
    ],
    skills: ["AI Agent", "Prompt Engineering", "Workflow Automation", "Deep Research", "Customer Service AI", "Content System", "Business Operations"],
    tools: ["Manus AI", "Claude", "ChatGPT", "Make", "n8n", "Google Sheets"],
    brandFocus: [["Manus AI"], ["Manus AI", "Claude"], ["ChatGPT", "Claude"], ["Claude", "Google Sheets"], ["Make", "n8n"], ["Manus AI", "Make"]],
    info: [
      ["รูปแบบเรียน", "คลาสสดกลุ่มเล็ก พร้อมวิดีโอย้อนหลัง"],
      ["ระดับ", "เริ่มต้นได้ แต่เน้นลงมือทำจริง"],
      ["ภาษา", "ภาษาไทย"],
      ["Resource", "Prompt Template, Workflow Blueprint, Checklist"]
    ],
    syllabus: [
      {
        title: "Module 1: เลือก use case ที่เหมาะกับธุรกิจ",
        time: "45 นาที",
        points: ["แยกงานที่ควรใช้ AI กับงานที่ยังต้องใช้คน", "ประเมินความเสี่ยงและผลลัพธ์", "เลือก project แรกที่ทำได้จริง"]
      },
      {
        title: "Module 2: สร้าง AI Agent ตัวแรกด้วย Manus",
        time: "60 นาที",
        points: ["กำหนด role, task, context และ output", "ตั้งค่า knowledge และ instruction", "ทดสอบผลลัพธ์แบบเป็นรอบ"]
      },
      {
        title: "Module 3: Prompt Engineering สำหรับงานซับซ้อน",
        time: "70 นาที",
        points: ["เขียน prompt ให้ตรวจสอบตัวเอง", "แตกงานใหญ่เป็น chain", "ลด hallucination ด้วยหลักฐานและเงื่อนไข"]
      },
      {
        title: "Module 4: Deep Research และรายงานธุรกิจ",
        time: "60 นาที",
        points: ["ตั้งคำถาม research", "สรุป insight", "เปลี่ยนข้อมูลเป็น action plan"]
      },
      {
        title: "Module 5: Workflow Automation",
        time: "80 นาที",
        points: ["ออกแบบ trigger/action", "เชื่อม Agent กับเครื่องมือ", "ตั้ง human approval ก่อนส่งผลลัพธ์"]
      },
      {
        title: "Module 6: โปรเจกต์ AI Business System",
        time: "90 นาที",
        points: ["สร้าง workflow ของตัวเอง", "ทำ template ใช้ซ้ำ", "วางแผนปรับปรุงระบบหลังใช้งานจริง"]
      }
    ],
    project: "ผู้เรียนจะออกแบบ AI Agent หนึ่งตัวสำหรับงานธุรกิจของตัวเอง เช่น Agent สรุปรายงานลูกค้า Agent ช่วยวางแผนคอนเทนต์ หรือ Agent ตอบคำถามเบื้องต้น พร้อม workflow ที่กำหนด input, process, output และจุดตรวจสอบโดยมนุษย์",
    faq: [
      ["ไม่มีพื้นฐาน AI เรียนได้ไหม?", "เรียนได้ คอร์สเริ่มจาก use case และตัวอย่างงานจริงก่อน แล้วค่อยลงลึกเรื่อง prompt และ workflow"],
      ["ต้องเขียนโค้ดเป็นไหม?", "ไม่จำเป็นต้องเขียนโค้ดเป็น แต่ถ้าเคยใช้เครื่องมือ automation มาก่อนจะไปได้เร็วขึ้น"],
      ["เรียนแล้วได้ไฟล์ template ไหม?", "มี prompt template, workflow blueprint และ checklist สำหรับนำไปปรับใช้กับธุรกิจ"],
      ["คอร์สนี้ต่างจากดู tutorial ฟรีอย่างไร?", "คอร์สเน้นการออกแบบระบบและโปรเจกต์ของผู้เรียน ไม่ใช่แค่สาธิตเครื่องมือทีละขั้น"]
    ]
  },
  "claude-manus-vibe-coding": {
    id: "claude-manus-vibe-coding",
    title: "Claude & Manus Vibe Coding",
    type: "Special Class",
    status: "แจ้งเตือน",
    subtitle: "ใช้ AI ช่วยเปลี่ยนไอเดียธุรกิจให้เป็น prototype เว็บ แอป และ workflow ที่ทีมเข้าใจตรงกัน",
    overview: "คอร์สนี้เหมาะกับคนที่อยากทำ MVP หรือ prototype โดยใช้ Claude และ Manus ช่วยคิด requirement, เขียนสเปก, สร้างโครงหน้า และ debug แนวคิดก่อนส่งต่อให้ทีมพัฒนา",
    instructor: "AiX Team",
    image: "assets/generated/course-ai-coding.jpg",
    price: 0,
    rating: "New",
    learners: "เหมาะกับ Founder, PM, Marketer และ Creator",
    duration: "3 ชั่วโมง",
    level: "Practical",
    schedule: "วิดีโอ + workshop",
    lessons: "4 modules",
    outcomes: ["เขียน prompt เพื่อสร้างสเปก product", "ออกแบบ user flow ด้วย AI", "สร้าง prototype และ iterate อย่างเป็นระบบ", "สื่อสารกับ developer ได้ชัดขึ้น"],
    skills: ["Vibe Coding", "Product Spec", "AI Coding", "Prototype", "Debugging", "Claude"],
    tools: ["Claude", "Manus AI", "Cursor", "GitHub", "Browser DevTools"],
    brandFocus: [["Claude"], ["Manus AI", "Claude"], ["Cursor", "GitHub"], ["GitHub", "Browser DevTools"]],
    info: [["รูปแบบเรียน", "Workshop สั้นพร้อมตัวอย่าง"], ["ระดับ", "ผู้เริ่มต้นที่อยากทำ prototype"], ["ภาษา", "ภาษาไทย"], ["Resource", "Spec Template, Prompt Checklist"]],
    syllabus: [
      { title: "Module 1: Prompt to Product Spec", time: "45 นาที", points: ["แปลงไอเดียเป็น requirement", "เขียน user story", "กำหนด scope MVP"] },
      { title: "Module 2: Prototype Workflow", time: "60 นาที", points: ["สร้างโครงหน้า", "กำหนด component", "ตรวจ UX flow"] },
      { title: "Module 3: Debug กับ AI", time: "45 นาที", points: ["อ่าน error", "ตั้งคำถามให้ AI ช่วยแก้", "ตรวจผลลัพธ์แบบไม่หลงทาง"] },
      { title: "Module 4: ส่งต่อให้ทีม", time: "30 นาที", points: ["จัดเอกสาร", "เขียน acceptance criteria", "วาง next step"] }
    ],
    project: "ผู้เรียนจะสร้าง prototype brief สำหรับไอเดียเว็บหรือระบบธุรกิจหนึ่งชิ้น พร้อม user flow, feature list และ prompt สำหรับส่งต่อให้ AI หรือทีมพัฒนา",
    faq: [["ต้องเขียนโค้ดไหม?", "ไม่จำเป็น แต่จะช่วยให้เข้าใจภาพรวมการทำ prototype กับ AI"], ["เหมาะกับใคร?", "เหมาะกับคนที่มีไอเดียระบบแต่ยังไม่อยากเริ่มจ้างพัฒนาเต็มรูปแบบ"]]
  },
  "claude-deep-dive": {
    id: "claude-deep-dive",
    title: "Claude Deep Dive",
    type: "On-demand",
    status: "พร้อมเรียน",
    subtitle: "ใช้ Claude สำหรับงานคิด วิเคราะห์ เขียนเอกสาร สรุปข้อมูล และทำงานร่วมกับทีมแบบมืออาชีพ",
    overview: "คอร์สนี้พาผู้เรียนเข้าใจวิธีใช้ Claude ให้เหมาะกับงานที่ต้องการเหตุผล ความละเอียด และคุณภาพของภาษา ตั้งแต่การตั้ง context ไปจนถึงการทำเอกสารและ workflow สำหรับทีม",
    instructor: "AiX Team",
    image: "assets/generated/course-ai-coding.jpg",
    price: 1999,
    rating: "4.8",
    learners: "เหมาะกับทีมการตลาด เจ้าของธุรกิจ และคนทำเอกสาร",
    duration: "4 ชั่วโมง",
    level: "Beginner to Practical",
    schedule: "เรียนออนไลน์ + ดูย้อนหลัง",
    lessons: "5 modules",
    outcomes: ["ตั้ง context ให้ Claude เข้าใจงานและข้อจำกัด", "วิเคราะห์ข้อมูลและสรุป insight เป็นเอกสารที่ใช้ต่อได้", "สร้าง prompt สำหรับงานเขียน แผนงาน และ research", "ทำ checklist ตรวจคุณภาพ output ก่อนส่งงาน"],
    skills: ["Claude", "Prompt Context", "AI Writing", "Research Summary", "Document Workflow", "Quality Review"],
    tools: ["Claude", "Google Docs", "ChatGPT", "Notion", "Google Sheets"],
    brandFocus: [["Claude"], ["Claude", "Google Docs"], ["Claude", "ChatGPT"], ["Google Docs", "Notion"], ["Notion", "Google Sheets"]],
    info: [["รูปแบบเรียน", "บทเรียนวิดีโอพร้อมตัวอย่าง"], ["ระดับ", "เริ่มต้นได้"], ["ภาษา", "ภาษาไทย"], ["Resource", "Prompt Library, Review Checklist"]],
    syllabus: [
      { title: "Module 1: Claude สำหรับงานจริง", time: "40 นาที", points: ["เข้าใจจุดแข็งของ Claude", "เลือกงานที่เหมาะ", "ตั้งเป้าหมาย output"] },
      { title: "Module 2: Context Prompting", time: "55 นาที", points: ["ใส่บทบาทและข้อมูลพื้นหลัง", "กำหนด format", "ทำ prompt reusable"] },
      { title: "Module 3: Research & Analysis", time: "60 นาที", points: ["แตกคำถาม", "สรุปข้อมูล", "เปลี่ยน insight เป็นข้อเสนอ"] },
      { title: "Module 4: Document Workflow", time: "55 นาที", points: ["ร่างเอกสาร", "รีไรต์ตาม audience", "ตรวจความครบถ้วน"] },
      { title: "Module 5: Team Playbook", time: "50 นาที", points: ["ทำ template สำหรับทีม", "ตั้งเกณฑ์ตรวจงาน", "ลดงานซ้ำ"] }
    ],
    project: "ผู้เรียนจะสร้าง Claude workflow สำหรับงานหนึ่งประเภท เช่น proposal, content brief, report summary หรือ SOP พร้อม prompt template และ checklist ตรวจคุณภาพ",
    faq: [["Claude ต่างจาก ChatGPT อย่างไร?", "คอร์สจะสอนวิธีเลือกใช้ตามลักษณะงาน และเน้นงานที่ Claude ทำได้เด่น เช่น เอกสารยาว การวิเคราะห์ และการเรียบเรียง"], ["ต้องมี Claude Pro ไหม?", "เรียนได้แม้ใช้แพ็กเกจพื้นฐาน แต่บางตัวอย่างจะทำงานได้เต็มขึ้นเมื่อมี quota สูงกว่า"]]
  },
  "ai-video-graphic": {
    id: "ai-video-graphic",
    title: "AI Video & Graphic",
    type: "Creative Class",
    status: "พร้อมเรียน",
    subtitle: "สร้างภาพ วิดีโอ และสื่อโฆษณาด้วย AI ให้มีทิศทางแบรนด์ชัด ใช้งานได้จริง และผลิตซ้ำได้เร็วขึ้น",
    overview: "คอร์สนี้เน้น workflow งานครีเอทีฟด้วย AI ตั้งแต่การออกแบบ visual direction, เขียน prompt ภาพ, ทำ storyboard, สร้างวิดีโอสั้น และเตรียม asset สำหรับแคมเปญ",
    instructor: "AiX Team",
    image: "assets/generated/course-creative-ai.jpg",
    price: 1999,
    rating: "4.8",
    learners: "เหมาะกับ Creator, Marketer, Designer และเจ้าของแบรนด์",
    duration: "5 ชั่วโมง",
    level: "Practical",
    schedule: "เรียนออนไลน์ + workshop",
    lessons: "6 modules",
    outcomes: ["วาง visual direction สำหรับแบรนด์หรือแคมเปญ", "เขียน prompt เพื่อสร้างภาพประกอบและ key visual", "สร้าง storyboard และวิดีโอสั้นด้วย AI", "จัด workflow ตรวจงานและปรับภาพให้สื่อสารตรงโจทย์"],
    skills: ["AI Image", "AI Video", "Visual Direction", "Storyboard", "Creative Prompt", "Campaign Asset"],
    tools: ["Image Model", "Runway", "Midjourney", "Canva", "CapCut", "ChatGPT"],
    brandFocus: [["ChatGPT", "Canva"], ["Image Model", "Midjourney"], ["Canva", "Image Model"], ["ChatGPT", "Runway"], ["Runway", "CapCut"], ["Canva", "CapCut"]],
    info: [["รูปแบบเรียน", "วิดีโอพร้อมแบบฝึกหัด"], ["ระดับ", "เหมาะกับผู้เริ่มใช้ AI creative"], ["ภาษา", "ภาษาไทย"], ["Resource", "Prompt Pack, Storyboard Template"]],
    syllabus: [
      { title: "Module 1: Creative Brief to Visual Direction", time: "45 นาที", points: ["อ่านโจทย์แบรนด์", "กำหนด mood", "เลือก reference ให้ถูก"] },
      { title: "Module 2: Prompt ภาพที่ควบคุมได้", time: "60 นาที", points: ["กำหนด subject, style, lighting", "สร้างหลาย variation", "คุมความสม่ำเสมอ"] },
      { title: "Module 3: Key Visual สำหรับแคมเปญ", time: "60 นาที", points: ["ทำภาพหลัก", "เตรียม asset", "ตรวจความพร้อมใช้งาน"] },
      { title: "Module 4: Storyboard & Script", time: "50 นาที", points: ["แตก scene", "เขียน shot list", "ทำ prompt วิดีโอ"] },
      { title: "Module 5: AI Video Workflow", time: "70 นาที", points: ["สร้างคลิปสั้น", "แก้ motion", "จัดไฟล์ส่งตัดต่อ"] },
      { title: "Module 6: Content Production System", time: "50 นาที", points: ["ทำ template", "วางรอบผลิตงาน", "เก็บ prompt ที่ใช้ซ้ำ"] }
    ],
    project: "ผู้เรียนจะสร้างชุด asset หนึ่งแคมเปญ ประกอบด้วย key visual, prompt library, storyboard และวิดีโอสั้นที่พร้อมนำไปต่อยอดในงานโฆษณาหรือคอนเทนต์",
    faq: [["ต้องเป็นนักออกแบบไหม?", "ไม่จำเป็น แต่คอร์สจะช่วยให้สื่อสารงานภาพกับ AI และทีม creative ได้ชัดขึ้น"], ["ภาพที่สร้างเอาไปใช้เชิงพาณิชย์ได้ไหม?", "ต้องตรวจเงื่อนไขของเครื่องมือที่ใช้ คอร์สจะย้ำจุดที่ควรตรวจเรื่องสิทธิ์และ brand safety"]]
  },
  "ai-agent-business": {
    id: "ai-agent-business",
    title: "AI Agent for Business",
    type: "Business Track",
    status: "เปิดรับสมาชิก",
    subtitle: "ออกแบบ AI Agent สำหรับฝ่ายขาย บริการลูกค้า คอนเทนต์ และงานปฏิบัติการ เพื่อให้ทีมทำงานเร็วขึ้นอย่างวัดผลได้",
    overview: "คอร์สนี้สอนวิธีออกแบบ AI Agent จากปัญหาธุรกิจจริง กำหนดข้อมูลที่ต้องใช้ ตั้งขอบเขตการตัดสินใจ และวาง human-in-the-loop เพื่อให้ระบบปลอดภัยและใช้ต่อในทีมได้",
    instructor: "AiX Team",
    image: "assets/generated/course-ai-agent.jpg",
    price: 1999,
    rating: "4.9",
    learners: "เหมาะกับ SME, Sales, Operation และ Customer Support",
    duration: "6 ชั่วโมง",
    level: "Practical",
    schedule: "เรียนสด + ดูย้อนหลัง",
    lessons: "7 modules",
    outcomes: ["วิเคราะห์งานซ้ำที่เหมาะกับ AI Agent", "ออกแบบ instruction และ knowledge ให้ Agent ทำงานตรงบทบาท", "วาง workflow สำหรับฝ่ายขายและบริการลูกค้า", "ตั้งเกณฑ์ตรวจผลลัพธ์และจุดอนุมัติโดยมนุษย์"],
    skills: ["AI Agent Design", "Business Process", "Automation", "Knowledge Base", "Human Review", "KPI"],
    tools: ["Manus AI", "ChatGPT", "Claude", "Make", "n8n", "Google Workspace"],
    brandFocus: [["ChatGPT", "Claude"], ["Manus AI"], ["Claude", "Google Workspace"], ["Manus AI", "ChatGPT"], ["Make", "n8n"], ["Google Workspace", "Claude"], ["Manus AI", "Make"]],
    info: [["รูปแบบเรียน", "Workshop พร้อมกรณีธุรกิจ"], ["ระดับ", "เหมาะกับคนทำงานธุรกิจ"], ["ภาษา", "ภาษาไทย"], ["Resource", "Agent Canvas, KPI Checklist"]],
    syllabus: [
      { title: "Module 1: Agent Use Case Mapping", time: "50 นาที", points: ["หา pain point", "เลือกงานที่คุ้มค่า", "กำหนด KPI"] },
      { title: "Module 2: Agent Canvas", time: "60 นาที", points: ["กำหนด role", "กำหนด input/output", "ตั้งข้อห้ามและข้อควรระวัง"] },
      { title: "Module 3: Knowledge & Prompt System", time: "65 นาที", points: ["เตรียม knowledge base", "เขียน instruction", "ทดสอบหลายสถานการณ์"] },
      { title: "Module 4: Sales & Customer Workflow", time: "70 นาที", points: ["ตอบคำถามลูกค้า", "คัด lead", "สรุป conversation"] },
      { title: "Module 5: Automation Integration", time: "65 นาที", points: ["เชื่อมเครื่องมือ", "ตั้ง trigger", "ทำ approval step"] },
      { title: "Module 6: Evaluation & Governance", time: "50 นาที", points: ["ตรวจคุณภาพ", "ลดความเสี่ยง", "วางคู่มือใช้งาน"] },
      { title: "Module 7: Business Agent Project", time: "60 นาที", points: ["สร้าง Agent ของตัวเอง", "วางแผนทดลองใช้", "เก็บ feedback"] }
    ],
    project: "ผู้เรียนจะออกแบบ AI Agent สำหรับกระบวนการธุรกิจหนึ่งจุด พร้อม Agent Canvas, prompt instruction, workflow, KPI และแผนทดลองใช้กับทีม",
    faq: [["ต่างจากคอร์ส Manus AI อย่างไร?", "คอร์สนี้เน้นการออกแบบ Agent เชิงระบบธุรกิจและการวัดผล ส่วน Manus AI จะลงลึกเครื่องมือและ workflow เฉพาะทางมากขึ้น"], ["ต้องมีทีมเทคนิคไหม?", "ไม่จำเป็นสำหรับการเริ่มต้น แต่คอร์สจะช่วยให้สื่อสารกับทีมเทคนิคได้ชัดขึ้นเมื่ออยากขยายระบบ"]]
  }
};

const fallbackCourse = detailCourses["manus-ai"];
const API_ORIGIN = window.location.protocol === "file:" ? "http://localhost:3000" : window.location.origin;
const AUTH_TOKEN_KEY = "aix_member_token";
let currentMember = null;

const aiBrandCatalog = {
  "Manus AI": { mark: "M", className: "manus" },
  "Claude": { mark: "C", className: "claude" },
  "ChatGPT": { mark: "GPT", className: "chatgpt" },
  "Make": { mark: "Mk", className: "make" },
  "n8n": { mark: "n8n", className: "n8n" },
  "Google Sheets": { mark: "G", className: "google" },
  "Google Docs": { mark: "G", className: "google" },
  "Google Workspace": { mark: "G", className: "google" },
  "Cursor": { mark: "Cu", className: "cursor" },
  "GitHub": { mark: "GH", className: "github" },
  "Browser DevTools": { mark: "Dev", className: "devtools" },
  "Image Model": { mark: "IM", className: "image-model" },
  "Runway": { mark: "R", className: "runway" },
  "Midjourney": { mark: "MJ", className: "midjourney" },
  "Canva": { mark: "Ca", className: "canva" },
  "CapCut": { mark: "CC", className: "capcut" },
  "Notion": { mark: "N", className: "notion" }
};

function renderBrandLogo(name, compact = false) {
  const brand = aiBrandCatalog[name] || { mark: name.slice(0, 2), className: "default" };
  return `
    <span class="ai-brand-chip ${compact ? "compact" : ""} brand-${brand.className}" title="${name}">
      <span class="brand-mark">${brand.mark}</span>
      <span class="brand-name">${name}</span>
    </span>
  `;
}

async function apiRequest(path) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) throw new Error("api unavailable");
  return response.json();
}

async function restoreMemberSession() {
  try {
    const result = await apiRequest("/api/auth/me");
    currentMember = result.member;
  } catch (error) {
    currentMember = null;
  }
}

function updateDetailCtas(course) {
  const ctas = [
    document.getElementById("detailNavCta"),
    document.getElementById("detailMainCta"),
    document.getElementById("detailProjectCta")
  ].filter(Boolean);

  const label = !currentMember
    ? "สมัคร AiX Member"
    : currentMember.paymentStatus === "paid"
      ? "เข้าเรียน"
      : "ชำระเงินเพื่อเข้าเรียน";
  const href = !currentMember
    ? "index.html#membership"
    : currentMember.paymentStatus === "paid"
      ? `/course/${encodeURIComponent(course.id)}/start`
      : "/payment";

  ctas.forEach((cta) => {
    cta.textContent = label;
    cta.href = href;
  });
}

function getCourseId() {
  return new URLSearchParams(window.location.search).get("id") || "manus-ai";
}

function getCourse() {
  const id = getCourseId();
  return detailCourses[id] || fallbackCourse;
}

async function loadCourseFromDatabase() {
  const id = getCourseId();
  try {
    const response = await fetch(`${API_ORIGIN}/api/platform/courses/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error("course api unavailable");
    return await response.json();
  } catch (error) {
    return getCourse();
  }
}

function normalizeCourse(course) {
  const fallback = getCourse();
  return {
    ...fallback,
    ...course,
    title: course.title || course.name || fallback.title,
    description: course.description || course.subtitle || fallback.description,
    subtitle: course.subtitle || course.description || fallback.subtitle,
    overview: course.overview || course.description || fallback.overview,
    rating: course.rating || fallback.rating,
    skills: Array.isArray(course.skills) && course.skills.length ? course.skills : fallback.skills,
    tools: Array.isArray(course.tools) && course.tools.length ? course.tools : fallback.tools,
    outcomes: Array.isArray(course.outcomes) && course.outcomes.length ? course.outcomes : fallback.outcomes,
    info: Array.isArray(course.info) && course.info.length ? course.info : fallback.info,
    syllabus: Array.isArray(course.syllabus) && course.syllabus.length ? course.syllabus : fallback.syllabus,
    faq: Array.isArray(course.faq) && course.faq.length ? course.faq : fallback.faq,
    brandFocus: Array.isArray(course.brandFocus) && course.brandFocus.length ? course.brandFocus : fallback.brandFocus
  };
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function absoluteSiteUrl(path = "") {
  if (/^https?:\/\//.test(path)) return path;
  return `https://www.aixclub.co/${String(path || "").replace(/^\/+/, "")}`;
}

function renderDetail(rawCourse = getCourse()) {
  const course = normalizeCourse(rawCourse);
  const canonicalUrl = `https://www.aixclub.co/class-detail.html?id=${encodeURIComponent(course.id)}`;
  const imageUrl = absoluteSiteUrl(course.image);
  document.title = `${course.title} | รายละเอียดคอร์ส AiX Club`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", `${course.title} ${course.subtitle}`);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${course.title} | AiX Club`);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", course.subtitle);
  document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", `${course.title} | AiX Club`);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", course.subtitle);
  document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", imageUrl);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);

  setText("detailType", course.type);
  setText("detailTitle", course.title);
  setText("detailSubtitle", course.subtitle);
  setText("detailInstructor", course.instructor);
  setText("detailStatus", course.status);
  setText("detailEnrollTitle", course.price ? `เริ่มเรียนผ่าน AiX Member ฿${course.price.toLocaleString()}` : "รวมใน AiX Member");
  setText("detailEnrollCopy", course.subtitle);
  setText("detailOverview", course.overview);
  setText("detailProject", course.project);
  updateDetailCtas(course);

  const image = document.getElementById("detailImage");
  if (image) {
    image.src = course.image;
    image.alt = `${course.title} - AiX Club`;
  }

  document.getElementById("detailStats").innerHTML = [
    ["fa-solid fa-star", course.rating],
    ["fa-solid fa-layer-group", course.lessons],
    ["fa-regular fa-clock", course.duration],
    ["fa-solid fa-signal", course.level]
  ].map(([icon, label]) => `<span><i class="${icon}"></i>${label}</span>`).join("");

  document.getElementById("detailMini").innerHTML = [
    ["fa-solid fa-users", course.learners],
    ["fa-solid fa-calendar-check", course.schedule],
    ["fa-solid fa-globe", "เรียนออนไลน์ ภาษาไทย"]
  ].map(([icon, label]) => `<span><i class="${icon}"></i>${label}</span>`).join("");

  document.getElementById("detailBrandStrip").innerHTML = course.tools.slice(0, 5).map((tool) => renderBrandLogo(tool, true)).join("");

  document.getElementById("detailOutcomes").innerHTML = course.outcomes.map((item) => `
    <article><i class="fa-solid fa-check"></i><span>${item}</span></article>
  `).join("");

  document.getElementById("detailSkills").innerHTML = course.skills.map((skill) => `<span>${skill}</span>`).join("");
  document.getElementById("detailBrandBoard").innerHTML = course.tools.map((tool) => renderBrandLogo(tool)).join("");
  document.getElementById("detailTools").innerHTML = course.tools.map((tool) => `<span><i class="fa-solid fa-toolbox"></i>${tool}</span>`).join("");

  document.getElementById("detailInfo").innerHTML = course.info.map(([label, value]) => `
    <article>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  document.getElementById("detailSyllabus").innerHTML = course.syllabus.map((module, index) => `
    <article class="syllabus-item">
      <div class="syllabus-number">${index + 1}</div>
      <div>
        <span>${module.time}</span>
        <h3>${module.title}</h3>
        <div class="module-brand-row">${(course.brandFocus?.[index] || course.tools.slice(0, 2)).map((tool) => renderBrandLogo(tool, true)).join("")}</div>
        <ul>${module.points.map((point) => `<li>${point}</li>`).join("")}</ul>
      </div>
    </article>
  `).join("");

  document.getElementById("detailFaq").innerHTML = course.faq.map(([question, answer], index) => `
    <details ${index === 0 ? "open" : ""}>
      <summary>${question}</summary>
      <p>${answer}</p>
    </details>
  `).join("");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.subtitle,
    "provider": {
      "@type": "Organization",
      "name": "AiX Club",
      "url": "https://www.aixclub.co/"
    },
    "image": imageUrl,
    "offers": {
      "@type": "Offer",
      "price": course.price || 1999,
      "priceCurrency": "THB",
      "availability": "https://schema.org/InStock"
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "instructor": {
        "@type": "Organization",
        "name": course.instructor
      }
    }
  };
  document.getElementById("courseJsonLd")?.remove();
  const script = document.createElement("script");
  script.id = "courseJsonLd";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

function initInteractions() {
  const panel = document.getElementById("detailMobilePanel");
  document.getElementById("detailMobileMenu")?.addEventListener("click", () => {
    panel?.classList.toggle("open");
  });

  document.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.scroll);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      panel?.classList.remove("open");
    });
  });

  document.getElementById("detailSearch")?.addEventListener("input", (event) => {
    const value = event.target.value.trim().toLowerCase();
    if (!value) return;
    const target = [...document.querySelectorAll("section")].find((section) => section.textContent.toLowerCase().includes(value));
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function initPage() {
  await restoreMemberSession();
  renderDetail(getCourse());
  initInteractions();
  const databaseCourse = await loadCourseFromDatabase();
  renderDetail(databaseCourse);
}

initPage();
