import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={twMerge(clsx('flex flex-col items-center justify-center p-6 gap-3', className))}>
      <Loader2 className={twMerge(clsx('animate-spin text-indigo-600', sizes[size]))} />
      {text && <span className="text-sm font-medium text-slate-500">{text}</span>}
    </div>
  );
};
