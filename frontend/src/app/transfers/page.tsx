'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowRight, Trash2 } from 'lucide-react';
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
} from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import api from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { Transfer, TransferCreate, PaginatedResponse } from '@/types';

const transferSchema = z.object({
  from_account_id: z.string().min(1, '출금 계좌를 선택하세요'),
  to_account_id: z.string().min(1, '입금 계좌를 선택하세요'),
  amount: z.string(),
  memo: z.string().optional(),
  transfer_at: z.string().optional(),
}).refine((data) => data.from_account_id !== data.to_account_id, {
  message: '출금 계좌와 입금 계좌가 같을 수 없습니다',
  path: ['to_account_id'],
});

type TransferForm = z.infer<typeof transferSchema>;

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { accounts } = useAccounts();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
  });

  const fetchTransfers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get<PaginatedResponse<Transfer>>(
        `/transfers/?page=${page}&size=10`
      );
      setTransfers(response.data.items);
      setTotal(response.data.total);
      setPages(response.data.pages);
    } catch (error) {
      console.error('Failed to fetch transfers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const openCreateModal = () => {
    reset({
      from_account_id: '',
      to_account_id: '',
      amount: '0',
      memo: '',
      transfer_at: new Date().toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    reset();
  };

  const onSubmit = async (data: TransferForm) => {
    try {
      setIsSubmitting(true);
      const transferData: TransferCreate = {
        from_account_id: data.from_account_id,
        to_account_id: data.to_account_id,
        amount: parseFloat(data.amount) || 0,
        memo: data.memo || undefined,
        transfer_at: data.transfer_at || undefined,
      };
      await api.post('/transfers/', transferData);
      handleClose();
      fetchTransfers();
    } catch (error) {
      console.error('Failed to create transfer:', error);
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

  return (
    <DashboardLayout title="이체 내역">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-gray-600">총 {total}건의 이체 내역</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus size={18} />
            이체 추가
          </Button>
        </div>

        {/* Transfer list */}
        <Card>
          <CardHeader>
            <CardTitle>이체 내역</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : transfers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                등록된 이체 내역이 없습니다
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">출금</p>
                          <p className="font-medium text-gray-800">
                            {transfer.from_account?.name || '알 수 없음'}
                          </p>
                        </div>
                        <ArrowRight className="text-gray-400" size={20} />
                        <div className="px-3 py-2 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-500">입금</p>
                          <p className="font-medium text-gray-800">
                            {transfer.to_account?.name || '알 수 없음'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-right">
                        <p className="font-bold text-gray-800">
                          {formatCurrency(Number(transfer.amount))}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDateTime(transfer.transfer_at)}
                        </p>
                        {transfer.memo && (
                          <p className="text-sm text-gray-500 mt-1">{transfer.memo}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(transfer.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <Modal isOpen={isModalOpen} onClose={handleClose} title="이체 추가">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              type="number"
              label="금액"
              placeholder="0"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Input
              id="transfer_at"
              type="datetime-local"
              label="이체 일시"
              error={errors.transfer_at?.message}
              {...register('transfer_at')}
            />

            <Input
              id="memo"
              label="메모 (선택)"
              placeholder="예: 적금 이체"
              error={errors.memo?.message}
              {...register('memo')}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                이체
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
