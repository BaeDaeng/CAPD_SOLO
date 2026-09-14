import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import BackToPatientButton from '../../components/BackToPatientButton';
import Card from '../../components/Card';
import { surveyApi } from '../../api/apiClient';
import { addDays, toDateKey } from '../../api/adapters';
import { useDoctorPatientProfile, useDoctorQuestions, useDoctorReservationsByDateRange } from '../../hooks/usePatientData';
import { formatAge } from '../../utils/ageFormat';

const RESERVATION_LOOKBACK_DAYS = 30;
const RESERVATION_LOOKAHEAD_DAYS = 90;

export default function QuestionManagePage() {
  const { id } = useParams();
  const patientId = Number(id);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
  const { data: questions = [], reload } = useDoctorQuestions(reservationId);

  const counts = {
    PENDING: questions.filter(question => question.status === 'PENDING').length,
    APPROVED: questions.filter(question => question.status === 'APPROVED').length,
    REJECTED: questions.filter(question => question.status === 'REJECTED').length,
  };

  const filteredQuestions = useMemo(() => (
    questions.filter(question => (question.status || 'PENDING') === activeTab)
  ), [questions, activeTab]);

  const handleGenerateQuestion = () => {
    if (!reservationId) {
      alert('질문을 생성할 예약 건이 없습니다.');
      return;
    }

    setIsCreateModalOpen(true);
  };

  const handleAutoGenerate = async () => {
    try {
      await surveyApi.createQuestion(reservationId);
      await reload();
      setActiveTab('PENDING');
      setIsCreateModalOpen(false);
    } catch (error) {
      alert(error.message || '질문 생성에 실패했습니다.');
    }
  };

  const handleManualGenerate = async (payload) => {
    try {
      await surveyApi.createManualQuestion(reservationId, payload);
      await reload();
      setActiveTab('PENDING');
      setIsCreateModalOpen(false);
    } catch (error) {
      alert(error.message || '수동 질문 생성에 실패했습니다. 백엔드의 수동 질문 생성 API 지원 여부를 확인해 주세요.');
    }
  };

  const handleUpdateStatus = async (questionId, action) => {
    try {
      if (action === 'APPROVED') await surveyApi.approveQuestion(questionId);
      if (action === 'REJECTED') await surveyApi.rejectQuestion(questionId);
      if (action === 'PENDING') await surveyApi.resetQuestion(questionId);
      await reload();
    } catch (error) {
      alert(error.message || '질문 상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-4 animate-in fade-in duration-500 md:p-6 custom-scrollbar">
      <div className="mb-5 shrink-0">
        <BackToPatientButton />

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900">
              <span className="rounded-xl bg-blue-100 p-2 text-xl text-blue-600">📋</span>
              AI 설문 승인 및 관리
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              <span className="font-bold text-blue-600">{patient?.name || '환자'}</span> 환자의 예약별 AI 추천 질문입니다.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <button
              onClick={handleGenerateQuestion}
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 md:w-auto"
            >
              질문 생성하기
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[560px] flex-1 grid-cols-1 gap-6 xl:min-h-0 xl:grid-cols-12">
        <aside className="flex min-h-0 flex-col gap-4 xl:col-span-3 overflow-y-auto custom-scrollbar pr-1">
          <Card className="border-none p-5 shadow-sm shrink-0">
            <h3 className="mb-4 text-sm font-black text-gray-800">환자 요약</h3>
            <div className="space-y-1">
              <InfoRow label="환자명" value={patient?.name || '-'} />
              <InfoRow label="성별/나이" value={patient ? `${patient.sex} / ${formatAge(patient.age)}` : '-'} />
              <InfoRow label="전화번호" value={patient?.phone || '-'} />
              <InfoRow label="예약 일시" value={patientReservation ? `${patientReservation.date} ${patientReservation.time}` : '-'} />
            </div>
          </Card>

          <Card className="border-none p-5 shadow-sm shrink-0">
            <h3 className="mb-4 text-sm font-black text-gray-800">예약 건 선택</h3>
            <div className="flex flex-col gap-2">
              {patientReservations.map(reservation => {
                const isActive = String(reservation.reservationId) === String(reservationId);

                return (
                  <button
                    key={reservation.reservationId}
                    type="button"
                    onClick={() => setSelectedReservationId(reservation.reservationId)}
                    className={`rounded-xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-100 bg-slate-50 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-slate-900">
                          {reservation.type}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-500">
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
                  조회 범위 내 예약이 없습니다.
                </div>
              )}
            </div>
          </Card>

          <Card className="border-none p-5 shadow-sm shrink-0">
            <h3 className="mb-4 text-sm font-black text-gray-800">설문 처리 현황</h3>
            <div className="flex flex-col gap-3">
              <StatusBox label="승인 대기" value={`${counts.PENDING}건`} tone="blue" />
              <StatusBox label="승인 완료" value={`${counts.APPROVED}건`} tone="emerald" />
              <StatusBox label="거절됨" value={`${counts.REJECTED}건`} tone="rose" />
            </div>
          </Card>
        </aside>

        <main className="flex min-h-0 flex-col xl:col-span-9">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="shrink-0 border-b border-gray-100 bg-slate-50 px-4 pt-4">
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <TabButton active={activeTab === 'PENDING'} onClick={() => setActiveTab('PENDING')} color="blue">
                  승인 대기 ({counts.PENDING})
                </TabButton>
                <TabButton active={activeTab === 'APPROVED'} onClick={() => setActiveTab('APPROVED')} color="emerald">
                  승인 완료 ({counts.APPROVED})
                </TabButton>
                <TabButton active={activeTab === 'REJECTED'} onClick={() => setActiveTab('REJECTED')} color="rose">
                  거절됨 ({counts.REJECTED})
                </TabButton>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-slate-50/50">
              {!reservationId ? (
                <EmptyState text="질문을 관리할 예약 건을 선택할 수 없습니다." />
              ) : filteredQuestions.length === 0 ? (
                <EmptyState text="해당하는 질문이 없습니다." />
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredQuestions.map((question) => (
                    <div key={question.questionId} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="rounded-lg bg-purple-100 px-2.5 py-1 text-[10px] font-black tracking-wider text-purple-700">
                          {formatQuestionType(question.type)}
                        </span>
                        {question.status !== 'APPROVED' && (
                          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                            {formatQuestionStatus(question.status)}
                          </span>
                        )}
                      </div>

                      <div className="mb-5">
                        <h2 className="text-lg font-black text-gray-900 mb-3">Q. {question.text}</h2>
                        {question.options.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {question.options.map((option) => (
                              <div key={option} className="rounded-xl border border-gray-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-gray-600">
                                {option}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {question.reason && (
                        <div className="mb-5 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-black text-blue-800">
                            <span className="text-sm">AI</span> AI 추천 이유
                          </h4>
                          <p className="text-sm font-medium text-blue-900/80 leading-relaxed">
                            {question.reason}
                          </p>
                        </div>
                      )}

                      {activeTab === 'PENDING' && (
                        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                          <button onClick={() => handleUpdateStatus(question.questionId, 'REJECTED')} className="rounded-xl px-5 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50">
                            거절하기
                          </button>
                          <button onClick={() => handleUpdateStatus(question.questionId, 'APPROVED')} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95">
                            승인하기
                          </button>
                        </div>
                      )}

                      {activeTab !== 'PENDING' && (
                        <div className="flex items-center justify-end border-t border-gray-100 pt-4">
                          <button onClick={() => handleUpdateStatus(question.questionId, 'PENDING')} className="text-xs font-bold text-gray-400 underline underline-offset-2 hover:text-gray-600">
                            대기 상태로 되돌리기
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {isCreateModalOpen && (
        <QuestionCreateModal
          reservation={patientReservation}
          onAutoGenerate={handleAutoGenerate}
          onManualGenerate={handleManualGenerate}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

function QuestionCreateModal({ reservation, onAutoGenerate, onManualGenerate, onClose }) {
  const [mode, setMode] = useState(null);
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [question, setQuestion] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAutoClick = async () => {
    setIsSubmitting(true);
    try {
      await onAutoGenerate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return;

    const options = optionsText
      .split(',')
      .map(option => option.trim())
      .filter(Boolean);
    const payload = {
      question: question.trim(),
      type,
    };

    if (type === 'MULTIPLE_CHOICE') {
      payload.options = JSON.stringify(options);
    }

    setIsSubmitting(true);
    await onManualGenerate(payload);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">질문 생성하기</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {reservation?.date} {reservation?.time}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-xl font-black text-slate-400 hover:bg-slate-50 hover:text-slate-700">
              X
            </button>
          </div>
        </div>

        {!mode ? (
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleAutoClick}
              disabled={isSubmitting}
              className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left transition-all hover:border-blue-300 hover:bg-blue-100 disabled:cursor-wait disabled:border-slate-100 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <div className="text-lg font-black text-blue-700">{isSubmitting ? '생성 중' : '자동'}</div>
              <p className="mt-2 text-sm font-bold leading-relaxed text-blue-900/70">
                누르면 바로 AI가 환자 기록을 참고해 질문을 생성합니다.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              disabled={isSubmitting}
              className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-left transition-all hover:border-slate-300 hover:bg-slate-100"
            >
              <div className="text-lg font-black text-slate-800">수동</div>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-500">
                질문 유형, 질문 내용, 선택지를 직접 입력합니다.
              </p>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4 p-6">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">질문 유형</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="MULTIPLE_CHOICE">객관식</option>
                <option value="YES_NO">예/아니오</option>
                <option value="DESCRIPTIVE">주관식</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">질문</label>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="h-28 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="환자에게 물어볼 질문을 입력하세요."
                required
              />
            </div>
            {type === 'MULTIPLE_CHOICE' && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">선택지</label>
                <input
                  value={optionsText}
                  onChange={(event) => setOptionsText(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="예: 없음, 조금 있음, 심함"
                />
                <p className="mt-1 text-xs font-bold text-slate-400">쉼표로 구분해 입력합니다.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setMode(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 hover:bg-slate-50">
                이전
              </button>
              <button type="submit" disabled={!question.trim() || isSubmitting} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-300">
                {isSubmitting ? '생성 중' : '수동 생성'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 text-sm last:border-b-0 last:pb-0">
      <span className="font-bold text-gray-400">{label}</span>
      <span className="font-black text-gray-800">{value}</span>
    </div>
  );
}

function StatusBox({ label, value, tone }) {
  const classes = {
    blue: 'bg-blue-50 text-blue-800',
    emerald: 'bg-emerald-50 text-emerald-800',
    rose: 'bg-rose-50 text-rose-800',
  };

  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${classes[tone]}`}>
      <span className="text-xs font-bold">{label}</span>
      <span className="text-lg font-black">{value}</span>
    </div>
  );
}

function formatQuestionType(type) {
  const labels = {
    YES_NO: '단답식',
    SHORT_ANSWER: '단답식',
    SHORT: '단답식',
    MULTIPLE_CHOICE: '객관식',
    CHOICE: '객관식',
    DESCRIPTIVE: '주관식',
    SUBJECTIVE: '주관식',
    LONG_ANSWER: '주관식',
  };

  return labels[String(type || '').toUpperCase()] || '질문';
}

function formatQuestionStatus(status) {
  const labels = {
    PENDING: '승인 대기',
    REJECTED: '거절됨',
  };

  return labels[String(status || 'PENDING').toUpperCase()] || '';
}

function TabButton({ active, onClick, color, children }) {
  const activeClass = {
    blue: 'border-blue-600 text-blue-600',
    emerald: 'border-emerald-600 text-emerald-600',
    rose: 'border-rose-600 text-rose-600',
  }[color];

  return (
    <button onClick={onClick} className={`border-b-2 pb-3 text-sm font-bold transition-colors ${active ? activeClass : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {children}
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-3 text-4xl">📭</div>
      <h3 className="text-lg font-bold text-gray-800">{text}</h3>
    </div>
  );
}
