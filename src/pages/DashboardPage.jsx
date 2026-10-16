import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FlaskConical, 
  CheckSquare, 
  AlertTriangle, 
  Users, 
  ArrowRight, 
  Clock, 
  Building2, 
  FileText,
  Plus, Search, PackageSearch, AlertCircle, RefreshCw, Package
} from 'lucide-react';
import { mockApi } from '../services/mockApi';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PanelBadge } from '../components/common/Badge';
import { formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [batchNumber, setBatchNumber] = useState('');
  const [batchResult, setBatchResult] = useState(undefined);

  const lookupBatch = async (e) => {
    e.preventDefault();
    if (!batchNumber.trim()) return;
    setBatchResult(await mockApi.getBatchSummary(batchNumber));
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      setError(err?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard statistics..." />;

  const isClinician = user?.role === 'Clinician';
  const isAdmin = user?.role === 'Admin';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Role Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 border border-white/20 backdrop-blur-md">
            {isAdmin ? 'System Administrator Portal' : isClinician ? 'Clinician Portal Active' : 'Point-of-Care Technician Mode'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
            Welcome, {user?.name || 'Practitioner'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
            {isAdmin
              ? 'Centralized laboratory configuration, system administration, and strip batch inventory management.'
              : isClinician
              ? `You have ${stats?.pendingReviewsCount || 0} pending test report(s) requiring clinical verification in your queue.`
              : 'Digitizing urinalysis strip readings at the point of care with automated non-linear concentration prediction.'}
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            {isAdmin ? (
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-900 font-bold text-xs shadow-md hover:bg-teal-50 transition-all"
              >
                <Package className="w-4 h-4 text-teal-700" />
                Manage Strip Inventory
              </button>
            ) : isClinician ? (
              <button
                onClick={() => navigate('/review-queue')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-900 font-bold text-xs shadow-md hover:bg-teal-50 transition-all"
              >
                <CheckSquare className="w-4 h-4 text-teal-700" />
                Open Review Queue ({stats?.pendingReviewsCount})
              </button>
            ) : (
              <button
                onClick={() => navigate('/new-test')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-teal-900 font-bold text-xs shadow-md hover:bg-teal-50 transition-all"
              >
                <Plus className="w-4 h-4 text-teal-700" />
                Start New Test Wizard
              </button>
            )}
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold text-xs transition-all"
            >
              Browse All Reports
            </button>
          </div>
        </div>

        {/* Background Reagent Motif */}
        <div className="absolute right-6 -bottom-10 opacity-10 pointer-events-none hidden md:flex items-end gap-2">
          <div className="w-8 h-48 bg-blue-400 rounded-t-xl"></div>
          <div className="w-8 h-64 bg-rose-400 rounded-t-xl"></div>
          <div className="w-8 h-40 bg-amber-400 rounded-t-xl"></div>
          <div className="w-8 h-56 bg-emerald-400 rounded-t-xl"></div>
        </div>
      </div>

      {location.state?.accessMessage && <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-semibold">{location.state.accessMessage}</div>}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadStats}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Tests */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">Today's Tests</span>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
              <FlaskConical className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {stats?.todayTestsCount || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Total overall: {stats?.totalTestsCount || 0} tests
          </p>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => isClinician && navigate('/review-queue')}
          className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group ${isClinician ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">Pending Review</span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {stats?.pendingReviewsCount || 0}
          </p>
          <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-semibold flex items-center gap-1">
            {isClinician ? <>Review Queue <ArrowRight className="w-3 h-3" /></> : 'Clinician action required'}
          </p>
        </div>

        {/* Abnormal Count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">Abnormal Findings</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {stats?.abnormalCount || 0}
          </p>
          <p className="text-[11px] text-rose-500 font-medium mt-1">
            Requires clinical attention
          </p>
        </div>

        {/* Total Patients */}
        <div 
          onClick={() => navigate('/patients')}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold">Registered Patients</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-3 font-mono">
            {stats?.totalPatientsCount || 0}
          </p>
          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold flex items-center gap-1">
            View Patients <ArrowRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div><h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex gap-2 items-center"><PackageSearch className="w-5 h-5 text-teal-600" />Look up strip batch</h3><p className="text-xs text-slate-500 mt-1">Find all reports and current lifecycle status for a reagent batch.</p></div>
        <form onSubmit={lookupBatch} className="flex gap-2 max-w-xl"><input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Enter batch number" className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs" /><button className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold flex gap-1.5 items-center"><Search className="w-4 h-4" />Look up</button></form>
        {batchResult === null && <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">No records found for this batch.</div>}
        {batchResult && <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-bold text-sm text-slate-900 dark:text-white">{batchResult.batchNumber}</p><p className="text-xs text-slate-500">{batchResult.stripBrand} · Manufactured {batchResult.manufactureDate || 'Not recorded'} · Expires {batchResult.expiryDate || 'Not recorded'}</p></div><span className={`px-2.5 py-1 h-fit rounded-full text-xs font-bold ${batchResult.status === 'Expired' ? 'bg-rose-100 text-rose-700' : batchResult.status === 'Expiring soon' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{batchResult.status}</span></div><p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{batchResult.tests.length} test(s) run with this batch</p><div className="divide-y divide-slate-100 dark:divide-slate-800">{batchResult.tests.map((test) => <button key={test.id || test._id || test.testCode} onClick={() => navigate(`/reports/${test.id || test._id || test.testCode}`)} className="w-full py-2 text-left flex justify-between text-xs hover:text-teal-600"><span className="font-semibold">{test.patientName}</span><span>{formatDate(test.submittedAt)} · {test.testCode}</span></button>)}</div></div>}
      </section>

      {/* Recent Tests Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Recent Urinalysis Submissions
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest test records across all pathology report destinations
            </p>
          </div>

          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
          >
            View All Reports <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-4">Test Code</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Panel Type</th>
                <th className="py-3 px-4">Report Destination</th>
                <th className="py-3 px-4">Result Flag</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
              {stats?.recentTests?.map((t) => (
                <tr 
                  key={t.id || t._id || t.testCode}
                  onClick={() => navigate(`/reports/${t.id || t._id || t.testCode}`)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-teal-600 dark:text-teal-400">
                    {t.testCode}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-slate-900 dark:text-white">
                    {t.patientName}
                    <div className="text-[10px] font-mono text-slate-400">{t.patientCode}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <PanelBadge type={t.panelType} />
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate max-w-[160px]">{t.reportDestination}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={t.overallStatus} />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={t.clinicianReview?.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${t.id || t._id || t.testCode}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 font-semibold transition-colors"
                    >
                      View Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
