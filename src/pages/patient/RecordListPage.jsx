import React, { useEffect, useState } from 'react';
import Card from '../../components/Card';
import { toDateKey } from '../../api/adapters';
import { usePatientCapdRecords } from '../../hooks/usePatientData';

export default function RecordListPage() {
  const { data: recordsData = [], isLoading } = usePatientCapdRecords();
  const [navDate, setNavDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (recordsData.length === 0) return;

    const latestDate = new Date(recordsData[0].date);
    const timer = window.setTimeout(() => {
      setSelectedDate(latestDate);
      setNavDate(new Date(latestDate.getFullYear(), latestDate.getMonth(), 1));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [recordsData]);

  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setNavDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setNavDate(new Date(year, month + 1, 1));

  const handleRecordClick = (dateStr) => {
    const [dateYear, dateMonth, dateDay] = dateStr.split('-');
    setSelectedDate(new Date(dateYear, dateMonth - 1, dateDay));
    setNavDate(new Date(dateYear, dateMonth - 1, 1));
  };

  const selectedDateStr = toDateKey(selectedDate);
  const activeRecord = recordsData.find(record => record.date === selectedDateStr);

  return (
    <div className="max-w-6xl mx-auto pb-10 animate-in fade-in duration-500 relative">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-gray-900">투석 기록 확인</h1>
        <p className="text-gray-500 mt-2">
          {isLoading ? '투석 기록을 불러오는 중입니다.' : '달력에서 날짜를 선택하여 과거의 기록을 확인할 수 있습니다. (수정 불가)'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {activeRecord ? (
            <>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative">
                <div className="text-xs font-bold text-blue-600 uppercase mb-1">{selectedDateStr}</div>
                <div className="text-2xl font-black text-gray-900 mb-6">
                  총 제수량 <span className={activeRecord.totalUf >= 0 ? 'text-blue-600' : 'text-red-500'}>{formatSignedNumber(activeRecord.totalUf)}mL</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <SummaryBox label="혈압" value={activeRecord.bp} />
                  <SummaryBox label="체중" value={activeRecord.weight ? `${activeRecord.weight} kg` : '-'} />
                  <SummaryBox label="공복혈당" value={activeRecord.fbs ? `${activeRecord.fbs} mg/dL` : '-'} />
                  <SummaryBox
                    label="소변 횟수/혼탁도"
                    value={`${activeRecord.urineCount || 0}회 / ${activeRecord.turbidity}`}
                    accent={activeRecord.turbidity === '혼탁' ? 'text-red-500' : 'text-emerald-500'}
                  />
                </div>

                {activeRecord.memo && (
                  <div className="bg-yellow-50/50 p-3 rounded-xl border border-yellow-100">
                    <div className="text-[11px] font-bold text-yellow-600 mb-1">오늘의 메모</div>
                    <div className="text-sm text-gray-700">{activeRecord.memo}</div>
                  </div>
                )}
              </div>

              <Card className="p-0 overflow-hidden border-none shadow-md">
                <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800">투석 교환 일지</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">교환 시각</th>
                        <th className="px-6 py-4">농도 (%)</th>
                        <th className="px-6 py-4 text-right">주입량 (mL)</th>
                        <th className="px-6 py-4 text-right">배액량 (mL)</th>
                        <th className="px-6 py-4 text-right text-blue-600">제수량</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {activeRecord.exchanges.map((exchange, index) => (
                        <tr key={`${exchange.id || exchange.time}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-800">{exchange.time}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-gray-600">{exchange.concentration}%</span>
                          </td>
                          <td className="px-6 py-4 text-right text-sm text-gray-500 font-mono">{exchange.infused}</td>
                          <td className="px-6 py-4 text-right text-sm text-gray-500 font-mono">{exchange.drained}</td>
                          <td className="px-6 py-4 text-right font-black text-blue-600 font-mono">
                            {exchange.uf > 0 ? `+${exchange.uf}` : exchange.uf}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="bg-white rounded-3xl p-20 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{selectedDateStr}</h3>
              <p className="text-gray-400 font-medium">선택한 날짜에 기록된 투석 데이터가 없습니다.</p>
            </div>
          )}
        </div>

        <aside className="sticky top-6">
          <Card className="p-5 border-none shadow-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-gray-900 text-lg">{year}년 {month + 1}월</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded text-gray-400">◀</button>
                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded text-gray-400">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['일','월','화','수','목','금','토'].map(day => (
                <div key={day} className="text-[10px] font-bold text-gray-300 mb-3">{day}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`blank-${index}`} className="h-10"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                const currentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasRecord = recordsData.some(record => record.date === currentStr);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`h-10 flex flex-col items-center justify-center rounded-2xl text-sm transition-all relative ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-lg scale-105 z-10'
                        : hasRecord
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'text-gray-600 hover:bg-blue-50'
                    }`}
                  >
                    {day}
                    {hasRecord && (
                      <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-blue-400'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">최근 기록 내역</span>
              </div>
              <div className="space-y-2">
                {recordsData.map(record => {
                  const isRecordSelected = record.date === selectedDateStr;
                  return (
                    <button
                      key={record.date}
                      onClick={() => handleRecordClick(record.date)}
                      className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${
                        isRecordSelected ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                    >
                      <span className={`text-sm font-bold ${isRecordSelected ? 'text-blue-700' : 'text-gray-700'}`}>{record.date}</span>
                      <span className={`text-xs font-black ${Number(record.totalUf || 0) < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {formatSignedNumber(record.totalUf)}mL
                      </span>
                    </button>
                  );
                })}
                {recordsData.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-100 p-4 text-center text-xs font-bold text-gray-400">
                    저장된 기록이 없습니다.
                  </div>
                )}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SummaryBox({ label, value, accent = '' }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl">
      <div className="text-[11px] font-bold text-gray-400 mb-1">{label}</div>
      <div className={`text-sm font-black text-gray-800 ${accent}`}>{value}</div>
    </div>
  );
}

function formatSignedNumber(value) {
  const numberValue = Number(value || 0);
  return numberValue > 0 ? `+${numberValue}` : String(numberValue);
}
