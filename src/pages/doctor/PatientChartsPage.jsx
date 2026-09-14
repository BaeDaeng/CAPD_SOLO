import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, } from 'recharts';
import BackToPatientButton from '../../components/BackToPatientButton';
import { useDoctorPatientBundle } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

const MAX_EXCHANGE_COUNT = 5;

const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    return Number(value).toLocaleString();
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-xl border border-slate-100 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
            <div className="mb-1 font-black text-slate-900">{label}</div>
            <div className="space-y-1">
                {payload.map(item => (
                    <div key={`${item.name}-${item.dataKey}`} className="flex items-center justify-between gap-4">
                        <span className="font-bold text-slate-500">{item.name}</span>
                        <span className="font-black" style={{ color: item.color }}>
                            {formatNumber(item.value)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function PatientChartsPage() {
    const { id } = useParams();
    const { data, isLoading } = useDoctorPatientBundle(id);
    const patient = data.patient;
    const records = data.records;

    const chartData = useMemo(() => {
        const source = records.slice(0, 14).reverse() || [];

        return source.map((item) => {
            const exchanges = item.exchanges || [];

            return {
                date: item.displayDate || item.date,
                totalUf: item.uf,
                weight: item.weight,
                systolic: item.bpSystolic,
                diastolic: item.bpDiastolic,
                fbs: item.fbs || 0,
                urineCount: item.urineCount || 0,
                cloudyYn: item.cloudyDialysate ? 1 : 0,
                submitCount: exchanges.length,
            };
        });
    }, [records]);

    const latest = useMemo(() => {
        return chartData[chartData.length - 1] || {};
    }, [chartData]);

    const latestExchangeData = useMemo(() => {
        const latestHistory = records[0];
        const exchanges = latestHistory?.exchanges || [];

        return exchanges.slice(0, MAX_EXCHANGE_COUNT).map((exchange, index) => ({
            round: `${index + 1}회차`,
            infused: exchange.infused ?? 0,
            drained: exchange.drained ?? 0,
            uf: exchange.uf ?? 0,
            concentration: Number(exchange.concentration) || 0,
        }));
    }, [records]);

    if (isLoading) {
        return <div className="p-8 text-sm font-bold text-slate-400">차트 데이터를 불러오는 중입니다.</div>;
    }

    if (!patient) {
        return <div className="p-8 text-sm font-bold text-slate-400">환자 정보를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="flex h-full min-w-0 flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-5 custom-scrollbar">
            <div className="mb-3 shrink-0">
                <BackToPatientButton />

                <div className="mt-2 flex items-end justify-between gap-4">
                    <div>
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
                            CAPD Chart Review
                        </div>
                        <h1 className="mt-1 text-xl font-black text-slate-900">
                            {patient.name} 환자 상세 차트
                        </h1>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Patient</div>
                        <div className="text-sm font-black text-slate-900">
                            {patient.sex}/{formatAge(patient.age)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 auto-rows-[minmax(220px,1fr)] grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                <ChartPanel title="일 단위 종합 추이">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                            <YAxis yAxisId="uf" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis yAxisId="vital" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                            <ReferenceLine yAxisId="uf" y={800} stroke="#ef4444" strokeDasharray="4 4" />
                            <Area yAxisId="uf" type="monotone" dataKey="totalUf" name="총 제수량" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} />
                            <Line yAxisId="vital" type="monotone" dataKey="weight" name="체중" stroke="#7c3aed" strokeWidth={3} dot={false} />
                            <Line yAxisId="vital" type="monotone" dataKey="systolic" name="수축기" stroke="#ef4444" strokeWidth={3} dot={false} />
                            <Line yAxisId="vital" type="monotone" dataKey="fbs" name="공복혈당" stroke="#059669" strokeWidth={3} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title={`최근 회차별 투석 기록 (${latest.submitCount || 0}회 제출)`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={latestExchangeData} margin={{ top: 8, right: 8, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="round" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 800 }} />
                            <YAxis yAxisId="volume" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis yAxisId="concentration" orientation="right" domain={[0, 4.25]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                            <Bar yAxisId="volume" dataKey="infused" name="주입량" fill="#bfdbfe" radius={[6, 6, 2, 2]} />
                            <Bar yAxisId="volume" dataKey="drained" name="배액량" fill="#93c5fd" radius={[6, 6, 2, 2]} />
                            <Line yAxisId="volume" type="monotone" dataKey="uf" name="제수량" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                            <Line yAxisId="concentration" type="monotone" dataKey="concentration" name="투석액 농도" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="총 제수량 추이">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine y={800} stroke="#ef4444" strokeDasharray="4 4" />
                            <Area type="monotone" dataKey="totalUf" name="총 제수량" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="체중 변화">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line type="monotone" dataKey="weight" name="체중" stroke="#7c3aed" strokeWidth={4} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="혈압 / 공복혈당">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
                            <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" />
                            <ReferenceLine y={126} stroke="#f59e0b" strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="systolic" name="수축기 혈압" stroke="#ef4444" strokeWidth={3} dot={false} />
                            <Line type="monotone" dataKey="diastolic" name="이완기 혈압" stroke="#f97316" strokeWidth={3} dot={false} />
                            <Bar dataKey="fbs" name="공복혈당" fill="#bbf7d0" radius={[6, 6, 2, 2]} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

                <ChartPanel title="소변횟수 / 복막액 혼탁 여부">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: -4 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />

                            {/* 소변 횟수 축 */}
                            <YAxis yAxisId="urine" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} domain={[0, 'dataMax + 2']} />

                            {/* 혼탁 여부 축 */}
                            <YAxis yAxisId="cloudy" orientation="right" domain={[0, 1.2]} ticks={[0, 1]} tickFormatter={(value) => (value === 1 ? '혼탁' : '정상')} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />

                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />

                            <Bar yAxisId="cloudy" dataKey="cloudyYn" name="복막액 혼탁" fill="rgba(244, 63, 94, 0.4)" barSize={20} radius={[4, 4, 0, 0]} />

                            <Area yAxisId="urine" type="monotone" dataKey="urineCount" name="소변횟수" stroke="#0f766e" fill="#ccfbf1" fillOpacity={0.8} strokeWidth={3} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </ChartPanel>

            </div>
        </div>
    );
}

function ChartPanel({ title, children }) {
    return (
        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 shrink-0">
                <h2 className="text-sm font-black text-slate-900">{title}</h2>
            </div>
            <div className="min-h-0 flex-1">
                {children}
            </div>
        </section>
    );
}
