import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { MonthlySummary, CategorySummary, DailyExpense } from '@/types';

export function useStatistics() {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
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

  return {
    monthlySummary,
    categorySummary,
    dailyExpenses,
    isLoading,
    error,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchDailyExpenses,
  };
}
