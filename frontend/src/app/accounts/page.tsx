'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, GripVertical, Check } from 'lucide-react';
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
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  Modal,
  Badge,
} from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, getAccountTypeLabel, getAccountTypeColor } from '@/lib/utils';
import type { Account, AccountType } from '@/types';

const accountSchema = z.object({
  name: z.string().min(1, '계좌명을 입력하세요'),
  account_type: z.enum(['bank', 'credit_card', 'prepaid', 'other']),
  balance: z.string(),
  description: z.string().optional(),
  badge_color: z.string().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const accountTypeOptions = [
  { value: 'bank', label: '은행계좌' },
  { value: 'credit_card', label: '신용카드' },
  { value: 'prepaid', label: '선불/포인트' },
  { value: 'other', label: '기타' },
];

// 배지 색상 팔레트
const badgeColors = [
  { value: '#6B7280', label: '회색' },
  { value: '#EF4444', label: '빨강' },
  { value: '#F97316', label: '주황' },
  { value: '#EAB308', label: '노랑' },
  { value: '#22C55E', label: '초록' },
  { value: '#14B8A6', label: '청록' },
  { value: '#3B82F6', label: '파랑' },
  { value: '#8B5CF6', label: '보라' },
  { value: '#EC4899', label: '핑크' },
  { value: '#78716C', label: '갈색' },
];

// 천단위 콤마 포맷 함수
const formatAmountWithComma = (value: string) => {
  // 숫자와 마이너스 기호만 허용
  const numericValue = value.replace(/[^0-9-]/g, '');
  if (!numericValue || numericValue === '-') return numericValue;
  const num = parseInt(numericValue, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
};

function SortableAccountItem({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800">{account.name}</p>
            {account.badge_color ? (
              <span
                className="px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: account.badge_color }}
              >
                {getAccountTypeLabel(account.account_type)}
              </span>
            ) : (
              <Badge className={getAccountTypeColor(account.account_type)}>
                {getAccountTypeLabel(account.account_type)}
              </Badge>
            )}
          </div>
          {account.description && (
            <p className="text-sm text-gray-500 mt-1">{account.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4">
        <p className={`text-xl font-bold ${Number(account.balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
          {formatCurrency(Number(account.balance))}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(account)}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, updateAccountOrder } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      account_type: 'bank',
      balance: '',
      description: '',
      badge_color: '#6B7280',
    },
  });

  const selectedBadgeColor = watch('badge_color');

  // 잔액 입력 시 천단위 콤마 자동 적용
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithComma(e.target.value);
    setValue('balance', formatted);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = accounts.findIndex((acc) => acc.id === active.id);
      const newIndex = accounts.findIndex((acc) => acc.id === over.id);
      const newAccounts = arrayMove(accounts, oldIndex, newIndex);
      const orderUpdate = newAccounts.map((acc, index) => ({
        id: acc.id,
        sort_order: index,
      }));

      try {
        await updateAccountOrder(orderUpdate);
      } catch (error) {
        console.error('Failed to update account order:', error);
      }
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    reset({
      name: '',
      account_type: 'bank',
      balance: '',
      description: '',
      badge_color: '#6B7280',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      account_type: account.account_type as AccountType,
      balance: Math.round(Number(account.balance)).toLocaleString('ko-KR'),
      description: account.description || '',
      badge_color: account.badge_color || '#6B7280',
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    reset();
  };

  const onSubmit = async (data: AccountForm) => {
    try {
      setIsSubmitting(true);
      const balance = parseInt(data.balance.replace(/,/g, ''), 10) || 0;
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: data.name,
          account_type: data.account_type,
          balance,
          description: data.description,
          badge_color: data.badge_color,
        });
      } else {
        await createAccount({
          name: data.name,
          account_type: data.account_type,
          balance,
          description: data.description,
          badge_color: data.badge_color,
        });
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 계좌를 삭제하시겠습니까?')) {
      try {
        await deleteAccount(id);
      } catch (error) {
        console.error('Failed to delete account:', error);
      }
    }
  };

  return (
    <DashboardLayout
      title="계좌 관리"
      action={
        <Button onClick={openCreateModal} size="icon" title="계좌 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Accounts list */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">등록된 계좌가 없습니다</p>
                <Button onClick={openCreateModal} className="mt-4">
                  첫 번째 계좌 추가하기
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={accounts.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {accounts.map((account) => (
                      <SortableAccountItem
                        key={account.id}
                        account={account}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
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
          onClose={handleClose}
          title={editingAccount ? '계좌 수정' : '계좌 추가'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="name"
              label="계좌명"
              error={errors.name?.message}
              {...register('name')}
            />

            <Select
              id="account_type"
              label="계좌 유형"
              options={accountTypeOptions}
              error={errors.account_type?.message}
              {...register('account_type')}
            />

            <Input
              id="balance"
              type="text"
              label="잔액"
              error={errors.balance?.message}
              {...register('balance', { onChange: handleBalanceChange })}
            />

            <Input
              id="description"
              label="설명 (선택)"
              error={errors.description?.message}
              {...register('description')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배지 색상
              </label>
              <div className="flex flex-wrap gap-2">
                {badgeColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setValue('badge_color', color.value)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      selectedBadgeColor === color.value
                        ? 'border-gray-800 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  >
                    {selectedBadgeColor === color.value && (
                      <Check size={16} className="text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingAccount ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
