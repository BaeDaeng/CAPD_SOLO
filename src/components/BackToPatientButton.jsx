import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function BackToPatientButton() {
  const navigate = useNavigate();
  // URL에서 현재 접속 중인 환자의 id를 자동으로 빼옴
  const { id } = useParams(); 

  return (
    <button
      onClick={() => navigate(`/doctor/${id}`)}
      className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors mb-6"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      대시보드로 돌아가기
    </button>
  );
}