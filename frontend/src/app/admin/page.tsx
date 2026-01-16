'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Tag, TrendingUp, CreditCard } from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import api from '@/lib/api';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface AdminStats {
  total_users: number;
  total_categories: number;
  total_expenses: number;
  total_expense_amount: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<AdminStats>('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AdminLayout title="관리자 대시보드">
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 사용자</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {isLoading ? '-' : formatNumber(stats?.total_users || 0)}명
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 카테고리</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {isLoading ? '-' : formatNumber(stats?.total_categories || 0)}개
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Tag className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 지출 건수</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {isLoading ? '-' : formatNumber(stats?.total_expenses || 0)}건
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <CreditCard className="text-purple-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 지출 금액</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {isLoading ? '-' : formatCurrency(stats?.total_expense_amount || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-yellow-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>사용자 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                시스템에 등록된 사용자를 관리합니다.
              </p>
              <a
                href="/admin/users"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <Users size={18} />
                사용자 관리로 이동
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>카테고리 관리</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                시스템 카테고리와 서브카테고리를 관리합니다.
              </p>
              <a
                href="/admin/categories"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <Tag size={18} />
                카테고리 관리로 이동
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
