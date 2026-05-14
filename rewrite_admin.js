const fs = require('fs');

let content = fs.readFileSync('admin.js', 'utf-8');

// 1. Replace data helpers
content = content.replace(/\/\/ ---- Data Helpers ----[\s\S]*?\/\/ DASHBOARD/m, `// ---- Data Helpers (API) ----
let adminData = {
  courses: {},
  leads: [],
  members: {},
  packages: {},
  stats: {}
};

async function reloadAdminData() {
  try {
    const [cRes, lRes, mRes, pRes, sRes] = await Promise.all([
      fetch('http://localhost:3000/api/courses'),
      fetch('http://localhost:3000/api/leads'),
      fetch('http://localhost:3000/api/users'),
      fetch('http://localhost:3000/api/packages'),
      fetch('http://localhost:3000/api/stats')
    ]);
    
    const coursesArr = await cRes.json();
    const leadsArr = await lRes.json();
    const membersArr = await mRes.json();
    const packagesArr = await pRes.json();
    adminData.stats = await sRes.json();

    adminData.courses = Object.fromEntries(coursesArr.map(c => [c.id, c]));
    adminData.leads = leadsArr;
    adminData.members = Object.fromEntries(membersArr.map(m => [m.id, m])); 
    adminData.packages = Object.fromEntries(packagesArr.map(p => [p.id, p]));
  } catch (e) {
    console.error('Failed to load admin data', e);
  }
}

function getCourses() { return adminData.courses; }
function getLeads() { return adminData.leads; }
function getMembers() { return adminData.members; }
function getPackages() { return adminData.packages; }

// ============================================================
// DASHBOARD`);

// 2. Remove initSharedData entirely
content = content.replace(/\/\/ ---- Initialize Shared Data.*?\(\)\(\);/s, '// (initSharedData removed)');

// 3. Make initDashboard async
content = content.replace(/function initDashboard\(\) {/m, `async function initDashboard() {
  await reloadAdminData();`);

// 4. Update stats rendering in refreshDashboard
content = content.replace(/const memberCount = Object\.keys\(members\)\.length;[\s\S]*?document\.getElementById\('statRevenue'\)\.textContent = '฿' \+ revenue\.toLocaleString\(\);/s, `const stats = adminData.stats;
  document.getElementById('statMembers').textContent = (stats.members || 0).toLocaleString();
  document.getElementById('statLeads').textContent = (stats.leads || 0).toLocaleString();
  document.getElementById('statCourses').textContent = (stats.courses || 0).toLocaleString();
  document.getElementById('statRevenue').textContent = '฿' + (stats.revenue || 0).toLocaleString();`);

// 5. Update saveCourse
content = content.replace(/function saveCourse\(event\) \{[\s\S]*?return false;\n\}/m, `async function saveCourse(event) {
  event.preventDefault();
  const idStr = document.getElementById('courseEditId').value;
  const isEdit = !!idStr;
  
  const payload = {
    name: document.getElementById('courseFormName').value,
    price: parseInt(document.getElementById('courseFormPrice').value) || 0,
    originalPrice: parseInt(document.getElementById('courseFormOriginalPrice').value) || 0,
    instructor: document.getElementById('courseFormInstructor').value,
    level: document.getElementById('courseFormLevel').value,
    hours: parseInt(document.getElementById('courseFormHours').value) || 0,
    lessons: parseInt(document.getElementById('courseFormLessons').value) || 0,
    image: document.getElementById('courseFormImage').value,
    description: document.getElementById('courseFormDesc').value
  };

  const url = isEdit ? \`http://localhost:3000/api/courses/\${idStr}\` : 'http://localhost:3000/api/courses';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    closeAdminModal('courseModal');
    await initDashboard(); 
    adminToast(isEdit ? '✅ แก้ไขคอร์สสำเร็จ' : '✅ เพิ่มคอร์สสำเร็จ', 'success');
  } catch(e) { adminToast('❌ เกิดข้อผิดพลาด', 'error'); }
  return false;
}`);

// 6. Update delete function handling for all types
content = content.replace(/function confirmDelete\(\) \{[\s\S]*?return false;\n\}/m, `async function confirmDelete() {
  const type = document.getElementById('deleteType').value;
  const id = document.getElementById('deleteId').value;
  
  const typeMap = { course: 'courses', lead: 'leads', member: 'users' };
  const endpoint = typeMap[type];

  if (!endpoint || !id) return;

  try {
    const res = await fetch(\`http://localhost:3000/api/\${endpoint}/\${id}\`, { method: 'DELETE' });
    if(res.ok) {
        closeAdminModal('deleteModal');
        await initDashboard();
        adminToast('✅ ลบข้อมูลสำเร็จ', 'success');
    }
  } catch(e) { adminToast('❌ เกิดข้อผิดพลาด', 'error'); }
}`);

// 7. Change member save
content = content.replace(/function saveMember\(event\) \{[\s\S]*?return false;\n\}/m, `async function saveMember(event) {
  event.preventDefault();
  const id = document.getElementById('memberEditEmail').value; // it's actually id now

  const payload = {
    name: document.getElementById('memberFormName').value,
    tier: document.getElementById('memberFormTier').value
  };

  try {
    await fetch(\`http://localhost:3000/api/users/\${id}\`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    closeAdminModal('memberModal');
    await initDashboard();
    adminToast('✅ แก้ไขสมาชิกสำเร็จ', 'success');
  } catch(e) { adminToast('❌ เกิดข้อผิดพลาด', 'error'); }
  return false;
}`);

// 8. Change Package save
content = content.replace(/function savePackage\(event\) \{[\s\S]*?return false;\n\}/m, `async function savePackage(event) {
  event.preventDefault();
  const id = document.getElementById('packageEditId').value;
  
  const inputs = document.querySelectorAll('.feature-input');
  const features = [];
  inputs.forEach(inp => { if(inp.value.trim()) features.push(inp.value.trim()); });

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
    await fetch(\`http://localhost:3000/api/packages/\${id}\`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    closeAdminModal('packageModal');
    await initDashboard();
    adminToast('✅ แก้ไขแพ็คเกจสำเร็จ', 'success');
  } catch(e) { adminToast('❌ เกิดข้อผิดพลาด', 'error'); }
  return false;
}`);

// 9. Fix renderMembers mapping (id instead of email)
content = content.replace(/const entries = Object\.entries\(members\)\.filter\(\(\[email, m\]\) => \{/g, \`const entries = Object.entries(members).filter(([id, m]) => {\`);
content = content.replace(/<td class="cell-main">\$\{m.name \|\| '-'\}/g, \`\${m.name || '-'}\`);
content = content.replace(/<td>\$\{email\}<\/td>/g, \`<td>\${m.email}</td>\`);
content = content.replace(/editMember\('\$\{email\}'\)/g, \`editMember('\${m.id}')\`);
content = content.replace(/requestDelete\('member','\$\{email\}'/g, \`requestDelete('member','\${m.id}'\`);
content = content.replace(/Object\.entries\(members\)\n\s*\.map\(\(\[email, data\]\) => \(\{ email, \.\.\.data \}\)\)/, \`Object.values(members)\`);
content = content.replace(/function editMember\(email\)/, \`function editMember(id)\`);
content = content.replace(/const m = members\[email\];/, \`const m = members[id];\`);
content = content.replace(/document\.getElementById\('memberEditEmail'\)\.value = email;/, \`document.getElementById('memberEditEmail').value = id;\`);

// 10. Update changeLeadStatus
content = content.replace(/function changeLeadStatus[\s\S]*?refreshDashboard\(\);\n\s*\}/m, \`async function changeLeadStatus(leadId, newStatus) {
  try {
    await fetch(\\\`http://localhost:3000/api/leads/\\\${leadId}\\\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    adminToast(\\\`✅ เปลี่ยนสถานะเป็น \\\${newStatus}\\\`, 'success');
    await initDashboard();
  } catch(e) { adminToast('❌ เกิดข้อผิดพลาด', 'error'); }
}\`);

// 11. Update switchSection async logic
content = content.replace(/if \(name === 'dashboard'\) refreshDashboard\(\);\n  if \(name === 'courses'\) renderCourses\(\);\n  if \(name === 'leads'\) renderLeads\(\);\n  if \(name === 'members'\) renderMembers\(\);\n  if \(name === 'packages'\) renderPackages\(\);/s, \`if (name === 'dashboard') refreshDashboard();
  if (name === 'courses') renderCourses();
  if (name === 'leads') renderLeads();
  if (name === 'members') renderMembers();
  if (name === 'packages') renderPackages();\`);

// 12. Fix login
content = content.replace(/function adminLogin\(\) \{[\s\S]*?\}\n\}/m, \`async function adminLogin() {
  const email = document.getElementById('adminEmail').value.trim();
  const pw = document.getElementById('adminPassword').value;

  try {
     const res = await fetch('http://localhost:3000/api/admin/login', { 
         method: 'POST', 
         headers: {'Content-Type': 'application/json'},
         body: JSON.stringify({ email, password: pw })
     });
     if (res.ok) {
         localStorage.setItem('aixAdminAuth', 'true');
         adminLoggedIn = true;
         document.getElementById('loginPage').style.display = 'none';
         document.getElementById('adminLayout').style.display = 'flex';
         initDashboard();
     } else {
         throw new Error('Invalid');
     }
  } catch(e) {
     document.getElementById('loginError').classList.add('show');
     setTimeout(() => document.getElementById('loginError').classList.remove('show'), 3000);
  }
}\`);


fs.writeFileSync('admin.js', content, 'utf-8');
console.log('Done rewriting admin.js');
