import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useApiCredentialsStore } from '../store/useApiCredentialsStore';

export default function Cafe24CallbackPage() {
  const navigate = useNavigate();
  const { fetchCredentials } = useApiCredentialsStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Cafe24 인증 코드를 처리하는 중...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      setStatus('error');
      setMessage('인증 코드가 없습니다. Cafe24에서 인증을 승인해주세요.');
      return;
    }

    (async () => {
      try {
        // DB에서 cafe24 자격증명 가져오기
        await fetchCredentials();
        const creds = useApiCredentialsStore.getState().credentials;
        const cafe24Cred = creds.find((c) => c.channel === 'cafe24');
        const cafe24 = cafe24Cred?.cafe24;

        if (!cafe24?.mallId || !cafe24?.clientId || !cafe24?.clientSecret) {
          setStatus('error');
          setMessage('Cafe24 자격증명이 저장되어 있지 않습니다. 설정에서 먼저 저장해주세요.');
          return;
        }

        const redirectUri = window.location.origin;
        const res = await fetch('/.netlify/functions/commerce-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cafe24-exchange-token',
            mallId: cafe24.mallId,
            clientId: cafe24.clientId,
            clientSecret: cafe24.clientSecret,
            code,
            redirectUri,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setStatus('success');
          setMessage('Cafe24 OAuth 인증이 완료되었습니다!');
          await fetchCredentials();
          // 3초 후 설정 페이지로 이동
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Cafe24 인증
        </h2>
        <p className={`text-sm ${
          status === 'success' ? 'text-green-600' :
          status === 'error' ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {message}
        </p>

        {status === 'success' && (
          <p className="text-xs text-gray-400 mt-3">잠시 후 설정 페이지로 이동합니다...</p>
        )}
        {status === 'error' && (
          <button
            onClick={() => navigate('/settings', { replace: true })}
            className="mt-4 bg-blue-600 text-white text-sm font-medium py-2 px-6 rounded-lg hover:bg-blue-700"
          >
            설정으로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
