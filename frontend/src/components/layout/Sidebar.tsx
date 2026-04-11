import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Package,
  Bell,
  Settings,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSidebar } from '../../context/SidebarContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Repositories', href: '/repositories', icon: GitBranch },
  { name: 'Dependencies', href: '/dependencies', icon: Package },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside className={cn(
      'fixed top-[60px] bottom-0 left-0 z-30 hidden bg-white border-r border-neutral-200 lg:flex lg:flex-col transition-all duration-300',
      isCollapsed ? 'w-20' : 'w-64'
    )}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-4 py-4 border-b border-neutral-200', isCollapsed && 'justify-center')}>
          <div className="flex items-center justify-center w-9 h-9 rounded-hds-md text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}>
            <Bot className="w-5 h-5" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-semibold text-neutral-700 text-sm">Renovate</h1>
              <p className="text-xs text-neutral-400">Dashboard</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-2 py-1.5 rounded-hds-sm text-sm font-medium transition-colors h-9',
                  isCollapsed && 'justify-center',
                  isActive
                    ? 'bg-action-50 text-action-300 font-semibold'
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700'
                )
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && item.name}
            </NavLink>
          ))}
        </nav>

        {/* Toggle Button */}
        <div className={cn('px-3 py-4 border-t border-neutral-200', isCollapsed && 'flex justify-center')}>
          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-hds-sm text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="px-4 py-3 border-t border-neutral-200">
            <p className="text-xs text-neutral-400">
              Renovate Bot Dashboard v1.0
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
