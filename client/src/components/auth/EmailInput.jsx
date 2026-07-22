import { cn } from '../../utils/helpers';

export default function TextInput({
  id = 'email',
  label = 'Email',
  value,
  onChange,
  onBlur,
  placeholder = 'you@example.com',
  error,
  disabled = false,
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="email"
        inputMode="email"
        autoComplete="email"
        className={cn('input', error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20')}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
