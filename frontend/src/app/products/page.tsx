'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Star, ShoppingCart } from 'lucide-react';
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
import { useProducts, useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { useExpenses } from '@/hooks/useExpenses';
import { formatCurrency, getSeoulNow } from '@/lib/utils';
import type { Product } from '@/types';

const productSchema = z.object({
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  name: z.string().min(1, '상품명을 입력하세요'),
  default_price: z.string().optional(),
  default_account_id: z.string().min(1, '계좌를 선택하세요'),
  memo: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const router = useRouter();
  const { products, isLoading, fetchProducts, createProduct, updateProduct, deleteProduct, toggleFavorite } =
    useProducts();
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { createExpense } = useExpenses();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 필터 상태
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [filterSubcategoryId, setFilterSubcategoryId] = useState<string>('');

  // categories에서 직접 서브카테고리 가져오기 (API 호출 없이 동기적으로)
  const selectedCategoryData = categories.find(c => c.id === selectedCategoryId);
  const subcategories = selectedCategoryData?.subcategories || [];

  // 필터용 서브카테고리
  const filterCategoryData = categories.find(c => c.id === filterCategoryId);
  const filterSubcategories = filterCategoryData?.subcategories || [];

  // 필터링된 상품 목록
  const filteredProducts = products.filter(product => {
    if (filterSubcategoryId) {
      return product.subcategory_id === filterSubcategoryId;
    }
    if (filterCategoryId) {
      const category = categories.find(c => c.id === filterCategoryId);
      const subcategoryIds = category?.subcategories?.map(s => s.id) || [];
      return subcategoryIds.includes(product.subcategory_id);
    }
    return true;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
  });

  const watchCategoryId = watch('category_id');

  // 천단위 콤마 포맷 함수
  const formatAmountWithComma = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('ko-KR');
  };

  useEffect(() => {
    if (watchCategoryId && watchCategoryId !== selectedCategoryId) {
      setSelectedCategoryId(watchCategoryId);
      setValue('subcategory_id', '');
    }
  }, [watchCategoryId, selectedCategoryId, setValue]);

  // 금액 입력 시 천단위 콤마 자동 적용
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithComma(e.target.value);
    setValue('default_price', formatted);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setSelectedCategoryId(null);
    reset({
      category_id: '',
      subcategory_id: '',
      name: '',
      default_price: '',
      default_account_id: '',
      memo: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    // Find category_id from subcategory
    const category = categories.find(cat =>
      cat.subcategories?.some(sub => sub.id === product.subcategory_id)
    );
    const categoryId = category?.id || '';
    setSelectedCategoryId(categoryId);

    reset({
      category_id: categoryId,
      subcategory_id: product.subcategory_id,
      name: product.name,
      default_price: product.default_price
        ? Math.round(Number(product.default_price)).toLocaleString('ko-KR')
        : '',
      default_account_id: product.default_account_id || '',
      memo: product.memo || '',
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSelectedCategoryId(null);
    reset();
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      setIsSubmitting(true);
      const productData = {
        subcategory_id: data.subcategory_id,
        name: data.name,
        default_price: data.default_price
          ? parseFloat(data.default_price.replace(/,/g, ''))
          : null,
        default_account_id: data.default_account_id,
        memo: data.memo || null,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
      } else {
        await createProduct(productData);
      }
      handleClose();
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 상품을 삭제하시겠습니까?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  // 상품에서 바로 지출 추가
  const handleQuickAddExpense = async (product: Product) => {
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
      await createExpense({
        account_id: product.default_account_id,
        category_id: category.id,
        subcategory_id: product.subcategory_id,
        product_id: product.id,
        amount: Number(product.default_price),
        expense_at: getSeoulNow(),
      });
      router.push('/expenses');
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('지출 추가에 실패했습니다.');
    }
  };

  const categoryOptions = [
    { value: '', label: '카테고리 선택' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const subcategoryOptions = [
    { value: '', label: '서브카테고리 선택' },
    ...subcategories.map((sub) => ({ value: sub.id, label: sub.name })),
  ];

  const accountOptions = [
    { value: '', label: '계좌 선택' },
    ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
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

  const handleFilterCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterCategoryId(e.target.value);
    setFilterSubcategoryId('');
  };

  // Get category/subcategory name for display
  const getSubcategoryName = (subcategoryId: string) => {
    for (const category of categories) {
      const sub = category.subcategories?.find(s => s.id === subcategoryId);
      if (sub) {
        return `${category.name} > ${sub.name}`;
      }
    }
    return '미분류';
  };

  // 계좌 배지 렌더링 함수
  const renderAccountBadge = (accountId: string | undefined) => {
    if (!accountId) return <span className="text-gray-400">-</span>;
    const account = accounts.find(a => a.id === accountId);
    if (!account) return <span className="text-gray-400">-</span>;

    if (account.badge_color) {
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium text-white"
          style={{ backgroundColor: account.badge_color }}
        >
          {account.name}
        </span>
      );
    }
    return <span className="text-sm text-gray-500">{account.name}</span>;
  };

  return (
    <DashboardLayout
      title="상품 관리"
      action={
        <Button onClick={openCreateModal} size="icon" title="상품 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter */}
        <Card>
          <CardContent className="py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                id="filter-category"
                options={filterCategoryOptions}
                value={filterCategoryId}
                onChange={handleFilterCategoryChange}
              />
              <Select
                id="filter-subcategory"
                options={filterSubcategoryOptions}
                value={filterSubcategoryId}
                onChange={(e) => setFilterSubcategoryId(e.target.value)}
                disabled={!filterCategoryId}
              />
            </div>
          </CardContent>
        </Card>

        {/* Product list - Mobile */}
        <div className="lg:hidden space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                {products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
              </CardContent>
            </Card>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className="p-1"
                      >
                        <Star
                          size={20}
                          className={product.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      </button>
                      <div>
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {getSubcategoryName(product.subcategory_id)}
                        </p>
                        {product.default_price && (
                          <p className="text-sm text-primary-600 font-medium font-mono">
                            {formatCurrency(Number(product.default_price))}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickAddExpense(product)}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="지출 추가"
                      >
                        <ShoppingCart size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="p-1 text-gray-500 hover:text-primary-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {product.memo && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {product.memo}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Product list - Desktop */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/12">★</TableHead>
                  <TableHead className="w-1/12">계좌</TableHead>
                  <TableHead className="w-1/12">카테고리</TableHead>
                  <TableHead className="w-1/12 text-right">가격</TableHead>
                  <TableHead className="w-3/12">상품명</TableHead>
                  <TableHead className="w-4/12">메모</TableHead>
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
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <button
                          onClick={() => toggleFavorite(product.id)}
                          className="p-1"
                        >
                          <Star
                            size={18}
                            className={product.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-400'}
                          />
                        </button>
                      </TableCell>
                      <TableCell>{renderAccountBadge(product.default_account_id)}</TableCell>
                      <TableCell className="break-words whitespace-normal">{getSubcategoryName(product.subcategory_id)}</TableCell>
                      <TableCell className="font-mono text-right">
                        {product.default_price
                          ? formatCurrency(Number(product.default_price))
                          : '-'}
                      </TableCell>
                      <TableCell className="font-semibold break-words whitespace-normal">{product.name}</TableCell>
                      <TableCell className="break-words whitespace-normal">{product.memo || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleQuickAddExpense(product)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="지출 추가"
                          >
                            <ShoppingCart size={16} />
                          </button>
                          <button
                            onClick={() => openEditModal(product)}
                            className="p-1 text-gray-500 hover:text-primary-600"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
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
          title={editingProduct ? '상품 수정' : '상품 추가'}
          size="lg"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              id="default_account_id"
              label="계좌"
              options={accountOptions}
              error={errors.default_account_id?.message}
              {...register('default_account_id')}
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
              id="name"
              label="상품명"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              id="default_price"
              type="text"
              label="기본 가격 (선택)"
              error={errors.default_price?.message}
              {...register('default_price', { onChange: handlePriceChange })}
            />

            <Input
              id="memo"
              label="메모 (선택)"
              error={errors.memo?.message}
              {...register('memo')}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingProduct ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
