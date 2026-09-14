import { create } from 'zustand';
import { clearStoredSession, getStoredSession, saveStoredSession } from '../api/apiClient';

const storedSession = getStoredSession();

const makeUser = (role, data) => ({
  role,
  userId: data.userId,
  patientId: data.patientId,
  doctorId: data.doctorId,
  name: data.name,
  expiresAt: data.expiresAt,
});

const makeSession = (role, data) => ({
  role,
  accessToken: data.accessToken,
  expiresAt: data.expiresAt,
  user: makeUser(role, data),
  issuedAt: Date.now(),
});

const useAppStore = create((set) => ({
  user: storedSession?.user || null,
  session: storedSession,
  selectedPatientId: null,

  currentDoctorId: storedSession?.user?.doctorId || null,
  currentDoctorName: storedSession?.user?.role === 'doctor' ? storedSession.user.name : null,
  currentPatientId: storedSession?.user?.patientId || null,

  isAuthenticated: Boolean(storedSession?.accessToken),

  setUser: (user) => set({ user }),

  setSession: (role, data) => {
    const session = makeSession(role, data);
    saveStoredSession(session);

    set({
      session,
      user: session.user,
      isAuthenticated: true,
      currentDoctorId: session.user.doctorId || null,
      currentDoctorName: role === 'doctor' ? session.user.name : null,
      currentPatientId: session.user.patientId || null,
    });
  },

  logout: () => {
    clearStoredSession();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      selectedPatientId: null,
      currentDoctorId: null,
      currentDoctorName: null,
      currentPatientId: null,
    });
  },

  setSelectedPatientId: (id) => set({ selectedPatientId: id }),

}));

if (typeof window !== 'undefined') {
  let isAuthExpiredAlertOpen = false;

  window.addEventListener('capd:access-token-refreshed', (event) => {
    const session = event.detail;
    if (!session) return;

    // refreshToken은 쿠키에 남고, 프론트 상태는 새 accessToken만 최신 값으로 맞춥니다.
    useAppStore.setState({
      session,
      user: session.user,
      isAuthenticated: true,
    });
  });

  window.addEventListener('capd:auth-expired', (event) => {
    const state = useAppStore.getState();

    if (!state.isAuthenticated || isAuthExpiredAlertOpen) return;

    isAuthExpiredAlertOpen = true;
    window.alert(event.detail?.message || '다른 곳에서 로그인했습니다.\n확인을 누르면 로그아웃됩니다.');
    isAuthExpiredAlertOpen = false;

    useAppStore.getState().logout();
  });
}

export default useAppStore;
