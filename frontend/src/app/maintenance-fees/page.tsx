'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Plus, GripVertical, Pencil, Building2, MapPin, ChevronRight } from 'lucide-react';
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
import { useMaintenanceFees } from '@/hooks/useMaintenanceFees';
import type { MaintenanceFee, MaintenanceFeeCreate } from '@/types';

const feeSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  address: z.string().optional(),
  memo: z.string().optional(),
});

type FeeForm = z.infer<typeof feeSchema>;

function SortableFeeItem({
  fee,
  onEdit,
}: {
  fee: MaintenanceFee;
  onEdit: (fee: MaintenanceFee) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fee.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
        <Link href={`/maintenance-fees/${fee.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary-600 flex-shrink-0" />
            <span className="font-medium text-gray-800">{fee.name}</span>
            {!fee.is_active && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">비활성</span>
            )}
          </div>
          {fee.address && (
            <span className="text-sm text-gray-500 flex items-center gap-1 mt-1 ml-7">
              <MapPin size={14} className="flex-shrink-0" />
              <span className="truncate">{fee.address}</span>
            </span>
          )}
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            onEdit(fee);
          }}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="수정"
        >
          <Pencil size={18} />
        </button>
        <Link
          href={`/maintenance-fees/${fee.id}`}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
          title="상세보기"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
    </div>
  );
}

export default function MaintenanceFeesPage() {
  const {
    fees,
    isLoading,
    createFee,
    updateFee,
    deleteFee,
    updateFeeOrder,
  } = useMaintenanceFees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<MaintenanceFee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<FeeForm>({
    resolver: zodResolver(feeSchema),
  });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fees.findIndex((fee) => fee.id === active.id);
      const newIndex = fees.findIndex((fee) => fee.id === over.id);

      const newOrder = arrayMove(fees, oldIndex, newIndex);
      const orderUpdate = newOrder.map((fee, index) => ({
        id: fee.id,
        sort_order: index,
      }));

      try {
        await updateFeeOrder(orderUpdate);
      } catch (error) {
        console.error('Failed to update fee order:', error);
      }
    }
  };

  const handleSave = async (data: FeeForm) => {
    try {
      setIsSubmitting(true);
      const feeData: MaintenanceFeeCreate = {
        name: data.name,
        address: data.address || null,
        memo: data.memo || null,
      };

      if (editingFee) {
        await updateFee(editingFee.id, feeData);
      } else {
        await createFee(feeData);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save fee:', error);
      alert(editingFee ? '수정에 실패했습니다.' : '생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFee(null);
    form.reset();
  };

  const openCreateModal = () => {
    setEditingFee(null);
    form.reset({ name: '', address: '', memo: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (fee: MaintenanceFee) => {
    setEditingFee(fee);
    form.reset({
      name: fee.name,
      address: fee.address || '',
      memo: fee.memo || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 관리비 장소를 삭제하시겠습니까?\n모든 관리비 기록도 함께 삭제됩니다.')) {
      try {
        await deleteFee(id);
        handleCloseModal();
      } catch (error) {
        console.error('Failed to delete fee:', error);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  return (
    <DashboardLayout
      title="관리비"
      action={
        <Button onClick={openCreateModal} size="icon" title="장소 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : fees.length === 0 ? (
              <div className="text-center py-12">
                <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">등록된 관리비 장소가 없습니다</p>
                <Button onClick={openCreateModal}>
                  <Plus size={18} className="mr-1" />
                  장소 추가
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fees.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {fees.map((fee) => (
                      <SortableFeeItem
                        key={fee.id}
                        fee={fee}
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
          onClose={handleCloseModal}
          title={editingFee ? '관리비 장소 수정' : '관리비 장소 추가'}
        >
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <Input
              id="name"
              label="이름"
              placeholder="예: 집, 사무실"
              error={form.formState.errors.name?.message}
              {...form.register('name')}
            />
            <Input
              id="address"
              label="주소 (선택)"
              placeholder="예: 서울시 강남구..."
              error={form.formState.errors.address?.message}
              {...form.register('address')}
            />
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
                메모 (선택)
              </label>
              <textarea
                id="memo"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="추가 정보를 입력하세요"
                {...form.register('memo')}
              />
            </div>

            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingFee ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete(editingFee.id)}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                  취소
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingFee ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
