import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type { Expense, ExpenseCreate, ExpensePhoto } from '@/types';

interface UseExpensesOptions {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
}

interface PaginatedExpenseResponse {
  items: Expense[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async (opts?: UseExpensesOptions) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();

      const page = opts?.page || 1;
      const size = opts?.size || 100;

      params.append('page', String(page));
      params.append('size', String(size));
      if (opts?.startDate) params.append('start_date', opts.startDate);
      if (opts?.endDate) params.append('end_date', opts.endDate);
      if (opts?.categoryId) params.append('category_id', opts.categoryId);
      if (opts?.accountId) params.append('account_id', opts.accountId);

      const response = await api.get<PaginatedExpenseResponse>(
        `/expenses/?${params.toString()}`
      );

      const data = response.data;
      setExpenses(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setCurrentPage(data.page || 1);
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

  const uploadPhoto = async (expenseId: string, file: File): Promise<ExpensePhoto> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ExpensePhoto>(
      `/expenses/${expenseId}/photos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    // Update local state
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId
          ? { ...expense, photos: [...(expense.photos || []), response.data] }
          : expense
      )
    );

    return response.data;
  };

  const deletePhoto = async (expenseId: string, photoId: string) => {
    await api.delete(`/expenses/${expenseId}/photos/${photoId}`);

    // Update local state
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId
          ? { ...expense, photos: expense.photos?.filter((p) => p.id !== photoId) || [] }
          : expense
      )
    );
  };

  return {
    expenses,
    total,
    pages,
    currentPage,
    isLoading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    uploadPhoto,
    deletePhoto,
  };
}
