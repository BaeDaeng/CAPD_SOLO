import React from 'react';
import ReadableText from '../../components/ReadableText';
import useAppStore from '../../store/useAppStore';
import useAiAgent from '../../hooks/useAiAgent';

export default function SymptomHelperPage() {
  const { user } = useAppStore();
  const {
    messages,
    inputValue,
    setInputValue,
    isSending,
    messagesEndRef,
    sendMessage,
  } = useAiAgent({
    role: 'patient',
    initialMessage: `안녕하세요, ${user?.name || '환자'}님. 무엇이 불편하신지 편하게 말씀해 주세요.\n\n"어디가 아픈지 정확히 모르겠어요", "몸이 무거워요" 처럼 느끼시는 그대로 적어주시면, 제가 의사 선생님이 쉽게 이해하실 수 있는 정확한 증상 기록으로 정리해 드릴게요.`,
  });

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col animate-in fade-in duration-500">
      
      {/* 상단 헤더 */}
      <div className="mb-4">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <span className="text-4xl">🩺</span> AI 증상 설명 도우미
        </h1>
        <p className="text-gray-500 mt-2 font-medium">느끼시는 불편함을 그대로 말씀해 주시면, 의료진이 확인하기 쉽도록 전문적인 기록으로 변환해 드립니다.</p>
      </div>

      {/* 채팅창 메인 컨테이너 */}
      <div className="flex-1 bg-white rounded-4xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        
        {/* 대화 내역 영역 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-end gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* 아바타 */}
              <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-sm font-bold shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-[#edeaf0] text-[#766c8a]'
              }`}>
                {msg.sender === 'user' ? '나' : '봇'}
              </div>

              {/* 말풍선 */}
              <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-purple-500 text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                {msg.sender === 'bot' ? (
                  <ReadableText
                    value={msg.text}
                    splitLongText
                    className="whitespace-normal text-sm font-medium"
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 하단 입력 폼 영역 */}
        <div className="bg-white p-4 border-t border-gray-100">
          <form 
            onSubmit={sendMessage} 
            className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="예: 오늘 아침부터 배가 콕콕 쑤셔요..."
              className="flex-1 bg-transparent border-none px-4 py-2 outline-none text-gray-800 placeholder-gray-400"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isSending}
              className="bg-[#766c8a] hover:bg-[#5b526d] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-colors shrink-0"
            >
              {isSending ? '전송중' : '전송'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
