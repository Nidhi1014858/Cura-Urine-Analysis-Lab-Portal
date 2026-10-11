import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { PATHOLOGY_DESTINATIONS } from '../services/seedData';
import { StatusBadge, PanelBadge } from '../components/common/Badge';
import { formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Search, Filter, Building2, FlaskConical, ArrowRight } from 'lucide-react';

export function ReportsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    panelType: 'all',
    reportDestination: 'all',
    reviewStatus: 'all',
    overallStatus: 'all'
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await mockApi.getTests(filters);
      setTests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filters]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
            Urinalysis Test Reports
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Browse, filter, and inspect clinical reports across all pathology report destinations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search Test ID, patient, destination, or batch number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Panel Type Filter */}
          <select
            value={filters.panelType}
            onChange={(e) => setFilters({ ...filters, panelType: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
          >
            <option value="all">All Panel Types</option>
            <option value="10-panel">10-Panel Strip</option>
            <option value="14-panel">14-Panel Strip</option>
          </select>

          {/* Pathology Destination Filter */}
          <select
            value={filters.reportDestination}
            onChange={(e) => setFilters({ ...filters, reportDestination: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
          >
            <option value="all">All Pathology Destinations</option>
            {PATHOLOGY_DESTINATIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Review Verdict Filter */}
          <select
            value={filters.reviewStatus}
            onChange={(e) => setFilters({ ...filters, reviewStatus: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
          >
            <option value="all">All Review Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="flagged_retest">Flagged for Retest</option>
          </select>

          {/* Result Flag Filter */}
          <select
            value={filters.overallStatus}
            onChange={(e) => setFilters({ ...filters, overallStatus: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white outline-none"
          >
            <option value="all">All Findings</option>
            <option value="abnormal">Abnormal</option>
            <option value="trace">Trace</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      {loading ? (
        <LoadingSpinner text="Fetching test reports..." />
      ) : tests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
          <FlaskConical className="w-10 h-10 mx-auto text-slate-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">No reports match your filters</h3>
          <p className="text-xs">Try clearing search terms or changing pathology destination filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3.5 px-4">Test Code</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Panel Type</th>
                  <th className="py-3.5 px-4">Strip batch</th>
                  <th className="py-3.5 px-4">Pathology Destination</th>
                  <th className="py-3.5 px-4">Finding Flag</th>
                  <th className="py-3.5 px-4">Clinician Review</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
                {tests.map((t) => (
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
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 dark:text-slate-300"><div className="font-bold">{t.stripBatch || 'Not recorded'}</div><div>Mfg {t.manufactureDate || '—'} · Exp {t.expiryDate || '—'}</div>{t.expiryDate && new Date(`${t.expiryDate}T23:59:59`) < new Date() && <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Expired batch</span>}</td>
                    <td className="py-3.5 px-4 font-sans text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[170px]">{t.reportDestination}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.overallStatus} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.clinicianReview?.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(t.submittedAt)}
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
      )}
    </div>
  );
}
