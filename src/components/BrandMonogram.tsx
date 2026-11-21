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
      className={`flex shrink-0 items-center justify-center bg-[#18181B] font-display font-extrabold select-none shadow-sm ${sizeStyles[size]} ${className}`}
    >
      <span className="text-white">M</span>
      <span className="text-[#F97316]">A</span>
    </span>
  );
};
