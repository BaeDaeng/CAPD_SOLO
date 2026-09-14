import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../store/useAppStore';
import Card from '../components/Card';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import { authApi, userApi } from '../api/apiClient';

export default function LoginPage() {
  const [isDoctor, setIsDoctor] = useState(false);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const { setSession } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const role = isDoctor ? 'doctor' : 'patient';
      const response = isDoctor
        ? await authApi.loginDoctor({ licenseId: id, password })
        : await authApi.loginPatient({ email: id, password });

      setSession(role, response);
      navigate(isDoctor ? '/doctor' : '/patient');
    } catch (loginError) {
      setError(loginError.message || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-md p-8 sm:max-w-lg sm:px-10 sm:py-12 lg:max-w-lg lg:px-12 lg:py-14">
        <div className="text-center mb-8 lg:mb-10">
          <h1 className="text-3xl font-black text-blue-600 mb-2 md:text-4xl">CAPD Care</h1>
          <p className="text-gray-500">복막투석 환자 맞춤형 관리 시스템</p>
        </div>

        {/* 유저 타입 선택 탭 */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 lg:mb-8">
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all md:py-2.5 md:text-base ${!isDoctor ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsDoctor(false)}
          >
            환자 로그인
          </button>
          <button
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all md:py-2.5 md:text-base ${isDoctor ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setIsDoctor(true)}
          >
            의사 로그인
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 lg:space-y-6">
          <Input
            label={isDoctor ? "의사번호" : "이메일"}
            placeholder={isDoctor ? "의사번호를 입력하세요" : "example@mail.com"}
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
          />
          <PasswordInput
            label="비밀번호"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsPasswordResetOpen(true)}
              className="text-xs font-bold text-blue-600 transition-colors hover:text-blue-700"
            >
              비밀번호 찾기
            </button>
          </div>
          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full py-3 text-lg mt-2 md:py-3.5 md:text-xl">
            {isLoading ? '로그인 중' : '로그인'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 lg:mt-10 lg:pt-8">
          <p className="text-center text-sm text-gray-500 mb-4">아직 계정이 없으신가요?</p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate('/register/patient')}>
              환자 회원가입
            </Button>
            <Button variant="outline" onClick={() => navigate('/register/doctor')}>
              의사 회원가입
            </Button>
          </div>
        </div>
      </Card>

      {isPasswordResetOpen && (
        <PasswordResetModal onClose={() => setIsPasswordResetOpen(false)} />
      )}
    </div>
  );
}

function PasswordResetModal({ onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    setIsSubmitting(true);

    try {
      await userApi.resetPassword({ email: email.trim() });
      alert('입력한 이메일로 임시 비밀번호가 발송되었습니다.');
      onClose();
    } catch (resetError) {
      setError(resetError.message || '비밀번호 찾기에 실패했습니다.');
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
              <h2 className="text-xl font-black text-slate-900">비밀번호 찾기</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                가입한 이메일로 임시 비밀번호를 발송합니다.
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
          <Input
            label="이메일"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@mail.com"
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
          <Button type="submit" disabled={!email.trim() || isSubmitting} className="flex-1">
            {isSubmitting ? '발송 중' : '임시 비밀번호 발송'}
          </Button>
        </div>
      </form>
    </div>
  );
}
