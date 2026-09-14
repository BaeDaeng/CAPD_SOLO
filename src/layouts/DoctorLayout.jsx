import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import DoctorChatPage from '../pages/doctor/DoctorChatPage';
import { authApi } from '../api/apiClient';
import { addDays, toDateKey } from '../api/adapters';
import { formatAge } from '../utils/ageFormat';
import {
  useDoctorPatients,
  useDoctorReservationsByDate,
  useDoctorReservationsByDateRange,
} from '../hooks/usePatientData';

export default function DoctorLayout() {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [patientTab, setPatientTab] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const todayKey = toDateKey(new Date());
  const selectedDateKey = toDateKey(selectedDate);
  const monthStartKey = toDateKey(new Date(year, month, 1));
  const monthEndKey = toDateKey(new Date(year, month, daysInMonth));
  const nextReservationStartKey = todayKey;
  const nextReservationEndKey = toDateKey(addDays(todayKey, 90));
  const { data: patients = [], isLoading: isPatientsLoading } = useDoctorPatients();
  const { data: todayReservations = [], reload: reloadTodayReservations } = useDoctorReservationsByDate(todayKey);
  const {
    data: selectedDateReservations = [],
    reload: reloadSelectedDateReservations,
  } = useDoctorReservationsByDate(selectedDateKey);
  const {
    data: monthReservations = [],
    reload: reloadMonthReservations,
  } = useDoctorReservationsByDateRange(monthStartKey, monthEndKey);
  const {
    data: upcomingReservations = [],
    reload: reloadUpcomingReservations,
  } = useDoctorReservationsByDateRange(nextReservationStartKey, nextReservationEndKey);

  const selectedPatient = patients.find(patient => String(patient.id) === String(id));
  const todayPatientIds = new Set(todayReservations.map(reservation => String(reservation.patientId)));
  const scheduledPatients = [...selectedDateReservations].sort((a, b) => a.time.localeCompare(b.time));
  const appointmentDateSet = useMemo(() => (
    new Set(monthReservations.map(reservation => reservation.date).filter(Boolean))
  ), [monthReservations]);
  const nextReservationByPatientId = buildNextReservationMap(upcomingReservations, todayKey);
  const isAppointmentPage = location.pathname.startsWith('/doctor/appointments');

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  useEffect(() => {
    const handleReservationsChanged = (event) => {
      const changedDate = event.detail?.date;

      if (changedDate) {
        const nextDate = toLocalDate(changedDate);
        setSelectedDate(nextDate);
        setCurrentDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      }

      if (!changedDate || changedDate === todayKey) {
        void reloadTodayReservations().catch(() => {});
      }

      if (!changedDate || changedDate === selectedDateKey) {
        void reloadSelectedDateReservations().catch(() => {});
      }

      if (!changedDate || (changedDate >= monthStartKey && changedDate <= monthEndKey)) {
        void reloadMonthReservations().catch(() => {});
      }

      if (!changedDate || (changedDate >= nextReservationStartKey && changedDate <= nextReservationEndKey)) {
        void reloadUpcomingReservations().catch(() => {});
      }
    };

    window.addEventListener('capd:reservations-changed', handleReservationsChanged);

    return () => {
      window.removeEventListener('capd:reservations-changed', handleReservationsChanged);
    };
  }, [
    monthEndKey,
    monthStartKey,
    reloadMonthReservations,
    reloadSelectedDateReservations,
    reloadTodayReservations,
    reloadUpcomingReservations,
    selectedDateKey,
    nextReservationEndKey,
    nextReservationStartKey,
    todayKey,
  ]);

  const handleLogout = async () => {
    try {
      await authApi.logoutDoctor();
    } catch {
      // 서버 세션 종료에 실패해도 클라이언트 세션은 정리합니다.
    }

    logout();
    navigate('/login');
  };

  let displayedPatients = patientTab === 'today'
    ? patients.filter(patient => todayPatientIds.has(String(patient.id)))
    : patients;

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    const normalizedQuery = query.replace(/-/g, '');
    displayedPatients = displayedPatients.filter(patient => (
      patient.name.toLowerCase().includes(query) ||
      String(patient.age).includes(query) ||
      patient.sex.includes(query) ||
      patient.phone.replace(/-/g, '').includes(normalizedQuery)
    ));
  }

  if (sortBy === 'name') {
    displayedPatients = [...displayedPatients].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'age') {
    displayedPatients = [...displayedPatients].sort((a, b) => Number(b.age || 0) - Number(a.age || 0));
  }

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-gray-100 font-sans text-slate-900">
      <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 bg-slate-900 px-3 text-white shadow-lg sm:px-4">
        <Link to="/doctor" className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white text-xl">+</div>
          <div className="min-w-0 truncate text-base font-bold tracking-tight lg:text-lg">
            CAPD <span className="font-light text-slate-400">EMR System</span>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200">{user?.name || '담당의'} 선생님</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/doctor/mypage')}
            className="hidden sm:flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 transition-all hover:border-blue-500 hover:bg-blue-500/10 hover:text-white active:scale-95"
          >
            <span className="text-[11px]">👤</span>
            내정보
          </button>

          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded-md transition-all">
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex min-w-0 flex-1 overflow-hidden">
        <aside className="z-20 flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm xl:w-72">
          <div className="p-3 border-b space-y-3 bg-slate-50">
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button
                onClick={() => setPatientTab('all')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${patientTab === 'all' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                환자 목록
              </button>
              <button
                onClick={() => setPatientTab('today')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${patientTab === 'today' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                오늘 진료
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="이름, 나이, 성별 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-bold text-gray-400">MY PATIENT LIST</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-[11px] bg-transparent font-bold text-blue-600 cursor-pointer outline-none"
              >
                <option value="name">이름순</option>
                <option value="age">나이순</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isPatientsLoading ? (
              <div className="text-center py-6 text-xs text-gray-400 font-medium">
                담당 환자 목록을 불러오는 중입니다.
              </div>
            ) : displayedPatients.length > 0 ? (
              displayedPatients.map((patient) => {
                const nextReservation = nextReservationByPatientId.get(String(patient.id));

                return (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/doctor/${patient.id}`)}
                    className="w-full text-left p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-gray-800">{patient.name}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-xs text-gray-500">{patient.sex}/{formatAge(patient.age)}</span>
                        <span className="truncate text-[11px] font-bold text-blue-500">
                          {formatNextReservationLabel(nextReservation, todayKey)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-500">
                        담당
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-gray-400 font-medium">
                조건에 맞는 담당 환자가 없습니다.
              </div>
            )}
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 overflow-y-auto bg-slate-50">
          <Outlet />
        </main>

        <aside className={`z-10 w-56 shrink-0 flex-col border-l border-gray-200 bg-white lg:w-64 xl:w-72 2xl:w-80 ${isAppointmentPage ? 'hidden' : 'flex'}`}>
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-gray-700">{year}년 {month + 1}월</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="text-gray-400 hover:text-gray-600 px-1">◀</button>
                <button onClick={handleNextMonth} className="text-gray-400 hover:text-gray-600 px-1">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['일','월','화','수','목','금','토'].map(day => (
                <span key={day} className="text-[10px] font-bold text-gray-400 mb-2">{day}</span>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`blank-${index}`} className="h-8"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                const hasAppointment = appointmentDateSet.has(toDateKey(new Date(year, month, day)));

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`h-8 flex flex-col items-center justify-center text-[11px] rounded-md cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700'
                        : hasAppointment
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    {day}
                    {hasAppointment && (
                      <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-blue-400'}`}></span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-b bg-white">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => navigate('/doctor/appointments/new')}
                className="rounded-xl bg-blue-600 px-3 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.99]"
              >
                + 예약 등록
              </button>

              <button
                type="button"
                onClick={() => navigate('/doctor/appointments/check')}
                className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700 shadow-sm transition-all hover:bg-blue-100 active:scale-[0.99]"
              >
                예약 목록
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b flex justify-between items-center">
              <span className="text-xs font-bold text-gray-600">{selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 예약 현황</span>
              <span className="text-xs text-blue-600 font-bold">{scheduledPatients.length}건</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scheduledPatients.map((reservation) => (
                <div key={reservation.id} className="flex gap-3 items-start border-l-2 border-blue-200 pl-3 py-1">
                  <span className="text-xs font-bold w-10 mt-0.5 text-blue-500">
                    {reservation.time}
                  </span>
                  <div>
                    <button
                      onClick={() => navigate(`/doctor/${reservation.patientId}`)}
                      className="text-sm font-bold text-gray-800 hover:text-blue-600 hover:underline text-left transition-colors flex items-center gap-2"
                    >
                      {reservation.patientName} 환자
                    </button>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{reservation.phone}</div>
                  </div>
                </div>
              ))}

              {scheduledPatients.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400 font-bold">
                  선택한 날짜에 예약이 없습니다.
                </div>
              )}
            </div>
          </div>

          <DoctorChatPage currentPatient={selectedPatient} />
        </aside>
      </div>
    </div>
  );
}

function toLocalDate(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function buildNextReservationMap(reservations, todayKey) {
  const nextMap = new Map();
  const sortedReservations = [...reservations]
    .filter(reservation => reservation.date >= todayKey)
    .sort((a, b) => String(a.dateTime || a.reservationDate).localeCompare(String(b.dateTime || b.reservationDate)));

  sortedReservations.forEach((reservation) => {
    const patientId = String(reservation.patientId);

    if (!nextMap.has(patientId)) {
      nextMap.set(patientId, reservation);
    }
  });

  return nextMap;
}

function formatNextReservationLabel(reservation, todayKey) {
  if (!reservation) return '다음 예약 없음';

  const time = reservation.time || '';

  if (reservation.date === todayKey) {
    return `오늘 ${time}`;
  }

  return `${String(reservation.date).slice(5)} ${time}`;
}
