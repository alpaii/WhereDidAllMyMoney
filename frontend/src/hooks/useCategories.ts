import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { Category, Subcategory, Product, ProductCreate } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Category[]>('/categories/');
      setCategories(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '카테고리 목록을 불러오는데 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
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
      setSubcategories(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '서브카테고리 목록을 불러오는데 실패했습니다');
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

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Product[]>('/categories/products/');
      setProducts(response.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '상품 목록을 불러오는데 실패했습니다');
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
    const response = await api.put<Product>(`/categories/products/${id}`, data);
    setProducts((prev) =>
      prev.map((product) => (product.id === id ? response.data : product))
    );
    return response.data;
  };

  const deleteProduct = async (id: string) => {
    await api.delete(`/categories/products/${id}`);
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
