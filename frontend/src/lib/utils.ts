import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatDate(dateString: string, formatStr: string = 'yyyy-MM-dd'): string {
  return format(parseISO(dateString), formatStr, { locale: ko });
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), 'yyyy-MM-dd HH:mm', { locale: ko });
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    bank: '은행계좌',
    credit_card: '신용카드',
    prepaid: '선불/포인트',
  };
  return labels[type] || type;
}

export function getAccountTypeColor(type: string): string {
  const colors: Record<string, string> = {
    bank: 'bg-blue-100 text-blue-800',
    credit_card: 'bg-purple-100 text-purple-800',
    prepaid: 'bg-green-100 text-green-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}
