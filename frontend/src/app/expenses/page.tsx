'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
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
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDateTime, toSeoulDateTimeLocal, getSeoulNow } from '@/lib/utils';
import type { Expense } from '@/types';

const expenseSchema = z.object({
  account_id: z.string().min(1, '계좌를 선택하세요'),
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  amount: z.string(),
  memo: z.string().optional(),
  purchase_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  expense_at: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { expenses, pages, isLoading, fetchExpenses, createExpense, updateExpense, deleteExpense } =
    useExpenses({ page, size: 10 });
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // categories에서 직접 서브카테고리 가져오기 (API 호출 없이 동기적으로)
  const selectedCategoryData = categories.find(c => c.id === selectedCategoryId);
  const subcategories = selectedCategoryData?.subcategories || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // localStorage에서 마지막 선택값 불러오기
  const [lastSelectedAccountId, setLastSelectedAccountId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSelectedAccountId');
    }
    return null;
  });
  const [lastSelectedCategoryId, setLastSelectedCategoryId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSelectedCategoryId');
    }
    return null;
  });
  const [lastSelectedSubcategoryId, setLastSelectedSubcategoryId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSelectedSubcategoryId');
    }
    return null;
  });

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

  // 천단위 콤마 포맷 함수 (음수 허용)
  const formatAmountWithComma = (value: string) => {
    const isNegative = value.startsWith('-');
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return isNegative ? '-' : '';
    const formatted = Number(numericValue).toLocaleString('ko-KR');
    return isNegative ? `-${formatted}` : formatted;
  };

  useEffect(() => {
    if (watchCategoryId && watchCategoryId !== selectedCategoryId) {
      setSelectedCategoryId(watchCategoryId);
      // 새 카테고리의 첫 번째 서브카테고리를 선택
      const selectedCategory = categories.find(c => c.id === watchCategoryId);
      const firstSubcategoryId = selectedCategory?.subcategories?.[0]?.id || '';
      setValue('subcategory_id', firstSubcategoryId);
    }
  }, [watchCategoryId, selectedCategoryId, setValue, categories]);

  // 금액 입력 시 천단위 콤마 자동 적용
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithComma(e.target.value);
    setValue('amount', formatted);
  };

  const lastPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastPageRef.current === page) return;
    lastPageRef.current = page;
    fetchExpenses({ page, size: 10 });
  }, [page, fetchExpenses]);

  const openCreateModal = () => {
    setEditingExpense(null);
    const defaultAccountId = lastSelectedAccountId || accounts[0]?.id || '';
    const defaultCategoryId = lastSelectedCategoryId || categories[0]?.id || '';
    setSelectedCategoryId(defaultCategoryId);

    // 서브카테고리는 선택된 카테고리의 서브카테고리 목록에서 찾아야 함
    const selectedCategory = categories.find(c => c.id === defaultCategoryId);
    const categorySubcategories = selectedCategory?.subcategories || [];

    // 저장된 서브카테고리가 현재 카테고리에 존재하는지 확인
    let defaultSubcategoryId = categorySubcategories[0]?.id || '';
    if (lastSelectedSubcategoryId) {
      const subcategoryExists = categorySubcategories.some(sub => sub.id === lastSelectedSubcategoryId);
      if (subcategoryExists) {
        defaultSubcategoryId = lastSelectedSubcategoryId;
      }
    }

    reset({
      account_id: defaultAccountId,
      category_id: defaultCategoryId,
      subcategory_id: defaultSubcategoryId,
      amount: '',
      memo: '',
      purchase_url: '',
      expense_at: getSeoulNow(),
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
      amount: Math.round(Number(expense.amount)).toLocaleString('ko-KR'),
      memo: expense.memo || '',
      purchase_url: expense.purchase_url || '',
      expense_at: toSeoulDateTimeLocal(expense.expense_at),
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
        amount: parseFloat(data.amount.replace(/,/g, '')) || 0,
        memo: data.memo || undefined,
        purchase_url: data.purchase_url || undefined,
        expense_at: data.expense_at || undefined,
      };

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await createExpense(expenseData);
      }
      // localStorage에 마지막 선택값 저장
      setLastSelectedAccountId(data.account_id);
      localStorage.setItem('lastSelectedAccountId', data.account_id);
      setLastSelectedCategoryId(data.category_id);
      localStorage.setItem('lastSelectedCategoryId', data.category_id);
      setLastSelectedSubcategoryId(data.subcategory_id);
      localStorage.setItem('lastSelectedSubcategoryId', data.subcategory_id);
      handleClose();
      fetchExpenses({ page, size: 10 });
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

  const accountOptions = accounts.map((acc) => ({ value: acc.id, label: acc.name }));

  const categoryOptions = categories.map((cat) => ({ value: cat.id, label: cat.name }));

  const subcategoryOptions = subcategories.map((sub) => ({ value: sub.id, label: sub.name }));

  return (
    <DashboardLayout
      title="지출 내역"
      action={
        <Button onClick={openCreateModal} size="icon" title="지출 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
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
                      <div>
                        <p className="font-medium text-gray-800">
                          {expense.category_name || '미분류'}
                          {expense.subcategory_name && (
                            <span className="text-gray-500"> &gt; {expense.subcategory_name}</span>
                          )}
                        </p>
                        <p className="text-sm text-[rgb(161,25,25)] font-mono">
                          {formatDateTime(expense.expense_at)}
                        </p>
                        <p className="text-sm text-gray-500">{expense.account_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono ${Number(expense.amount) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatCurrency(Number(expense.amount))}
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
                          className="p-1 text-red-500 hover:text-red-700"
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
                      <TableCell><span className="font-mono text-xs text-[rgb(161,25,25)]">{formatDateTime(expense.expense_at)}</span></TableCell>
                      <TableCell>
                        {expense.category_name || '미분류'}
                        {expense.subcategory_name && (
                          <span className="text-gray-500"> &gt; {expense.subcategory_name}</span>
                        )}
                      </TableCell>
                      <TableCell>{expense.account_name}</TableCell>
                      <TableCell className="max-w-xs truncate">{expense.memo || '-'}</TableCell>
                      <TableCell className={`text-right font-medium font-mono ${Number(expense.amount) < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(Number(expense.amount))}
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
                            className="p-1 text-red-500 hover:text-red-700"
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
              type="text"
              label="금액"
              placeholder="10,000"
              error={errors.amount?.message}
              {...register('amount', { onChange: handleAmountChange })}
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
