import React, { useEffect, useRef, useState } from 'react';
import { BIRTH_YEAR_MAX, BIRTH_YEAR_MIN, isValidBirthDateParts } from '../utils/birthDate';

const years = Array.from(
  { length: BIRTH_YEAR_MAX - BIRTH_YEAR_MIN + 1 },
  (_, index) => String(BIRTH_YEAR_MAX - index),
);
const months = Array.from({ length: 12 }, (_, index) => String(index + 1));
const days = Array.from({ length: 31 }, (_, index) => String(index + 1));

function BirthDatePartInput({
  value,
  onChange,
  placeholder,
  options,
  maxLength,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={maxLength}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-9 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`${ariaLabel} 선택 목록 열기`}
        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-xs font-black text-slate-500 transition-colors hover:bg-slate-100"
      >
        ▼
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(option)}
              className={`block w-full px-3 py-2 text-left text-sm font-bold transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                String(value) === option ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BirthDateInput({ value, onChange, showError = false }) {
  const isInvalid = showError && !isValidBirthDateParts(value);
  const updatePart = (key, nextValue) => onChange({ ...value, [key]: nextValue });

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">생년월일</label>
      <div className="grid grid-cols-[1fr_0.75fr_0.75fr] gap-2">
        <BirthDatePartInput
          value={value.year}
          onChange={(nextValue) => updatePart('year', nextValue)}
          placeholder="년(4자)"
          options={years}
          maxLength={4}
          ariaLabel="출생 연도"
        />
        <BirthDatePartInput
          value={value.month}
          onChange={(nextValue) => updatePart('month', nextValue)}
          placeholder="월"
          options={months}
          maxLength={2}
          ariaLabel="출생 월"
        />
        <BirthDatePartInput
          value={value.day}
          onChange={(nextValue) => updatePart('day', nextValue)}
          placeholder="일"
          options={days}
          maxLength={2}
          ariaLabel="출생 일"
        />
      </div>
      {isInvalid && <p className="text-xs font-bold text-red-500">잘못된 입력</p>}
    </div>
  );
}
