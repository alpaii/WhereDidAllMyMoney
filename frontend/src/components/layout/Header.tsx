'use client';

import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 lg:px-6 flex items-center justify-between">
      {/* Title - hidden on mobile due to hamburger menu */}
      <div className="ml-12 lg:ml-0">
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Search - desktop only */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="검색..."
              className="pl-10 pr-4 py-2 w-64 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User avatar - desktop only */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-700 font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
