'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Check,
  Clock,
  Zap,
  Droplets,
  Flame,
  Building,
  Shield,
  Sparkles,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Modal } from '@/components/ui';
import { useMaintenanceFees, useMaintenanceFeeRecords } from '@/hooks/useMaintenanceFees';
import type { MaintenanceFeeDetailCreate, MaintenanceFeeRecord } from '@/types';

// 카테고리별 아이콘
const categoryIcons: Record<string, React.ReactNode> = {
  '관리비': <Building size={16} />,
  '에너지': <Zap size={16} />,
  '수도': <Droplets size={16} />,
  '난방': <Flame size={16} />,
  '기타': <Sparkles size={16} />,
};

// 기본 항목 템플릿
const defaultItems: MaintenanceFeeDetailCreate[] = [
  { category: '관리비', item_name: '일반관리비', amount: 0, is_vat_included: true },
  { category: '관리비', item_name: '청소비', amount: 0, is_vat_included: true },
  { category: '관리비', item_name: '경비비', amount: 0, is_vat_included: true },
  { category: '관리비', item_name: '수선유지비', amount: 0, is_vat_included: true },
  { category: '관리비', item_name: '승강기유지비', amount: 0, is_vat_included: true },
  { category: '에너지', item_name: '기본전기료', amount: 0, is_vat_included: true },
  { category: '에너지', item_name: '세대전기료', amount: 0, usage_amount: 0, usage_unit: 'kWh', is_vat_included: true },
  { category: '에너지', item_name: '기본냉난방비', amount: 0, is_vat_included: true },
  { category: '에너지', item_name: '공동냉난방비', amount: 0, is_vat_included: true },
  { category: '수도', item_name: '수도료', amount: 0, usage_amount: 0, usage_unit: '㎥', is_vat_included: true },
  { category: '기타', item_name: '장기수선충당금', amount: 0, is_vat_included: false },
  { category: '기타', item_name: '건물화재보험료', amount: 0, is_vat_included: false },
];

// 금액 포맷팅
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// 년월 포맷팅
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

export default function MaintenanceFeeRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const feeId = params.id as string;
  const yearMonth = params.yearMonth as string;

  const { fees, isLoading: feesLoading } = useMaintenanceFees();
  const {
    records,
    isLoading: recordsLoading,
    getRecord,
    updateRecord,
    deleteRecord,
    bulkUpdateDetails,
  } = useMaintenanceFeeRecords(feeId);

  const [record, setRecord] = useState<MaintenanceFeeRecord | null>(null);
  const [details, setDetails] = useState<MaintenanceFeeDetailCreate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<MaintenanceFeeDetailCreate>({
    category: '관리비',
    item_name: '',
    amount: 0,
    is_vat_included: true,
  });

  const currentFee = fees.find((f) => f.id === feeId);

  // 기록 로드
  useEffect(() => {
    const loadRecord = async () => {
      try {
        setIsLoading(true);
        const currentRecord = records.find((r) => r.year_month === yearMonth);
        if (currentRecord) {
          setRecord(currentRecord);
          if (currentRecord.details && currentRecord.details.length > 0) {
            setDetails(
              currentRecord.details.map((d) => ({
                category: d.category,
                item_name: d.item_name,
                amount: Number(d.amount),
                usage_amount: d.usage_amount ? Number(d.usage_amount) : undefined,
                usage_unit: d.usage_unit || undefined,
                is_vat_included: d.is_vat_included,
              }))
            );
          } else {
            // 기본 템플릿 사용
            setDetails([...defaultItems]);
          }
        }
      } catch (error) {
        console.error('Failed to load record:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (feeId && yearMonth && records.length > 0) {
      loadRecord();
    }
  }, [feeId, yearMonth, records]);

  // 총액 계산
  const totalAmount = useMemo(() => {
    return details.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [details]);

  // 카테고리별 그룹핑
  const groupedDetails = useMemo(() => {
    const groups: Record<string, MaintenanceFeeDetailCreate[]> = {};
    details.forEach((item, index) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push({ ...item, _index: index } as any);
    });
    return groups;
  }, [details]);

  // 항목 업데이트
  const updateDetail = (index: number, field: keyof MaintenanceFeeDetailCreate, value: any) => {
    setDetails((prev) => {
      const newDetails = [...prev];
      newDetails[index] = { ...newDetails[index], [field]: value };
      return newDetails;
    });
    setHasChanges(true);
  };

  // 항목 삭제
  const removeDetail = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // 항목 추가
  const addDetail = () => {
    if (!newItem.item_name.trim()) {
      alert('항목 이름을 입력하세요.');
      return;
    }
    setDetails((prev) => [...prev, { ...newItem }]);
    setNewItem({
      category: '관리비',
      item_name: '',
      amount: 0,
      is_vat_included: true,
    });
    setIsAddItemModalOpen(false);
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    if (!record) return;

    try {
      setIsSaving(true);

      // 상세 항목 저장
      await bulkUpdateDetails(record.id, details);

      // 납부 상태 업데이트
      await updateRecord(record.id, {
        total_amount: totalAmount,
      });

      setHasChanges(false);
      alert('저장되었습니다.');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제
  const handleDelete = async () => {
    if (!record) return;

    try {
      await deleteRecord(record.id);
      router.push(`/maintenance-fees/${feeId}`);
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 납부 상태 토글
  const togglePaidStatus = async () => {
    if (!record) return;

    try {
      const updated = await updateRecord(record.id, {
        is_paid: !record.is_paid,
        paid_date: !record.is_paid ? new Date().toISOString().split('T')[0] : null,
      });
      setRecord(updated);
    } catch (error) {
      console.error('Failed to update paid status:', error);
    }
  };

  if (isLoading || feesLoading) {
    return (
      <DashboardLayout title="관리비 상세">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!record) {
    return (
      <DashboardLayout title="관리비 상세">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">기록을 찾을 수 없습니다.</p>
          <Link href={`/maintenance-fees/${feeId}`}>
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
      title={`${currentFee?.name || '관리비'} - ${formatYearMonth(yearMonth)}`}
      action={
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            size="icon"
            title="저장"
          >
            <Save size={20} />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 뒤로가기 */}
        <Link
          href={`/maintenance-fees/${feeId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} className="mr-1" />
          월별 기록으로
        </Link>

        {/* 요약 카드 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">
                  {formatAmount(totalAmount)}원
                </h2>
                <p className="text-gray-500 mt-1">{formatYearMonth(yearMonth)} 관리비</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={record.is_paid ? 'primary' : 'secondary'}
                  onClick={togglePaidStatus}
                >
                  {record.is_paid ? (
                    <>
                      <Check size={18} className="mr-1" />
                      납부완료
                    </>
                  ) : (
                    <>
                      <Clock size={18} className="mr-1" />
                      미납
                    </>
                  )}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상세 항목 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>상세 항목</CardTitle>
            <Button size="sm" onClick={() => setIsAddItemModalOpen(true)}>
              <Plus size={16} className="mr-1" />
              항목 추가
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(groupedDetails).map(([category, items]) => (
                <div key={category}>
                  <h3 className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-3">
                    {categoryIcons[category] || <Sparkles size={16} />}
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item: any) => (
                      <div
                        key={item._index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => updateDetail(item._index, 'item_name', e.target.value)}
                            className="w-full bg-transparent font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                          />
                        </div>
                        {item.usage_unit && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <input
                              type="number"
                              value={item.usage_amount || ''}
                              onChange={(e) => updateDetail(item._index, 'usage_amount', Number(e.target.value) || null)}
                              className="w-16 text-right bg-white border border-gray-200 rounded px-2 py-1"
                              placeholder="0"
                            />
                            <span>{item.usage_unit}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={item.amount || ''}
                            onChange={(e) => updateDetail(item._index, 'amount', Number(e.target.value) || 0)}
                            className="w-28 text-right bg-white border border-gray-200 rounded px-2 py-1 font-medium"
                            placeholder="0"
                          />
                          <span className="text-gray-500">원</span>
                        </div>
                        <button
                          onClick={() => removeDetail(item._index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {details.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  등록된 항목이 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 저장 버튼 (모바일) */}
        {hasChanges && (
          <div className="fixed bottom-4 left-0 right-0 px-4 md:hidden">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
              isLoading={isSaving}
            >
              <Save size={18} className="mr-1" />
              저장
            </Button>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="기록 삭제"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              {formatYearMonth(yearMonth)} 관리비 기록을 삭제하시겠습니까?
              <br />
              삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
                취소
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                삭제
              </Button>
            </div>
          </div>
        </Modal>

        {/* 항목 추가 모달 */}
        <Modal
          isOpen={isAddItemModalOpen}
          onClose={() => setIsAddItemModalOpen(false)}
          title="항목 추가"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="관리비">관리비</option>
                <option value="에너지">에너지</option>
                <option value="수도">수도</option>
                <option value="난방">난방</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <Input
              label="항목 이름"
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              placeholder="예: 일반관리비"
            />
            <Input
              label="금액"
              type="number"
              value={newItem.amount || ''}
              onChange={(e) => setNewItem({ ...newItem, amount: Number(e.target.value) || 0 })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="사용량 (선택)"
                type="number"
                value={newItem.usage_amount || ''}
                onChange={(e) => setNewItem({ ...newItem, usage_amount: Number(e.target.value) || undefined })}
              />
              <Input
                label="단위 (선택)"
                value={newItem.usage_unit || ''}
                onChange={(e) => setNewItem({ ...newItem, usage_unit: e.target.value || undefined })}
                placeholder="kWh, ㎥"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_vat_included"
                checked={newItem.is_vat_included}
                onChange={(e) => setNewItem({ ...newItem, is_vat_included: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="is_vat_included" className="text-sm text-gray-700">
                부가세 포함
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsAddItemModalOpen(false)}>
                취소
              </Button>
              <Button onClick={addDetail}>
                추가
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
