/* ============================================================
   SMARTSLIP - Profile Module
   ============================================================ */

function renderProfile() {
  const user = DB.getUser();
  if (!user) return;

  const name = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  setEl('profileName', name);
  setEl('profileEmail', user.email);

  const avatarBig = document.getElementById('profileAvatarBig');
  if (avatarBig) avatarBig.textContent = initials;

  // Tags
  const tagsEl = document.getElementById('profileTags');
  if (tagsEl) {
    const tags = [];
    if (user.bloodType) tags.push(`<span style="background:rgba(239,68,68,0.2);color:#fca5a5;padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:700;">🩸 ${user.bloodType}</span>`);
    if (user.gender) tags.push(`<span style="background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);padding:4px 12px;border-radius:20px;font-size:0.78rem;">${user.gender}</span>`);
    if (user.conditions) {
      user.conditions.split(',').slice(0,2).forEach(c => {
        tags.push(`<span style="background:rgba(245,158,11,0.2);color:#fcd34d;padding:4px 12px;border-radius:20px;font-size:0.78rem;">${c.trim()}</span>`);
      });
    }
    tagsEl.innerHTML = tags.join('');
  }

  // Info sections
  const infoEl = document.getElementById('profileInfo');
  if (infoEl) {
    const sections = [
      {
        title: '👤 Personal Information',
        rows: [
          { label: 'Full Name', value: name },
          { label: 'Date of Birth', value: user.dob ? formatDate(user.dob) : '-' },
          { label: 'Gender', value: user.gender || '-' },
          { label: 'Phone', value: user.phone || '-' },
          { label: 'Email', value: user.email },
          { label: 'Address', value: user.address || '-' },
        ]
      },
      {
        title: '🏥 Medical Information',
        rows: [
          { label: 'Blood Type', value: user.bloodType || '-' },
          { label: 'Height', value: user.height ? user.height + ' cm' : '-' },
          { label: 'Allergies', value: user.allergies || 'None recorded' },
          { label: 'Conditions', value: user.conditions || 'None recorded' },
          { label: 'Active Meds', value: DB.getPrescriptions().filter(r => !r.end || r.end >= new Date().toISOString().split('T')[0]).length.toString() },
          { label: 'Member Since', value: user.createdAt ? formatDate(user.createdAt) : '-' },
        ]
      }
    ];

    infoEl.innerHTML = sections.map(s => `
      <div>
        <h3 style="font-size:0.9rem;font-weight:800;color:var(--text-secondary);margin-bottom:14px;text-transform:uppercase;letter-spacing:0.05em;">${s.title}</h3>
        ${s.rows.map(r => `
          <div class="info-row">
            <span class="info-label">${r.label}</span>
            <span class="info-value">${r.value}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }
}

function saveProfile() {
  const user = DB.getUser();
  if (!user) return;

  user.firstName = document.getElementById('epFirstName').value.trim();
  user.lastName = document.getElementById('epLastName').value.trim();
  user.dob = document.getElementById('epDob').value;
  user.gender = document.getElementById('epGender').value;
  user.phone = document.getElementById('epPhone').value.trim();
  user.bloodType = document.getElementById('epBlood').value;
  user.address = document.getElementById('epAddress').value.trim();
  user.allergies = document.getElementById('epAllergies').value.trim();
  user.conditions = document.getElementById('epConditions').value.trim();
  user.height = document.getElementById('epHeight').value.trim();

  DB.setUser(user);
  closeModal('editProfileModal');
  renderProfile();
  updateSidebarUser(user);
  updateEmergencyCard();
  generateQR();
  showToast('✅ Profile updated successfully!', 'success');
}
