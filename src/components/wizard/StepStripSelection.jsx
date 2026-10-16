import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Boxes,
  Lock
} from 'lucide-react';
import { STRIP_BRANDS } from '../../services/seedData';
import { PANEL_10_KEYS, PANEL_14_KEYS } from '../../services/predictionEngine';
import { getTodayIST } from '../../utils/formatters';
import { mockApi } from '../../services/mockApi';

export function StepStripSelection({ formData, updateFormData, onNext, onPrev }) {
  const currentPanel = formData.panelType || '10-panel';
  const today = useMemo(() => getTodayIST(), []);

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch live inventory from authoritative database/local API
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await mockApi.getInventory();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inventory for strip selection:', err);
      setFetchError(err?.message || 'Failed to load strip batch inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Compute brand availability based on real inventory batches for current panel
  const brandsWithStock = useMemo(() => {
    const compatible = STRIP_BRANDS.filter((b) => b.panels.includes(currentPanel));

    return compatible.map((brand) => {
      // Find batches matching this brand and supporting currentPanel
      const matchingBatches = inventory.filter(
        (it) =>
          (it.brandId === brand.id || it.brandName === brand.name) &&
          Array.isArray(it.panels) &&
          it.panels.includes(currentPanel)
      );

      // Usable batches must have quantity > 0 and expiryDate >= today
      const usableBatches = matchingBatches.filter(
        (b) => Number(b.quantity) > 0 && b.expiryDate >= today
      );

      const totalStock = usableBatches.reduce((acc, b) => acc + Number(b.quantity), 0);
      const isAvailable = usableBatches.length > 0;

      return {
        ...brand,
        matchingBatches,
        usableBatches,
        totalStock,
        isAvailable
      };
    });
  }, [inventory, currentPanel, today]);

  const availableBrands = useMemo(
    () => brandsWithStock.filter((b) => b.isAvailable),
    [brandsWithStock]
  );

  // Sync selected brand and batch whenever inventory loads or panel changes
  useEffect(() => {
    if (loading) return;

    // Check if the current brand is in the available list for this panel
    const currentBrand = brandsWithStock.find((b) => b.name === formData.stripBrand);
    const isBrandUsable = currentBrand && currentBrand.isAvailable;

    if (isBrandUsable) {
      // Current brand is valid and has usable batches; verify current inventoryId
      const currentBatch = currentBrand.usableBatches.find(
        (b) => (b.id && b.id === formData.inventoryId) || (b._id && b._id === formData.inventoryId)
      );

      if (!currentBatch && currentBrand.usableBatches.length > 0) {
        // Autofill first usable batch
        const firstBatch = currentBrand.usableBatches[0];
        updateFormData({
          inventoryId: firstBatch.id || firstBatch._id,
          stripBatch: firstBatch.batchNumber,
          manufactureDate: firstBatch.manufactureDate,
          expiryDate: firstBatch.expiryDate,
          stockError: null
        });
      }
    } else {
      // Current brand is unavailable or incompatible; never auto-select an unavailable brand
      if (availableBrands.length > 0) {
        const firstAvailable = availableBrands[0];
        const firstBatch = firstAvailable.usableBatches[0];
        updateFormData({
          stripBrand: firstAvailable.name,
          inventoryId: firstBatch.id || firstBatch._id,
          stripBatch: firstBatch.batchNumber,
          manufactureDate: firstBatch.manufactureDate,
          expiryDate: firstBatch.expiryDate,
          stockError: null
        });
      } else {
        // No available brand in stock for this panel: clear selection
        updateFormData({
          stripBrand: '',
          inventoryId: '',
          stripBatch: '',
          manufactureDate: '',
          expiryDate: '',
          stockError: null
        });
      }
    }
  }, [loading, brandsWithStock, availableBrands, currentPanel, formData.stripBrand, formData.inventoryId, updateFormData]);

  // Current active brand object
  const activeBrandObj = brandsWithStock.find((b) => b.name === formData.stripBrand);
  const activeUsableBatches = activeBrandObj?.usableBatches || [];

  // Batch traceability validation using Asia/Kolkata calendar date
  const expired = formData.expiryDate && formData.expiryDate < today;
  const manufactureFuture = formData.manufactureDate && formData.manufactureDate > today;
  const manufactureAfterExpiry =
    formData.manufactureDate && formData.expiryDate && formData.manufactureDate > formData.expiryDate;
  const batchValid =
    Boolean(formData.inventoryId && formData.stripBatch && formData.manufactureDate && formData.expiryDate) &&
    !expired &&
    !manufactureFuture &&
    !manufactureAfterExpiry;

  // Handler when user selects 10-panel or 14-panel
  const handleSelectPanel = (panelType) => {
    if (panelType === currentPanel) return;

    // Filter brands for new panel
    const compatibleForNewPanel = STRIP_BRANDS.filter((b) => b.panels.includes(panelType));
    const availableForNewPanel = compatibleForNewPanel
      .map((brand) => {
        const usableBatches = inventory.filter(
          (it) =>
            (it.brandId === brand.id || it.brandName === brand.name) &&
            Array.isArray(it.panels) &&
            it.panels.includes(panelType) &&
            Number(it.quantity) > 0 &&
            it.expiryDate >= today
        );
        return { ...brand, usableBatches, isAvailable: usableBatches.length > 0 };
      })
      .filter((b) => b.isAvailable);

    // Never auto-select an unavailable brand
    if (availableForNewPanel.length > 0) {
      const firstBrand = availableForNewPanel[0];
      const firstBatch = firstBrand.usableBatches[0];
      updateFormData({
        panelType,
        stripBrand: firstBrand.name,
        inventoryId: firstBatch.id || firstBatch._id,
        stripBatch: firstBatch.batchNumber,
        manufactureDate: firstBatch.manufactureDate,
        expiryDate: firstBatch.expiryDate,
        rgbReadings: {},
        stockError: null
      });
    } else {
      updateFormData({
        panelType,
        stripBrand: '',
        inventoryId: '',
        stripBatch: '',
        manufactureDate: '',
        expiryDate: '',
        rgbReadings: {},
        stockError: null
      });
    }
  };

  // Handler when user selects an available brand
  const handleSelectBrand = (brand) => {
    if (!brand.isAvailable || brand.usableBatches.length === 0) return;

    const firstBatch = brand.usableBatches[0];
    updateFormData({
      stripBrand: brand.name,
      inventoryId: firstBatch.id || firstBatch._id,
      stripBatch: firstBatch.batchNumber,
      manufactureDate: firstBatch.manufactureDate,
      expiryDate: firstBatch.expiryDate,
      stockError: null
    });
  };

  // Handler when user selects a specific batch for the selected brand
  const handleSelectBatch = (batchId) => {
    const selected = activeUsableBatches.find(
      (b) => b.id === batchId || b._id === batchId
    );
    if (selected) {
      updateFormData({
        inventoryId: selected.id || selected._id,
        stripBatch: selected.batchNumber,
        manufactureDate: selected.manufactureDate,
        expiryDate: selected.expiryDate,
        stockError: null
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Step 2: Strip Parameter Count &amp; Brand
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px] uppercase font-bold border border-teal-300 dark:border-teal-800">
              Live Inventory Synchronized
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose your strip parameter count, select from hardware brands with verified stock, and pick an active batch.
          </p>
        </div>
        <button
          type="button"
          onClick={loadInventory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors self-start shrink-0"
          title="Refresh live strip inventory"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Stock Error / 409 Notice Banner */}
      {formData.stockError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">Inventory Stock Conflict</p>
            <p>{formData.stockError}. Please choose another available batch or refresh inventory.</p>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0"
          >
            Refresh Now
          </button>
        </div>
      )}

      {fetchError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={loadInventory}
            className="underline font-semibold text-xs ml-3"
          >
            Retry
          </button>
        </div>
      )}

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
              {PANEL_10_KEYS.map((k) => (
                <span
                  key={k}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize"
                >
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
              {PANEL_14_KEYS.map((k) => (
                <span
                  key={k}
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded capitalize ${
                    ['ascorbic', 'calcium', 'creatinine', 'microalbumin'].includes(k)
                      ? 'bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-300 font-bold border border-purple-300 dark:border-purple-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Select Hardware Brand from Live Inventory */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white">
              2. Select Strip Hardware Brand ({currentPanel === '14-panel' ? '14-Panel Extended' : '10-Panel Standard'})
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Only brands with compatible, unexpired strips in stock can be selected.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold w-fit">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>Inventory Guard Enabled</span>
          </div>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {brandsWithStock.map((brand) => {
            const isSelected = formData.stripBrand === brand.name;
            const isAvailable = brand.isAvailable;

            if (!isAvailable) {
              // Unavailable brand: grey, genuinely disabled, aria-disabled="true", no click handler, no keyboard selection
              return (
                <div
                  key={brand.id}
                  aria-disabled="true"
                  tabIndex={-1}
                  className="p-4 rounded-2xl border bg-slate-100/80 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-60 transition-all select-none relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-500 dark:text-slate-400">
                        {brand.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {brand.manufacturer}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                      Out of stock
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>No unexpired strips</span>
                    <span>0 available</span>
                  </div>
                </div>
              );
            }

            // Available brand
            return (
              <div
                key={brand.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectBrand(brand)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectBrand(brand);
                  }
                }}
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
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Boxes className="w-3 h-3" /> {brand.totalStock} in stock
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
                    {brand.usableBatches.length} batch{brand.usableBatches.length > 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {availableBrands.length === 0 && !loading && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              No in-stock, unexpired strip batches found for <strong>{currentPanel}</strong>. Please switch to another panel or contact the lab administrator.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 3: Batch Traceability & Selection (Read-Only from Database Inventory) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <label className="block text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>3. Strip Batch Details</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                <Lock className="w-3 h-3 text-slate-400" /> Read-only from Inventory
              </span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Batch information is loaded directly from laboratory inventory and cannot be manually modified.
            </p>
          </div>
          {formData.inventoryId && (
            <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold w-fit">
              ID: {formData.inventoryId}
            </div>
          )}
        </div>

        {/* If selected brand has multiple usable batches, allow batch choice */}
        {activeUsableBatches.length > 1 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Batch from Available Stock:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeUsableBatches.map((b) => {
                const isThisBatch =
                  formData.inventoryId === (b.id || b._id) || formData.stripBatch === b.batchNumber;
                return (
                  <button
                    key={b.id || b._id}
                    type="button"
                    onClick={() => handleSelectBatch(b.id || b._id)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-mono transition-all flex items-center justify-between ${
                      isThisBatch
                        ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-500 font-bold text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{b.batchNumber}</span>
                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold">
                      {b.quantity} strips left
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Read-only batch metadata fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Batch Number</label>
            <input
              type="text"
              readOnly
              value={formData.stripBatch || ''}
              placeholder="Auto-selected from inventory"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-xs cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manufacture Date</label>
            <input
              type="text"
              readOnly
              value={formData.manufactureDate || ''}
              placeholder="YYYY-MM-DD"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-xs cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Expiry Date</label>
            <input
              type="text"
              readOnly
              value={formData.expiryDate || ''}
              placeholder="YYYY-MM-DD"
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white font-mono text-xs cursor-not-allowed"
            />
          </div>
        </div>

        {!formData.inventoryId && !loading && (
          <p className="text-xs text-rose-600 font-medium">
            Please select an in-stock hardware brand above to load its strip batch details.
          </p>
        )}

        {expired && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            This strip batch expired on {formData.expiryDate} — testing with an expired strip is blocked.
          </div>
        )}
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
          disabled={loading || !batchValid}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
          <span>Next: Reagent Pad Reading →</span>
        </button>
      </div>
    </div>
  );
}
