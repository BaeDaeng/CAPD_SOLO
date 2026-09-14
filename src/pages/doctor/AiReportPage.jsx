import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import BackToPatientButton from '../../components/BackToPatientButton';
import Card from '../../components/Card';
import ReadableText from '../../components/ReadableText';
import { anomalyApi, reportApi } from '../../api/apiClient';
import { normalizeAnomaly, normalizeReport } from '../../api/adapters';
import { useDoctorPatientProfile, useDoctorPatientRecords, usePatientReports } from '../../hooks/usePatientData';
import { getAnomalyCausesText, getAnomalySummaryText, getLatestAnomaly } from '../../utils/anomaly';

export default function AiReportPage() {
  const { id } = useParams();
  const patientId = Number(id);
  const { data: patient } = useDoctorPatientProfile(id);
  const { data: savedReports = [], reload } = usePatientReports(id);
  const { data: patientRecords = [] } = useDoctorPatientRecords(id);
  const initialDate = useMemo(() => new Date(), []);

  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [weeklyAnomaly, setWeeklyAnomaly] = useState(null);
  const reportPrintRef = useRef(null);

  const activeReport = reportData || savedReports[0] || null;
  const reportChartData = useMemo(() => (
    buildReportChartData(activeReport, patientRecords)
  ), [activeReport, patientRecords]);
  const reportAnomalyStartDate = activeReport?.startDate || '';
  const reportAnomalyDate = activeReport?.endDate || '';
  const reportAnalysisItems = useMemo(() => {
    const baseItems = removeReportAnomalySummary(activeReport?.analysis || [], activeReport?.anomalySummary);
    const anomalyText = weeklyAnomaly
      ? `${getAnomalySummaryText(weeklyAnomaly)} 주요 원인: ${getAnomalyCausesText(weeklyAnomaly)}`
      : '특이 이상치 없음';

    return insertAnomalyAnalysisText(baseItems, anomalyText);
  }, [activeReport, weeklyAnomaly]);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
  const yearOptions = useMemo(() => {
    const year = initialDate.getFullYear();
    return [year - 1, year, year + 1];
  }, [initialDate]);

  useEffect(() => {
    if (!patientId || !reportAnomalyDate) {
      setWeeklyAnomaly(null);
      return undefined;
    }

    let ignore = false;

    const loadWeeklyAnomaly = async () => {
      try {
        const response = await anomalyApi.analyze(patientId, reportAnomalyDate);
        const normalized = normalizeWeeklyAnomalyResult(response, reportAnomalyStartDate, reportAnomalyDate);

        if (!ignore && normalized) {
          setWeeklyAnomaly(normalized || null);
          return;
        }

        throw new Error('보고서 기간에 해당하는 이상치 결과가 없습니다.');
      } catch {
        try {
          const results = await anomalyApi.getResults(patientId);
          if (!ignore) {
            setWeeklyAnomaly(selectAnomalyForReportPeriod(results, reportAnomalyStartDate, reportAnomalyDate));
          }
        } catch {
          if (!ignore) setWeeklyAnomaly(null);
        }
      }
    };

    loadWeeklyAnomaly();

    return () => {
      ignore = true;
    };
  }, [patientId, reportAnomalyDate, reportAnomalyStartDate]);

  const handleGenerateReport = async () => {
    setIsLoading(true);

    try {
      const response = await reportApi.generate(patientId, {
        year: Number(selectedYear),
        month: Number(selectedMonth),
        weekNumber: Number(selectedWeek),
      });
      const normalized = normalizeReport(response);
      setReportData(normalized);
      await reload();
    } catch (error) {
      alert(error.message || '보고서 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = async () => {
    if (!activeReport) return;

    const reportText = [
      `[${activeReport.title}]`,
      `기간: ${activeReport.period}`,
      '',
      `요약: ${activeReport.summary}`,
      '',
      '주요 수치',
      ...activeReport.vitals.map(item => `- ${item.label}: ${item.value}`),
      '',
      'AI 정밀 데이터 분석',
      ...reportAnalysisItems.map((text, index) => `${index + 1}. ${text}`),
      '',
      `권고사항: ${activeReport.recommendation}`,
    ].join('\n');

    await navigator.clipboard.writeText(reportText);
    alert('보고서가 복사되었습니다.');
  };

  const handleExportPdf = async () => {
    if (!activeReport) return;

    const reportElement = reportPrintRef.current;
    if (!reportElement) return;

    const printWindow = window.open('', '_blank', 'width=960,height=1080');
    if (!printWindow) {
      window.print();
      return;
    }

    const printDocument = printWindow.document;
    const printTitle = `${patient?.name || '환자'}_${activeReport.title}_${activeReport.period}`;
    const clonedReport = reportElement.cloneNode(true);
    clonedReport.querySelectorAll('.ai-report-print-actions').forEach(element => element.remove());
    const documentStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(element => element.outerHTML)
      .join('\n');

    printDocument.open();
    printDocument.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(printTitle)}</title>
          ${documentStyles}
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            html, body {
              margin: 0;
              width: 100%;
              min-height: 100%;
              background: #ffffff !important;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 0;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .print-preview-toolbar {
              position: sticky;
              top: 0;
              z-index: 100;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 1px solid #e2e8f0;
              background: rgba(255, 255, 255, 0.96);
              padding: 14px 20px;
              backdrop-filter: blur(12px);
            }
            .print-preview-toolbar-title {
              min-width: 0;
              font-size: 14px;
              font-weight: 900;
              color: #0f172a;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .print-preview-toolbar-actions {
              display: flex;
              flex-shrink: 0;
              gap: 8px;
            }
            .print-preview-button {
              border: 0;
              border-radius: 999px;
              background: #2563eb;
              color: #ffffff;
              cursor: pointer;
              font-size: 13px;
              font-weight: 900;
              padding: 10px 16px;
            }
            .print-preview-button.secondary {
              border: 1px solid #cbd5e1;
              background: #ffffff;
              color: #475569;
            }
            .print-report-page {
              width: 100%;
              max-width: 794px;
              margin: 0 auto;
              padding: 20px;
            }
            .ai-report-print-root,
            .ai-report-print-shell,
            .ai-report-scroll {
              display: block !important;
              width: 100% !important;
              min-width: 0 !important;
              max-width: none !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
            }
            .ai-report-print-root {
              position: static !important;
              top: auto !important;
              left: auto !important;
            }
            .ai-report-print-shell {
              border: 0 !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            .ai-report-scroll {
              padding: 20px 0 0 !important;
            }
            .ai-report-print-root .grid {
              display: grid !important;
            }
            .ai-report-print-root .md\\:grid-cols-2 {
              grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            }
            .ai-report-print-root .md\\:grid-cols-3 {
              grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            }
            .ai-report-print-root .inline-flex {
              display: inline-block !important;
              max-width: 100% !important;
              white-space: normal !important;
              line-height: 1.6 !important;
            }
            .ai-report-print-root .overflow-hidden {
              overflow: visible !important;
            }
            .ai-report-print-root .recharts-responsive-container {
              width: 100% !important;
              height: 96px !important;
              min-height: 96px !important;
              max-height: 96px !important;
              overflow: visible !important;
            }
            .ai-report-print-root .recharts-wrapper,
            .ai-report-print-root .recharts-surface {
              width: 100% !important;
              max-width: 100% !important;
            }
            .ai-report-print-root .recharts-surface {
              height: 96px !important;
              overflow: visible !important;
            }
            .report-screen-chart {
              display: none !important;
            }
            .report-print-chart {
              display: block !important;
              width: 100% !important;
              height: 96px !important;
            }
            .ai-report-print-root p,
            .ai-report-print-root h1,
            .ai-report-print-root h2,
            .ai-report-print-root h3,
            .ai-report-print-root span,
            .ai-report-print-root div {
              word-break: keep-all;
              overflow-wrap: anywhere;
            }
            @media print {
              body,
              body * {
                visibility: visible !important;
              }
              .ai-report-print-actions {
                display: none !important;
              }
              .print-preview-toolbar {
                display: none !important;
              }
              .print-report-page {
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-preview-toolbar">
            <div class="print-preview-toolbar-title">${escapeHtml(printTitle)}</div>
            <div class="print-preview-toolbar-actions">
              <button type="button" class="print-preview-button secondary" onclick="window.close()">닫기</button>
              <button type="button" class="print-preview-button" onclick="window.print()">인쇄하기</button>
            </div>
          </div>
          <div class="print-report-page">${clonedReport.outerHTML}</div>
        </body>
      </html>
    `);
    printDocument.close();
    printWindow.focus();
  };

  return (
    <div className="ai-report-page h-full overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="flex h-full min-h-0 flex-col">
        <div className="ai-report-no-print mb-5 shrink-0">
          <BackToPatientButton />

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
                <span className="rounded-xl bg-blue-100 p-2 text-xl text-blue-600">AI</span>
                AI 건강 상태 분석 리포트
              </h1>
              <p className="mt-2 text-sm font-medium text-gray-500">
                <span className="font-bold text-blue-600">{patient?.name || '환자'}</span> 환자의 투석 데이터를 온프레미스 AI가 분석한 전문 보고서입니다.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saved Reports</div>
              <div className="mt-1 text-xl font-black text-gray-900">{savedReports.length}건</div>
            </div>
          </div>
        </div>

        <div className="ai-report-layout grid min-h-[620px] flex-1 grid-cols-1 gap-4 xl:min-h-0 xl:grid-cols-12">
          <aside className="ai-report-no-print min-h-0 xl:col-span-4 overflow-y-auto custom-scrollbar pr-1">
            <Card className="flex h-fit flex-col border-none p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-black text-gray-800">보고서 조건</h3>

              <div className="grid grid-cols-3 gap-3">
                <FieldLabel label="연도">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                    {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </FieldLabel>

                <FieldLabel label="월">
                  <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                    {monthOptions.map(month => <option key={month} value={month}>{month}월</option>)}
                  </select>
                </FieldLabel>

                <FieldLabel label="주차">
                  <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500">
                    {[1, 2, 3, 4, 5].map(week => <option key={week} value={week}>{week}주차</option>)}
                  </select>
                </FieldLabel>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 shadow-sm disabled:bg-slate-300"
              >
                {isLoading ? '보고서 생성 중' : '보고서 생성'}
              </button>

              <div className="mt-5 rounded-2xl border border-gray-100 bg-slate-50 p-4">
                <h4 className="mb-3 text-xs font-black text-gray-500">저장된 보고서</h4>
                <div className="space-y-2">
                  {savedReports.map(report => (
                    <button
                      key={report.reportId}
                      type="button"
                      onClick={() => setReportData(report)}
                      className="w-full rounded-xl border border-gray-100 bg-white px-3 py-3 text-left text-xs font-bold text-gray-600 hover:border-blue-200 hover:bg-blue-50"
                    >
                      {report.period}
                    </button>
                  ))}
                  {savedReports.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs font-bold text-gray-400">
                      저장된 보고서가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </aside>

          <main ref={reportPrintRef} className="ai-report-print-root min-h-0 xl:col-span-8">
            <div className="ai-report-print-shell flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                  <p className="text-sm font-bold text-gray-400">온프레미스 AI 모델이 데이터를 분석 중입니다...</p>
                </div>
              ) : activeReport ? (
                <>
                  <div className="shrink-0 border-b border-gray-100 bg-white px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Weekly AI Report</span>
                        <h2 className="mt-1 text-xl font-black leading-snug text-gray-900">{activeReport.title}</h2>
                        <p className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-500">
                          {activeReport.period}
                        </p>
                      </div>

                      <div className="ai-report-print-actions flex shrink-0 items-center gap-2">
                        <button type="button" onClick={handleExportPdf} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 transition-colors hover:bg-blue-100">
                          PDF로 내보내기
                        </button>
                        <button type="button" onClick={handleCopyReport} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800">
                          보고서 복사하기
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="ai-report-scroll min-h-0 flex-1 space-y-5 overflow-y-auto p-6 custom-scrollbar">
                    <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                      <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-500">Summary</div>
                      <ReadableText
                        value={activeReport.summary}
                        splitLongText
                        sentencesPerParagraph={1}
                        className="text-base font-semibold leading-8 text-slate-800 md:text-lg"
                      />
                    </section>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {activeReport.vitals.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</span>
                          <ReadableText value={item.value} className="mt-2 text-sm font-semibold leading-6 text-slate-800" />
                        </div>
                      ))}
                    </div>

                    <ReportSection title="기간별 주요 지표 추이">
                      {reportChartData.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <ReportTrendCard
                            title="체중 변화"
                            data={reportChartData}
                            dataKey="weight"
                            color="#9333ea"
                            unit="kg"
                          />
                          <ReportTrendCard
                            title="수축기 혈압"
                            data={reportChartData}
                            dataKey="bpSystolic"
                            color="#ef4444"
                            unit="mmHg"
                          />
                          <ReportTrendCard
                            title="공복혈당"
                            data={reportChartData}
                            dataKey="fbs"
                            color="#f97316"
                            unit="mg/dL"
                          />
                          <ReportTrendCard
                            title="제수량"
                            data={reportChartData}
                            dataKey="uf"
                            color="#2563eb"
                            unit="mL"
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 p-5 text-center text-xs font-bold text-gray-400">
                          보고서 기간에 표시할 투석 기록이 없습니다.
                        </div>
                      )}
                    </ReportSection>

                    <ReportSection title="AI 정밀 데이터 분석">
                      {reportAnalysisItems.map((text, index) => (
                        <div key={`${text}-${index}`} className="group flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600 transition-colors group-hover:bg-blue-100">
                            {index + 1}
                          </span>
                          <ReadableText
                            value={text}
                            splitLongText
                            sentencesPerParagraph={1}
                            className="text-sm font-medium leading-7 text-gray-700"
                          />
                        </div>
                      ))}
                    </ReportSection>

                    <div className="rounded-3xl border border-blue-800 bg-blue-900 p-6 text-white shadow-lg">
                      <h3 className="mb-3 text-[10px] font-black uppercase tracking-widest text-blue-200">Medical Recommendation</h3>
                      <ReadableText
                        value={activeReport.recommendation}
                        splitLongText
                        sentencesPerParagraph={1}
                        className="text-base font-semibold leading-8 md:text-lg"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm font-bold text-gray-400">
                  보고서를 생성하거나 저장된 보고서를 선택하세요.
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-bold text-gray-500">{label}</div>
      {children}
    </label>
  );
}

function ReportTrendCard({ title, data, dataKey, color, unit }) {
  const latestValue = getLatestMetricValue(data, dataKey);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-gray-800">{title}</div>
          <div className="mt-1 text-[10px] font-bold text-gray-400">보고서 기간 내 추이</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-black" style={{ color }}>
            {latestValue ?? '-'}
          </div>
          <div className="text-[10px] font-bold text-gray-400">{unit}</div>
        </div>
      </div>

      <div className="h-24">
        <ResponsiveContainer className="report-screen-chart" width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip
              formatter={(value) => [`${value} ${unit}`, title]}
              labelFormatter={(label) => `날짜 ${label}`}
              contentStyle={{
                border: 'none',
                borderRadius: 12,
                boxShadow: '0 10px 20px rgb(15 23 42 / 0.12)',
                fontSize: 12,
                fontWeight: 700,
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 3, fill: color, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
        <StaticReportLineChart data={data} dataKey={dataKey} color={color} />
      </div>
    </div>
  );
}

function StaticReportLineChart({ data, dataKey, color }) {
  const width = 320;
  const height = 96;
  const padding = { top: 12, right: 12, bottom: 20, left: 12 };
  const points = data
    .map((item, index) => ({ ...item, index, value: toChartNumber(item[dataKey]) }))
    .filter(item => item.value !== null);

  if (points.length === 0) {
    return (
      <svg className="report-print-chart hidden" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="표시할 그래프 데이터 없음">
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
          표시할 데이터 없음
        </text>
      </svg>
    );
  }

  const values = points.map(point => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const xRange = Math.max(data.length - 1, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const toX = (index) => padding.left + (index / xRange) * innerWidth;
  const toY = (value) => padding.top + (1 - ((value - minValue) / valueRange)) * innerHeight;
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.index).toFixed(2)} ${toY(point.value).toFixed(2)}`)
    .join(' ');
  const firstLabel = data[0]?.dateLabel || '';
  const lastLabel = data[data.length - 1]?.dateLabel || '';

  return (
    <svg className="report-print-chart hidden" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="보고서 기간 내 추이">
      {[0, 1, 2].map((line) => {
        const y = padding.top + (line / 2) * innerHeight;
        return (
          <line
            key={line}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        );
      })}
      <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map(point => (
        <circle
          key={`${point.date}-${point.index}`}
          cx={toX(point.index)}
          cy={toY(point.value)}
          r="3"
          fill={color}
          stroke="#ffffff"
          strokeWidth="2"
        />
      ))}
      <text x={padding.left} y={height - 4} fill="#9ca3af" fontSize="10" fontWeight="700">
        {firstLabel}
      </text>
      <text x={width - padding.right} y={height - 4} textAnchor="end" fill="#9ca3af" fontSize="10" fontWeight="700">
        {lastLabel}
      </text>
    </svg>
  );
}

function ReportSection({ title, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-slate-50/60">
      <div className="border-b border-gray-100 bg-white px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-gray-800">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          {title}
        </h3>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </section>
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWeeklyAnomalyResult(response, startDate, endDate) {
  if (Array.isArray(response)) {
    return selectAnomalyForReportPeriod(response, startDate, endDate);
  }

  const normalized = response ? normalizeAnomaly(response) : null;
  return isAnomalyInReportPeriod(normalized, startDate, endDate) ? normalized : null;
}

function selectAnomalyForReportPeriod(results, startDate, endDate) {
  const normalized = (Array.isArray(results) ? results : [])
    .map(normalizeAnomaly)
    .filter(anomaly => anomaly.analysisDate);

  return getLatestAnomaly(normalized.filter(anomaly => isAnomalyInReportPeriod(anomaly, startDate, endDate)));
}

function isAnomalyInReportPeriod(anomaly, startDate, endDate) {
  if (!anomaly?.analysisDate) return false;
  if (startDate && anomaly.analysisDate < startDate) return false;
  if (endDate && anomaly.analysisDate > endDate) return false;
  return true;
}

function removeReportAnomalySummary(items, anomalySummary) {
  if (!anomalySummary) return items;
  return items.filter(item => item !== anomalySummary);
}

function insertAnomalyAnalysisText(items, anomalyText) {
  if (items.length <= 1) return [...items, anomalyText];

  return [
    items[0],
    anomalyText,
    ...items.slice(1),
  ];
}

function buildReportChartData(report, records = []) {
  if (!report) return [];

  const startDate = report.startDate || '';
  const endDate = report.endDate || '';

  return records
    .filter((record) => {
      if (!record.date) return false;
      if (startDate && record.date < startDate) return false;
      if (endDate && record.date > endDate) return false;
      return true;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map(record => ({
      date: record.date,
      dateLabel: record.displayDate || String(record.date).slice(5),
      weight: toChartNumber(record.weight),
      bpSystolic: toChartNumber(record.bpSystolic),
      fbs: toChartNumber(record.fbs),
      uf: toChartNumber(record.uf),
    }));
}

function toChartNumber(value) {
  if (value === '' || value === '-' || value === null || value === undefined) return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getLatestMetricValue(data, dataKey) {
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const value = data[index]?.[dataKey];
    if (value !== null && value !== undefined) return value;
  }

  return null;
}
