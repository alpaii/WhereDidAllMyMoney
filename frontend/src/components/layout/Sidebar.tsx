'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  CreditCard,
  ArrowLeftRight,
  PieChart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Tag,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: '계좌 관리', href: '/accounts', icon: <Wallet size={20} /> },
  { label: '지출 내역', href: '/expenses', icon: <CreditCard size={20} /> },
  { label: '이체 내역', href: '/transfers', icon: <ArrowLeftRight size={20} /> },
  { label: '카테고리', href: '/categories', icon: <Tag size={20} /> },
  { label: '상품 관리', href: '/products', icon: <Package size={20} /> },
  { label: '통계', href: '/statistics', icon: <PieChart size={20} /> },
  { label: '설정', href: '/settings', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile menu button (hamburger) */}
      {!isOpen && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-2.5 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Mobile close button (inside sidebar) */}
      {isOpen && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed top-2.5 left-56 z-50 p-2 bg-white rounded-lg shadow-md"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      )}

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
          'fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={cn(
            'flex items-center h-16 px-4 border-b border-gray-200',
            isCollapsed ? 'justify-center' : 'justify-between'
          )}>
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="font-bold text-lg text-gray-800">소비관리</span>
              </Link>
            )}
            {isCollapsed && (
              <Link href="/dashboard">
                <span className="text-2xl">💰</span>
              </Link>
            )}
            <button
              onClick={toggleCollapse}
              className="hidden lg:block p-1 hover:bg-gray-100 rounded"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft
                size={20}
                className={cn('transition-transform', isCollapsed && 'rotate-180')}
              />
            </button>
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
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100',
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
          <div className="p-4 border-t border-gray-200">
            {!isCollapsed && user && (
              <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors',
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
