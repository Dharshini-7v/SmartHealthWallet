/* ============================================================
   SMARTSLIP - QR Code Generator Module
   ============================================================ */

function generateQR() {
  const qrEl = document.getElementById('qrcode');
  if (!qrEl) return;

  const user = DB.getUser();
  if (!user) return;

  // Build data object
  const data = buildQRData();
  const jsonStr = JSON.stringify(data, null, 2);

  // Show data preview
  const preview = document.getElementById('qrDataPreview');
  if (preview) {
    preview.innerHTML = Object.entries(data).map(([k, v]) => `
      <div style="margin-bottom:8px;">
        <span style="font-weight:700;color:var(--text-secondary);text-transform:uppercase;font-size:0.72rem;letter-spacing:0.05em;">${k}:</span>
        <span style="margin-left:6px;color:var(--text-primary);">${Array.isArray(v) ? v.join(', ') || 'None' : v || '-'}</span>
      </div>
    `).join('');
  }

  // Clear previous QR
  qrEl.innerHTML = '';

  // Generate using QRCode.js library
  if (typeof QRCode !== 'undefined') {
    QRCode.toCanvas(document.createElement('canvas'), jsonStr, {
      width: 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    }, (err, canvas) => {
      if (err) {
        qrEl.innerHTML = `<div style="color:var(--danger);font-size:0.8rem;padding:20px;">QR generation failed</div>`;
        return;
      }
      canvas.style.borderRadius = '8px';
      canvas.id = 'qrCanvas';
      qrEl.appendChild(canvas);
    });
  } else {
    // Fallback: simple text-based placeholder
    qrEl.innerHTML = `
      <div style="width:200px;height:200px;background:#f8fafc;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px dashed #e2e8f0;">
        <div style="font-size:3rem;margin-bottom:8px;">📲</div>
        <div style="font-size:0.75rem;color:var(--text-muted);text-align:center;padding:0 12px;">QR Code<br/>(Loading library...)</div>
      </div>
    `;
    // Retry after library loads
    setTimeout(() => generateQR(), 1500);
  }
}

function buildQRData() {
  const user = DB.getUser();
  const today = new Date().toISOString().split('T')[0];
  const rxs = DB.getPrescriptions().filter(r => !r.end || r.end >= today);
  const emergency = DB.getEmergency();

  const data = { platform: 'SmartSlip' };

  const incName = document.getElementById('qrIncludeName')?.checked !== false;
  const incMeds = document.getElementById('qrIncludeMeds')?.checked !== false;
  const incAllergies = document.getElementById('qrIncludeAllergies')?.checked !== false;
  const incEmergency = document.getElementById('qrIncludeEmergency')?.checked !== false;
  const incConditions = document.getElementById('qrIncludeConditions')?.checked !== false;

  if (incName && user) {
    data.name = `${user.firstName} ${user.lastName}`;
    data.dob = user.dob || '';
    data.gender = user.gender || '';
    data.blood_type = user.bloodType || '';
    data.phone = user.phone || '';
  }

  if (incMeds) {
    data.medications = rxs.map(r => `${r.name} ${r.dosage} (${r.frequency})`);
  }

  if (incAllergies && user) {
    data.allergies = user.allergies ? user.allergies.split(',').map(a => a.trim()) : [];
  }

  if (incConditions && user) {
    data.conditions = user.conditions ? user.conditions.split(',').map(c => c.trim()) : [];
  }

  if (incEmergency && emergency.length) {
    data.emergency_contact = `${emergency[0].name} (${emergency[0].rel}) - ${emergency[0].phone}`;
  }

  data.generated = new Date().toLocaleDateString();

  return data;
}

function downloadQR() {
  const canvas = document.getElementById('qrCanvas');
  if (!canvas) {
    showToast('QR code not ready yet', 'warning');
    return;
  }
  const link = document.createElement('a');
  link.download = 'SmartSlip_QR_Card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('✅ QR Code downloaded!', 'success');
}

function printQR() {
  const canvas = document.getElementById('qrCanvas');
  const user = DB.getUser();
  if (!canvas) {
    showToast('QR code not ready yet', 'warning');
    return;
  }

  const data = buildQRData();
  const imgData = canvas.toDataURL('image/png');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SmartSlip QR Health Card</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: white; }
        .card { max-width: 400px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 20px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #0f172a, #1e3a5f); padding: 24px; text-align: center; color: white; }
        .header h1 { font-size: 1.5rem; margin: 0 0 4px; }
        .header p { margin: 0; opacity: 0.6; font-size: 0.85rem; }
        .body { padding: 24px; }
        .qr-wrap { text-align: center; margin-bottom: 20px; }
        .qr-wrap img { border-radius: 12px; border: 2px solid #e2e8f0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 600; }
        .info-value { color: #0f172a; font-weight: 500; text-align: right; max-width: 60%; }
        .footer { background: #f8fafc; padding: 12px 24px; text-align: center; font-size: 0.75rem; color: #94a3b8; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>💊 SmartSlip</h1>
          <p>Personal Health QR Card</p>
        </div>
        <div class="body">
          <div class="qr-wrap"><img src="${imgData}" width="180" height="180" /></div>
          ${Object.entries(data).filter(([k]) => k !== 'platform' && k !== 'generated').map(([k, v]) => `
            <div class="info-row">
              <span class="info-label">${k.replace(/_/g,' ').toUpperCase()}</span>
              <span class="info-value">${Array.isArray(v) ? (v.join(', ') || 'None') : (v || '-')}</span>
            </div>
          `).join('')}
        </div>
        <div class="footer">Generated by SmartSlip · ${new Date().toLocaleDateString()} · Scan QR for digital health data</div>
      </div>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>
  `);
  win.document.close();
}
