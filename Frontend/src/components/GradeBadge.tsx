import React from 'react';

const GRADE_COLORS = {
  A: '#27AE60',
  B: '#82E0AA',
  C: '#F4D03F',
  D: '#E67E22',
  F: '#C0392B'
};

export function GradeBadge({ grade, score, size = 'md' }) {
  const color = GRADE_COLORS[grade] || '#95A5A6';
  const sizeClasses = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-48 h-48 text-7xl lg:w-64 lg:h-64 lg:text-8xl' // responsive for public display
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-full text-white font-bold transition-colors duration-500 shadow-lg ${sizeClasses[size]}`}
      style={{ backgroundColor: color }}
    >
      <span>{grade}</span>
      {score !== undefined && (
        <span className={`absolute bottom-2 text-white/90 font-medium ${size === 'xl' ? 'text-xl lg:text-2xl bottom-4' : 'text-xs'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

export function GradeBadgeOutline({ grade }) {
  const color = GRADE_COLORS[grade] || '#95A5A6';
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold transition-colors duration-500 border-2 w-8 h-8 text-sm"
      style={{ borderColor: color, color: color }}
    >
      {grade}
    </div>
  );
}
