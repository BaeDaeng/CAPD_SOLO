const withPathParams = (path, params = {}) => (
  Object.entries(params).reduce(
    (resolvedPath, [key, value]) => resolvedPath.replace(`{${key}}`, encodeURIComponent(value)),
    path,
  )
);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.capd.site';

export const ENDPOINTS = {
  auth: {
    patientTokens: '/api/auths/patients/tokens',
    patientTokenRefresh: '/api/auths/patients/tokens/refresh',
    doctorTokens: '/api/auths/doctors/tokens',
    doctorTokenRefresh: '/api/auths/doctors/tokens/refresh',
  },
  users: {
    password: '/api/users/password',
    passwordReset: '/api/users/password/reset',
    emailVerification: '/api/users/email/verification',
    emailVerify: '/api/users/email/verify',
  },
  patients: {
    root: '/api/patients',
    me: '/api/patients/me',
  },
  doctors: {
    root: '/api/doctors',
    me: '/api/doctors/me',
    patients: '/api/doctors/patients',
    patientById: (patientId) => withPathParams('/api/doctors/patients/{patientId}', { patientId }),
    patientByPhone: '/api/doctors/patients/phone',
    patientsByName: '/api/doctors/patients/name',
  },
  capds: {
    root: '/api/capds',
    byId: (capdId) => withPathParams('/api/capds/{capdId}', { capdId }),
    byDate: '/api/capds/date',
    temp: '/api/capds/temp',
    submit: '/api/capds/submit',
    sessions: '/api/capds/sessions',
    sessionById: (sessionId) => withPathParams('/api/capds/sessions/{sessionId}', { sessionId }),
    doctorAll: (patientId) => withPathParams('/api/capds/doctor/{patientId}', { patientId }),
    doctorById: (patientId, capdId) => withPathParams('/api/capds/doctor/{patientId}/{capdId}', { patientId, capdId }),
    doctorByDate: (patientId) => withPathParams('/api/capds/doctor/{patientId}/date', { patientId }),
  },
  reservations: {
    root: '/api/reservations',
    patient: '/api/reservations/patient',
    doctorByDate: '/api/reservations/doctor/date',
    byId: (reservationId) => withPathParams('/api/reservations/{reservationId}', { reservationId }),
  },
  surveys: {
    doctorQuestions: (reservationId) => withPathParams('/api/surveys/{reservationId}/questions', { reservationId }),
    doctorManualQuestions: (reservationId) => withPathParams('/api/surveys/{reservationId}/questions/manual', { reservationId }),
    patientQuestions: (reservationId) => withPathParams('/api/surveys/{reservationId}/patient/questions', { reservationId }),
    answers: (reservationId) => withPathParams('/api/surveys/{reservationId}/answers', { reservationId }),
    patientAnswers: (reservationId) => withPathParams('/api/surveys/{reservationId}/patient/answers', { reservationId }),
    patientAnswer: (answerId) => withPathParams('/api/surveys/answers/{answerId}/patient', { answerId }),
    explain: (questionId) => withPathParams('/api/surveys/questions/{questionId}/explain', { questionId }),
    approve: (questionId) => withPathParams('/api/surveys/questions/{questionId}/approve', { questionId }),
    reject: (questionId) => withPathParams('/api/surveys/questions/{questionId}/reject', { questionId }),
    reset: (questionId) => withPathParams('/api/surveys/questions/{questionId}/reset', { questionId }),
  },
  chat: {
    patient: '/api/chat/patient',
    doctor: '/api/chat/doctor',
    doctorPatient: (patientId) => withPathParams('/api/chat/doctor/{patientId}', { patientId }),
  },
  reports: {
    patient: (patientId) => withPathParams('/api/reports/{patientId}', { patientId }),
    pdf: (reportId) => withPathParams('/api/reports/{reportId}/pdf', { reportId }),
  },
  anomaly: {
    patient: (patientId) => withPathParams('/api/anomaly/{patientId}', { patientId }),
    analyze: (patientId) => withPathParams('/api/anomaly/{patientId}/analyze', { patientId }),
  },
};

export default ENDPOINTS;
