import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorApi, patientApi } from '../api/apiClient';
import useAppStore from '../store/useAppStore';
import Button from './Button';

const CONFIRM_TEXT = '탈퇴하겠습니다';

export default function AccountDeleteModal({ role, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAppStore();
  const canDelete = confirmText.trim() === CONFIRM_TEXT;
  const roleLabel = role === 'doctor' ? '의사' : '환자';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!canDelete) {
      setError(`탈퇴하려면 "${CONFIRM_TEXT}"라고 정확히 입력해 주세요.`);
      return;
    }

    setIsSubmitting(true);

    try {
      if (role === 'doctor') {
        await doctorApi.deleteMe();
      } else {
        await patientApi.deleteMe();
      }

      logout();
      alert('회원탈퇴가 완료되었습니다.');
      navigate('/login', { replace: true });
    } catch (deleteError) {
      setError(deleteError.message || '회원탈퇴에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-red-100 bg-red-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-red-700">회원탈퇴</h2>
              <p className="mt-1 text-sm font-bold leading-relaxed text-red-500">
                정말 탈퇴하시겠습니까?
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-xl font-black text-red-300 transition-colors hover:bg-white hover:text-red-600"
            >
              X
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm font-bold leading-relaxed text-red-600">
            {roleLabel} 계정을 탈퇴하면 계정 정보와 관련 기능을 더 이상 사용할 수 없습니다.
            <br />
            탈퇴하려면 아래 입력창에 <span className="font-black">탈퇴하겠습니다</span>를 입력해 주세요.
          </div>

          <label className="block">
            <div className="mb-2 text-sm font-black text-slate-700">확인 문구</div>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={CONFIRM_TEXT}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition-colors focus:border-red-400 focus:ring-2 focus:ring-red-100"
              autoFocus
            />
          </label>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 bg-slate-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={!canDelete || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? '탈퇴 중' : '회원탈퇴'}
          </Button>
        </div>
      </form>
    </div>
  );
}
