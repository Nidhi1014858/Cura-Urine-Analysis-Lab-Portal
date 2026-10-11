import { STRIP_BRANDS } from '../../src/services/seedData.js';
import {
  ANALYTE_DEFINITIONS,
  PANEL_10_KEYS,
  PANEL_14_KEYS,
  predictAnalytes
} from '../../src/services/predictionEngine.js';

/**
 * Returns today's date in Asia/Kolkata timezone formatted as YYYY-MM-DD.
 * @param {Date} [date=new Date()]
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function todayIST(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Helper to validate that a given string represents a real calendar date in YYYY-MM-DD format.
 * @param {string} dateString
 * @returns {boolean}
 */
function isValidCalendarDate(dateString) {
  if (typeof dateString !== 'string') return false;
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Validates batch information including required fields, real calendar dates,
 * expiration relative to IST today, and non-future/non-post-expiry manufacture dates.
 *
 * @param {Object} batch
 * @param {string} batch.stripBatch
 * @param {string} batch.manufactureDate
 * @param {string} batch.expiryDate
 * @returns {boolean}
 */
export function validateBatch(batch) {
  const { stripBatch, manufactureDate, expiryDate } = batch || {};

  if (
    !stripBatch ||
    !manufactureDate ||
    !expiryDate ||
    !String(stripBatch).trim() ||
    !String(manufactureDate).trim() ||
    !String(expiryDate).trim()
  ) {
    const error = new Error('Strip batch number, manufacture date, and expiry date are required.');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidCalendarDate(manufactureDate)) {
    const error = new Error(`Manufacture date "${manufactureDate}" is not a valid calendar date in YYYY-MM-DD format.`);
    error.statusCode = 400;
    throw error;
  }

  if (!isValidCalendarDate(expiryDate)) {
    const error = new Error(`Expiry date "${expiryDate}" is not a valid calendar date in YYYY-MM-DD format.`);
    error.statusCode = 400;
    throw error;
  }

  const today = todayIST();

  if (expiryDate < today) {
    const error = new Error(`This strip batch expired on ${expiryDate} — testing with an expired strip may produce unreliable results. Submission blocked.`);
    error.statusCode = 400;
    throw error;
  }

  if (manufactureDate > today || manufactureDate > expiryDate) {
    const error = new Error('Manufacture date must not be in the future or after the expiry date.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

/**
 * Validates that the brand exists and supports the requested panel type.
 *
 * @param {string} stripBrand
 * @param {string} panelType
 * @returns {boolean}
 */
export function validateBrandPanel(stripBrand, panelType) {
  if (!stripBrand) {
    const error = new Error('Strip brand is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!panelType) {
    const error = new Error('Panel type is required.');
    error.statusCode = 400;
    throw error;
  }

  const brand = STRIP_BRANDS.find(b => b.name === stripBrand || b.id === stripBrand);
  if (!brand) {
    const error = new Error(`Unknown strip brand: ${stripBrand}.`);
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(brand.panels) || !brand.panels.includes(panelType)) {
    const error = new Error(`${stripBrand} does not support ${panelType}.`);
    error.statusCode = 400;
    throw error;
  }

  return true;
}

/**
 * Helper to extract and validate { r, g, b } numeric readings from an input.
 * Handles both analyte objects with rgbInput and raw { r, g, b } reading objects.
 *
 * @param {Object} input
 * @returns {{ r: number, g: number, b: number } | null}
 */
function extractRGB(input) {
  if (!input) return null;
  const candidate = input.rgbInput !== undefined ? input.rgbInput : input;
  if (!candidate || typeof candidate !== 'object') return null;

  const { r, g, b } = candidate;
  if (
    r !== undefined && r !== null && !isNaN(Number(r)) &&
    g !== undefined && g !== null && !isNaN(Number(g)) &&
    b !== undefined && b !== null && !isNaN(Number(b))
  ) {
    return {
      r: Number(r),
      g: Number(g),
      b: Number(b)
    };
  }
  return null;
}

/**
 * Maps an analyte identifier (id or name) to the prediction engine's expected key using ANALYTE_DEFINITIONS.
 * Does not assume the id and engine key are identical.
 *
 * @param {string} identifier
 * @returns {string | null}
 */
function getEngineKey(identifier) {
  if (!identifier) return null;
  const strId = String(identifier).trim().toLowerCase();

  for (const [engineKey, def] of Object.entries(ANALYTE_DEFINITIONS)) {
    if (def.id && def.id.toLowerCase() === strId) {
      return engineKey;
    }
    if (def.name && def.name.toLowerCase() === strId) {
      return engineKey;
    }
    if (engineKey.toLowerCase() === strId) {
      return engineKey;
    }
  }
  return String(identifier).trim();
}

/**
 * Server-side recalculation of urinalysis analytes from raw RGB inputs.
 * Never trusts client-supplied value, flag, score, numeric, or overallStatus.
 *
 * @param {string|Object} panelTypeOrOptions - '10-panel' | '14-panel' or options object with panelType and analytes/readings
 * @param {Array|Object} [submittedAnalytes] - Array of analyte objects or object of readings
 * @returns {Object} Object containing recalculated { analytes, overallStatus }
 */
export function recalculateAnalytes(panelTypeOrOptions, submittedAnalytes) {
  let panelType;
  let submitted;

  if (
    panelTypeOrOptions &&
    typeof panelTypeOrOptions === 'object' &&
    !Array.isArray(panelTypeOrOptions) &&
    (panelTypeOrOptions.panelType || panelTypeOrOptions.analytes || panelTypeOrOptions.readings)
  ) {
    panelType = panelTypeOrOptions.panelType;
    submitted = panelTypeOrOptions.analytes !== undefined ? panelTypeOrOptions.analytes : panelTypeOrOptions.readings;
  } else {
    panelType = panelTypeOrOptions;
    submitted = submittedAnalytes;
  }

  if (submitted && typeof submitted === 'object' && Array.isArray(submitted.analytes)) {
    submitted = submitted.analytes;
  }

  if (panelType !== '10-panel' && panelType !== '14-panel') {
    const error = new Error(`Invalid panel type: ${panelType}. Must be 10-panel or 14-panel.`);
    error.statusCode = 400;
    throw error;
  }

  const requiredKeys = panelType === '14-panel' ? PANEL_14_KEYS : PANEL_10_KEYS;
  const readings = {};

  if (Array.isArray(submitted)) {
    for (const item of submitted) {
      if (!item) continue;
      const key = getEngineKey(item.id || item.key || item.name);
      const rgb = extractRGB(item);
      if (key && rgb) {
        readings[key] = rgb;
      }
    }
  } else if (submitted && typeof submitted === 'object') {
    for (const [key, value] of Object.entries(submitted)) {
      const engineKey = getEngineKey(key) || (value?.id && getEngineKey(value.id)) || key;
      const rgb = extractRGB(value);
      if (engineKey && rgb) {
        readings[engineKey] = rgb;
      }
    }
  }

  // Check that every required analyte for the selected panel has an RGB reading
  for (const key of requiredKeys) {
    const def = ANALYTE_DEFINITIONS[key];
    const name = def?.name || key;

    if (!readings[key]) {
      const error = new Error(`Missing RGB reading for ${name}.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Call predictAnalytes to calculate the results on the server
  const calculatedAnalytes = predictAnalytes(panelType, readings);

  // Compute overallStatus based on calculated analyte flags:
  // - abnormal if any calculated analyte has flag "abnormal"
  // - otherwise trace if any calculated analyte has flag "trace"
  // - otherwise normal
  const hasAbnormal = calculatedAnalytes.some((a) => a.flag === 'abnormal');
  const hasTrace = calculatedAnalytes.some((a) => a.flag === 'trace');
  const overallStatus = hasAbnormal ? 'abnormal' : (hasTrace ? 'trace' : 'normal');

  const result = {
    analytes: calculatedAnalytes,
    overallStatus,
    [Symbol.iterator]: function* () {
      yield* calculatedAnalytes;
    }
  };

  return result;
}

export const recalculateRGB = recalculateAnalytes;
export const recalculateTestResults = recalculateAnalytes;

export default {
  todayIST,
  validateBatch,
  validateBrandPanel,
  recalculateAnalytes,
  recalculateRGB,
  recalculateTestResults
};
