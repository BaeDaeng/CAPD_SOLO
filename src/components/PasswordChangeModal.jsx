import React, { useState } from 'react';
import Button from './Button';
import PasswordInput from './PasswordInput';
import { userApi } from '../api/apiClient';
import { getPasswordFeedback, isValidPassword, PASSWORD_GUIDE } from '../utils/passwordValidation';

export default function PasswordChangeModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const newPasswordFeedback = getPasswordFeedback(newPassword);
  const confirmPasswordFeedback = confirmPassword
    ? newPassword === confirmPassword
      ? { type: 'success', message: '비밀번호가 일치합니다.' }
      : { type: 'error', message: '비밀번호가 일치하지 않습니다.' }
    : null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_GUIDE);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 서로 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await userApi.changePassword({ currentPassword, newPassword });
      alert('비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.');
      onClose();
    } catch (changeError) {
      setError(changeError.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">비밀번호 변경</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                현재 비밀번호 확인 후 새 비밀번호를 설정합니다.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1.5 text-xl font-black text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              X
            </button>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <PasswordInput
            label="현재 비밀번호"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <PasswordInput
            label="새 비밀번호"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="영어, 숫자, 특수문자 포함 8~20자"
            feedback={newPasswordFeedback}
            required
          />
          <PasswordInput
            label="새 비밀번호 확인"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            feedback={confirmPasswordFeedback}
            required
          />

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
            disabled={!currentPassword || !newPassword || !confirmPassword || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? '변경 중' : '변경하기'}
          </Button>
        </div>
      </form>
    </div>
  );
}
