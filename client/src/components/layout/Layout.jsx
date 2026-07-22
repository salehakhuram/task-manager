import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  Users,
  Bell,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../utils/helpers';
import NotificationPanel from '../notifications/NotificationPanel';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/meetings', label: 'Meetings', icon: Users },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const resolvedDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItems = ({ onNavigate }) => (
    <>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
            )
          }
        >
          <Icon className="h-4.5 w-4.5 h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen app-bg">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-200/80 bg-white/80 p-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/80 lg:flex">
        <div className="mb-8 px-2 pt-2">
          <p className="font-display text-2xl font-bold tracking-tight text-brand-700 dark:text-brand-300">
            TaskFlow
          </p>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Plan. Focus. Deliver.</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavItems />
        </nav>
        <div className="mt-auto space-y-2 border-t border-ink-200 pt-4 dark:border-ink-800">
          <div className="rounded-xl bg-ink-50 px-3 py-2.5 dark:bg-ink-900">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{user?.name}</p>
            <p className="truncate text-xs text-ink-500">{user?.email}</p>
          </div>
          <button type="button" onClick={handleLogout} className="btn-ghost w-full justify-start">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 animate-slide-up border-r border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-950">
            <div className="mb-6 flex items-center justify-between">
              <p className="font-display text-xl font-bold text-brand-700 dark:text-brand-300">TaskFlow</p>
              <button type="button" className="btn-ghost !p-2" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              <NavItems onNavigate={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/70 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/70">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-ghost !p-2 lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="font-display text-lg font-semibold lg:hidden text-brand-700 dark:text-brand-300">
                TaskFlow
              </p>
            </div>
            <div className="relative flex items-center gap-2">
              <button type="button" className="btn-ghost !p-2" onClick={toggleTheme} aria-label="Toggle theme">
                {resolvedDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                type="button"
                className="btn-ghost relative !p-2"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>
          </div>
        </header>
        <main className="page-shell animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
