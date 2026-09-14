import React, { useState } from 'react';

export default function PasswordInput({
  label,
  error,
  feedback,
  className = '',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const feedbackClassName = feedback?.type === 'success' ? 'text-emerald-600' : 'text-red-500';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <div className="relative">
        <input
          type={isVisible ? 'text' : 'password'}
          className={`w-full rounded-lg border px-3 py-2.5 pr-14 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setIsVisible(prev => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          {isVisible ? '숨김' : '보기'}
        </button>
      </div>
      {error && <span className="text-xs font-medium text-red-500">{error}</span>}
      {!error && feedback && (
        <span className={`text-xs font-bold ${feedbackClassName}`}>{feedback.message}</span>
      )}
    </div>
  );
}
