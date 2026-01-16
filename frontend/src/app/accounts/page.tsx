'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
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
  Badge,
} from '@/components/ui';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, getAccountTypeLabel, getAccountTypeColor } from '@/lib/utils';
import type { Account, AccountType } from '@/types';

const accountSchema = z.object({
  name: z.string().min(1, '계좌명을 입력하세요'),
  account_type: z.enum(['bank', 'credit_card', 'prepaid']),
  balance: z.string(),
  description: z.string().optional(),
});

type AccountForm = z.infer<typeof accountSchema>;

const accountTypeOptions = [
  { value: 'bank', label: '은행계좌' },
  { value: 'credit_card', label: '신용카드' },
  { value: 'prepaid', label: '선불/포인트' },
];

export default function AccountsPage() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount } = useAccounts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      account_type: 'bank',
      balance: '0',
      description: '',
    },
  });

  const openCreateModal = () => {
    setEditingAccount(null);
    reset({
      name: '',
      account_type: 'bank',
      balance: '0',
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    reset({
      name: account.name,
      account_type: account.account_type as AccountType,
      balance: String(account.balance),
      description: account.description || '',
    });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    reset();
  };

  const onSubmit = async (data: AccountForm) => {
    try {
      setIsSubmitting(true);
      const balance = parseFloat(data.balance) || 0;
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: data.name,
          account_type: data.account_type,
          balance,
          description: data.description,
        });
      } else {
        await createAccount({
          name: data.name,
          account_type: data.account_type,
          balance,
          description: data.description,
        });
      }
      handleClose();
    } catch (error) {
      console.error('Failed to save account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 계좌를 삭제하시겠습니까?')) {
      try {
        await deleteAccount(id);
      } catch (error) {
        console.error('Failed to delete account:', error);
      }
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const bankTotal = accounts
    .filter((acc) => acc.account_type === 'bank')
    .reduce((sum, acc) => sum + Number(acc.balance), 0);
  const creditCardTotal = accounts
    .filter((acc) => acc.account_type === 'credit_card')
    .reduce((sum, acc) => sum + Number(acc.balance), 0);
  const prepaidTotal = accounts
    .filter((acc) => acc.account_type === 'prepaid')
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  return (
    <DashboardLayout title="계좌 관리">
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">총 잔액</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {formatCurrency(totalBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">은행계좌</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(bankTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">신용카드</p>
              <p className={`text-2xl font-bold mt-1 ${creditCardTotal < 0 ? 'text-red-600' : 'text-purple-600'}`}>
                {formatCurrency(creditCardTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">선불/포인트</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(prepaidTotal)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Accounts list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>계좌 목록</CardTitle>
            <Button onClick={openCreateModal}>
              <Plus size={18} />
              계좌 추가
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <Wallet size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">등록된 계좌가 없습니다</p>
                <Button onClick={openCreateModal} className="mt-4">
                  첫 번째 계좌 추가하기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Wallet size={24} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">{account.name}</p>
                          <Badge className={getAccountTypeColor(account.account_type)}>
                            {getAccountTypeLabel(account.account_type)}
                          </Badge>
                        </div>
                        {account.description && (
                          <p className="text-sm text-gray-500 mt-1">{account.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <p className={`text-xl font-bold ${Number(account.balance) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {formatCurrency(Number(account.balance))}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(account)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleClose}
          title={editingAccount ? '계좌 수정' : '계좌 추가'}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="name"
              label="계좌명"
              placeholder="예: 주거래 계좌"
              error={errors.name?.message}
              {...register('name')}
            />

            <Select
              id="account_type"
              label="계좌 유형"
              options={accountTypeOptions}
              error={errors.account_type?.message}
              {...register('account_type')}
            />

            <Input
              id="balance"
              type="number"
              label="잔액"
              placeholder="0"
              error={errors.balance?.message}
              {...register('balance')}
            />

            <Input
              id="description"
              label="설명 (선택)"
              placeholder="예: 월급 입금용"
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={handleClose}>
                취소
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                {editingAccount ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
