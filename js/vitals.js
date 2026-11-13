/* ============================================================
   SMARTSLIP - Vitals Module
   ============================================================ */

function renderVitals() {
  const v = DB.getLatestVitals();
  if (!v) return;
  renderDashVitals();
}

function renderVitalsPage() {
  const el = document.getElementById('vitalsDisplay');
  if (!el) return;
  const v = DB.getLatestVitals();
  if (!v) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:32px;"><div class="empty-icon">❤️</div><h3>No vitals recorded</h3><button class="btn btn-primary" style="margin-top:14px;" onclick="openUpdateVitals()">+ Record Vitals</button></div>`;
  } else {
    el.innerHTML = buildVitalsGrid(v);
  }

  // History table
  const tbody = document.getElementById('vitalsHistoryTable');
  if (!tbody) return;
  const history = DB.getVitals().slice().reverse();

  if (!history.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No vitals history yet</td></tr>`;
    return;
  }
  tbody.innerHTML = history.map(v => `
    <tr>
      <td>${new Date(v.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td>
      <td>${v.bp || '-'}</td>
      <td>${v.hr || '-'}</td>
      <td>${v.temp || '-'}</td>
      <td>${v.spo2 || '-'}%</td>
      <td>${v.sugar || '-'}</td>
      <td>${v.weight || '-'}</td>
    </tr>
  `).join('');
}

function saveVitals() {
  const bp = document.getElementById('vBP').value.trim();
  const hr = document.getElementById('vHR').value.trim();
  const temp = document.getElementById('vTemp').value.trim();
  const spo2 = document.getElementById('vSpo2').value.trim();
  const sugar = document.getElementById('vSugar').value.trim();
  const weight = document.getElementById('vWeight').value.trim();

  if (!bp && !hr && !temp) {
    showToast('Please enter at least one vital measurement', 'error');
    return;
  }

  DB.addVitals({ bp, hr, temp, spo2, sugar, weight });
  closeModal('vitalsModal');
  ['vBP','vHR','vTemp','vSpo2','vSugar','vWeight'].forEach(id => document.getElementById(id).value = '');
  renderVitalsPage();
  renderDashVitals();
  showToast('✅ Vitals recorded successfully!', 'success');
}
