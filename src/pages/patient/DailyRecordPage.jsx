import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { capdApi } from '../../api/apiClient';
import { normalizeCapd, normalizeSession, toCapdPayload, toDateKey, toKoreanDate } from '../../api/adapters';

const CAPD_CONFLICT_STATUS = 409;
const CAPD_CONFLICT_MESSAGE = '오늘 기록은 이미 제출되었거나 서버에서 수정할 수 없는 상태입니다. 기록 목록에서 확인해 주세요.';
const LOCAL_CAPD_DRAFT_PREFIX = 'capd_local_draft:';

const createEmptyDailyInfo = () => ({
  turbidity: '맑음',
  urineCount: '',
  weight: '',
  bpSystolic: '',
  bpDiastolic: '',
  fbs: '',
  memo: '',
});

const getLocalDraftKey = (date) => `${LOCAL_CAPD_DRAFT_PREFIX}${date}`;

const readLocalDraft = (date) => {
  try {
    const rawDraft = localStorage.getItem(getLocalDraftKey(date));
    return rawDraft ? JSON.parse(rawDraft) : null;
  } catch {
    return null;
  }
};

const clearLocalDraft = (date) => {
  localStorage.removeItem(getLocalDraftKey(date));
};

const toCommonUpdatePayload = (payload) => ({
  cloudyDialysate: payload.cloudyDialysate,
  urinationCount: payload.urinationCount,
  bodyWeight: payload.bodyWeight,
  bloodPressureSys: payload.bloodPressureSys,
  bloodPressureDia: payload.bloodPressureDia,
  fastingBloodSugar: payload.fastingBloodSugar,
  note: payload.note,
});

const toSessionUpdatePayload = (exchange) => ({
  exchangeTime: exchange.time || exchange.exchangeTime || '00:00',
  drainVolume: Number(exchange.drained ?? exchange.drainVolume ?? 0),
  dialysateConcentration: Number(exchange.concentration ?? exchange.dialysateConcentration ?? 0),
  infusedFluidWeight: Number(exchange.infused ?? exchange.infusedFluidWeight ?? 0),
});

const createExchangeForm = (exchange = {}) => ({
  time: exchange.time || exchange.exchangeTime || '08:00',
  concentration: String(exchange.concentration ?? exchange.dialysateConcentration ?? '1.5'),
  infused: String(exchange.infused ?? exchange.infusedFluidWeight ?? '2000'),
  drained: String(exchange.drained ?? exchange.drainVolume ?? ''),
});

const sortExchangesByTime = (exchangeList = []) => (
  [...exchangeList].sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
);

const toDailyInfo = (record) => ({
  turbidity: record.turbidity,
  urineCount: record.urineCount,
  weight: record.weight,
  bpSystolic: record.bpSystolic,
  bpDiastolic: record.bpDiastolic,
  fbs: record.fbs,
  memo: record.memo,
});

export default function DailyRecordPage() {
  const navigate = useNavigate();
  const today = new Date();
  const formattedDate = toDateKey(today);
  const displayDate = toKoreanDate(today);
  const localDraft = readLocalDraft(formattedDate);

  const [dailyInfo, setDailyInfo] = useState(() => localDraft?.dailyInfo || createEmptyDailyInfo());
  const [exchanges, setExchanges] = useState(() => localDraft?.exchanges || []);
  const [autoSaveStatus, setAutoSaveStatus] = useState(localDraft ? '임시 저장 불러옴' : '자동 저장 대기');
  const [isTempSaveBlocked, setIsTempSaveBlocked] = useState(false);
  const [tempRecordId, setTempRecordId] = useState(null);
  const [currentExchange, setCurrentExchange] = useState({
    time: '08:00',
    concentration: '1.5',
    infused: '2000',
    drained: '',
  });
  const [editingExchangeIndex, setEditingExchangeIndex] = useState(null);
  const [editingExchange, setEditingExchange] = useState(createExchangeForm());

  const applyRecordToState = useCallback((record) => {
    const normalizedRecord = normalizeCapd(record);

    setDailyInfo(toDailyInfo(normalizedRecord));
    setExchanges(normalizedRecord.exchanges || []);
    setTempRecordId(normalizedRecord.capdId || null);

    return normalizedRecord;
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadTodayRecord = async () => {
      try {
        const record = await capdApi.getMineByDate(formattedDate);
        if (ignore || !record) return;

        const normalizedRecord = applyRecordToState(record);
        const isSubmitted = String(normalizedRecord.status || '').toUpperCase() !== 'TEMP';

        setIsTempSaveBlocked(isSubmitted);
        setAutoSaveStatus(isSubmitted ? '이미 제출됨' : '서버 임시 저장 불러옴');
        clearLocalDraft(formattedDate);
      } catch (error) {
        if (error.status !== 404) {
          setAutoSaveStatus(error.message || '기록 조회 실패');
        }
      }
    };

    loadTodayRecord();

    return () => {
      ignore = true;
    };
  }, [applyRecordToState, formattedDate]);

  const saveTempRecord = async (infoData = dailyInfo, exchangeList = exchanges, options = {}) => {
    if (isTempSaveBlocked) return false;

    setAutoSaveStatus('서버 임시 저장 중');

    try {
      const payload = toCapdPayload({
        date: formattedDate,
        dailyInfo: infoData,
        exchanges: options.sessionsOnly ? (options.sessions || []) : exchangeList,
      });
      const savedRecord = tempRecordId && !options.sessionsOnly
        ? await capdApi.updateCommon(tempRecordId, toCommonUpdatePayload(payload))
        : await capdApi.saveTemp(payload);
      const normalizedRecord = savedRecord ? normalizeCapd(savedRecord) : null;

      if (normalizedRecord?.capdId) {
        setTempRecordId(normalizedRecord.capdId);
      }

      if (Array.isArray(savedRecord?.sessions)) {
        const savedExchanges = normalizedRecord.exchanges || [];
        setExchanges(options.sessionsOnly && savedExchanges.length < exchangeList.length ? exchangeList : savedExchanges);
      }

      clearLocalDraft(formattedDate);
      setAutoSaveStatus('서버 임시 저장 완료');
      return true;
    } catch (error) {
      setAutoSaveStatus(error.message || '서버 임시 저장 실패');
      return false;
    }
  };

  const submitRecord = async (payload) => {
    try {
      return await capdApi.submit(payload);
    } catch (submitError) {
      if (submitError.status !== CAPD_CONFLICT_STATUS) throw submitError;

      try {
        const existingRecord = await capdApi.getMineByDate(formattedDate);

        if (existingRecord?.capdId && String(existingRecord.status || '').toUpperCase() === 'TEMP') {
          await capdApi.deleteCommon(existingRecord.capdId);
          return await capdApi.submit(payload);
        }
      } catch {
        // 기존 TEMP 확인/삭제에 실패하면 원래 제출 오류를 사용자에게 보여줍니다.
      }

      throw submitError;
    }
  };

  const handleDailyChange = (e) => {
    const { name, value } = e.target;
    setDailyInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = () => {
    saveTempRecord();
  };

  const handleTurbidityClick = (value) => {
    const updatedInfo = { ...dailyInfo, turbidity: value };
    setDailyInfo(updatedInfo);
    saveTempRecord(updatedInfo, exchanges);
  };

  const handleExchangeChange = (e) => {
    const { name, value } = e.target;
    setCurrentExchange(prev => ({ ...prev, [name]: value }));
  };

  const handleEditingExchangeChange = (e) => {
    const { name, value } = e.target;
    setEditingExchange(prev => ({ ...prev, [name]: value }));
  };

  const currentUfValue = (currentExchange.drained && currentExchange.infused)
    ? Number(currentExchange.drained) - Number(currentExchange.infused)
    : 0;
  const editingUfValue = (editingExchange.drained && editingExchange.infused)
    ? Number(editingExchange.drained) - Number(editingExchange.infused)
    : 0;

  const handleStartEditExchange = (index) => {
    if (isTempSaveBlocked) {
      alert(CAPD_CONFLICT_MESSAGE);
      return;
    }

    setEditingExchangeIndex(index);
    setEditingExchange(createExchangeForm(exchanges[index]));
  };

  const handleCancelEditExchange = () => {
    setEditingExchangeIndex(null);
    setEditingExchange(createExchangeForm());
  };

  const handleAddExchange = async () => {
    if (isTempSaveBlocked) {
      alert(CAPD_CONFLICT_MESSAGE);
      return;
    }

    if (exchanges.length >= 5) {
      alert('하루 최대 5회까지만 추가할 수 있습니다.');
      return;
    }

    if (!currentExchange.infused || !currentExchange.drained) {
      alert('주입량과 배액량을 모두 입력해 주세요.');
      return;
    }

    const newExchange = {
      ...currentExchange,
      sessionNumber: exchanges.length + 1,
      infused: Number(currentExchange.infused),
      drained: Number(currentExchange.drained),
      uf: currentUfValue,
    };

    const newExchangesList = sortExchangesByTime([...exchanges, newExchange]);
    setExchanges(newExchangesList);

    const saved = await saveTempRecord(dailyInfo, newExchangesList, tempRecordId ? {
      sessionsOnly: true,
      sessions: [newExchange],
    } : {});

    if (!saved) return;

    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setCurrentExchange({ time: timeString, concentration: '1.5', infused: '2000', drained: '' });
  };

  const handleUpdateExchange = async () => {
    if (isTempSaveBlocked) {
      alert(CAPD_CONFLICT_MESSAGE);
      return;
    }

    if (editingExchangeIndex === null) return;

    if (!editingExchange.infused || !editingExchange.drained) {
      alert('주입량과 배액량을 모두 입력해 주세요.');
      return;
    }

    const targetExchange = exchanges[editingExchangeIndex];
    const sessionId = targetExchange?.capdSessionId || targetExchange?.id;
    const nextExchange = {
      ...targetExchange,
      ...editingExchange,
      sessionNumber: targetExchange?.sessionNumber ?? editingExchangeIndex + 1,
      infused: Number(editingExchange.infused),
      drained: Number(editingExchange.drained),
      uf: editingUfValue,
    };

    try {
      setAutoSaveStatus('서버 임시 저장 중');

      if (sessionId) {
        const updatedSession = await capdApi.updateSession(sessionId, toSessionUpdatePayload(nextExchange));
        const normalizedSession = normalizeSession(updatedSession, editingExchangeIndex);
        setExchanges(prev => sortExchangesByTime(prev.map((exchange, index) => (
          index === editingExchangeIndex
            ? { ...exchange, ...normalizedSession }
            : exchange
        ))));
      } else {
        setExchanges(prev => sortExchangesByTime(prev.map((exchange, index) => (
          index === editingExchangeIndex ? nextExchange : exchange
        ))));
      }

      clearLocalDraft(formattedDate);
      setAutoSaveStatus('서버 임시 저장 완료');
      handleCancelEditExchange();
    } catch (error) {
      setAutoSaveStatus(error.message || '서버 임시 저장 실패');
    }
  };

  const handleRemoveExchange = async (index) => {
    if (isTempSaveBlocked) {
      alert(CAPD_CONFLICT_MESSAGE);
      return;
    }

    const removedExchange = exchanges[index];
    const sessionId = removedExchange?.capdSessionId || removedExchange?.id;
    const newList = exchanges.filter((_, itemIndex) => itemIndex !== index)
      .map((exchange, itemIndex) => ({ ...exchange, sessionNumber: itemIndex + 1 }));

    try {
      if (sessionId) {
        setAutoSaveStatus('서버 임시 저장 중');
        await capdApi.deleteSession(sessionId);
        clearLocalDraft(formattedDate);
        setAutoSaveStatus('서버 임시 저장 완료');
      } else {
        const saved = await saveTempRecord(dailyInfo, newList);
        if (!saved) return;
      }

      setExchanges(newList);
    } catch (error) {
      setAutoSaveStatus(error.message || '서버 임시 저장 실패');
    }
  };

  const handleSubmitAll = async () => {
    if (isTempSaveBlocked) {
      alert(CAPD_CONFLICT_MESSAGE);
      navigate('/patient/record_list');
      return;
    }

    if (exchanges.length < 4) {
      const confirmUnder = window.confirm(`현재 투석 횟수가 ${exchanges.length}회로 기준(4회) 미달입니다. 그래도 제출하시겠습니까?`);
      if (!confirmUnder) return;
    }

    const confirmFinalSubmit = window.confirm(
      '오늘 하루 기록 마감하기 버튼 클릭 시 제출 후에는 수정이 불가능합니다.\n그래도 제출하시겠습니까?\n\n(지금까지 작성한 내용은 서버에 임시 저장되고 있습니다)',
    );

    if (!confirmFinalSubmit) return;

    try {
      const submittedRecord = await submitRecord(toCapdPayload({
        date: formattedDate,
        dailyInfo,
        exchanges,
      }));
      const normalizedRecord = submittedRecord ? normalizeCapd(submittedRecord) : null;

      clearLocalDraft(formattedDate);
      if (normalizedRecord) {
        setDailyInfo(toDailyInfo(normalizedRecord));
        setExchanges(normalizedRecord.exchanges || []);
      }
      setIsTempSaveBlocked(true);
      setTempRecordId(null);
      setAutoSaveStatus('이미 제출됨');
      alert('오늘 하루의 기록이 성공적으로 제출되었습니다!');
    } catch (error) {
      if (error.status === CAPD_CONFLICT_STATUS) {
        setIsTempSaveBlocked(true);
        setTempRecordId(null);
        setAutoSaveStatus('이미 제출됨');
        clearLocalDraft(formattedDate);
        alert(CAPD_CONFLICT_MESSAGE);
        navigate('/patient/record_list');
        return;
      }

      alert(error.message || '최종 제출에 실패했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="text-blue-600 font-bold mb-2 flex items-center gap-2">
          <span>📅</span> {displayDate}
        </div>
        <h1 className="text-3xl font-black text-gray-900">투석 기록 입력</h1>
        <p className="text-gray-500 mt-2">
          일일 건강 수치와 매 회차 투석 기록을 입력하세요.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 ring-1 ring-blue-50">
          <h2 className="text-lg font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex justify-between items-center">
            <span className="flex items-center gap-2"><span className="text-blue-500">💧</span> 투석 교환 기록</span>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold">오늘 {exchanges.length}회 기록됨</span>
          </h2>

          <div className="space-y-5 bg-slate-50/50 p-4 rounded-xl border border-gray-100 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="교환 시각">
                <input
                  type="time"
                  name="time"
                  value={currentExchange.time}
                  onChange={handleExchangeChange}
                  disabled={isTempSaveBlocked}
                  className="ios-fixed-time-input h-12 min-h-12 w-full min-w-0 appearance-none bg-white border border-gray-200 rounded-xl px-3 text-base leading-none focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
              <Field label="투석액 농도 (%)">
                <select
                  name="concentration"
                  value={currentExchange.concentration}
                  onChange={handleExchangeChange}
                  disabled={isTempSaveBlocked}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                >
                  <option value="1.5">1.5%</option>
                  <option value="2.5">2.5%</option>
                  <option value="4.25">4.25%</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="주입량 (mL)">
                <input
                  type="number"
                  name="infused"
                  value={currentExchange.infused}
                  onChange={handleExchangeChange}
                  disabled={isTempSaveBlocked}
                  placeholder="예: 2000"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
              <Field label="배액량 (mL)">
                <input
                  type="number"
                  name="drained"
                  value={currentExchange.drained}
                  onChange={handleExchangeChange}
                  disabled={isTempSaveBlocked}
                  placeholder="예: 2200"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className={`flex-1 p-3 rounded-xl border flex justify-between items-center ${currentUfValue < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                <div className="font-bold text-xs">현재 제수량</div>
                <div className="text-lg font-black">{currentUfValue > 0 ? `+${currentUfValue}` : currentUfValue} <span className="text-xs font-medium">mL</span></div>
              </div>
              <button
                type="button"
                onClick={handleAddExchange}
                disabled={isTempSaveBlocked}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                + 회차 추가
              </button>
            </div>
          </div>

          {exchanges.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 mb-2 px-1">기록된 내역 (총 {exchanges.reduce((acc, curr) => acc + curr.uf, 0)}mL)</div>
              {exchanges.map((exchange, index) => (
                <div key={`${exchange.time}-${index}`} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-800 w-12">{exchange.time}</span>
                    <span className="text-xs bg-slate-100 text-gray-600 px-2 py-0.5 rounded font-bold">{exchange.concentration}%</span>
                    <span className="text-sm text-gray-500 hidden sm:inline">주입 {exchange.infused} / 배액 {exchange.drained}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-black font-mono ${exchange.uf >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {exchange.uf > 0 ? `+${exchange.uf}` : exchange.uf} mL
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditExchange(index)}
                      disabled={isTempSaveBlocked}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-gray-200"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveExchange(index)}
                      disabled={isTempSaveBlocked}
                      className="px-2 text-gray-300 hover:text-red-500 disabled:cursor-not-allowed disabled:text-gray-200"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editingExchangeIndex !== null && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-black text-slate-800">
                    {editingExchangeIndex + 1}회차 수정
                  </div>
                  <div className="text-xs font-bold text-slate-400">
                    기존 입력값을 불러온 뒤 수정합니다.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditExchange}
                  className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 hover:text-slate-700"
                >
                  닫기
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="교환 시각">
                    <input
                      type="time"
                      name="time"
                      value={editingExchange.time}
                      onChange={handleEditingExchangeChange}
                      className="ios-fixed-time-input h-12 min-h-12 w-full min-w-0 appearance-none bg-white border border-gray-200 rounded-xl px-3 text-base leading-none focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </Field>
                  <Field label="투석액 농도 (%)">
                    <select
                      name="concentration"
                      value={editingExchange.concentration}
                      onChange={handleEditingExchangeChange}
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="1.5">1.5%</option>
                      <option value="2.5">2.5%</option>
                      <option value="4.25">4.25%</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="주입량 (mL)">
                    <input
                      type="number"
                      name="infused"
                      value={editingExchange.infused}
                      onChange={handleEditingExchangeChange}
                      placeholder="예: 2000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </Field>
                  <Field label="배액량 (mL)">
                    <input
                      type="number"
                      name="drained"
                      value={editingExchange.drained}
                      onChange={handleEditingExchangeChange}
                      placeholder="예: 2200"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex-1 rounded-xl border p-3 ${editingUfValue < 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-blue-100 text-blue-700'}`}>
                    <div className="text-xs font-bold">수정 제수량</div>
                    <div className="text-lg font-black">
                      {editingUfValue > 0 ? `+${editingUfValue}` : editingUfValue} <span className="text-xs font-medium">mL</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateExchange}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    수정 완료
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-5 pb-3 border-b border-gray-100 flex justify-between items-center">
            <span className="flex items-center gap-2"><span className="text-emerald-500">❤️</span> 일일 건강 수치</span>
            <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded-full">{autoSaveStatus}</span>
          </h2>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="체중 (kg)">
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={dailyInfo.weight}
                  onChange={handleDailyChange}
                  onBlur={handleBlur}
                  disabled={isTempSaveBlocked}
                  placeholder="00.0"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
              <Field label="소변 횟수 (회)">
                <input
                  type="number"
                  name="urineCount"
                  value={dailyInfo.urineCount}
                  onChange={handleDailyChange}
                  onBlur={handleBlur}
                  disabled={isTempSaveBlocked}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">혈압 (mmHg)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="bpSystolic"
                  value={dailyInfo.bpSystolic}
                  onChange={handleDailyChange}
                  onBlur={handleBlur}
                  disabled={isTempSaveBlocked}
                  placeholder="수축기"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
                <span className="text-gray-300">/</span>
                <input
                  type="number"
                  name="bpDiastolic"
                  value={dailyInfo.bpDiastolic}
                  onChange={handleDailyChange}
                  onBlur={handleBlur}
                  disabled={isTempSaveBlocked}
                  placeholder="이완기"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="공복혈당 (mg/dL)">
                <input
                  type="number"
                  name="fbs"
                  value={dailyInfo.fbs}
                  onChange={handleDailyChange}
                  onBlur={handleBlur}
                  disabled={isTempSaveBlocked}
                  placeholder="000"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                />
              </Field>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">복막액 혼탁</label>
                <div className="grid grid-cols-2 gap-2 h-11.5">
                  {['맑음', '혼탁'].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleTurbidityClick(value)}
                      disabled={isTempSaveBlocked}
                      className={`rounded-xl font-bold border transition-all disabled:cursor-not-allowed ${dailyInfo.turbidity === value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-yellow-500">📝</span> 특이사항
          </h2>
          <textarea
            name="memo"
            value={dailyInfo.memo}
            onChange={handleDailyChange}
            onBlur={handleBlur}
            disabled={isTempSaveBlocked}
            placeholder="오늘의 특이사항이나 궁금한 점을 적어주세요. 담당 의사 선생님께 전달됩니다."
            className="w-full h-24 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-slate-100"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmitAll}
          disabled={isTempSaveBlocked}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-5 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          {isTempSaveBlocked ? '오늘 기록 제출 완료' : '오늘 하루 기록 마감하기'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="block text-xs font-bold text-gray-700 mb-2">{label}</label>
      {children}
    </div>
  );
}
