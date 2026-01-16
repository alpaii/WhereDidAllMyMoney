'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ExternalLink, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Modal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';
import { useExpenses } from '@/hooks/useExpenses';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories, useSubcategories } from '@/hooks/useCategories';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Expense } from '@/types';

const expenseSchema = z.object({
  account_id: z.string().min(1, '계좌를 선택하세요'),
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  amount: z.string().transform((val) => parseFloat(val) || 0),
  memo: z.string().optional(),
  purchase_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  expense_at: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { expenses, total, pages, isLoading, fetchExpenses, createExpense, updateExpense, deleteExpense } =
    useExpenses({ page, size: 10 });
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const { subcategories } = useSubcategories(selectedCategoryId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
  });

  const watchCategoryId = watch('category_id');

  useEffect(() => {
    if (watchCategoryId && watchCategoryId !== selectedCategoryId) {
      setSelectedCategoryId(watchCategoryId);
      setValue('subcategory_id', '');
    }
  }, [watchCategoryId, selectedCategoryId, setValue]);

  useEffect(() => {
    fetchExpenses({ page });
  }, [page, fetchExpenses]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setSelectedCategoryId(null);
    reset({
      account_id: '',
      category_id: '',
      subcategory_id: '',
      amount: '0',
      memo: '',
      purchase_url: '',
      expense_at: new Date().toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setSelectedCategoryId(expense.category_id);
    reset({
      account_id: expense.account_id,
      category_id: expense.category_id,
      subcategory_id: expense.subcategory_id,
      amount: String(expense.amount),
      memo: expense.memo || '',
      purchase_url: expense.purchase_url || '',
      expense_at: expense.expense_at.slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setSelectedCategoryId(null);
    reset();
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      setIsSubmitting(true);
      const expenseData = {
        account_id: data.account_id,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        amount: data.amount,
        memo: data.memo || undefined,
        purchase_url: data.purchase_url || undefined,
        expense_at: data.expense_at || undefined,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await createExpense(expenseData);
      }
      handleClose();
      fetchExpenses({ page });
    } catch (error) {
      console.error('Failed to save expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 지출을 삭제하시겠습니까?')) {
      try {
        await deleteExpense(id);
      } catch (error) {
        console.error('Failed to delete expense:', error);
      }
    }
  };

  const accountOptions = [
    { value: '', label: '계좌 선택' },
    ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
  ];

  const categoryOptions = [
    { value: '', label: '카테고리 선택' },
    ...categories.map((cat) => ({ value: cat.id, label: `${cat.icon || ''} ${cat.name}` })),
  ];

  const subcategoryOptions = [
    { value: '', label: '서브카테고리 선택' },
    ...subcategories.map((sub) => ({ value: sub.id, label: sub.name })),
  ];

  return (
    <DashboardLayout title="지출 내역">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600">총 {total}건의 지출 내역</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setFilterOpen(!filterOpen)}>
              <Filter size={18} />
              필터
            </Button>
            <Button onClick={openCreateModal}>
              <Plus size={18} />
              지출 추가
            </Button>
          </div>
        </div>

        {/* Expense list - Mobile */}
        <div className="lg:hidden space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : expenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                등록된 지출이 없습니다
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                        {expense.category?.icon || '💰'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {expense.subcategory?.name || expense.category?.name || '미분류'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(expense.expense_at)}
                        </p>
                        <p className="text-sm text-gray-500">{expense.account?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        -{formatCurrency(Number(expense.amount))}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        {expense.purchase_url && (
                          <a
                            href={expense.purchase_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-500 hover:text-primary-600"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {expense.memo && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {expense.memo}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Expense list - Desktop */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>계좌</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      등록된 지출이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDateTime(expense.expense_at)}</TableCell>
                      <TableCell>
                        <span className="mr-2">{expense.category?.icon || '💰'}</span>
                        {expense.subcategory?.name || expense.category?.name || '미분류'}
                      </TableCell>
                      <TableCell>{expense.account?.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.memo || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        -{formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {expense.purchase_url && (
                            <a
                              href={expense.purchase_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-500 hover:text-primary-600"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-1 text-gray-500 hover:text-primary-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              이전
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600">
              {page} / {pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              다음
            </Button>
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleClose}
          title={editingExpense ? '지출 수정' : '지출 추가'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              id="account_id"
              label="계좌"
              options={accountOptions}
              error={errors.account_id?.message}
              {...register('account_id')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="category_id"
                label="카테고리"
                options={categoryOptions}
                error={errors.category_id?.message}
                {...register('category_id')}
              />

              <Select
                id="subcategory_id"
                label="서브카테고리"
                options={subcategoryOptions}
                error={errors.subcategory_id?.message}
                disabled={!selectedCategoryId}
                {...register('subcategory_id')}
              />
            </div>

            <Input
              id="amount"
              type="number"
              label="금액"
              placeholder="0"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Input
              id="expense_at"
              type="datetime-local"
              label="지출 일시"
              error={errors.expense_at?.message}
              {...register('expense_at')}
            />

            <Input
              id="memo"
              label="메모 (선택)"
              placeholder="예: 점심 식사"
              error={errors.memo?.message}
              {...register('memo')}
            />

            <Input
              id="purchase_url"
              label="구매 URL (선택)"
              placeholder="https://..."
              error={errors.purchase_url?.message}
              {...register('purchase_url')}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingExpense ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
