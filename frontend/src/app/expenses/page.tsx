'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, ExternalLink, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import {
  Card,
  CardContent,
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
import { useCategories, useProducts } from '@/hooks/useCategories';
import { formatCurrency, formatDateTime, toSeoulDateTimeLocal, getSeoulNow } from '@/lib/utils';
import type { Expense } from '@/types';

const expenseSchema = z.object({
  account_id: z.string().min(1, '계좌를 선택하세요'),
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  product_id: z.string().optional(),
  amount: z.string(),
  memo: z.string().optional(),
  purchase_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  expense_at: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

// 로컬 날짜를 YYYY-MM-DD 형식으로 포맷 (컴포넌트 외부)
const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 날짜 프리셋 계산 함수 (컴포넌트 외부)
const getDateRange = (preset: string) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfWeek = today.getDay();

  switch (preset) {
    case 'this_week': {
      // 월요일(1)부터 일요일(0)까지
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(year, month, today.getDate() + diffToMonday);
      const endOfWeek = new Date(year, month, today.getDate() + diffToMonday + 6);
      return {
        start: formatLocalDate(startOfWeek),
        end: formatLocalDate(endOfWeek),
      };
    }
    case 'this_month': {
      return {
        start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        end: `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`,
      };
    }
    case 'this_year': {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    }
    default:
      return { start: '', end: '' };
  }
};

const PAGE_SIZE = 100;

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { expenses, total, pages, isLoading, fetchExpenses, createExpense, updateExpense, deleteExpense } =
    useExpenses({ page, size: PAGE_SIZE });
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { products } = useProducts();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // 필터 상태
  const [filterDatePreset, setFilterDatePreset] = useState<string>('this_month');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('');
  const [filterProductId, setFilterProductId] = useState<string>('');

  // 클라이언트에서 초기 날짜 설정 (SSR 시간대 문제 방지)
  useEffect(() => {
    const range = getDateRange('this_month');
    setFilterStartDate(range.start);
    setFilterEndDate(range.end);
  }, []);

  // 날짜 프리셋 변경 핸들러
  const handleDatePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value;
    setFilterDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setFilterStartDate(range.start);
      setFilterEndDate(range.end);
    }
  };

  // 필터용 서브카테고리
  const filterCategoryData = categories.find(c => c.id === filterCategoryId);
  const filterSubcategories = filterCategoryData?.subcategories || [];

  // 필터용 상품 목록
  const filterProductsForSubcategory = filterSubcategoryId
    ? products.filter(p => p.subcategory_id === filterSubcategoryId)
    : [];

  // 클라이언트 측 필터링 (서브카테고리, 상품)
  const filteredExpenses = expenses.filter(expense => {
    if (filterSubcategoryId && expense.subcategory_id !== filterSubcategoryId) {
      return false;
    }
    if (filterProductId && expense.product_id !== filterProductId) {
      return false;
    }
    return true;
  });

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
  const watchSubcategoryId = watch('subcategory_id');

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
      setValue('product_id', '');
    }
  }, [watchCategoryId, selectedCategoryId, setValue, categories]);

  // 서브카테고리 변경 시 상품 선택 초기화
  useEffect(() => {
    if (watchSubcategoryId !== selectedSubcategoryId) {
      setSelectedSubcategoryId(watchSubcategoryId || null);
      setValue('product_id', '');
    }
  }, [watchSubcategoryId, selectedSubcategoryId, setValue]);

  // 선택된 서브카테고리의 상품 목록
  const filteredProducts = products.filter(p => p.subcategory_id === selectedSubcategoryId);

  // 상품 선택 시 가격 및 계좌 자동 입력
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product?.default_price) {
        const formatted = Math.round(product.default_price).toLocaleString('ko-KR');
        setValue('amount', formatted);
      }
      if (product?.default_account_id) {
        setValue('account_id', product.default_account_id);
      }
    }
  };

  // 금액 입력 시 천단위 콤마 자동 적용
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithComma(e.target.value);
    setValue('amount', formatted);
  };


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

    setSelectedSubcategoryId(defaultSubcategoryId);
    reset({
      account_id: defaultAccountId,
      category_id: defaultCategoryId,
      subcategory_id: defaultSubcategoryId,
      product_id: '',
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
    setSelectedSubcategoryId(expense.subcategory_id);
    reset({
      account_id: expense.account_id,
      category_id: expense.category_id,
      subcategory_id: expense.subcategory_id,
      product_id: expense.product_id || '',
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
    setSelectedSubcategoryId(null);
    reset();
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      setIsSubmitting(true);
      const expenseData = {
        account_id: data.account_id,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        product_id: data.product_id || null,
        amount: parseFloat(data.amount.replace(/,/g, '')) || 0,
        memo: data.memo || null,
        purchase_url: data.purchase_url || null,
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
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined });
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

  const handleCopy = async (expense: Expense) => {
    try {
      await createExpense({
        account_id: expense.account_id,
        category_id: expense.category_id,
        subcategory_id: expense.subcategory_id,
        product_id: expense.product_id || null,
        amount: Number(expense.amount),
        memo: expense.memo || null,
        purchase_url: expense.purchase_url || null,
        expense_at: getSeoulNow(),
      });
      fetchExpenses();
    } catch (error) {
      console.error('Failed to copy expense:', error);
    }
  };

  const accountOptions = accounts.map((acc) => ({ value: acc.id, label: acc.name }));

  const categoryOptions = categories.map((cat) => ({ value: cat.id, label: cat.name }));

  // 계좌 배지 렌더링 함수
  const renderAccountBadge = (accountId: string, accountName?: string) => {
    const account = accounts.find(a => a.id === accountId);
    const name = accountName || account?.name || '알 수 없음';
    const badgeColor = account?.badge_color;

    if (badgeColor) {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {name}
        </span>
      );
    }
    return <span className="text-sm text-gray-500">{name}</span>;
  };

  const subcategoryOptions = subcategories.map((sub) => ({ value: sub.id, label: sub.name }));

  // 상품 메모와 지출 메모를 결합하여 반환
  const getCombinedMemo = (expense: Expense) => {
    const product = expense.product_id ? products.find(p => p.id === expense.product_id) : null;
    const productMemo = product?.memo;
    const expenseMemo = expense.memo;

    if (productMemo && expenseMemo) {
      return { productMemo, expenseMemo };
    }
    if (productMemo) {
      return { productMemo, expenseMemo: null };
    }
    if (expenseMemo) {
      return { productMemo: null, expenseMemo };
    }
    return { productMemo: null, expenseMemo: null };
  };

  const productOptions = [
    { value: '', label: '상품 선택 (선택사항)' },
    ...filteredProducts.map((product) => ({
      value: product.id,
      label: product.default_price
        ? `${product.name} (${Math.round(product.default_price).toLocaleString('ko-KR')}원)`
        : product.name,
    })),
  ];

  // 필터용 옵션
  const filterCategoryOptions = [
    { value: '', label: '전체 카테고리' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const filterSubcategoryOptions = [
    { value: '', label: '전체 서브카테고리' },
    ...filterSubcategories.map((sub) => ({ value: sub.id, label: sub.name })),
  ];

  const filterProductOptions = [
    { value: '', label: '전체 상품' },
    ...filterProductsForSubcategory.map((product) => ({ value: product.id, label: product.name })),
  ];

  const handleFilterCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCategoryId(e.target.value);
    setFilterSubcategoryId('');
    setFilterProductId('');
  };

  const handleFilterSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterSubcategoryId(e.target.value);
    setFilterProductId('');
  };

  // 필터 변경 시 데이터 다시 불러오기 (날짜가 설정된 후에만)
  useEffect(() => {
    if (!filterStartDate || !filterEndDate) return;
    fetchExpenses({
      page,
      size: PAGE_SIZE,
      startDate: filterStartDate,
      endDate: filterEndDate,
      categoryId: filterCategoryId || undefined,
    });
  }, [page, filterStartDate, filterEndDate, filterCategoryId, fetchExpenses]);

  return (
    <DashboardLayout
      title="지출 내역"
      action={
        <Button onClick={openCreateModal} size="icon" title="지출 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter */}
        <Card>
          <CardContent className="py-3 space-y-3">
            {/* 날짜 필터 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                id="filter-date-preset"
                label="기간"
                options={[
                  { value: 'this_week', label: '이번 주' },
                  { value: 'this_month', label: '이번 달' },
                  { value: 'this_year', label: '이번 년도' },
                  { value: 'custom', label: '직접 설정' },
                ]}
                value={filterDatePreset}
                onChange={handleDatePresetChange}
              />
              <Input
                id="filter-start-date"
                type="date"
                label="시작일"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setFilterDatePreset('custom');
                }}
              />
              <Input
                id="filter-end-date"
                type="date"
                label="종료일"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setFilterDatePreset('custom');
                }}
              />
            </div>
            {/* 카테고리/상품 필터 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                id="filter-category"
                label="카테고리"
                options={filterCategoryOptions}
                value={filterCategoryId}
                onChange={handleFilterCategoryChange}
              />
              <Select
                id="filter-subcategory"
                label="서브카테고리"
                options={filterSubcategoryOptions}
                value={filterSubcategoryId}
                onChange={handleFilterSubcategoryChange}
                disabled={!filterCategoryId}
              />
              <Select
                id="filter-product"
                label="상품"
                options={filterProductOptions}
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
                disabled={!filterSubcategoryId}
              />
            </div>
          </CardContent>
        </Card>

        {/* 합계 금액 */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600">
                합계 ({filteredExpenses.length}건) / 전체 {total}건
              </span>
              <span className="text-lg font-bold font-mono">
                {formatCurrency(filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pagination - Top */}
        {pages > 1 && (
          <Card>
            <CardContent className="py-2">
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  처음
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={20} />
                </Button>
                <span className="px-4 py-2 text-sm font-medium text-gray-700">
                  {page} / {pages}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                >
                  <ChevronRight size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(pages)}
                  disabled={page === pages}
                >
                  마지막
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expense list - Mobile */}
        <div className="lg:hidden space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {expenses.length === 0 ? '등록된 지출이 없습니다' : '검색 결과가 없습니다'}
              </CardContent>
            </Card>
          ) : (
            filteredExpenses.map((expense) => (
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
                        {expense.product_name && (
                          <p className="text-sm text-gray-800 font-semibold">{expense.product_name}</p>
                        )}
                        <p className="text-sm text-[rgb(161,25,25)] font-mono">
                          {formatDateTime(expense.expense_at)}
                        </p>
                        <div className="mt-1">{renderAccountBadge(expense.account_id, expense.account_name)}</div>
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
                          onClick={() => handleCopy(expense)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                          title="복사"
                        >
                          <Copy size={16} />
                        </button>
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
                  {(() => {
                    const { productMemo, expenseMemo } = getCombinedMemo(expense);
                    if (productMemo || expenseMemo) {
                      return (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded whitespace-pre-line">
                          {productMemo && expenseMemo
                            ? <>{productMemo}<br />{expenseMemo}</>
                            : productMemo || expenseMemo}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Expense list - Desktop */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/12">날짜</TableHead>
                  <TableHead className="w-1/12">계좌</TableHead>
                  <TableHead className="w-1/12">카테고리</TableHead>
                  <TableHead className="w-1/12 text-right">금액</TableHead>
                  <TableHead className="w-3/12">상품</TableHead>
                  <TableHead className="w-3/12">메모</TableHead>
                  <TableHead className="w-1/12 text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {expenses.length === 0 ? '등록된 지출이 없습니다' : '검색 결과가 없습니다'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell><span className="font-mono text-xs text-[rgb(161,25,25)]">{formatDateTime(expense.expense_at)}</span></TableCell>
                      <TableCell className="break-words">{renderAccountBadge(expense.account_id, expense.account_name)}</TableCell>
                      <TableCell className="break-words">
                        {expense.category_name || '미분류'}
                        {expense.subcategory_name && (
                          <span className="text-gray-500"> &gt; {expense.subcategory_name}</span>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium font-mono ${Number(expense.amount) < 0 ? 'text-red-600' : ''}`}>
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell className="text-gray-800 font-semibold break-words">{expense.product_name || '-'}</TableCell>
                      <TableCell className="break-words whitespace-pre-line">
                        {(() => {
                          const { productMemo, expenseMemo } = getCombinedMemo(expense);
                          if (productMemo && expenseMemo) {
                            return <>{productMemo}<br />{expenseMemo}</>;
                          }
                          return productMemo || expenseMemo || '-';
                        })()}
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
                            onClick={() => handleCopy(expense)}
                            className="p-1 text-gray-500 hover:text-primary-600"
                            title="복사"
                          >
                            <Copy size={16} />
                          </button>
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

            {filteredProducts.length > 0 && (
              <Select
                id="product_id"
                label="상품 (선택사항)"
                options={productOptions}
                {...register('product_id', { onChange: handleProductChange })}
              />
            )}

            <Input
              id="amount"
              type="text"
              label="금액"
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
