'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowRight, Pencil } from 'lucide-react';
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
import { useAccounts } from '@/hooks/useAccounts';
import api from '@/lib/api';
import { formatCurrency, formatDateTime, getSeoulNow, toSeoulDateTimeLocal, formatAmountWithComma } from '@/lib/utils';
import type { Transfer, TransferCreate } from '@/types';

const transferSchema = z.object({
  from_account_id: z.string().min(1, '출금 계좌를 선택하세요'),
  to_account_id: z.string().min(1, '입금 계좌를 선택하세요'),
  amount: z.string(),
  memo: z.string().optional(),
  transferred_at: z.string().optional(),
}).refine((data) => data.from_account_id !== data.to_account_id, {
  message: '출금 계좌와 입금 계좌가 같을 수 없습니다',
  path: ['to_account_id'],
});

type TransferForm = z.infer<typeof transferSchema>;

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAccounts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
  });

  // 금액 입력 시 천단위 콤마 자동 적용
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithComma(e.target.value);
    setValue('amount', formatted);
  };

  const fetchTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      // Backend returns array directly, not paginated response
      const response = await api.get<Transfer[]>('/transfers/');
      const data = Array.isArray(response.data) ? response.data : [];
      setTransfers(data);
      setPages(1);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
      setTransfers([]);
      setPages(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const lastPageRef = useRef<number | null>(null);

  useEffect(() => {
    if (lastPageRef.current === page) return;
    lastPageRef.current = page;
    fetchTransfers();
  }, [page]);

  const openCreateModal = () => {
    setEditingTransfer(null);
    reset({
      from_account_id: '',
      to_account_id: '',
      amount: '0',
      memo: '',
      transferred_at: getSeoulNow(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    reset({
      from_account_id: transfer.from_account_id,
      to_account_id: transfer.to_account_id,
      amount: Math.round(Number(transfer.amount)).toLocaleString('ko-KR'),
      memo: transfer.memo || '',
      transferred_at: toSeoulDateTimeLocal(transfer.transferred_at),
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingTransfer(null);
    reset();
  };

  const onSubmit = async (data: TransferForm) => {
    try {
      setIsSubmitting(true);
      const transferData: TransferCreate = {
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        amount: parseFloat(data.amount.replace(/,/g, '')) || 0,
        memo: data.memo || undefined,
        transferred_at: data.transferred_at || undefined,
      };

      if (editingTransfer) {
        await api.patch(`/transfers/${editingTransfer.id}`, transferData);
      } else {
        await api.post('/transfers/', transferData);
      }
      handleClose();
      fetchTransfers();
    } catch (error) {
      console.error('Failed to save transfer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 이체 내역을 삭제하시겠습니까?')) {
      try {
        await api.delete(`/transfers/${id}`);
        fetchTransfers();
      } catch (error) {
        console.error('Failed to delete transfer:', error);
      }
    }
  };

  const accountOptions = [
    { value: '', label: '계좌 선택' },
    ...accounts.map((acc) => ({ value: acc.id, label: `${acc.name} (${formatCurrency(Number(acc.balance))})` })),
  ];

  // 계좌 배지 렌더링 함수
  const renderAccountBadge = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    const name = account?.name || '알 수 없음';
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
    return (
      <span className="px-2 py-1 bg-gray-100 rounded text-sm">
        {name}
      </span>
    );
  };

  return (
    <DashboardLayout
      title="이체 내역"
      action={
        <Button onClick={openCreateModal} size="icon" title="이체 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-1">
        {/* Transfer list - Mobile */}
        <div className="block lg:hidden space-y-4">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
            ))
          ) : transfers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                등록된 이체 내역이 없습니다
              </CardContent>
            </Card>
          ) : (
            transfers.map((transfer) => (
              <Card key={transfer.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {renderAccountBadge(transfer.from_account_id)}
                      <ArrowRight className="text-gray-400" size={16} />
                      {renderAccountBadge(transfer.to_account_id)}
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-gray-800">
                        {formatCurrency(Number(transfer.amount))}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => openEditModal(transfer)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                        >
                          <Pencil size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="font-mono text-[rgb(161,25,25)]">{formatDateTime(transfer.transferred_at)}</span>
                    {transfer.memo && <span className="ml-2">· {transfer.memo}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Transfer list - Desktop */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>출금 계좌</TableHead>
                  <TableHead>입금 계좌</TableHead>
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
                ) : transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      등록된 이체 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell><span className="font-mono text-xs text-[rgb(161,25,25)]">{formatDateTime(transfer.transferred_at)}</span></TableCell>
                      <TableCell>{renderAccountBadge(transfer.from_account_id)}</TableCell>
                      <TableCell>{renderAccountBadge(transfer.to_account_id)}</TableCell>
                      <TableCell className="max-w-xs truncate">{transfer.memo || '-'}</TableCell>
                      <TableCell className="text-right font-medium font-mono">
                        {formatCurrency(Number(transfer.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(transfer)}
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
          title={editingTransfer ? '이체 수정' : '이체 추가'}
          footer={
            <div className="flex justify-between items-center">
              {editingTransfer ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    handleDelete(editingTransfer.id);
                    handleClose();
                  }}
                >
                  삭제
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  취소
                </Button>
                <Button type="submit" form="transfer-form" isLoading={isSubmitting}>
                  {editingTransfer ? '수정' : '이체'}
                </Button>
              </div>
            </div>
          }
        >
          <form id="transfer-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
              id="from_account_id"
              label="출금 계좌"
              options={accountOptions}
              error={errors.from_account_id?.message}
              {...register('from_account_id')}
            />

            <Select
              id="to_account_id"
              label="입금 계좌"
              options={accountOptions}
              error={errors.to_account_id?.message}
              {...register('to_account_id')}
            />

            <Input
              id="amount"
              type="text"
              label="금액"
              placeholder="0"
              error={errors.amount?.message}
              {...register('amount', { onChange: handleAmountChange })}
            />

            <Input
              id="transferred_at"
              type="datetime-local"
              label="이체 일시"
              error={errors.transferred_at?.message}
              {...register('transferred_at')}
            />

            <Input
              id="memo"
              label="메모 (선택)"
              error={errors.memo?.message}
              {...register('memo')}
            />
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
