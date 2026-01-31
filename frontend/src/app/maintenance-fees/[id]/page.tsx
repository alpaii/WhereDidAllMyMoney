'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Check,
  Clock,
  TrendingUp,
  Zap,
  Droplets,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Modal } from '@/components/ui';
import { useMaintenanceFees, useMaintenanceFeeRecords } from '@/hooks/useMaintenanceFees';
import type { MaintenanceFeeRecord, MaintenanceFeeRecordCreate, MaintenanceFeeStatsByMonth } from '@/types';

const recordSchema = z.object({
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '올바른 형식을 입력하세요 (YYYY-MM)'),
  total_amount: z.coerce.number().min(0, '금액은 0 이상이어야 합니다'),
  due_date: z.string().optional(),
  is_paid: z.boolean().default(false),
  memo: z.string().optional(),
});

type RecordForm = z.infer<typeof recordSchema>;

// 현재 년월 가져오기
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 년월 포맷팅
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

// 금액 포맷팅
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export default function MaintenanceFeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const feeId = params.id as string;

  const { fees, isLoading: feesLoading } = useMaintenanceFees();
  const {
    records,
    isLoading: recordsLoading,
    createRecord,
    deleteRecord,
    getStatsByMonth,
  } = useMaintenanceFeeRecords(feeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<MaintenanceFeeStatsByMonth[]>([]);

  const currentFee = fees.find((f) => f.id === feeId);
  const isLoading = feesLoading || recordsLoading;

  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      year_month: getCurrentYearMonth(),
      total_amount: 0,
      is_paid: false,
    },
  });

  // 통계 로드
  useEffect(() => {
    if (feeId) {
      getStatsByMonth().then(setMonthlyStats).catch(console.error);
    }
  }, [feeId, records]);

  // 최근 6개월 평균
  const averageAmount = useMemo(() => {
    if (monthlyStats.length === 0) return 0;
    const recent = monthlyStats.slice(-6);
    const sum = recent.reduce((acc, stat) => acc + Number(stat.total_amount), 0);
    return sum / recent.length;
  }, [monthlyStats]);

  // 전월 대비 증감
  const monthlyChange = useMemo(() => {
    if (records.length < 2) return null;
    const sorted = [...records].sort((a, b) => b.year_month.localeCompare(a.year_month));
    const current = Number(sorted[0].total_amount);
    const previous = Number(sorted[1].total_amount);
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  }, [records]);

  const handleSave = async (data: RecordForm) => {
    try {
      setIsSubmitting(true);
      const recordData: MaintenanceFeeRecordCreate = {
        year_month: data.year_month,
        total_amount: data.total_amount,
        due_date: data.due_date || null,
        is_paid: data.is_paid,
        memo: data.memo || null,
        details: [],
      };

      const newRecord = await createRecord(recordData);
      handleCloseModal();
      // 새 기록의 상세 페이지로 이동
      router.push(`/maintenance-fees/${feeId}/${newRecord.year_month}`);
    } catch (error: any) {
      console.error('Failed to create record:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert('기록 생성에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    form.reset({
      year_month: getCurrentYearMonth(),
      total_amount: 0,
      is_paid: false,
    });
  };

  const openCreateModal = () => {
    form.reset({
      year_month: getCurrentYearMonth(),
      total_amount: 0,
      is_paid: false,
    });
    setIsModalOpen(true);
  };

  if (!feesLoading && !currentFee) {
    return (
      <DashboardLayout title="관리비">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">관리비 장소를 찾을 수 없습니다.</p>
          <Link href="/maintenance-fees">
            <Button variant="secondary">
              <ArrowLeft size={18} className="mr-1" />
              목록으로
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={currentFee?.name || '관리비'}
      action={
        <Button onClick={openCreateModal} size="icon" title="기록 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 뒤로가기 */}
        <Link
          href="/maintenance-fees"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} className="mr-1" />
          목록으로
        </Link>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <TrendingUp size={20} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">6개월 평균</p>
                  <p className="text-lg font-semibold">
                    {formatAmount(Math.round(averageAmount))}원
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">이번 달</p>
                  <p className="text-lg font-semibold">
                    {records.length > 0
                      ? `${formatAmount(Number(records[0].total_amount))}원`
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${monthlyChange && monthlyChange > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <TrendingUp
                    size={20}
                    className={monthlyChange && monthlyChange > 0 ? 'text-red-600' : 'text-green-600'}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-500">전월 대비</p>
                  <p className={`text-lg font-semibold ${monthlyChange && monthlyChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {monthlyChange !== null
                      ? `${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 월별 기록 목록 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 관리비 기록</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">등록된 관리비 기록이 없습니다</p>
                <Button onClick={openCreateModal}>
                  <Plus size={18} className="mr-1" />
                  기록 추가
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <Link
                    key={record.id}
                    href={`/maintenance-fees/${feeId}/${record.year_month}`}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-gray-800">
                          {parseInt(record.year_month.split('-')[1])}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.year_month.split('-')[0]}년
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">
                          {formatAmount(Number(record.total_amount))}원
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {record.is_paid ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                              <Check size={12} />
                              납부완료
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                              <Clock size={12} />
                              미납
                            </span>
                          )}
                          {record.details && record.details.length > 0 && (
                            <span className="text-xs text-gray-400">
                              {record.details.length}개 항목
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기록 추가 모달 */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title="관리비 기록 추가"
        >
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <Input
              id="year_month"
              label="년월"
              type="month"
              error={form.formState.errors.year_month?.message}
              {...form.register('year_month')}
            />
            <Input
              id="total_amount"
              label="총 금액"
              type="number"
              error={form.formState.errors.total_amount?.message}
              {...form.register('total_amount')}
            />
            <Input
              id="due_date"
              label="납부 기한 (선택)"
              type="date"
              {...form.register('due_date')}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_paid"
                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                {...form.register('is_paid')}
              />
              <label htmlFor="is_paid" className="text-sm text-gray-700">
                납부 완료
              </label>
            </div>
            <div>
              <label htmlFor="memo" className="block text-sm font-medium text-gray-700 mb-1">
                메모 (선택)
              </label>
              <textarea
                id="memo"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...form.register('memo')}
              />
            </div>

            <div className="flex justify-end gap-3 -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                추가
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
