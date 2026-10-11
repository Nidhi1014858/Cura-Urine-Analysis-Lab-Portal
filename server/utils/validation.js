import { STRIP_BRANDS } from '../../src/services/seedData.js';

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

export default {
  todayIST,
  validateBatch,
  validateBrandPanel
};
