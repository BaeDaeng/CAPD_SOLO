import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 어두운 배경 (클릭 시 모달 닫힘) */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* 모달 콘텐츠 박스 */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold p-2"
        >
          ✕
        </button>
        {title && <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  );
}