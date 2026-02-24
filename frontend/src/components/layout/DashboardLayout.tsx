'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
}

export default function DashboardLayout({ children, title, action }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, fetchUser, isLoading, _hasHydrated: authHydrated } = useAuthStore();
  const { sidebarCollapsed, hasHydrated } = useUIStore();

  useEffect(() => {
    // Only fetch user if auth has hydrated and user is not yet authenticated
    if (authHydrated && !isAuthenticated) {
      fetchUser();
    }
  }, [authHydrated, isAuthenticated, fetchUser]);

  useEffect(() => {
    if (authHydrated && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authHydrated, isAuthenticated, isLoading, router]);

  // Show loading only during initial hydration
  if (!authHydrated || (isLoading && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className={cn(
        'flex flex-col min-h-screen',
        hasHydrated && 'transition-all duration-300',
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      )}>
        <Header title={title} action={action} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
