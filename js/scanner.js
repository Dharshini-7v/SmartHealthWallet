/* ============================================================
   SMARTSLIP - QR Code Scanner Module
   ============================================================ */

let scannerStream = null;
let scannerInterval = null;

function startScanner() {
  const video = document.getElementById('scannerVideo');
  const overlay = document.getElementById('scannerOverlay');
  const placeholder = document.getElementById('scannerPlaceholder');
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Camera not supported on this device/browser', 'error');
    return;
  }

  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
  }).then(stream => {
    scannerStream = stream;
    video.srcObject = stream;
    video.play();
    video.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';

    // Start scanning frames
    scannerInterval = setInterval(() => scanFrame(video), 300);
    showToast('📷 Camera started – hold QR code in frame', 'info');
  }).catch(err => {
    console.error('Camera error:', err);
    if (err.name === 'NotAllowedError') {
      showToast('Camera permission denied. Please allow camera access.', 'error');
    } else if (err.name === 'NotFoundError') {
      showToast('No camera found on this device', 'error');
    } else {
      showToast('Could not access camera: ' + err.message, 'error');
    }
  });
}

function stopScanner() {
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  if (scannerInterval) {
    clearInterval(scannerInterval);
    scannerInterval = null;
  }

  const video = document.getElementById('scannerVideo');
  const overlay = document.getElementById('scannerOverlay');
  const placeholder = document.getElementById('scannerPlaceholder');
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');

  if (video) { video.style.display = 'none'; video.srcObject = null; }
  if (overlay) overlay.style.display = 'none';
  if (placeholder) placeholder.style.display = 'flex';
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
}

function scanFrame(video) {
  if (!video.videoWidth) return;

  const canvas = document.getElementById('scannerCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (typeof jsQR === 'undefined') return;

  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert'
  });

  if (code) {
    stopScanner();
    processQRResult(code.data);
  }
}

function scanFromFile(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      if (typeof jsQR === 'undefined') {
        showToast('QR scanner library not loaded', 'error');
        return;
      }

      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        processQRResult(code.data);
      } else {
        showToast('No QR code found in image', 'warning');
        const el = document.getElementById('scanResults');
        if (el) el.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❌</div>
            <h3>No QR Code Detected</h3>
            <p>The image doesn't contain a readable QR code. Try a clearer image.</p>
          </div>
        `;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function processQRResult(rawData) {
  showToast('✅ QR Code scanned successfully!', 'success');

  let parsed = null;
  try {
    parsed = JSON.parse(rawData);
  } catch {
    parsed = null;
  }

  const el = document.getElementById('scanResults');
  if (!el) return;

  if (parsed && parsed.platform === 'SmartSlip') {
    // It's a SmartSlip QR code
    el.innerHTML = renderSmartSlipScanResult(parsed);
  } else if (parsed) {
    // Some other JSON QR
    el.innerHTML = renderGenericJsonResult(parsed);
  } else {
    // Plain text QR
    el.innerHTML = renderTextResult(rawData);
  }
}

function renderSmartSlipScanResult(data) {
  const fields = [
    { icon:'👤', label:'Name', key:'name' },
    { icon:'🎂', label:'Date of Birth', key:'dob' },
    { icon:'⚧️', label:'Gender', key:'gender' },
    { icon:'🩸', label:'Blood Type', key:'blood_type' },
    { icon:'📱', label:'Phone', key:'phone' },
    { icon:'💊', label:'Medications', key:'medications', isArray:true },
    { icon:'⚠️', label:'Allergies', key:'allergies', isArray:true },
    { icon:'🏥', label:'Conditions', key:'conditions', isArray:true },
    { icon:'🚨', label:'Emergency Contact', key:'emergency_contact' },
    { icon:'📅', label:'Generated', key:'generated' },
  ];

  return `
    <div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);border-radius:16px;padding:20px;color:white;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:1.8rem;">💊</span>
        <div>
          <div style="font-size:1.1rem;font-weight:800;">SmartSlip Health Card</div>
          <div style="font-size:0.78rem;opacity:0.6;">Digital Medical Record</div>
        </div>
        <span class="badge badge-success" style="margin-left:auto;">✅ Verified</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${fields.map(f => {
        const val = data[f.key];
        if (!val || (Array.isArray(val) && !val.length)) return '';
        return `
          <div style="display:flex;gap:12px;align-items:flex-start;padding:12px;background:#f8fafc;border-radius:12px;border:1px solid var(--border);">
            <span style="font-size:1.2rem;">${f.icon}</span>
            <div style="flex:1;">
              <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">${f.label}</div>
              <div style="font-size:0.9rem;font-weight:600;color:var(--text-primary);">
                ${f.isArray ? (Array.isArray(val) ? val.join(' • ') : val) : val}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderGenericJsonResult(data) {
  return `
    <div style="background:#f8fafc;border-radius:12px;padding:16px;border:1px solid var(--border);">
      <div class="card-title" style="margin-bottom:12px;">📋 QR Data</div>
      <pre style="font-size:0.8rem;color:var(--text-secondary);overflow:auto;max-height:300px;">${JSON.stringify(data,null,2)}</pre>
    </div>
  `;
}

function renderTextResult(text) {
  const isURL = text.startsWith('http://') || text.startsWith('https://');
  return `
    <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid var(--border);text-align:center;">
      <div style="font-size:2rem;margin-bottom:12px;">📄</div>
      <div style="font-weight:700;margin-bottom:8px;">Scanned Content</div>
      <div style="font-size:0.9rem;color:var(--text-secondary);word-break:break-all;margin-bottom:12px;">${text}</div>
      ${isURL ? `<a href="${text}" target="_blank" class="btn btn-primary btn-sm">🔗 Open Link</a>` : ''}
    </div>
  `;
}
