export const REMINDER_OPTIONS = [
  { value: 0, label: 'At time of event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  { value: 'high', label: 'High', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
];

export const getPriorityStyle = (priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || PRIORITY_OPTIONS[1].color;

export const toDateInputValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

export const toDateTimeLocalValue = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export const cn = (...classes) => classes.filter(Boolean).join(' ');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export const validateEmail = (email) => {
  const value = (email || '').trim();
  if (!value) return 'Email is required';
  if (value.length > 100) return 'Email is too long';
  if (!EMAIL_REGEX.test(value)) return 'Enter a valid email address (e.g. name@example.com)';
  return '';
};

/** Login: required + minimum length */
export const validatePasswordLogin = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return '';
};

/** Register: stronger rules */
export const validatePasswordRegister = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password cannot exceed 128 characters';
  if (!/[a-z]/.test(password)) return 'Include at least one lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Include at least one uppercase letter';
  if (!/[0-9]/.test(password)) return 'Include at least one number';
  if (/\s/.test(password)) return 'Password cannot contain spaces';
  return '';
};

export const validateName = (name) => {
  const value = (name || '').trim();
  if (!value) return 'Name is required';
  if (value.length < 2) return 'Name must be at least 2 characters';
  if (value.length > 50) return 'Name cannot exceed 50 characters';
  return '';
};

export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return '';
};

export const validateTitle = (title, label = 'Title') => {
  const value = (title || '').trim();
  if (!value) return `${label} is required`;
  if (value.length > 200) return `${label} cannot exceed 200 characters`;
  return '';
};

export const validateOptionalText = (value, max, label) => {
  const text = value || '';
  if (text.length > max) return `${label} cannot exceed ${max} characters`;
  return '';
};

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 4) return { score, label: 'Good', color: 'bg-sky-500' };
  return { score, label: 'Strong', color: 'bg-brand-500' };
};

/** Combine YYYY-MM-DD + HH:MM into a local Date */
export const combineDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(hours, minutes, 0, 0);
  return d;
};

export const isPastDateTime = (dateStr, timeStr) => {
  const when = combineDateAndTime(dateStr, timeStr);
  if (!when) return true;
  return when.getTime() < Date.now();
};

export const validateMeetingDateTime = (dateStr, timeStr) => {
  if (!dateStr) return 'Date is required';
  if (!timeStr) return 'Time is required';
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr)) return 'Enter a valid time (HH:MM)';
  if (isPastDateTime(dateStr, timeStr)) {
    return 'Meeting cannot be scheduled in the past';
  }
  return '';
};

/** Task due datetime must be in the future (datetime-local string). */
export const validateTaskDueDate = (dueDateLocal) => {
  if (!dueDateLocal) return 'Due date & time is required';
  const due = new Date(dueDateLocal);
  if (Number.isNaN(due.getTime())) return 'Enter a valid due date & time';
  if (due.getTime() <= Date.now()) {
    return 'Please select a future date and time';
  }
  return '';
};

/** Minimum value for datetime-local (now, local). */
export const getMinDateTimeLocal = () => toDateTimeLocalValue(new Date());
