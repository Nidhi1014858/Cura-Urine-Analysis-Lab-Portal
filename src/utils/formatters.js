/**
 * Formatting utility functions
 */

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

export function formatShortDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short'
  }).format(d);
}

/**
 * Returns the calendar date in Asia/Kolkata (IST) timezone formatted as YYYY-MM-DD.
 * @param {Date} [date=new Date()]
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getTodayIST(date = new Date()) {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

export function getStatusBadgeStyle(status) {
  switch (status) {
    case 'abnormal':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    case 'trace':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    case 'normal':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    case 'approved':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800';
    case 'flagged_retest':
      return 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300 border-red-300 dark:border-red-800';
    case 'pending':
    default:
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800';
  }
}
