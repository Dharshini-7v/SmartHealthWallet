/* ============================================================
   SMARTSLIP - Prescriptions Module
   ============================================================ */

function renderPrescriptions() {
  const el = document.getElementById('prescriptionsList');
  if (!el) return;

  const rxs = DB.getPrescriptions();
  if (!rxs.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💊</div>
        <h3>No prescriptions added yet</h3>
        <p>Add your first prescription to track your medications</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="openAddPrescription()">+ Add Prescription</button>
      </div>
    `;
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const active = rxs.filter(r => !r.end || r.end >= today);
  const expired = rxs.filter(r => r.end && r.end < today);

  el.innerHTML = `
    ${active.length ? `
      <h3 style="font-size:0.88rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px;">Active Prescriptions (${active.length})</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:28px;">
        ${active.map(rx => rxCard(rx, false)).join('')}
      </div>
    ` : ''}
    ${expired.length ? `
      <h3 style="font-size:0.88rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px;">Expired / Completed</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
        ${expired.map(rx => rxCard(rx, true)).join('')}
      </div>
    ` : ''}
  `;
}

function rxCard(rx, expired) {
  return `
    <div class="card" style="border-left:4px solid ${expired ? '#94a3b8' : 'var(--secondary)'};opacity:${expired ? '0.75' : '1'};">
      <div class="card-body" style="padding:18px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
          <div>
            <div style="font-size:1rem;font-weight:800;color:var(--text-primary);">💊 ${rx.name}</div>
            <div style="font-size:0.85rem;font-weight:700;color:${expired ? 'var(--text-muted)' : 'var(--secondary)'};margin-top:2px;">${rx.dosage}</div>
          </div>
          <span class="badge ${expired ? 'badge-gray' : 'badge-success'}">${expired ? 'Expired' : 'Active'}</span>
        </div>
        <div style="display:grid;gap:6px;font-size:0.82rem;color:var(--text-secondary);">
          <div>🕐 <strong>Frequency:</strong> ${rx.frequency}</div>
          ${rx.doctor ? `<div>👨‍⚕️ <strong>Prescribed by:</strong> ${rx.doctor}</div>` : ''}
          ${rx.start ? `<div>📅 <strong>Start:</strong> ${formatDate(rx.start)}</div>` : ''}
          ${rx.end ? `<div>📅 <strong>End:</strong> ${formatDate(rx.end)}</div>` : ''}
          ${rx.instructions ? `<div>📝 <strong>Instructions:</strong> ${rx.instructions}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn btn-ghost btn-sm" onclick="deletePrescription('${rx.id}')">🗑️ Remove</button>
          ${!expired ? `<button class="btn btn-primary btn-sm" onclick="addRxToReminder('${rx.id}')">⏰ Add Reminder</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function savePrescription() {
  const name = document.getElementById('rxName').value.trim();
  const dosage = document.getElementById('rxDosage').value.trim();
  const frequency = document.getElementById('rxFrequency').value;
  const start = document.getElementById('rxStart').value;
  const end = document.getElementById('rxEnd').value;
  const doctor = document.getElementById('rxDoctor').value.trim();
  const instructions = document.getElementById('rxInstructions').value.trim();
  const addReminder = document.getElementById('rxAddReminder').checked;

  if (!name) { showToast('Please enter medication name', 'error'); return; }

  const rx = DB.addPrescription({ name, dosage, frequency, start, end, doctor, instructions });

  // Auto-add reminder
  if (addReminder) {
    DB.addReminder({
      med: name,
      dose: dosage,
      time: '08:00',
      freq: 'daily',
      color: '#10b981',
      takenToday: false,
    });
  }

  closeModal('prescriptionModal');
  ['rxName','rxDosage','rxDoctor','rxInstructions'].forEach(id => document.getElementById(id).value = '');
  renderPrescriptions();
  updateDashboard();
  generateQR();
  showToast(`✅ ${name} prescription saved!`, 'success');
}

function deletePrescription(id) {
  if (confirm('Remove this prescription?')) {
    DB.deletePrescription(id);
    renderPrescriptions();
    updateDashboard();
    showToast('Prescription removed', 'info');
  }
}

function addRxToReminder(id) {
  const rx = DB.getPrescriptions().find(r => r.id === id);
  if (!rx) return;
  DB.addReminder({
    med: rx.name,
    dose: rx.dosage,
    time: '08:00',
    freq: 'daily',
    color: '#10b981',
    takenToday: false,
  });
  showToast(`⏰ Reminder added for ${rx.name}`, 'success');
}
