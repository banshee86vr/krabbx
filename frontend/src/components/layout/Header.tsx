import { useState } from 'react';
import { RefreshCw, Menu, X, LogOut, User } from 'lucide-react';
import { useScan } from '../../context/ScanContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { useOrganizationScan } from '../../hooks/useOrganizationScan';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, LayoutDashboard, GitBranch, Package, Settings } from 'lucide-react';

const mobileNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Repositories', href: '/repositories', icon: GitBranch },
  { name: 'Dependencies', href: '/dependencies', icon: Package },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
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
      <div className="flex items-center h-full px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="lg:hidden p-2 rounded-hds-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0" aria-hidden />

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
                ? 'text-white/45 cursor-not-allowed'
                : 'text-white/75 hover:text-white hover:bg-white/10'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', (scanMutation.isPending || scan.isScanning) && 'animate-spin')} />
            <span className="hidden sm:inline">
              {scanMutation.isPending || scan.isScanning ? 'Scanning...' : 'Scan'}
            </span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-hds-sm font-medium text-sm transition-colors text-white/75 hover:text-white hover:bg-white/10"
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
              <div className="absolute right-0 mt-2 w-64 bg-neutral-100 rounded-hds-lg shadow-hds-surface-higher border border-neutral-200 animate-fadeIn">
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
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-neutral-600 hover:bg-neutral-200 transition-colors"
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
        <div className="lg:hidden border-t border-white/10 animate-slideIn krx-header">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
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
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
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
