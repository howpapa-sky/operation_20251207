import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function Cafe24CallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Cafe24 인증 코드를 처리하는 중...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    // brandId: App.tsx에서 쿼리파라미터로 전달 또는 Cafe24 state에서 추출
    const state = params.get('state');
    const brandId = params.get('brandId')
      || (state?.startsWith('cafe24auth_') ? state.split('_').slice(1).join('_') : undefined)
      || undefined;

    if (!code) {
      setStatus('error');
      setMessage('인증 코드가 없습니다. Cafe24에서 인증을 승인해주세요.');
      return;
    }

    (async () => {
      try {
        const redirectUri = window.location.origin;
        const res = await fetch('/.netlify/functions/commerce-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cafe24-complete-oauth',
            code,
            redirectUri,
            brandId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('Cafe24 OAuth 인증이 완료되었습니다!');
          setTimeout(() => navigate('/settings', { replace: true }), 3000);
        } else {
          setStatus('error');
          setMessage(`인증 실패: ${data.error || '알 수 없는 오류'}`);
        }
      } catch (err) {
        setStatus('error');
        setMessage(`인증 처리 중 오류: ${(err as Error).message}`);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
        {status === 'loading' && (
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        )}
        {status === 'success' && (
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        )}
        {status === 'error' && (
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        )}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cafe24 인증</h2>
        <p className={`text-sm ${status === 'success' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>{message}</p>
        {status === 'success' && <p className="text-xs text-gray-400 mt-3">잠시 후 설정 페이지로 이동합니다...</p>}
        {status === 'error' && (
          <button onClick={() => navigate('/settings', { replace: true })} className="mt-4 bg-blue-600 text-white text-sm font-medium py-2 px-6 rounded-lg hover:bg-blue-700">설정으로 돌아가기</button>
        )}
      </div>
    </div>
  );
}
