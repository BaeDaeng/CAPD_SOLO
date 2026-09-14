import React from 'react';
import { Outlet, useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import { authApi } from '../api/apiClient';
import { usePatientMe, usePatientReservations } from '../hooks/usePatientData';

const DOCTOR_NOT_REQUIRED_PATHS = ['/patient/mypage'];

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;

  const normalizedValue = String(value).trim();
  return normalizedValue !== '' && normalizedValue !== '-' && normalizedValue !== '0';
};

export default function PatientLayout() {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: patient,
    isLoading: isPatientLoading,
  } = usePatientMe();
  const {
    data: reservations = [],
    isLoading: isReservationsLoading,
  } = usePatientReservations();
  const hasProfileDoctor = Boolean(patient?.hasAssignedDoctor) ||
    hasMeaningfulValue(patient?.doctorId) ||
    hasMeaningfulValue(patient?.doctorName);
  const hasDoctorReservation = reservations.some(reservation => (
    hasMeaningfulValue(reservation.doctorId) ||
    hasMeaningfulValue(reservation.doctorName) ||
    hasMeaningfulValue(reservation.reservationId) ||
    hasMeaningfulValue(reservation.id)
  ));
  const hasAssignedDoctor = hasProfileDoctor || hasDoctorReservation;
  const isDoctorStatusLoading = isPatientLoading || isReservationsLoading;
  const isDoctorNotRequiredPage = DOCTOR_NOT_REQUIRED_PATHS.includes(location.pathname);
  const canUseCurrentPage = (
    isDoctorNotRequiredPage ||
    isDoctorStatusLoading ||
    hasAssignedDoctor
  );

  const handleLogout = async () => {
    try {
      await authApi.logoutPatient();
    } catch {
      // 서버 세션 종료에 실패해도 클라이언트 세션은 정리합니다.
    }
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/patient', label: '홈 대시보드', exact: true, bgColor: '#eff6ff',icon: ( <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> </svg>)},
    { path: '/patient/record', label: '투석 기록하기', bgColor: '#eff6ff', icon: ( <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /> </svg>) },
    { path: '/patient/chat', label: '증상 상담하기', bgColor: '#faf5ff',icon: ( <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /> </svg>) },
    { path: '/patient/record_list', label: '투석 기록보기', bgColor: '#eef2ff',icon: ( <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /> </svg>) },
    { path: '/patient/survey', label: '건강 설문 조사', bgColor: '#ecfdf5',icon: ( <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> </svg>) },
    { path: '/patient/schedule', label: '방문 일정 확인', bgColor: '#fff7ed',icon: ( <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /> </svg>) },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-50 font-sans text-gray-900 overflow-hidden relative pb-16 md:pb-0">
      
      {/* 상단 헤더 */}
      <header className="h-16 bg-white border-b border-gray-200 px-2 sm:px-4 md:px-6 flex justify-between items-center z-30 shrink-0 shadow-sm">
        <Link to="/patient" className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 group">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-lg md:text-xl shadow-md group-hover:scale-105 transition-transform">
            C
          </div>
          <div className="min-w-0 truncate text-base font-bold tracking-tight text-gray-800 sm:text-lg md:text-xl">
            CAPD <span className="hidden sm:inline">Care</span>
            <span className="hidden md:inline font-medium text-blue-600 text-base ml-1">환자 포털</span>
          </div>
        </Link>
        
        <div className="-ml-1 flex shrink-0 items-center gap-1 sm:gap-2 md:gap-5">
          <div className="flex max-w-22 items-center gap-1 rounded-full border border-gray-100 bg-slate-50 px-1.5 py-1.5 sm:max-w-none sm:gap-1.5 sm:px-2.5 md:gap-2 md:px-3">
            <span className="text-sm md:text-lg">😊</span>
            <span className="truncate text-[11px] font-semibold text-slate-700 sm:text-xs md:text-sm">{user?.name || '김환자'}님</span>
          </div>
          <div className="h-4 md:h-5 w-px bg-gray-300"></div>

          <button
            type="button"
            onClick={() => navigate('/patient/mypage')}
            className="flex items-center gap-0.5 rounded-full border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs md:text-sm font-bold text-blue-600 shadow-sm transition-all hover:bg-blue-100 hover:text-blue-700 active:scale-95 sm:gap-1.5 sm:px-3"
          >
            <span className="text-sm">👤</span>
            내정보
          </button>
          <div className="h-4 md:h-5 w-px bg-gray-300"></div>
          
          <button 
            onClick={handleLogout} 
            className="whitespace-nowrap text-xs md:text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 바디 */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PC : 좌측 사이드바 */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 py-6 z-20 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.05)]">
          <div className="px-6 mb-6">
            <div className="text-xs font-bold text-blue-500 tracking-wider mb-1">QUICK MENU</div>
            <h2 className="text-lg font-black text-gray-800">바로가기</h2>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                style={({ isActive }) => ({
                  backgroundColor: isActive ? item.bgColor : 'transparent',
                  borderColor: isActive ? item.bgColor : 'transparent',
                })}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all duration-200 border text-gray-900 ${
                    isActive
                      ? 'shadow-md transform scale-[1.02]'
                      : 'border-transparent hover:bg-gray-50 hover:border-gray-200 shadow-sm'
                  }`
                }
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        
        {/* 우측 메인 콘텐츠 영역 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full">
          <div className="max-w-5xl mx-auto h-full">
            {canUseCurrentPage ? <Outlet /> : <PatientDoctorRequiredNotice />}
          </div>
        </main>
        
      </div>

      {/* 모바일 환경 : 하단 바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] px-2 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-gray-900 hover:bg-slate-50"
          >
            {({ isActive }) => (
              <>
                {/* 비활성화 시 투명도를 조절하여 구분되게 함 */}
                <span className={`text-2xl transition-all ${isActive ? 'scale-110 drop-shadow-sm opacity-100' : 'opacity-70'}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-bold transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

    </div>
  );
}

function PatientDoctorRequiredNotice() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full items-center justify-center py-10 animate-in fade-in duration-300">
      <section className="w-full max-w-xl rounded-4xl border border-blue-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl font-black text-blue-600">
          i
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-900">
          담당의사가 아직 없습니다
        </h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-slate-500">
          담당의사가 등록되면 이 기능을 사용할 수 있습니다.
        </p>

        <button
          type="button"
          onClick={() => navigate('/patient')}
          className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          홈으로 돌아가기
        </button>
      </section>
    </div>
  );
}
