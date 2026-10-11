import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CheckCircle2, AlertOctagon, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function ReviewModal({ isOpen, onClose, test, onReviewSubmitted }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [decision, setDecision] = useState('approved'); // 'approved' | 'flagged_retest'
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!test) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'Clinician') {
      addToast('Only clinicians can approve or flag reports.', 'error');
      return;
    }
    setIsSubmitting(true);

    try {
      const reviewerName = user?.name || 'Dr. Reviewer';
      await onReviewSubmitted(test.id || test._id || test.testCode, {
        status: decision,
        notes,
        reviewerName,
        reviewerPhotoUrl: user?.photoUrl || null
      });

      addToast(
        decision === 'approved' ? 'Test report approved successfully!' : 'Test report flagged for retest.',
        decision === 'approved' ? 'success' : 'warning'
      );
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Review Report: ${test.testCode}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs space-y-1.5 font-mono border border-slate-200 dark:border-slate-700/60">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Patient: <strong className="text-slate-900 dark:text-white font-sans">{test.patientName}</strong></span>
            <span>ID: <strong className="text-slate-900 dark:text-white font-mono">{test.patientCode}</strong></span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Panel: <strong className="text-teal-600 dark:text-teal-400 font-sans">{test.panelType}</strong></span>
            <span>Destination: <strong className="text-slate-900 dark:text-white font-sans">{test.reportDestination}</strong></span>
          </div>
        </div>

        {/* Decision Radio Buttons */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
            Review Verdict
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border font-medium text-sm transition-all ${
                decision === 'approved'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Approve Report
            </button>

            <button
              type="button"
              onClick={() => setDecision('flagged_retest')}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border font-medium text-sm transition-all ${
                decision === 'flagged_retest'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <AlertOctagon className="w-5 h-5 text-rose-500" />
              Flag for Retest
            </button>
          </div>
        </div>

        {/* Clinician Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
            Clinician Notes / Directives
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add clinical context, recommendations, or retest instructions..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
          ></textarea>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all"
          >
            <UserCheck className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Verdict'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
