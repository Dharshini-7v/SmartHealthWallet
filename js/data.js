/* ============================================================
   SMARTSLIP - Data Layer (localStorage persistence)
   ============================================================ */

const DB = {
  // Keys
  KEYS: {
    USER: 'ss_user',
    RECORDS: 'ss_records',
    PRESCRIPTIONS: 'ss_prescriptions',
    APPOINTMENTS: 'ss_appointments',
    REMINDERS: 'ss_reminders',
    EMERGENCY: 'ss_emergency',
    VITALS: 'ss_vitals',
    SETTINGS: 'ss_settings',
  },

  // Generic get/set
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  },

  // User
  getUser() { return this.get(this.KEYS.USER); },
  setUser(u) { this.set(this.KEYS.USER, u); },

  // Records
  getRecords() { return this.get(this.KEYS.RECORDS) || []; },
  addRecord(r) {
    const arr = this.getRecords();
    r.id = Date.now().toString();
    r.createdAt = new Date().toISOString();
    arr.unshift(r);
    this.set(this.KEYS.RECORDS, arr);
    return r;
  },
  deleteRecord(id) {
    this.set(this.KEYS.RECORDS, this.getRecords().filter(r => r.id !== id));
  },

  // Prescriptions
  getPrescriptions() { return this.get(this.KEYS.PRESCRIPTIONS) || []; },
  addPrescription(p) {
    const arr = this.getPrescriptions();
    p.id = Date.now().toString();
    p.createdAt = new Date().toISOString();
    arr.unshift(p);
    this.set(this.KEYS.PRESCRIPTIONS, arr);
    return p;
  },
  deletePrescription(id) {
    this.set(this.KEYS.PRESCRIPTIONS, this.getPrescriptions().filter(p => p.id !== id));
  },

  // Appointments
  getAppointments() { return this.get(this.KEYS.APPOINTMENTS) || []; },
  addAppointment(a) {
    const arr = this.getAppointments();
    a.id = Date.now().toString();
    a.createdAt = new Date().toISOString();
    arr.push(a);
    // Sort by date
    arr.sort((x, y) => new Date(x.date) - new Date(y.date));
    this.set(this.KEYS.APPOINTMENTS, arr);
    return a;
  },
  deleteAppointment(id) {
    this.set(this.KEYS.APPOINTMENTS, this.getAppointments().filter(a => a.id !== id));
  },

  // Reminders
  getReminders() { return this.get(this.KEYS.REMINDERS) || []; },
  addReminder(r) {
    const arr = this.getReminders();
    r.id = Date.now().toString();
    r.createdAt = new Date().toISOString();
    arr.push(r);
    this.set(this.KEYS.REMINDERS, arr);
    return r;
  },
  deleteReminder(id) {
    this.set(this.KEYS.REMINDERS, this.getReminders().filter(r => r.id !== id));
  },
  toggleReminderTaken(id) {
    const arr = this.getReminders();
    const r = arr.find(x => x.id === id);
    if (r) r.takenToday = !r.takenToday;
    this.set(this.KEYS.REMINDERS, arr);
    return r;
  },

  // Emergency contacts
  getEmergency() { return this.get(this.KEYS.EMERGENCY) || []; },
  addEmergency(e) {
    const arr = this.getEmergency();
    e.id = Date.now().toString();
    arr.push(e);
    this.set(this.KEYS.EMERGENCY, arr);
    return e;
  },
  deleteEmergency(id) {
    this.set(this.KEYS.EMERGENCY, this.getEmergency().filter(e => e.id !== id));
  },

  // Vitals
  getVitals() { return this.get(this.KEYS.VITALS) || []; },
  getLatestVitals() {
    const v = this.getVitals();
    return v.length ? v[v.length - 1] : null;
  },
  addVitals(v) {
    const arr = this.getVitals();
    v.id = Date.now().toString();
    v.date = new Date().toISOString();
    arr.push(v);
    this.set(this.KEYS.VITALS, arr);
    return v;
  },

  // Settings
  getSettings() {
    return this.get(this.KEYS.SETTINGS) || {
      notifMedReminder: true,
      notifAppointment: true,
      notifHealthTip: false,
      notifEmergency: true,
      reminderSound: true,
    };
  },
  saveSettings(s) { this.set(this.KEYS.SETTINGS, s); },

  // Clear all
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};

/* ---- Demo data seeder ---- */
function seedDemoData(user) {
  // Prescriptions
  const rxs = [
    { name:'Metformin', dosage:'500mg', frequency:'Twice daily', start:'2025-01-01', end:'2025-06-30', doctor:'Dr. Patel', instructions:'Take with meals' },
    { name:'Lisinopril', dosage:'10mg', frequency:'Once daily', start:'2025-01-15', end:'2025-12-31', doctor:'Dr. Williams', instructions:'Take in the morning' },
    { name:'Atorvastatin', dosage:'20mg', frequency:'Once daily', start:'2024-11-01', end:'2025-11-01', doctor:'Dr. Patel', instructions:'Take at night' },
  ];
  rxs.forEach(r => DB.addPrescription(r));

  // Reminders
  const rems = [
    { med:'Metformin', dose:'500mg', time:'08:00', freq:'daily', color:'#2563eb', takenToday:false },
    { med:'Lisinopril', dose:'10mg', time:'09:00', freq:'daily', color:'#10b981', takenToday:false },
    { med:'Atorvastatin', dose:'20mg', time:'21:00', freq:'daily', color:'#8b5cf6', takenToday:false },
  ];
  rems.forEach(r => DB.addReminder(r));

  // Appointments
  const today = new Date();
  const future1 = new Date(today); future1.setDate(today.getDate() + 7);
  const future2 = new Date(today); future2.setDate(today.getDate() + 21);
  const past1 = new Date(today); past1.setDate(today.getDate() - 14);
  const appts = [
    { doctor:'Dr. Ananya Patel', spec:'Cardiologist', date:future1.toISOString().split('T')[0], time:'10:30', hospital:'Apollo Hospital', notes:'Routine cardiac checkup' },
    { doctor:'Dr. Rahul Mehta', spec:'General Physician', date:future2.toISOString().split('T')[0], time:'14:00', hospital:'City Clinic', notes:'Annual health checkup' },
    { doctor:'Dr. Priya Nair', spec:'Dermatologist', date:past1.toISOString().split('T')[0], time:'11:00', hospital:'Skin Care Center', notes:'Skin allergy follow-up' },
  ];
  appts.forEach(a => DB.addAppointment(a));

  // Vitals
  DB.addVitals({ bp:'118/76', hr:'72', temp:'98.4', spo2:'98', sugar:'88', weight:'68' });

  // Emergency contacts
  const contacts = [
    { name:'Priya Sharma', rel:'Spouse', phone:'+91 98765 43210', email:'priya@email.com', color:'#2563eb' },
    { name:'Ramesh Sharma', rel:'Parent', phone:'+91 87654 32109', email:'ramesh@email.com', color:'#10b981' },
    { name:'Dr. Ananya Patel', rel:'Doctor', phone:'+91 76543 21098', email:'dr.patel@hospital.com', color:'#ef4444' },
  ];
  contacts.forEach(c => DB.addEmergency(c));

  // Records
  const records = [
    { type:'lab', name:'Complete Blood Count (CBC)', date:'2025-10-15', doctor:'Dr. Patel / Apollo Lab', notes:'All values within normal range', fileName:'CBC_Oct2025.pdf', fileType:'pdf' },
    { type:'report', name:'Echocardiogram Report', date:'2025-09-20', doctor:'Dr. Williams / Heart Center', notes:'Normal LV function, EF 60%', fileName:'Echo_Sep2025.pdf', fileType:'pdf' },
    { type:'prescription', name:'Prescription - Nov 2025', date:'2025-11-01', doctor:'Dr. Patel', notes:'Monthly prescription renewal', fileName:'Rx_Nov2025.pdf', fileType:'pdf' },
  ];
  records.forEach(r => DB.addRecord(r));
}
