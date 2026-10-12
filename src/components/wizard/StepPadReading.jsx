import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2, RotateCcw, Sliders, Upload } from 'lucide-react';
import {
  ANALYTE_DEFINITIONS,
  PANEL_10_KEYS,
  PANEL_14_KEYS
} from '../../services/predictionEngine';
import { rgbToCss, rgbToHex } from '../../utils/colorUtils';
import { mockApi } from '../../services/mockApi';

export function StepPadReading({ formData, updateFormData, onNext, onPrev }) {
  const panelType = formData.panelType || '10-panel';
  const analyteKeys = panelType === '14-panel' ? PANEL_14_KEYS : PANEL_10_KEYS;
  const rgbReadings = formData.rgbReadings || {};

  const [dataset, setDataset] = useState([]);
  const [isLoadingDataset, setIsLoadingDataset] = useState(true);
  const [datasetError, setDatasetError] = useState(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');

  const loadDataset = async () => {
    setIsLoadingDataset(true);
    setDatasetError(null);
    try {
      const data = await mockApi.getRgbDataset();
      const list = Array.isArray(data) ? data : [];
      setDataset(list);
      if (list.length > 0) {
        setSelectedDatasetId((prev) => {
          return list.some((item) => item.id === prev) ? prev : list[0].id;
        });
      }
    } catch (err) {
      setDatasetError(err.message || 'Failed to load RGB reference dataset from server.');
    } finally {
      setIsLoadingDataset(false);
    }
  };

  useEffect(() => {
    loadDataset();
  }, []);

  const selectedDataset = useMemo(
    () => dataset.find((sample) => sample.id === selectedDatasetId) || dataset[0] || null,
    [dataset, selectedDatasetId]
  );
  const completeCount = analyteKeys.filter((key) => {
    const rgb = rgbReadings[key];
    return rgb && ['r', 'g', 'b'].every((channel) => Number.isFinite(Number(rgb[channel])));
  }).length;
  const hasCompleteReadings = completeCount === analyteKeys.length;

  const handleRGBChange = (key, channel, value) => {
    const nextValue = value === '' ? '' : Math.max(0, Math.min(255, Number(value) || 0));
    const updated = {
      ...rgbReadings,
      [key]: {
        ...(rgbReadings[key] || {}),
        [channel]: nextValue
      }
    };
    updateFormData({ rgbReadings: updated });
  };

  const handleImportDataset = () => {
    if (!selectedDataset || !selectedDataset.rgbReadings) return;

    const importedReadings = analyteKeys.reduce((result, key) => {
      const rgb = selectedDataset.rgbReadings[key];
      if (rgb) {
        result[key] = { r: rgb.r, g: rgb.g, b: rgb.b };
      }
      return result;
    }, {});

    updateFormData({ rgbReadings: importedReadings });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
          Step 3: Extracted Reagent Pad RGB Values ({panelType})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter the RGB triplets already extracted from the strip reader. Cura will analyze these values and generate concentration predictions.
        </p>
      </div>

      <div className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border flex items-start gap-3 ${
        hasCompleteReadings
          ? 'border-emerald-200 dark:border-emerald-800'
          : 'border-amber-200 dark:border-amber-800'
      }`}>
        {hasCompleteReadings ? (
          <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
        )}
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {completeCount}/{analyteKeys.length} reagent pads ready for analysis
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fill R, G, and B for every analyte before previewing the prediction.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            RGB Triplet Inputs ({analyteKeys.length} Pads)
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isLoadingDataset ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-teal-400" />
                <span>Loading reference dataset...</span>
              </div>
            ) : datasetError ? (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[200px]" title={datasetError}>{datasetError}</span>
                <button
                  type="button"
                  onClick={loadDataset}
                  className="font-bold underline hover:text-rose-700 flex items-center gap-1 ml-1"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              </div>
            ) : dataset.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No reference samples found in dataset</span>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <Database className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <select
                    value={selectedDatasetId}
                    onChange={(event) => setSelectedDatasetId(event.target.value)}
                    className="h-9 w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {dataset.map((sample, index) => (
                      <option key={sample.id} value={sample.id}>
                        {index + 1}. {sample.label} ({sample.status})
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleImportDataset}
                  disabled={!selectedDataset}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white shadow-sm shadow-teal-600/20 transition-colors hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Import RGB
                </button>
              </>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[520px] overflow-y-auto pr-1">
          {analyteKeys.map((key) => {
            const def = ANALYTE_DEFINITIONS[key];
            const rgb = rgbReadings[key];
            const displayRgb = rgb && Number.isFinite(Number(rgb.r)) && Number.isFinite(Number(rgb.g)) && Number.isFinite(Number(rgb.b))
              ? rgb
              : { r: 200, g: 200, b: 200 };
            const cssColor = rgbToCss(displayRgb);
            const hexColor = rgbToHex(displayRgb.r, displayRgb.g, displayRgb.b);

            return (
              <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md shadow-inner border border-black/10 shrink-0 transition-colors duration-200"
                    style={{ backgroundColor: cssColor }}
                    title={`RGB(${displayRgb.r}, ${displayRgb.g}, ${displayRgb.b}) / ${hexColor}`}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {def.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {def.category} | {def.unit}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-rose-500">R:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb?.r ?? ''}
                      onChange={(event) => handleRGBChange(key, 'r', event.target.value)}
                      placeholder="0"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-rose-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-emerald-500">G:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb?.g ?? ''}
                      onChange={(event) => handleRGBChange(key, 'g', event.target.value)}
                      placeholder="0"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-blue-500">B:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={rgb?.b ?? ''}
                      onChange={(event) => handleRGBChange(key, 'b', event.target.value)}
                      placeholder="0"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-center focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasCompleteReadings}
          className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next: Preview & Submit
        </button>
      </div>
    </div>
  );
}
