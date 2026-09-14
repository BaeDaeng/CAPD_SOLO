import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import { surveyApi } from '../../api/apiClient';
import { toDateKey } from '../../api/adapters';
import { getUpcomingReservation, usePatientAnswers, usePatientQuestions, usePatientReservations } from '../../hooks/usePatientData';

const SURVEY_DEADLINE_MESSAGE = '예약 전날까지만 작성 가능합니다.';
const SUBMITTED_QUESTION_MESSAGE = '이미 답변한 질문입니다. 제출했던 답변을 확인할 수 있습니다.';

export default function HealthSurveyPage() {
  const navigate = useNavigate();
  const { data: reservations = [], isLoading: isReservationsLoading } = usePatientReservations();
  const [selectedReservationId, setSelectedReservationId] = useState();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [navDate, setNavDate] = useState(new Date());
  const selectedDateStr = toDateKey(selectedDate);
  const year = navDate.getFullYear();
  const month = navDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const writableReservations = useMemo(() => (
    reservations.filter(reservation => isBeforeAppointmentDate(reservation.date))
  ), [reservations]);
  const fallbackReservation = getUpcomingReservation(reservations);
  const selectedDateReservations = useMemo(() => (
    reservations.filter(reservation => reservation.date === selectedDateStr)
  ), [reservations, selectedDateStr]);
  const activeReservation = useMemo(() => (
    selectedReservationId === null
      ? selectedDateReservations[0] || null
      : reservations.find(reservation => String(reservation.reservationId) === String(selectedReservationId)) ||
        selectedDateReservations[0] ||
        writableReservations[0] ||
        fallbackReservation ||
        reservations[0] ||
        null
  ), [fallbackReservation, reservations, selectedDateReservations, selectedReservationId, writableReservations]);
  const { data: surveyQuestions = [], isLoading: isQuestionsLoading, reload } = usePatientQuestions(activeReservation?.reservationId);
  const { data: submittedAnswers = [], reload: reloadSubmittedAnswers } = usePatientAnswers(activeReservation?.reservationId);

  const [answersByReservationId, setAnswersByReservationId] = useState({});
  const [openHelpQuestionId, setOpenHelpQuestionId] = useState(null);
  const [helpTextByQuestionId, setHelpTextByQuestionId] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyStatusByReservationId, setSurveyStatusByReservationId] = useState({});

  const activeReservationKey = String(activeReservation?.reservationId || '');
  const draftAnswers = useMemo(
    () => answersByReservationId[activeReservationKey] || {},
    [activeReservationKey, answersByReservationId],
  );
  const submittedAnswerMap = useMemo(
    () => buildSubmittedAnswerMap(surveyQuestions, submittedAnswers),
    [submittedAnswers, surveyQuestions],
  );
  const visibleAnswers = useMemo(
    () => ({ ...submittedAnswerMap, ...draftAnswers }),
    [draftAnswers, submittedAnswerMap],
  );
  const canWriteSurvey = isBeforeAppointmentDate(activeReservation?.date);
  const pendingQuestions = useMemo(
    () => surveyQuestions.filter(question => !isQuestionAlreadyAnswered(question, submittedAnswerMap)),
    [submittedAnswerMap, surveyQuestions],
  );
  const submittedQuestionCount = surveyQuestions.length - pendingQuestions.length;
  const answeredCount = surveyQuestions.filter(question => (
    isQuestionAlreadyAnswered(question, submittedAnswerMap) ||
    hasNonEmptyVisibleAnswer(question, visibleAnswers)
  )).length;
  const pendingAnsweredCount = pendingQuestions.filter(question => (
    hasNonEmptyVisibleAnswer(question, visibleAnswers)
  )).length;
  const hasAnsweredQuestions = submittedQuestionCount > 0;
  const hasPendingQuestions = pendingQuestions.length > 0;
  const isSurveyComplete = surveyQuestions.length > 0 && !hasPendingQuestions;
  const canSubmitSurvey = canWriteSurvey && hasPendingQuestions && pendingAnsweredCount === pendingQuestions.length;
  const monthReservations = useMemo(() => (
    reservations
      .filter((reservation) => {
        const reservationDate = parseDateKey(reservation.date);
        return reservationDate.getFullYear() === year && reservationDate.getMonth() === month;
      })
      .sort((a, b) => String(a.reservationDate).localeCompare(String(b.reservationDate)))
  ), [month, reservations, year]);

  useEffect(() => {
    if (reservations.length === 0 || selectedReservationId !== undefined) return;

    const initialReservation = fallbackReservation || writableReservations[0] || reservations[0];
    if (!initialReservation) return;

    const initialDate = parseDateKey(initialReservation.date);

    setSelectedReservationId(initialReservation.reservationId);
    setSelectedDate(initialDate);
    setNavDate(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  }, [fallbackReservation, reservations, selectedReservationId, writableReservations]);

  useEffect(() => {
    let ignore = false;

    const loadSurveyStatuses = async () => {
      if (reservations.length === 0) {
        setSurveyStatusByReservationId({});
        return;
      }

      const entries = await Promise.all(reservations.map(async (reservation) => {
        const reservationId = reservation.reservationId;

        if (!isBeforeAppointmentDate(reservation.date)) {
          return [String(reservationId), 'closed'];
        }

        try {
          const [questions, answers] = await Promise.all([
            surveyApi.getPatientQuestions(reservationId).catch(emptyOnNotFound),
            surveyApi.getPatientAnswers(reservationId).catch(emptyOnNotFound),
          ]);

          return [String(reservationId), getSurveyCompletionState(questions || [], answers || [])];
        } catch {
          return [String(reservationId), 'available'];
        }
      }));

      if (!ignore) {
        setSurveyStatusByReservationId(Object.fromEntries(entries));
      }
    };

    void loadSurveyStatuses();

    return () => {
      ignore = true;
    };
  }, [reservations]);

  const headerMessage = useMemo(() => {
    if (isReservationsLoading || isQuestionsLoading) return '설문 정보를 불러오는 중입니다.';
    if (!activeReservation) return '선택한 날짜에 예약이 없어 작성할 설문이 없습니다.';
    if (surveyQuestions.length === 0) return '현재 승인된 설문 문항이 없습니다.';
    if (!canWriteSurvey) return '예약일이 지나 설문을 작성할 수 없습니다. 문항과 기존 답변은 확인할 수 있습니다.';
    if (isSurveyComplete) return '이미 답변한 설문입니다. 제출했던 답변을 아래에서 확인할 수 있습니다.';
    if (hasAnsweredQuestions) return '이미 답변한 질문과 새 질문이 함께 있습니다. 답변하지 않은 질문만 추가로 작성해 주세요.';
    return `현재 겪는 증상이 있는 그대로 답변해 주세요. ${SURVEY_DEADLINE_MESSAGE}`;
  }, [
    activeReservation,
    canWriteSurvey,
    hasAnsweredQuestions,
    isQuestionsLoading,
    isReservationsLoading,
    isSurveyComplete,
    surveyQuestions.length,
  ]);

  const handleAnswer = (question, value, options = {}) => {
    if (!canWriteSurvey || !activeReservationKey || isQuestionAlreadyAnswered(question, submittedAnswerMap)) return;

    setAnswersByReservationId(prev => ({
      ...prev,
      [activeReservationKey]: getNextReservationAnswers(
        prev[activeReservationKey] || {},
        question.questionId,
        value,
        options,
      ),
    }));
  };

  const handlePrevMonth = () => setNavDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setNavDate(new Date(year, month + 1, 1));

  const handleDateClick = (day) => {
    const nextDate = new Date(year, month, day);
    const nextDateStr = toDateKey(nextDate);
    const reservationOnDate = reservations.find(reservation => reservation.date === nextDateStr);

    setSelectedDate(nextDate);
    setSelectedReservationId(reservationOnDate?.reservationId ?? null);
    setOpenHelpQuestionId(null);
  };

  const handleReservationSelect = (reservation) => {
    const nextDate = parseDateKey(reservation.date);

    setSelectedReservationId(reservation.reservationId);
    setSelectedDate(nextDate);
    setNavDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setOpenHelpQuestionId(null);
  };

  const handleQuestionHelpClick = async (question) => {
    const questionId = question.questionId;
    const localHelpText = getQuestionHelpText(question);

    setOpenHelpQuestionId(prev => (prev === questionId ? null : questionId));

    if (helpTextByQuestionId[questionId]) return;

    try {
      const helpText = getApiHelpText(await surveyApi.explainQuestion(questionId));
      setHelpTextByQuestionId(prev => ({
        ...prev,
        [questionId]: isSubmittedSurveyMessage(helpText)
          ? localHelpText || getAnsweredQuestionFallbackHelp(question)
          : helpText,
      }));
    } catch (error) {
      setHelpTextByQuestionId(prev => ({
        ...prev,
        [questionId]: localHelpText || getSafeHelpErrorMessage(error),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmitSurvey || !activeReservation) return;

    setIsSubmitting(true);

    try {
      await surveyApi.submitAnswers(activeReservation.reservationId, {
        answers: pendingQuestions.map(question => ({
          questionId: Number(question.questionId),
          answer: String(draftAnswers[String(question.questionId)]),
        })),
      });

      alert('답변이 성공적으로 담당 의료진에게 전달되었습니다.\n작성한 내용은 이 화면에서 다시 확인할 수 있습니다.');
      await reload();
      await reloadSubmittedAnswers();
      setAnswersByReservationId(prev => ({
        ...prev,
        [activeReservationKey]: {},
      }));
      setSurveyStatusByReservationId(prev => ({
        ...prev,
        [String(activeReservation.reservationId)]: 'submitted',
      }));
    } catch (error) {
      alert(error.message || '설문 제출에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (reservations.length === 0 && !isReservationsLoading) {
    return (
      <div className="mx-auto max-w-3xl pb-24 animate-in fade-in duration-500">
        <section className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black text-slate-500">
            !
          </div>
          <h1 className="text-2xl font-black text-slate-900">예정된 예약이 없습니다</h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            건강 설문은 예약과 연결된 승인 질문을 기준으로 작성할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate('/patient')}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-24 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-emerald-600">방문 전 확인</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">건강 설문 조사</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              {headerMessage}
            </p>
            {activeReservation && (
              <p className="mt-1 text-xs font-bold text-emerald-600">
                예약: {activeReservation.date} {activeReservation.time} · {activeReservation.doctorName} 선생님
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
            <div className="text-[11px] font-black text-emerald-600">진행률</div>
            <div className="mt-1 text-xl font-black text-emerald-700">{answeredCount}/{surveyQuestions.length}</div>
          </div>
        </div>
      </section>

      {!activeReservation ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black text-slate-500">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-900">선택한 날짜에 예약이 없습니다</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            달력의 점이 표시된 예약일을 선택하면 해당 예약의 건강 설문을 확인할 수 있습니다.
          </p>
        </section>
      ) : surveyQuestions.length === 0 && !isQuestionsLoading ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-black text-slate-500">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-900">작성할 질문이 없습니다</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            아직 의료진이 승인한 설문 문항이 없습니다.
          </p>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasAnsweredQuestions && (
            <section className="rounded-3xl border border-emerald-100 bg-emerald-50 px-5 py-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-black text-emerald-700">
                  ✓
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {hasPendingQuestions ? '일부 질문은 이미 답변했습니다' : '이미 답변한 설문입니다'}
                  </h2>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-emerald-700">
                    답변한 질문은 수정할 수 없고, 새로 추가된 미답변 질문만 작성할 수 있습니다.
                  </p>
                </div>
              </div>
            </section>
          )}

          {surveyQuestions.map((question) => {
            const isHelpOpen = openHelpQuestionId === question.questionId;
            const answerValue = getVisibleAnswer(question, visibleAnswers) || '';
            const isAnsweredQuestion = isQuestionAlreadyAnswered(question, submittedAnswerMap);
            const isQuestionDisabled = !canWriteSurvey || isAnsweredQuestion;
            const canShowHelpButton = !isAnsweredQuestion;
            const questionTitle = isAnsweredQuestion
              ? SUBMITTED_QUESTION_MESSAGE
              : !canWriteSurvey
                ? SURVEY_DEADLINE_MESSAGE
                : undefined;

            return (
              <section key={question.questionId} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {isAnsweredQuestion && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600">
                            답변 완료
                          </span>
                        )}
                        {!canWriteSurvey && !isAnsweredQuestion && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                            작성 마감
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-black leading-relaxed text-slate-900 md:text-lg">
                        {question.text}
                        {!isAnsweredQuestion && <span className="ml-1 text-red-500">*</span>}
                      </h2>
                    </div>
                  </div>

                  {canShowHelpButton && (
                    <button
                      type="button"
                      onClick={() => handleQuestionHelpClick(question)}
                      title="질문을 쉽게 설명해드려요"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition-all active:scale-95 ${
                        isHelpOpen
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      ?
                    </button>
                  )}
                </div>

                {canShowHelpButton && isHelpOpen && (
                  <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div className="mb-1 text-[11px] font-black text-emerald-600">질문 쉬운 설명</div>
                    <p className="text-sm font-medium leading-relaxed text-emerald-800">
                      {helpTextByQuestionId[question.questionId] || '질문 설명을 불러오는 중입니다.'}
                    </p>
                  </div>
                )}

                {question.options.length > 0 ? (
                  <div className={`grid grid-cols-1 gap-2 ${question.options.length <= 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-5'}`}>
                    {question.options.map(option => (
                      <ChoiceButton
                        key={option}
                        active={answerValue === option}
                        disabled={isQuestionDisabled}
                        title={questionTitle}
                        onClick={() => handleAnswer(question, option, { toggle: true })}
                      >
                        {option}
                      </ChoiceButton>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={answerValue}
                    onChange={(e) => handleAnswer(question, e.target.value)}
                    placeholder="답변을 입력해 주세요"
                    disabled={isQuestionDisabled}
                    title={questionTitle}
                    className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base font-bold outline-none transition-all ${
                      isQuestionDisabled
                        ? 'cursor-not-allowed text-slate-500'
                        : 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                    }`}
                  />
                )}
              </section>
            );
          })}

          <button
            type="submit"
            disabled={!canSubmitSurvey || isSubmitting}
            title={!canWriteSurvey ? SURVEY_DEADLINE_MESSAGE : undefined}
            className={`w-full rounded-2xl py-5 text-lg font-black shadow-lg transition-all ${
              canSubmitSurvey
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]'
                : 'bg-slate-200 text-slate-400'
            } ${!canSubmitSurvey ? 'cursor-not-allowed' : ''}`}
          >
            {getSubmitButtonLabel({
              canWriteSurvey,
              hasPendingQuestions,
              isSubmitting,
              isSurveyComplete,
              canSubmitSurvey,
            })}
          </button>
        </form>
      )}
        </div>

        <aside className="sticky top-6">
          <Card className="border-none bg-white p-5 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{year}년 {month + 1}월</h3>
              <div className="flex gap-2">
                <button type="button" onClick={handlePrevMonth} className="rounded p-1 text-gray-400 hover:bg-slate-50">◀</button>
                <button type="button" onClick={handleNextMonth} className="rounded p-1 text-gray-400 hover:bg-slate-50">▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="mb-3 text-[10px] font-bold text-gray-300">{day}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`blank-${index}`} className="h-10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(year, month, day);
                const currentDateStr = toDateKey(currentDate);
                const isSelected = selectedDateStr === currentDateStr;
                const hasReservation = reservations.some(reservation => reservation.date === currentDateStr);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`relative flex h-10 flex-col items-center justify-center rounded-2xl text-sm transition-all ${
                      isSelected
                        ? 'z-10 scale-105 bg-emerald-600 font-bold text-white shadow-lg'
                        : hasReservation
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'text-gray-600 hover:bg-emerald-50'
                    }`}
                  >
                    {day}
                    {hasReservation && (
                      <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{month + 1}월 달 설문 내역</span>
              </div>
              <div className="space-y-2">
                {monthReservations.map(reservation => {
                  const isActive = String(reservation.reservationId) === String(activeReservation?.reservationId);
                  const surveyStatus = getReservationSurveyStatus(
                    reservation,
                    surveyStatusByReservationId[String(reservation.reservationId)],
                  );

                  return (
                    <button
                      key={reservation.reservationId}
                      type="button"
                      onClick={() => handleReservationSelect(reservation)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        isActive ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-black ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {reservation.date}
                        </span>
                        <span className={`text-[10px] font-black ${surveyStatus.className}`}>
                          {surveyStatus.label}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-400">
                        {reservation.time} · {reservation.doctorName} 선생님
                      </div>
                    </button>
                  );
                })}
                {monthReservations.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-100 p-4 text-center text-xs font-bold text-gray-400">
                    해당 달 예약이 없습니다.
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

function ChoiceButton({ active, disabled, title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`min-h-14 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
        disabled
          ? active
            ? 'cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400'
          : active
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
            : 'border-slate-100 bg-white text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/60'
      }`}
    >
      {children}
    </button>
  );
}

function getNextReservationAnswers(currentAnswers, questionId, value, options = {}) {
  const answerKey = String(questionId);

  if (options.toggle && currentAnswers[answerKey] === value) {
    const { [answerKey]: _removedAnswer, ...restAnswers } = currentAnswers;
    return restAnswers;
  }

  return {
    ...currentAnswers,
    [answerKey]: value,
  };
}

function getQuestionHelpText(question = {}) {
  return question.questionReason || question.reason || question.description || question.explanation || '';
}

function getAnsweredQuestionFallbackHelp(question = {}) {
  return question.text || question.question || '질문 설명 정보가 없습니다.';
}

function getApiHelpText(response) {
  if (typeof response === 'string') return response;

  return response?.explanation ||
    response?.description ||
    response?.reason ||
    response?.questionReason ||
    response?.message ||
    '질문 설명을 불러오지 못했습니다.';
}

function getSafeHelpErrorMessage(error) {
  if (isSubmittedSurveyMessage(error?.message)) {
    return '질문 설명 정보가 없습니다.';
  }

  return error?.message || '질문 설명을 불러오지 못했습니다.';
}

function isSubmittedSurveyMessage(message = '') {
  return /제출|답변/.test(String(message));
}

function getSubmitButtonLabel({ canWriteSurvey, hasPendingQuestions, isSubmitting, isSurveyComplete, canSubmitSurvey }) {
  if (isSubmitting) return '제출 중입니다';
  if (!canWriteSurvey) return '작성 마감';
  if (isSurveyComplete) return '제출 완료';
  if (canSubmitSurvey) return '미답변 질문 제출하기';
  if (hasPendingQuestions) return '미답변 질문에 답변해 주세요';
  return '제출할 질문이 없습니다';
}

function getVisibleAnswer(question, answers) {
  const keys = getQuestionKeys(question);

  return keys.reduce((foundAnswer, key) => (
    foundAnswer !== undefined ? foundAnswer : answers[key]
  ), undefined);
}

function hasNonEmptyVisibleAnswer(question, answers) {
  const answer = getVisibleAnswer(question, answers);
  return answer !== undefined && String(answer).trim() !== '';
}

function isQuestionAlreadyAnswered(question, submittedAnswerMap) {
  if (question.answered) return true;
  if (question.answer !== undefined && question.answer !== null && String(question.answer).trim() !== '') return true;

  return getQuestionKeys(question).some(key => Object.prototype.hasOwnProperty.call(submittedAnswerMap, key));
}

function buildSubmittedAnswerMap(questions = [], answers = []) {
  const map = {};

  questions.forEach((question) => {
    if (!question.answered && !hasValue(question.answer)) return;

    const value = question.answer ?? '';
    getQuestionKeys(question).forEach((key) => {
      map[key] = value;
    });
  });

  answers.forEach((answer) => {
    const value = getAnswerValue(answer);
    getAnswerKeys(answer).forEach((key) => {
      map[key] = value;
    });
  });

  return map;
}

function getSurveyCompletionState(questions = [], answers = []) {
  if (questions.length === 0) return 'available';

  const answerMap = buildSubmittedAnswerMap(questions, answers);
  const answeredCount = questions.filter(question => isQuestionAlreadyAnswered(question, answerMap)).length;

  if (answeredCount === 0) return 'available';
  if (answeredCount < questions.length) return 'partial';
  return 'submitted';
}

function getQuestionKeys(question = {}) {
  const id = question.questionId ?? question.id;
  const text = question.text ?? question.question;
  const keys = [];

  if (id !== undefined && id !== null) keys.push(String(id));
  if (text) keys.push(`question:${text}`);

  return keys;
}

function getAnswerKeys(answer = {}) {
  const questionData = typeof answer.question === 'object' ? answer.question : answer.surveyQuestion;
  const id = answer.questionId ?? answer.surveyQuestionId ?? questionData?.questionId ?? questionData?.id;
  const text = typeof answer.question === 'string'
    ? answer.question
    : questionData?.question || answer.questionText;
  const keys = [];

  if (id !== undefined && id !== null) keys.push(String(id));
  if (text) keys.push(`question:${text}`);

  return keys;
}

function getAnswerValue(answer = {}) {
  return answer.answer ?? answer.content ?? answer.response ?? answer.value ?? '';
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isBeforeAppointmentDate(appointmentDate) {
  if (!appointmentDate || appointmentDate === '-') return false;

  const today = new Date();
  const appointment = new Date(`${appointmentDate}T00:00:00`);

  today.setHours(0, 0, 0, 0);
  appointment.setHours(0, 0, 0, 0);

  return today < appointment;
}

function parseDateKey(dateKey) {
  if (!dateKey || dateKey === '-') return new Date();

  const [year, month, day] = String(dateKey).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getReservationSurveyStatus(reservation, storedStatus) {
  if (!isBeforeAppointmentDate(reservation.date)) {
    return {
      key: 'closed',
      label: '작성 마감',
      className: 'text-slate-400',
    };
  }

  if (storedStatus === 'submitted') {
    return {
      key: 'submitted',
      label: '작성 완료',
      className: 'text-blue-500',
    };
  }

  if (storedStatus === 'partial') {
    return {
      key: 'partial',
      label: '추가 답변 가능',
      className: 'text-amber-500',
    };
  }

  return {
    key: 'available',
    label: '작성 가능',
    className: 'text-emerald-500',
  };
}

function emptyOnNotFound(error) {
  if (error.status === 404) return [];
  throw error;
}
