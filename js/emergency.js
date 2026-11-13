/* ============================================================
   SMARTSLIP - Emergency Contacts Module
   ============================================================ */

const AVATAR_COLORS = ['#2563eb','#10b981','#ef4444','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];

function renderEmergency() {
  const el = document.getElementById('emergencyList');
  if (!el) return;

  const contacts = DB.getEmergency();
  if (!contacts.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🚨</div>
        <h3>No emergency contacts</h3>
        <p>Add trusted contacts for emergency situations</p>
        <button class="btn btn-danger btn-sm" style="margin-top:14px;" onclick="openAddEmergency()">+ Add Contact</button>
      </div>
    `;
    return;
  }

  el.innerHTML = contacts.map((c, i) => emergencyCard(c, i)).join('');
  updateEmergencyCard();
}

function emergencyCard(c, i) {
  const color = c.color || AVATAR_COLORS[i % AVATAR_COLORS.length];
  const initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  return `
    <div class="emergency-card">
      <div class="emergency-avatar" style="background:${color};">${initials}</div>
      <div class="emergency-info">
        <div class="emergency-name">${c.name}</div>
        <div class="emergency-rel">${c.rel}</div>
        <div class="emergency-phone">${c.phone}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <a class="emergency-call" href="tel:${c.phone}" title="Call ${c.name}">📞</a>
        ${c.email ? `<a class="emergency-call" href="mailto:${c.email}" title="Email" style="background:#dbeafe;color:#2563eb;">✉️</a>` : ''}
        <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteEmergency('${c.id}')" title="Remove">🗑️</button>
      </div>
    </div>
  `;
}

function saveEmergencyContact() {
  const name = document.getElementById('emgName').value.trim();
  const rel = document.getElementById('emgRel').value;
  const phone = document.getElementById('emgPhone').value.trim();
  const email = document.getElementById('emgEmail').value.trim();

  if (!name || !phone) {
    showToast('Please enter name and phone number', 'error');
    return;
  }

  const contacts = DB.getEmergency();
  const color = AVATAR_COLORS[contacts.length % AVATAR_COLORS.length];

  DB.addEmergency({ name, rel, phone, email, color });
  closeModal('emergencyModal');
  ['emgName','emgPhone','emgEmail'].forEach(id => document.getElementById(id).value = '');
  renderEmergency();
  generateQR();
  showToast(`✅ ${name} added as emergency contact`, 'success');
}

function deleteEmergency(id) {
  if (confirm('Remove this emergency contact?')) {
    DB.deleteEmergency(id);
    renderEmergency();
    generateQR();
    showToast('Contact removed', 'info');
  }
}

/* ---- Update the emergency info card in the sidebar ---- */
function updateEmergencyCard() {
  const user = DB.getUser();
  const rxs = DB.getPrescriptions();
  const contacts = DB.getEmergency();

  const today = new Date().toISOString().split('T')[0];
  const activeMeds = rxs.filter(r => !r.end || r.end >= today);

  if (user) {
    setEl('emergCardName', `${user.firstName} ${user.lastName}`);
    setEl('emergCardBlood', user.bloodType || '-');
    setEl('emergCardAllergies', user.allergies || 'None listed');
    setEl('emergCardConditions', user.conditions || 'None listed');
    setEl('emergCardMeds', activeMeds.length
      ? activeMeds.map(m => `• ${m.name} ${m.dosage}`).join('\n')
      : 'None listed'
    );

    // Also update profile
    setEl('profileName', `${user.firstName} ${user.lastName}`);
    setEl('profileEmail', user.email);
    const avatarBig = document.getElementById('profileAvatarBig');
    if (avatarBig) avatarBig.textContent = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
}
