'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Modal,
} from '@/components/ui';
import api from '@/lib/api';
import type { Category, Subcategory } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, '카테고리명을 입력하세요'),
  icon: z.string().optional(),
});

const subcategorySchema = z.object({
  name: z.string().min(1, '서브카테고리명을 입력하세요'),
});

type CategoryForm = z.infer<typeof categorySchema>;
type SubcategoryForm = z.infer<typeof subcategorySchema>;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [subcategoryModalOpen, setSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register: registerCategory,
    handleSubmit: handleCategorySubmit,
    reset: resetCategory,
    formState: { errors: categoryErrors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const {
    register: registerSubcategory,
    handleSubmit: handleSubcategorySubmit,
    reset: resetSubcategory,
    formState: { errors: subcategoryErrors },
  } = useForm<SubcategoryForm>({
    resolver: zodResolver(subcategorySchema),
  });

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<Category[]>('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Category CRUD
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    resetCategory({ name: '', icon: '' });
    setCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    resetCategory({ name: category.name, icon: category.icon || '' });
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategory(null);
    resetCategory();
  };

  const onCategorySubmit = async (data: CategoryForm) => {
    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.id}`, data);
      } else {
        await api.post('/admin/categories/', data);
      }
      closeCategoryModal();
      fetchCategories();
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까? 하위 서브카테고리도 모두 삭제됩니다.')) {
      return;
    }

    try {
      await api.delete(`/admin/categories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // Subcategory CRUD
  const openCreateSubcategoryModal = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingSubcategory(null);
    resetSubcategory({ name: '' });
    setSubcategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (subcategory: Subcategory) => {
    setSelectedCategoryId(subcategory.category_id);
    setEditingSubcategory(subcategory);
    resetSubcategory({ name: subcategory.name });
    setSubcategoryModalOpen(true);
  };

  const closeSubcategoryModal = () => {
    setSubcategoryModalOpen(false);
    setEditingSubcategory(null);
    setSelectedCategoryId(null);
    resetSubcategory();
  };

  const onSubcategorySubmit = async (data: SubcategoryForm) => {
    if (!selectedCategoryId) return;

    try {
      setIsSubmitting(true);
      if (editingSubcategory) {
        await api.put(`/admin/subcategories/${editingSubcategory.id}`, data);
      } else {
        await api.post(`/admin/categories/${selectedCategoryId}/subcategories`, data);
      }
      closeSubcategoryModal();
      fetchCategories();
    } catch (error) {
      console.error('Failed to save subcategory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSubcategory = async (id: string) => {
    if (!confirm('이 서브카테고리를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`/admin/subcategories/${id}`);
      fetchCategories();
    } catch (error) {
      console.error('Failed to delete subcategory:', error);
    }
  };

  return (
    <AdminLayout title="카테고리 관리">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-end">
          <Button onClick={openCreateCategoryModal}>
            <Plus size={18} />
            카테고리 추가
          </Button>
        </div>

        {/* Categories list */}
        <Card>
          <CardHeader>
            <CardTitle>카테고리 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                등록된 카테고리가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const hasSubcategories =
                    category.subcategories && category.subcategories.length > 0;

                  return (
                    <div
                      key={category.id}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4 bg-white">
                        <button
                          onClick={() => hasSubcategories && toggleExpand(category.id)}
                          className="flex items-center gap-3"
                          disabled={!hasSubcategories}
                        >
                          {hasSubcategories ? (
                            isExpanded ? (
                              <ChevronDown size={20} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={20} className="text-gray-400" />
                            )
                          ) : (
                            <div className="w-5" />
                          )}
                          <span className="text-2xl">{category.icon || '📦'}</span>
                          <span className="font-medium text-gray-800">
                            {category.name}
                          </span>
                          {hasSubcategories && (
                            <span className="text-sm text-gray-500">
                              ({category.subcategories?.length}개)
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openCreateSubcategoryModal(category.id)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="서브카테고리 추가"
                          >
                            <Plus size={18} />
                          </button>
                          <button
                            onClick={() => openEditCategoryModal(category)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Pencil size={18} />
                          </button>
                          {!category.is_system && (
                            <button
                              onClick={() => deleteCategory(category.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && hasSubcategories && (
                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                          <div className="space-y-2">
                            {category.subcategories?.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm"
                              >
                                <span className="text-gray-700">{sub.name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditSubcategoryModal(sub)}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteSubcategory(sub.id)}
                                    className="p-1 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Modal */}
        <Modal
          isOpen={categoryModalOpen}
          onClose={closeCategoryModal}
          title={editingCategory ? '카테고리 수정' : '카테고리 추가'}
        >
          <form onSubmit={handleCategorySubmit(onCategorySubmit)} className="space-y-4">
            <Input
              id="name"
              label="카테고리명"
              placeholder="예: 식비"
              error={categoryErrors.name?.message}
              {...registerCategory('name')}
            />
            <Input
              id="icon"
              label="아이콘 (이모지)"
              placeholder="예: 🍽️"
              error={categoryErrors.icon?.message}
              {...registerCategory('icon')}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={closeCategoryModal}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingCategory ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Subcategory Modal */}
        <Modal
          isOpen={subcategoryModalOpen}
          onClose={closeSubcategoryModal}
          title={editingSubcategory ? '서브카테고리 수정' : '서브카테고리 추가'}
        >
          <form onSubmit={handleSubcategorySubmit(onSubcategorySubmit)} className="space-y-4">
            <Input
              id="subName"
              label="서브카테고리명"
              placeholder="예: 식사"
              error={subcategoryErrors.name?.message}
              {...registerSubcategory('name')}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={closeSubcategoryModal}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingSubcategory ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
