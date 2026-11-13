/* ============================================================
   SMARTSLIP - Appointments Module
   ============================================================ */

function renderAppointments() {
  const today = new Date().toISOString().split('T')[0];
  const all = DB.getAppointments();
  const upcoming = all.filter(a => a.date >= today);
  const past = all.filter(a => a.date < today).reverse();

  renderApptList('upcomingAppts', upcoming, true);
  renderApptList('pastAppts', past, false);
}

function renderApptList(elId, appts, isUpcoming) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (!appts.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${isUpcoming ? '📅' : '✅'}</div>
        <h3>${isUpcoming ? 'No upcoming appointments' : 'No past appointments'}</h3>
        ${isUpcoming ? '<button class="btn btn-primary btn-sm" style="margin-top:14px;" onclick="openAddAppointment()">+ Book Now</button>' : ''}
      </div>
    `;
    return;
  }

  el.innerHTML = appts.map(a => fullApptCard(a, isUpcoming)).join('');
}

function fullApptCard(a, isUpcoming) {
  const d = new Date(a.date + 'T00:00:00');
  const isToday = a.date === new Date().toISOString().split('T')[0];

  return `
    <div class="appt-item" style="${isToday ? 'border-color:var(--primary);background:var(--primary-light);' : ''}">
      <div class="appt-date" style="${isToday ? 'background:var(--primary);' : ''}">
        <div class="day" style="${isToday ? 'color:white;' : ''}">${d.getDate()}</div>
        <div class="month" style="${isToday ? 'color:rgba(255,255,255,0.8);' : ''}">${d.toLocaleString('default',{month:'short'})}</div>
      </div>
      <div class="appt-info" style="flex:1;">
        <div class="appt-doctor">${a.doctor} ${isToday ? '<span class="badge badge-primary" style="margin-left:6px;">Today</span>' : ''}</div>
        <div class="appt-spec">${a.spec} · ${a.hospital}</div>
        ${a.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">📝 ${a.notes}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div class="appt-time-badge">🕐 ${a.time}</div>
        <button class="btn btn-ghost btn-sm" onclick="deleteAppt('${a.id}')">🗑️</button>
      </div>
    </div>
  `;
}

function saveAppointment() {
  const doctor = document.getElementById('apptDoctor').value.trim();
  const spec = document.getElementById('apptSpec').value;
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  const hospital = document.getElementById('apptHospital').value.trim();
  const notes = document.getElementById('apptNotes').value.trim();

  if (!doctor || !date || !time) {
    showToast('Please fill in doctor name, date and time', 'error');
    return;
  }

  DB.addAppointment({ doctor, spec, date, time, hospital, notes });
  closeModal('appointmentModal');
  ['apptDoctor','apptDate','apptTime','apptHospital','apptNotes'].forEach(id => document.getElementById(id).value = '');
  renderAppointments();
  updateDashboard();
  showToast(`✅ Appointment with ${doctor} scheduled!`, 'success');
}

function deleteAppt(id) {
  if (confirm('Remove this appointment?')) {
    DB.deleteAppointment(id);
    renderAppointments();
    updateDashboard();
    showToast('Appointment removed', 'info');
  }
}
