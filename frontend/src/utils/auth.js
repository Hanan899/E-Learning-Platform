export const getDefaultRouteForRole = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/login';
  }
};

export const getPasswordStrength = (password = '') => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { label: 'Weak', color: 'bg-danger', width: 'w-1/3' };
  }

  if (score <= 3) {
    return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/3' };
  }

  return { label: 'Strong', color: 'bg-accent', width: 'w-full' };
};
