export const getDeadlineState = (dueDate) => {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    return 'overdue';
  }

  if (diffDays <= 3) {
    return 'near';
  }

  return 'upcoming';
};

export const getDeadlineBorderClass = (dueDate) => {
  const state = getDeadlineState(dueDate);

  if (state === 'overdue') {
    return 'border-danger';
  }

  if (state === 'near') {
    return 'border-amber-400';
  }

  return 'border-accent';
};

export const sortAssignmentsByDueDate = (assignments) =>
  [...assignments].sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate));
