/* ============================================================
   SMARTSLIP - Core App Logic
   ============================================================ */

let currentPage = 'dashboard';

/* ---- INIT ---- */
function initApp(user) {
  updateSidebarUser(user);
  updateDashboard();
  renderVitals();
  checkReminders();

  // Set welcome message
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('welcomeMsg');
  if (el) el.textContent = `${greeting}, ${user.firstName} 👋`;

  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Update emergency card
  updateEmergencyCard();

  // Set up notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Start reminder checker
  setInterval(checkReminderAlerts, 60000);

  showPage('dashboard');
}

/* ---- PAGE NAVIGATION ---- */
function showPage(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`page-${page}`);
  if (section) section.classList.add('active');

  // Activate nav item
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
  });

  // Update topbar title
  const titles = {
    dashboard: '🏠 Dashboard',
    profile: '👤 My Profile',
    records: '📁 Health Records',
    prescriptions: '💊 Prescriptions',
    reports: '🧪 Lab Reports',
    vitals: '❤️ Vitals Monitor',
    appointments: '📅 Appointments',
    reminders: '⏰ Medicine Reminders',
    emergency: '🚨 Emergency Contacts',
    qrcode: '📲 QR Health Card',
    scanner: '🔍 QR Scanner',
    assistant: '🎙️ AI Assistant',
    settings: '⚙️ Settings',
  };
  const topbar = document.getElementById('topbarTitle');
  if (topbar) topbar.textContent = titles[page] || page;

  currentPage = page;
  closeSidebar();

  // Render specific pages
  if (page === 'records') renderRecords();
  else if (page === 'prescriptions') renderPrescriptions();
  else if (page === 'reports') renderLabReports();
  else if (page === 'appointments') renderAppointments();
  else if (page === 'reminders') renderReminders();
  else if (page === 'emergency') renderEmergency();
  else if (page === 'vitals') renderVitalsPage();
  else if (page === 'qrcode') generateQR();
  else if (page === 'profile') renderProfile();
  else if (page === 'settings') renderSettings();
  else if (page === 'assistant') initChat();
  else if (page === 'dashboard') updateDashboard();

  // Scroll to top
  document.querySelector('.page-content')?.scrollTo(0, 0);
}

/* ---- UPDATE DASHBOARD ---- */
function updateDashboard() {
  const records = DB.getRecords();
  const rxs = DB.getPrescriptions();
  const appts = DB.getAppointments();
  const reminders = DB.getReminders();
  const today = new Date().toISOString().split('T')[0];

  // Stats
  setEl('statRecords', records.length);
  setEl('statMeds', rxs.length);
  setEl('statAppts', appts.filter(a => a.date >= today).length);
  setEl('statReminders', reminders.filter(r => !r.takenToday).length);

  // Reminder badge
  const pending = reminders.filter(r => !r.takenToday).length;
  const badge = document.getElementById('reminderBadge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending ? '' : 'none';
  }

  // Today's meds
  renderDashReminders();

  // Upcoming appointments
  renderDashAppointments();

  // Recent records
  renderDashRecords();

  // Vitals
  renderDashVitals();
}

function renderDashReminders() {
  const el = document.getElementById('dashReminders');
  if (!el) return;
  const reminders = DB.getReminders().slice(0, 4);
  if (!reminders.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="empty-icon">💊</div><p>No medications added yet</p></div>`;
    return;
  }
  el.innerHTML = reminders.map(r => `
    <div class="reminder-item">
      <div class="reminder-pill" style="background:${r.color}22;color:${r.color};">💊</div>
      <div class="reminder-info">
        <div class="reminder-name">${r.med}</div>
        <div class="reminder-dose">${r.dose}</div>
      </div>
      <div class="reminder-time">${r.time}</div>
      <div class="reminder-check ${r.takenToday ? 'taken' : ''}" onclick="toggleTaken('${r.id}')">
        ${r.takenToday ? '✓' : ''}
      </div>
    </div>
  `).join('');
}

function renderDashAppointments() {
  const el = document.getElementById('dashAppointments');
  if (!el) return;
  const today = new Date().toISOString().split('T')[0];
  const upcoming = DB.getAppointments().filter(a => a.date >= today).slice(0, 3);
  if (!upcoming.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="empty-icon">📅</div><p>No upcoming appointments</p></div>`;
    return;
  }
  el.innerHTML = upcoming.map(a => apptCard(a)).join('');
}

function renderDashRecords() {
  const el = document.getElementById('dashRecords');
  if (!el) return;
  const records = DB.getRecords().slice(0, 3);
  if (!records.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="empty-icon">📁</div><p>No records uploaded</p></div>`;
    return;
  }
  el.innerHTML = records.map(r => recordMiniCard(r)).join('');
}

function renderDashVitals() {
  const el = document.getElementById('dashVitals');
  if (!el) return;
  const v = DB.getLatestVitals();
  if (!v) {
    el.innerHTML = `<div class="empty-state" style="padding:20px;grid-column:1/-1;"><div class="empty-icon">❤️</div><p>No vitals recorded yet. Click "Update Vitals" to add.</p></div>`;
    return;
  }
  el.innerHTML = buildVitalsGrid(v);
}

/* ---- VITALS GRID HELPER ---- */
function buildVitalsGrid(v) {
  const vitals = [
    { icon:'🩸', name:'Blood Pressure', value: v.bp || '-', unit:'mmHg', status: getBPStatus(v.bp) },
    { icon:'💓', name:'Heart Rate', value: v.hr || '-', unit:'bpm', status: getHRStatus(v.hr) },
    { icon:'🌡️', name:'Temperature', value: v.temp || '-', unit:'°F', status: getTempStatus(v.temp) },
    { icon:'💨', name:'SpO2', value: v.spo2 || '-', unit:'%', status: getSpo2Status(v.spo2) },
    { icon:'🍬', name:'Blood Sugar', value: v.sugar || '-', unit:'mg/dL', status: getSugarStatus(v.sugar) },
    { icon:'⚖️', name:'Weight', value: v.weight || '-', unit:'kg', status: 'normal' },
  ];
  return vitals.map(vt => `
    <div class="vital-card">
      <div class="vital-icon">${vt.icon}</div>
      <div class="vital-name">${vt.name}</div>
      <div class="vital-value">${vt.value}</div>
      <div class="vital-unit">${vt.unit}</div>
      <div class="vital-status ${vt.status}">${vt.status}</div>
    </div>
  `).join('');
}

/* ---- VITALS STATUS HELPERS ---- */
function getBPStatus(bp) {
  if (!bp || bp === '-') return 'normal';
  const parts = bp.split('/');
  if (parts.length < 2) return 'normal';
  const sys = parseInt(parts[0]);
  if (sys > 140) return 'critical';
  if (sys > 130) return 'warning';
  return 'normal';
}
function getHRStatus(hr) {
  const n = parseInt(hr);
  if (!n) return 'normal';
  if (n > 100 || n < 50) return 'critical';
  if (n > 90 || n < 60) return 'warning';
  return 'normal';
}
function getTempStatus(t) {
  const n = parseFloat(t);
  if (!n) return 'normal';
  if (n > 103 || n < 96) return 'critical';
  if (n > 100 || n < 97) return 'warning';
  return 'normal';
}
function getSpo2Status(s) {
  const n = parseInt(s);
  if (!n) return 'normal';
  if (n < 90) return 'critical';
  if (n < 95) return 'warning';
  return 'normal';
}
function getSugarStatus(s) {
  const n = parseInt(s);
  if (!n) return 'normal';
  if (n > 180 || n < 60) return 'critical';
  if (n > 140 || n < 70) return 'warning';
  return 'normal';
}

/* ---- HELPERS ---- */
function apptCard(a) {
  const d = new Date(a.date + 'T00:00:00');
  return `
    <div class="appt-item">
      <div class="appt-date">
        <div class="day">${d.getDate()}</div>
        <div class="month">${d.toLocaleString('default',{month:'short'})}</div>
      </div>
      <div class="appt-info">
        <div class="appt-doctor">${a.doctor}</div>
        <div class="appt-spec">${a.spec} · ${a.hospital}</div>
      </div>
      <div class="appt-time-badge">🕐 ${a.time}</div>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteAppt('${a.id}')" title="Delete">🗑️</button>
    </div>
  `;
}

function recordMiniCard(r) {
  const icons = { report:'📊', prescription:'💊', lab:'🧪', xray:'🩻', other:'📎' };
  const colors = { report:'report', prescription:'prescription', lab:'lab', xray:'', other:'' };
  return `
    <div class="record-item">
      <div class="record-icon ${colors[r.type]}">${icons[r.type] || '📄'}</div>
      <div class="record-info">
        <div class="record-name">${r.name}</div>
        <div class="record-meta">${r.date} · ${r.doctor}</div>
      </div>
      <div class="record-actions">
        ${r.fileData ? `<button class="btn btn-ghost btn-sm" onclick="viewFile('${r.id}')">👁️</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="deleteRecord('${r.id}')">🗑️</button>
      </div>
    </div>
  `;
}

/* ---- SIDEBAR ---- */
function updateSidebarUser(user) {
  const name = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  setEl('sidebarName', name);
  setEl('sidebarAvatar', initials);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

/* ---- MODAL HELPERS ---- */
function openModal(id) { document.getElementById(id)?.classList.add('active'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('active'); }
// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('active'); });
});

/* ---- OPEN MODALS ---- */
function openUploadModal(type) {
  if (type) document.getElementById('uploadType').value = type;
  document.getElementById('uploadDate').value = new Date().toISOString().split('T')[0];
  openModal('uploadModal');
}
function openAddPrescription() {
  document.getElementById('rxStart').value = new Date().toISOString().split('T')[0];
  openModal('prescriptionModal');
}
function openAddAppointment() {
  openModal('appointmentModal');
}
function openAddReminder() { openModal('reminderModal'); }
function openAddEmergency() { openModal('emergencyModal'); }
function openUpdateVitals() { openModal('vitalsModal'); }

function openEditProfile() {
  const user = DB.getUser();
  if (!user) return;
  document.getElementById('epFirstName').value = user.firstName || '';
  document.getElementById('epLastName').value = user.lastName || '';
  document.getElementById('epDob').value = user.dob || '';
  document.getElementById('epGender').value = user.gender || 'Male';
  document.getElementById('epPhone').value = user.phone || '';
  document.getElementById('epBlood').value = user.bloodType || 'A+';
  document.getElementById('epAddress').value = user.address || '';
  document.getElementById('epAllergies').value = user.allergies || '';
  document.getElementById('epConditions').value = user.conditions || '';
  document.getElementById('epHeight').value = user.height || '';
  openModal('editProfileModal');
}

/* ---- SEARCH ---- */
function handleSearch(query) {
  if (!query.trim()) return;
  const q = query.toLowerCase();
  const results = [
    ...DB.getRecords().filter(r => r.name.toLowerCase().includes(q) || r.doctor?.toLowerCase().includes(q)),
    ...DB.getPrescriptions().filter(p => p.name.toLowerCase().includes(q)),
    ...DB.getAppointments().filter(a => a.doctor.toLowerCase().includes(q)),
  ];
  // Could show a dropdown or navigate — for now navigate to records
  if (results.length > 0) showToast(`Found ${results.length} results`, 'info');
}

/* ---- UTILITY ---- */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

/* ---- EXPORT DATA ---- */
function exportData() {
  const data = {
    user: DB.getUser(),
    records: DB.getRecords(),
    prescriptions: DB.getPrescriptions(),
    appointments: DB.getAppointments(),
    reminders: DB.getReminders(),
    emergency: DB.getEmergency(),
    vitals: DB.getVitals(),
  };
  // Remove password from export
  if (data.user) delete data.user.password;

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smartslip_data_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported successfully', 'success');
}

function clearData() {
  if (confirm('This will delete ALL your SmartSlip data. This cannot be undone. Continue?')) {
    DB.clearAll();
    showToast('All data cleared', 'info');
    handleLogout();
  }
}

/* ---- REMINDER CHECK ALERTS ---- */
function checkReminderAlerts() {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  DB.getReminders().forEach(r => {
    if (r.time === hhmm && !r.takenToday) {
      showToast(`⏰ Time to take ${r.med} (${r.dose})`, 'warning');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SmartSlip Reminder', {
          body: `Time to take ${r.med} - ${r.dose}`,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>'
        });
      }
    }
  });
}

function checkReminders() {
  // Initial check
  checkReminderAlerts();
}

/* ---- COLOR SELECTOR ---- */
function selectColor(el, color) {
  document.querySelectorAll('.color-opt').forEach(c => c.style.border = 'none');
  el.style.border = `3px solid ${color}`;
  document.getElementById('remColor').value = color;
}

/* ---- VITALS TOGGLE TAKEN ---- */
function toggleTaken(id) {
  const r = DB.toggleReminderTaken(id);
  if (r?.takenToday) showToast(`✅ Marked ${r.med} as taken`, 'success');
  renderDashReminders();
  updateDashboard();
}

/* ---- RENDER SETTINGS ---- */
function renderSettings() {
  const s = DB.getSettings();
  const el = document.getElementById('settingsNotif');
  if (!el) return;

  const toggles = [
    { key: 'notifMedReminder', label: '💊 Medicine Reminders', desc: 'Get alerts when it\'s time for medication' },
    { key: 'notifAppointment', label: '📅 Appointment Reminders', desc: 'Notifications 24h before appointments' },
    { key: 'notifHealthTip', label: '💡 Daily Health Tips', desc: 'Get daily health tips and insights' },
    { key: 'notifEmergency', label: '🚨 Emergency Alerts', desc: 'Critical health alerts' },
    { key: 'reminderSound', label: '🔔 Reminder Sound', desc: 'Play sound for reminders' },
  ];

  el.innerHTML = toggles.map(t => `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div>
        <div style="font-size:0.9rem;font-weight:600;color:var(--text-primary);">${t.label}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">${t.desc}</div>
      </div>
      <label style="position:relative;display:inline-flex;align-items:center;cursor:pointer;flex-shrink:0;">
        <input type="checkbox" ${s[t.key] ? 'checked' : ''} onchange="updateSetting('${t.key}',this.checked)" style="opacity:0;width:0;height:0;position:absolute;" />
        <div style="
          width:44px;height:24px;border-radius:12px;
          background:${s[t.key] ? '#2563eb' : '#e2e8f0'};
          transition:0.3s;position:relative;
        ">
          <div style="
            position:absolute;top:3px;
            left:${s[t.key] ? '23px' : '3px'};
            width:18px;height:18px;border-radius:50%;
            background:white;transition:0.3s;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
          "></div>
        </div>
      </label>
    </div>
  `).join('');
}

function updateSetting(key, val) {
  const s = DB.getSettings();
  s[key] = val;
  DB.saveSettings(s);
  renderSettings();
  showToast('Settings saved', 'success');
}
