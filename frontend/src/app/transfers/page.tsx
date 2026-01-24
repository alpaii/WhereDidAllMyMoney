'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ArrowRight, Trash2, Pencil } from 'lucide-react';
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
import { formatCurrency, formatDateTime, getSeoulNow, toSeoulDateTimeLocal } from '@/lib/utils';
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
    formState: { errors },
  } = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
  });

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
      amount: String(transfer.amount),
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
        amount: parseFloat(data.amount) || 0,
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

  return (
    <DashboardLayout
      title="이체 내역"
      action={
        <Button onClick={openCreateModal} size="icon" title="이체 추가">
          <Plus size={20} />
        </Button>
      }
    >
      <div className="space-y-6">
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
                      <div className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {accounts.find(a => a.id === transfer.from_account_id)?.name || '알 수 없음'}
                      </div>
                      <ArrowRight className="text-gray-400" size={16} />
                      <div className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {accounts.find(a => a.id === transfer.to_account_id)?.name || '알 수 없음'}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">
                        {formatCurrency(Number(transfer.amount))}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <button
                          onClick={() => openEditModal(transfer)}
                          className="p-1 text-gray-500 hover:text-primary-600"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(transfer.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {formatDateTime(transfer.transferred_at)}
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
                      <TableCell>{formatDateTime(transfer.transferred_at)}</TableCell>
                      <TableCell>{accounts.find(a => a.id === transfer.from_account_id)?.name || '알 수 없음'}</TableCell>
                      <TableCell>{accounts.find(a => a.id === transfer.to_account_id)?.name || '알 수 없음'}</TableCell>
                      <TableCell className="max-w-xs truncate">{transfer.memo || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
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
                          <button
                            onClick={() => handleDelete(transfer.id)}
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
        <Modal isOpen={isModalOpen} onClose={handleClose} title={editingTransfer ? '이체 수정' : '이체 추가'}>
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
              id="transferred_at"
              type="datetime-local"
              label="이체 일시"
              error={errors.transferred_at?.message}
              {...register('transferred_at')}
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
                {editingTransfer ? '수정' : '이체'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
