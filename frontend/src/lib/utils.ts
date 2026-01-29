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
  return format(seoulTime, "yyyy년 MM월 dd일 ' ('E') ' a h시", { locale: ko });
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
    other: '기타',
  };
  return labels[type] || type;
}

export function getAccountTypeColor(type: string): string {
  const colors: Record<string, string> = {
    bank: 'bg-blue-100 text-blue-800',
    credit_card: 'bg-purple-100 text-purple-800',
    prepaid: 'bg-green-100 text-green-800',
    other: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

// 금액 입력 시 천단위 콤마 포맷팅
export function formatAmountWithComma(value: string, allowNegative = true): string {
  const isNegative = allowNegative && value.startsWith('-');
  const numericValue = value.replace(/[^0-9]/g, '');
  if (!numericValue) return isNegative ? '-' : '';
  const formatted = Number(numericValue).toLocaleString('ko-KR');
  return isNegative ? `-${formatted}` : formatted;
}

// 포맷된 금액 문자열을 숫자로 변환
export function parseFormattedAmount(value: string): number {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

// 로컬 날짜를 YYYY-MM-DD 형식으로 포맷
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 날짜 프리셋 타입
export type DatePreset = 'this_week' | 'this_month' | 'this_year' | 'custom';

// 날짜 프리셋에 따른 시작/종료 날짜 계산
export function getDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dayOfWeek = today.getDay();

  switch (preset) {
    case 'this_week': {
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const startOfWeek = new Date(year, month, today.getDate() + diffToMonday);
      const endOfWeek = new Date(year, month, today.getDate() + diffToMonday + 6);
      return {
        start: formatLocalDate(startOfWeek),
        end: formatLocalDate(endOfWeek),
      };
    }
    case 'this_month': {
      return {
        start: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        end: `${year}-${String(month + 1).padStart(2, '0')}-${new Date(year, month + 1, 0).getDate()}`,
      };
    }
    case 'this_year': {
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    }
    default:
      return { start: '', end: '' };
  }
}
