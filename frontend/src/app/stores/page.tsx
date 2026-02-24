'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, MapPin, Tag, ChevronLeft, ChevronRight, GripVertical, ArrowRightLeft } from 'lucide-react';
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
import { Button, Input, Modal, Select } from '@/components/ui';
import { KakaoMap } from '@/components/KakaoMap';
import { useStoreCategories } from '@/hooks/useStoreCategories';
import { useStores } from '@/hooks/useStores';
import type { Store, StoreCreate, StoreCategory, StoreSubcategory } from '@/types';

const nameSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
});

type NameForm = z.infer<typeof nameSchema>;

const storeSchema = z.object({
  name: z.string().min(1, '매장 이름을 입력하세요'),
});

type StoreForm = z.infer<typeof storeSchema>;

// ==================== Sortable Items ====================

function SortableCategoryItem({
  category,
  onClick,
  onEdit,
}: {
  category: StoreCategory;
  onClick: () => void;
  onEdit: (cat: StoreCategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const subCount = category.subcategories?.length || 0;

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <button className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </button>
        <button onClick={onClick} className="flex items-center gap-3 flex-1 text-left">
          <span className="font-medium text-gray-800">{category.name}</span>
          <span className="text-sm text-gray-400">({subCount})</span>
          <ChevronRight size={20} className="text-gray-400 ml-auto" />
        </button>
      </div>
      <button onClick={() => onEdit(category)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="수정">
        <Pencil size={18} />
      </button>
    </div>
  );
}

function SortableSubcategoryItem({
  subcategory,
  onClick,
  onEdit,
}: {
  subcategory: StoreSubcategory;
  onClick: () => void;
  onEdit: (sub: StoreSubcategory) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subcategory.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3 flex-1">
        <button className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </button>
        <button onClick={onClick} className="flex items-center gap-3 flex-1 text-left">
          <span className="font-medium text-gray-800">{subcategory.name}</span>
          <ChevronRight size={20} className="text-gray-400 ml-auto" />
        </button>
      </div>
      <button onClick={() => onEdit(subcategory)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="수정">
        <Pencil size={18} />
      </button>
    </div>
  );
}

// ==================== Store Item ====================

function StoreItem({
  store,
  onEdit,
  onMove,
}: {
  store: Store;
  onEdit: (store: Store) => void;
  onMove: (store: Store) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-800 block">{store.name}</span>
        {store.road_address && (
          <span className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <MapPin size={14} className="flex-shrink-0" />
            <span className="truncate">{store.road_address}</span>
          </span>
        )}
        {store.category && (
          <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Tag size={12} className="flex-shrink-0" />
            {store.category}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onMove(store)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="카테고리 이동">
          <ArrowRightLeft size={18} />
        </button>
        <button onClick={() => onEdit(store)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="수정">
          <Pencil size={18} />
        </button>
      </div>
    </div>
  );
}

// ==================== Main Page ====================

type ViewLevel = 'categories' | 'subcategories' | 'stores';

export default function StoresPage() {
  // Hooks
  const {
    storeCategories,
    isLoading: isCategoriesLoading,
    fetchStoreCategories,
    createStoreCategory,
    updateStoreCategory,
    deleteStoreCategory,
    createStoreSubcategory,
    updateStoreSubcategory,
    deleteStoreSubcategory,
    updateStoreCategoryOrder,
    updateStoreSubcategoryOrder,
    initialize,
  } = useStoreCategories();

  const {
    stores,
    isLoading: isStoresLoading,
    fetchStores,
    createStore,
    updateStore,
    deleteStore,
    moveStoreCategory,
  } = useStores();

  // Navigation state
  const [viewLevel, setViewLevel] = useState<ViewLevel>('categories');
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<StoreSubcategory | null>(null);

  // Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<StoreCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<StoreSubcategory | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [movingStore, setMovingStore] = useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<StoreCreate | null>(null);
  const [manualMode, setManualMode] = useState(false);

  // Move modal state
  const [moveCategoryId, setMoveCategoryId] = useState('');
  const [moveSubcategoryId, setMoveSubcategoryId] = useState('');

  // Forms
  const categoryForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const subcategoryForm = useForm<NameForm>({ resolver: zodResolver(nameSchema) });
  const storeForm = useForm<StoreForm>({ resolver: zodResolver(storeSchema) });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // ==================== Navigation ====================

  const navigateToSubcategories = (category: StoreCategory) => {
    setSelectedCategory(category);
    setViewLevel('subcategories');
  };

  const navigateToStores = (subcategory: StoreSubcategory) => {
    setSelectedSubcategory(subcategory);
    setViewLevel('stores');
    fetchStores(subcategory.id);
  };

  const navigateBack = () => {
    if (viewLevel === 'stores') {
      setViewLevel('subcategories');
      setSelectedSubcategory(null);
    } else if (viewLevel === 'subcategories') {
      setViewLevel('categories');
      setSelectedCategory(null);
    }
  };

  // ==================== DnD handlers ====================

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = storeCategories.findIndex((cat) => cat.id === active.id);
      const newIndex = storeCategories.findIndex((cat) => cat.id === over.id);
      const newOrder = arrayMove(storeCategories, oldIndex, newIndex);
      const orderUpdate = newOrder.map((cat, index) => ({ id: cat.id, sort_order: index }));
      try {
        await updateStoreCategoryOrder(orderUpdate);
      } catch (error) {
        console.error('Failed to update category order:', error);
      }
    }
  };

  const handleSubcategoryDragEnd = async (event: DragEndEvent) => {
    if (!selectedCategory?.subcategories) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const subs = selectedCategory.subcategories;
      const oldIndex = subs.findIndex((sub) => sub.id === active.id);
      const newIndex = subs.findIndex((sub) => sub.id === over.id);
      const newOrder = arrayMove(subs, oldIndex, newIndex);
      const orderUpdate = newOrder.map((sub, index) => ({ id: sub.id, sort_order: index }));
      try {
        await updateStoreSubcategoryOrder(selectedCategory.id, orderUpdate);
        // Update local selectedCategory
        setSelectedCategory((prev) => prev ? { ...prev, subcategories: newOrder.map((s, i) => ({ ...s, sort_order: i })) } : prev);
      } catch (error) {
        console.error('Failed to update subcategory order:', error);
      }
    }
  };

  // ==================== Category CRUD ====================

  const handleSaveCategory = async (data: NameForm) => {
    try {
      setIsSubmitting(true);
      if (editingCategory) {
        await updateStoreCategory(editingCategory.id, data.name);
      } else {
        await createStoreCategory(data.name);
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

  const handleDeleteCategory = async (id: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까?')) {
      try {
        await deleteStoreCategory(id);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        alert(err.response?.data?.detail || '카테고리 삭제에 실패했습니다.');
      }
    }
  };

  // ==================== Subcategory CRUD ====================

  const handleSaveSubcategory = async (data: NameForm) => {
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      if (editingSubcategory) {
        await updateStoreSubcategory(editingSubcategory.id, data.name);
      } else {
        await createStoreSubcategory(selectedCategory.id, data.name);
      }
      setIsSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      subcategoryForm.reset();
      // Refresh to get updated subcategories
      const cats = await fetchStoreCategories();
      const updated = (cats as StoreCategory[]).find((c: StoreCategory) => c.id === selectedCategory.id);
      if (updated) setSelectedCategory(updated);
    } catch (error) {
      console.error('Failed to save subcategory:', error);
      alert(editingSubcategory ? '서브카테고리 수정에 실패했습니다.' : '서브카테고리 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!selectedCategory) return;
    if (confirm('이 서브카테고리를 삭제하시겠습니까?')) {
      try {
        await deleteStoreSubcategory(id);
        // Refresh
        const cats = await fetchStoreCategories();
        const updated = (cats as StoreCategory[]).find((c: StoreCategory) => c.id === selectedCategory.id);
        if (updated) setSelectedCategory(updated);
      } catch (error: unknown) {
        const err = error as { response?: { data?: { detail?: string } } };
        alert(err.response?.data?.detail || '서브카테고리 삭제에 실패했습니다.');
      }
    }
  };

  // ==================== Store CRUD ====================

  const handleSelectPlace = (place: StoreCreate) => {
    setSelectedPlace(place);
    storeForm.setValue('name', place.name);
  };

  const handleSaveStore = async (data: StoreForm) => {
    if (!selectedCategory || !selectedSubcategory) return;
    try {
      setIsSubmitting(true);
      if (editingStore) {
        const updateData: Partial<StoreCreate> = selectedPlace
          ? { ...selectedPlace, name: data.name }
          : { name: data.name };
        await updateStore(editingStore.id, updateData);
      } else {
        const storeData: StoreCreate = selectedPlace
          ? { ...selectedPlace, name: data.name, store_category_id: selectedCategory.id, store_subcategory_id: selectedSubcategory.id }
          : { name: data.name, store_category_id: selectedCategory.id, store_subcategory_id: selectedSubcategory.id };
        await createStore(storeData);
      }
      handleCloseStoreModal();
    } catch (error) {
      console.error('Failed to save store:', error);
      alert(editingStore ? '매장 수정에 실패했습니다.' : '매장 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseStoreModal = () => {
    setIsStoreModalOpen(false);
    setEditingStore(null);
    setSelectedPlace(null);
    setManualMode(false);
    storeForm.reset();
  };

  const openCreateStoreModal = () => {
    setEditingStore(null);
    setSelectedPlace(null);
    setManualMode(false);
    storeForm.reset({ name: '' });
    setIsStoreModalOpen(true);
  };

  const openEditStoreModal = (store: Store) => {
    setEditingStore(store);
    setSelectedPlace({
      name: store.name,
      address: store.address || undefined,
      road_address: store.road_address || undefined,
      latitude: store.latitude || undefined,
      longitude: store.longitude || undefined,
      naver_place_id: store.naver_place_id || undefined,
      category: store.category || undefined,
      phone: store.phone || undefined,
    });
    setManualMode(false);
    storeForm.reset({ name: store.name });
    setIsStoreModalOpen(true);
  };

  const handleDeleteStore = async (id: string) => {
    if (confirm('이 매장을 삭제하시겠습니까?')) {
      try {
        await deleteStore(id);
      } catch (error) {
        console.error('Failed to delete store:', error);
        alert('매장 삭제에 실패했습니다.');
      }
    }
  };

  // ==================== Move Category ====================

  const openMoveModal = (store: Store) => {
    setMovingStore(store);
    setMoveCategoryId('');
    setMoveSubcategoryId('');
    setIsMoveModalOpen(true);
  };

  const handleMoveStore = async () => {
    if (!movingStore || !moveCategoryId || !moveSubcategoryId) return;
    try {
      setIsSubmitting(true);
      await moveStoreCategory(movingStore.id, moveCategoryId, moveSubcategoryId);
      setIsMoveModalOpen(false);
      setMovingStore(null);
    } catch (error) {
      console.error('Failed to move store:', error);
      alert('매장 카테고리 이동에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveTargetCategory = storeCategories.find((c) => c.id === moveCategoryId);

  // ==================== Keep selectedCategory in sync ====================
  useEffect(() => {
    if (selectedCategory) {
      const updated = storeCategories.find((c) => c.id === selectedCategory.id);
      if (updated) setSelectedCategory(updated);
    }
  }, [storeCategories]);

  // ==================== Render ====================

  const isLoading = isCategoriesLoading;

  // Header title and action based on view level
  let headerTitle = '매장 관리';
  let headerAction = (
    <Button onClick={() => { setEditingCategory(null); categoryForm.reset({ name: '' }); setIsCategoryModalOpen(true); }} size="icon" title="카테고리 추가">
      <Plus size={20} />
    </Button>
  );
  let showBack = false;

  if (viewLevel === 'subcategories' && selectedCategory) {
    headerTitle = selectedCategory.name;
    headerAction = (
      <Button onClick={() => { setEditingSubcategory(null); subcategoryForm.reset({ name: '' }); setIsSubcategoryModalOpen(true); }} size="icon" title="서브카테고리 추가">
        <Plus size={20} />
      </Button>
    );
    showBack = true;
  } else if (viewLevel === 'stores' && selectedSubcategory) {
    headerTitle = selectedSubcategory.name;
    headerAction = (
      <Button onClick={openCreateStoreModal} size="icon" title="매장 추가">
        <Plus size={20} />
      </Button>
    );
    showBack = true;
  }

  return (
    <DashboardLayout
      title={
        showBack ? (
          <div className="flex items-center gap-2">
            <button onClick={navigateBack} className="p-1 hover:bg-gray-100 rounded-lg">
              <ChevronLeft size={24} />
            </button>
            <span>{headerTitle}</span>
          </div>
        ) : headerTitle
      }
      action={headerAction}
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : viewLevel === 'categories' ? (
          /* Level 1: Categories */
          storeCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">등록된 카테고리가 없습니다</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
              <SortableContext items={storeCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {storeCategories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      onClick={() => navigateToSubcategories(category)}
                      onEdit={(cat) => { setEditingCategory(cat); categoryForm.reset({ name: cat.name }); setIsCategoryModalOpen(true); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : viewLevel === 'subcategories' && selectedCategory ? (
          /* Level 2: Subcategories */
          !selectedCategory.subcategories || selectedCategory.subcategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">등록된 서브카테고리가 없습니다</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubcategoryDragEnd}>
              <SortableContext items={selectedCategory.subcategories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {selectedCategory.subcategories.map((subcategory) => (
                    <SortableSubcategoryItem
                      key={subcategory.id}
                      subcategory={subcategory}
                      onClick={() => navigateToStores(subcategory)}
                      onEdit={(sub) => { setEditingSubcategory(sub); subcategoryForm.reset({ name: sub.name }); setIsSubcategoryModalOpen(true); }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )
        ) : viewLevel === 'stores' ? (
          /* Level 3: Stores */
          isStoresLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-12 text-gray-500">등록된 매장이 없습니다</div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <StoreItem key={store.id} store={store} onEdit={openEditStoreModal} onMove={openMoveModal} />
              ))}
            </div>
          )
        ) : null}

        {/* Category Modal */}
        <Modal
          isOpen={isCategoryModalOpen}
          onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}
          title={editingCategory ? '카테고리 수정' : '카테고리 추가'}
        >
          <form onSubmit={categoryForm.handleSubmit(handleSaveCategory)} className="space-y-4">
            <Input id="cat-name" label="카테고리 이름" error={categoryForm.formState.errors.name?.message} {...categoryForm.register('name')} />
            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingCategory ? (
                <Button type="button" variant="danger" onClick={() => { handleDeleteCategory(editingCategory.id); setIsCategoryModalOpen(false); setEditingCategory(null); }}>
                  삭제
                </Button>
              ) : <div />}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}>취소</Button>
                <Button type="submit" isLoading={isSubmitting}>{editingCategory ? '수정' : '추가'}</Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Subcategory Modal */}
        <Modal
          isOpen={isSubcategoryModalOpen}
          onClose={() => { setIsSubcategoryModalOpen(false); setEditingSubcategory(null); }}
          title={editingSubcategory ? '서브카테고리 수정' : '서브카테고리 추가'}
        >
          <form onSubmit={subcategoryForm.handleSubmit(handleSaveSubcategory)} className="space-y-4">
            <Input id="sub-name" label="서브카테고리 이름" error={subcategoryForm.formState.errors.name?.message} {...subcategoryForm.register('name')} />
            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingSubcategory ? (
                <Button type="button" variant="danger" onClick={() => { handleDeleteSubcategory(editingSubcategory.id); setIsSubcategoryModalOpen(false); setEditingSubcategory(null); }}>
                  삭제
                </Button>
              ) : <div />}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={() => { setIsSubcategoryModalOpen(false); setEditingSubcategory(null); }}>취소</Button>
                <Button type="submit" isLoading={isSubmitting}>{editingSubcategory ? '수정' : '추가'}</Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Store Modal */}
        <Modal
          isOpen={isStoreModalOpen}
          onClose={handleCloseStoreModal}
          title={editingStore ? '매장 수정' : '매장 추가'}
          size="lg"
        >
          <form onSubmit={storeForm.handleSubmit(handleSaveStore)} className="space-y-4">
            {manualMode ? (
              <>
                <Input id="name" label="매장 이름" error={storeForm.formState.errors.name?.message} {...storeForm.register('name')} />
                <button type="button" onClick={() => setManualMode(false)} className="text-sm text-primary-600 hover:underline">
                  지도에서 검색하기
                </button>
              </>
            ) : (
              <>
                {!selectedPlace ? (
                  <div className="space-y-3">
                    <KakaoMap onSelectPlace={handleSelectPlace} />
                    <button type="button" onClick={() => setManualMode(true)} className="text-sm text-primary-600 hover:underline">
                      직접 입력하기
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedPlace.latitude && selectedPlace.longitude ? (
                      <>
                        <KakaoMap onSelectPlace={handleSelectPlace} initialStore={selectedPlace} />
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="font-medium text-gray-800">{selectedPlace.name}</div>
                          {selectedPlace.road_address && (
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={12} />
                              {selectedPlace.road_address}
                            </div>
                          )}
                          {selectedPlace.category && (
                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <Tag size={10} />
                              {selectedPlace.category}
                            </div>
                          )}
                        </div>
                        <Input id="name" label="매장 이름 (수정 가능)" error={storeForm.formState.errors.name?.message} {...storeForm.register('name')} />
                        <button type="button" onClick={() => setManualMode(true)} className="text-sm text-primary-600 hover:underline">
                          직접 입력하기
                        </button>
                      </>
                    ) : (
                      <>
                        <Input id="name" label="매장 이름 (수정 가능)" error={storeForm.formState.errors.name?.message} {...storeForm.register('name')} />
                        <button type="button" onClick={() => setSelectedPlace(null)} className="text-sm text-primary-600 hover:underline">
                          지도에서 검색하기
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingStore ? (
                <Button type="button" variant="danger" onClick={() => { handleDeleteStore(editingStore.id); handleCloseStoreModal(); }}>
                  삭제
                </Button>
              ) : <div />}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseStoreModal}>취소</Button>
                <Button type="submit" isLoading={isSubmitting} disabled={!manualMode && !selectedPlace}>
                  {editingStore ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* Move Category Modal */}
        <Modal
          isOpen={isMoveModalOpen}
          onClose={() => { setIsMoveModalOpen(false); setMovingStore(null); }}
          title="카테고리 이동"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{movingStore?.name}</span>을(를) 이동할 카테고리를 선택하세요.
            </p>
            <Select
              id="move-category"
              label="카테고리"
              value={moveCategoryId}
              onChange={(e) => { setMoveCategoryId(e.target.value); setMoveSubcategoryId(''); }}
              options={[
                { value: '', label: '카테고리 선택' },
                ...storeCategories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
            <Select
              id="move-subcategory"
              label="서브카테고리"
              value={moveSubcategoryId}
              onChange={(e) => setMoveSubcategoryId(e.target.value)}
              disabled={!moveCategoryId}
              options={[
                { value: '', label: '서브카테고리 선택' },
                ...(moveTargetCategory?.subcategories?.map((sub) => ({ value: sub.id, label: sub.name })) || []),
              ]}
            />
            <div className="flex justify-end -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => { setIsMoveModalOpen(false); setMovingStore(null); }}>취소</Button>
                <Button onClick={handleMoveStore} isLoading={isSubmitting} disabled={!moveCategoryId || !moveSubcategoryId}>
                  이동
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
