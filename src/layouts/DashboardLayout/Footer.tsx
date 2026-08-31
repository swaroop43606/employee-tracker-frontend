import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="h-10 bg-white border-t border-slate-200/60 px-6 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
      <span>Employee Daily Task Tracker &copy; {new Date().getFullYear()}</span>
      <span className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        System Operational
      </span>
    </footer>
  );
};
