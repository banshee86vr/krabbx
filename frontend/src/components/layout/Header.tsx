import { useState } from 'react';
import { Bell, RefreshCw, Menu, X, LogOut, User } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useScan } from '../../context/ScanContext';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const scanMutation = useOrganizationScan();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="krx-header fixed top-0 left-0 right-0 z-40 h-[60px]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-hds-sm text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Left side - Connection status */}
        <div className="hidden lg:flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-success-200' : 'bg-neutral-400'
          )} />
          <span className="text-sm text-indigo-200">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          {/* Scan button */}
          <button
            type="button"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending || scan.isScanning}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-hds-sm font-medium text-sm transition-colors',
              scanMutation.isPending || scan.isScanning
                ? 'text-indigo-300 cursor-not-allowed'
                : 'text-indigo-200 hover:text-white hover:bg-white/10'
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
              className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-hds-sm font-medium text-sm transition-colors text-indigo-200 hover:text-white hover:bg-white/10"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-critical-200 rounded-full flex items-center justify-center whitespace-nowrap pointer-events-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-hds-lg shadow-hds-surface-higher animate-fadeIn">
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                  <h3 className="font-medium text-neutral-700">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-sm text-action-300 hover:text-action-400"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-neutral-500">
                      No notifications yet
                    </p>
                  ) : (
                    notifications.slice(0, 10).map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={cn(
                          'px-4 py-3 border-b border-neutral-100 cursor-pointer hover:bg-neutral-100 transition-colors',
                          !notification.read && 'bg-action-50'
                        )}
                      >
                        <p className="text-sm font-medium text-neutral-700">
                          {notification.subject}
                        </p>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          {notification.content}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {formatRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 10 && (
                  <div className="px-4 py-3 border-t border-neutral-200">
                    <NavLink
                      to="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-sm text-action-300 hover:text-action-400"
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-hds-sm font-medium text-sm transition-colors text-indigo-200 hover:text-white hover:bg-white/10"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User className="w-4 h-4" />
              )}
              <span className="hidden md:inline">{user?.name || user?.login}</span>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-hds-lg shadow-hds-surface-higher animate-fadeIn">
                <div className="px-4 py-3 border-b border-neutral-200">
                  <p className="text-sm font-medium text-neutral-700">{user?.name}</p>
                  <p className="text-xs text-neutral-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-neutral-600 hover:bg-neutral-100 transition-colors"
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
        <div className="lg:hidden border-t border-indigo-500/30 animate-slideIn krx-header">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-500/30">
            <div className="flex items-center justify-center w-8 h-8 rounded-hds-sm bg-white/15 text-white">
              <Bot className="w-5 h-5" />
            </div>
            <span className="font-semibold text-white text-sm">RenovateBot Dashboard</span>
          </div>
          <nav className="px-2 py-2">
            {mobileNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-hds-sm text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
