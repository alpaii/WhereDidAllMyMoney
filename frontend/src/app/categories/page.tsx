'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types';

function CategoryItem({ category }: { category: Category }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => hasSubcategories && setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
        disabled={!hasSubcategories}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon || '📦'}</span>
          <span className="font-medium text-gray-800">{category.name}</span>
          {hasSubcategories && (
            <span className="text-sm text-gray-500">
              ({category.subcategories?.length}개)
            </span>
          )}
        </div>
        {hasSubcategories && (
          isOpen ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />
        )}
      </button>
      {isOpen && hasSubcategories && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {category.subcategories?.map((sub) => (
              <div
                key={sub.id}
                className="px-3 py-2 bg-white rounded-lg text-sm text-gray-700 shadow-sm"
              >
                {sub.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesPage() {
  const { categories, isLoading } = useCategories();

  return (
    <DashboardLayout title="카테고리">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag size={20} />
              카테고리 목록
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                등록된 카테고리가 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <CategoryItem key={category.id} category={category} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
