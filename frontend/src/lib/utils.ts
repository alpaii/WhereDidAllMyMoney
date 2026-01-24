import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function formatDate(dateString: string, formatStr: string = 'yyyy-MM-dd'): string {
  return format(parseISO(dateString), formatStr, { locale: ko });
}

export function formatDateTime(dateString: string): string {
  const date = parseISO(dateString);
  const seoulTime = toZonedTime(date, 'Asia/Seoul');
  return format(seoulTime, 'yyyy-MM-dd HH시', { locale: ko });
}

// ISO string을 서울 시간대의 datetime-local input 형식으로 변환
export function toSeoulDateTimeLocal(dateString: string): string {
  const date = parseISO(dateString);
  const seoulTime = toZonedTime(date, 'Asia/Seoul');
  return format(seoulTime, "yyyy-MM-dd'T'HH:mm");
}

// 현재 서울 시간을 datetime-local input 형식으로 반환
export function getSeoulNow(): string {
  const seoulTime = toZonedTime(new Date(), 'Asia/Seoul');
  return format(seoulTime, "yyyy-MM-dd'T'HH:mm");
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
