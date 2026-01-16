import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Account, AccountCreate } from '@/types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Account[]>('/accounts/');
      setAccounts(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '계좌 목록을 불러오는데 실패했습니다');
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
    const response = await api.put<Account>(`/accounts/${id}`, data);
    setAccounts((prev) =>
      prev.map((account) => (account.id === id ? response.data : account))
    );
    return response.data;
  };

  const deleteAccount = async (id: string) => {
    await api.delete(`/accounts/${id}`);
    setAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
