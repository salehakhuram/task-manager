import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  cn,
  getErrorMessage,
  getPasswordStrength,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePasswordRegister,
} from '../utils/helpers';
import { Spinner } from '../components/ui/EmptyState';
import EmailInput from '../components/auth/EmailInput';
import PasswordInput from '../components/auth/PasswordInput';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);

  const strength = getPasswordStrength(form.password);

  const validators = {
    name: validateName,
    email: validateEmail,
    password: validatePasswordRegister,
    confirmPassword: (value) => validateConfirmPassword(form.password, value),
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      if (touched[field] || field === 'password') {
        if (field === 'confirmPassword') {
          next.confirmPassword = validateConfirmPassword(form.password, value);
        } else if (field === 'password') {
          next.password = validatePasswordRegister(value);
          if (touched.confirmPassword) {
            next.confirmPassword = validateConfirmPassword(value, form.confirmPassword);
          }
        } else {
          next[field] = validators[field](value);
        }
      }
      return next;
    });
  };

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]:
        field === 'confirmPassword'
          ? validateConfirmPassword(form.password, form.confirmPassword)
          : validators[field](form[field]),
    }));
  };

  const validateForm = () => {
    const next = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePasswordRegister(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
    };
    setErrors(next);
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
    return !next.name && !next.email && !next.password && !next.confirmPassword;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors before creating your account');
      return;
    }

    setLoading(true);
    try {
      const account = await register(form.name.trim(), form.email.trim(), form.password);
      if (account.emailSent) {
        toast.success('Account created. Check your email, then sign in.');
      } else {
        toast.success('Account created. Please sign in.');
        if (account.emailSkipReason === 'not_configured') {
          toast.error('Welcome email is not configured on the server yet.');
        }
      }
      navigate('/login', { state: { email: form.email.trim() } });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center app-bg px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
            TaskFlow
          </h1>
          <p className="mt-2 text-ink-500 dark:text-ink-400">Create your workspace</p>
        </div>
        <form onSubmit={onSubmit} className="card-surface space-y-4 p-6 shadow-soft" noValidate>
          <div>
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className={cn(
                'input',
                touched.name &&
                  errors.name &&
                  'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
              )}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              onBlur={() => markTouched('name')}
              placeholder="Your name"
              disabled={loading}
              autoComplete="name"
              maxLength={50}
              aria-invalid={touched.name && !!errors.name}
              aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
            />
            {touched.name && errors.name && (
              <p id="name-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                {errors.name}
              </p>
            )}
          </div>

          <EmailInput
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => markTouched('email')}
            error={touched.email ? errors.email : ''}
            disabled={loading}
          />

          <div>
            <PasswordInput
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              onBlur={() => markTouched('password')}
              error={touched.password ? errors.password : ''}
              disabled={loading}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {form.password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-500">Strength</span>
                  <span className="font-medium text-ink-700 dark:text-ink-300">{strength.label}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={cn(
                        'h-1.5 flex-1 rounded-full bg-ink-200 dark:bg-ink-700',
                        strength.score >= step && strength.color
                      )}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-ink-400">
                  Use 8+ characters with upper &amp; lowercase letters and a number
                </p>
              </div>
            )}
          </div>

          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => setField('confirmPassword', e.target.value)}
            onBlur={() => markTouched('confirmPassword')}
            error={touched.confirmPassword ? errors.confirmPassword : ''}
            disabled={loading}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Create account'}
          </button>
          <p className="text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
