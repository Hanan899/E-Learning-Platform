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
