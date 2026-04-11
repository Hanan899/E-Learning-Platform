export const formatDate = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));

export const formatScore = (score, max) => {
  const percentage = max ? Math.round((score / max) * 100) : 0;
  return `${score}/${max} (${percentage}%)`;
};

export const truncate = (text, length = 100) => {
  if (!text || text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trimEnd()}...`;
};

export const getInitials = (firstName = '', lastName = '') =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

export const formatRelativeTime = (date) => {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diff = timestamp - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Math.abs(diff) < hour) {
    return formatter.format(Math.round(diff / minute) || -1, 'minute');
  }

  if (Math.abs(diff) < day) {
    return formatter.format(Math.round(diff / hour), 'hour');
  }

  return formatter.format(Math.round(diff / day), 'day');
};
