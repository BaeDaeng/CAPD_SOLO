import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import {
  getLatestRecord,
  getUpcomingReservation,
  usePatientCapdRecords,
  usePatientMe,
  usePatientReservations,
} from '../../hooks/usePatientData';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user } = useAppStore(); 
  const { data: patient } = usePatientMe();
  const { data: reservations = [] } = usePatientReservations();
  const { data: records = [] } = usePatientCapdRecords();
  const upcomingReservation = getUpcomingReservation(reservations);
  const doctorName = patient?.doctorName && patient.doctorName !== '-'
    ? patient.doctorName
    : upcomingReservation?.doctorName;
  const latestRecord = getLatestRecord(records);
  const latestRecordSessions = latestRecord?.sessions || [];
  const latestRecordTime = latestRecordSessions[latestRecordSessions.length - 1]?.time;
  const latestRecordLabel = latestRecord
    ? [latestRecord.date, latestRecordTime].filter(Boolean).join(' ')
    : '기록 없음';
  const displayName = patient?.name || user?.name || '환자';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-4xl mx-auto">
      
      {/* 환자 맞춤형 인사이트 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight leading-snug">
            안녕하세요, <span className="text-blue-600">{displayName}</span> 님!<br />
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            담당의: {doctorName ? `${doctorName} 선생님` : '예약 정보에서 확인 가능'}
          </p>
        </div>
        
        {/* 마지막 상태 알림 */}
        <div className="flex items-center gap-3 bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-slate-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 tracking-wide">마지막 기록</span>
            <span className="text-sm font-black text-slate-700">
              {latestRecordLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 최우선 액션: 투석 기록 */}
      <button
        onClick={() => navigate('/patient/record')}
        className="w-full relative overflow-hidden bg-linear-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white p-8 md:p-10 rounded-4xl shadow-xl shadow-blue-200/50 transition-all hover:-translate-y-1 group text-left flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        {/* 배경 장식용 빛망울 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full opacity-10 blur-3xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700"></div>

        <div>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md mb-6 border border-white/20 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">투석 기록하기</h2>
          <p className="text-blue-100 font-medium text-base md:text-lg opacity-90 max-w-sm">
            오늘 하루의 투석 수치와 건강 상태를 잊지 말고 기록해 주세요.
          </p>
        </div>
        
        {/* 화살표 아이콘 */}
        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white group-hover:bg-white group-hover:text-blue-600 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </button>

      {/* 위젯형 서브 메뉴 (2x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* 챗봇 상담 */}
        <button
          onClick={() => navigate('/patient/chat')}
          className="bg-white p-7 rounded-4xl shadow-sm hover:shadow-md border border-slate-100 hover:border-purple-200 transition-all flex flex-col items-start group text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-5 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">증상 상담</h3>
          <p className="text-slate-500 font-medium">평소와 다른 증상이 있다면 AI 챗봇에게 물어보세요.</p>
        </button>

        {/* 투석 기록 보기 */}
        <button
          onClick={() => navigate('/patient/record_list')}
          className="bg-white p-7 rounded-4xl shadow-sm hover:shadow-md border border-slate-100 hover:border-indigo-200 transition-all flex flex-col items-start group text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-5 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">기록 모아보기</h3>
          <p className="text-slate-500 font-medium">이전 기록을 목록으로 확인하세요.</p>
        </button>

        {/* 건강 설문 */}
        <button
          onClick={() => navigate('/patient/survey')}
          className="bg-white p-7 rounded-4xl shadow-sm hover:shadow-md border border-slate-100 hover:border-emerald-200 transition-all flex flex-col items-start group text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-5 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">건강 설문</h3>
          <p className="text-slate-500 font-medium">방문 전 설문으로 의료진에게 상태를 알립니다.</p>
        </button>

        {/* 방문 일정 */}
        <button
          onClick={() => navigate('/patient/schedule')}
          className="bg-white p-7 rounded-4xl shadow-sm hover:shadow-md border border-slate-100 hover:border-orange-200 transition-all flex flex-col items-start group text-left"
        >
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-5 group-hover:bg-orange-500 group-hover:text-white transition-colors">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">방문 일정</h3>
          <p className="text-slate-500 font-medium">다음 병원 방문 일정을 확인하세요.</p>
        </button>

      </div>
    </div>
  );
}
