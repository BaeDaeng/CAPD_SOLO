import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Sparkline from '../../components/Sparkline';
import { useDoctorPatientBundle, useDoctorPatientSurveyOverview } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

const ShortcutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const CHART_LABEL_COLORS = {
  weight: '#9333ea',
  bp: '#dc2626',
  uf: '#2563eb',
};

export default function PatientInsightPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, isLoading } = useDoctorPatientBundle(id);
  const { data: surveyOverview } = useDoctorPatientSurveyOverview(id);
  const patient = data.patient;
  const history = data.records;

  if (isLoading) {
    return <StatusScreen text="환자 상세 데이터를 불러오는 중입니다." />;
  }

  if (!patient) {
    return <StatusScreen text="환자 정보를 찾을 수 없습니다." />;
  }

  const latestRecord = history[0] || {};
  const compareRecord = history[7] || history[history.length - 1] || latestRecord;
  const currentWeight = Number(latestRecord.weight || 0);
  const lastWeekWeight = Number(compareRecord.weight || currentWeight);
  const weightDiff = (currentWeight - lastWeekWeight).toFixed(1);
  const isWeightDecreased = Number(weightDiff) <= 0;
  const chartData = history.slice(0, 7).reverse();
  const weightHistory7Days = chartData.map(record => record.weight);
  const bpHistory7Days = chartData.map(record => record.bpSystolic);
  const ufHistory7Days = chartData.map(record => record.uf);
  const recent3DaysExchanges = history.slice(0, 3).flatMap(dayData => (
    dayData.exchanges.map(exchange => ({ dateStr: dayData.displayDate, ...exchange }))
  ));
  const latest3Days = history.slice(0, 3);
  const avgUf3Days = latest3Days.length
    ? Math.floor(latest3Days.reduce((sum, record) => sum + Number(record.uf || 0), 0) / latest3Days.length)
    : 0;
  const weightDiff3Days = (
    Number(history[0]?.weight || 0) -
    Number((history[3] || history[history.length - 1] || history[0] || {}).weight || 0)
  ).toFixed(1);
  const ufStatus = getUfStatus(avgUf3Days);
  const bpStatus = getBpStatus(Number(latestRecord.bpSystolic || 0));
  const weightStatus = getWeightStatus(Number(weightDiff3Days));
  const chartLabelPlacements = new Map();

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-bold text-blue-500 mb-1">PATIENT INSIGHT</div>
          <h1 className="text-2xl font-black text-gray-900">{patient.name} 환자 상세 현황</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4 shrink-0">
        <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
          <button
            onClick={() => navigate(`/doctor/${id}/info`)}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-1.5 bg-slate-800/80 rounded-lg transition-colors z-20"
            title="환자 정보 보기"
          >
            <ShortcutIcon />
          </button>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex items-center gap-3 mb-3 z-10">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
              {patient.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">{patient.name}</h2>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs z-10 mt-auto">
            <div className="text-slate-400">나이/성별</div><div className="font-medium text-right">{formatAge(patient.age)} / {patient.sex}</div>
            <div className="text-slate-400">전화번호</div><div className="font-medium text-right">{patient.phone}</div>
            <div className="text-slate-400">이메일</div><div className="font-medium text-right truncate">{patient.email}</div>
          </div>
        </div>

        <MetricCard
          label="최근 체중 (kg)"
          value={currentWeight || '-'}
          subText={`비교 기록: ${compareRecord.date || '-'}`}
          diff={currentWeight ? `(${Number(weightDiff) > 0 ? '+' : ''}${weightDiff}kg)` : ''}
          diffClass={isWeightDecreased ? 'text-blue-500' : 'text-red-500'}
          sparkData={weightHistory7Days}
          sparkColor={isWeightDecreased ? '#3b82f6' : '#ef4444'}
        />
        <MetricCard
          label="최근 혈압 (mmHg)"
          value={latestRecord.bp || '-'}
          sparkData={bpHistory7Days}
          sparkColor="#8b5cf6"
        />
        <MetricCard
          label="최근 제수량 (mL)"
          value={formatSignedNumber(latestRecord.uf || 0)}
          valueClass={Number(latestRecord.uf || 0) < 0 ? 'text-red-500' : 'text-blue-600'}
          sparkData={ufHistory7Days}
          sparkColor="#0ea5e9"
        />
      </div>

      <div className="grid min-h-105 grid-cols-1 gap-4 lg:grid-cols-3 xl:min-h-0 xl:flex-[1.2]">
        <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 relative h-full flex flex-col min-h-0">
          <button
            onClick={() => navigate(`/doctor/${id}/charts`)}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded-lg transition-colors z-20"
            title="차트 상세 보기"
          >
            <ShortcutIcon />
          </button>
          <h3 className="text-base font-bold text-gray-800 mb-2 shrink-0">주요 활력 징후 및 제수량 추이</h3>
          <div className="flex gap-4 text-[10px] font-bold mb-2 shrink-0">
            <span className="flex items-center gap-1 text-purple-600"><div className="w-2.5 h-2.5 bg-purple-200 rounded-sm border border-purple-300"></div>체중</span>
            <span className="flex items-center gap-1 text-red-500"><div className="w-2.5 h-1 bg-red-500 rounded-full"></div>수축기 혈압</span>
            <span className="flex items-center gap-1 text-blue-500"><div className="w-2.5 h-1 bg-blue-500 rounded-full"></div>제수량</span>
          </div>

          <div className="flex-1 relative w-full h-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 36, right: 12, bottom: 12, left: 12 }}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="6 6" vertical={false} />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f8fafc' }} />
                <YAxis yAxisId="weight" domain={[40, 100]} hide />
                <YAxis yAxisId="uf" domain={[500, 2500]} hide />
                <YAxis yAxisId="bp" domain={[80, 180]} hide />
                <Bar yAxisId="weight" dataKey="weight" name="체중 (kg)" barSize={40} radius={[6, 6, 6, 6]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${entry.date || index}`} fill="#e9d5ff" className="hover:fill-[#d8b4fe] transition-colors cursor-pointer" />
                  ))}
                  <LabelList dataKey="weight" content={(props) => <ChartValueLabel {...props} fill={CHART_LABEL_COLORS.weight} position="top" offset={8} placements={chartLabelPlacements} />} />
                </Bar>
                <Line yAxisId="uf" type="monotone" dataKey="uf" name="제수량 (mL)" stroke="#3b82f6" strokeWidth={4} dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }}>
                  <LabelList dataKey="uf" content={(props) => <ChartValueLabel {...props} fill={CHART_LABEL_COLORS.uf} position="top" offset={18} placements={chartLabelPlacements} />} />
                </Line>
                <Line yAxisId="bp" type="monotone" dataKey="bpSystolic" name="수축기 혈압 (mmHg)" stroke="#ef4444" strokeWidth={4} dot={{ r: 5, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }}>
                  <LabelList dataKey="bpSystolic" content={(props) => <ChartValueLabel {...props} fill={CHART_LABEL_COLORS.bp} position="top" offset={8} placements={chartLabelPlacements} />} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 relative h-full flex flex-col min-h-0">
          <button
            onClick={() => navigate(`/doctor/${id}/ai_report`)}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded-lg transition-colors"
            title="AI 주간 보고서 보기"
          >
            <ShortcutIcon />
          </button>
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <span className="text-lg">AI</span>
            <h3 className="text-base font-bold text-gray-800">AI 건강 상태 분석</h3>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-2 overflow-y-auto">
            <AnalysisRow label="최근 3일 제수량" value={`평균 ${formatSignedNumber(avgUf3Days)} mL`} status={ufStatus} />
            <AnalysisRow label="최근 혈압" value={`최근 ${latestRecord.bp || '-'}`} status={bpStatus} />
            <AnalysisRow label="최근 3일 체중" value={`${Number(weightDiff3Days) > 0 ? '증가' : '감소'} (${Number(weightDiff3Days) > 0 ? '+' : ''}${weightDiff3Days}kg)`} status={weightStatus} />
          </div>
        </div>
      </div>

      <div className="grid min-h-90 flex-1 grid-cols-1 gap-4 lg:grid-cols-3 xl:min-h-0">
        <div className="lg:col-span-2 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 relative h-full flex flex-col min-h-0">
          <button
            onClick={() => navigate(`/doctor/${id}/logs`)}
            className="absolute top-4 right-4 text-gray-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded-lg transition-colors z-20"
            title="기록 전체 보기"
          >
            <ShortcutIcon />
          </button>
          <h3 className="text-base font-bold text-gray-800 mb-3 shrink-0">최근 3일 투석 상세 기록</h3>

          <div className="min-h-0 flex-1 overflow-auto border-t border-gray-100 custom-scrollbar">
            <table className="min-w-140 w-full text-left text-xs md:text-sm">
              <thead className="bg-slate-50 text-gray-500 font-bold sticky top-0 shadow-sm">
                <tr>
                  <th className="px-3 py-2.5">날짜 / 시간</th>
                  <th className="px-3 py-2.5">농도</th>
                  <th className="px-3 py-2.5">주입량(mL)</th>
                  <th className="px-3 py-2.5">배액량(mL)</th>
                  <th className="px-3 py-2.5">제수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent3DaysExchanges.map((exchange, index) => (
                  <tr key={`${exchange.dateStr}-${exchange.time}-${index}`} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-medium text-gray-900">{exchange.dateStr} {exchange.time}</td>
                    <td className="px-3 py-2"><span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600">{exchange.concentration}%</span></td>
                    <td className="px-3 py-2 text-gray-500 font-mono">{exchange.infused}</td>
                    <td className="px-3 py-2 text-gray-500 font-mono">{exchange.drained}</td>
                    <td className={`px-3 py-2 font-bold font-mono ${Number(exchange.uf || 0) < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                      {formatSignedNumber(exchange.uf)}
                    </td>
                  </tr>
                ))}
                {recent3DaysExchanges.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs font-bold text-gray-400">
                      최근 투석 상세 기록이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 relative h-full flex flex-col justify-between min-h-0">
          <div className="shrink-0 mb-2">
            <h3 className="text-base font-bold text-gray-800 mb-1">설문 승인 및 현황</h3>
            <p className="text-[11px] text-gray-500 line-clamp-2">예약별 AI 맞춤형 질문과 환자 응답 현황입니다.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            <button
              type="button"
              onClick={() => navigate(`/doctor/${id}/questions_manage`)}
              className="bg-rose-50 border border-rose-100 p-2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-rose-100 transition-colors h-full text-center"
            >
              <div className="text-2xl font-black text-rose-600 mb-1">{surveyOverview.pendingQuestions}</div>
              <div className="text-[10px] font-bold text-rose-800">승인 대기 질문</div>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/doctor/${id}/questions_list`)}
              className="bg-blue-50 border border-blue-100 p-2 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors h-full text-center"
            >
              <div className="text-2xl font-black text-blue-600 mb-1">{surveyOverview.submittedSurveys}</div>
              <div className="text-[10px] font-bold text-blue-800">응답 완료 설문</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subText, diff, diffClass, valueClass = 'text-gray-900', sparkData, sparkColor }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between group">
      <div>
        <div className="text-xs font-bold text-gray-500 mb-1">{label}</div>
        <div className="flex items-end gap-2 mb-1">
          <span className={`text-2xl font-black leading-none ${valueClass}`}>{value}</span>
          {diff && <span className={`text-xs font-bold ${diffClass}`}>{diff}</span>}
        </div>
        {subText && <div className="text-[10px] text-gray-400 font-medium">{subText}</div>}
      </div>
      <div className="mt-2 flex flex-col items-end">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </div>
  );
}

function formatSignedNumber(value) {
  const numberValue = Number(value || 0);
  return numberValue > 0 ? `+${numberValue}` : String(numberValue);
}

function ChartValueLabel({ x, y, width = 0, value, fill, position = 'top', offset = 8, placements }) {
  if (value === null || value === undefined || value === '') return null;

  const label = String(value);
  const labelX = Number(x || 0) + Number(width || 0) / 2;
  const baseY = Number(y || 0) + (position === 'bottom' ? offset : -offset);
  const labelWidth = Math.max(24, label.length * 7);
  const labelHeight = 14;
  let labelY = baseY;
  const direction = position === 'bottom' ? 1 : -1;
  const nearbyLabels = Array.from(placements.values()).filter(placed => (
    Math.abs(placed.x - labelX) < Math.max(28, (placed.width + labelWidth) / 2)
  ));

  while (nearbyLabels.some(placed => Math.abs(placed.y - labelY) < labelHeight)) {
    labelY += direction * labelHeight;
  }

  placements.set(`${labelX}-${label}-${fill}`, {
    x: labelX,
    y: labelY,
    width: labelWidth,
  });

  return (
    <text
      x={labelX}
      y={labelY}
      textAnchor="middle"
      fill={fill}
      fontSize={13}
      fontWeight={900}
      style={{ paintOrder: 'stroke', stroke: 'white', strokeWidth: 4 }}
    >
      {label}
    </text>
  );
}

const ANALYSIS_STATUS = {
  stable: {
    label: '안정',
    rowClass: 'border border-emerald-100 bg-emerald-50/60',
    badgeClass: 'bg-emerald-100 text-emerald-700',
    dotClass: 'bg-emerald-500',
  },
  caution: {
    label: '주의',
    rowClass: 'border border-amber-100 bg-amber-50/60',
    badgeClass: 'bg-amber-100 text-amber-700',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  danger: {
    label: '위험',
    rowClass: 'border border-red-100 bg-red-50/60',
    badgeClass: 'bg-red-100 text-red-700',
    dotClass: 'bg-red-500 animate-pulse',
  },
};

function getUfStatus(avgUf) {
  if (!avgUf) return ANALYSIS_STATUS.caution;
  if (avgUf <= 500) return ANALYSIS_STATUS.danger;
  if (avgUf <= 800) return ANALYSIS_STATUS.caution;
  return ANALYSIS_STATUS.stable;
}

function getBpStatus(systolic) {
  if (!systolic) return ANALYSIS_STATUS.caution;
  if (systolic >= 180) return ANALYSIS_STATUS.danger;
  if (systolic >= 140) return ANALYSIS_STATUS.caution;
  return ANALYSIS_STATUS.stable;
}

function getWeightStatus(weightDiff) {
  const absDiff = Math.abs(Number(weightDiff || 0));
  if (absDiff >= 3) return ANALYSIS_STATUS.danger;
  if (absDiff >= 1.5) return ANALYSIS_STATUS.caution;
  return ANALYSIS_STATUS.stable;
}

function AnalysisRow({ label, value, status = ANALYSIS_STATUS.stable }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${status.rowClass}`}>
      <div>
        <div className="text-[11px] font-bold text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm font-black text-gray-900">{value}</div>
      </div>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${status.badgeClass}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></div>
        {status.label}
      </div>
    </div>
  );
}

function StatusScreen({ text }) {
  return (
    <div className="h-full bg-slate-50 p-8 text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}
