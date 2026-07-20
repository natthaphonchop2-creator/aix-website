/* ============================================================
   AiX Club — Admin Panel JavaScript
   Auth, CRUD Courses, Leads, Members, Packages
   ============================================================ */

const ADMIN_API_ORIGIN = window.location.origin;
const adminApi = window.AiXApi.createClient({ sessionPath: '/api/admin/session' });

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
let adminLoggedIn = false;
const adminEmail = document.getElementById('adminEmail');
const adminPassword = document.getElementById('adminPassword');
const adminMobileQuery = window.matchMedia('(max-width: 768px)');
const sidebar = document.getElementById('sidebar');
const adminMobileMenu = document.getElementById('adminMobileMenu');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
const adminMainContent = document.getElementById('adminMainContent');

function setAdminSidebarOpen(open) {
  if (!sidebar || !adminMobileMenu || !adminSidebarBackdrop) return;
  const wasOpen = adminMobileMenu.getAttribute('aria-expanded') === 'true';
  const shouldOpen = adminMobileQuery.matches && Boolean(open);
  const sidebarHidden = adminMobileQuery.matches && !shouldOpen;
  sidebar.classList.toggle('open', shouldOpen);
  adminMobileMenu.setAttribute('aria-expanded', String(shouldOpen));
  sidebar.inert = sidebarHidden;
  if (sidebarHidden) sidebar.setAttribute('aria-hidden', 'true');
  else sidebar.removeAttribute('aria-hidden');
  adminSidebarBackdrop.hidden = !shouldOpen;
  adminSidebarBackdrop.classList.toggle('open', shouldOpen);
  adminSidebarBackdrop.setAttribute('aria-hidden', String(!shouldOpen));

  if (shouldOpen) {
    sidebar.querySelector('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      ?.focus({ preventScroll: true });
  }
  if (adminMainContent) {
    adminMainContent.inert = shouldOpen;
    if (shouldOpen) adminMainContent.setAttribute('aria-hidden', 'true');
    else adminMainContent.removeAttribute('aria-hidden');
  }
  if (!shouldOpen && wasOpen && adminMobileQuery.matches) {
    adminMobileMenu.focus({ preventScroll: true });
  }
}

function showAdminLogin() {
  setAdminSidebarOpen(false);
  adminPassword.value = '';
  document.getElementById('adminLayout')?.style.setProperty('display', 'none');
  document.getElementById('loginPage')?.style.setProperty('display', '');
  adminEmail?.focus({ preventScroll: true });
}

function showAdminLayout() {
  setAdminSidebarOpen(false);
  adminPassword.value = '';
  document.getElementById('loginPage')?.style.setProperty('display', 'none');
  document.getElementById('adminLayout')?.style.setProperty('display', 'flex');
}

async function adminFetch(url, options = {}) {
  const method = String(options.method || 'GET').trim().toUpperCase();
  try {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !adminApi.csrfToken) {
      await adminApi.bootstrap();
      adminLoggedIn = true;
    }
  } catch (error) {
    adminApi.clear();
    adminLoggedIn = false;
    showAdminLogin();
    throw error;
  }

  const res = await adminApi.raw(url, options);

  if (res.status === 401 || res.status === 403) {
    adminApi.clear();
    adminLoggedIn = false;
    showAdminLogin();
    throw new Error('Admin session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
  }

  return res;
}

async function adminLogin() {
  const password = adminPassword.value;
  adminPassword.value = '';
  try {
    const data = await adminApi.request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminEmail.value.trim(), password })
    });
    adminApi.adopt(data);
    adminLoggedIn = true;
    showAdminLayout();
    await initDashboard();
  } catch(e) {
    document.getElementById('loginError').classList.add('show');
    setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
  }
}

async function adminLogout() {
  try {
    await adminApi.logout('/api/admin/logout');
  } catch (error) {
    adminToast('❌ ออกจากระบบไม่สำเร็จ ระบบยังคงสถานะเข้าสู่ระบบไว้ กรุณาลองใหม่', 'error');
    return false;
  }
  adminLoggedIn = false;
  setAdminSidebarOpen(false);
  showAdminLogin();
  return true;
}

async function restoreAdminSession() {
  try {
    const result = await adminApi.bootstrap();
    if (adminApi.csrfToken !== result.csrfToken) return;
    adminLoggedIn = true;
    showAdminLayout();
    await initDashboard();
  } catch (error) {
    if (adminApi.csrfToken) return;
    adminApi.clear();
    adminLoggedIn = false;
    showAdminLogin();
  }
}

adminPassword?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') adminLogin();
});
adminMobileMenu?.addEventListener('click', () => {
  setAdminSidebarOpen(adminMobileMenu.getAttribute('aria-expanded') !== 'true');
});
adminSidebarBackdrop?.addEventListener('click', () => setAdminSidebarOpen(false));
adminMobileQuery.addEventListener('change', () => setAdminSidebarOpen(false));

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
  setAdminSidebarOpen(false);
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
    setAdminSidebarOpen(false);
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
    AiXDom.replace(recentMembersEl, [adminDashboardEmptyState('ยังไม่มีสมาชิก')]);
  } else {
    AiXDom.replace(recentMembersEl, memberArr.map((member) => {
      const name = memberName(member);
      return AiXDom.node('div', { className: 'recent-item' }, [
        AiXDom.node('div', { className: 'ri-avatar', text: name.charAt(0).toUpperCase() }),
        AiXDom.node('div', { className: 'ri-info' }, [
          AiXDom.node('div', { className: 'ri-name', text: name }),
          AiXDom.node('div', { className: 'ri-detail' }, [
            providerLabel(member.provider || member.authProvider),
            ' • ',
            paymentLabel(member.paymentStatus)
          ])
        ]),
        AiXDom.node('div', { className: 'ri-time', text: formatDate(member.createdAt || member.joinedDate) })
      ]);
    }));
  }

  // Recent leads
  const recentLeads = [...leads].sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)).slice(0, 5);
  const recentLeadsEl = document.getElementById('recentLeads');
  if (recentLeads.length === 0) {
    AiXDom.replace(recentLeadsEl, [adminDashboardEmptyState('ยังไม่มี Lead')]);
  } else {
    AiXDom.replace(recentLeadsEl, recentLeads.map((lead) => {
      const rawStatus = String(lead.status || 'new');
      const status = rawStatus.toLowerCase();
      const statusBadge = AiXDom.node('span', {
        className: `status-badge ${adminMappedClass('leadStatus', status, 'status-new')}`,
        text: adminMappedLabel('leadStatus', status, rawStatus)
      });
      statusBadge.style.padding = '2px 6px';
      statusBadge.style.fontSize = '0.65rem';
      return AiXDom.node('div', { className: 'recent-item' }, [
        AiXDom.node('div', { className: 'ri-avatar', text: String(lead.firstName || 'L').charAt(0).toUpperCase() }),
        AiXDom.node('div', { className: 'ri-info' }, [
          AiXDom.node('div', { className: 'ri-name', text: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead' }),
          AiXDom.node('div', { className: 'ri-detail' }, [lead.email || '-', ' • ', statusBadge])
        ]),
        AiXDom.node('div', { className: 'ri-time', text: formatDate(lead.createdAt || lead.date) })
      ]);
    }));
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

const adminClassMaps = Object.freeze({
  level: Object.freeze({
    beginner: 'level-beginner',
    intermediate: 'level-intermediate',
    advanced: 'level-advanced'
  }),
  leadStatus: Object.freeze({
    new: 'status-new',
    contacted: 'status-contacted',
    converted: 'status-converted'
  }),
  tier: Object.freeze({
    explorer: 'tier-explorer',
    navigator: 'tier-navigator',
    commander: 'tier-commander'
  }),
  provider: Object.freeze({
    google: 'provider-google',
    email: 'provider-email'
  }),
  memberStatus: Object.freeze({
    active: 'status-active',
    suspended: 'status-suspended'
  }),
  paymentStatus: Object.freeze({
    paid: 'status-paid',
    unpaid: 'status-unpaid'
  })
});

const adminLabelMaps = Object.freeze({
  leadStatus: Object.freeze({ new: 'New', contacted: 'Contacted', converted: 'Converted' }),
  tier: Object.freeze({ explorer: 'Explorer', navigator: 'Navigator', commander: 'Commander' }),
  paymentMethod: Object.freeze({
    credit: 'Credit/Debit Card',
    promptpay: 'PromptPay/QR',
    bank: 'Bank Transfer'
  })
});

function adminMappedClass(group, value, fallback = "") {
  const map = adminClassMaps[group];
  const key = String(value ?? '').trim().toLowerCase();
  return map && Object.hasOwn(map, key) ? map[key] : fallback;
}

function adminMappedLabel(group, value, fallback = '-') {
  const map = adminLabelMaps[group];
  const key = String(value ?? '').trim().toLowerCase();
  return map && Object.hasOwn(map, key) ? map[key] : fallback;
}

function adminFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function adminIcon(className) {
  return AiXDom.node('i', { className });
}

function adminActionButton(className, title, iconClass) {
  return AiXDom.node('button', {
    className,
    attrs: { type: 'button', title }
  }, [adminIcon(iconClass)]);
}

function adminEmptyTableRow(colspan, icon, message) {
  return AiXDom.node('tr', {}, [
    AiXDom.node('td', { attrs: { colspan } }, [
      AiXDom.node('div', { className: 'empty-state' }, [
        AiXDom.node('div', { className: 'empty-icon', text: icon }),
        AiXDom.node('p', { text: message })
      ])
    ])
  ]);
}

function adminDashboardEmptyState(message) {
  const textNode = AiXDom.node('p', { text: message });
  textNode.style.fontSize = '0.82rem';
  return AiXDom.node('div', { className: 'empty-state' }, [textNode]);
}

function adminDetailRow(label, valueNode, bordered = true) {
  const labelNode = AiXDom.node('span', { className: 'admin-detail-label', text: label });
  const contentNode = valueNode?.nodeType
    ? valueNode
    : AiXDom.node('span', { className: 'admin-detail-value', text: valueNode });
  const row = AiXDom.node('div', { className: 'admin-detail-row' }, [
    labelNode,
    contentNode
  ]);
  labelNode.style.color = 'var(--text-muted)';
  contentNode.style.fontWeight = '600';
  row.style.display = 'flex';
  row.style.justifyContent = 'space-between';
  row.style.gap = '16px';
  if (bordered) {
    row.style.paddingBottom = '12px';
    row.style.borderBottom = '1px solid var(--border-subtle)';
  }
  return row;
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
  const selectedValue = String(selected ?? '');
  const options = Object.values(getCourses()).map((course) => {
    const id = String(course.id ?? '');
    return AiXDom.node('option', {
      text: course.name || course.title || id,
      props: { value: id, selected: id === selectedValue }
    });
  });
  if (includeGlobal) {
    options.unshift(AiXDom.node('option', {
      text: 'ใช้กับสมาชิกทุกคอร์ส',
      props: { value: '', selected: !selectedValue }
    }));
  }
  return options;
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
  const rawStatus = String(status || 'unpaid');
  const key = rawStatus.toLowerCase();
  if (key === 'paid') return 'ชำระแล้ว';
  if (key === 'unpaid') return 'ยังไม่ชำระ';
  return rawStatus;
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
    const title = String(c.name || c.title || '');
    return title.toLowerCase().includes(search) || String(c.instructor || '').toLowerCase().includes(search);
  });

  if (entries.length === 0) {
    AiXDom.replace(tbody, [adminEmptyTableRow(7, '📚', 'ไม่พบคอร์ส')]);
    return;
  }

  AiXDom.replace(tbody, entries.map(([id, course]) => {
    const title = course.name || course.title || '-';
    const status = course.featured ? (course.status || 'เปิดบน Platform') : 'ซ่อนจาก Platform';
    const level = String(course.level || 'beginner').toLowerCase();
    const price = adminFiniteNumber(course.price);
    const originalPrice = adminFiniteNumber(course.originalPrice);
    const priceChildren = [AiXDom.node('span', { className: 'cell-price', text: `฿${price.toLocaleString('th-TH')}` })];
    if (originalPrice > 0) {
      const oldPrice = AiXDom.node('div', { className: 'cell-small', text: `฿${originalPrice.toLocaleString('th-TH')}` });
      oldPrice.style.textDecoration = 'line-through';
      priceChildren.push(oldPrice);
    }

    const editButton = adminActionButton('action-btn', 'แก้ไข', 'fas fa-edit');
    editButton.addEventListener("click", () => editCourse(id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('course', id, title));

    const rating = AiXDom.node('span', { text: `★ ${course.rating ?? '-'}` });
    rating.style.color = 'var(--accent-gold)';
    rating.style.fontWeight = '600';

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', {}, [
        AiXDom.node('div', { className: 'cell-main', text: title }),
        AiXDom.node('div', {
          className: 'cell-small',
          text: `${adminFiniteNumber(courseHours(course))}h • ${adminFiniteNumber(courseLessons(course))} lessons • ${status}`
        })
      ]),
      AiXDom.node('td', { text: course.instructor || '-' }),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: `level-badge ${adminMappedClass('level', level, 'level-beginner')}`,
          text: course.level || 'beginner'
        })
      ]),
      AiXDom.node('td', {}, priceChildren),
      AiXDom.node('td', { text: adminFiniteNumber(course.students).toLocaleString('th-TH') }),
      AiXDom.node('td', {}, [
        rating,
        AiXDom.node('div', {
          className: 'cell-small',
          text: `(${adminFiniteNumber(course.ratingCount).toLocaleString('th-TH')})`
        })
      ]),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'action-btns' }, [editButton, deleteButton])])
    ]);
  }));
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

  const url = isEdit ? `${ADMIN_API_ORIGIN}/api/courses/${encodeURIComponent(idStr)}` : `${ADMIN_API_ORIGIN}/api/courses`;
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
    AiXDom.replace(tbody, [adminEmptyTableRow(5, '🎥', 'ยังไม่มีคลิปย้อนหลัง')]);
    return;
  }

  AiXDom.replace(tbody, rows.map((item) => {
    const source = item.hasUpload ? 'ไฟล์อัปโหลดที่ป้องกันแล้ว' : (item.videoUrl ? 'ลิงก์วิดีโอ' : 'ยังไม่มีไฟล์');
    const playableUrl = item.mediaUrl || item.videoUrl || '';
    const actionChildren = [];
    if (playableUrl) {
      actionChildren.push(AiXDom.link({
        href: playableUrl,
        className: 'action-btn btn-view',
        attrs: { title: 'เปิด' }
      }, [adminIcon('fas fa-play')]));
    }
    const editButton = adminActionButton('action-btn', 'แก้ไข', 'fas fa-edit');
    editButton.addEventListener("click", () => openReplayModal(item.id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('replay', item.id, item.title));
    actionChildren.push(editButton, deleteButton);

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', {}, [
        AiXDom.node('div', { className: 'cell-main', text: item.title }),
        AiXDom.node('div', { className: 'cell-small', text: item.description || '-' })
      ]),
      AiXDom.node('td', { text: item.courseTitle || item.courseId || '-' }),
      AiXDom.node('td', { text: item.durationText || item.duration || '-' }),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: `status-badge ${playableUrl ? 'status-active' : 'status-disabled'}`,
          text: source
        }),
        playableUrl ? AiXDom.node('div', { className: 'cell-small', text: playableUrl }) : null
      ]),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'action-btns' }, actionChildren)])
    ]);
  }));
}

function openReplayModal(id = null) {
  const item = id ? getReplays().find((entry) => entry.id === id) : null;
  document.getElementById('replayEditId').value = id || '';
  document.getElementById('replayModalTitle').textContent = id ? '🎥 แก้ไขคลิปย้อนหลัง' : '🎥 เพิ่มคลิปย้อนหลัง';
  AiXDom.replace(document.getElementById('replayFormCourse'), courseOptions(item?.courseId || ''));
  document.getElementById('replayFormTitle').value = item?.title || '';
  document.getElementById('replayFormDuration').value = item?.durationText || item?.duration || '';
  document.getElementById('replayFormVideoUrl').value = item?.hasUpload ? '' : (item?.videoUrl || '');
  document.getElementById('replayFormVideo').value = '';
  document.getElementById('replayFormSort').value = item?.sortOrder || 0;
  document.getElementById('replayFormVisibility').value = item?.visibility || 'members';
  document.getElementById('replayFormDescription').value = item?.description || '';
  document.getElementById('replayFileNote').textContent = item?.hasUpload
    ? 'มีไฟล์อัปโหลดที่ป้องกันแล้ว อัปโหลดไฟล์ใหม่เมื่อต้องการแทนที่'
    : 'รองรับไฟล์ MP4 หรือ WebM ขนาดสูงสุด 500MB';
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/replays${id ? `/${encodeURIComponent(id)}` : ''}`, {
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
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
    return `${item.title || ''} ${item.courseTitle || ''} ${item.description || ''} ${tags}`.toLowerCase().includes(search);
  });

  if (rows.length === 0) {
    AiXDom.replace(tbody, [adminEmptyTableRow(5, '🧰', 'ยังไม่มี Tools หรือ Skill Set')]);
    return;
  }

  AiXDom.replace(tbody, rows.map((item) => {
    const link = item.mediaUrl || item.url || '';
    const tags = Array.isArray(item.tags) && item.tags.length
      ? item.tags.map((tag) => AiXDom.node('span', { text: tag }))
      : [AiXDom.node('span', { text: '-' })];
    const actionChildren = [];
    if (link) {
      actionChildren.push(AiXDom.link({
        href: link,
        className: 'action-btn btn-view',
        attrs: { title: 'เปิด' }
      }, [adminIcon('fas fa-arrow-up-right-from-square')]));
    }
    const editButton = adminActionButton('action-btn', 'แก้ไข', 'fas fa-edit');
    editButton.addEventListener("click", () => openResourceModal(item.id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('resource', item.id, item.title));
    actionChildren.push(editButton, deleteButton);

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', {}, [
        AiXDom.node('div', { className: 'cell-main', text: item.title }),
        AiXDom.node('div', { className: 'cell-small', text: item.description || '-' })
      ]),
      AiXDom.node('td', {}, [
        AiXDom.node('span', { className: 'status-badge status-active', text: resourceTypeLabel(item.type) })
      ]),
      AiXDom.node('td', { text: item.courseTitle || (item.courseId ? item.courseId : 'ทุกคอร์ส') }),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'tag-list' }, tags)]),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'action-btns' }, actionChildren)])
    ]);
  }));
}

function openResourceModal(id = null) {
  const item = id ? getResourcesAdmin().find((entry) => entry.id === id) : null;
  document.getElementById('resourceEditId').value = id || '';
  document.getElementById('resourceModalTitle').textContent = id ? '🧰 แก้ไข Resource' : '🧰 เพิ่ม Resource';
  document.getElementById('resourceFormType').value = item?.type || 'tool';
  AiXDom.replace(document.getElementById('resourceFormCourse'), courseOptions(item?.courseId || '', true));
  document.getElementById('resourceFormTitle').value = item?.title || '';
  document.getElementById('resourceFormUrl').value = item?.hasUpload ? '' : (item?.url || '');
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/resources${id ? `/${encodeURIComponent(id)}` : ''}`, {
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
    AiXDom.replace(tbody, [adminEmptyTableRow(5, '🗓️', 'ยังไม่มีตารางเรียน')]);
    return;
  }

  AiXDom.replace(tbody, rows.map((item) => {
    const notifyButton = adminActionButton('action-btn btn-view', 'ส่งแจ้งเตือน', 'fas fa-bell');
    notifyButton.addEventListener("click", () => notifySchedule(item.id));
    const editButton = adminActionButton('action-btn', 'แก้ไข', 'fas fa-edit');
    editButton.addEventListener("click", () => openScheduleModal(item.id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('schedule', item.id, item.title));

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', {}, [
        AiXDom.node('div', { className: 'cell-main', text: item.title }),
        AiXDom.node('div', { className: 'cell-small', text: item.description || '-' })
      ]),
      AiXDom.node('td', { text: item.courseTitle || item.courseId || '-' }),
      AiXDom.node('td', {}, [
        formatDateTime(item.startsAt),
        item.endsAt ? AiXDom.node('div', { className: 'cell-small', text: `ถึง ${formatDateTime(item.endsAt)}` }) : null
      ]),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: 'status-badge status-contacted',
          text: `${adminFiniteNumber(item.notifyBeforeMinutes).toLocaleString('th-TH')} นาที`
        })
      ]),
      AiXDom.node('td', {}, [
        AiXDom.node('div', { className: 'action-btns' }, [notifyButton, editButton, deleteButton])
      ])
    ]);
  }));
}

function openScheduleModal(id = null) {
  const item = id ? getSchedules().find((entry) => entry.id === id) : null;
  document.getElementById('scheduleEditId').value = id || '';
  document.getElementById('scheduleModalTitle').textContent = id ? '🗓️ แก้ไขตารางเรียน' : '🗓️ เพิ่มตารางเรียน';
  AiXDom.replace(document.getElementById('scheduleFormCourse'), courseOptions(item?.courseId || ''));
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/schedules${id ? `/${encodeURIComponent(id)}` : ''}`, {
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/admin/schedules/${encodeURIComponent(id)}/notify`, { method: 'POST' });
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
    AiXDom.replace(tbody, [adminEmptyTableRow(8, '📋', 'ไม่พบ Lead')]);
    return;
  }

  AiXDom.replace(tbody, filtered.map((lead) => {
    const courseName = courses[lead.courseId]?.name || courses[lead.course]?.name || lead.courseId || lead.course || '-';
    const rawTier = String(lead.membership || 'explorer');
    const tier = rawTier.toLowerCase();
    const rawStatus = String(lead.status || 'new');
    const status = rawStatus.toLowerCase();
    const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '-';
    const statusOptions = [
      AiXDom.node('option', { text: 'New', props: { value: 'new', selected: status === 'new' } }),
      AiXDom.node('option', { text: 'Contacted', props: { value: 'contacted', selected: status === 'contacted' } }),
      AiXDom.node('option', { text: 'Converted', props: { value: 'converted', selected: status === 'converted' } })
    ];
    if (!Object.hasOwn(adminLabelMaps.leadStatus, status)) {
      statusOptions.unshift(AiXDom.node('option', {
        text: rawStatus,
        props: { value: rawStatus, selected: true }
      }));
    }
    const statusSelect = AiXDom.node('select', { className: 'filter-select' }, statusOptions);
    statusSelect.style.padding = '4px 24px 4px 8px';
    statusSelect.style.fontSize = '0.72rem';
    statusSelect.addEventListener("change", () => changeLeadStatus(lead.id, statusSelect.value));

    const viewButton = adminActionButton('action-btn btn-view', 'ดูรายละเอียด', 'fas fa-eye');
    viewButton.addEventListener("click", () => viewLeadDetail(lead.id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('lead', lead.id, fullName));

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', { className: 'cell-main', text: fullName }),
      AiXDom.node('td', { text: lead.email || '-' }),
      AiXDom.node('td', { text: lead.phone || '-' }),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'cell-small', text: courseName })]),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: `tier-badge ${adminMappedClass('tier', tier, 'tier-explorer')}`,
          text: adminMappedLabel('tier', tier, rawTier)
        })
      ]),
      AiXDom.node('td', {}, [statusSelect]),
      AiXDom.node('td', { className: 'cell-small', text: formatDate(lead.createdAt || lead.date) }),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'action-btns' }, [viewButton, deleteButton])])
    ]);
  }));
}

async function changeLeadStatus(leadId, newStatus) {
  try {
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/leads/${encodeURIComponent(leadId)}`, {
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
  const rawTier = String(l.membership || 'explorer');
  const tier = rawTier.toLowerCase();
  const rawPayment = String(l.payment || '-');
  const rawStatus = String(l.status || 'new');
  const status = rawStatus.toLowerCase();
  const courseValue = AiXDom.node('span', { className: 'admin-detail-value', text: courseName });
  courseValue.style.color = 'var(--accent-cyan)';
  const detailGrid = AiXDom.node('div', { className: 'admin-detail-grid' }, [
    adminDetailRow('ชื่อ-นามสกุล', `${l.firstName || ''} ${l.lastName || ''}`.trim() || '-'),
    adminDetailRow('Email', l.email || '-'),
    adminDetailRow('เบอร์โทร', l.phone || '-'),
    adminDetailRow('คอร์สที่สนใจ', courseValue),
    adminDetailRow('แพ็คเกจ', AiXDom.node('span', {
      className: `tier-badge ${adminMappedClass('tier', tier, 'tier-explorer')}`,
      text: adminMappedLabel('tier', tier, rawTier)
    })),
    adminDetailRow('ช่องทางชำระเงิน', adminMappedLabel('paymentMethod', l.payment, rawPayment)),
    adminDetailRow('สถานะ', AiXDom.node('span', {
      className: `status-badge ${adminMappedClass('leadStatus', status, 'status-new')}`,
      text: adminMappedLabel('leadStatus', status, rawStatus)
    })),
    adminDetailRow('วันที่ลงทะเบียน', new Date(l.createdAt || l.date || Date.now()).toLocaleString('th-TH'), false)
  ]);
  detailGrid.style.display = 'grid';
  detailGrid.style.gap = '14px';
  detailGrid.style.fontSize = '0.88rem';
  AiXDom.replace(document.getElementById('leadDetailContent'), [detailGrid]);

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
    AiXDom.replace(tbody, [adminEmptyTableRow(7, '👥', 'ไม่พบสมาชิก')]);
    return;
  }

  AiXDom.replace(tbody, entries.map(([id, member]) => {
    const name = memberName(member);
    const providerKey = String(member.provider || member.authProvider || 'email').toLowerCase();
    const rawStatus = String(member.status || 'active');
    const status = rawStatus.toLowerCase();
    const rawPaymentStatus = String(member.paymentStatus || member.payment_status || 'unpaid');
    const paymentStatus = rawPaymentStatus.toLowerCase();

    const memberSummary = AiXDom.node('div', { className: 'admin-member-summary' }, [
      AiXDom.node('div', { className: 'member-avatar', text: name.charAt(0).toUpperCase() }),
      AiXDom.node('div', {}, [
        AiXDom.node('div', { className: 'cell-main', text: name }),
        AiXDom.node('div', { className: 'cell-small', text: member.phone || 'ไม่มีเบอร์โทร' })
      ])
    ]);
    memberSummary.style.display = 'flex';
    memberSummary.style.alignItems = 'center';
    memberSummary.style.gap = '10px';

    const paymentChildren = [
      AiXDom.node('span', {
        className: `status-badge ${adminMappedClass('paymentStatus', paymentStatus, 'status-unpaid')}`,
        text: paymentLabel(rawPaymentStatus)
      })
    ];
    if (paymentStatus === 'paid' && member.expiresAt) {
      paymentChildren.push(AiXDom.node('div', {
        className: 'cell-small',
        text: `หมดอายุ ${formatDate(member.expiresAt)}`
      }));
    }

    const editButton = adminActionButton('action-btn', 'แก้ไข', 'fas fa-edit');
    editButton.addEventListener("click", () => editMember(id));
    const deleteButton = adminActionButton('action-btn btn-del', 'ลบ', 'fas fa-trash');
    deleteButton.addEventListener("click", () => requestDelete('member', id, name));

    return AiXDom.node('tr', {}, [
      AiXDom.node('td', {}, [memberSummary]),
      AiXDom.node('td', { text: member.email || '-' }),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: `provider-badge ${adminMappedClass('provider', providerKey, 'provider-email')}`,
          text: providerLabel(providerKey)
        })
      ]),
      AiXDom.node('td', {}, [
        AiXDom.node('span', {
          className: `status-badge ${adminMappedClass('memberStatus', status, 'status-suspended')}`,
          text: status === 'active' ? 'Active' : status === 'suspended' ? 'Suspended' : rawStatus
        })
      ]),
      AiXDom.node('td', {}, paymentChildren),
      AiXDom.node('td', { className: 'cell-small', text: formatDate(member.createdAt || member.joinedDate) }),
      AiXDom.node('td', {}, [AiXDom.node('div', { className: 'action-btns' }, [editButton, deleteButton])])
    ]);
  }));
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
  AiXDom.replace(document.getElementById('memberFormMeta'), [
    AiXDom.node('span', { text: `Provider: ${providerLabel(m.provider || m.authProvider)}` }),
    AiXDom.node('span', { text: `สมัครเมื่อ: ${formatDate(m.createdAt || m.joinedDate)}` }),
    AiXDom.node('span', { text: `Login ล่าสุด: ${formatDate(m.lastLoginAt)}` })
  ]);

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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/members/${encodeURIComponent(id)}`, {
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

  AiXDom.replace(grid, ids.map((id) => {
    const packageItem = packages[id];
    const headerChildren = [AiXDom.node('span', { className: 'pkg-icon', text: packageItem.icon || '📦' })];
    if (packageItem.popular) {
      const badge = AiXDom.node('span', { className: 'status-badge status-active', text: 'Popular' });
      badge.style.fontSize = '0.65rem';
      headerChildren.push(badge);
    }
    if (!packageItem.enabled) {
      const badge = AiXDom.node('span', { className: 'status-badge status-disabled', text: 'Disabled' });
      badge.style.fontSize = '0.65rem';
      headerChildren.push(badge);
    }

    const features = Array.isArray(packageItem.features)
      ? packageItem.features.map((feature) => AiXDom.node('li', {}, [
          AiXDom.node('span', { className: 'pf-icon' }, [adminIcon('fas fa-check')]),
          ' ',
          feature
        ]))
      : [];
    const editButton = AiXDom.node('button', {
      className: 'btn-admin btn-admin-secondary',
      attrs: { type: 'button' }
    }, [adminIcon('fas fa-edit'), ' แก้ไข']);
    editButton.addEventListener("click", () => editPackage(id));

    return AiXDom.node('div', { className: 'package-edit-card' }, [
      AiXDom.node('div', { className: 'pkg-header' }, headerChildren),
      AiXDom.node('div', { className: 'pkg-name', text: packageItem.name }),
      AiXDom.node('div', { className: 'pkg-price' }, [
        AiXDom.node('span', { className: 'currency', text: '฿' }),
        adminFiniteNumber(packageItem.price).toLocaleString('th-TH')
      ]),
      AiXDom.node('div', { className: 'pkg-period', text: packageItem.period || '' }),
      AiXDom.node('ul', { className: 'pkg-features-list' }, features),
      AiXDom.node('div', { className: 'pkg-actions' }, [editButton])
    ]);
  }));
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
  const input = AiXDom.node('input', {
    className: 'admin-input feature-input',
    attrs: { type: 'text' },
    props: { value }
  });
  input.placeholder = 'ฟีเจอร์...';
  const removeButton = adminActionButton('btn-remove-feature', 'ลบฟีเจอร์', 'fas fa-times');
  const row = AiXDom.node('div', { className: 'feature-row' }, [input, removeButton]);
  removeButton.addEventListener("click", () => row.remove());
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/packages/${encodeURIComponent(id)}`, {
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
    const res = await adminFetch(`${ADMIN_API_ORIGIN}/api/${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
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
  setAdminSidebarOpen(false);
  restoreAdminSession();
});
