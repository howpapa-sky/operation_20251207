import { toast } from '@/hooks/use-toast';

interface ApiErrorOptions {
  silent?: boolean;
  retryAction?: () => Promise<void>;
}

export function handleApiError(error: unknown, context: string, options: ApiErrorOptions = {}) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`[${context}]`, error);

  if (options.silent) return;

  const isNetworkError =
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('Failed to fetch') ||
    message.includes('NetworkError');

  const isAuthError =
    message.includes('JWT') ||
    message.includes('token') ||
    message.includes('unauthorized') ||
    message.includes('401');

  if (isAuthError) {
    toast({
      title: '인증 오류',
      description: '로그인이 만료되었습니다. 다시 로그인해주세요.',
      variant: 'destructive',
    });
    return;
  }

  if (isNetworkError) {
    toast({
      title: '네트워크 오류',
      description: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.',
      variant: 'destructive',
    });
    return;
  }

  toast({
    title: `${context} 오류`,
    description: message || '알 수 없는 오류가 발생했습니다.',
    variant: 'destructive',
  });
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  options: ApiErrorOptions = {},
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleApiError(error, context, options);
    return null;
  }
}
