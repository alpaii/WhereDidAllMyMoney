'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { useStatistics } from '@/hooks/useStatistics';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrency, formatDate, getAccountTypeLabel, getAccountTypeColor } from '@/lib/utils';

export default function DashboardPage() {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { fetchMonthlySummary, fetchCategorySummary, monthlySummary, categorySummary } = useStatistics();
  const { expenses, fetchExpenses, isLoading: expensesLoading } = useExpenses();
  const [currentDate] = useState(new Date());
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    fetchMonthlySummary(year, month);
    fetchCategorySummary(year, month);
    fetchExpenses({ page: 1, size: 5 });
  }, []);

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <DashboardLayout title="대시보드">
      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">총 잔액</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(totalBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">이번 달 지출</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(monthlySummary?.total_expense || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="text-red-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">일 평균 지출</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatCurrency(monthlySummary?.daily_average || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-yellow-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">지출 건수</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {monthlySummary?.expense_count || 0}건
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>계좌 현황</CardTitle>
              <Link
                href="/accounts"
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                전체보기 <ArrowRight size={16} />
              </Link>
            </CardHeader>
            <CardContent>
              {accountsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  등록된 계좌가 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.slice(0, 4).map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{account.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getAccountTypeColor(account.account_type)}`}>
                          {getAccountTypeLabel(account.account_type)}
                        </span>
                      </div>
                      <p className={`font-semibold ${Number(account.balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatCurrency(Number(account.balance))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>카테고리별 지출</CardTitle>
              <Link
                href="/statistics"
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                상세보기 <ArrowRight size={16} />
              </Link>
            </CardHeader>
            <CardContent>
              {categorySummary.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  이번 달 지출 내역이 없습니다
                </div>
              ) : (
                <div className="space-y-4">
                  {categorySummary.slice(0, 5).map((cat) => (
                    <div key={cat.category_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700">
                          {cat.category_name}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {formatCurrency(cat.total_amount)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>최근 지출</CardTitle>
            <Link
              href="/expenses"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              전체보기 <ArrowRight size={16} />
            </Link>
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 지출이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {expense.subcategory?.name || expense.category?.name || '미분류'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(expense.expense_at, 'M월 d일')} · {expense.account?.name}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-800">
                      -{formatCurrency(Number(expense.amount))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
