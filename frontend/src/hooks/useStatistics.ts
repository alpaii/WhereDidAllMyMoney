import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { MonthlySummary, CategorySummary, DailyExpense, AccountSummary } from '@/types';

interface MonthlyExpense {
  period: string;
  total_amount: number;
  count: number;
}

export function useStatistics() {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlySummary = useCallback(async (year: number, month: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MonthlySummary>(
        `/statistics/monthly/${year}/${month}`
      );
      setMonthlySummary(response.data);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '월별 통계를 불러오는데 실패했습니다');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategorySummary = useCallback(async (year: number, month: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<CategorySummary[]>(
        `/statistics/category/${year}/${month}`
      );
      setCategorySummary(Array.isArray(response.data) ? response.data : []);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '카테고리별 통계를 불러오는데 실패했습니다');
      setCategorySummary([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAccountSummary = useCallback(async (year: number, month: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<AccountSummary[]>(
        `/statistics/account/${year}/${month}`
      );
      setAccountSummary(Array.isArray(response.data) ? response.data : []);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '계좌별 통계를 불러오는데 실패했습니다');
      setAccountSummary([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDailyExpenses = useCallback(async (year: number, month: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<DailyExpense[]>(
        `/statistics/daily/${year}/${month}`
      );
      setDailyExpenses(Array.isArray(response.data) ? response.data : []);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '일별 통계를 불러오는데 실패했습니다');
      setDailyExpenses([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMonthlyExpenses = useCallback(async (year: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const response = await api.get<MonthlyExpense[]>(
        `/statistics/by-period?period_type=monthly&start_date=${startDate}&end_date=${endDate}`
      );
      const data = Array.isArray(response.data) ? response.data : [];
      // 날짜 오름차순 정렬
      data.sort((a, b) => a.period.localeCompare(b.period));
      setMonthlyExpenses(data);
      return data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '월별 통계를 불러오는데 실패했습니다');
      setMonthlyExpenses([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    monthlySummary,
    categorySummary,
    accountSummary,
    dailyExpenses,
    monthlyExpenses,
    isLoading,
    error,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchAccountSummary,
    fetchDailyExpenses,
    fetchMonthlyExpenses,
  };
}
