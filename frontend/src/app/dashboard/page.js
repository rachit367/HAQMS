'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useDebounce } from '@/lib/useDebounce';
import {
  CalendarDays, Activity, Search, UserPlus,
  Trash2, ClipboardList, TrendingUp, Award, Clock,
  ArrowRight, ShieldAlert,
} from 'lucide-react';

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('');

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });
  const debouncedSearch = useDebounce(patientSearch, 350);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  const [doctorsList, setDoctorsList] = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [checkinMessage, setCheckinMessage] = useState('');
  const [checkinDoctorId, setCheckinDoctorId] = useState('');
  const [walkinPatientId, setWalkinPatientId] = useState('');
  const [walkinDoctorId, setWalkinDoctorId] = useState('');

  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  const [adminReportData, setAdminReportData] = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || activeTab) return;
    const tabByRole = { ADMIN: 'reports', RECEPTIONIST: 'patients', DOCTOR: 'appointments' };
    setActiveTab(tabByRole[user.role] || '');
  }, [user, activeTab]);

  const fetchPatients = useCallback(async (page = 1) => {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '5' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (patientGender) params.set('gender', patientGender);
      const data = await apiFetch(`/patients?${params.toString()}`);
      setPatients(Array.isArray(data?.patients) ? data.patients : []);
      setPatientsPagination({
        page: data?.pagination?.page || 1,
        totalPages: data?.pagination?.totalPages || 1,
        totalPatients: data?.pagination?.totalPatients || 0,
      });
    } catch (err) {
      setPatients([]);
      setPatientsError(err.message);
    } finally {
      setPatientsLoading(false);
    }
  }, [debouncedSearch, patientGender]);

  const fetchDoctors = useCallback(async () => {
    try {
      const data = await apiFetch('/doctors');
      setDoctorsList(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch {
      setDoctorsList([]);
    }
  }, []);

  const matchedDoctor = doctorsList.find((d) => d.userId === user?.id);

  const fetchDoctorWorklist = useCallback(async () => {
    if (!user || user.role !== 'DOCTOR' || !matchedDoctor) return;
    try {
      const appData = await apiFetch(`/appointments?doctorId=${matchedDoctor.id}`);
      setDoctorAppointments(Array.isArray(appData?.appointments) ? appData.appointments : []);
      const queueData = await apiFetch(`/queue?doctorId=${matchedDoctor.id}`);
      setDoctorQueue(Array.isArray(queueData?.tokens) ? queueData.tokens : []);
    } catch (err) {
      setCheckinMessage(`Error loading worklist: ${err.message}`);
    }
  }, [user, matchedDoctor]);

  useEffect(() => {
    if (user) fetchDoctors();
  }, [user, fetchDoctors]);

  useEffect(() => {
    if (user && (user.role === 'RECEPTIONIST' || user.role === 'ADMIN')) {
      fetchPatients(1);
    }
  }, [user, fetchPatients]);

  useEffect(() => {
    if (user && user.role === 'DOCTOR' && matchedDoctor) {
      fetchDoctorWorklist();
    }
  }, [user, matchedDoctor, fetchDoctorWorklist]);

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');
    if (!regName || !regPhone || !regAge) {
      setRegMessage('Error: Name, Age and Phone number are required.');
      return;
    }
    try {
      await apiFetch('/patients', {
        method: 'POST',
        body: { name: regName, email: regEmail || undefined, phoneNumber: regPhone, age: regAge, gender: regGender, medicalHistory: regHistory || undefined },
      });
      setRegMessage('Success: Patient registered successfully!');
      setRegName(''); setRegEmail(''); setRegPhone(''); setRegAge(''); setRegHistory('');
      fetchPatients(1);
    } catch (err) {
      setRegMessage(`Error: ${err.message}`);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingMessage('');
    if (!bookingPatientId || !bookingDoctorId || !bookingDate) {
      setBookingMessage('Error: All booking fields are required.');
      return;
    }
    try {
      await apiFetch('/appointments', {
        method: 'POST',
        body: { patientId: bookingPatientId, doctorId: bookingDoctorId, appointmentDate: bookingDate, reason: bookingReason },
      });
      setBookingMessage('Success: Appointment booked successfully!');
      setBookingReason('');
      if (user.role === 'DOCTOR') fetchDoctorWorklist();
    } catch (err) {
      setBookingMessage(`Error: ${err.message}`);
    }
  };

  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to delete this patient record?')) return;
    try {
      const data = await apiFetch(`/patients/${id}`, { method: 'DELETE' });
      alert(`Patient deleted.`);
      fetchPatients(patientsPagination.page);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    if (!patientId || !doctorId) {
      setCheckinMessage('Error: Select both a patient and a physician.');
      return;
    }
    try {
      const data = await apiFetch('/queue/checkin', {
        method: 'POST',
        body: { patientId, doctorId, appointmentId: appointmentId || undefined },
      });
      setCheckinMessage(`Checked in! Generated Token #${data.token.tokenNumber}`);
      if (user.role === 'DOCTOR') fetchDoctorWorklist();
    } catch (err) {
      setCheckinMessage(`Error check-in: ${err.message}`);
    }
  };

  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    try {
      await apiFetch(`/queue/${tokenId}`, { method: 'PATCH', body: { status: newStatus } });
      fetchDoctorWorklist();
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  const handleCompleteAppointment = async (appId) => {
    try {
      await apiFetch(`/appointments/${appId}`, { method: 'PATCH', body: { status: 'COMPLETED' } });
      fetchDoctorWorklist();
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      const data = await apiFetch('/reports/doctor-stats');
      setAdminReportData(data);
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const searchPhysiciansAdmin = async () => {
    try {
      const params = adminSearchQuery ? `?search=${encodeURIComponent(adminSearchQuery)}` : '';
      const data = await apiFetch(`/doctors${params}`);
      setDoctorsList(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  if (loading || !user) return null;

  const reportTotals = adminReportData?.report ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4">
          {user.role === 'ADMIN' && (
            <>
              <button onClick={() => setActiveTab('reports')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'reports' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                System Audit Reports
              </button>
              <button onClick={() => setActiveTab('physicians')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'physicians' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Physician Registry
              </button>
            </>
          )}

          {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
            <>
              <button onClick={() => setActiveTab('patients')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'patients' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Patient Registry Directory
              </button>
              <button onClick={() => setActiveTab('book')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'book' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Scheduling / Check-in Portal
              </button>
            </>
          )}

          {user.role === 'DOCTOR' && (
            <>
              <button onClick={() => setActiveTab('appointments')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                My Scheduled Bookings
              </button>
              <button onClick={() => setActiveTab('queue')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'queue' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Active Calling Queue
              </button>
            </>
          )}
        </div>

        {checkinMessage && (
          <div className="p-4 mb-6 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-between text-sm">
            <span>{checkinMessage}</span>
            <button onClick={() => setCheckinMessage('')} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    Patient Lookup Directory
                  </h3>

                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input type="text" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Search by name, phone or email..." className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
                    </div>
                    <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)} className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {patientsError ? (
                    <p className="text-center py-6 text-rose-500 text-sm">{patientsError}</p>
                  ) : patientsLoading ? (
                    <p className="text-center py-6 text-slate-400 animate-pulse text-sm">Synchronizing table data...</p>
                  ) : patients.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-sm">No registered patients match this filter.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                        <thead>
                          <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Contact</th>
                            <th className="pb-3">Age/Sex</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {patients.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
                              <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                <Link href={`/patients/${p.id}`} className="hover:text-teal-600 hover:underline">{p.name}</Link>
                                {p.email && <span className="block text-xxs text-slate-400 font-normal mt-0.5">{p.email}</span>}
                              </td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{p.phoneNumber}</td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400">
                                {p.age} yrs / <span className="capitalize">{p.gender}</span>
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                <button onClick={() => handleQueueCheckin(p.id, checkinDoctorId)} className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500 hover:text-white transition-colors">
                                  Check In
                                </button>
                                {user.role === 'ADMIN' && (
                                  <button onClick={() => handleDeletePatient(p.id)} className="text-xxs p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors" title="Delete patient record">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4">
                    <label className="text-xxs text-slate-400 font-semibold flex items-center gap-2">
                      Check-in physician:
                      <select value={checkinDoctorId} onChange={(e) => setCheckinDoctorId(e.target.value)} className="px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded text-xs">
                        <option value="">-- Select --</option>
                        {doctorsList.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">
                      Page {patientsPagination.page} of {patientsPagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button disabled={patientsPagination.page <= 1} onClick={() => fetchPatients(patientsPagination.page - 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold">Prev</button>
                      <button disabled={patientsPagination.page >= patientsPagination.totalPages} onClick={() => fetchPatients(patientsPagination.page + 1)} className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold">Next</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 h-fit">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-teal-600" />
                  New Registration
                </h3>
                {regMessage && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${regMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>{regMessage}</div>
                )}
                <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div>
                    <label className="block mb-1">Patient Full Name*</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Bruce Wayne" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Age (Years)*</label>
                      <input type="number" required value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="35" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block mb-1">Gender*</label>
                      <select value={regGender} onChange={(e) => setRegGender(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Contact Phone*</label>
                    <input type="text" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="555-0199" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block mb-1">Email Address</label>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="bruce@wayne.com" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block mb-1">Medical History (Optional)</label>
                    <textarea value={regHistory} onChange={(e) => setRegHistory(e.target.value)} placeholder="E.g. cardiovascular risks, asthma..." rows="3" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"></textarea>
                  </div>
                  <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2">Register Patient Record</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'book' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Schedule Appointment Slot
              </h3>
              {bookingMessage && (
                <div className={`p-3 text-sm rounded-lg mb-4 ${bookingMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>{bookingMessage}</div>
              )}
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Select Registered Patient*</label>
                  <select required value={bookingPatientId} onChange={(e) => setBookingPatientId(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (<option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Select Physician*</label>
                  <select required value={bookingDoctorId} onChange={(e) => setBookingDoctorId(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map((d) => (<option key={d.id} value={d.id}>{d.name} - {d.specialization} (${d.consultationFee})</option>))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Appointment Date & Time*</label>
                  <input type="datetime-local" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1">Consultation Reason</label>
                  <input type="text" value={bookingReason} onChange={(e) => setBookingReason(e.target.value)} placeholder="Regular diagnostic review..." className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                </div>
                <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2">Book Appointment Slot</button>
              </form>
            </div>

            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-teal-600" />
                Active Direct Queue Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold">
                Generate an immediate waiting token for a direct walk-in patient.
              </p>
              <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Select Walk-in Patient*</label>
                  <select value={walkinPatientId} onChange={(e) => setWalkinPatientId(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Assign Physician*</label>
                  <select value={walkinDoctorId} onChange={(e) => setWalkinDoctorId(e.target.value)} className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>))}
                  </select>
                </div>
                <button onClick={() => handleQueueCheckin(walkinPatientId, walkinDoctorId)} className="glow-btn w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2">Generate Live Token</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Scheduled Daily Bookings List
              </h3>
              {doctorAppointments.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No appointments scheduled for you today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3">Time</th>
                        <th className="pb-3">Patient</th>
                        <th className="pb-3">Consultation Reason</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {doctorAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5">
                            <button onClick={() => setSelectedPatientHistory(app.patient)} className="font-bold text-teal-600 hover:underline hover:text-teal-700 transition-colors">
                              {app.patient ? app.patient.name : 'Unknown Patient'}
                            </button>
                            <span className="block text-xxs text-slate-400 mt-0.5">Age: {app.patient?.age ?? '—'}</span>
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400 font-semibold">{app.reason || 'None provided'}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${app.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : app.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>{app.status}</span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button onClick={() => handleQueueCheckin(app.patientId, matchedDoctor?.id, app.id)} className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold hover:bg-teal-500 hover:text-white transition-colors">Check In Patient</button>
                                <button onClick={() => handleCompleteAppointment(app.id)} className="text-xxs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-teal-500 hover:text-white transition-colors">Complete</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedPatientHistory && (
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Medical Records: {selectedPatientHistory.name}</h3>
                    <p className="text-xxs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Gender: {selectedPatientHistory.gender ?? '—'} | Contact: {selectedPatientHistory.phoneNumber}
                    </p>
                  </div>
                  <button onClick={() => setSelectedPatientHistory(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider">Clinical Background Information</h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-5 text-sm font-semibold">
                    {selectedPatientHistory.medicalHistory?.toUpperCase() || 'No medical history recorded.'}
                  </p>
                </div>
                <div className="pt-2 flex justify-between items-center text-xs">
                  <Link href={`/patients/${selectedPatientHistory.id}/history-records`} className="text-teal-600 font-extrabold hover:underline flex items-center gap-1">
                    View Diagnostic Reports Details (Legacy App)
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-teal-600" />
              Active Operations Queue Controller
            </h3>
            {doctorQueue.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">No checked-in patients in queue today.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div key={t.id} className={`p-5 rounded-2xl border shadow-md relative overflow-hidden flex flex-col justify-between ${t.status === 'CALLING' ? 'border-teal-500 bg-teal-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-500/5'}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">Token #{t.tokenNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${t.status === 'CALLING' ? 'bg-teal-500 text-white' : t.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : 'bg-amber-500/10 text-amber-500'}`}>{t.status}</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.patient?.name ?? 'Unknown'}</h4>
                      <p className="text-xxs text-slate-400 mt-0.5">Contact: {t.patient?.phoneNumber ?? '—'}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      {t.status === 'WAITING' && (
                        <button onClick={() => handleUpdateQueueStatus(t.id, 'CALLING')} className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors">Call Patient</button>
                      )}
                      {t.status === 'CALLING' && (
                        <>
                          <button onClick={() => handleUpdateQueueStatus(t.id, 'COMPLETED')} className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors">Consulted</button>
                          <button onClick={() => handleUpdateQueueStatus(t.id, 'SKIPPED')} className="flex-1 py-1.5 bg-rose-500/10 text-rose-500 font-bold text-xxs rounded hover:bg-rose-500 hover:text-white transition-colors">Skip / No Show</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                    Doctor Revenue & Operations Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">System-wide practitioner performance audits.</p>
                </div>
                <button onClick={generateSystemReport} disabled={adminReportLoading} className="glow-btn px-4 py-2 bg-teal-600 text-white font-extrabold text-xs rounded-lg shadow hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {adminReportLoading ? 'Aggregating...' : 'Load Doctor System Audit Report'}
                </button>
              </div>

              {adminReportLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="mt-4 text-xs font-semibold text-slate-400 animate-pulse">Loading report...</p>
                </div>
              ) : !adminReportData ? (
                <div className="p-8 text-center bg-slate-100 dark:bg-slate-800/40 rounded-xl text-slate-400 text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-700">
                  Click the button above to load reports.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Physicians</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{reportTotals.length}</h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Sum appointments</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{reportTotals.reduce((sum, item) => sum + item.totalAppointments, 0)}</h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Sales ($)</span>
                      <h4 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">${reportTotals.reduce((sum, item) => sum + item.revenue, 0)}</h4>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-3">Doctor</th>
                          <th className="pb-3">Department</th>
                          <th className="pb-3 text-center">Consultations</th>
                          <th className="pb-3 text-center">Today Queue</th>
                          <th className="pb-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {reportTotals.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                              {item.name}
                              <span className="block text-xxs text-teal-600 dark:text-teal-400 font-semibold uppercase mt-0.5">{item.specialization}</span>
                            </td>
                            <td className="py-3.5 text-slate-500 dark:text-slate-400">{item.department}</td>
                            <td className="py-3.5 text-center text-slate-500 dark:text-slate-400">{item.completedAppointments} Completed / {item.totalAppointments} Total</td>
                            <td className="py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{item.todayQueueSize} in queue</td>
                            <td className="py-3.5 text-right font-bold text-teal-600 dark:text-teal-400">${item.revenue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'physicians' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                Staff Physicians Registry Lookup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Search the physician directory by name.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1 rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input type="text" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPhysiciansAdmin()} placeholder="Enter physician name..." className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
              <button onClick={searchPhysiciansAdmin} className="glow-btn px-5 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-800 dark:hover:bg-teal-400 transition-colors">Search</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctorsList.map((doc) => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-500/5 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">{doc.department}</span>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100">{doc.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.specialization}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>Exp: {doc.experience} yrs</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">Fee: ${doc.consultationFee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
