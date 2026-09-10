/**
 * Helper functions for formatting and error handling.
 */

export const formatErrorMessage = (err, fallback = 'An unexpected error occurred. Please try again.') => {
  if (!err) return fallback;

  // Handle Axios response detail
  const detail = err.response?.data?.detail || err.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  // Handle array of Pydantic validation errors (FastAPI 422)
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
          const loc = item.loc ? item.loc.filter((l) => l !== 'body').join('.') : '';
          const msg = item.msg || JSON.stringify(item);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('; ');
  }

  // Handle object error
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  if (err.message) {
    return err.message;
  }

  return fallback;
};

export const formatCurrency = (val) => {
  if (val === undefined || val === null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

export const formatPercentage = (val) => {
  if (val === undefined || val === null) return '0%';
  return `${Number(val).toFixed(1)}%`;
};
