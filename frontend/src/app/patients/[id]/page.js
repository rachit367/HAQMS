'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/common/Navbar';
import { apiFetch } from '@/lib/api';
import { User, ArrowLeft, ArrowRight, Phone, Mail } from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(`/patients/${id}`);
      setPatient(data.patient);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 sm:p-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {loading ? (
          <p className="text-center py-20 text-slate-400 animate-pulse text-sm">Loading patient...</p>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">{error}</div>
        ) : patient ? (
          <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
                <User className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{patient.name}</h1>
                <p className="text-xxs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{patient.age} yrs / {patient.gender}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Phone className="h-4 w-4 text-teal-600" /> {patient.phoneNumber}
              </div>
              {patient.email && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="h-4 w-4 text-teal-600" /> {patient.email}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <h2 className="text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2">Medical History</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-6 font-medium">
                {patient.medicalHistory?.trim() || 'No medical history on file.'}
              </p>
            </div>

            <Link href={`/patients/${patient.id}/history-records`} className="inline-flex items-center gap-1 text-teal-600 font-extrabold text-sm hover:underline">
              View full diagnostic record & appointment history
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
