import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Account, AccountCreate } from '@/types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Account[]>('/accounts/');
      setAccounts(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '계좌 목록을 불러오는데 실패했습니다');
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAccount = async (data: AccountCreate) => {
    const response = await api.post<Account>('/accounts/', data);
    setAccounts((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateAccount = async (id: string, data: Partial<AccountCreate>) => {
    const response = await api.patch<Account>(`/accounts/${id}`, data);
    setAccounts((prev) =>
      prev.map((account) => (account.id === id ? response.data : account))
    );
    return response.data;
  };

  const deleteAccount = async (id: string) => {
    await api.delete(`/accounts/${id}`);
    setAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  const updateAccountOrder = async (orderedAccounts: { id: string; sort_order: number }[]) => {
    // Update local state optimistically first - update sort_order values AND sort
    setAccounts((prev) => {
      const updated = prev.map((acc) => {
        const newOrder = orderedAccounts.find((a) => a.id === acc.id);
        return newOrder ? { ...acc, sort_order: newOrder.sort_order } : acc;
      });
      return [...updated].sort((a, b) => a.sort_order - b.sort_order);
    });
    // Then call API
    await api.put('/accounts/order', { accounts: orderedAccounts });
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchAccounts();
  }, []);

  return {
    accounts,
    isLoading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    updateAccountOrder,
  };
}
