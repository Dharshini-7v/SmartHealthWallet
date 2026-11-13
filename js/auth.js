/* ============================================================
   SMARTSLIP - Auth Logic
   ============================================================ */

let selectedBlood = '';

function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const heading = document.getElementById('authHeading');
  const sub = document.getElementById('authSubheading');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    heading.textContent = 'Welcome back';
    sub.textContent = 'Sign in to your SmartSlip account';
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    heading.textContent = 'Create Account';
    sub.textContent = 'Join SmartSlip – your personal health platform';
  }
}

function togglePassword(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.textContent = '🙈';
  } else {
    inp.type = 'password';
    btn.textContent = '👁️';
  }
}

function selectBlood(btn, type) {
  document.querySelectorAll('.blood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedBlood = type;
  document.getElementById('regBlood').value = type;
}

function checkStrength(pass) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!pass) { fill.style.width = '0%'; text.textContent = ''; return; }

  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  const levels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#10b981'];
  const widths = ['0%', '25%', '50%', '75%', '100%'];

  fill.style.width = widths[score];
  fill.style.background = colors[score];
  text.textContent = score > 0 ? levels[score] : '';
  text.style.color = colors[score];
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }

  // Check localStorage for user
  const user = DB.getUser();
  if (user && user.email === email && user.password === password) {
    launchApp(user);
  } else if (!user) {
    showToast('No account found. Please register first.', 'warning');
    switchAuthTab('register');
  } else {
    showToast('Invalid email or password', 'error');
  }
}

function handleRegister(e) {
  e.preventDefault();
  const firstName = document.getElementById('regFirstName').value.trim();
  const lastName = document.getElementById('regLastName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const dob = document.getElementById('regDob').value;
  const gender = document.getElementById('regGender').value;
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  const blood = document.getElementById('regBlood').value;

  if (!firstName || !lastName || !email || !password) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const user = {
    id: Date.now().toString(),
    firstName, lastName,
    email, password, dob, gender, phone,
    bloodType: blood || 'Unknown',
    allergies: '',
    conditions: '',
    address: '',
    height: '',
    createdAt: new Date().toISOString(),
  };

  DB.setUser(user);
  seedDemoData(user);
  showToast(`Welcome to SmartSlip, ${firstName}! 🎉`, 'success');
  setTimeout(() => launchApp(user), 800);
}

function demoLogin() {
  // Create a demo account
  let user = DB.getUser();
  if (!user) {
    user = {
      id: 'demo',
      firstName: 'Dharshini',
      lastName: 'Priya',
      email: 'dharshini@smartslip.app',
      password: 'demo123',
      dob: '1995-03-15',
      gender: 'Female',
      phone: '+91 98765 43210',
      bloodType: 'B+',
      allergies: 'Penicillin, Pollen',
      conditions: 'Type 2 Diabetes, Hypertension',
      address: 'Chennai, Tamil Nadu, India',
      height: '162',
      createdAt: new Date().toISOString(),
    };
    DB.setUser(user);
    seedDemoData(user);
  }
  showToast('Loading demo account...', 'success');
  setTimeout(() => launchApp(user), 500);
}

function launchApp(user) {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('appLayout').classList.remove('hidden');
  initApp(user);
}

function handleLogout() {
  if (confirm('Sign out of SmartSlip?')) {
    document.getElementById('appLayout').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    switchAuthTab('login');
    showToast('Signed out successfully', 'success');
  }
}

/* ---- Toast ---- */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
