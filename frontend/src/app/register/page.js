'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, Lock, Mail, Activity } from 'lucide-react';

export default function Register() {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name.trim()) return setError('Please enter your full name.');
    if (!emailRegex.test(email)) return setError('Please enter a valid email format.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Password must include uppercase, lowercase, and a number.');
    }
    if (password !== confirm) return setError('Passwords do not match.');

    const result = await register(name, email, password);
    if (!result.success) setError(result.error || 'Registration failed');
  };

  return (
    <div className="flex flex-col min-h-screen justify-center items-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-teal-600 dark:text-teal-400 font-extrabold text-3xl">
          <Activity className="h-8 w-8 animate-pulse" /> HAQMS
        </Link>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-800 dark:text-slate-100">Create your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg">{error}</div>
            )}
            <Field icon={<User className="h-5 w-5" />} label="Full Name">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Sarah Connor" className={inputClass} />
            </Field>
            <Field icon={<Mail className="h-5 w-5" />} label="Email Address">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@hospital.com" className={inputClass} />
            </Field>
            <Field icon={<Lock className="h-5 w-5" />} label="Password">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
            </Field>
            <Field icon={<Lock className="h-5 w-5" />} label="Confirm Password">
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={inputClass} />
            </Field>
            <button type="submit" disabled={loading} className="glow-btn w-full flex justify-center py-2.5 px-4 rounded-lg shadow-md text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 transition-all duration-300 disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-teal-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass = 'block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-sm';

function Field({ icon, label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="mt-1 relative rounded-lg shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">{icon}</div>
        {children}
      </div>
    </div>
  );
}
