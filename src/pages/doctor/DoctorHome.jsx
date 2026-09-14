import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Sparkline from '../../components/Sparkline';
import useAppStore from '../../store/useAppStore';
import { anomalyApi, capdApi, doctorApi } from '../../api/apiClient';
import { formatPhoneNumber, normalizeAnomaly, normalizeCapd, normalizePatient } from '../../api/adapters';
import { useDoctorPatients } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';
import { getAnomalyKey, getLatestAnomaly } from '../../utils/anomaly';

const ANOMALY_STATUS = {
  normal: {
    label: '정상',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    textClass: 'text-slate-900',
  },
  warning: {
    label: '주의',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
    textClass: 'text-slate-900',
  },
  danger: {
    label: '위험',
    badgeClass: 'border-red-200 bg-red-50 text-red-700',
    textClass: 'text-red-600',
  },
};

function getDoctorHomeAnomalyStatus(anomaly) {
  const key = getAnomalyKey(anomaly);
  return key === 'unknown' ? 'normal' : key;
}

function getBriefAnomalyIssues(anomaly) {
  const causes = anomaly?.topCauses || [];
  const topCause = [...causes].sort((a, b) => {
    const aScore = Math.abs(Number(a.impact_score ?? a.impactScore ?? 0));
    const bScore = Math.abs(Number(b.impact_score ?? b.impactScore ?? 0));
    return bScore - aScore;
  })[0];

  if (topCause) {
    return [`${topCause.feature || topCause.name || '주요 지표'}${topCause.direction ? ` ${topCause.direction}` : ''}`];
  }
  if (anomaly?.statusMessage) return [String(anomaly.statusMessage).split(/[.!?]/)[0].trim()].filter(Boolean);
  return [];
}

function buildPatientRow(patient, records = [], anomalies = []) {
  const todayData = records[0] || {};
  const latestAnomaly = getLatestAnomaly(anomalies);
  const anomalyKey = getDoctorHomeAnomalyStatus(latestAnomaly);
  const anomalyStatus = ANOMALY_STATUS[anomalyKey];
  const bp = todayData.bp || '-';
  const uf = Number(todayData.uf || 0);
  const fbs = Number(todayData.fbs || 0);
  const weight = todayData.weight || '-';
  const recordCount = todayData.exchanges ? todayData.exchanges.length : 0;
  const anomalyIssues = anomalyKey === 'normal' ? [] : getBriefAnomalyIssues(latestAnomaly);

  return {
    ...patient,
    record: recordCount,
    uf,
    weight,
    bp,
    fbs: fbs || '-',
    ai: anomalyIssues.length ? anomalyIssues.join(', ') : '안정적',
    anomalyLabel: anomalyStatus.label,
    anomalyClass: anomalyStatus.badgeClass,
    anomalyTextClass: anomalyStatus.textClass,
    anomalyKey,
    trend: records.slice(0, 7).reverse().map(record => record.uf),
    isDanger: anomalyKey === 'danger',
  };
}

export default function DoctorHome() {
  const navigate = useNavigate();
  const { currentDoctorName } = useAppStore();
  const { data: assignedPatients = [], isLoading, reload } = useDoctorPatients();
  const [recordsByPatientId, setRecordsByPatientId] = useState({});
  const [anomaliesByPatientId, setAnomaliesByPatientId] = useState({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  useEffect(() => {
    if (assignedPatients.length === 0) {
      setRecordsByPatientId({});
      setAnomaliesByPatientId({});
      return;
    }

    let ignore = false;

    const loadRecords = async () => {
      setIsRecordsLoading(true);

      try {
        const entries = await Promise.all(
          assignedPatients.map(async (patient) => {
            try {
              const [records, anomalies] = await Promise.all([
                capdApi.getDoctorRecords(patient.id).catch(() => []),
                anomalyApi.getResults(patient.id).catch(() => []),
              ]);
              const normalizedRecords = (records || []).map(normalizeCapd).sort((a, b) => b.date.localeCompare(a.date));
              const latestRecordDate = normalizedRecords[0]?.date;
              const weeklyAnomaly = latestRecordDate
                ? await anomalyApi.analyze(patient.id, latestRecordDate).then(normalizeAnomaly).catch(() => null)
                : null;

              return [patient.id, {
                records: normalizedRecords,
                anomalies: weeklyAnomaly ? [weeklyAnomaly] : (anomalies || []).map(normalizeAnomaly),
              }];
            } catch {
              return [patient.id, { records: [], anomalies: [] }];
            }
          })
        );

        if (!ignore) {
          setRecordsByPatientId(Object.fromEntries(entries.map(([patientId, value]) => [patientId, value.records])));
          setAnomaliesByPatientId(Object.fromEntries(entries.map(([patientId, value]) => [patientId, value.anomalies])));
        }
      } finally {
        if (!ignore) setIsRecordsLoading(false);
      }
    };

    loadRecords();

    return () => {
      ignore = true;
    };
  }, [assignedPatients]);

  const patientList = useMemo(() => (
    assignedPatients.map(patient => buildPatientRow(patient, recordsByPatientId[patient.id] || [], anomaliesByPatientId[patient.id] || []))
  ), [assignedPatients, recordsByPatientId, anomaliesByPatientId]);

  const summaryStats = {
    total: patientList.length,
    normal: patientList.filter(patient => patient.record >= 4).length,
    delayed: patientList.filter(patient => patient.record < 4).length,
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-500 bg-slate-100">
      <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4 shrink-0 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            전체 환자 모니터링
          </h1>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {currentDoctorName || '담당의'} 선생님의 담당 환자만 표시됩니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-6 text-sm">
            <div className="font-medium text-slate-500">
              담당 환자: <span className="font-bold text-slate-900 text-base ml-1">{summaryStats.total}</span>명
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="font-medium text-emerald-600">
              정상 제출: <span className="font-bold text-base ml-1">{summaryStats.normal}</span>명
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="font-medium text-red-500">
              제출 지연/누락: <span className="font-bold text-base ml-1">{summaryStats.delayed}</span>명
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            담당환자 추가
          </button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col p-0 overflow-hidden border-none shadow-md bg-white">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-5 py-4">환자 정보</th>
                <th className="px-5 py-4 text-center">일일 기록</th>
                <th className="px-5 py-4 text-right">총 제수량</th>
                <th className="px-5 py-4 text-right">체중</th>
                <th className="px-5 py-4 text-right">혈압</th>
                <th className="px-5 py-4 text-right">공복혈당</th>
                <th className="px-5 py-4">AI 특이사항</th>
                <th className="px-5 py-4 text-center">미니 추이 (7일)</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {(isLoading || isRecordsLoading) && patientList.length === 0 && (
                <tr>
                  <td colSpan={8} className="h-80 text-center text-sm font-bold text-slate-400">
                    담당 환자 데이터를 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && patientList.length === 0 && (
                <tr>
                  <td colSpan={8} className="h-80 text-center text-sm font-bold text-slate-400">
                    등록된 담당 환자가 없습니다.
                  </td>
                </tr>
              )}

              {patientList.map(patient => (
                <tr
                  key={patient.id}
                  onClick={() => navigate(`/doctor/${patient.id}`)}
                  className={`cursor-pointer transition-colors group ${
                    patient.isDanger ? 'bg-red-50/30 hover:bg-red-50/80' : 'hover:bg-blue-50/50'
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${patient.isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {patient.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{patient.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{patient.sex}/{formatAge(patient.age)}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      {[...Array(5)].map((_, index) => (
                        <div key={index} className="shrink-0">
                          {index < patient.record ? (
                            <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-slate-200 bg-slate-50 m-px"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <span className="font-mono font-bold text-slate-700">
                      {patient.uf || '-'} <span className="text-[10px] text-slate-400 font-sans font-normal">mL</span>
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right font-medium text-slate-700">
                    {patient.weight} <span className="text-[10px] text-slate-400">{patient.weight !== '-' ? 'kg' : ''}</span>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-slate-700">
                      {patient.bp}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold text-slate-700">
                      {patient.fbs}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${patient.anomalyClass}`}>
                        {patient.anomalyLabel}
                      </span>
                      <div className={`min-w-0 max-w-50 truncate text-xs font-bold ${patient.anomalyTextClass}`}>
                        {patient.ai}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 w-32">
                    <div className="flex items-center justify-center h-8 w-24 mx-auto bg-slate-50 rounded border border-slate-100 p-1">
                      <Sparkline data={patient.trend} color={patient.isDanger ? '#ef4444' : '#3b82f6'} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {isAddModalOpen && (
        <AddPatientModal
          onAdd={async (phone) => {
            await doctorApi.registerPatient({ phone });
            await reload();
          }}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}

function AddPatientModal({ onAdd, onClose }) {
  const [phone, setPhone] = useState('');
  const [patientPreview, setPatientPreview] = useState(null);
  const [error, setError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (event) => {
    setPhone(formatPhoneNumber(event.target.value));
    setPatientPreview(null);
    setError('');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!phone.trim()) return;

    setError('');
    setPatientPreview(null);
    setIsSearching(true);

    try {
      const patient = await doctorApi.getPatientByPhone(phone.trim());
      setPatientPreview(normalizePatient(patient));
    } catch (searchError) {
      setError(searchError.message || '해당 전화번호의 환자를 찾지 못했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!patientPreview || !phone.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await onAdd(phone.trim());
      alert('담당 환자로 등록되었습니다.');
      onClose();
    } catch (error) {
      alert(error.message || '담당 환자 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={patientPreview ? handleSubmit : handleSearch} className="flex w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">담당환자 추가</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                환자 전화번호로 프로필을 확인한 뒤 담당 환자로 등록합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-xl font-black text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              X
            </button>
          </div>

          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            inputMode="numeric"
            maxLength={13}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {error && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          {patientPreview && (
            <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-3 text-xs font-black uppercase tracking-widest text-blue-500">Patient Profile</div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-blue-600 shadow-sm">
                  {patientPreview.name?.slice(0, 1) || '환'}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-lg font-black text-slate-900">{patientPreview.name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {patientPreview.sex}/{formatAge(patientPreview.age)}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <PreviewInfo label="전화번호" value={patientPreview.phone || phone} />
                <PreviewInfo label="성별/나이" value={`${patientPreview.sex}/${formatAge(patientPreview.age)}`} />
              </div>
            </section>
          )}
        </div>

        <div className="flex gap-3 bg-slate-50 px-6 py-4">
          {patientPreview && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={!phone.trim() || isSearching || isSubmitting}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300"
          >
            {patientPreview
              ? isSubmitting ? '등록 중' : '추가하기'
              : isSearching ? '조회 중' : '환자 조회'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PreviewInfo({ label, value }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white px-3 py-2">
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-0.5 font-black text-slate-800">{value || '-'}</div>
    </div>
  );
}
