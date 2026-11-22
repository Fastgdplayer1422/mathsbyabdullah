import React from 'react';

interface BrandMonogramProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandMonogram: React.FC<BrandMonogramProps> = ({ size = 'sm', className = '' }) => {
  const sizeStyles = {
    sm: 'h-8 w-8 rounded-lg text-[13px] tracking-tight',
    md: 'h-10 w-10 rounded-xl text-sm tracking-tight',
    lg: 'h-12 w-12 rounded-2xl text-lg tracking-tight',
  };

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-slate-900 dark:bg-slate-800 border border-slate-800 dark:border-slate-700 font-display font-extrabold select-none shadow-sm ${sizeStyles[size]} ${className}`}
    >
      <span className="text-slate-100 dark:text-slate-50">M</span>
      <span className="text-teal-400 dark:text-teal-300">A</span>
    </span>
  );
};
