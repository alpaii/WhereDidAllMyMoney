'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronRight, Plus, Trash2, X, GripVertical } from 'lucide-react';
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
import type { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력하세요'),
});

const subcategorySchema = z.object({
  name: z.string().min(1, '서브카테고리 이름을 입력하세요'),
});

type CategoryForm = z.infer<typeof categorySchema>;
type SubcategoryForm = z.infer<typeof subcategorySchema>;

function SortableCategoryItem({
  category,
  onDeleteCategory,
  onAddSubcategory,
  onDeleteSubcategory,
}: {
  category: Category;
  onDeleteCategory: (id: string) => void;
  onAddSubcategory: (categoryId: string) => void;
  onDeleteSubcategory: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
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
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <span className="font-medium text-gray-800">{category.name}</span>
            {hasSubcategories && (
              <span className="text-sm text-gray-500">
                ({category.subcategories?.length}개)
              </span>
            )}
            {isOpen ? (
              <ChevronDown size={20} className="text-gray-400" />
            ) : (
              <ChevronRight size={20} className="text-gray-400" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddSubcategory(category.id)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
            title="서브카테고리 추가"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => onDeleteCategory(category.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            title="카테고리 삭제"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          {hasSubcategories ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {category.subcategories?.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm text-gray-700 shadow-sm"
                >
                  <span>{sub.name}</span>
                  <button
                    onClick={() => onDeleteSubcategory(sub.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
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
    deleteCategory,
    createSubcategory,
    deleteSubcategory,
    updateCategoryOrder,
  } = useCategories();

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
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

  const handleDragEnd = async (event: DragEndEvent) => {
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

  const handleCreateCategory = async (data: CategoryForm) => {
    try {
      setIsSubmitting(true);
      await createCategory({
        name: data.name,
      });
      setIsCategoryModalOpen(false);
      categoryForm.reset();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('카테고리 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
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
    subcategoryForm.reset();
    setIsSubcategoryModalOpen(true);
  };

  const handleCreateSubcategory = async (data: SubcategoryForm) => {
    if (!selectedCategoryId) return;
    try {
      setIsSubmitting(true);
      await createSubcategory({
        category_id: selectedCategoryId,
        name: data.name,
      });
      setIsSubcategoryModalOpen(false);
      subcategoryForm.reset();
    } catch (error) {
      console.error('Failed to create subcategory:', error);
      alert('서브카테고리 생성에 실패했습니다.');
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
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
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
                        onDeleteCategory={handleDeleteCategory}
                        onAddSubcategory={openSubcategoryModal}
                        onDeleteSubcategory={handleDeleteSubcategory}
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
          onClose={() => setIsCategoryModalOpen(false)}
          title="카테고리 추가"
        >
          <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
            <Input
              id="name"
              label="카테고리 이름"
              placeholder="예: 식비"
              error={categoryForm.formState.errors.name?.message}
              {...categoryForm.register('name')}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                추가
              </Button>
            </div>
          </form>
        </Modal>

        {/* Subcategory Modal */}
        <Modal
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          title="서브카테고리 추가"
        >
          <form onSubmit={subcategoryForm.handleSubmit(handleCreateSubcategory)} className="space-y-4">
            <Input
              id="subcategory-name"
              label="서브카테고리 이름"
              placeholder="예: 점심"
              error={subcategoryForm.formState.errors.name?.message}
              {...subcategoryForm.register('name')}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsSubcategoryModalOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                추가
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
