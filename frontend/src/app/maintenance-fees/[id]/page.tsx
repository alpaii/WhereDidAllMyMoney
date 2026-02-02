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
  TrendingUp,
  Pencil,
  Settings,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Modal } from '@/components/ui';
import { useMaintenanceFees, useMaintenanceFeeRecords, useItemTemplates } from '@/hooks/useMaintenanceFees';
import type { MaintenanceFeeRecord, MaintenanceFeeRecordCreate, MaintenanceFeeStatsByMonth, MaintenanceFeeItemTemplate } from '@/types';

const recordSchema = z.object({
  year_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '올바른 형식을 입력하세요 (YYYY-MM)'),
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
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    getStatsByMonth,
  } = useMaintenanceFeeRecords(feeId);
  const {
    templates,
    isLoading: templatesLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    updateTemplateOrder,
  } = useItemTemplates(feeId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceFeeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<MaintenanceFeeStatsByMonth[]>([]);

  // 항목관리 모달 상태
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<MaintenanceFeeItemTemplate | null>(null);
  const [editingItemName, setEditingItemName] = useState('');

  const currentFee = fees.find((f) => f.id === feeId);
  const isLoading = feesLoading || recordsLoading;

  const form = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      year_month: getCurrentYearMonth(),
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

  // 날짜 역순 정렬 (최신순)
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.year_month.localeCompare(a.year_month));
  }, [records]);

  const handleSave = async (data: RecordForm) => {
    try {
      setIsSubmitting(true);

      if (editingRecord) {
        // 수정 모드
        await updateRecord(editingRecord.id, {
          year_month: data.year_month,
          memo: data.memo || null,
        });
        handleCloseModal();
      } else {
        // 생성 모드 - 템플릿 기반으로 상세 항목이 자동 생성됨
        const recordData: MaintenanceFeeRecordCreate = {
          year_month: data.year_month,
          total_amount: 0,
          memo: data.memo || null,
        };

        await createRecord(recordData);
        handleCloseModal();
      }
    } catch (error: any) {
      console.error('Failed to save record:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert(editingRecord ? '기록 수정에 실패했습니다.' : '기록 생성에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRecord) return;
    if (!confirm('이 관리비 기록을 삭제하시겠습니까?\n모든 상세 항목도 함께 삭제됩니다.')) return;

    try {
      await deleteRecord(editingRecord.id);
      handleCloseModal();
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    form.reset({
      year_month: getCurrentYearMonth(),
      memo: '',
    });
  };

  const openCreateModal = () => {
    setEditingRecord(null);
    form.reset({
      year_month: getCurrentYearMonth(),
      memo: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: MaintenanceFeeRecord) => {
    setEditingRecord(record);
    form.reset({
      year_month: record.year_month,
      memo: record.memo || '',
    });
    setIsModalOpen(true);
  };

  // 항목관리 모달 열기
  const openItemModal = () => {
    setNewItemName('');
    setEditingTemplate(null);
    setIsItemModalOpen(true);
  };

  // 항목 추가
  const handleAddItem = async () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      alert('항목 이름을 입력하세요.');
      return;
    }
    // 중복 체크
    if (templates.some((t) => t.name === trimmedName)) {
      alert('이미 존재하는 항목 이름입니다.');
      return;
    }
    try {
      setIsSubmitting(true);
      await createTemplate({ name: trimmedName });
      setNewItemName('');
      // 템플릿 추가 시 모든 기존 records에도 상세 항목이 추가되므로 refetch
      await fetchRecords();
    } catch (error: any) {
      console.error('Failed to add item:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert('항목 추가에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 항목 삭제
  const handleDeleteItem = async (template: MaintenanceFeeItemTemplate) => {
    if (!confirm(`"${template.name}" 항목을 삭제하시겠습니까?\n이 항목을 사용하는 모든 월별 상세 항목도 함께 삭제됩니다.`)) {
      return;
    }
    try {
      setIsSubmitting(true);
      await deleteTemplate(template.id);
      // 템플릿 삭제 시 연결된 상세 항목도 삭제되므로 refetch
      await fetchRecords();
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('항목 삭제에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 항목 편집 시작
  const handleStartEditItem = (template: MaintenanceFeeItemTemplate) => {
    setEditingTemplate(template);
    setEditingItemName(template.name);
  };

  // 항목 편집 저장
  const handleSaveEditItem = async () => {
    if (!editingTemplate) return;
    const trimmedName = editingItemName.trim();
    if (!trimmedName) {
      alert('항목 이름을 입력하세요.');
      return;
    }
    // 중복 체크 (자기 자신 제외)
    if (templates.some((t) => t.id !== editingTemplate.id && t.name === trimmedName)) {
      alert('이미 존재하는 항목 이름입니다.');
      return;
    }
    try {
      setIsSubmitting(true);
      await updateTemplate(editingTemplate.id, { name: trimmedName });
      setEditingTemplate(null);
      setEditingItemName('');
    } catch (error: any) {
      console.error('Failed to update item:', error);
      if (error.response?.data?.detail) {
        alert(error.response.data.detail);
      } else {
        alert('항목 수정에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 항목 편집 취소
  const handleCancelEditItem = () => {
    setEditingTemplate(null);
    setEditingItemName('');
  };

  // 드래그 앤 드롭 상태
  const [draggedTemplate, setDraggedTemplate] = useState<MaintenanceFeeItemTemplate | null>(null);
  const [localTemplates, setLocalTemplates] = useState<MaintenanceFeeItemTemplate[]>([]);

  // 템플릿 로컬 상태 동기화
  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  // 드래그 시작
  const handleDragStart = (template: MaintenanceFeeItemTemplate) => {
    setDraggedTemplate(template);
  };

  // 드래그 오버
  const handleDragOver = (e: React.DragEvent, targetTemplate: MaintenanceFeeItemTemplate) => {
    e.preventDefault();
    if (!draggedTemplate || draggedTemplate.id === targetTemplate.id) return;

    // 로컬 상태에서 순서 변경
    setLocalTemplates((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedTemplate.id);
      const targetIndex = prev.findIndex((t) => t.id === targetTemplate.id);
      if (draggedIndex === -1 || targetIndex === -1) return prev;

      const newItems = [...prev];
      const [draggedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      return newItems;
    });
  };

  // 드래그 종료
  const handleDragEnd = async () => {
    if (!draggedTemplate) return;

    // 서버에 순서 업데이트
    const orderUpdate = localTemplates.map((t, index) => ({
      id: t.id,
      sort_order: index,
    }));

    try {
      await updateTemplateOrder(orderUpdate);
      // 템플릿 순서 변경 시 모든 상세 항목의 순서도 변경되므로 refetch
      await fetchRecords();
    } catch (error) {
      console.error('Failed to update order:', error);
      // 실패 시 원래 상태로 복원
      setLocalTemplates(templates);
    }

    setDraggedTemplate(null);
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
        <Button onClick={openItemModal} size="icon" variant="secondary" title="항목관리">
          <Settings size={20} />
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

        {/* 메모 */}
        {currentFee?.memo && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600">{currentFee.memo}</p>
            </CardContent>
          </Card>
        )}

        {/* 월별 기록 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>월별 관리비 기록</CardTitle>
            <Button size="sm" onClick={openCreateModal}>
              <Plus size={16} className="mr-1" />
              기록 추가
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                등록된 기록이 없습니다
              </div>
            ) : (
              <div className="space-y-3">
                {sortedRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <Link
                      href={`/maintenance-fees/${feeId}/${record.year_month}`}
                      className="flex items-center gap-4 flex-1"
                    >
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
                        {record.memo && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{record.memo}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          openEditModal(record);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="수정"
                      >
                        <Pencil size={18} />
                      </button>
                      <Link
                        href={`/maintenance-fees/${feeId}/${record.year_month}`}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                        title="상세보기"
                      >
                        <ChevronRight size={18} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기록 추가/수정 모달 */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingRecord ? '관리비 기록 수정' : '관리비 기록 추가'}
        >
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <Input
              id="year_month"
              label="년월"
              type="month"
              error={form.formState.errors.year_month?.message}
              {...form.register('year_month')}
            />
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

            <div className="flex justify-between -mx-6 px-6 mt-6 pt-4 border-t border-gray-200">
              {editingRecord ? (
                <Button type="button" variant="danger" onClick={handleDelete}>
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
                  {editingRecord ? '저장' : '추가'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>

        {/* 항목관리 모달 */}
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          title="항목 관리"
        >
          <div className="space-y-4">
            {/* 새 항목 추가 */}
            <div className="flex gap-2">
              <Input
                placeholder="새 항목 이름"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                className="flex-1"
                disabled={isSubmitting}
              />
              <Button onClick={handleAddItem} size="sm" disabled={isSubmitting}>
                <Plus size={16} className="mr-1" />
                추가
              </Button>
            </div>

            {/* 항목 목록 */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
              {templatesLoading ? (
                <div className="p-4 text-center text-gray-500">
                  로딩 중...
                </div>
              ) : localTemplates.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  등록된 항목이 없습니다
                </div>
              ) : (
                localTemplates.map((template) => (
                  <div
                    key={template.id}
                    draggable={!editingTemplate}
                    onDragStart={() => handleDragStart(template)}
                    onDragOver={(e) => handleDragOver(e, template)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-3 hover:bg-gray-50 ${
                      draggedTemplate?.id === template.id ? 'bg-primary-50 opacity-50' : ''
                    }`}
                  >
                    {/* 드래그 핸들 */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                      title="드래그하여 순서 변경"
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* 항목 이름 (편집 모드) */}
                    {editingTemplate?.id === template.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                              e.preventDefault();
                              handleSaveEditItem();
                            } else if (e.key === 'Escape') {
                              handleCancelEditItem();
                            }
                          }}
                          className="flex-1"
                          autoFocus
                          disabled={isSubmitting}
                        />
                        <Button size="sm" onClick={handleSaveEditItem} disabled={isSubmitting}>
                          저장
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleCancelEditItem} disabled={isSubmitting}>
                          취소
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* 항목 이름 */}
                        <span
                          className="flex-1 cursor-pointer hover:text-primary-600"
                          onClick={() => handleStartEditItem(template)}
                        >
                          {template.name}
                        </span>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => handleDeleteItem(template)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="삭제"
                          disabled={isSubmitting}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 닫기 버튼 */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>
                닫기
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
