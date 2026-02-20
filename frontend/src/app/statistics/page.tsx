'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { useStatistics } from '@/hooks/useStatistics';
import { formatCurrency, formatNumber } from '@/lib/utils';

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function StatisticsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    monthlySummary,
    categorySummary,
    accountSummary,
    dailyExpenses,
    monthlyExpenses,
    isLoading,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchAccountSummary,
    fetchDailyExpenses,
    fetchMonthlyExpenses,
  } = useStatistics();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const lastFetchRef = useRef<string>('');

  useEffect(() => {
    const key = `${year}-${month}`;
    if (lastFetchRef.current === key) return;
    lastFetchRef.current = key;

    fetchMonthlySummary(year, month);
    fetchCategorySummary(year, month);
    fetchAccountSummary(year, month);
    fetchDailyExpenses(year, month);
    fetchMonthlyExpenses(year);
  }, [year, month]);

  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const dailyChartData = dailyExpenses.map((d) => ({
    date: d.date.slice(8, 10) + '일',
    amount: d.total_amount,
  }));
  const dailyMax = Math.max(...dailyChartData.map((d) => d.amount), 0) * 1.2;

  const monthlyChartData = monthlyExpenses.map((m) => ({
    month: m.period.slice(5, 7) + '월',
    amount: m.total_amount,
  }));
  const monthlyMax = Math.max(...monthlyChartData.map((m) => m.amount), 0) * 1.2;

  return (
    <DashboardLayout title="통계">
      <div className="space-y-6">
        {/* Month selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={prevMonth}>
                <ChevronLeft size={20} />
              </Button>
              <h2 className="text-xl font-semibold text-gray-800">
                {year}년 {month}월
              </h2>
              <Button variant="ghost" onClick={nextMonth}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600">총 지출</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(monthlySummary?.total_expense || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600">일 평균</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(Math.round(monthlySummary?.daily_average || 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600">지출 건수</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatNumber(monthlySummary?.expense_count || 0)}건
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly expenses chart */}
        <Card>
          <CardHeader>
            <CardTitle>{year}년 월별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
            ) : monthlyChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${Math.floor(value / 10000)}만`}
                      domain={[0, monthlyMax]}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '지출']}
                    />
                    <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="amount"
                        position="top"
                        fontSize={11}
                        fill="#374151"
                        formatter={(value: number) => value > 0 ? formatCurrency(value) : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily expenses chart */}
        <Card>
          <CardHeader>
            <CardTitle>일별 지출</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
            ) : dailyChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-500">
                데이터가 없습니다
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyChartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${Math.floor(value / 10000)}만`}
                      domain={[0, dailyMax]}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), '지출']}
                    />
                    <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="amount"
                        position="top"
                        fontSize={11}
                        fill="#374151"
                        formatter={(value: number) => value > 0 ? formatCurrency(value) : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category details */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : categorySummary.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                데이터가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {categorySummary.map((cat, index) => (
                  <div key={cat.category_id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-gray-700">
                          {cat.category_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({cat.expense_count}건)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-800">
                          {formatCurrency(cat.total_amount)}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({Number(cat.percentage).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Number(cat.percentage)}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account details */}
        <Card>
          <CardHeader>
            <CardTitle>계좌별 상세</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : accountSummary.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                데이터가 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {accountSummary.map((acc, index) => (
                  <div key={acc.account_id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {acc.badge_color ? (
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: acc.badge_color }}
                          >
                            {acc.account_name}
                          </span>
                        ) : (
                          <>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-gray-700">
                              {acc.account_name}
                            </span>
                          </>
                        )}
                        <span className="text-sm text-gray-500">
                          ({acc.expense_count}건)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-800">
                          {formatCurrency(acc.total_amount)}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({Number(acc.percentage).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Number(acc.percentage)}%`,
                          backgroundColor: acc.badge_color || COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
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
