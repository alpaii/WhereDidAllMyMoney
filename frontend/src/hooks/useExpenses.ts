import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Expense, ExpenseCreate, PaginatedResponse } from '@/types';

interface UseExpensesOptions {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (opts?: UseExpensesOptions) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      const finalOpts = { ...options, ...opts };

      if (finalOpts.page) params.append('page', String(finalOpts.page));
      if (finalOpts.size) params.append('size', String(finalOpts.size));
      if (finalOpts.startDate) params.append('start_date', finalOpts.startDate);
      if (finalOpts.endDate) params.append('end_date', finalOpts.endDate);
      if (finalOpts.categoryId) params.append('category_id', finalOpts.categoryId);
      if (finalOpts.accountId) params.append('account_id', finalOpts.accountId);

      const response = await api.get<PaginatedResponse<Expense>>(
        `/expenses/?${params.toString()}`
      );

      setExpenses(response.data.items);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '지출 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const createExpense = async (data: ExpenseCreate) => {
    const response = await api.post<Expense>('/expenses/', data);
    setExpenses((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateExpense = async (id: string, data: Partial<ExpenseCreate>) => {
    const response = await api.put<Expense>(`/expenses/${id}`, data);
    setExpenses((prev) =>
      prev.map((expense) => (expense.id === id ? response.data : expense))
    );
    return response.data;
  };

  const deleteExpense = async (id: string) => {
    await api.delete(`/expenses/${id}`);
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  };

  return {
    expenses,
    total,
    pages,
    isLoading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
  };
}
