/* ============================================================
   SMARTSLIP - AI Voice Assistant Module
   ============================================================ */

let isListening = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let chatInitialized = false;

/* ---- INIT SPEECH RECOGNITION ---- */
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.lang = 'en-US';
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (e) => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join('');
    
    if (e.results[e.results.length - 1].isFinal) {
      handleVoiceCommand(transcript);
    } else {
      showVoiceBubble(`🎙️ "${transcript}"...`);
    }
  };

  rec.onend = () => {
    isListening = false;
    document.getElementById('voiceBtn')?.classList.remove('listening');
  };

  rec.onerror = (e) => {
    isListening = false;
    document.getElementById('voiceBtn')?.classList.remove('listening');
    if (e.error !== 'aborted') {
      showVoiceBubble('Could not hear you. Try again.');
    }
  };

  return rec;
}

/* ---- TOGGLE VOICE ---- */
function toggleVoice() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showVoiceBubble('Voice recognition is not supported in this browser. Try Chrome or Edge.');
    return;
  }

  if (!recognition) recognition = initSpeechRecognition();

  try {
    recognition.start();
    isListening = true;
    document.getElementById('voiceBtn')?.classList.add('listening');
    showVoiceBubble('🎙️ Listening... Ask me anything about your health!');
  } catch (e) {
    showVoiceBubble('Could not start voice recognition. Please try again.');
  }
}

function stopListening() {
  if (recognition) recognition.stop();
  isListening = false;
  document.getElementById('voiceBtn')?.classList.remove('listening');
}

/* ---- HANDLE VOICE COMMAND ---- */
function handleVoiceCommand(text) {
  const lower = text.toLowerCase();
  document.getElementById('voiceBtn')?.classList.remove('listening');
  
  showVoiceBubble(`You said: "${text}"\n\nProcessing...`);
  
  setTimeout(() => {
    const response = generateResponse(lower);
    showVoiceBubble(response);
    speak(response);

    // Also navigate if needed
    if (lower.includes('prescri') || lower.includes('medicat')) showPage('prescriptions');
    else if (lower.includes('appointment')) showPage('appointments');
    else if (lower.includes('reminder')) showPage('reminders');
    else if (lower.includes('record') || lower.includes('report')) showPage('records');
    else if (lower.includes('emergency')) showPage('emergency');
    else if (lower.includes('vital') || lower.includes('blood pressure') || lower.includes('heart rate')) showPage('vitals');
    else if (lower.includes('qr') || lower.includes('scan')) showPage('qrcode');
  }, 400);
}

/* ---- GENERATE AI RESPONSE ---- */
function generateResponse(query) {
  const user = DB.getUser();
  const rxs = DB.getPrescriptions();
  const reminders = DB.getReminders();
  const appts = DB.getAppointments();
  const vitals = DB.getLatestVitals();
  const emergency = DB.getEmergency();
  const today = new Date().toISOString().split('T')[0];
  const name = user ? user.firstName : 'there';

  // Blood type
  if (query.includes('blood type') || query.includes('blood group')) {
    return `Your blood type is ${user?.bloodType || 'not set yet'}. You can update this in your profile.`;
  }

  // Medications / prescriptions
  if (query.includes('medicat') || query.includes('prescri') || query.includes('taking')) {
    const active = rxs.filter(r => !r.end || r.end >= today);
    if (!active.length) return `You have no active medications recorded, ${name}.`;
    const list = active.map(r => `${r.name} ${r.dosage} (${r.frequency})`).join(', ');
    return `${name}, you are currently taking: ${list}.`;
  }

  // Today's medications
  if (query.includes('today') && (query.includes('med') || query.includes('pill') || query.includes('tablet'))) {
    if (!reminders.length) return `No medication reminders set for today, ${name}.`;
    const pending = reminders.filter(r => !r.takenToday);
    if (!pending.length) return `Great job, ${name}! You've taken all your medications today! ✅`;
    return `${name}, you still need to take: ${pending.map(r => `${r.med} at ${r.time}`).join(', ')}.`;
  }

  // Appointments
  if (query.includes('appointment') || query.includes('doctor') || query.includes('next visit')) {
    const upcoming = appts.filter(a => a.date >= today);
    if (!upcoming.length) return `No upcoming appointments scheduled, ${name}.`;
    const next = upcoming[0];
    return `Your next appointment is with ${next.doctor} (${next.spec}) on ${formatDate(next.date)} at ${next.time} at ${next.hospital}.`;
  }

  // Vitals
  if (query.includes('vital') || query.includes('blood pressure') || query.includes('heart rate') || query.includes('temperature')) {
    if (!vitals) return `No vitals recorded yet, ${name}. Would you like to add your vitals?`;
    return `Your latest vitals: Blood Pressure ${vitals.bp || 'N/A'}, Heart Rate ${vitals.hr || 'N/A'} bpm, Temperature ${vitals.temp || 'N/A'}°F, SpO2 ${vitals.spo2 || 'N/A'}%, Blood Sugar ${vitals.sugar || 'N/A'} mg/dL.`;
  }

  // Allergies
  if (query.includes('allerg')) {
    const allergies = user?.allergies;
    if (!allergies) return `No allergies recorded in your profile, ${name}.`;
    return `${name}, you have recorded the following allergies: ${allergies}.`;
  }

  // Emergency contacts
  if (query.includes('emergency') || query.includes('contact')) {
    if (!emergency.length) return `No emergency contacts saved yet, ${name}.`;
    return `Your emergency contact is ${emergency[0].name} (${emergency[0].rel}) at ${emergency[0].phone}.`;
  }

  // Health records
  if (query.includes('record') || query.includes('report') || query.includes('document')) {
    const count = DB.getRecords().length;
    return `You have ${count} health record${count !== 1 ? 's' : ''} stored in SmartSlip.`;
  }

  // Weight / BMI
  if (query.includes('weight') || query.includes('bmi')) {
    if (!vitals?.weight) return `No weight recorded yet, ${name}.`;
    return `Your last recorded weight is ${vitals.weight} kg.`;
  }

  // Hello / Hi
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    const h = new Date().getHours();
    const gr = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `${gr}, ${name}! I'm your SmartSlip health assistant. How can I help you today?`;
  }

  // Help
  if (query.includes('help') || query.includes('what can you')) {
    return `I can help you with: checking your medications, upcoming appointments, vitals, allergies, emergency contacts, and health records. Just ask!`;
  }

  // Reminder pending
  if (query.includes('reminder') || query.includes('missed')) {
    const pending = reminders.filter(r => !r.takenToday);
    if (!pending.length) return `You have no pending reminders, ${name}. All medications taken! ✅`;
    return `You have ${pending.length} pending reminder${pending.length > 1 ? 's' : ''}: ${pending.map(r => r.med).join(', ')}.`;
  }

  // Default
  return `I'm here to help with your health data, ${name}. Try asking about your medications, appointments, vitals, or allergies!`;
}

/* ---- SPEAK ---- */
function speak(text) {
  if (!synthesis) return;
  synthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.volume = 1.0;

  // Prefer a natural-sounding voice
  const voices = synthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') && v.lang === 'en-US')
    || voices.find(v => v.lang === 'en-US')
    || voices[0];
  if (preferred) utter.voice = preferred;

  synthesis.speak(utter);
}

/* ---- SHOW VOICE BUBBLE ---- */
function showVoiceBubble(msg) {
  const bubble = document.getElementById('voiceBubble');
  if (!bubble) return;
  bubble.textContent = msg;
  bubble.classList.add('show');
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(() => bubble.classList.remove('show'), 6000);
}

/* ---- CHAT INTERFACE ---- */
function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;

  const el = document.getElementById('chatMessages');
  if (!el) return;

  const user = DB.getUser();
  addChatMessage('bot', `👋 Hello${user ? ' ' + user.firstName : ''}! I'm your SmartSlip AI Health Assistant.\n\nI can answer questions about your:\n• Medications & prescriptions\n• Upcoming appointments\n• Health vitals\n• Allergies & conditions\n• Emergency contacts\n• Medicine reminders\n\nTry clicking a quick question on the right, or type your question below!`);
}

function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  addChatMessage('user', msg);
  input.value = '';

  // Show typing indicator
  const typingId = 'typing_' + Date.now();
  addChatMessage('bot', '...', typingId);

  setTimeout(() => {
    const response = generateResponse(msg.toLowerCase());
    updateChatMessage(typingId, response);
  }, 600);
}

function askQuestion(q) {
  const input = document.getElementById('chatInput');
  if (input) input.value = q;
  sendChatMessage();
  // Also navigate to assistant if not there
  if (currentPage !== 'assistant') {
    showPage('assistant');
    setTimeout(() => {
      const inp = document.getElementById('chatInput');
      if (inp) inp.value = q;
      sendChatMessage();
    }, 300);
  }
}

function addChatMessage(role, text, id) {
  const el = document.getElementById('chatMessages');
  if (!el) return;

  const div = document.createElement('div');
  div.style.cssText = `display:flex;gap:10px;align-items:flex-end;${role === 'user' ? 'flex-direction:row-reverse;' : ''}`;
  if (id) div.id = id;

  const avatar = document.createElement('div');
  avatar.style.cssText = `width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;${role === 'user' ? 'background:linear-gradient(135deg,#2563eb,#8b5cf6);' : 'background:linear-gradient(135deg,#10b981,#059669);'}`;
  avatar.textContent = role === 'user' ? '👤' : '🤖';

  const bubble = document.createElement('div');
  bubble.style.cssText = `max-width:75%;padding:12px 16px;border-radius:${role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px'};font-size:0.88rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;${role === 'user' ? 'background:linear-gradient(135deg,#2563eb,#8b5cf6);color:white;' : 'background:#f1f5f9;color:var(--text-primary);'}`;
  bubble.textContent = text;

  div.appendChild(avatar);
  div.appendChild(bubble);
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function updateChatMessage(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const bubble = el.querySelector('div:nth-child(2)');
  if (bubble) bubble.textContent = text;
  document.getElementById('chatMessages')?.scrollTo({ top: 999999, behavior: 'smooth' });
}

/* ---- VOICE IN CHAT ---- */
function toggleVoiceChat() {
  const btn = document.getElementById('voiceChatBtn');

  if (isListening) {
    stopListening();
    if (btn) btn.style.background = '';
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Voice recognition not supported in this browser', 'warning');
    return;
  }

  if (!recognition) recognition = initSpeechRecognition();

  // Override handler to put result in chat
  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    if (e.results[e.results.length - 1].isFinal) {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) chatInput.value = transcript;
      sendChatMessage();
      if (btn) btn.style.background = '';
    }
  };

  recognition.onend = () => {
    isListening = false;
    if (btn) btn.style.background = '';
  };

  try {
    recognition.start();
    isListening = true;
    if (btn) btn.style.background = 'linear-gradient(135deg,#ef4444,#f97316)';
    showToast('🎙️ Listening... speak your question', 'info');
  } catch (e) {
    console.error(e);
  }
}
