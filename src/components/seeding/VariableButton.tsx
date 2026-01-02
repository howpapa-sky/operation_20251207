interface VariableButtonProps {
  variable: string;
  label: string;
  onClick: (variable: string) => void;
  disabled?: boolean;
}

export default function VariableButton({
  variable,
  label,
  onClick,
  disabled = false,
}: VariableButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(variable)}
      disabled={disabled}
      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <span className="text-amber-500">{`{`}</span>
      {label}
      <span className="text-amber-500">{`}`}</span>
    </button>
  );
}

// 사용 가능한 변수 목록
export const outreachVariables = [
  { key: '{인플루언서명}', label: '인플루언서명', field: 'account_id' },
  { key: '{인플루언서_이름}', label: '인플루언서_이름', field: 'account_name' },
  { key: '{팔로워수}', label: '팔로워수', field: 'follower_count' },
  { key: '{제품명}', label: '제품명', field: 'product_name' },
  { key: '{브랜드명}', label: '브랜드명', field: 'brand' },
  { key: '{원고비}', label: '원고비', field: 'fee' },
  { key: '{담당자명}', label: '담당자명', field: 'assignee_name' },
  { key: '{가이드링크}', label: '가이드링크', field: 'guide_link' },
];

// 변수 추출 함수
export function extractVariables(content: string): string[] {
  const regex = /\{[^}]+\}/g;
  const matches = content.match(regex);
  return matches ? [...new Set(matches)] : [];
}

// 변수 치환 함수
export function replaceVariables(
  content: string,
  values: Record<string, string | number | undefined>
): string {
  let result = content;

  outreachVariables.forEach(({ key, field }) => {
    const value = values[field];
    if (value !== undefined) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), String(value));
    }
  });

  return result;
}

// 변수 하이라이트 렌더링
export function highlightVariables(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\{[^}]+\})/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(content)) !== null) {
    // 변수 이전 텍스트
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{content.slice(lastIndex, match.index)}</span>);
    }
    // 변수 (하이라이트)
    parts.push(
      <span
        key={key++}
        className="inline-block px-1 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium"
      >
        {match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  // 마지막 텍스트
  if (lastIndex < content.length) {
    parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
  }

  return parts;
}
