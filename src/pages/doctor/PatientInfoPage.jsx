import React from 'react';
import { useParams } from 'react-router-dom';
import BackToPatientButton from '../../components/BackToPatientButton';
import { getLatestRecord, useDoctorPatientBundle } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

export default function PatientInfoPage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctorPatientBundle(id);
  const patient = data.patient;
  const latestRecord = getLatestRecord(data.records);

  if (isLoading) {
    return <div className="p-8 text-sm font-bold text-slate-400">환자 정보를 불러오는 중입니다.</div>;
  }

  if (!patient) {
    return <div className="p-8 text-sm font-bold text-slate-400">환자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="p-6 md:p-8 animate-in fade-in duration-500 h-full overflow-y-auto bg-slate-50/50">
      <BackToPatientButton />

      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">환자 상세 정보</h1>
        <p className="text-gray-500 text-sm mt-1">등록된 환자의 기본 인적 사항과 최근 투석 기록을 확인합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="bg-slate-800 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3 z-10 shadow-inner">
              {patient.name.charAt(0)}
            </div>
            <h2 className="text-xl font-black text-white z-10">{patient.name}</h2>
          </div>

          <div className="p-6 space-y-5 flex-1">
            <InfoBlock label="성별 / 나이" value={`${patient.sex} / ${formatAge(patient.age)}`} />
            <InfoBlock label="이메일" value={patient.email} />
            <InfoBlock label="전화번호" value={patient.phone} />
            <InfoBlock label="최근 기록일" value={latestRecord?.date || '-'} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="text-emerald-500">⚖️</span> 최근 신체 및 건강 수치
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Metric label="최근 체중" value={latestRecord?.weight ? `${latestRecord.weight} kg` : '-'} />
              <Metric label="최근 혈압" value={latestRecord?.bp || '-'} />
              <Metric label="공복혈당" value={latestRecord?.fbs ? `${latestRecord.fbs} mg/dL` : '-'} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="text-blue-500">🩺</span> 최근 투석 기록
            </h3>

            {latestRecord ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoBlock label="총 제수량" value={`${latestRecord.totalUf} mL`} />
                  <InfoBlock label="복막액 혼탁도" value={latestRecord.turbidity} />
                </div>

                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <div className="text-xs font-bold text-blue-500 mb-2">메모</div>
                  <div className="text-sm font-bold text-gray-800 leading-relaxed">
                    {latestRecord.memo || '작성된 메모가 없습니다.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50 p-8 text-center text-sm font-bold text-gray-400">
                최근 투석 기록이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <div className="text-xs font-bold text-gray-400 mb-1">{label}</div>
      <div className="text-sm font-bold text-gray-800">{value || '-'}</div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
      <div className="text-xs font-bold text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
    </div>
  );
}
