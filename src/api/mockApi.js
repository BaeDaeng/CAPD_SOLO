const SESSION_KEY = 'capd_auth_session';
const OVERRIDES_KEY = 'capd_mock_record_overrides';
const PASSWORD = 'c*123456789';

const PATIENT_NAMES = ['김하늘', '이준서', '박서연', '최민준', '정다은', '윤지후', '한유진', '서지민', '강도윤', '임수아'];
let seedPromise;

const toPatientId = (sourceId = '') => String(sourceId).replace('_', '');
const csvRows = (text) => {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(',');
  return lines.map(line => Object.fromEntries(keys.map((key, index) => [key, line.split(',')[index] ?? ''])));
};

const getSession = () => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
};
const getOverrides = () => {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}'); } catch { return {}; }
};
const saveOverrides = (value) => localStorage.setItem(OVERRIDES_KEY, JSON.stringify(value));
const createError = (message, status = 400) => Object.assign(new Error(message), { status });
const number = (value) => Number(value || 0);

async function loadSeed() {
  if (seedPromise) return seedPromise;
  seedPromise = Promise.all([
    fetch('/mock-data/patients_index.json').then(response => response.json()),
    fetch('/mock-data/daily_records.csv').then(response => response.text()),
    fetch('/mock-data/exchange_sessions.csv').then(response => response.text()),
  ]).then(([patientIndex, dailyCsv, sessionCsv]) => {
    const patients = patientIndex.patients.map((item, index) => ({
      patientId: toPatientId(item.patient_id), userId: `user-${toPatientId(item.patient_id)}`,
      name: PATIENT_NAMES[index], email: toPatientId(item.patient_id), phone: `010-${String(1000 + index).slice(-4)}-${String(2000 + index).slice(-4)}`,
      sex: item.sex, age: item.age, doctorId: 'doctor-123456', doctorName: '담당 의사',
    }));
    const sessionsByRecord = new Map();
    csvRows(sessionCsv).forEach(row => {
      const patientId = toPatientId(row.patient_id);
      const key = `${patientId}:${row.date}`;
      const list = sessionsByRecord.get(key) || [];
      list.push({
        capdSessionId: `session-${patientId}-${row.date}-${row.session_number}`,
        sessionNumber: number(row.session_number), exchangeTime: row.exchange_time,
        dialysateConcentration: number(row.dialysate_concentration_percent),
        infusedFluidWeight: number(row.infused_fluid_weight_g), drainVolume: number(row.drain_volume_g),
        ultrafiltration: number(row.ultrafiltration_g),
      });
      sessionsByRecord.set(key, list);
    });
    const records = csvRows(dailyCsv).map(row => {
      const patientId = toPatientId(row.patient_id);
      return {
        capdId: `capd-${patientId}-${row.date}`, patientId, date: row.date, status: 'SUBMITTED',
        cloudyDialysate: row.cloudy_dialysate === '1', urinationCount: number(row.urination_count),
        totalUltrafiltration: number(row.total_ultrafiltration_g), bodyWeight: number(row.body_weight_kg),
        bloodPressureSys: number(row.systolic_bp_mmhg), bloodPressureDia: number(row.diastolic_bp_mmhg),
        fastingBloodSugar: number(row.fasting_blood_sugar_mg_dl), note: row.active_event_types || '',
        sessions: sessionsByRecord.get(`${patientId}:${row.date}`) || [],
      };
    });
    return { patients, records };
  });
  return seedPromise;
}

const currentUser = async () => {
  const session = getSession();
  if (!session?.user) throw createError('로그인이 필요합니다.', 401);
  return session.user;
};
const recordForPayload = (payload, patientId, existing = {}) => {
  const date = payload.date || existing.date;
  const sessions = (payload.sessions || existing.sessions || []).map((item, index) => ({
    capdSessionId: item.capdSessionId || `session-${patientId}-${date}-${item.sessionNumber ?? index + 1}`,
    sessionNumber: item.sessionNumber ?? index + 1, exchangeTime: item.exchangeTime || '00:00',
    dialysateConcentration: number(item.dialysateConcentration), infusedFluidWeight: number(item.infusedFluidWeight),
    drainVolume: number(item.drainVolume), ultrafiltration: number(item.drainVolume) - number(item.infusedFluidWeight),
  }));
  return { ...existing, ...payload, capdId: existing.capdId || `capd-${patientId}-${date}`, patientId, date,
    totalUltrafiltration: sessions.reduce((sum, item) => sum + item.ultrafiltration, 0), sessions };
};
const allRecords = async (patientId) => {
  const seed = await loadSeed();
  const overrides = getOverrides();
  const base = seed.records.filter(item => item.patientId === patientId).map(item => overrides[item.capdId] || item);
  const additions = Object.values(overrides).filter(item => item.patientId === patientId && !seed.records.some(seedItem => seedItem.capdId === item.capdId));
  return [...base, ...additions].filter(Boolean);
};
const saveRecord = (record) => { const values = getOverrides(); values[record.capdId] = record; saveOverrides(values); return record; };

export async function mockApiRequest(config) {
  const { method = 'get', url, data = {}, params = {} } = config;
  const normalizedMethod = method.toLowerCase();

  if (url === '/api/auths/patients/tokens' && normalizedMethod === 'post') {
    const seed = await loadSeed();
    const patient = seed.patients.find(item => item.patientId === String(data.email).trim());
    if (!patient || data.password !== PASSWORD) throw createError('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
    return { accessToken: `mock-patient-${patient.patientId}`, expiresAt: Date.now() + 86400000, ...patient };
  }
  if (url === '/api/auths/doctors/tokens' && normalizedMethod === 'post') {
    if (String(data.licenseId).trim() !== '123456' || data.password !== PASSWORD) throw createError('의사번호 또는 비밀번호가 올바르지 않습니다.', 401);
    return { accessToken: 'mock-doctor-123456', expiresAt: Date.now() + 86400000, userId: 'doctor-user-123456', doctorId: 'doctor-123456', name: '담당 의사', licenseId: '123456' };
  }
  if (url.includes('/tokens') && normalizedMethod === 'delete') return null;
  if (url.includes('/tokens/refresh')) { const session = getSession(); return { accessToken: session?.accessToken || 'mock-token', expiresAt: Date.now() + 86400000 }; }

  const user = await currentUser();
  const seed = await loadSeed();
  const isDoctor = user.role === 'doctor';
  const patientId = user.patientId;

  if (url === '/api/patients/me') {
    const patient = seed.patients.find(item => item.patientId === patientId);
    if (!patient) throw createError('환자를 찾을 수 없습니다.', 404);
    return patient;
  }
  if (url === '/api/doctors/me') return { doctorId: 'doctor-123456', userId: 'doctor-user-123456', name: '담당 의사', licenseId: '123456', phone: '02-1234-5678' };
  if (url === '/api/doctors/patients' && normalizedMethod === 'get') return seed.patients;
  if (url.startsWith('/api/doctors/patients/') && !['/api/doctors/patients/phone', '/api/doctors/patients/name'].includes(url) && normalizedMethod === 'get') {
    const targetId = decodeURIComponent(url.split('/').pop());
    return seed.patients.find(item => item.patientId === targetId) || createError('환자를 찾을 수 없습니다.', 404);
  }
  if (url === '/api/doctors/patients/phone') return seed.patients.find(item => item.phone === params.phone) || createError('환자를 찾을 수 없습니다.', 404);
  if (url === '/api/doctors/patients/name') return seed.patients.filter(item => item.name.includes(params.name || ''));

  const doctorRecordMatch = url.match(/^\/api\/capds\/doctor\/([^/]+)(?:\/(.+))?$/);
  if (doctorRecordMatch) {
    const targetId = decodeURIComponent(doctorRecordMatch[1]);
    const records = await allRecords(targetId);
    if (doctorRecordMatch[2] === 'date') return records.find(item => item.date === params.date) || createError('기록이 없습니다.', 404);
    if (doctorRecordMatch[2]) return records.find(item => item.capdId === decodeURIComponent(doctorRecordMatch[2])) || createError('기록이 없습니다.', 404);
    return records;
  }
  if (url === '/api/capds' && normalizedMethod === 'get') return allRecords(patientId);
  if (url === '/api/capds/date') { const record = (await allRecords(patientId)).find(item => item.date === params.date); if (!record) throw createError('기록이 없습니다.', 404); return record; }
  if (url === '/api/capds/temp' && normalizedMethod === 'get') { const record = (await allRecords(patientId)).find(item => item.date === params.date && item.status === 'TEMP'); if (!record) throw createError('임시 기록이 없습니다.', 404); return record; }
  if ((url === '/api/capds/temp' || url === '/api/capds/submit') && normalizedMethod === 'post') {
    const old = (await allRecords(patientId)).find(item => item.date === data.date);
    if (old?.status === 'SUBMITTED' && url === '/api/capds/submit') throw createError('이미 제출된 기록입니다.', 409);
    return saveRecord({ ...recordForPayload(data, patientId, old?.status === 'TEMP' ? old : {}), status: url.endsWith('/submit') ? 'SUBMITTED' : 'TEMP' });
  }
  if (url.match(/^\/api\/capds\/[^/]+$/)) {
    const capdId = decodeURIComponent(url.split('/').pop()); const record = (await allRecords(patientId)).find(item => item.capdId === capdId);
    if (!record) throw createError('기록이 없습니다.', 404);
    if (normalizedMethod === 'get') return record;
    if (normalizedMethod === 'delete') { const values = getOverrides(); values[capdId] = null; saveOverrides(values); return null; }
    return saveRecord(recordForPayload(data, patientId, record));
  }
  if (url === '/api/capds/sessions') { const record = (await allRecords(patientId)).find(item => item.date === params.date); const session = record?.sessions.find(item => item.sessionNumber === number(params.sessionNumber)); if (!session) throw createError('교환 기록이 없습니다.', 404); return session; }
  if (url.match(/^\/api\/capds\/sessions\//)) {
    const sessionId = decodeURIComponent(url.split('/').pop()); const records = await allRecords(patientId); const record = records.find(item => item.sessions.some(session => session.capdSessionId === sessionId)); if (!record) throw createError('교환 기록이 없습니다.', 404);
    if (normalizedMethod === 'delete') { record.sessions = record.sessions.filter(session => session.capdSessionId !== sessionId); return saveRecord(recordForPayload({}, patientId, record)); }
    const session = record.sessions.find(item => item.capdSessionId === sessionId); Object.assign(session, recordForPayload({ sessions: [{ ...session, ...data }] }, patientId, record).sessions[0]); saveRecord(recordForPayload({}, patientId, record)); return session;
  }
  if (url === '/api/reservations/patient') return [];
  if (url === '/api/reservations/doctor/date') return [];
  if (url === '/api/anomaly/' + patientId) return [];
  if (url.startsWith('/api/anomaly/')) return [];
  if (url.startsWith('/api/reports/')) return [];
  if (url.startsWith('/api/chat/')) return [];
  if (url.startsWith('/api/surveys/')) return [];
  if (url.startsWith('/api/users/')) return { message: '목업 환경에서 처리되었습니다.' };
  if (isDoctor) return [];
  throw createError(`목업 API가 아직 지원하지 않는 요청입니다: ${url}`, 404);
}

export const MOCK_ACCOUNTS = { doctor: { id: '123456', password: PASSWORD }, patient: { id: 'patient001', password: PASSWORD } };
