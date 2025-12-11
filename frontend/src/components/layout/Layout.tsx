import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-primary-900/20">
      <Sidebar />
      <div className={cn(
        'transition-all duration-300',
        isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      )}>
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
