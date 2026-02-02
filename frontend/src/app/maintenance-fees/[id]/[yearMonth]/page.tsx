'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { useMaintenanceFees, useMaintenanceFeeRecords, useItemTemplates } from '@/hooks/useMaintenanceFees';
import type { MaintenanceFeeDetailCreate, MaintenanceFeeRecord } from '@/types';

// 금액 포맷팅
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

// 년월 포맷팅
function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${parseInt(month)}월`;
}

// 상세 항목 로컬 상태용 타입 (템플릿 정보 포함)
interface DetailWithTemplate extends MaintenanceFeeDetailCreate {
  templateName: string;
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
    updateRecord,
    bulkUpdateDetails,
  } = useMaintenanceFeeRecords(feeId);
  const {
    templates,
    isLoading: templatesLoading,
  } = useItemTemplates(feeId);

  const [record, setRecord] = useState<MaintenanceFeeRecord | null>(null);
  const [details, setDetails] = useState<DetailWithTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const currentFee = fees.find((f) => f.id === feeId);

  // 기록 로드
  useEffect(() => {
    const loadRecord = async () => {
      try {
        setIsLoading(true);
        const currentRecord = records.find((r) => r.year_month === yearMonth);
        if (currentRecord) {
          setRecord(currentRecord);

          // 기존 상세 항목이 있으면 사용 (sort_order로 정렬), 없으면 항목 템플릿에서 생성
          if (currentRecord.details && currentRecord.details.length > 0) {
            const sortedDetails = [...currentRecord.details].sort((a, b) => a.sort_order - b.sort_order);
            setDetails(
              sortedDetails.map((d) => ({
                item_template_id: d.item_template_id,
                templateName: d.item_template?.name || '알 수 없는 항목',
                amount: Number(d.amount),
                usage_amount: d.usage_amount ? Number(d.usage_amount) : undefined,
                usage_unit: d.usage_unit || undefined,
                is_vat_included: d.is_vat_included,
              }))
            );
          } else if (templates.length > 0) {
            // 항목 템플릿으로 초기 상세 항목 생성
            setDetails(
              templates.map((template) => ({
                item_template_id: template.id,
                templateName: template.name,
                amount: 0,
                is_vat_included: true,
              }))
            );
            setHasChanges(true); // 템플릿에서 생성된 경우 저장 필요
          }
        }
      } catch (error) {
        console.error('Failed to load record:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (feeId && yearMonth && records.length > 0 && !templatesLoading) {
      loadRecord();
    }
  }, [feeId, yearMonth, records, templates, templatesLoading]);

  // 총액 계산
  const totalAmount = useMemo(() => {
    return details.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [details]);

  // 항목 금액 업데이트
  const updateDetailAmount = (index: number, amount: number) => {
    setDetails((prev) => {
      const newDetails = [...prev];
      newDetails[index] = { ...newDetails[index], amount };
      return newDetails;
    });
    setHasChanges(true);
  };

  // 저장
  const handleSave = async () => {
    if (!record || isSaving) return;

    try {
      setIsSaving(true);
      const total = details.reduce((sum, item) => sum + (item.amount || 0), 0);

      // API용 데이터 (templateName 제외)
      const detailsToSave: MaintenanceFeeDetailCreate[] = details.map((d) => ({
        item_template_id: d.item_template_id,
        amount: d.amount,
        usage_amount: d.usage_amount,
        usage_unit: d.usage_unit,
        is_vat_included: d.is_vat_included,
      }));

      await bulkUpdateDetails(record.id, detailsToSave);
      await updateRecord(record.id, { total_amount: total });

      setHasChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || feesLoading || templatesLoading) {
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
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                {formatAmount(totalAmount)}원
              </h2>
              <p className="text-gray-500 mt-1">{formatYearMonth(yearMonth)} 관리비</p>
              {record?.memo && (
                <p className="text-sm text-gray-400 mt-2">{record.memo}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 상세 항목 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>상세 항목</CardTitle>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="mr-1 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {details.map((item, index) => (
                <div
                  key={item.item_template_id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 px-2 py-1">
                      {item.templateName}
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.amount ? formatAmount(item.amount) : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      updateDetailAmount(index, Number(value) || 0);
                    }}
                    className="w-32 text-right bg-white border border-gray-200 rounded px-3 py-1 font-medium"
                    placeholder="0"
                  />
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
      </div>
    </DashboardLayout>
  );
}
