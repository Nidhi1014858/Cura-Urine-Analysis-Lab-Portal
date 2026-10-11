import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { StatusBadge, PanelBadge } from '../components/common/Badge';
import { ReviewModal } from '../components/review/ReviewModal';
import { formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  CheckSquare, 
  AlertTriangle, 
  Building2, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const { user, isClinician } = useAuth();
  const { addToast } = useToast();
  const { refreshPendingCount } = useOutletContext() || {};

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAbnormalOnly, setFilterAbnormalOnly] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        reviewStatus: 'pending',
        ...(filterAbnormalOnly ? { overallStatus: 'abnormal' } : {})
      };

      const data = await mockApi.getTests(filters);
      let list = Array.isArray(data) ? [...data] : [];

      // Sort abnormal findings first, then newest first
      list.sort((a, b) => {
        if (a.overallStatus === 'abnormal' && b.overallStatus !== 'abnormal') return -1;
        if (a.overallStatus !== 'abnormal' && b.overallStatus === 'abnormal') return 1;
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      });

      setQueue(list);
    } catch (err) {
      console.error('Failed to load review queue', err);
      setError(err?.message || 'Failed to load review queue.');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [filterAbnormalOnly]);

  const handleOpenReview = (test, e) => {
    e.stopPropagation();
    if (!isClinician) {
      addToast('Only Clinicians have permission to review reports.', 'error');
      return;
    }
    setSelectedTest(test);
    setIsReviewModalOpen(true);
  };

  const handleReviewSubmitted = async (testId, reviewData) => {
    if (!isClinician) {
      addToast('Only Clinicians have permission to review reports.', 'error');
      return;
    }
    try {
      await mockApi.updateClinicianReview(testId, {
        status: reviewData.status,
        notes: reviewData.notes
      });
      await loadQueue();
      if (refreshPendingCount) refreshPendingCount();
    } catch (err) {
      console.error('Failed to submit review', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
              Clinician Review Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500 text-white animate-pulse">
              {queue.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Worklist for reviewing clinicians — prioritized abnormal findings first.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setFilterAbnormalOnly(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !filterAbnormalOnly
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Pending ({queue.length})
          </button>
          <button
            onClick={() => setFilterAbnormalOnly(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              filterAbnormalOnly
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Abnormal First Only
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadQueue}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Loading review worklist..." />
      ) : queue.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">Review Queue is Clear!</h3>
          <p className="text-xs max-w-sm mx-auto">
            All submitted point-of-care test reports have been verified by a clinician.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((test) => {
            const isAbnormal = test.overallStatus === 'abnormal';
            return (
              <div
                key={test.id || test._id || test.testCode}
                onClick={() => navigate(`/reports/${test.id || test._id || test.testCode}`)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md ${
                  isAbnormal
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
                }`}
              >
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-teal-600 dark:text-teal-400">
                      {test.testCode}
                    </span>
                    <PanelBadge type={test.panelType} />
                    <StatusBadge status={test.overallStatus} />
                    <span className="text-[11px] font-mono text-slate-400">
                      Submitted: {formatDate(test.submittedAt)}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Patient: {test.patientName} <span className="font-mono text-xs text-slate-400">({test.patientCode})</span>
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Prepared for: <strong className="text-slate-700 dark:text-slate-300">{test.reportDestination}</strong>
                  </p>

                  {/* Summary of findings preview */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {test.analytes?.filter(a => a.flag !== 'normal').map(a => (
                      <span key={a.id} className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                        {a.name}: {a.value}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Review Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {isClinician && (
                    <button
                      onClick={(e) => handleOpenReview(test, e)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
                    >
                      <UserCheck className="w-4 h-4" /> Review & Approve
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reports/${test.id || test._id || test.testCode}`);
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                    title="View Full Report Detail"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        test={selectedTest}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
