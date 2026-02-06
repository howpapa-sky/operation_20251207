import { format, formatDistanceToNow, isAfter, isBefore, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ProjectStatus, ProjectType, Priority, Brand } from '../types';

// 날짜 포맷팅
export const formatDate = (date: string | Date, formatStr = 'yyyy.MM.dd') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ko });
};

export const formatDateTime = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy.MM.dd HH:mm', { locale: ko });
};

export const formatRelativeTime = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ko });
};

// D-day 계산
export const getDday = (targetDate: string): number => {
  const target = parseISO(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const getDdayText = (targetDate: string): string => {
  const dday = getDday(targetDate);
  if (dday === 0) return 'D-Day';
  if (dday > 0) return `D-${dday}`;
  return `D+${Math.abs(dday)}`;
};

// 상태 관련
export const statusLabels: Record<ProjectStatus, string> = {
  planning: '기획',
  in_progress: '진행중',
  review: '검토중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
};

export const statusColors: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  review: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

// 프로젝트 타입 관련
export const projectTypeLabels: Record<ProjectType, string> = {
  sampling: '샘플링',
  detail_page: '상세페이지 제작',
  influencer: '인플루언서 협업',
  product_order: '제품 발주',
  group_purchase: '공동구매',
  other: '기타',
};

export const projectTypeColors: Record<ProjectType, string> = {
  sampling: 'bg-pink-100 text-pink-700',
  detail_page: 'bg-indigo-100 text-indigo-700',
  influencer: 'bg-orange-100 text-orange-700',
  product_order: 'bg-cyan-100 text-cyan-700',
  group_purchase: 'bg-emerald-100 text-emerald-700',
  other: 'bg-gray-100 text-gray-700',
};

// 우선순위 관련
export const priorityLabels: Record<Priority, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
};

export const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

// 브랜드 관련
export const brandLabels: Record<Brand, string> = {
  howpapa: '하우파파',
  nucio: '누씨오',
};

export const brandColors: Record<Brand, string> = {
  howpapa: 'bg-howpapa-100 text-howpapa-700',
  nucio: 'bg-nucio-100 text-nucio-700',
};

// 금액 포맷팅
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

// 퍼센트 계산
export const calculatePercentage = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

// 진행률 계산 (날짜 기반)
export const calculateProgress = (startDate: string, targetDate: string): number => {
  const start = parseISO(startDate);
  const target = parseISO(targetDate);
  const today = new Date();

  if (isBefore(today, start)) return 0;
  if (isAfter(today, target)) return 100;

  const totalDuration = target.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

  return Math.round((elapsed / totalDuration) * 100);
};

// 이메일 유효성 검사
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 비밀번호 유효성 검사
export const isValidPassword = (password: string): { valid: boolean; message: string } => {
  if (password.length < 6) {
    return { valid: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
  }
  return { valid: true, message: '' };
};

// 검색어 하이라이트
export const highlightText = (text: string, query: string): string => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
};

// 파일 크기 포맷팅
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// CSV 내보내기 헬퍼
export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

// 랜덤 색상 생성 (차트용)
export const generateChartColors = (count: number): string[] => {
  const baseColors = [
    '#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ec4899',
    '#14b8a6', '#f59e0b', '#6366f1', '#84cc16', '#ef4444',
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
};
