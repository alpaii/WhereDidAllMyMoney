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
  PieChart,
  Pie,
  Cell,
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
    dailyExpenses,
    isLoading,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchDailyExpenses,
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
    fetchDailyExpenses(year, month);
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

  const categoryChartData = categorySummary.map((c) => ({
    name: c.category_name,
    value: c.total_amount,
    icon: c.category_icon,
  }));

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
                {formatCurrency(monthlySummary?.daily_average || 0)}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${Math.floor(value / 10000)}만`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), '지출']}
                      />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category pie chart */}
          <Card>
            <CardHeader>
              <CardTitle>카테고리별 지출</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
              ) : categoryChartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), '지출']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                          {cat.category_icon} {cat.category_name}
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
                          ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
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
      </div>
    </DashboardLayout>
  );
}
