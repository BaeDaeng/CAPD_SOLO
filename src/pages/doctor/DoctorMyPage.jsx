import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import AccountDeleteModal from '../../components/AccountDeleteModal';
import PasswordChangeModal from '../../components/PasswordChangeModal';
import { useDoctorMe, useDoctorPatientProfiles, useDoctorPatients } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

export default function DoctorMyPage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { data: doctor } = useDoctorMe();
  const { data: assignedPatients = [] } = useDoctorPatients();
  const visibleAssignedPatients = useMemo(() => assignedPatients.slice(0, 9), [assignedPatients]);
  const visiblePatientIds = useMemo(() => (
    visibleAssignedPatients.map(patient => patient.id).filter(Boolean)
  ), [visibleAssignedPatients]);
  const { data: patientProfiles = [], isLoading: isPatientProfilesLoading } = useDoctorPatientProfiles(visiblePatientIds);
  const patientProfileMap = useMemo(() => (
    new Map(patientProfiles.map(patient => [String(patient.id), patient]))
  ), [patientProfiles]);
  const enrichedAssignedPatients = useMemo(() => (
    visibleAssignedPatients.map((patient) => mergePatientProfile(
      patient,
      patientProfileMap.get(String(patient.id)),
    ))
  ), [patientProfileMap, visibleAssignedPatients]);
  const displayName = doctor?.name || user?.name || '담당의';

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="grid min-h-full grid-cols-12 gap-4">
        <section className="col-span-12 flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white shadow-sm xl:col-span-4">
          <div className="relative p-6">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl"></div>

            <div className="relative">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-3xl font-black shadow-lg">
                {displayName.slice(0, 1)}
              </div>

              <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">
                Doctor My Page
              </div>
              <h1 className="mt-1 text-3xl font-black tracking-tight">
                {displayName} 선생님
              </h1>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                진료 계정 정보와 담당 환자 현황을 확인합니다.
              </p>
            </div>
          </div>

          <div className="px-5">
            <DarkStat label="담당 환자" value={`${assignedPatients.length}명`} />
          </div>

          <div className="mt-5 min-h-0 flex-1 px-5 pb-5">
            <div className="grid h-full grid-rows-[auto_1fr] gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="mb-3 text-xs font-black text-slate-400">기본 정보</div>
                <div className="space-y-3">
                  <ProfileLine label="가입일" value={doctor?.createdAt ? doctor.createdAt.slice(0, 10) : '-'} dark />
                  <ProfileLine label="이메일" value={doctor?.email || '-'} dark />
                  <ProfileLine label="전화번호" value={doctor?.phone || '-'} dark />
                </div>
              </div>

              <div className="grid content-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-500"
                >
                  비밀번호 변경
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 shadow-sm transition-colors hover:bg-red-500/20 hover:text-red-100"
                >
                  회원탈퇴
                </button>
              </div>
            </div>
          </div>
        </section>

        <main className="col-span-12 flex min-h-[520px] flex-col rounded-3xl border border-slate-100 bg-white p-5 shadow-sm xl:col-span-8">
          <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                Assigned Patients
              </div>
              <h2 className="mt-1 text-2xl font-black text-slate-900">담당 환자 요약</h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/doctor')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800 active:scale-[0.99]"
              >
                메인으로
              </button>

              <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right text-blue-700">
                <div className="text-[10px] font-black">담당 환자</div>
                <div className="text-lg font-black">{assignedPatients.length}명</div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3 custom-scrollbar">
            {enrichedAssignedPatients.map(patient => (
              <PatientMiniCard key={patient.id} patient={patient} isLoadingDetails={isPatientProfilesLoading} />
            ))}
            {assignedPatients.length === 0 && (
              <div className="col-span-full flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                담당 환자가 없습니다.
              </div>
            )}
          </div>
        </main>
      </div>

      {isPasswordModalOpen && (
        <PasswordChangeModal onClose={() => setIsPasswordModalOpen(false)} />
      )}

      {isDeleteModalOpen && (
        <AccountDeleteModal role="doctor" onClose={() => setIsDeleteModalOpen(false)} />
      )}
    </div>
  );
}

function mergePatientProfile(patient, profile) {
  if (!profile) return patient;

  return {
    ...patient,
    ...profile,
    email: preferProfileValue(profile.email, patient.email),
    phone: preferProfileValue(profile.phone, patient.phone),
  };
}

function preferProfileValue(profileValue, fallbackValue) {
  if (profileValue === undefined || profileValue === null || profileValue === '' || profileValue === '-') {
    return fallbackValue || '-';
  }

  return profileValue;
}

function DarkStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-center">
      <div className="text-[10px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ProfileLine({ label, value, dark = false }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className={dark ? 'font-bold text-slate-400' : 'font-bold text-slate-400'}>{label}</span>
      <span className={dark ? 'break-all text-right font-black text-slate-100' : 'break-all text-right font-black text-slate-800'}>{value}</span>
    </div>
  );
}

function PatientMiniCard({ patient, isLoadingDetails }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-lg font-black text-slate-900">{patient.name}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            {patient.sex} / {formatAge(patient.age)}
          </div>
        </div>

        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
          담당
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        <PatientMetric label="전화번호" value={patient.phone} isLoading={isLoadingDetails} />
        <PatientMetric label="이메일" value={patient.email} isLoading={isLoadingDetails} />
      </div>
    </div>
  );
}

function PatientMetric({ label, value, isLoading }) {
  const displayValue = isLoading && (!value || value === '-') ? '조회 중' : value;

  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[10px] font-black text-slate-400">{label}</div>
      <div className="mt-0.5 break-all text-xs font-black leading-relaxed text-slate-700">{displayValue || '-'}</div>
    </div>
  );
}
