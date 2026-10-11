import React from 'react';
import { Layers, Sparkles, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { STRIP_BRANDS } from '../../services/seedData';
import { PANEL_10_KEYS, PANEL_14_KEYS } from '../../services/predictionEngine';
import { getTodayIST } from '../../utils/formatters';

export function StepStripSelection({ formData, updateFormData, onNext, onPrev }) {
  const currentPanel = formData.panelType || '10-panel';

  // Batch traceability validation logic using Asia/Kolkata calendar date
  const today = getTodayIST();
  const expired = formData.expiryDate && formData.expiryDate < today;
  const manufactureFuture = formData.manufactureDate && formData.manufactureDate > today;
  const manufactureAfterExpiry = formData.manufactureDate && formData.expiryDate && formData.manufactureDate > formData.expiryDate;
  const batchValid = Boolean(formData.stripBatch && formData.manufactureDate && formData.expiryDate) && !expired && !manufactureFuture && !manufactureAfterExpiry;

  // Filter available brands based on selected panel type FIRST
  const availableBrands = STRIP_BRANDS.filter(b => b.panels.includes(currentPanel));
  
  // Ensure currently selected brand is valid for the current panel
  const isCurrentBrandValid = availableBrands.some(b => b.name === formData.stripBrand);
  const selectedBrandName = isCurrentBrandValid ? formData.stripBrand : availableBrands[0]?.name;

  // Handler when user selects 10-panel or 14-panel
  const handleSelectPanel = (panelType) => {
    const compatibleForNewPanel = STRIP_BRANDS.filter(b => b.panels.includes(panelType));
    const isBrandValidForNewPanel = compatibleForNewPanel.some(b => b.name === formData.stripBrand);
    const newBrandName = isBrandValidForNewPanel ? formData.stripBrand : compatibleForNewPanel[0]?.name;

    updateFormData({
      panelType,
      stripBrand: newBrandName,
      rgbReadings: {}
    });
  };

  // Handler when user selects a brand from the filtered list
  const handleSelectBrand = (brand) => {
    updateFormData({
      stripBrand: brand.name
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Step 2: Strip Parameter Count &amp; Brand
          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px] uppercase font-bold border border-teal-300 dark:border-teal-800">
            Filtered Compatibility
          </span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          First select your desired strip parameter count (10 or 14 panel), then choose from the compatible hardware brands.
        </p>
      </div>

      {/* Batch Traceability Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div>
          <label className="block text-sm font-bold text-slate-900 dark:text-white">Strip batch details</label>
          <p className="text-xs text-slate-500 mt-1">Batch traceability is required before reagent-pad reading.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Batch number</label>
            <input value={formData.stripBatch || ''} onChange={(e) => updateFormData({ stripBatch: e.target.value })} placeholder="e.g. MS10-2408" className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manufacture date</label>
            <input type="date" value={formData.manufactureDate || ''} onChange={(e) => updateFormData({ manufactureDate: e.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expiry date</label>
            <input type="date" value={formData.expiryDate || ''} onChange={(e) => updateFormData({ expiryDate: e.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs" />
          </div>
        </div>
        {!formData.stripBatch && <p className="text-xs text-rose-600">Enter the strip batch number.</p>}
        {manufactureFuture && <p className="text-xs text-rose-600">Manufacture date cannot be in the future.</p>}
        {manufactureAfterExpiry && <p className="text-xs text-rose-600">Manufacture date cannot be after the expiry date.</p>}
        {expired && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />This strip batch expired on {formData.expiryDate} — testing with an expired strip may produce unreliable results. Submission blocked.</div>}
      </div>

      {/* SECTION 1: Select Strip Parameter Count (10 vs 14) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-mono uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
            1. Select Strip Parameter Count
          </label>
          <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
            Active: {currentPanel.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 10-Panel Option */}
          <div
            onClick={() => handleSelectPanel('10-panel')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all relative ${
              currentPanel === '10-panel'
                ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                10-PANEL STRIP
              </span>
              {currentPanel === '10-panel' && (
                <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Standard Urinalysis (10 Pads)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Measures Glucose, Protein, pH, Ketones, Blood, Bilirubin, Urobilinogen, Nitrite, Leucocytes, and Specific Gravity.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1">
              {PANEL_10_KEYS.map(k => (
                <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                  {k}
                </span>
              ))}
            </div>
          </div>

          {/* 14-Panel Option */}
          <div
            onClick={() => handleSelectPanel('14-panel')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all relative ${
              currentPanel === '14-panel'
                ? 'bg-purple-50 dark:bg-purple-950/80 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded font-mono font-bold text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-500" /> 14-PANEL EXTENDED
              </span>
              {currentPanel === '14-panel' && (
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
              Extended Renal &amp; Metabolic Panel (14 Pads)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Includes all 10 core analytes plus <strong>Ascorbic Acid, Calcium, Creatinine, and Microalbumin</strong> for early nephropathy screening.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-1">
              {PANEL_14_KEYS.map(k => (
                <span key={k} className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                  ['ascorbic', 'calcium', 'creatinine', 'microalbumin'].includes(k)
                    ? 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}>
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Select Available Brands for Selected Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              2. Select Available Brand for {currentPanel === '14-panel' ? '14-Panel Extended' : '10-Panel Standard'}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Displaying {availableBrands.length} manufacturer brand{availableBrands.length > 1 ? 's' : ''} compatible with {currentPanel}.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold w-fit">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Panel Compatibility Verified</span>
          </div>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {availableBrands.map((brand) => {
            const isSelected = selectedBrandName === brand.name;

            return (
              <div
                key={brand.id}
                onClick={() => handleSelectBrand(brand)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  isSelected
                    ? 'bg-teal-50/90 dark:bg-teal-950/80 border-teal-500 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {brand.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {brand.manufacturer}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Supported:</span>
                  <span className="font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {brand.panels.join(' & ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => batchValid && onNext()}
          disabled={!batchValid}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Reagent Pad Reading →
        </button>
      </div>
    </div>
  );
}
