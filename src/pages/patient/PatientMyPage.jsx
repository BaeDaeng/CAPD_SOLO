import React, { useState } from 'react';
import useAppStore from '../../store/useAppStore';
import AccountDeleteModal from '../../components/AccountDeleteModal';
import PasswordChangeModal from '../../components/PasswordChangeModal';
import { getLatestRecord, usePatientCapdRecords, usePatientMe, usePatientReservations } from '../../hooks/usePatientData';
import { getUpcomingReservation } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

export default function PatientMyPage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { user } = useAppStore();
  const { data: patient } = usePatientMe();
  const { data: records = [] } = usePatientCapdRecords();
  const { data: reservations = [] } = usePatientReservations();

  const latestRecord = getLatestRecord(records);
  const nextReservation = getUpcomingReservation(reservations);
  const doctorName = patient?.doctorName && patient.doctorName !== '-'
    ? patient.doctorName
    : nextReservation?.doctorName;
  const displayName = patient?.name || user?.name || '환자';
  const latestWeight = latestRecord?.weight;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24 animate-in fade-in duration-500 md:pb-8">
      <section className="overflow-hidden rounded-4xl border border-blue-100 bg-white shadow-sm">
        <div className="relative bg-linear-to-br from-blue-500 to-indigo-600 p-6 text-white md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>

          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/20 text-3xl font-black shadow-lg backdrop-blur-md md:h-20 md:w-20">
              {displayName.slice(0, 1)}
            </div>

            <div>
              <div className="text-sm font-black text-blue-100">PATIENT MY PAGE</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
                {displayName}님
              </h1>
              <p className="mt-2 text-sm font-medium text-blue-100">
                내 정보를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 md:p-5">
          <ProfileStat label="최근 체중" value={latestWeight ? `${latestWeight} kg` : '-'} />
          <ProfileStat label="다음 예약" value={nextReservation ? nextReservation.date : '-'} />
          <ProfileStat label="담당의사" value={doctorName ? `${doctorName} 선생님` : '-'} />
        </div>
      </section>

      <section className="rounded-4xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 font-black text-blue-600">
              i
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">내 정보</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                병원에 등록된 환자 기본 정보입니다.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition-colors hover:bg-blue-100"
          >
            비밀번호 변경
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          <InfoRow label="이름" value={displayName} />
          <InfoRow label="이메일" value={patient?.email || '-'} />
          <InfoRow label="전화번호" value={patient?.phone || '-'} />
          <InfoRow label="성별" value={patient?.sex || '-'} />
          <InfoRow label="나이" value={formatAge(patient?.age)} />
          <InfoRow label="최근 체중" value={latestWeight ? `${latestWeight} kg` : '-'} />
          <InfoRow label="최근 기록일" value={latestRecord?.date || '-'} />
          <InfoRow label="다음 예약" value={nextReservation ? `${nextReservation.date} ${nextReservation.time}` : '-'} />
        </div>
      </section>

      <section className="rounded-4xl border border-red-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-red-700">회원탈퇴</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              계정을 더 이상 사용하지 않을 경우 탈퇴할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition-colors hover:bg-red-100"
          >
            회원탈퇴
          </button>
        </div>
      </section>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={() => setIsPasswordModalOpen(false)} />
      )}

      {isDeleteModalOpen && (
        <AccountDeleteModal role="patient" onClose={() => setIsDeleteModalOpen(false)} />
      )}
    </div>
  );
}

function ProfileStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4 text-center">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-800 md:text-base">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <span className="shrink-0 font-bold text-slate-400">{label}</span>
      <span className="text-right font-black text-slate-800">{value}</span>
    </div>
  );
}
