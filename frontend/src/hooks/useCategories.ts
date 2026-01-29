import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Category, Subcategory, Product, ProductCreate, CategoryCreate, SubcategoryCreate } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Category[]>('/categories/');
      setCategories(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '카테고리 목록을 불러오는데 실패했습니다');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCategory = async (data: CategoryCreate) => {
    const response = await api.post<Category>('/categories/', data);
    await fetchCategories();
    return response.data;
  };

  const updateCategory = async (id: string, data: { name: string }) => {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name: response.data.name } : cat))
    );
    return response.data;
  };

  const deleteCategory = async (id: string) => {
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const createSubcategory = async (data: SubcategoryCreate) => {
    const response = await api.post<Subcategory>('/categories/subcategories', data);
    await fetchCategories();
    return response.data;
  };

  const updateSubcategory = async (id: string, data: { name: string }) => {
    const response = await api.patch<Subcategory>(`/categories/subcategories/${id}`, data);
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        subcategories: cat.subcategories?.map((sub) =>
          sub.id === id ? { ...sub, name: response.data.name } : sub
        ),
      }))
    );
    return response.data;
  };

  const deleteSubcategory = async (id: string) => {
    await api.delete(`/categories/subcategories/${id}`);
    await fetchCategories();
  };

  const updateCategoryOrder = async (orderedCategories: { id: string; sort_order: number }[]) => {
    // Update local state optimistically first - update sort_order values AND sort
    setCategories((prev) => {
      const updated = prev.map((cat) => {
        const newOrder = orderedCategories.find((c) => c.id === cat.id);
        return newOrder ? { ...cat, sort_order: newOrder.sort_order } : cat;
      });
      return [...updated].sort((a, b) => a.sort_order - b.sort_order);
    });
    // Then call API
    await api.put('/categories/order', { categories: orderedCategories });
  };

  const updateSubcategoryOrder = async (
    categoryId: string,
    orderedSubcategories: { id: string; sort_order: number }[]
  ) => {
    // Update local state optimistically first - update sort_order values AND sort
    setCategories((prev) =>
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
    // Then call API
    await api.put('/categories/subcategories/order', { subcategories: orderedSubcategories });
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchCategories();
  }, []);

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    updateCategoryOrder,
    updateSubcategoryOrder,
  };
}

export function useSubcategories(categoryId: string | null) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubcategories = useCallback(async () => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Subcategory[]>(
        `/categories/${categoryId}/subcategories`
      );
      setSubcategories(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '서브카테고리 목록을 불러오는데 실패했습니다');
      setSubcategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  return {
    subcategories,
    isLoading,
    error,
    fetchSubcategories,
  };
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Product[]>('/categories/products/');
      setProducts(Array.isArray(response.data) ? response.data : []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '상품 목록을 불러오는데 실패했습니다');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProduct = async (data: ProductCreate) => {
    const response = await api.post<Product>('/categories/products/', data);
    setProducts((prev) => [...prev, response.data]);
    return response.data;
  };

  const updateProduct = async (id: string, data: Partial<ProductCreate>) => {
    const response = await api.patch<Product>(`/categories/products/${id}`, data);
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? response.data : product))
    );
    return response.data;
  };

  const deleteProduct = async (id: string) => {
    await api.delete(`/categories/products/${id}`);
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const toggleFavorite = async (id: string) => {
    const response = await api.post<Product>(`/categories/products/${id}/toggle-favorite`);
    // 즐겨찾기 변경 후 목록 다시 불러오기 (정렬 유지)
    await fetchProducts();
    return response.data;
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchProducts();
  }, []);

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleFavorite,
  };
}
