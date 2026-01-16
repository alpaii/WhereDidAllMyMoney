'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Tag,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '관리자 대시보드', href: '/admin', icon: <LayoutDashboard size={20} /> },
  { label: '사용자 관리', href: '/admin/users', icon: <Users size={20} /> },
  { label: '카테고리 관리', href: '/admin/categories', icon: <Tag size={20} /> },
  { label: '시스템 설정', href: '/admin/settings', icon: <Settings size={20} /> },
];

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 bg-gray-900 text-white transition-all duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn(
            'flex items-center h-16 px-4 border-b border-gray-700',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <Link href="/admin" className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="font-bold text-lg">관리자</span>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/admin">
                <span className="text-2xl">🛡️</span>
              </Link>
            )}
            <button
              onClick={toggleCollapse}
              className="hidden lg:block p-1 hover:bg-gray-700 rounded"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft
                size={20}
                className={cn('transition-transform', isCollapsed && 'rotate-180')}
              />
            </button>
          </div>

          {/* Back to user dashboard link */}
          <div className="p-4 border-b border-gray-700">
            <Link
              href="/dashboard"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? '사용자 대시보드' : undefined}
            >
              <ArrowLeft size={20} />
              {!isCollapsed && <span>사용자 대시보드</span>}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      pathname === item.href
                        ? 'bg-primary-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-800',
                      isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {item.icon}
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-700">
            {!isCollapsed && user && (
              <div className="mb-3 px-3 py-2 bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-primary-600 text-white text-xs rounded">
                  관리자
                </span>
              </div>
            )}
            <button
              onClick={logout}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 text-red-400 hover:bg-gray-800 rounded-lg transition-colors',
                isCollapsed && 'justify-center'
              )}
              title={isCollapsed ? '로그아웃' : undefined}
            >
              <LogOut size={20} />
              {!isCollapsed && <span>로그아웃</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
