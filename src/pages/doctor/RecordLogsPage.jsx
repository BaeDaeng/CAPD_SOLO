import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackToPatientButton from '../../components/BackToPatientButton';
import { useAnomalyResults, useDoctorPatientBundle } from '../../hooks/usePatientData';
import { ANOMALY_META, buildAnomalyByDate, getAnomalyMeta } from '../../utils/anomaly';

const getRecordLogAnomalyMeta = (anomaly) => {
  const meta = getAnomalyMeta(anomaly);
  return meta.key === 'unknown' ? ANOMALY_META.normal : meta;
};

export default function RecordLogsPage() {
  const { id } = useParams();
  const { data, isLoading } = useDoctorPatientBundle(id);
  const { data: anomalies = [] } = useAnomalyResults(id);
  const patient = data.patient;
  const history = data.records;
  const anomalyByDate = useMemo(() => buildAnomalyByDate(anomalies), [anomalies]);
  const [openDateState, setOpenDateState] = useState({ patientId: null, dates: null });
  const [calendarDate, setCalendarDate] = useState(new Date());

  const latestDate = history[0]?.date;
  const openDates = openDateState.patientId === id ? openDateState.dates : null;
  const displayOpenDates = openDates ?? (latestDate ? [latestDate] : []);
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const hasRecordOnDate = useMemo(() => {
    const recordDates = new Set(history.map(record => record.date));
    return (dateStr) => recordDates.has(dateStr);
  }, [history]);

  const toggleAccordion = (dateStr) => {
    setOpenDateState(prev => {
      const currentDates = prev.patientId === id ? prev.dates : null;
      const currentOpenDates = currentDates ?? (latestDate ? [latestDate] : []);

      return {
        patientId: id,
        dates: currentOpenDates.includes(dateStr)
          ? currentOpenDates.filter(date => date !== dateStr)
          : [...currentOpenDates, dateStr],
      };
    });
  };

  const handleDateClick = (dateStr) => {
    if (!displayOpenDates.includes(dateStr)) {
      setOpenDateState(prev => {
        const currentDates = prev.patientId === id ? prev.dates : null;
        const currentOpenDates = currentDates ?? (latestDate ? [latestDate] : []);

        return {
          patientId: id,
          dates: [...currentOpenDates, dateStr],
        };
      });
    }
    setTimeout(() => {
      document.getElementById(`record-${dateStr}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (isLoading) {
    return <div className="p-8 text-sm font-bold text-slate-400">투석 기록을 불러오는 중입니다.</div>;
  }

  if (!patient) {
    return <div className="p-8 text-sm font-bold text-slate-400">환자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="shrink-0 mb-6">
        <BackToPatientButton />
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <span className="text-blue-600 bg-blue-100 p-2 rounded-xl">📅</span>
          전체 투석 기록 로그
        </h1>
        <p className="text-sm text-gray-500 mt-2">{patient.name} 환자의 투석 교환 및 건강 수치 기록입니다.</p>
      </div>

      <div className="flex min-h-[560px] flex-1 flex-col gap-6 lg:flex-row xl:min-h-0">
        <div className="flex shrink-0 flex-col gap-4 lg:w-72 xl:w-80">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-900 text-lg">{year}년 {month + 1}월</h3>
              <div className="flex gap-2">
                <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-slate-50 rounded text-gray-400">◀</button>
                <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-slate-50 rounded text-gray-400">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['일','월','화','수','목','금','토'].map(day => (
                <div key={day} className="text-[10px] font-bold text-gray-400 mb-3">{day}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`blank-${index}`} className="h-10"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasRecord = hasRecordOnDate(currentStr);
                const anomalyMeta = getRecordLogAnomalyMeta(anomalyByDate.get(currentStr));

                return (
                  <button
                    key={day}
                    onClick={() => hasRecord && handleDateClick(currentStr)}
                    disabled={!hasRecord}
                    className={`h-10 flex flex-col items-center justify-center rounded-xl text-sm transition-all relative ${
                      hasRecord
                        ? `${anomalyMeta.calendarClass} font-bold cursor-pointer`
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {day}
                    {hasRecord && <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${anomalyMeta.dotClass}`}></span>}
                  </button>
                );
              })}
            </div>
          </div>


          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-xs text-gray-500 font-medium">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>기록 있음(정상)</div>
            <div className="mt-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span>주의</div>
            <div className="mt-2 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span>위험</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-sm custom-scrollbar">
          <div className="space-y-3">
            {history.map((dayData) => {
              const isOpen = displayOpenDates.includes(dayData.date);
              const isWarning = dayData.uf < 800 || dayData.bpSystolic >= 140;
              const anomalyMeta = getRecordLogAnomalyMeta(anomalyByDate.get(dayData.date));

              return (
                <div
                  key={dayData.date}
                  id={`record-${dayData.date}`}
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isOpen ? 'border-blue-200 ring-1 ring-blue-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <button onClick={() => toggleAccordion(dayData.date)} className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-gray-400">{dayData.date.slice(0, 4)}년</span>
                        <span className="text-lg font-black text-gray-800">{dayData.displayDate.replace('-', '/')}</span>
                      </div>
                      <div className="h-8 w-px bg-gray-200 mx-2"></div>
                      <Summary label="총 제수량" value={`${formatSignedNumber(dayData.uf)}mL`} warning={isWarning && dayData.uf < 800} />
                      <div className="hidden sm:block"><Summary label="혈압" value={dayData.bp} warning={isWarning && dayData.bpSystolic >= 140} /></div>
                      <div className="hidden sm:block"><Summary label="투석 횟수" value={`${dayData.exchanges.length}회`} /></div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${anomalyMeta.badgeClass}`}>
                        {anomalyMeta.label}
                      </span>
                      <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 border-t border-gray-100 p-4 md:p-6 animate-in slide-in-from-top-2">
                      <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap gap-x-8 gap-y-4">
                        <HealthSummary icon="⚖️" label="체중" value={dayData.weight ? `${dayData.weight} kg` : '-'} />
                        <HealthSummary icon="🩸" label="공복혈당" value={dayData.fbs ? `${dayData.fbs} mg/dL` : '-'} />
                        <HealthSummary icon="i" label="소변/혼탁도" value={`${dayData.urineCount || 0}회 / ${dayData.turbidity}`} />
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
                        <table className="min-w-[560px] w-full text-left text-xs md:text-sm">
                          <thead className="bg-slate-100 text-gray-500 font-bold border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3">회차/시간</th>
                              <th className="px-4 py-3">농도</th>
                              <th className="px-4 py-3 text-right">주입량</th>
                              <th className="px-4 py-3 text-right">배액량</th>
                              <th className="px-4 py-3 text-right">제수량</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {dayData.exchanges.map((exchange, index) => (
                              <tr key={`${exchange.time}-${index}`} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-gray-800">
                                  <span className="inline-block w-4 h-4 bg-slate-200 text-slate-500 text-center rounded-full text-[10px] mr-2">{index + 1}</span>
                                  {exchange.time}
                                </td>
                                <td className="px-4 py-3"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-bold text-gray-600">{exchange.concentration}%</span></td>
                                <td className="px-4 py-3 text-right text-gray-500 font-mono">{exchange.infused}</td>
                                <td className="px-4 py-3 text-right text-gray-500 font-mono">{exchange.drained}</td>
                                <td className={`px-4 py-3 text-right font-bold font-mono ${Number(exchange.uf || 0) < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                                  {formatSignedNumber(exchange.uf)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="flex min-h-80 items-center justify-center text-sm font-bold text-gray-400">
                저장된 투석 기록이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, warning = false }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-gray-400">{label}</div>
      <div className={`text-sm font-black ${warning ? 'text-red-600' : 'text-gray-700'}`}>{value}</div>
    </div>
  );
}

function formatSignedNumber(value) {
  const numberValue = Number(value || 0);
  return numberValue > 0 ? `+${numberValue}` : String(numberValue);
}

function HealthSummary({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-[10px] font-bold text-gray-400">{label}</div>
        <div className="text-sm font-black text-gray-800">{value}</div>
      </div>
    </div>
  );
}
