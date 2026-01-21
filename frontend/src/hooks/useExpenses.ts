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

      // Backend uses limit/offset, not page/size
      const limit = opts?.size || 50;
      const offset = opts?.page ? (opts.page - 1) * limit : 0;

      params.append('limit', String(limit));
      params.append('offset', String(offset));
      if (opts?.startDate) params.append('start_date', opts.startDate);
      if (opts?.endDate) params.append('end_date', opts.endDate);
      if (opts?.categoryId) params.append('category_id', opts.categoryId);
      if (opts?.accountId) params.append('account_id', opts.accountId);

      // Backend returns array directly, not paginated response
      const response = await api.get<Expense[]>(
        `/expenses/?${params.toString()}`
      );

      const data = Array.isArray(response.data) ? response.data : [];
      setExpenses(data);
      setTotal(data.length);
      setPages(1); // Backend doesn't return pagination info
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '지출 목록을 불러오는데 실패했습니다');
      setExpenses([]);
      setTotal(0);
      setPages(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createExpense = async (data: ExpenseCreate) => {
    const response = await api.post<Expense>('/expenses/', data);
    setExpenses((prev) => [response.data, ...prev]);
    return response.data;
  };

  const updateExpense = async (id: string, data: Partial<ExpenseCreate>) => {
    const response = await api.patch<Expense>(`/expenses/${id}`, data);
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
