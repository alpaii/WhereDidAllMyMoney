'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import type { Store, StoreCreate } from '@/types';

export function useStores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchStores = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Store[]>('/stores/');
      setStores(response.data);
    } catch (err) {
      setError('매장 목록을 불러오는데 실패했습니다.');
      console.error('Failed to fetch stores:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createStore = async (data: StoreCreate) => {
    const response = await api.post<Store>('/stores/', data);
    setStores((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateStore = async (id: string, data: Partial<StoreCreate>) => {
    const response = await api.patch<Store>(`/stores/${id}`, data);
    setStores((prev) =>
      prev.map((store) => (store.id === id ? response.data : store))
    );
    return response.data;
  };

  const deleteStore = async (id: string) => {
    await api.delete(`/stores/${id}`);
    setStores((prev) => prev.filter((store) => store.id !== id));
  };

  const updateStoreOrder = async (orderUpdate: { id: string; sort_order: number }[]) => {
    await api.put('/stores/order', { stores: orderUpdate });
    // Optimistically update the order locally
    setStores((prev) => {
      const newStores = [...prev];
      orderUpdate.forEach((item) => {
        const store = newStores.find((s) => s.id === item.id);
        if (store) {
          store.sort_order = item.sort_order;
        }
      });
      return newStores.sort((a, b) => a.sort_order - b.sort_order);
    });
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStores();
  }, []);

  return {
    stores,
    isLoading,
    error,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    updateStoreOrder,
  };
}
