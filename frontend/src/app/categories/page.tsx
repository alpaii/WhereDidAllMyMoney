'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, GripVertical, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, Button, Input, Modal } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import type { Category, Subcategory } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력하세요'),
});

const subcategorySchema = z.object({
  name: z.string().min(1, '서브카테고리 이름을 입력하세요'),
});

type CategoryForm = z.infer<typeof categorySchema>;
type SubcategoryForm = z.infer<typeof subcategorySchema>;

function SortableSubcategoryItem({
  subcategory,
  onEditSubcategory,
}: {
  subcategory: Subcategory;
  onEditSubcategory: (subcategory: Subcategory) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm text-gray-700 shadow-sm"
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <span>{subcategory.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEditSubcategory(subcategory)}
          className="p-1 text-gray-500 hover:text-gray-700"
          title="이름 변경"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

function SortableCategoryItem({
  category,
  isOpen,
  onToggleOpen,
  onEditCategory,
  onAddSubcategory,
  onEditSubcategory,
  onSubcategoryDragEnd,
  subcategorySensors,
}: {
  category: Category;
  isOpen: boolean;
  onToggleOpen: () => void;
  onEditCategory: (category: Category) => void;
  onAddSubcategory: (categoryId: string) => void;
  onEditSubcategory: (subcategory: Subcategory) => void;
  onSubcategoryDragEnd: (categoryId: string, event: DragEndEvent) => void;
  subcategorySensors: ReturnType<typeof useSensors>;
}) {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <button
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={20} />
          </button>
          <button
            onClick={onToggleOpen}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <span className="font-medium text-gray-800">{category.name}</span>
            {isOpen ? (
              <ChevronDown size={20} className="text-gray-400" />
            ) : (
              <ChevronRight size={20} className="text-gray-400" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddSubcategory(category.id)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
            title="서브카테고리 추가"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => onEditCategory(category)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="이름 변경"
          >
            <Pencil size={18} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          {hasSubcategories ? (
            <DndContext
              sensors={subcategorySensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => onSubcategoryDragEnd(category.id, event)}
            >
              <SortableContext
                items={category.subcategories?.map((s) => s.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {category.subcategories?.map((sub) => (
                    <SortableSubcategoryItem
                      key={sub.id}
                      subcategory={sub}
                      onEditSubcategory={onEditSubcategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="text-sm text-gray-500 text-center py-2">
              서브카테고리가 없습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    updateCategoryOrder,
    updateSubcategoryOrder,
  } = useCategories();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const categorySensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const subcategorySensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const categoryForm = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
  });

  const subcategoryForm = useForm<SubcategoryForm>({
    resolver: zodResolver(subcategorySchema),
  });

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const newOrder = arrayMove(categories, oldIndex, newIndex);
      const orderUpdate = newOrder.map((cat, index) => ({
        id: cat.id,
        sort_order: index,
      }));

      try {
        await updateCategoryOrder(orderUpdate);
      } catch (error) {
        console.error('Failed to update category order:', error);
      }
    }
  };

  const handleSubcategoryDragEnd = async (categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const category = categories.find((cat) => cat.id === categoryId);
      if (!category?.subcategories) return;

      const oldIndex = category.subcategories.findIndex((sub) => sub.id === active.id);
      const newIndex = category.subcategories.findIndex((sub) => sub.id === over.id);

      const newOrder = arrayMove(category.subcategories, oldIndex, newIndex);
      const orderUpdate = newOrder.map((sub, index) => ({
        id: sub.id,
        sort_order: index,
      }));

      try {
        await updateSubcategoryOrder(categoryId, orderUpdate);
      } catch (error) {
        console.error('Failed to update subcategory order:', error);
      }
    }
  };

  const handleSaveCategory = async (data: CategoryForm) => {
    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name: data.name });
      } else {
        await createCategory({ name: data.name });
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert(editingCategory ? '카테고리 수정에 실패했습니다.' : '카테고리 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({ name: category.name });
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까? 관련된 모든 서브카테고리도 삭제됩니다.')) {
      try {
        await deleteCategory(id);
      } catch (error) {
        console.error('Failed to delete category:', error);
        alert('카테고리 삭제에 실패했습니다.');
      }
    }
  };

  const openSubcategoryModal = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingSubcategory(null);
    subcategoryForm.reset();
    setIsSubcategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    subcategoryForm.reset({ name: subcategory.name });
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (data: SubcategoryForm) => {
    try {
      setIsSubmitting(true);
      if (editingSubcategory) {
        await updateSubcategory(editingSubcategory.id, { name: data.name });
      } else if (selectedCategoryId) {
        await createSubcategory({
          category_id: selectedCategoryId,
          name: data.name,
        });
      }
      setIsSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      subcategoryForm.reset();
    } catch (error) {
      console.error('Failed to save subcategory:', error);
      alert(editingSubcategory ? '서브카테고리 수정에 실패했습니다.' : '서브카테고리 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (confirm('이 서브카테고리를 삭제하시겠습니까?')) {
      try {
        await deleteSubcategory(id);
      } catch (error) {
        console.error('Failed to delete subcategory:', error);
        alert('서브카테고리 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <DashboardLayout
      title="카테고리"
      action={
        <Button
          onClick={() => {
            setEditingCategory(null);
            categoryForm.reset({ name: '' });
            setIsCategoryModalOpen(true);
          }}
          size="icon"
          title="카테고리 추가"
        >
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
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
              <DndContext
                sensors={categorySensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
              >
                <SortableContext
                  items={categories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {categories.map((category) => (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        isOpen={openCategories.has(category.id)}
                        onToggleOpen={() => toggleCategory(category.id)}
                        onEditCategory={openEditCategoryModal}
                        onAddSubcategory={openSubcategoryModal}
                        onEditSubcategory={openEditSubcategoryModal}
                        onSubcategoryDragEnd={handleSubcategoryDragEnd}
                        subcategorySensors={subcategorySensors}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Category Modal */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          title={editingCategory ? '카테고리 수정' : '카테고리 추가'}
        >
          <form onSubmit={categoryForm.handleSubmit(handleSaveCategory)} className="space-y-4">
            <Input
              id="name"
              label="카테고리 이름"
              error={categoryForm.formState.errors.name?.message}
              {...categoryForm.register('name')}
            />
            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingCategory ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDeleteCategory(editingCategory.id);
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingCategory ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Subcategory Modal */}
        <Modal
          isOpen={isSubcategoryModalOpen}
          onClose={() => {
            setIsSubcategoryModalOpen(false);
            setEditingSubcategory(null);
          }}
          title={editingSubcategory ? '서브카테고리 수정' : '서브카테고리 추가'}
        >
          <form onSubmit={subcategoryForm.handleSubmit(handleSaveSubcategory)} className="space-y-4">
            <Input
              id="subcategory-name"
              label="서브카테고리 이름"
              error={subcategoryForm.formState.errors.name?.message}
              {...subcategoryForm.register('name')}
            />
            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingSubcategory ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDeleteSubcategory(editingSubcategory.id);
                    setIsSubcategoryModalOpen(false);
                    setEditingSubcategory(null);
                  }}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsSubcategoryModalOpen(false);
                    setEditingSubcategory(null);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingSubcategory ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
