'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ErrorFallback({ reset, title = 'Something went wrong', description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="glass p-8 rounded-2xl border border-rose-500/20 shadow-xl max-w-sm">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full w-fit mx-auto mb-6">
          <AlertTriangle className="h-9 w-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {description || 'This section failed to load. You can retry or go back to the dashboard.'}
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          {reset && (
            <button onClick={reset} className="glow-btn inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-colors">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
          <Link href="/dashboard" className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-500/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
