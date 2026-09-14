import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import { doctorApi, userApi } from '../api/apiClient';
import { formatPhoneNumber } from '../api/adapters';
import { getPasswordFeedback, isValidPassword, PASSWORD_GUIDE } from '../utils/passwordValidation';

export default function DoctorRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    doctorNumber: '', // 면허번호
    email: '',        // 이메일
    password: '',     // 비밀번호
    confirmPassword: '', // 비밀번호 확인
    name: '',         // 이름
    phone: '',        // 전화번호
  });

  const [emailCode, setEmailCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordFeedback = getPasswordFeedback(formData.password);
  const confirmPasswordFeedback = formData.confirmPassword
    ? formData.password === formData.confirmPassword
      ? { type: 'success', message: '비밀번호가 일치합니다.' }
      : { type: 'error', message: '비밀번호가 일치하지 않습니다.' }
    : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? formatPhoneNumber(value) : value;

    setFormData({ ...formData, [name]: nextValue });

    if (name === 'email') {
      setEmailCode('');
      setEmailSent(false);
      setEmailVerified(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!formData.email.trim()) {
      alert('이메일을 먼저 입력해주세요.');
      return;
    }

    setIsSendingEmail(true);

    try {
      await userApi.sendEmailVerification({ email: formData.email.trim() });
      setEmailCode('');
      setEmailSent(true);
      setEmailVerified(false);
      alert('입력한 이메일로 인증번호를 발송했습니다.');
    } catch (error) {
      alert(error.message || '이메일 인증번호 발송에 실패했습니다.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCheckEmailCode = async () => {
    if (!emailCode.trim()) {
      alert('인증번호를 입력해주세요.');
      return;
    }

    setIsCheckingCode(true);

    try {
      await userApi.verifyEmailCode({
        email: formData.email.trim(),
        code: emailCode.trim(),
      });
      setEmailVerified(true);
      alert('이메일 인증이 완료되었습니다.');
    } catch (error) {
      alert(error.message || '인증번호 확인에 실패했습니다.');
    } finally {
      setIsCheckingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!isValidPassword(formData.password)) {
      alert(PASSWORD_GUIDE);
      return;
    }

    if (!emailVerified) {
      alert('이메일 인증을 완료해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await doctorApi.signUp({
        licenseId: formData.doctorNumber,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });

      alert('의사 회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    } catch (submitError) {
      alert(submitError.message || '회원가입에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10 sm:p-6 lg:p-8 lg:py-12">
      <Card className="w-full max-w-lg p-8 sm:max-w-xl sm:px-10 sm:py-12 lg:max-w-xl lg:px-12 lg:py-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center md:text-3xl lg:mb-8">의사 회원가입</h2>
        <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
          <Input
            label="면허번호"
            name="doctorNumber"
            placeholder="의사 면허번호를 입력하세요"
            onChange={handleChange}
            required
          />

          <Input
            label="이름"
            name="name"
            placeholder="성함을 입력하세요"
            onChange={handleChange}
            required
          />

          <Input
            label="전화번호"
            name="phone"
            placeholder="010-0000-0000"
            value={formData.phone}
            inputMode="numeric"
            maxLength={13}
            onChange={handleChange}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">이메일</label>
            <div className="flex gap-2">
              <input
                name="email"
                type="email"
                placeholder="doctor@hospital.com"
                value={formData.email}
                onChange={handleChange}
                disabled={emailVerified}
                required
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none transition-all focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                type="button"
                onClick={handleSendEmailCode}
                disabled={isSendingEmail || emailVerified}
                className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                  emailVerified
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300'
                }`}
              >
                {emailVerified ? '인증완료' : isSendingEmail ? '전송중' : '인증하기'}
              </button>
            </div>

            {emailSent && !emailVerified && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="인증번호 입력"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleCheckEmailCode}
                  disabled={isCheckingCode}
                  className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {isCheckingCode ? '확인중' : '확인하기'}
                </button>
              </div>
            )}

            {emailVerified && (
              <p className="text-xs font-bold text-blue-600">이메일 인증이 완료되었습니다.</p>
            )}
          </div>

          <PasswordInput
            label="비밀번호"
            name="password"
            placeholder="영문 대소문자, 숫자, 특수문자를 포함하여 8~20자"
            value={formData.password}
            onChange={handleChange}
            feedback={passwordFeedback}
            required
          />

          <PasswordInput
            label="비밀번호 확인"
            name="confirmPassword"
            placeholder="비밀번호 재입력"
            value={formData.confirmPassword}
            onChange={handleChange}
            feedback={confirmPasswordFeedback}
            required
          />

          <div className="pt-4 flex flex-col gap-3 lg:pt-6">
            <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg md:py-3.5 md:text-xl">
              {isSubmitting ? '가입 중' : '가입 완료'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/login')} className="w-full">
              이전으로
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
