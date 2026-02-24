import { useState, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { StoreCategory, StoreSubcategory } from '@/types';

export function useStoreCategories() {
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchStoreCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<StoreCategory[]>('/store-categories/');
      setStoreCategories(Array.isArray(response.data) ? response.data : []);
      return response.data;
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '매장 카테고리 목록을 불러오는데 실패했습니다');
      setStoreCategories([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createStoreCategory = async (name: string) => {
    const response = await api.post<StoreCategory>('/store-categories/', { name });
    await fetchStoreCategories();
    return response.data;
  };

  const updateStoreCategory = async (id: string, name: string) => {
    const response = await api.patch<StoreCategory>(`/store-categories/${id}`, { name });
    setStoreCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name: response.data.name } : cat))
    );
    return response.data;
  };

  const deleteStoreCategory = async (id: string) => {
    await api.delete(`/store-categories/${id}`);
    setStoreCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const createStoreSubcategory = async (storeCategoryId: string, name: string) => {
    const response = await api.post<StoreSubcategory>('/store-categories/subcategories', {
      store_category_id: storeCategoryId,
      name,
    });
    await fetchStoreCategories();
    return response.data;
  };

  const updateStoreSubcategory = async (id: string, name: string) => {
    const response = await api.patch<StoreSubcategory>(`/store-categories/subcategories/${id}`, { name });
    setStoreCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        subcategories: cat.subcategories?.map((sub) =>
          sub.id === id ? { ...sub, name: response.data.name } : sub
        ),
      }))
    );
    return response.data;
  };

  const deleteStoreSubcategory = async (id: string) => {
    await api.delete(`/store-categories/subcategories/${id}`);
    await fetchStoreCategories();
  };

  const updateStoreCategoryOrder = async (orderedCategories: { id: string; sort_order: number }[]) => {
    setStoreCategories((prev) => {
      const updated = prev.map((cat) => {
        const newOrder = orderedCategories.find((c) => c.id === cat.id);
        return newOrder ? { ...cat, sort_order: newOrder.sort_order } : cat;
      });
      return [...updated].sort((a, b) => a.sort_order - b.sort_order);
    });
    await api.put('/store-categories/order', { categories: orderedCategories });
  };

  const updateStoreSubcategoryOrder = async (
    categoryId: string,
    orderedSubcategories: { id: string; sort_order: number }[]
  ) => {
    setStoreCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categoryId || !cat.subcategories) return cat;
        const updatedSubcategories = cat.subcategories.map((sub) => {
          const newOrder = orderedSubcategories.find((s) => s.id === sub.id);
          return newOrder ? { ...sub, sort_order: newOrder.sort_order } : sub;
        });
        const sortedSubcategories = [...updatedSubcategories].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        return { ...cat, subcategories: sortedSubcategories };
      })
    );
    await api.put('/store-categories/subcategories/order', { subcategories: orderedSubcategories });
  };

  const initDefaultCategory = async () => {
    await api.post('/store-categories/init-default');
    await fetchStoreCategories();
  };

  const initialize = useCallback(async () => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    const categories = await fetchStoreCategories();
    if (categories.length === 0) {
      await initDefaultCategory();
    }
  }, [fetchStoreCategories]);

  return {
    storeCategories,
    isLoading,
    error,
    fetchStoreCategories,
    createStoreCategory,
    updateStoreCategory,
    deleteStoreCategory,
    createStoreSubcategory,
    updateStoreSubcategory,
    deleteStoreSubcategory,
    updateStoreCategoryOrder,
    updateStoreSubcategoryOrder,
    initDefaultCategory,
    initialize,
  };
}
