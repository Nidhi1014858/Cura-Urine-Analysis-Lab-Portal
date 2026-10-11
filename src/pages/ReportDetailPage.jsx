import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { StatusBadge, PanelBadge } from '../components/common/Badge';
import { ReviewTimeline } from '../components/review/ReviewTimeline';
import { ReviewModal } from '../components/review/ReviewModal';
import { formatDate } from '../utils/formatters';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/common/Avatar';
import { 
  Building2, 
  Printer, 
  ArrowLeft, 
  UserCheck,
  ShieldCheck,
  Share2,
  QrCode,
  Copy,
  CheckCheck,
  X,
  Lock,
  Clock,
  ExternalLink,
  Wifi,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [test, setTest] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mockApi.getTestById(id);
      if (!data) {
        setError('Report not found');
        setTest(null);
        return;
      }
      setTest(data);
      if (data.patientId) {
        try {
          const p = await mockApi.getPatientById(data.patientId);
          setPatient(p);
        } catch (pErr) {
          console.warn('Could not load patient details', pErr);
        }
      }
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err?.message || 'Report not found');
      setTest(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleReviewSubmitted = async (testId, reviewData) => {
    if (user?.role !== 'Clinician') {
      addToast('Only Clinicians have permission to review reports.', 'error');
      return;
    }
    const targetId = testId || test?.id || test?._id || test?.testCode || id;
    try {
      const updated = await mockApi.updateClinicianReview(targetId, {
        status: reviewData.status,
        notes: reviewData.notes
      });
      setTest(updated || {
        ...test,
        clinicianReview: {
          reviewed: true,
          status: reviewData.status,
          notes: reviewData.notes,
          reviewedBy: user?.name,
          reviewerPhotoUrl: user?.photoUrl,
          reviewedAt: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Failed to submit review:', err);
      throw err;
    }
  };

  if (loading) return <LoadingSpinner text="Loading report details..." />;

  if (error || !test) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            {error || 'Report Not Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Could not retrieve test report #{id}. It may not exist or the server could not be reached.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
          >
            ← Back to All Reports
          </button>
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const isPendingReview = test.clinicianReview?.status === 'pending';
  const isClinician = user?.role === 'Clinician';
  const abnormalFindings = test.analytes?.filter((item) => item.flag === 'abnormal') || [];
  const traceFindings = test.analytes?.filter((item) => item.flag === 'trace') || [];
  const normalCount = (test.analytes?.length || 0) - abnormalFindings.length - traceFindings.length;
  const reportSummary = test.overallStatus === 'abnormal'
    ? 'Abnormal findings detected'
    : test.overallStatus === 'trace'
    ? 'Trace findings detected'
    : 'Within normal dipstick limits';

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Reports
        </button>

        <div className="flex items-center gap-3">
          {/* Dedicated Direct Review Action if pending or clinician */}
          {isClinician && <button
            onClick={() => setIsReviewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            {isPendingReview ? 'Review Now' : 'Update Review Verdict'}
          </button>}

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-600/20 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share to {test.reportDestination?.split(' ').slice(0, 2).join(' ') || 'Pathology'}
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Export PDF
          </button>
        </div>
      </div>

      {/* Awaiting Review Action Banner */}
      {isPendingReview && isClinician && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/70 border border-sky-300 dark:border-sky-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 no-print">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-sky-950 dark:text-sky-200">
                Awaiting Clinician Verification & Approval
              </h4>
              <p className="text-xs text-sky-800 dark:text-sky-300">
                This test report has been auto-submitted to the Clinician Queue. You can verify and approve it directly on this page.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0 shadow-md transition-all"
          >
            Review & Sign Off Now
          </button>
        </div>
      )}

      {/* Clinical Review Timeline Component */}
      <div className="no-print">
        <ReviewTimeline test={test} />
      </div>

      {/* Printable Clinical Report Container */}
      <div className="clinical-report bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6 card-print">
        {/* Report Header */}
        <div className="report-letterhead flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <span className="print-only report-kicker">Cura Diagnostics Laboratory</span>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
                Urine Routine Examination
              </span>
              <PanelBadge type={test.panelType} />
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              Semi-quantitative dipstick analysis report
            </p>
          </div>

          {/* Pathology Destination Badge */}
          <div className="report-code-box bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-right sm:text-left">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Report No.
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
              {test.testCode}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
              {formatDate(test.submittedAt)}
            </span>
          </div>
        </div>

        {/* Patient & Demographics Grid */}
        <div className="report-info-grid grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Patient Name</span>
            <span className="font-bold text-sm text-slate-900 dark:text-white">{test.patientName}</span>
            <span className="text-[11px] font-mono text-slate-500 block">ID: {test.patientCode}</span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Demographics</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {patient?.gender || 'N/A'}, {patient?.age || 'N/A'} yrs
            </span>
            <span className="text-[11px] font-mono text-slate-500 block">Blood: {patient?.bloodGroup || 'N/A'}</span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Specimen</span>
            <span className="font-semibold text-slate-900 dark:text-white">Urine, random/midstream</span>
            <span className="text-[11px] font-mono text-slate-500 block">Method: reagent strip RGB analysis</span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Strip / Panel</span>
            <span className="font-semibold text-slate-900 dark:text-white">{test.stripBrand}</span>
            <span className="text-[11px] font-mono text-slate-500 block">{test.panelType}</span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Prepared For</span>
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 no-print" /> {test.reportDestination}
            </span>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 mt-1">Technician: <Avatar name={test.submittedBy} photoUrl={test.submittedByPhotoUrl} className="w-4 h-4" /> {test.submittedBy}</span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Report Status</span>
            <span className="font-semibold text-slate-900 dark:text-white">{reportSummary}</span>
            <span className="text-[11px] font-mono text-slate-500 block">
              Normal {normalCount} / Trace {traceFindings.length} / Abnormal {abnormalFindings.length}
            </span>
          </div>
          <div className="report-field">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Strip batch details</span>
            <span className="font-semibold text-slate-900 dark:text-white">{test.stripBatch || 'Not recorded'}</span>
            <span className="text-[11px] font-mono text-slate-500 block">Manufactured: {test.manufactureDate || '—'} · Expires: {test.expiryDate || '—'}</span>
          </div>
        </div>

        {/* Full Analyte Table */}
        <div className="report-section space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider">
              Chemical Examination ({test.analytes?.length || 10} Parameters)
            </h3>
            <StatusBadge status={test.overallStatus} />
          </div>

          <div className="report-table-wrap overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-50 dark:bg-slate-900">
                  <th className="py-2.5 px-4">Parameter</th>
                  <th className="py-2.5 px-4">Result</th>
                  <th className="py-2.5 px-4">Unit</th>
                  <th className="py-2.5 px-4">Reference Interval</th>
                  <th className="py-2.5 px-4">Flag</th>
                  <th className="py-2.5 px-4 text-right">QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
                {test.analytes?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {item.value}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.unit || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {item.refRange}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.flag} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                        {item.score}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-interpretation grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">
              Impression
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {abnormalFindings.length > 0
                ? `${abnormalFindings.map((item) => item.name).join(', ')} outside expected dipstick range. Correlate clinically and confirm with quantitative laboratory testing where indicated.`
                : traceFindings.length > 0
                ? `${traceFindings.map((item) => item.name).join(', ')} detected at trace/borderline level. Repeat testing may be considered if clinically relevant.`
                : 'No abnormal chemical findings detected on this urine reagent-strip screen.'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">
              Overall Result
            </span>
            <StatusBadge status={test.overallStatus} />
          </div>
        </div>

        {/* Technician Notes */}
        {test.technicianNotes && (
          <div className="report-notes p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <span className="font-bold text-slate-900 dark:text-white block mb-1">
              Technician Observations:
            </span>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
              {test.technicianNotes}
            </p>
          </div>
        )}

        <div className="report-signatures grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Prepared By
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2"><Avatar name={test.submittedBy} photoUrl={test.submittedByPhotoUrl} />{test.submittedBy}</p>
            <div className="signature-line" />
            <p className="text-[10px] text-slate-500">Pathology Technician</p>
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
              Reviewed By
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">{test.clinicianReview?.reviewedBy && <Avatar name={test.clinicianReview.reviewedBy} photoUrl={test.clinicianReview.reviewerPhotoUrl} />}{test.clinicianReview?.reviewedBy || 'Pending clinician review'}</p>
            <div className="signature-line" />
            <p className="text-[10px] text-slate-500">
              {test.clinicianReview?.reviewedAt ? formatDate(test.clinicianReview.reviewedAt) : 'Not yet signed'}
            </p>
          </div>
        </div>

        {/* Audit Trail Section */}
        <div className="report-audit pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            Audit Trail & History
          </span>
          <div className="space-y-1.5">
            {test.auditTrail?.map((aud) => (
              <div key={aud.id} className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between py-1 border-b border-slate-100/60 dark:border-slate-800/40">
                <div>
                  <strong className="text-slate-700 dark:text-slate-300">{aud.action}</strong> by {aud.actor}
                  {aud.details && <span className="text-slate-400 font-sans ml-2">— {aud.details}</span>}
                </div>
                <span>{formatDate(aud.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="print-only report-footer">
          This report is generated from a semi-quantitative urine reagent strip reader. Abnormal screening results should be interpreted with clinical history and confirmed by standard laboratory methods where required.
        </div>
      </div>

      {/* Review Modal */}
      {isClinician && <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        test={test}
        onReviewSubmitted={handleReviewSubmitted}
      />}

      {/* Share Modal */}
      <ShareReportModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        test={test}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ShareReportModal — Mock share/export simulation
───────────────────────────────────────────────────────────── */
function ShareReportModal({ isOpen, onClose, test }) {
  const [phase, setPhase] = useState('idle'); // idle | generating | ready
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  // Generate a fake secure link seeded from the test code
  const fakeLink = test
    ? `https://share.cura-dx.app/r/${test.testCode?.toLowerCase()}-${Math.abs(
        test.testCode?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7331
      ).toString(36).slice(0, 8)}`
    : '';

  const destination = test?.reportDestination || 'Pathology Partner';

  // Start generation flow when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('generating');
      setCopied(false);
      setCountdown(null);
      const t = setTimeout(() => {
        setPhase('ready');
        setCountdown(3600); // 1 hour expiry
      }, 2200);
      return () => clearTimeout(t);
    } else {
      setPhase('idle');
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [isOpen]);

  // Tick countdown when ready
  useEffect(() => {
    if (phase === 'ready') {
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(countdownRef.current);
  }, [phase]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fakeLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        style={{ animation: 'shareModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Gradient header strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-violet-100 dark:bg-violet-950">
              <Share2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-slate-900 dark:text-white text-sm leading-tight">
                Share Report
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sending to <span className="font-bold text-violet-600 dark:text-violet-400">{destination}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">

          {/* Generating phase */}
          {phase === 'generating' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                {/* Outer ring pulse */}
                <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
                  <Zap className="w-7 h-7 text-violet-500 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  Generating secure share link…
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Encrypting report payload for {destination}
                </p>
              </div>
              {/* Fake progress bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{ animation: 'progressFill 2.2s ease-out forwards' }}
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Wifi className="w-3.5 h-3.5" />
                <span>Connecting to Cura Secure Share Gateway...</span>
              </div>
            </div>
          )}

          {/* Ready phase */}
          {phase === 'ready' && (
            <>
              {/* QR Code Panel */}
              <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  Secure QR Code
                </div>

                {/* QR Code SVG simulation */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <MockQrCode seed={test?.testCode} />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  End-to-end encrypted · TLS 1.3
                </div>
              </div>

              {/* Link + copy row */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
                  Shareable Link
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300 truncate">
                    {fakeLink}
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 shrink-0 px-3 py-2.5 rounded-xl font-bold text-[11px] transition-all ${
                      copied
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-violet-600 hover:bg-violet-700 text-white'
                    }`}
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Expiry countdown */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  <Clock className="w-4 h-4" />
                  Link expires in
                </div>
                <span className="font-mono font-bold text-sm text-amber-700 dark:text-amber-300">
                  {formatCountdown(countdown ?? 3600)}
                </span>
              </div>

              {/* Destination info */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
                <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900">
                  <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{destination}</p>
                  <p className="text-[10px] font-mono text-slate-400">Authorised recipient · read-only access</p>
                </div>
                <ExternalLink className="w-4 h-4 text-violet-400 shrink-0" />
              </div>

              {/* CTA */}
              <button
                onClick={() => { onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" />
                Confirm &amp; Send to {destination.split(' ').slice(0, 2).join(' ')}
              </button>

              <p className="text-center text-[10px] text-slate-400 dark:text-slate-500">
                This is a simulation — no data is transmitted externally.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes shareModalIn {
          from { opacity: 0; transform: scale(0.88) translateY(24px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes progressFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MockQrCode — deterministic QR-like pixel grid from a seed
───────────────────────────────────────────────────────────── */
function MockQrCode({ seed = 'CURA' }) {
  const SIZE = 21;
  const CELL = 7;

  // Simple seeded pseudo-random grid
  const grid = React.useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    const cells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        // Force finder patterns (corners)
        const inFinder =
          (r < 7 && c < 7) ||
          (r < 7 && c >= SIZE - 7) ||
          (r >= SIZE - 7 && c < 7);
        if (inFinder) {
          const lr = r < 7 ? r : r - (SIZE - 7);
          const lc = c < 7 ? c : c - (SIZE - 7);
          const onBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const onInner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          cells.push({ r, c, dark: onBorder || onInner });
        } else {
          h ^= h << 13; h ^= h >> 17; h ^= h << 5;
          cells.push({ r, c, dark: (h & 1) === 1 });
        }
      }
    }
    return cells;
  }, [seed]);

  return (
    <svg
      width={SIZE * CELL}
      height={SIZE * CELL}
      viewBox={`0 0 ${SIZE * CELL} ${SIZE * CELL}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <rect width={SIZE * CELL} height={SIZE * CELL} fill="white" />
      {grid.map(({ r, c, dark }) =>
        dark ? (
          <rect
            key={`${r}-${c}`}
            x={c * CELL}
            y={r * CELL}
            width={CELL}
            height={CELL}
            rx={1}
            fill="#1e1b4b"
          />
        ) : null
      )}
    </svg>
  );
}
