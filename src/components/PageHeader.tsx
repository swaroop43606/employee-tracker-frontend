import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  action,
  className,
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2',
          className
        )
      )}
    >
      <div>
        {badgeText && (
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-[#991b1f] bg-[#fff8f3] border border-[#efe7e1] rounded-full mb-1.5">
            {badgeText}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
};
