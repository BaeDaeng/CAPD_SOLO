import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { chatApi } from '../api/apiClient';
import { normalizeChatMessagePair } from '../api/adapters';

const DEFAULT_MESSAGES = {
  patient: '안녕하세요. 무엇이 불편하신지 편하게 말씀해 주세요.',
  doctor: '안녕하세요. 환자 기록, 설문, 예약 정보를 바탕으로 진료에 필요한 내용을 도와드릴게요.',
};

export default function useAiAgent({
  role = 'patient',
  patientId = null,
  initialMessage,
  autoLoad = true,
} = {}) {
  const [messages, setMessages] = useState([
    {
      id: 'initial-bot-message',
      sender: 'bot',
      text: initialMessage || DEFAULT_MESSAGES[role] || DEFAULT_MESSAGES.patient,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const hasLoadedHistoryRef = useRef(!autoLoad);
  const shouldJumpToLatestRef = useRef(true);

  const loadHistory = useCallback(async () => {
    if (!autoLoad) return [];

    setIsLoading(true);
    setError(null);

    try {
      const history = role === 'doctor'
        ? await chatApi.getDoctorHistory()
        : await chatApi.getPatientHistory();
      const normalized = (history || []).flatMap(normalizeChatMessagePair).filter(message => message.text);

      if (normalized.length > 0) {
        shouldJumpToLatestRef.current = true;
        setMessages(normalized);
      }

      return normalized;
    } catch (historyError) {
      setError(historyError);
      return [];
    } finally {
      hasLoadedHistoryRef.current = true;
      setIsLoading(false);
    }
  }, [autoLoad, role]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useLayoutEffect(() => {
    if (autoLoad && !hasLoadedHistoryRef.current) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: shouldJumpToLatestRef.current ? 'auto' : 'smooth',
      block: 'end',
    });
    shouldJumpToLatestRef.current = false;
  }, [autoLoad, messages]);

  const sendMessage = useCallback(async (event) => {
    event?.preventDefault?.();

    const text = inputValue.trim();
    if (!text) return null;

    if (role === 'doctor' && !patientId) {
      setError(new Error('환자를 선택한 뒤 질문할 수 있습니다.'));
      return null;
    }

    const userMessage = {
      id: `local-user-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsSending(true);
    setError(null);

    try {
      const response = role === 'doctor'
        ? await chatApi.sendDoctorMessage(patientId, { userText: text })
        : await chatApi.sendPatientMessage({ userText: text });

      const [normalizedUser, normalizedBot] = normalizeChatMessagePair(response);
      const botMessage = normalizedBot || {
        id: `local-bot-${Date.now()}`,
        sender: 'bot',
        text: response?.aiText || '',
      };

      setMessages(prev => {
        const withoutOptimisticDuplicate = normalizedUser?.text === text
          ? prev.filter(message => message.id !== userMessage.id)
          : prev;

        return normalizedUser?.text
          ? [...withoutOptimisticDuplicate, normalizedUser, botMessage]
          : [...withoutOptimisticDuplicate, userMessage, botMessage];
      });

      return response;
    } catch (sendError) {
      setError(sendError);
      setMessages(prev => [...prev, {
        id: `local-error-${Date.now()}`,
        sender: 'bot',
        text: sendError.message || '답변 생성 중 오류가 발생했습니다.',
      }]);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [inputValue, patientId, role]);

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    isSending,
    error,
    messagesEndRef,
    sendMessage,
    reload: loadHistory,
  };
}
