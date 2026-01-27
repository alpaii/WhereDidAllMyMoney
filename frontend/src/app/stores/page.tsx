'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, GripVertical, Pencil } from 'lucide-react';
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
import { useStores } from '@/hooks/useStores';
import type { Store } from '@/types';

const storeSchema = z.object({
  name: z.string().min(1, '매장 이름을 입력하세요'),
});

type StoreForm = z.infer<typeof storeSchema>;

function SortableStoreItem({
  store,
  onEdit,
}: {
  store: Store;
  onEdit: (store: Store) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: store.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
        <span className="font-medium text-gray-800">{store.name}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(store)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="이름 변경"
        >
          <Pencil size={18} />
        </button>
      </div>
    </div>
  );
}

export default function StoresPage() {
  const {
    stores,
    isLoading,
    createStore,
    updateStore,
    deleteStore,
    updateStoreOrder,
  } = useStores();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stores.findIndex((store) => store.id === active.id);
      const newIndex = stores.findIndex((store) => store.id === over.id);

      const newOrder = arrayMove(stores, oldIndex, newIndex);
      const orderUpdate = newOrder.map((store, index) => ({
        id: store.id,
        sort_order: index,
      }));

      try {
        await updateStoreOrder(orderUpdate);
      } catch (error) {
        console.error('Failed to update store order:', error);
      }
    }
  };

  const handleSave = async (data: StoreForm) => {
    try {
      setIsSubmitting(true);
      if (editingStore) {
        await updateStore(editingStore.id, { name: data.name });
      } else {
        await createStore({ name: data.name });
      }
      setIsModalOpen(false);
      setEditingStore(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save store:', error);
      alert(editingStore ? '매장 수정에 실패했습니다.' : '매장 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    form.reset({ name: store.name });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 매장을 삭제하시겠습니까?')) {
      try {
        await deleteStore(id);
      } catch (error) {
        console.error('Failed to delete store:', error);
        alert('매장 삭제에 실패했습니다.');
      }
    }
  };

  return (
    <DashboardLayout
      title="매장 관리"
      action={
        <Button
          onClick={() => {
            setEditingStore(null);
            form.reset({ name: '' });
            setIsModalOpen(true);
          }}
          size="icon"
          title="매장 추가"
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
            ) : stores.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                등록된 매장이 없습니다
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={stores.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {stores.map((store) => (
                      <SortableStoreItem
                        key={store.id}
                        store={store}
                        onEdit={openEditModal}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingStore(null);
          }}
          title={editingStore ? '매장 수정' : '매장 추가'}
        >
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <Input
              id="name"
              label="매장 이름"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <div className="flex justify-between mt-6">
              {editingStore ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingStore.id);
                    setIsModalOpen(false);
                    setEditingStore(null);
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
                    setIsModalOpen(false);
                    setEditingStore(null);
                  }}
                >
                  취소
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingStore ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
