'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
import { formatCurrency } from '@/lib/utils';
import type { Product } from '@/types';

const productSchema = z.object({
  category_id: z.string().min(1, '카테고리를 선택하세요'),
  subcategory_id: z.string().min(1, '서브카테고리를 선택하세요'),
  name: z.string().min(1, '상품명을 입력하세요'),
  default_price: z.string().optional(),
  memo: z.string().optional(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { products, isLoading, fetchProducts, createProduct, updateProduct, deleteProduct } =
    useProducts();
  const { categories } = useCategories();
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

  const categoryOptions = [
    { value: '', label: '카테고리 선택' },
    ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
  ];

  const subcategoryOptions = [
    { value: '', label: '서브카테고리 선택' },
    ...subcategories.map((sub) => ({ value: sub.id, label: sub.name })),
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
                  <TableHead>상품명</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>기본 가격</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-semibold">{product.name}</TableCell>
                      <TableCell>{getSubcategoryName(product.subcategory_id)}</TableCell>
                      <TableCell className="font-mono">
                        {product.default_price
                          ? formatCurrency(Number(product.default_price))
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{product.memo || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
