const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    console.error(
      `⚠️ 누락된 환경변수: ${missing.join(', ')}\n` +
      '앱이 정상적으로 작동하지 않을 수 있습니다.'
    );
  }
}
