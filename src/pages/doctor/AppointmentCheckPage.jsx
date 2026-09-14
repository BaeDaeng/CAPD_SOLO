import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationApi } from '../../api/apiClient';
import { toDateKey } from '../../api/adapters';
import useAppStore from '../../store/useAppStore';
import { useDoctorReservationsByDateRange } from '../../hooks/usePatientData';

export default function AppointmentCheckPage() {
  const navigate = useNavigate();
  const { currentDoctorName } = useAppStore();
  const thisMonth = useMemo(() => getMonthStart(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const monthOptions = useMemo(() => [
    addMonths(selectedMonth, -1),
    selectedMonth,
    addMonths(selectedMonth, 1),
  ], [selectedMonth]);
  const monthStartDate = toDateKey(selectedMonth);
  const monthEndDate = toDateKey(getMonthEnd(selectedMonth));
  const {
    data: appointmentRows = [],
    isLoading,
    error,
    reload,
  } = useDoctorReservationsByDateRange(monthStartDate, monthEndDate);

  const counts = useMemo(() => {
    const today = toDateKey(new Date());

    return {
      total: appointmentRows.length,
      upcoming: appointmentRows.filter(appointment => appointment.date >= today).length,
      completed: appointmentRows.filter(appointment => appointment.date < today).length,
      canceled: 0,
    };
  }, [appointmentRows]);

  const handleSelectMonth = (monthDate) => {
    setSelectedMonth(getMonthStart(monthDate));
  };

  const handleCancelAppointment = async (appointment) => {
    const status = getReservationStatus(appointment);

    if (status.key === 'past') {
      alert('지난 예약은 취소할 수 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `${appointment.patientName} 환자의 ${appointment.date} ${appointment.time} 예약을 취소하시겠습니까?`,
    );

    if (!confirmed) return;

    try {
      await reservationApi.delete(appointment.reservationId);
      window.dispatchEvent(new CustomEvent('capd:reservations-changed'));
      alert('예약이 취소되었습니다.');
      await reload();
    } catch (cancelError) {
      alert(cancelError.message || '예약 취소에 실패했습니다.');
    }
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-50 p-4 animate-in fade-in duration-500">
      <div className="mb-3 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-black text-blue-600">APPOINTMENT LIST</div>
          <h1 className="mt-1 text-2xl font-black text-slate-900">전체 예약 내역</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {currentDoctorName || '담당의'} 선생님의 담당 환자 예약을 최신 예약일시 순으로 확인합니다.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/doctor/appointments/new')}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-blue-700"
          >
            + 예약 등록
          </button>
          <button
            type="button"
            onClick={() => navigate('/doctor')}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-500 shadow-sm hover:bg-slate-50"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>

      <section className="mb-3 grid min-w-0 shrink-0 grid-cols-2 gap-3 xl:grid-cols-12">
        <SummaryCard label="전체" value={`${counts.total}건`} tone="slate" />
        <SummaryCard label="예정" value={`${counts.upcoming}건`} tone="blue" />
        <SummaryCard label="지난 예약" value={`${counts.completed}건`} tone="emerald" />
        <SummaryCard label="취소" value={`${counts.canceled}건`} tone="rose" />

        <div className="col-span-2 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm xl:col-span-4 xl:flex-row xl:items-center xl:justify-end">
          <div className="text-left xl:text-right">
            <div className="text-xs font-black text-slate-500">
              {isLoading ? '전체 예약 조회 중' : '최신순 정렬'}
            </div>
            <div className="mt-0.5 text-[11px] font-bold text-slate-400">
              {monthStartDate} ~ {monthEndDate}
            </div>
          </div>
          <div className="flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1 xl:w-auto">
            {monthOptions.map(monthDate => (
              <button
                key={toDateKey(monthDate)}
                type="button"
                onClick={() => handleSelectMonth(monthDate)}
                disabled={isLoading}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 xl:flex-none ${
                  isSameMonth(selectedMonth, monthDate)
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:bg-white hover:text-blue-700'
                }`}
              >
                {getMonthLabel(monthDate)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => reload()}
            disabled={isLoading}
            className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </section>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900">예약 목록</h2>
            <p className="mt-0.5 text-xs font-bold text-slate-400">
              {isLoading ? '조회 중' : `전체 기준 ${appointmentRows.length}건`}
            </p>
          </div>

          <div className="text-xs font-black text-slate-400 lg:text-right">
            예약일시가 가장 늦은 항목이 상단에 표시됩니다.
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
          <table className="min-w-[760px] w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white text-[11px] font-black uppercase tracking-wider text-slate-400">
              <tr className="border-b border-slate-100">
                <th className="w-28 px-3 py-3">날짜</th>
                <th className="w-20 px-3 py-3">시간</th>
                <th className="w-36 px-3 py-3">환자</th>
                <th className="w-40 px-3 py-3">전화번호</th>
                <th className="px-3 py-3">예약 유형</th>
                <th className="w-24 px-3 py-3 text-center">상태</th>
                <th className="w-24 px-3 py-3 text-center">작업</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {appointmentRows.map((appointment) => {
                const status = getReservationStatus(appointment);

                return (
                  <tr key={appointment.id} className="h-12 transition-colors hover:bg-blue-50/40">
                    <td className="px-3 py-2 text-sm font-black text-slate-800">{appointment.date}</td>
                    <td className="px-3 py-2 font-mono text-sm font-black text-blue-700">{appointment.time}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/doctor/${appointment.patientId}`)}
                        className="truncate text-sm font-black text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {appointment.patientName} 환자
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-slate-500">
                      {appointment.phone}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-block max-w-full truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        {appointment.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-black ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appointment)}
                        disabled={status.key === 'past'}
                        title={status.key === 'past' ? '지난 예약은 취소할 수 없습니다.' : undefined}
                        className={`rounded-lg px-3 py-1.5 text-xs font-black transition-colors ${
                          status.key === 'past'
                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        }`}
                      >
                        {status.key === 'past' ? '취소 불가' : '예약 취소'}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && appointmentRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="h-80 text-center text-sm font-bold text-slate-400">
                    조회된 예약이 없습니다.
                  </td>
                </tr>
              )}

              {isLoading && appointmentRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="h-80 text-center text-sm font-bold text-slate-400">
                    전체 예약 내역을 불러오는 중입니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-col gap-1 border-t border-slate-100 bg-slate-50 px-4 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 text-xs font-bold text-slate-400">
            {error ? `예약 조회 실패: ${error.message}` : '현재 백엔드는 날짜별 예약 조회 API를 제공합니다.'}
          </div>
          <div className="min-w-0 text-xs font-bold text-slate-400 lg:text-right">
            목록 영역은 내부 스크롤로 더 많은 예약을 확인할 수 있습니다.
          </div>
        </div>
      </main>
    </div>
  );
}

function getReservationStatus(appointment) {
  if (!appointment.dateTime) {
    return {
      key: 'upcoming',
      label: '예정',
      className: 'bg-blue-100 text-blue-700',
    };
  }

  const reservationDate = new Date(appointment.dateTime);

  if (!Number.isNaN(reservationDate.getTime()) && reservationDate < new Date()) {
    return {
      key: 'past',
      label: '지난 예약',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  return {
    key: 'upcoming',
    label: '예정',
    className: 'bg-blue-100 text-blue-700',
  };
}

function getMonthStart(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(dateValue) {
  const date = getMonthStart(dateValue);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(dateValue, monthCount) {
  const date = getMonthStart(dateValue);
  return new Date(date.getFullYear(), date.getMonth() + monthCount, 1);
}

function isSameMonth(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth()
  );
}

function getMonthLabel(dateValue) {
  const date = getMonthStart(dateValue);
  return `${date.getMonth() + 1}월`;
}

function SummaryCard({ label, value, tone }) {
  const toneClass = {
    slate: 'bg-white text-slate-700 border-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
  }[tone];

  return (
    <div className={`col-span-1 rounded-2xl border px-4 py-3 shadow-sm xl:col-span-2 ${toneClass}`}>
      <div className="text-xs font-black opacity-70">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

