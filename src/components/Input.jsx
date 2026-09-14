import React from 'react';

export default function Input({ 
  label, 
  error, 
  className = '', 
  ...props 
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <input
        className={`border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
}