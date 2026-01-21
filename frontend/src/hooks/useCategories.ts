import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import type { Category, Subcategory, Product, ProductCreate } from '@/types';

export interface CategoryCreate {
  name: string;
  icon?: string;
}

export interface SubcategoryCreateData {
  category_id: string;
  name: string;
}

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

  const deleteCategory = async (id: string) => {
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const createSubcategory = async (data: SubcategoryCreateData) => {
    const response = await api.post<Subcategory>('/categories/subcategories', data);
    await fetchCategories();
    return response.data;
  };

  const deleteSubcategory = async (id: string) => {
    await api.delete(`/categories/subcategories/${id}`);
    await fetchCategories();
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
    deleteCategory,
    createSubcategory,
    deleteSubcategory,
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
  };
}
