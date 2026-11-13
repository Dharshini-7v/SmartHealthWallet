/* ============================================================
   SMARTSLIP - Medicine Reminders Module
   ============================================================ */

function renderReminders() {
  const reminders = DB.getReminders();

  // Today's Schedule - sorted by time
  const sorted = [...reminders].sort((a,b) => a.time.localeCompare(b.time));
  renderReminderList('todayReminders', sorted, true);

  // All medications card
  renderAllReminders('allReminders', reminders);
}

function renderReminderList(elId, reminders, showCheck) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (!reminders.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⏰</div><h3>No reminders set</h3><p>Add medicine reminders to stay on track</p><button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="openAddReminder()">+ Add Reminder</button></div>`;
    return;
  }

  const taken = reminders.filter(r => r.takenToday).length;
  const total = reminders.length;

  el.innerHTML = `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">Today's Progress</span>
        <span style="font-size:0.82rem;font-weight:700;color:var(--primary);">${taken}/${total} taken</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${total > 0 ? (taken/total*100) : 0}%"></div>
      </div>
    </div>
    ${reminders.map(r => reminderItem(r, showCheck)).join('')}
  `;
}

function renderAllReminders(elId, reminders) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (!reminders.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💊</div><h3>No medications added</h3></div>`;
    return;
  }

  el.innerHTML = reminders.map(r => `
    <div class="reminder-item">
      <div class="reminder-pill" style="background:${r.color}22;color:${r.color};font-size:1.3rem;">💊</div>
      <div class="reminder-info" style="flex:1;">
        <div class="reminder-name">${r.med}</div>
        <div class="reminder-dose">${r.dose} · ${r.freq}</div>
      </div>
      <div class="reminder-time">${r.time}</div>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteReminder('${r.id}')" style="margin-left:4px;">🗑️</button>
    </div>
  `).join('');
}

function reminderItem(r, showCheck) {
  const now = new Date();
  const [hh, mm] = r.time.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(hh, mm, 0);
  const isPast = now > reminderDate;

  return `
    <div class="reminder-item" style="opacity:${r.takenToday ? '0.6' : '1'};">
      <div class="reminder-pill" style="background:${r.color}22;color:${r.color};">💊</div>
      <div class="reminder-info">
        <div class="reminder-name" style="${r.takenToday ? 'text-decoration:line-through;' : ''}">${r.med}</div>
        <div class="reminder-dose">${r.dose} · ${r.freq}</div>
      </div>
      <div class="reminder-time" style="${isPast && !r.takenToday ? 'background:#fee2e2;color:#dc2626;' : ''}">${r.time}</div>
      ${showCheck ? `
        <div class="reminder-check ${r.takenToday ? 'taken' : ''}" onclick="markTaken('${r.id}')" title="${r.takenToday ? 'Taken' : 'Mark as taken'}">
          ${r.takenToday ? '✓' : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function markTaken(id) {
  const r = DB.toggleReminderTaken(id);
  if (r?.takenToday) {
    showToast(`✅ ${r.med} marked as taken`, 'success');
  } else {
    showToast(`↩️ ${r.med} marked as not taken`, 'info');
  }
  renderReminders();
  updateDashboard();
}

function saveReminder() {
  const med = document.getElementById('remMed').value.trim();
  const dose = document.getElementById('remDose').value.trim();
  const time = document.getElementById('remTime').value;
  const freq = document.getElementById('remFreq').value;
  const color = document.getElementById('remColor').value;

  if (!med || !time) {
    showToast('Please enter medicine name and time', 'error');
    return;
  }

  DB.addReminder({ med, dose, time, freq, color, takenToday: false });
  closeModal('reminderModal');
  ['remMed','remDose','remTime'].forEach(id => document.getElementById(id).value = '');
  renderReminders();
  updateDashboard();
  showToast(`⏰ Reminder set for ${med} at ${time}`, 'success');

  // Schedule browser notification
  scheduleNotification(med, dose, time);
}

function deleteReminder(id) {
  if (confirm('Remove this reminder?')) {
    DB.deleteReminder(id);
    renderReminders();
    updateDashboard();
    showToast('Reminder removed', 'info');
  }
}

function scheduleNotification(med, dose, time) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
    return;
  }
  const [hh, mm] = time.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hh, mm, 0, 0);
  if (target < now) target.setDate(target.getDate() + 1);
  const delay = target - now;
  if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
    setTimeout(() => {
      new Notification('SmartSlip Reminder', {
        body: `💊 Time to take ${med} - ${dose}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>'
      });
    }, delay);
  }
}
