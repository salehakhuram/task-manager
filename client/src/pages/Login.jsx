import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  getErrorMessage,
  validateEmail,
  validatePasswordLogin,
} from '../utils/helpers';
import { Spinner } from '../components/ui/EmptyState';
import EmailInput from '../components/auth/EmailInput';
import PasswordInput from '../components/auth/PasswordInput';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: field === 'email' ? validateEmail(value) : validatePasswordLogin(value),
      }));
    }
  };

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({
      ...prev,
      [field]:
        field === 'email' ? validateEmail(form[field]) : validatePasswordLogin(form[field]),
    }));
  };

  const validateForm = () => {
    const next = {
      email: validateEmail(form.email),
      password: validatePasswordLogin(form.password),
    };
    setErrors(next);
    setTouched({ email: true, password: true });
    return !next.email && !next.password;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors before signing in');
      return;
    }

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      toast.success('Welcome back');
      navigate('/');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
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
          <p className="mt-2 text-ink-500 dark:text-ink-400">Sign in to manage your day</p>
        </div>
        <form onSubmit={onSubmit} className="card-surface space-y-4 p-6 shadow-soft" noValidate>
          <EmailInput
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            onBlur={() => markTouched('email')}
            error={touched.email ? errors.email : ''}
            disabled={loading}
          />
          <PasswordInput
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            onBlur={() => markTouched('password')}
            error={touched.password ? errors.password : ''}
            disabled={loading}
            autoComplete="current-password"
          />
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : 'Sign in'}
          </button>
          <p className="text-center text-sm text-ink-500">
            No account?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
