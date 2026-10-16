import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PANEL_10_KEYS, PANEL_14_KEYS, predictAnalytes } from '../../services/predictionEngine';
import { StatusBadge, PanelBadge } from '../common/Badge';
import { mockApi } from '../../services/mockApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AlertTriangle, Building2, User, FileText, Send } from 'lucide-react';

export function StepReviewSubmit({ formData, updateFormData, onPrev, onGoToStep }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const panelType = formData.panelType || '10-panel';
  const analyteKeys = panelType === '14-panel' ? PANEL_14_KEYS : PANEL_10_KEYS;
  const hasCompleteReadings = analyteKeys.every((key) => {
    const rgb = formData.rgbReadings?.[key];
    return rgb && ['r', 'g', 'b'].every((channel) => Number.isFinite(Number(rgb[channel])));
  });
  const predictedList = hasCompleteReadings ? predictAnalytes(panelType, formData.rgbReadings || {}) : [];

  const hasAbnormal = predictedList.some(a => a.flag === 'abnormal');
  const hasTrace = predictedList.some(a => a.flag === 'trace');
  const overallFlag = hasAbnormal ? 'abnormal' : (hasTrace ? 'trace' : 'normal');

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!formData.patientId) {
      addToast('Please select a target patient before submitting.', 'error');
      return;
    }

    if (!formData.reportDestination) {
      addToast('Please select a pathology report destination.', 'error');
      return;
    }

    if (!formData.inventoryId) {
      addToast('Please select an in-stock strip batch before submitting.', 'error');
      if (typeof onGoToStep === 'function') onGoToStep(2);
      return;
    }

    if (!formData.stripBatch || !formData.manufactureDate || !formData.expiryDate) {
      addToast('Strip batch number, manufacture date, and expiry date are required.', 'error');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (formData.expiryDate < today) {
      addToast(`This strip batch expired on ${formData.expiryDate}. Testing with an expired strip is blocked.`, 'error');
      return;
    }

    if (formData.manufactureDate > today || formData.manufactureDate > formData.expiryDate) {
      addToast('Manufacture date must not be in the future or after expiry date.', 'error');
      return;
    }

    if (!hasCompleteReadings) {
      addToast('Enter complete RGB readings for all reagent pads before submitting.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await mockApi.createTest({
        inventoryId: formData.inventoryId,
        patientId: formData.patientId,
        patientName: formData.patientName,
        patientCode: formData.patientCode,
        panelType: formData.panelType,
        stripBrand: formData.stripBrand,
        stripBatch: formData.stripBatch,
        manufactureDate: formData.manufactureDate,
        expiryDate: formData.expiryDate,
        reportDestination: formData.reportDestination,
        stripImageUrl: formData.stripImageUrl,
        submittedBy: user?.name || 'Technician',
        submittedByPhotoUrl: user?.photoUrl || null,
        technicianNotes: formData.technicianNotes || '',
        analytes: predictedList
      });

      const reportId = created?.id || created?._id || created?.testCode;
      addToast(`Test report ${created?.testCode || ''} submitted successfully! Auto-queued for clinician review.`, 'success');
      navigate(`/reports/${reportId}`);
    } catch (err) {
      const status = err?.status || err?.statusCode;
      const is409 = status === 409 || String(err?.message || '').toLowerCase().includes('stock') || String(err?.message || '').toLowerCase().includes('consumed');

      if (is409) {
        addToast(err?.message || 'The last strip in this batch was consumed. Please reselect an available strip batch.', 'error');
        updateFormData({ stockError: err?.message || 'Strip batch out of stock' });
        if (typeof onGoToStep === 'function') {
          onGoToStep(2);
        } else if (typeof onPrev === 'function') {
          onPrev();
        }
      } else {
        addToast(err?.message || 'Failed to submit test report', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Step 4: Live Prediction & Final Submission
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Review automated concentration predictions from the extracted RGB values, add optional technician observations, and issue the report.
        </p>
      </div>

      {!hasCompleteReadings && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-xs font-semibold">
            RGB readings are incomplete. Go back and enter R, G, and B values for every reagent pad before prediction.
          </p>
        </div>
      )}

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient Info */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Target Patient</span>
          <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            {formData.patientName || 'None selected'}
          </p>
          <p className="text-xs font-mono text-slate-500">ID: {formData.patientCode || '—'}</p>
        </div>

        {/* Destination & Strip */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400">Pathology Destination</span>
          <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            {formData.reportDestination}
          </p>
          <div className="pt-0.5 flex items-center gap-2">
            <PanelBadge type={formData.panelType} />
            <span className="text-[11px] text-slate-500 font-medium">{formData.stripBrand}</span>
          </div>
          <p className="text-[11px] text-slate-500">Batch {formData.stripBatch || '—'} · Mfg {formData.manufactureDate || '—'} · Exp {formData.expiryDate || '—'}</p>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
          overallFlag === 'abnormal'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
            : overallFlag === 'trace'
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
        }`}>
          <span className="text-[10px] uppercase font-mono tracking-wider font-bold">Predicted Result Summary</span>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-sm">
              {overallFlag === 'abnormal' ? 'Abnormal Findings Detected' : overallFlag === 'trace' ? 'Trace Elevations Detected' : 'All Analytes Normal'}
            </span>
            <StatusBadge status={overallFlag} />
          </div>
        </div>
      </div>

      {/* Analyte Prediction Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-700 dark:text-slate-300">
            Predicted Concentration & Reference Table ({predictedList.length} Analytes)
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Auto-calculated via Regression Model</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-2.5 px-4">Analyte</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Predicted Value</th>
                <th className="py-2.5 px-4">Reference Range</th>
                <th className="py-2.5 px-4">Status Flag</th>
                <th className="py-2.5 px-4 text-right">Model Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-mono">
              {predictedList.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold font-sans text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {item.category}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {item.value}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                    {item.refRange}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.flag} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
                      {item.score}%
                    </span>
                  </td>
                </tr>
              ))}
              {predictedList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    No complete RGB readings available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technician Notes Input */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
        <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          Technician Observations & Notes
        </label>
        <textarea
          rows={2}
          value={formData.technicianNotes}
          onChange={(e) => updateFormData({ technicianNotes: e.target.value })}
          placeholder="Enter specimen appearance, turbidity, fasting status, or collection notes..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-teal-500"
        ></textarea>
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          ← Back to RGB Inputs
        </button>
        <button
          type="button"
          disabled={isSubmitting || !hasCompleteReadings}
          onClick={handleSubmit}
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-600/30 disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Submitting Report...' : 'Submit Report & Queue for Review'}
        </button>
      </div>
    </div>
  );
}
