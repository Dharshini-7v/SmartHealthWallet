/* ============================================================
   SMARTSLIP - Health Records Module
   ============================================================ */

let currentFilter = 'all';
let dragFileBuffer = null;

/* ---- RENDER RECORDS ---- */
function renderRecords(filter) {
  if (filter !== undefined) currentFilter = filter;
  const el = document.getElementById('recordsList');
  if (!el) return;

  let records = DB.getRecords();
  if (currentFilter !== 'all') records = records.filter(r => r.type === currentFilter);

  if (!records.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>No records found</h3>
        <p>Upload your first health record to get started</p>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="openUploadModal()">📄 Upload Record</button>
      </div>
    `;
    return;
  }

  el.innerHTML = records.map(r => recordCard(r)).join('');
}

function recordCard(r) {
  const icons = { report:'📊', prescription:'💊', lab:'🧪', xray:'🩻', other:'📎' };
  const colorClass = { report:'report', prescription:'prescription', lab:'lab', xray:'', other:'' };
  const typeLabels = { report:'Medical Report', prescription:'Prescription', lab:'Lab Test', xray:'X-Ray / Scan', other:'Other' };
  return `
    <div class="record-item card" style="margin-bottom:12px;padding:16px 20px;">
      <div class="record-icon ${colorClass[r.type]}">${icons[r.type] || '📄'}</div>
      <div class="record-info" style="flex:1;">
        <div class="record-name">${r.name}</div>
        <div class="record-meta" style="margin-top:4px;">
          <span class="badge badge-gray">${typeLabels[r.type] || r.type}</span>
          &nbsp;${r.date ? '📅 ' + r.date : ''} &nbsp;${r.doctor ? '👨‍⚕️ ' + r.doctor : ''}
        </div>
        ${r.notes ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">📝 ${r.notes}</div>` : ''}
        ${r.fileName ? `<div style="font-size:0.8rem;color:var(--primary);margin-top:4px;">📎 ${r.fileName}</div>` : ''}
      </div>
      <div class="record-actions">
        ${r.fileData ? `<button class="btn btn-primary btn-sm" onclick="viewFile('${r.id}')">👁️ View</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="downloadRecord('${r.id}')">⬇️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteRecord('${r.id}')">🗑️</button>
      </div>
    </div>
  `;
}

function renderLabReports() {
  const el = document.getElementById('labReportsList');
  if (!el) return;
  const labs = DB.getRecords().filter(r => r.type === 'lab');
  if (!labs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🧪</div><h3>No lab reports yet</h3><button class="btn btn-primary" style="margin-top:16px;" onclick="openUploadModal('lab')">+ Add Lab Report</button></div>`;
    return;
  }
  el.innerHTML = `<div class="card"><div class="card-body" style="padding:12px;">${labs.map(r => recordCard(r)).join('')}</div></div>`;
}

/* ---- FILTER ---- */
function filterRecords(type, btn) {
  document.querySelectorAll('#page-records .btn-ghost').forEach(b => b.style.background = '');
  btn.style.background = 'var(--primary-light)';
  btn.style.color = 'var(--primary)';
  renderRecords(type);
}

/* ---- SAVE RECORD ---- */
function saveRecord() {
  const name = document.getElementById('uploadName').value.trim();
  const type = document.getElementById('uploadType').value;
  const date = document.getElementById('uploadDate').value;
  const doctor = document.getElementById('uploadDoctor').value.trim();
  const notes = document.getElementById('uploadNotes').value.trim();
  const fileInput = document.getElementById('modalFileInput');
  const file = fileInput.files[0];

  if (!name) { showToast('Please enter a record name', 'error'); return; }

  const record = { name, type, date, doctor, notes };

  if (file) {
    record.fileName = file.name;
    record.fileType = file.name.split('.').pop().toLowerCase();
    record.fileSize = (file.size / 1024).toFixed(1) + ' KB';

    const reader = new FileReader();
    reader.onload = (e) => {
      record.fileData = e.target.result;
      DB.addRecord(record);
      afterSaveRecord();
    };
    reader.readAsDataURL(file);
  } else {
    DB.addRecord(record);
    afterSaveRecord();
  }
}

function afterSaveRecord() {
  closeModal('uploadModal');
  // Clear inputs
  ['uploadName','uploadDoctor','uploadNotes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modalFileName').textContent = '';
  document.getElementById('modalFileInput').value = '';
  renderRecords();
  updateDashboard();
  showToast('✅ Record saved successfully!', 'success');
  // Auto generate QR
  generateQR();
}

function deleteRecord(id) {
  if (confirm('Delete this health record?')) {
    DB.deleteRecord(id);
    renderRecords();
    updateDashboard();
    showToast('Record deleted', 'info');
  }
}

function viewFile(id) {
  const r = DB.getRecords().find(x => x.id === id);
  if (!r || !r.fileData) { showToast('No file attached', 'warning'); return; }

  if (r.fileType === 'pdf') {
    // Open PDF in new tab
    const win = window.open();
    win.document.write(`
      <html><body style="margin:0;padding:0;background:#111;">
        <embed src="${r.fileData}" type="application/pdf" width="100%" height="100%" style="height:100vh;" />
      </body></html>
    `);
  } else {
    // Show image
    const win = window.open();
    win.document.write(`
      <html><body style="margin:0;padding:20px;background:#111;display:flex;justify-content:center;">
        <img src="${r.fileData}" style="max-width:100%;border-radius:12px;" />
      </body></html>
    `);
  }
}

function downloadRecord(id) {
  const r = DB.getRecords().find(x => x.id === id);
  if (!r || !r.fileData) {
    // Create a text file with info
    const content = `SmartSlip Health Record\n${'='.repeat(40)}\nName: ${r.name}\nType: ${r.type}\nDate: ${r.date}\nDoctor: ${r.doctor}\nNotes: ${r.notes}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.name.replace(/\s+/g,'-')}.txt`;
    a.click();
    return;
  }
  const a = document.createElement('a');
  a.href = r.fileData;
  a.download = r.fileName || `${r.name}.${r.fileType}`;
  a.click();
  showToast('Download started', 'success');
}

/* ---- DRAG & DROP ---- */
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('dragover');
}
function handleDragLeave(e) {
  document.getElementById('dropZone').classList.remove('dragover');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length) handleFileSelect(files);
}
function handleFileSelect(files) {
  if (!files.length) return;
  // Open upload modal with first file
  openUploadModal();
  // Pre-fill filename
  setTimeout(() => {
    document.getElementById('uploadName').value = files[0].name.replace(/\.[^.]+$/, '');
    // Store file reference
    const dt = new DataTransfer();
    Array.from(files).forEach(f => dt.items.add(f));
    document.getElementById('modalFileInput').files = dt.files;
    document.getElementById('modalFileName').textContent = '📎 ' + files[0].name;
  }, 100);
}
