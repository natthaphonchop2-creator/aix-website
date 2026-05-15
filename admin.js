/* ============================================================
   AiX Club — Admin Panel JavaScript
   Auth, CRUD Courses, Leads, Members, Packages
   ============================================================ */

const ADMIN_API_ORIGIN = window.location.origin;
const ADMIN_AUTH_KEY = 'aixAdminAuth';
const ADMIN_TOKEN_KEY = 'aixAdminToken';

// ---- Initialize Shared Data (same as main site) ----
(function initSharedData() {
  if (!localStorage.getItem('aixCourses')) {
    const courses = {
      'ai-fundamentals': { name: 'AI Fundamentals: Zero to Hero', price: 1490, originalPrice: 4990, instructor: 'Dr. Nova Chen', level: 'beginner', hours: 42, lessons: 156, students: 8200, rating: 4.9, ratingCount: 2847, image: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=400&h=225&fit=crop', description: 'คอร์ส AI พื้นฐานครบครัน' },
      'prompt-engineering': { name: 'Prompt Engineering Mastery', price: 1290, originalPrice: 3990, instructor: 'Alex Cosmos', level: 'intermediate', hours: 28, lessons: 98, students: 5400, rating: 4.8, ratingCount: 1932, image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop', description: 'เทคนิค Prompt ขั้นสูง' },
      'computer-vision': { name: 'Computer Vision & Deep Learning', price: 1990, originalPrice: 5990, instructor: 'Dr. Nova Chen', level: 'advanced', hours: 38, lessons: 132, students: 3100, rating: 4.7, ratingCount: 1205, image: 'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=400&h=225&fit=crop', description: 'CNN, Object Detection' },
      'nlp': { name: 'Natural Language Processing', price: 1690, originalPrice: 4490, instructor: 'Alex Cosmos', level: 'intermediate', hours: 34, lessons: 118, students: 4700, rating: 4.8, ratingCount: 1687, image: 'https://images.unsplash.com/photo-1516110833967-0b5716ca1387?w=400&h=225&fit=crop', description: 'Transformers, Chatbots' },
      'ai-business': { name: 'AI for Business Automation', price: 990, originalPrice: 2990, instructor: 'Dr. Nova Chen', level: 'beginner', hours: 24, lessons: 88, students: 6300, rating: 4.9, ratingCount: 2103, image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=225&fit=crop', description: 'RPA, Workflow AI' },
      'gen-ai': { name: 'Generative AI & Creative Tools', price: 1890, originalPrice: 5490, instructor: 'Alex Cosmos', level: 'advanced', hours: 36, lessons: 124, students: 9100, rating: 4.9, ratingCount: 3421, image: 'https://images.unsplash.com/photo-1547954575-855750c57bd3?w=400&h=225&fit=crop', description: 'สร้างภาพ วิดีโอ เพลงด้วย AI' }
    };
    localStorage.setItem('aixCourses', JSON.stringify(courses));
  }
  if (!localStorage.getItem('aixPackages')) {
    const packages = {
      'explorer': { name: 'Explorer', price: 0, period: 'Free Forever', icon: '🔭', popular: false, enabled: true, features: ['เข้าถึง 2 คอร์สฟรี', 'Community Forum access', 'Monthly AI newsletter', 'Basic project templates'] },
      'navigator': { name: 'Navigator', price: 299, period: '/เดือน', icon: '🧭', popular: true, enabled: true, features: ['เข้าถึงทุกคอร์ส (6 คอร์ส)', 'Weekly live Q&A sessions', 'Certificate of Completion', 'Priority community support', 'Advanced project templates', 'Job referral program'] },
      'commander': { name: 'Commander', price: 599, period: '/เดือน', icon: '🚀', popular: false, enabled: true, features: ['ทุกอย่างใน Navigator', '1-on-1 mentoring (4x/mo)', 'Personal career coaching', 'Private Slack channel', 'Early access ฟีเจอร์ใหม่', 'Real-world client projects', 'Resume & portfolio review'] }
    };
    localStorage.setItem('aixPackages', JSON.stringify(packages));
  }
  if (!localStorage.getItem('aixLeads')) {
    localStorage.setItem('aixLeads', JSON.stringify([]));
  }
})();

// ---- Auth ----
let adminLoggedIn = Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

function showAdminLogin() {
  document.getElementById('adminLayout')?.style.setProperty('display', 'none');
  document.getElementById('loginPage')?.style.setProperty('display', '');
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  adminLoggedIn = false;
}

function adminRequestHeaders(headers = {}) {
  const next = new Headers(headers);
  const token = getAdminToken();
  if (token) next.set('Authorization', `Bearer ${token}`);
  return next;
}

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: adminRequestHeaders(options.headers)
  });

  if (res.status === 401 || res.status === 403) {
    clearAdminSession();
    showAdminLogin();
    throw new Error('Admin session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  return res;
}

async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const pw = document.getElementById('adminPassword').value;

  try {
     const res = await fetch(`${ADMIN_API_ORIGIN}/api/admin/login`, { 
         method: 'POST', 
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ email, password: pw })
     });
     const data = await res.json().catch(() => ({}));
     if (res.ok && data.token) {
         localStorage.setItem(ADMIN_AUTH_KEY, 'true');
         localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
         adminLoggedIn = true;
         document.getElementById('loginPage').style.display = 'none';
         document.getElementById('adminLayout').style.display = 'flex';
         initDashboard();
     } else {
         throw new Error(data.error || 'Invalid');
     }
  } catch(e) {
     document.getElementById('loginError').classList.add('show');
     setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
  }
}

function adminLogout() {
  clearAdminSession();
  location.reload();
}

// Auto-login check
if (adminLoggedIn) {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminLayout').style.display = 'flex';
  window.addEventListener('DOMContentLoaded', () => setTimeout(initDashboard, 100));
} else {
  // Handle enter key on login
  document.getElementById('adminPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adminLogin();
  });
}

// ---- Section Navigation ----
const sectionTitles = {
  dashboard: '📊 Dashboard',
  courses: '📚 จัดการคอร์สเรียน',
  replays: '🎥 Upload คลิปย้อนหลัง',
  resources: '🧰 Tools Set / Skill Set',
  schedules: '🗓️ ตารางสอนและแจ้งเตือน',
  leads: '📋 Leads (การลงทะเบียน)',
  members: '👥 จัดการสมาชิก',
  packages: '💎 จัดการแพ็คเกจ'
};

function switchSection(name) {
  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  // Show target
  const target = document.getElementById('sec-' + name);
  if (target) target.classList.add('active');

  // Update sidebar active
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`.sidebar-link[data-section="${name}"]`)?.classList.add('active');
  document.querySelectorAll('.mobile-admin-tab').forEach(l => l.classList.remove('active'));
  document.querySelector(`.mobile-admin-tab[data-section="${name}"]`)?.classList.add('active');

  // Update title
  document.getElementById('sectionTitle').textContent = sectionTitles[name] || name;

  // Refresh data
  if (name === 'dashboard') refreshDashboard();
  if (name === 'courses') renderCourses();
  if (name === 'replays') renderReplays();
  if (name === 'resources') renderResourcesAdmin();
  if (name === 'schedules') renderSchedules();
  if (name === 'leads') renderLeads();
  if (name === 'members') renderMembers();
  if (name === 'packages') renderPackages();
}

// ---- Toast ----
function adminToast(msg, type = 'info') {
  const existing = document.querySelector('.admin-toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.className = `admin-toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ---- Modal ----
function openAdminModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeAdminModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close on overlay click
document.querySelectorAll('.admin-modal-overlay').forEach(ov => {
  ov.addEventListener('click', (e) => {
    if (e.target === ov) ov.classList.remove('open');
  });
});

// ESC to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.admin-modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ---- Data Helpers (API) ----
let adminData = {
  courses: {},
  replays: [],
  resources: [],
  schedules: [],
  leads: [],
  members: {},
  packages: {},
  stats: {}
};

async function reloadAdminData() {
  try {
    const [cRes, rRes, resourceRes, scheduleRes, lRes, mRes, pRes, sRes] = await Promise.all([
      adminFetch(`${ADMIN_API_ORIGIN}/api/courses`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/admin/replays`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/admin/resources`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/admin/schedules`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/leads`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/members`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/packages`),
      adminFetch(`${ADMIN_API_ORIGIN}/api/stats`)
    ]);
    
    const coursesArr = await cRes.json();
    const replaysArr = await rRes.json();
    const resourcesArr = await resourceRes.json();
    const schedulesArr = await scheduleRes.json();
    const leadsArr = await lRes.json();
    const membersArr = await mRes.json();
    const packagesArr = await pRes.json();
    adminData.stats = await sRes.json();

    adminData.courses = Object.fromEntries(coursesArr.map(c => [c.id, c]));
    adminData.replays = replaysArr;
    adminData.resources = resourcesArr;
    adminData.schedules = schedulesArr;
    adminData.leads = leadsArr;
    adminData.members = Object.fromEntries(membersArr.map(m => [m.id, m])); 
    adminData.packages = Object.fromEntries(packagesArr.map(p => [p.id, p]));
  } catch (e) {
    console.error('Failed to load admin data', e);
  }
}

function getCourses() { return adminData.courses; }
function getReplays() { return adminData.replays; }
function getResourcesAdmin() { return adminData.resources; }
function getSchedules() { return adminData.schedules; }
function getLeads() { return adminData.leads; }
function getMembers() { return adminData.members; }
function getPackages() { return adminData.packages; }

// ============================================================
// DASHBOARD
// ============================================================
async function initDashboard() {
  await reloadAdminData();
  refreshDashboard();
  renderCourses();
  renderReplays();
  renderResourcesAdmin();
  renderSchedules();
  renderLeads();
  renderMembers();
  renderPackages();
  updateBadges();
}

function refreshDashboard() {
  const courses = getCourses();
  const leads = getLeads();
  const members = getMembers();

  const stats = adminData.stats;
  document.getElementById('statMembers').textContent = (stats.members || 0).toLocaleString();
  document.getElementById('statLeads').textContent = (stats.leads || 0).toLocaleString();
  document.getElementById('statCourses').textContent = (stats.courses || 0).toLocaleString();
  document.getElementById('statRevenue').textContent = '฿' + (stats.revenue || 0).toLocaleString();

  // Recent members
  const memberArr = Object.values(members)
    .sort((a, b) => new Date(b.createdAt || b.joinedDate || 0) - new Date(a.createdAt || a.joinedDate || 0))
    .slice(0, 5);

  const recentMembersEl = document.getElementById('recentMembers');
  if (memberArr.length === 0) {
    recentMembersEl.innerHTML = '<div class="empty-state"><p style="font-size:0.82rem;">ยังไม่มีสมาชิก</p></div>';
  } else {
    recentMembersEl.innerHTML = memberArr.map(m => `
      <div class="recent-item">
        <div class="ri-avatar">${escapeHtml(memberName(m).charAt(0).toUpperCase())}</div>
        <div class="ri-info">
          <div class="ri-name">${escapeHtml(memberName(m))}</div>
          <div class="ri-detail">${providerLabel(m.provider || m.authProvider)} • ${paymentLabel(m.paymentStatus)}</div>
        </div>
        <div class="ri-time">${formatDate(m.createdAt || m.joinedDate)}</div>
      </div>
    `).join('');
  }

  // Recent leads
  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)).slice(0, 5);
  const recentLeadsEl = document.getElementById('recentLeads');
  if (recentLeads.length === 0) {
    recentLeadsEl.innerHTML = '<div class="empty-state"><p style="font-size:0.82rem;">ยังไม่มี Lead</p></div>';
  } else {
    recentLeadsEl.innerHTML = recentLeads.map(l => `
      <div class="recent-item">
        <div class="ri-avatar">${(l.firstName || 'L').charAt(0).toUpperCase()}</div>
        <div class="ri-info">
          <div class="ri-name">${l.firstName} ${l.lastName}</div>
          <div class="ri-detail">${l.email} • <span class="status-badge status-${l.status}" style="padding:2px 6px;font-size:0.65rem;">${l.status}</span></div>
        </div>
        <div class="ri-time">${formatDate(l.createdAt || l.date)}</div>
      </div>
    `).join('');
  }

  updateBadges();
}

function updateBadges() {
  const courses = getCourses();
  const replays = getReplays();
  const resources = getResourcesAdmin();
  const schedules = getSchedules();
  const leads = getLeads();
  const members = getMembers();

  document.getElementById('coursesCount').textContent = Object.keys(courses).length;
  document.getElementById('replaysCount').textContent = replays.length;
  document.getElementById('resourcesCount').textContent = resources.length;
  document.getElementById('schedulesCount').textContent = schedules.length;
  document.getElementById('leadsCount').textContent = leads.length;
  document.getElementById('membersCount').textContent = Object.keys(members).length;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toDateInput(value = '') {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function fromDateInput(value = '') {
  return value ? new Date(`${value}T00:00:00`).toISOString() : '';
}

function formatDateTime(value = '') {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function toDateTimeInput(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeInput(value = '') {
  return value ? new Date(value).toISOString() : '';
}

function courseOptions(selected = '', includeGlobal = false) {
  const options = Object.values(getCourses()).map((course) => {
    const id = course.id;
    const title = course.name || course.title || id;
    return `<option value="${escapeHtml(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(title)}</option>`;
  }).join('');
  return `${includeGlobal ? `<option value="" ${!selected ? 'selected' : ''}>ใช้กับสมาชิกทุกคอร์ส</option>` : ''}${options}`;
}

function resourceTypeLabel(type = '') {
  const map = { tool: 'Tool Set', skill: 'Skill Set', template: 'Template', file: 'File', link: 'Link' };
  return map[type] || type || '-';
}

function memberName(member = {}) {
  return member.displayName || member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || '-';
}

function providerLabel(provider = '') {
  const key = String(provider || '').toLowerCase();
  if (key === 'google') return 'Google';
  if (key === 'email') return 'Email';
  return key || '-';
}

function paymentLabel(status = '') {
  return status === 'paid' ? 'ชำระแล้ว' : 'ยังไม่ชำระ';
}

function courseHours(course = {}) {
  return Number(course.hours ?? String(course.duration || '').match(/\d+/)?.[0] ?? 0);
}

function courseLessons(course = {}) {
  return Number(course.lessonsCount ?? String(course.lessons || '').match(/\d+/)?.[0] ?? 0);
}

// ============================================================
// COURSES CRUD
// ============================================================
function renderCourses() {
  const courses = getCourses();
  const search = (document.getElementById('courseSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('coursesTableBody');

  const entries = Object.entries(courses).filter(([id, c]) => {
    const title = c.name || c.title || '';
    return title.toLowerCase().includes(search) || (c.instructor || '').toLowerCase().includes(search);
  });

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📚</div><p>ไม่พบคอร์ส</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(([id, c]) => {
    const title = c.name || c.title || '-';
    const status = c.featured ? (c.status || 'เปิดบน Platform') : 'ซ่อนจาก Platform';
    return `
      <tr>
        <td>
          <div class="cell-main">${escapeHtml(title)}</div>
          <div class="cell-small">${courseHours(c)}h • ${courseLessons(c)} lessons • ${escapeHtml(status)}</div>
        </td>
        <td>${escapeHtml(c.instructor || '-')}</td>
        <td><span class="level-badge level-${escapeHtml(c.level || 'beginner')}">${escapeHtml(c.level || 'beginner')}</span></td>
        <td>
          <span class="cell-price">฿${(c.price || 0).toLocaleString()}</span>
          ${c.originalPrice ? `<br><span class="cell-small" style="text-decoration:line-through;">฿${c.originalPrice.toLocaleString()}</span>` : ''}
        </td>
        <td>${(c.students || 0).toLocaleString()}</td>
        <td>
          <span style="color:var(--accent-gold);font-weight:600;">★ ${escapeHtml(c.rating || '-')}</span>
          <div class="cell-small">(${(c.ratingCount || 0).toLocaleString()})</div>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="editCourse('${id}')" title="แก้ไข"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-del" onclick="requestDelete('course','${id}','${escapeHtml(title)}')" title="ลบ"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCourseModal(id = null) {
  document.getElementById('courseEditId').value = id || '';
  document.getElementById('courseModalTitle').textContent = id ? '✏️ แก้ไขคอร์ส' : '➕ เพิ่มคอร์สใหม่';

  if (id) {
    const c = getCourses()[id];
    if (!c) return;
    document.getElementById('courseFormName').value = c.name || c.title || '';
    document.getElementById('courseFormType').value = c.type || '';
    document.getElementById('courseFormStatus').value = c.status || 'เปิดรับสมัคร';
    document.getElementById('courseFormPrice').value = c.price || '';
    document.getElementById('courseFormOriginalPrice').value = c.originalPrice || '';
    document.getElementById('courseFormInstructor').value = c.instructor || '';
    document.getElementById('courseFormLevel').value = c.level || 'beginner';
    document.getElementById('courseFormHours').value = courseHours(c) || '';
    document.getElementById('courseFormLessons').value = courseLessons(c) || '';
    document.getElementById('courseFormImage').value = c.image || '';
    document.getElementById('courseFormDesc').value = c.description || '';
    document.getElementById('courseFormFeatured').checked = c.featured !== false;
  } else {
    document.getElementById('courseFormName').value = '';
    document.getElementById('courseFormType').value = '';
    document.getElementById('courseFormStatus').value = 'เปิดรับสมัคร';
    document.getElementById('courseFormPrice').value = '';
    document.getElementById('courseFormOriginalPrice').value = '';
    document.getElementById('courseFormInstructor').value = '';
    document.getElementById('courseFormLevel').value = 'beginner';
    document.getElementById('courseFormHours').value = '';
    document.getElementById('courseFormLessons').value = '';
    document.getElementById('courseFormImage').value = '';
    document.getElementById('courseFormDesc').value = '';
    document.getElementById('courseFormFeatured').checked = true;
  }

  openAdminModal('courseModal');
}

function editCourse(id) {
  openCourseModal(id);
}

async function saveCourse(event) {
  event.preventDefault();

  const idStr = document.getElementById('courseEditId').value;
  const isEdit = !!idStr;
  
  const payload = {
    name: document.getElementById('courseFormName').value,
    type: document.getElementById('courseFormType').value,
    status: document.getElementById('courseFormStatus').value,
    price: parseInt(document.getElementById('courseFormPrice').value) || 0,
    originalPrice: parseInt(document.getElementById('courseFormOriginalPrice').value) || 0,
    instructor: document.getElementById('courseFormInstructor').value,
    level: document.getElementById('courseFormLevel').value,
    hours: parseInt(document.getElementById('courseFormHours').value) || 0,
    lessons: parseInt(document.getElementById('courseFormLessons').value) || 0,
    image: document.getElementById('courseFormImage').value,
    description: document.getElementById('courseFormDesc').value,
    featured: document.getElementById('courseFormFeatured').checked
  };

  const url = isEdit ? `${ADMIN_API_ORIGIN}/api/courses/${idStr}` : `${ADMIN_API_ORIGIN}/api/courses`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await adminFetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot save course');
    }
    closeAdminModal('courseModal');
    await initDashboard(); 
    adminToast(isEdit ? '✅ แก้ไขคอร์สสำเร็จ' : '✅ เพิ่มคอร์สสำเร็จ', 'success');
  } catch(e) { 
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
  return false;
}

// ============================================================
// REPLAYS, RESOURCES, SCHEDULES
// ============================================================
function renderReplays() {
  const search = (document.getElementById('replaySearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('replaysTableBody');
  const rows = getReplays().filter((item) => {
    return `${item.title || ''} ${item.courseTitle || ''} ${item.description || ''}`.toLowerCase().includes(search);
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🎥</div><p>ยังไม่มีคลิปย้อนหลัง</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((item) => {
    const source = item.filePath ? 'ไฟล์อัปโหลด' : (item.videoUrl ? 'ลิงก์วิดีโอ' : 'ยังไม่มีไฟล์');
    const playableUrl = item.videoUrl || item.filePath || '';
    return `
      <tr>
        <td>
          <div class="cell-main">${escapeHtml(item.title)}</div>
          <div class="cell-small">${escapeHtml(item.description || '-')}</div>
        </td>
        <td>${escapeHtml(item.courseTitle || item.courseId || '-')}</td>
        <td>${escapeHtml(item.durationText || item.duration || '-')}</td>
        <td>
          <span class="status-badge ${playableUrl ? 'status-active' : 'status-disabled'}">${source}</span>
          ${playableUrl ? `<div class="cell-small">${escapeHtml(playableUrl)}</div>` : ''}
        </td>
        <td>
          <div class="action-btns">
            ${playableUrl ? `<a class="action-btn btn-view" href="${escapeHtml(playableUrl)}" target="_blank" title="เปิด"><i class="fas fa-play"></i></a>` : ''}
            <button class="action-btn" onclick="openReplayModal('${item.id}')" title="แก้ไข"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-del" onclick="requestDelete('replay','${item.id}','${escapeHtml(item.title)}')" title="ลบ"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openReplayModal(id = null) {
  const item = id ? getReplays().find((entry) => entry.id === id) : null;
  document.getElementById('replayEditId').value = id || '';
  document.getElementById('replayModalTitle').textContent = id ? '🎥 แก้ไขคลิปย้อนหลัง' : '🎥 เพิ่มคลิปย้อนหลัง';
  document.getElementById('replayFormCourse').innerHTML = courseOptions(item?.courseId || '');
  document.getElementById('replayFormTitle').value = item?.title || '';
  document.getElementById('replayFormDuration').value = item?.durationText || item?.duration || '';
  document.getElementById('replayFormVideoUrl').value = item?.videoUrl && item.videoUrl !== item.filePath ? item.videoUrl : '';
  document.getElementById('replayFormVideo').value = '';
  document.getElementById('replayFormSort').value = item?.sortOrder || 0;
  document.getElementById('replayFormVisibility').value = item?.visibility || 'members';
  document.getElementById('replayFormDescription').value = item?.description || '';
  document.getElementById('replayFileNote').textContent = item?.filePath
    ? `ไฟล์ปัจจุบัน: ${item.filePath}`
    : 'รองรับไฟล์วิดีโอ ขนาดสูงสุด 800MB';
  openAdminModal('replayModal');
}

async function saveReplay(event) {
  event.preventDefault();
  const id = document.getElementById('replayEditId').value;
  const formData = new FormData();
  const file = document.getElementById('replayFormVideo').files[0];
  formData.append('courseId', document.getElementById('replayFormCourse').value);
  formData.append('title', document.getElementById('replayFormTitle').value);
  formData.append('durationText', document.getElementById('replayFormDuration').value);
  formData.append('videoUrl', document.getElementById('replayFormVideoUrl').value);
  formData.append('sortOrder', document.getElementById('replayFormSort').value);
  formData.append('visibility', document.getElementById('replayFormVisibility').value);
  formData.append('description', document.getElementById('replayFormDescription').value);
  if (file) formData.append('video', file);

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/replays${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot save replay');
    }
    closeAdminModal('replayModal');
    await initDashboard();
    adminToast('✅ บันทึกคลิปย้อนหลังสำเร็จ', 'success');
  } catch (e) {
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
  return false;
}

function renderResourcesAdmin() {
  const search = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
  const tbody = document.getElementById('resourcesTableBody');
  const rows = getResourcesAdmin().filter((item) => {
    return `${item.title || ''} ${item.courseTitle || ''} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(search);
  });

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🧰</div><p>ยังไม่มี Tools หรือ Skill Set</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((item) => {
    const link = item.url || item.filePath || '';
    return `
      <tr>
        <td>
          <div class="cell-main">${escapeHtml(item.title)}</div>
          <div class="cell-small">${escapeHtml(item.description || '-')}</div>
        </td>
        <td><span class="status-badge status-active">${escapeHtml(resourceTypeLabel(item.type))}</span></td>
        <td>${escapeHtml(item.courseTitle || (item.courseId ? item.courseId : 'ทุกคอร์ส'))}</td>
        <td><div class="tag-list">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('') || '<span>-</span>'}</div></td>
        <td>
          <div class="action-btns">
            ${link ? `<a class="action-btn btn-view" href="${escapeHtml(link)}" target="_blank" title="เปิด"><i class="fas fa-arrow-up-right-from-square"></i></a>` : ''}
            <button class="action-btn" onclick="openResourceModal('${item.id}')" title="แก้ไข"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-del" onclick="requestDelete('resource','${item.id}','${escapeHtml(item.title)}')" title="ลบ"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openResourceModal(id = null) {
  const item = id ? getResourcesAdmin().find((entry) => entry.id === id) : null;
  document.getElementById('resourceEditId').value = id || '';
  document.getElementById('resourceModalTitle').textContent = id ? '🧰 แก้ไข Resource' : '🧰 เพิ่ม Resource';
  document.getElementById('resourceFormType').value = item?.type || 'tool';
  document.getElementById('resourceFormCourse').innerHTML = courseOptions(item?.courseId || '', true);
  document.getElementById('resourceFormTitle').value = item?.title || '';
  document.getElementById('resourceFormUrl').value = item?.url && item.url !== item.filePath ? item.url : '';
  document.getElementById('resourceFormFile').value = '';
  document.getElementById('resourceFormTags').value = (item?.tags || []).join(', ');
  document.getElementById('resourceFormSort').value = item?.sortOrder || 0;
  document.getElementById('resourceFormDescription').value = item?.description || '';
  openAdminModal('resourceModal');
}

async function saveResource(event) {
  event.preventDefault();
  const id = document.getElementById('resourceEditId').value;
  const formData = new FormData();
  const file = document.getElementById('resourceFormFile').files[0];
  formData.append('type', document.getElementById('resourceFormType').value);
  formData.append('courseId', document.getElementById('resourceFormCourse').value);
  formData.append('title', document.getElementById('resourceFormTitle').value);
  formData.append('url', document.getElementById('resourceFormUrl').value);
  formData.append('tags', document.getElementById('resourceFormTags').value);
  formData.append('sortOrder', document.getElementById('resourceFormSort').value);
  formData.append('description', document.getElementById('resourceFormDescription').value);
  if (file) formData.append('file', file);

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/resources${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: formData
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot save resource');
    }
    closeAdminModal('resourceModal');
    await initDashboard();
    adminToast('✅ บันทึก Resource สำเร็จ', 'success');
  } catch (e) {
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
  return false;
}

function renderSchedules() {
  const tbody = document.getElementById('schedulesTableBody');
  const rows = getSchedules();
  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🗓️</div><p>ยังไม่มีตารางเรียน</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((item) => `
    <tr>
      <td>
        <div class="cell-main">${escapeHtml(item.title)}</div>
        <div class="cell-small">${escapeHtml(item.description || '-')}</div>
      </td>
      <td>${escapeHtml(item.courseTitle || item.courseId || '-')}</td>
      <td>
        ${formatDateTime(item.startsAt)}
        ${item.endsAt ? `<div class="cell-small">ถึง ${formatDateTime(item.endsAt)}</div>` : ''}
      </td>
      <td><span class="status-badge status-contacted">${Number(item.notifyBeforeMinutes || 0).toLocaleString()} นาที</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn btn-view" onclick="notifySchedule('${item.id}')" title="ส่งแจ้งเตือน"><i class="fas fa-bell"></i></button>
          <button class="action-btn" onclick="openScheduleModal('${item.id}')" title="แก้ไข"><i class="fas fa-edit"></i></button>
          <button class="action-btn btn-del" onclick="requestDelete('schedule','${item.id}','${escapeHtml(item.title)}')" title="ลบ"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openScheduleModal(id = null) {
  const item = id ? getSchedules().find((entry) => entry.id === id) : null;
  document.getElementById('scheduleEditId').value = id || '';
  document.getElementById('scheduleModalTitle').textContent = id ? '🗓️ แก้ไขตารางเรียน' : '🗓️ เพิ่มตารางเรียน';
  document.getElementById('scheduleFormCourse').innerHTML = courseOptions(item?.courseId || '');
  document.getElementById('scheduleFormTitle').value = item?.title || '';
  document.getElementById('scheduleFormStartsAt').value = toDateTimeInput(item?.startsAt || '');
  document.getElementById('scheduleFormEndsAt').value = toDateTimeInput(item?.endsAt || '');
  document.getElementById('scheduleFormMeetingUrl').value = item?.meetingUrl || '';
  document.getElementById('scheduleFormNotifyBefore').value = item?.notifyBeforeMinutes || 1440;
  document.getElementById('scheduleFormDescription').value = item?.description || '';
  document.getElementById('scheduleFormNotifyNow').checked = false;
  openAdminModal('scheduleModal');
}

async function saveSchedule(event) {
  event.preventDefault();
  const id = document.getElementById('scheduleEditId').value;
  const payload = {
    courseId: document.getElementById('scheduleFormCourse').value,
    title: document.getElementById('scheduleFormTitle').value,
    startsAt: fromDateTimeInput(document.getElementById('scheduleFormStartsAt').value),
    endsAt: fromDateTimeInput(document.getElementById('scheduleFormEndsAt').value),
    meetingUrl: document.getElementById('scheduleFormMeetingUrl').value,
    notifyBeforeMinutes: parseInt(document.getElementById('scheduleFormNotifyBefore').value, 10) || 1440,
    description: document.getElementById('scheduleFormDescription').value,
    notifyNow: document.getElementById('scheduleFormNotifyNow').checked
  };

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/schedules${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot save schedule');
    }
    closeAdminModal('scheduleModal');
    await initDashboard();
    adminToast('✅ บันทึกตารางเรียนสำเร็จ', 'success');
  } catch (e) {
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
  return false;
}

async function notifySchedule(id) {
  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/schedules/${id}/notify`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Cannot notify');
    adminToast(`✅ ส่งแจ้งเตือนแล้ว ${data.created || 0} รายการ`, 'success');
    await initDashboard();
  } catch (e) {
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
}

// ============================================================
// LEADS MANAGEMENT
// ============================================================
function renderLeads() {
  const leads = getLeads();
  const courses = getCourses();
  const search = (document.getElementById('leadSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('leadFilter')?.value || 'all';
  const tbody = document.getElementById('leadsTableBody');

  let filtered = leads.filter(l => {
    const matchSearch = `${l.firstName} ${l.lastName} ${l.email}`.toLowerCase().includes(search);
    const matchFilter = filter === 'all' || l.status === filter;
    return matchSearch && matchFilter;
  });

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📋</div><p>ไม่พบ Lead</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((l, i) => {
    const courseName = courses[l.courseId]?.name || courses[l.course]?.name || l.courseId || l.course || '-';
    const tierMap = { explorer: 'Explorer', navigator: 'Navigator', commander: 'Commander' };
    return `
      <tr>
        <td class="cell-main">${l.firstName} ${l.lastName}</td>
        <td>${l.email}</td>
        <td>${l.phone || '-'}</td>
        <td><div class="cell-small">${courseName}</div></td>
        <td><span class="tier-badge tier-${l.membership || 'explorer'}">${tierMap[l.membership] || l.membership || '-'}</span></td>
        <td>
          <select class="filter-select" style="padding:4px 24px 4px 8px;font-size:0.72rem;" onchange="changeLeadStatus('${l.id}', this.value)">
            <option value="new" ${l.status === 'new' ? 'selected' : ''}>New</option>
            <option value="contacted" ${l.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="converted" ${l.status === 'converted' ? 'selected' : ''}>Converted</option>
          </select>
        </td>
        <td class="cell-small">${formatDate(l.createdAt || l.date)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn btn-view" onclick="viewLeadDetail('${l.id}')" title="ดูรายละเอียด"><i class="fas fa-eye"></i></button>
            <button class="action-btn btn-del" onclick="requestDelete('lead','${l.id}','${l.firstName} ${l.lastName}')" title="ลบ"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function changeLeadStatus(leadId, newStatus) {
  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot update lead');
    }
    adminToast(`✅ เปลี่ยนสถานะเป็น ${newStatus}`, 'success');
    await initDashboard();
  } catch(e) { 
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
}

function viewLeadDetail(leadId) {
  const leads = getLeads();
  const l = leads.find(lead => lead.id === leadId);
  if (!l) return;

  const courses = getCourses();
  const courseName = courses[l.courseId]?.name || courses[l.course]?.name || l.courseId || l.course || '-';
  const tierMap = { explorer: 'Explorer', navigator: 'Navigator', commander: 'Commander' };
  const paymentMap = { credit: 'Credit/Debit Card', promptpay: 'PromptPay/QR', bank: 'Bank Transfer' };

  document.getElementById('leadDetailContent').innerHTML = `
    <div style="display:grid;gap:14px;font-size:0.88rem;">
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">ชื่อ-นามสกุล</span>
        <span style="font-weight:600;">${l.firstName} ${l.lastName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">Email</span>
        <span style="font-weight:600;">${l.email}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">เบอร์โทร</span>
        <span style="font-weight:600;">${l.phone || '-'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">คอร์สที่สนใจ</span>
        <span style="font-weight:600;color:var(--accent-cyan);">${courseName}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">แพ็คเกจ</span>
        <span class="tier-badge tier-${l.membership || 'explorer'}">${tierMap[l.membership] || '-'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">ช่องทางชำระเงิน</span>
        <span style="font-weight:600;">${paymentMap[l.payment] || l.payment || '-'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);">
        <span style="color:var(--text-muted);">สถานะ</span>
        <span class="status-badge status-${l.status}">${l.status}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--text-muted);">วันที่ลงทะเบียน</span>
        <span style="font-weight:600;">${new Date(l.createdAt || l.date || Date.now()).toLocaleString('th-TH')}</span>
      </div>
    </div>
  `;

  openAdminModal('leadDetailModal');
}

// ============================================================
// MEMBERS MANAGEMENT
// ============================================================
function renderMembers() {
  const members = getMembers();
  const search = (document.getElementById('memberSearch')?.value || '').toLowerCase();
  const filter = document.getElementById('memberFilter')?.value || 'all';
  const tbody = document.getElementById('membersTableBody');

  let entries = Object.entries(members).filter(([id, m]) => {
    const provider = String(m.provider || m.authProvider || '').toLowerCase();
    const paymentStatus = m.paymentStatus || m.payment_status || 'unpaid';
    const status = m.status || 'active';
    const matchSearch = `${memberName(m)} ${m.email || ''} ${m.phone || ''}`.toLowerCase().includes(search);
    const matchFilter = filter === 'all'
      || status === filter
      || paymentStatus === filter
      || provider === filter;
    return matchSearch && matchFilter;
  });

  entries.sort((a, b) => new Date(b[1].createdAt || b[1].joinedDate || 0) - new Date(a[1].createdAt || a[1].joinedDate || 0));

  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><p>ไม่พบสมาชิก</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(([id, m]) => {
    const name = memberName(m);
    const provider = providerLabel(m.provider || m.authProvider);
    const status = m.status || 'active';
    const paymentStatus = m.paymentStatus || m.payment_status || 'unpaid';
    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="member-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
            <div>
              <div class="cell-main">${escapeHtml(name)}</div>
              <div class="cell-small">${escapeHtml(m.phone || 'ไม่มีเบอร์โทร')}</div>
            </div>
          </div>
        </td>
        <td>${escapeHtml(m.email || '-')}</td>
        <td><span class="provider-badge provider-${escapeHtml(String(m.provider || m.authProvider || 'email').toLowerCase())}">${escapeHtml(provider)}</span></td>
        <td><span class="status-badge status-${escapeHtml(status)}">${status === 'active' ? 'Active' : 'Suspended'}</span></td>
        <td>
          <span class="status-badge status-${escapeHtml(paymentStatus)}">${paymentLabel(paymentStatus)}</span>
          ${paymentStatus === 'paid' && m.expiresAt ? `<div class="cell-small">หมดอายุ ${formatDate(m.expiresAt)}</div>` : ''}
        </td>
        <td class="cell-small">${formatDate(m.createdAt || m.joinedDate)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn" onclick="editMember('${m.id}')" title="แก้ไข"><i class="fas fa-edit"></i></button>
            <button class="action-btn btn-del" onclick="requestDelete('member','${m.id}','${escapeHtml(name)}')" title="ลบ"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function editMember(id) {
  const members = getMembers();
  const m = members[id];
  if (!m) return;

  document.getElementById('memberEditId').value = id;
  document.getElementById('memberFormName').value = memberName(m);
  document.getElementById('memberFormEmail').value = m.email;
  document.getElementById('memberFormPhone').value = m.phone || '';
  document.getElementById('memberFormStatus').value = m.status || 'active';
  document.getElementById('memberFormPaymentStatus').value = m.paymentStatus || m.payment_status || 'unpaid';
  document.getElementById('memberFormPaidAt').value = toDateInput(m.paidAt || m.paid_at);
  document.getElementById('memberFormExpiresAt').value = toDateInput(m.expiresAt || m.expires_at);
  document.getElementById('memberFormBusiness').value = m.business || '';
  document.getElementById('memberFormMeta').innerHTML = `
    <span>Provider: ${escapeHtml(providerLabel(m.provider || m.authProvider))}</span>
    <span>สมัครเมื่อ: ${formatDate(m.createdAt || m.joinedDate)}</span>
    <span>Login ล่าสุด: ${formatDate(m.lastLoginAt)}</span>
  `;

  openAdminModal('memberModal');
}

async function saveMember(event) {
  event.preventDefault();
  const id = document.getElementById('memberEditId').value; 

  const payload = {
    displayName: document.getElementById('memberFormName').value,
    phone: document.getElementById('memberFormPhone').value,
    status: document.getElementById('memberFormStatus').value,
    paymentStatus: document.getElementById('memberFormPaymentStatus').value,
    paidAt: fromDateInput(document.getElementById('memberFormPaidAt').value),
    expiresAt: fromDateInput(document.getElementById('memberFormExpiresAt').value),
    business: document.getElementById('memberFormBusiness').value
  };

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/members/${id}`, {
      method: 'PUT', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify(payload) 
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot update member');
    }
    closeAdminModal('memberModal');
    await initDashboard();
    adminToast('✅ แก้ไขสมาชิกสำเร็จ', 'success');
  } catch(e) { 
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error'); 
  }
  return false;
}

// ============================================================
// PACKAGES MANAGEMENT
// ============================================================
function renderPackages() {
  const packages = getPackages();
  const grid = document.getElementById('packagesGrid');

  const order = ['explorer', 'navigator', 'commander'];
  const ids = [...order.filter(id => packages[id]), ...Object.keys(packages).filter(id => !order.includes(id))];

  grid.innerHTML = ids.map(id => {
    const p = packages[id];
    return `
      <div class="package-edit-card">
        <div class="pkg-header">
          <span class="pkg-icon">${p.icon || '📦'}</span>
          ${p.popular ? '<span class="status-badge status-active" style="font-size:0.65rem;">Popular</span>' : ''}
          ${!p.enabled ? '<span class="status-badge status-disabled" style="font-size:0.65rem;">Disabled</span>' : ''}
        </div>
        <div class="pkg-name">${p.name}</div>
        <div class="pkg-price">
          <span class="currency">฿</span>${p.price.toLocaleString()}
        </div>
        <div class="pkg-period">${p.period || ''}</div>
        <ul class="pkg-features-list">
          ${(p.features || []).map(f => `
            <li><span class="pf-icon"><i class="fas fa-check"></i></span> ${f}</li>
          `).join('')}
        </ul>
        <div class="pkg-actions">
          <button class="btn-admin btn-admin-secondary" onclick="editPackage('${id}')">
            <i class="fas fa-edit"></i> แก้ไข
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function editPackage(id) {
  const packages = getPackages();
  const p = packages[id];
  if (!p) return;

  document.getElementById('packageEditId').value = id;
  document.getElementById('packageFormName').value = p.name || '';
  document.getElementById('packageFormIcon').value = p.icon || '';
  document.getElementById('packageFormPrice').value = p.price || 0;
  document.getElementById('packageFormPeriod').value = p.period || '';
  document.getElementById('packageFormPopular').checked = p.popular || false;
  document.getElementById('packageFormEnabled').checked = p.enabled !== false;

  // Build features editor
  const editor = document.getElementById('featuresEditor');
  editor.innerHTML = '';
  (p.features || []).forEach(f => addFeatureRow(f));

  if ((p.features || []).length === 0) addFeatureRow('');

  openAdminModal('packageModal');
}

function addFeatureRow(value = '') {
  const editor = document.getElementById('featuresEditor');
  const row = document.createElement('div');
  row.className = 'feature-row';
  row.innerHTML = `
    <input type="text" class="admin-input feature-input" value="${value}" placeholder="ฟีเจอร์...">
    <button type="button" class="btn-remove-feature" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  editor.appendChild(row);
}

async function savePackage(event) {
  event.preventDefault();

  const id = document.getElementById('packageEditId').value;
  const featureInputs = document.querySelectorAll('#featuresEditor .feature-input');
  const features = Array.from(featureInputs).map(i => i.value.trim()).filter(v => v);

  const payload = {
    name: document.getElementById('packageFormName').value,
    icon: document.getElementById('packageFormIcon').value,
    price: parseInt(document.getElementById('packageFormPrice').value) || 0,
    period: document.getElementById('packageFormPeriod').value,
    popular: document.getElementById('packageFormPopular').checked,
    enabled: document.getElementById('packageFormEnabled').checked,
    features
  };

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/packages/${id}`, {
      method: 'PUT', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify(payload) 
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cannot update package');
    }
    closeAdminModal('packageModal');
    await initDashboard();
    adminToast('✅ แก้ไขแพ็คเกจสำเร็จ', 'success');
  } catch(e) { 
    adminToast(`❌ ${e.message || 'เกิดข้อผิดพลาด'}`, 'error');
  }
  return false;
}

// ============================================================
// DELETE SYSTEM
// ============================================================
let pendingDelete = null;

function requestDelete(type, id, name) {
  pendingDelete = { type, id };
  document.getElementById('confirmName').textContent = name;
  openAdminModal('confirmModal');
}

async function confirmDelete() {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;
  
  const typeMap = {
    course: 'courses',
    replay: 'admin/replays',
    resource: 'admin/resources',
    schedule: 'admin/schedules',
    lead: 'leads',
    member: 'members'
  };
  const endpoint = typeMap[type];

  if (!endpoint || !id) return;

  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/${endpoint}/${id}`, { method: 'DELETE' });
    if(res.ok) {
        adminToast('✅ ลบข้อมูลสำเร็จ', 'success');
    } else {
        adminToast('❌ ไม่สามารถลบข้อมูลได้', 'error');
    }
  } catch(e) { 
    adminToast('❌ เกิดข้อผิดพลาด', 'error'); 
  }

  pendingDelete = null;
  closeAdminModal('confirmModal');
  await initDashboard();
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  if (adminLoggedIn) {
    initDashboard();
  }
});
