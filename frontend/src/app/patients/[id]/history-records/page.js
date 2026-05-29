'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/common/Navbar';
import { apiFetch } from '@/lib/api';
import { FileText, ArrowLeft, Stethoscope, CalendarDays } from 'lucide-react';

const STATUS_STYLES = {
  COMPLETED: 'bg-teal-500/10 text-teal-600',
  CANCELLED: 'bg-rose-500/10 text-rose-500',
  PENDING: 'bg-amber-500/10 text-amber-500',
};

export default function PatientHistoryRecords() {
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

  const appointments = patient?.appointments ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-teal-600 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {loading ? (
          <p className="text-center py-20 text-slate-400 animate-pulse text-sm">Loading clinical record...</p>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">{error}</div>
        ) : patient ? (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{patient.name}</h1>
                  <p className="text-xxs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {patient.age} yrs / {patient.gender} · {patient.phoneNumber}{patient.email ? ` · ${patient.email}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-teal-600" /> Clinical Background
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-6 text-sm font-medium">
                {patient.medicalHistory?.trim() || 'No medical history on file for this patient.'}
              </p>
            </div>

            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <CalendarDays className="h-4 w-4 text-teal-600" /> Appointment History
              </h2>
              {appointments.length === 0 ? (
                <p className="text-slate-400 text-sm">No appointments recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Physician</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {appointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(app.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                          <td className="py-3.5 text-slate-600 dark:text-slate-300 font-semibold">
                            {app.doctor?.name ?? '—'}
                            <span className="block text-xxs text-teal-600 dark:text-teal-400">{app.doctor?.specialization}</span>
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400">{app.reason || 'None provided'}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold uppercase ${STATUS_STYLES[app.status] || ''}`}>{app.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
