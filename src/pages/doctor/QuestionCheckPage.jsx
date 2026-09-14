import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackToPatientButton from '../../components/BackToPatientButton';
import Card from '../../components/Card';
import { addDays, toDateKey } from '../../api/adapters';
import { useDoctorAnswers, useDoctorPatientProfile, useDoctorReservationsByDateRange } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

const RESERVATION_LOOKBACK_DAYS = 30;
const RESERVATION_LOOKAHEAD_DAYS = 90;

export default function QuestionCheckPage() {
  const { id } = useParams();
  const patientId = Number(id);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const { data: patient } = useDoctorPatientProfile(id);
  const reservationStartDate = toDateKey(addDays(toDateKey(), -RESERVATION_LOOKBACK_DAYS));
  const reservationEndDate = toDateKey(addDays(toDateKey(), RESERVATION_LOOKAHEAD_DAYS));
  const { data: reservations = [] } = useDoctorReservationsByDateRange(reservationStartDate, reservationEndDate);
  const patientReservations = useMemo(() => (
    reservations
      .filter(reservation => Number(reservation.patientId) === patientId)
      .sort((a, b) => String(b.reservationDate).localeCompare(String(a.reservationDate)))
  ), [patientId, reservations]);
  const patientReservation = patientReservations.find(reservation => String(reservation.reservationId) === String(selectedReservationId)) || patientReservations[0];
  const reservationId = patientReservation?.reservationId;
  const { data: answers = [] } = useDoctorAnswers(reservationId);

  const totalSurveyCount = useMemo(() => answers.length, [answers]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="mb-5 shrink-0">
        <BackToPatientButton />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
              <span className="rounded-xl bg-blue-100 p-2 text-xl text-blue-600">답</span>
              설문 응답 확인
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              <span className="font-bold text-blue-600">{patient?.name || '환자'}</span> 환자의 예약별 설문 응답입니다.
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-3 md:w-auto">
            <HeaderStat label="예약 일시" value={patientReservation ? `${patientReservation.date} ${patientReservation.time}` : '-'} color="blue" />
            <HeaderStat label="전체 응답" value={`${totalSurveyCount}개`} color="emerald" />
          </div>
        </div>
      </div>

      <div className="grid min-h-[560px] flex-1 grid-cols-1 gap-6 xl:min-h-0 xl:grid-cols-12">
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar xl:col-span-3">
          <Card className="shrink-0 border-none p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black text-gray-800">환자 요약</h3>
            <div className="space-y-1">
              <InfoRow label="환자명" value={patient?.name || '-'} />
              <InfoRow label="성별/나이" value={patient ? `${patient.sex} / ${formatAge(patient.age)}` : '-'} />
              <InfoRow label="전화번호" value={patient?.phone || '-'} />
              <InfoRow label="예약 일시" value={patientReservation ? `${patientReservation.date} ${patientReservation.time}` : '-'} />
            </div>
          </Card>

          <Card className="shrink-0 border-none p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-black text-gray-800">예약 건 선택</h3>
            <div className="flex flex-col gap-2">
              {patientReservations.map(reservation => {
                const isActive = String(reservation.reservationId) === String(reservationId);

                return (
                  <button
                    key={reservation.reservationId}
                    type="button"
                    onClick={() => setSelectedReservationId(reservation.reservationId)}
                    className={`rounded-xl border px-4 py-3 text-left shadow-sm transition-all ${
                      isActive
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-gray-900">
                          {reservation.type}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-gray-500">
                          {reservation.date} {reservation.time}
                        </div>
                      </div>
                      {isActive && <span className="text-[10px] font-bold text-blue-500">선택됨</span>}
                    </div>
                  </button>
                );
              })}

              {patientReservations.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
                  조회 범위 안에 예약이 없습니다.
                </div>
              )}
            </div>
          </Card>
        </aside>

        <main className="flex min-h-0 flex-col xl:col-span-9">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="shrink-0 border-b border-gray-100 bg-slate-50 px-5 py-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                  Appointment Survey Responses
                </div>
                <h2 className="mt-1 text-lg font-black text-gray-900">예약별 설문 내역</h2>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-4 custom-scrollbar md:p-6">
              {!reservationId ? (
                <EmptyState text="설문 응답을 확인할 예약 건이 없습니다." />
              ) : answers.length === 0 ? (
                <EmptyState text="제출된 설문 응답이 없습니다." />
              ) : (
                <div className="flex flex-col gap-4">
                  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="bg-blue-50 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-gray-900">설문 응답</span>
                      </div>
                      <div className="mt-2 text-xs font-bold text-gray-400">
                        {patientReservation.date} {patientReservation.time} · 응답 {answers.length}개
                      </div>
                    </div>

                    <div className="border-t border-gray-100 p-5">
                      <div className="flex flex-col gap-4">
                        {answers.map((answer, index) => (
                          <AnswerCard key={answer.answerId || `${answer.questionId}-${index}`} item={answer} />
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AnswerCard({ item }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex gap-3">
        <h3 className="text-base font-black leading-relaxed text-gray-900">
          {item.question}
        </h3>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700">
        {item.answer}
      </div>
      {item.createdAt && (
        <div className="mt-3 text-right text-[11px] font-bold text-gray-400">
          {item.createdAt}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5 text-sm last:border-b-0 last:pb-0">
      <span className="shrink-0 font-bold text-gray-400">{label}</span>
      <span className="break-all text-right font-black text-gray-800">{value}</span>
    </div>
  );
}

function HeaderStat({ label, value, color }) {
  const styles = {
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  };

  const valueStyles = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-right shadow-sm ${styles[color]}`}>
      <div className="text-[10px] font-black">{label}</div>
      <div className={`mt-1 text-lg font-black ${valueStyles[color]}`}>{value}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 text-4xl">·</div>
      <h3 className="text-lg font-bold text-gray-800">{text}</h3>
    </div>
  );
}
