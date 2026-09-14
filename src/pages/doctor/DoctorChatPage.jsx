import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import ReadableText from '../../components/ReadableText';
import useAiAgent from '../../hooks/useAiAgent';
import { formatAge } from '../../utils/ageFormat';

export default function DoctorChatPage({ currentPatient }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const {
    messages,
    inputValue,
    setInputValue,
    isSending,
    messagesEndRef,
    sendMessage,
    error,
  } = useAiAgent({
    role: 'doctor',
    patientId: currentPatient?.id,
    autoLoad: isOpen || isFullScreen,
  });

  const contextLabel = currentPatient
    ? `${currentPatient.name} 환자 컨텍스트`
    : '전체 진료 컨텍스트';

  const contextDescription = currentPatient
    ? `${currentPatient.sex}/${formatAge(currentPatient.age)} · ${currentPatient.phone}`
    : '환자를 선택하면 해당 환자 기록을 기준으로 대화합니다.';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full rounded-t-3xl bg-slate-900 px-4 py-4 text-left text-white shadow-2xl transition-all hover:bg-slate-800 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Doctor Assistant
            </div>
            <div className="mt-1 text-lg font-black">AI 진료 도우미</div>
            <div className="mt-1 text-xs font-medium text-slate-400">
              환자 기록, 설문, 예약을 바탕으로 질문
            </div>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black shadow-lg">
            AI
          </div>
        </div>
      </button>

      {isOpen && (
        <ChatPanel
          contextLabel={contextLabel}
          contextDescription={contextDescription}
          currentPatient={currentPatient}
          error={error}
          inputValue={inputValue}
          isSending={isSending}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onClose={() => setIsOpen(false)}
          onFullScreen={() => {
            setIsOpen(false);
            setIsFullScreen(true);
          }}
          onInputChange={setInputValue}
          onSubmit={sendMessage}
          variant="popup"
        />
      )}

      {isFullScreen && createPortal(
        <ChatPanel
          contextLabel={contextLabel}
          contextDescription={contextDescription}
          currentPatient={currentPatient}
          error={error}
          inputValue={inputValue}
          isSending={isSending}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onClose={() => setIsFullScreen(false)}
          onFullScreen={() => setIsFullScreen(false)}
          onInputChange={setInputValue}
          onSubmit={sendMessage}
          variant="full"
        />,
        document.body,
      )}
    </div>
  );
}

function ChatPanel({
  contextLabel,
  contextDescription,
  currentPatient,
  error,
  inputValue,
  isSending,
  messages,
  messagesEndRef,
  onClose,
  onFullScreen,
  onInputChange,
  onSubmit,
  variant,
}) {
  const isFull = variant === 'full';

  return (
    <section
      className={
        isFull
          ? 'fixed bottom-0 left-60 right-0 top-14 z-80 flex flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl xl:left-72'
          : 'absolute bottom-full right-0 z-40 mb-3 flex h-130 max-h-[calc(100vh-6rem)] w-90 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl'
      }
    >
      <div className="shrink-0 border-b border-slate-100 bg-slate-900 px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">
              AI 진료 도우미
            </div>
            <h2 className={isFull ? 'mt-1 text-xl font-black' : 'mt-1 text-base font-black'}>
              {contextLabel}
            </h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">
              {contextDescription}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onFullScreen}
              title={isFull ? '작게 보기' : '전체화면'}
              aria-label={isFull ? '작게 보기' : '전체화면'}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
            >
              {isFull ? <MinimizeIcon /> : <MaximizeIcon />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sm font-black text-slate-300 transition-colors hover:bg-white/20 hover:text-white"
            >
              X
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-slate-100 bg-blue-50 px-4 py-3">
        <div className="text-[10px] font-black text-blue-600">현재 참조 범위</div>
        <div className="mt-1 text-xs font-bold leading-relaxed text-blue-800">
          {currentPatient
            ? `${currentPatient.name} 환자의 기록, 설문, 예약 정보를 우선 참조합니다.`
            : '특정 환자를 선택한 뒤 질문을 전송할 수 있습니다.'}
        </div>
        {error && (
          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
            {error.message}
          </div>
        )}
      </div>

      <div className={`min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 custom-scrollbar ${isFull ? 'p-6' : 'p-4'}`}>
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'bot' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white">
                AI
              </div>
            )}

            <div
              className={`${isFull ? 'max-w-[64%]' : 'max-w-[78%]'} rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed shadow-sm ${
                message.sender === 'user'
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : 'rounded-bl-none border border-slate-100 bg-white text-slate-700'
              }`}
            >
              {message.sender === 'bot' ? (
                <ReadableText value={message.text} className="text-sm font-medium" />
              ) : (
                message.text
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSubmit} className={`shrink-0 border-t border-slate-100 bg-white ${isFull ? 'p-5' : 'p-3'}`}>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={currentPatient ? `${currentPatient.name} 환자에 대해 질문` : '환자를 선택해 주세요'}
            disabled={!currentPatient}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-400"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || !currentPatient || isSending}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSending ? '전송중' : '전송'}
          </button>
        </div>
      </form>
    </section>
  );
}

function MaximizeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}
