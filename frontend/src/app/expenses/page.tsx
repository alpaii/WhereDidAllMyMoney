'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, ExternalLink, Copy, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Camera, X, LayoutGrid } from 'lucide-react';
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
import { useStores } from '@/hooks/useStores';
import { formatCurrency, formatDateTime, toSeoulDateTimeLocal, getSeoulNow, formatAmountWithComma, getDateRange, formatLocalDate } from '@/lib/utils';
import type { Expense, ExpensePhoto } from '@/types';

const expenseSchema = z.object({
  account_id: z.string().min(1, '계좌를 선택하세요'),
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  product_id: z.string().min(1, '상품을 선택하세요'),
  amount: z.string(),
  memo: z.string().optional(),
  store_id: z.string().optional(),
  purchase_url: z.string().url('올바른 URL을 입력하세요').optional().or(z.literal('')),
  expense_at: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const PAGE_SIZE = 100;

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const { expenses, total, pages, isLoading, fetchExpenses, createExpense, updateExpense, deleteExpense, uploadPhoto, deletePhoto } =
    useExpenses({ page, size: PAGE_SIZE });
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const { products } = useProducts();
  const { stores } = useStores();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // 필터 상태
  const [filterDatePreset, setFilterDatePreset] = useState<string>('this_month');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('');
  const [filterProductId, setFilterProductId] = useState<string>('');
  const [filterAccountId, setFilterAccountId] = useState<string>('');
  const [filterStoreId, setFilterStoreId] = useState<string>('');

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
  const [modalSatisfaction, setModalSatisfaction] = useState<boolean | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 계층형 지출 추가 모달 상태
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddStep, setQuickAddStep] = useState<'category' | 'subcategory' | 'product'>('category');
  const [quickAddCategoryId, setQuickAddCategoryId] = useState<string | null>(null);
  const [quickAddSubcategoryId, setQuickAddSubcategoryId] = useState<string | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // 라이트박스 상태
  const [lightboxPhotos, setLightboxPhotos] = useState<ExpensePhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const openLightbox = (photos: ExpensePhoto[], index: number) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxPhotos([]);
    setLightboxIndex(0);
  };

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

  // 편집 중인 지출의 사진 목록 동기화
  useEffect(() => {
    if (editingExpense) {
      const updatedExpense = expenses.find(e => e.id === editingExpense.id);
      if (updatedExpense && updatedExpense.photos !== editingExpense.photos) {
        setEditingExpense(updatedExpense);
      }
    }
  }, [expenses, editingExpense]);

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
    setModalSatisfaction(null);
    reset({
      account_id: defaultAccountId,
      category_id: defaultCategoryId,
      subcategory_id: defaultSubcategoryId,
      product_id: '',
      amount: '',
      memo: '',
      store_id: '',
      purchase_url: '',
      expense_at: getSeoulNow(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setSelectedCategoryId(expense.category_id);
    setSelectedSubcategoryId(expense.subcategory_id);
    setModalSatisfaction(expense.satisfaction ?? null);
    reset({
      account_id: expense.account_id,
      category_id: expense.category_id,
      subcategory_id: expense.subcategory_id,
      product_id: expense.product_id || '',
      amount: Math.round(Number(expense.amount)).toLocaleString('ko-KR'),
      memo: expense.memo || '',
      store_id: expense.store_id || '',
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
    setModalSatisfaction(null);
    reset();
  };

  const onSubmit = async (data: ExpenseForm) => {
    try {
      setIsSubmitting(true);
      const expenseData = {
        account_id: data.account_id,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        product_id: data.product_id,
        store_id: data.store_id || null,
        amount: parseFloat(data.amount.replace(/,/g, '')) || 0,
        memo: data.memo || null,
        purchase_url: data.purchase_url || null,
        satisfaction: modalSatisfaction,
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
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined, accountId: filterAccountId || undefined, storeId: filterStoreId || undefined });
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
    if (!expense.product_id) {
      alert('상품 정보가 없는 지출은 복사할 수 없습니다.');
      return;
    }
    try {
      await createExpense({
        account_id: expense.account_id,
        category_id: expense.category_id,
        subcategory_id: expense.subcategory_id,
        product_id: expense.product_id,
        store_id: expense.store_id || null,
        amount: Number(expense.amount),
        memo: expense.memo || null,
        purchase_url: expense.purchase_url || null,
        expense_at: getSeoulNow(),
      });
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined, accountId: filterAccountId || undefined, storeId: filterStoreId || undefined });
    } catch (error) {
      console.error('Failed to copy expense:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingExpense || !e.target.files?.length) return;

    const file = e.target.files[0];
    try {
      setIsUploadingPhoto(true);
      await uploadPhoto(editingExpense.id, file);
      // Refresh expenses to get updated photos
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined, accountId: filterAccountId || undefined, storeId: filterStoreId || undefined });
    } catch (error) {
      console.error('Failed to upload photo:', error);
      alert('사진 업로드에 실패했습니다.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!editingExpense) return;
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    try {
      await deletePhoto(editingExpense.id, photoId);
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined, accountId: filterAccountId || undefined, storeId: filterStoreId || undefined });
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('사진 삭제에 실패했습니다.');
    }
  };

  // Get photo URL from file path
  const getPhotoUrl = (filePath: string) => {
    // Backend serves files from /uploads
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '';
    return `${apiBaseUrl}/${filePath}`;
  };

  // 계층형 지출 추가 모달 핸들러
  const openQuickAddModal = () => {
    setQuickAddStep('category');
    setQuickAddCategoryId(null);
    setQuickAddSubcategoryId(null);
    setIsQuickAddModalOpen(true);
  };

  const closeQuickAddModal = () => {
    setIsQuickAddModalOpen(false);
    setQuickAddStep('category');
    setQuickAddCategoryId(null);
    setQuickAddSubcategoryId(null);
  };

  const handleQuickAddBack = () => {
    if (quickAddStep === 'product') {
      setQuickAddStep('subcategory');
      setQuickAddSubcategoryId(null);
    } else if (quickAddStep === 'subcategory') {
      setQuickAddStep('category');
      setQuickAddCategoryId(null);
    }
  };

  const handleQuickAddCategorySelect = (categoryId: string) => {
    setQuickAddCategoryId(categoryId);
    setQuickAddStep('subcategory');
  };

  const handleQuickAddSubcategorySelect = (subcategoryId: string) => {
    setQuickAddSubcategoryId(subcategoryId);
    setQuickAddStep('product');
  };

  const handleQuickAddProductSelect = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (!product.default_account_id) {
      alert('계좌가 설정되지 않은 상품입니다.');
      return;
    }
    if (!product.default_price) {
      alert('가격이 설정되지 않은 상품입니다.');
      return;
    }

    // 카테고리 ID 찾기
    const category = categories.find(cat =>
      cat.subcategories?.some(sub => sub.id === product.subcategory_id)
    );
    if (!category) {
      alert('카테고리 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsQuickAdding(true);
      await createExpense({
        account_id: product.default_account_id,
        category_id: category.id,
        subcategory_id: product.subcategory_id,
        product_id: product.id,
        amount: Number(product.default_price),
        expense_at: getSeoulNow(),
      });
      closeQuickAddModal();
      fetchExpenses({ page, size: PAGE_SIZE, startDate: filterStartDate, endDate: filterEndDate, categoryId: filterCategoryId || undefined, accountId: filterAccountId || undefined, storeId: filterStoreId || undefined });
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('지출 추가에 실패했습니다.');
    } finally {
      setIsQuickAdding(false);
    }
  };

  // 모바일 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    // 오른쪽으로 50px 이상 스와이프하면 뒤로가기
    if (diff > 50 && quickAddStep !== 'category') {
      handleQuickAddBack();
    }
    setTouchStartX(null);
  };

  // 계층형 모달에서 사용할 데이터
  const quickAddCategory = quickAddCategoryId ? categories.find(c => c.id === quickAddCategoryId) : null;
  const quickAddSubcategories = quickAddCategory?.subcategories || [];
  const quickAddProducts = quickAddSubcategoryId ? products.filter(p => p.subcategory_id === quickAddSubcategoryId) : [];

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
    { value: '', label: '상품 선택' },
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
      accountId: filterAccountId || undefined,
      storeId: filterStoreId || undefined,
    });
  }, [page, filterStartDate, filterEndDate, filterCategoryId, filterAccountId, filterStoreId, fetchExpenses]);

  return (
    <DashboardLayout
      title="지출 내역"
      action={
        <div className="flex gap-2">
          <Button onClick={openQuickAddModal} size="icon" variant="secondary" title="빠른 지출 추가">
            <LayoutGrid size={20} />
          </Button>
          <Button onClick={openCreateModal} size="icon" title="지출 추가">
            <Plus size={20} />
          </Button>
        </div>
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
            {/* 계좌/매장 필터 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                id="filter-account"
                label="계좌"
                options={[
                  { value: '', label: '전체 계좌' },
                  ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
                ]}
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
              />
              <Select
                id="filter-store"
                label="매장"
                options={[
                  { value: '', label: '전체 매장' },
                  ...stores.map((store) => ({ value: store.id, label: store.name })),
                ]}
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
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
                      {/* Thumbnail */}
                      {expense.photos && expense.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openLightbox(expense.photos!, 0)}
                          className="relative flex-shrink-0"
                        >
                          <img
                            src={getPhotoUrl(expense.photos[0].thumbnail_path || expense.photos[0].file_path)}
                            alt="지출 사진"
                            className="w-12 h-12 object-cover rounded-lg border border-gray-400 hover:opacity-80 transition-opacity"
                          />
                          {expense.photos.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1 rounded">
                              +{expense.photos.length - 1}
                            </span>
                          )}
                        </button>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">
                          {expense.category_name || '미분류'}
                          {expense.subcategory_name && (
                            <span className="text-gray-500"> &gt; {expense.subcategory_name}</span>
                          )}
                        </p>
                        {expense.product_name && (
                          <p className="text-sm text-gray-800 font-semibold flex items-center gap-1">
                            {expense.satisfaction === true && <ThumbsUp size={14} className="text-green-600" />}
                            {expense.satisfaction === false && <ThumbsDown size={14} className="text-red-600" />}
                            {expense.product_name}
                          </p>
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
                      <TableCell className="text-gray-800 font-semibold break-words">
                        <div>
                          <span className="flex items-center gap-1">
                            {expense.satisfaction === true && <ThumbsUp size={14} className="text-green-600 flex-shrink-0" />}
                            {expense.satisfaction === false && <ThumbsDown size={14} className="text-red-600 flex-shrink-0" />}
                            {expense.product_name || '-'}
                          </span>
                          {expense.photos && expense.photos.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {expense.photos.map((photo, idx) => (
                                <button
                                  key={photo.id}
                                  type="button"
                                  onClick={() => openLightbox(expense.photos!, idx)}
                                >
                                  <img
                                    src={getPhotoUrl(photo.thumbnail_path || photo.file_path)}
                                    alt="지출 사진"
                                    className="w-8 h-8 object-cover rounded border border-gray-400 hover:opacity-80 transition-opacity"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
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
            <Input
              id="expense_at"
              type="datetime-local"
              label="지출 일시"
              error={errors.expense_at?.message}
              {...register('expense_at')}
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

            <Select
              id="product_id"
              label="상품"
              options={productOptions}
              error={errors.product_id?.message}
              disabled={!selectedSubcategoryId || filteredProducts.length === 0}
              {...register('product_id', { onChange: handleProductChange })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="amount"
                type="text"
                label="금액"
                error={errors.amount?.message}
                {...register('amount', { onChange: handleAmountChange })}
              />

              <Select
                id="account_id"
                label="계좌"
                options={accountOptions}
                error={errors.account_id?.message}
                {...register('account_id')}
              />
            </div>

            <Input
              id="memo"
              label="메모 (선택)"
              error={errors.memo?.message}
              {...register('memo')}
            />

            <Select
              id="store_id"
              label="매장 (선택)"
              options={[
                { value: '', label: '매장 선택' },
                ...stores.map((store) => ({ value: store.id, label: store.name })),
              ]}
              error={errors.store_id?.message}
              {...register('store_id')}
            />

            <Input
              id="purchase_url"
              label="구매 URL (선택)"
              placeholder="https://..."
              error={errors.purchase_url?.message}
              {...register('purchase_url')}
            />

            {/* Photo upload section - only for editing */}
            {editingExpense && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진
                </label>
                <div className="flex flex-wrap gap-2">
                  {/* Existing photos */}
                  {editingExpense.photos?.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={getPhotoUrl(photo.thumbnail_path || photo.file_path)}
                        alt="지출 사진"
                        className="w-20 h-20 object-cover rounded-lg border border-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => handlePhotoDelete(photo.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isUploadingPhoto ? (
                      <span className="text-xs text-gray-500">업로드 중...</span>
                    ) : (
                      <>
                        <Camera size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">추가</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingExpense ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingExpense.id);
                    handleClose();
                  }}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModalSatisfaction(modalSatisfaction === true ? null : true)}
                    className={`p-2 rounded-lg border ${
                      modalSatisfaction === true
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-400 hover:border-green-400 hover:text-green-600'
                    }`}
                    title="만족"
                  >
                    <ThumbsUp size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSatisfaction(modalSatisfaction === false ? null : false)}
                    className={`p-2 rounded-lg border ${
                      modalSatisfaction === false
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-400 hover:border-red-400 hover:text-red-600'
                    }`}
                    title="불만족"
                  >
                    <ThumbsDown size={20} />
                  </button>
                </div>
                <Button type="button" variant="secondary" onClick={handleClose}>
                  취소
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {editingExpense ? '수정' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* 계층형 지출 추가 모달 */}
        <Modal
          isOpen={isQuickAddModalOpen}
          onClose={closeQuickAddModal}
          title={
            quickAddStep === 'category' ? '카테고리 선택' :
            quickAddStep === 'subcategory' ? (quickAddCategory?.name || '서브카테고리 선택') :
            '상품 선택'
          }
          size="lg"
        >
          <div
            className="min-h-[300px]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* 뒤로가기 버튼 */}
            {quickAddStep !== 'category' && (
              <button
                onClick={handleQuickAddBack}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
              >
                <ChevronLeft size={20} />
                <span>뒤로</span>
              </button>
            )}

            {/* 카테고리 목록 */}
            {quickAddStep === 'category' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleQuickAddCategorySelect(category.id)}
                    className="p-4 text-center bg-gray-50 hover:bg-primary-50 hover:border-primary-300 border border-gray-200 rounded-lg transition-colors"
                  >
                    <span className="font-medium text-gray-800">{category.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 서브카테고리 목록 */}
            {quickAddStep === 'subcategory' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {quickAddSubcategories.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    onClick={() => handleQuickAddSubcategorySelect(subcategory.id)}
                    className="p-4 text-center bg-gray-50 hover:bg-primary-50 hover:border-primary-300 border border-gray-200 rounded-lg transition-colors"
                  >
                    <span className="font-medium text-gray-800">{subcategory.name}</span>
                  </button>
                ))}
                {quickAddSubcategories.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    서브카테고리가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 상품 목록 */}
            {quickAddStep === 'product' && (
              <div className="space-y-2">
                {quickAddProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleQuickAddProductSelect(product.id)}
                    disabled={isQuickAdding || !product.default_account_id || !product.default_price}
                    className={`w-full p-4 text-left border rounded-lg transition-colors flex items-center justify-between ${
                      !product.default_account_id || !product.default_price
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-50 hover:bg-green-50 hover:border-green-300 border-gray-200'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-gray-800">{product.name}</span>
                      {product.memo && (
                        <p className="text-sm text-gray-500 mt-1">{product.memo}</p>
                      )}
                      {(!product.default_account_id || !product.default_price) && (
                        <p className="text-xs text-red-400 mt-1">
                          {!product.default_account_id && '계좌 미설정'}
                          {!product.default_account_id && !product.default_price && ' / '}
                          {!product.default_price && '가격 미설정'}
                        </p>
                      )}
                    </div>
                    {product.default_price && (
                      <span className="font-mono font-medium text-primary-600">
                        {formatCurrency(Number(product.default_price))}
                      </span>
                    )}
                  </button>
                ))}
                {quickAddProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    등록된 상품이 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 취소 버튼 */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={closeQuickAddModal} className="w-full">
                취소
              </Button>
            </div>
          </div>
        </Modal>

      </div>

      {/* Lightbox - rendered via Portal to document.body */}
      {isLightboxOpen && lightboxPhotos.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 z-10"
          >
            <X size={32} />
          </button>

          {/* Previous button */}
          {lightboxPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : lightboxPhotos.length - 1));
              }}
              className="absolute left-4 p-2 text-white hover:text-gray-300 z-10"
            >
              <ChevronLeft size={40} />
            </button>
          )}

          {/* Image */}
          <img
            src={getPhotoUrl(lightboxPhotos[lightboxIndex].file_path)}
            alt="지출 사진"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next button */}
          {lightboxPhotos.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((prev) => (prev < lightboxPhotos.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 p-2 text-white hover:text-gray-300 z-10"
            >
              <ChevronRight size={40} />
            </button>
          )}

          {/* Counter */}
          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </div>
          )}
        </div>,
        document.body
      )}
    </DashboardLayout>
  );
}
