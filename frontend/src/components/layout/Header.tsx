import { useState } from 'react';
import { Bell, RefreshCw, Menu, X, Moon, Sun, LogOut, User } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useScan } from '../../context/ScanContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cn, formatRelativeTime } from '../../lib/utils';
import { useOrganizationScan } from '../../hooks/useOrganizationScan';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, GitBranch, Package, Settings } from 'lucide-react';

const mobileNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Repositories', href: '/repositories', icon: GitBranch },
  { name: 'Dependencies', href: '/dependencies', icon: Package },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { isConnected } = useSocket();
  const { scan } = useScan();
  const { isDark, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const scanMutation = useOrganizationScan();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 isolate dark:bg-slate-900/50 dark:border-secondary-500/30 dark:shadow-lg dark:shadow-secondary-500/5 dark:backdrop-blur-sm">
      <div className="relative z-10 flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:border dark:hover:border-purple-500/30 transition-all"
        >
          {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Left side - Page title placeholder */}
        <div className="hidden lg:flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full transition-all',
            isConnected ? 'bg-emerald-400 dark:shadow-lg dark:shadow-emerald-500/50' : 'bg-slate-400'
          )} />
          <span className="text-sm text-gray-500 dark:text-slate-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Right side - Actions */}
        <div className="relative z-10 flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800/50 dark:border dark:border-secondary-500/20 dark:hover:border-secondary-500/50"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Scan button */}
          <button
            type="button"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || scan.isScanning}
            className={cn(
              'relative inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all',
              scanMutation.isPending || scan.isScanning
                ? 'bg-gray-200 text-gray-600 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border dark:border-slate-600/50'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-slate-800/50 dark:text-slate-100 dark:hover:bg-slate-700 dark:border dark:border-secondary-500/20 dark:hover:border-secondary-500/50 dark:hover:shadow-lg dark:hover:shadow-secondary-500/10'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', (scanMutation.isPending || scan.isScanning) && 'animate-spin')} />
            <span className="hidden sm:inline">
              {scanMutation.isPending || scan.isScanning ? 'Scanning...' : 'Scan'}
            </span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800/50 dark:border dark:border-secondary-500/20 dark:hover:border-secondary-500/50"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center whitespace-nowrap pointer-events-none dark:shadow-lg dark:shadow-primary-500/50">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 animate-fadeIn dark:bg-slate-800 dark:border-secondary-500/30 dark:shadow-2xl dark:shadow-secondary-500/10">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-secondary-500/20">
                  <h3 className="font-medium text-gray-900 dark:text-slate-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          'px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50 transition-colors',
                          !notification.read && 'bg-blue-50 dark:bg-cyan-900/20 dark:border-l-2 dark:border-l-cyan-500/50'
                        )}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {notification.subject}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 10 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-secondary-500/20">
                    <NavLink
                      type="button"
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                    >
                      View all notifications
                    </NavLink>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800/50 dark:border dark:border-secondary-500/20 dark:hover:border-secondary-500/50"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="w-5 h-5" />
              )}
              <span className="hidden md:inline">{user?.name || user?.login}</span>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 animate-fadeIn dark:bg-slate-800 dark:border-secondary-500/30 dark:shadow-2xl dark:shadow-secondary-500/10">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-secondary-500/20">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200 bg-white animate-slideIn dark:border-secondary-500/20 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-secondary-500/20">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 text-white dark:shadow-lg dark:shadow-secondary-500/50">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-slate-100">RenovateBot Dashboard</span>
          </div>
          <nav className="px-2 py-2">
            {mobileNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary-600/20 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300 dark:border dark:border-primary-500/50'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:border dark:hover:border-secondary-500/30'
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
