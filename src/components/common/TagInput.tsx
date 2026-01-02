import { useState, KeyboardEvent, useRef } from 'react';
import { X, Hash } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  prefix?: string; // 자동 접두어 (예: '#')
  className?: string;
  disabled?: boolean;
  error?: string;
}

export default function TagInput({
  value = [],
  onChange,
  placeholder = '태그 입력 후 Enter',
  maxTags,
  prefix,
  className = '',
  disabled = false,
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    let cleanTag = tag.trim();
    if (!cleanTag) return;

    // 접두어 처리
    if (prefix) {
      cleanTag = cleanTag.replace(new RegExp(`^${prefix}+`), '');
    }

    if (!cleanTag) return;

    // 중복 체크
    const normalizedTag = prefix ? `${prefix}${cleanTag}` : cleanTag;
    if (value.some((t) => t.toLowerCase() === normalizedTag.toLowerCase())) {
      setInputValue('');
      return;
    }

    // 최대 개수 체크
    if (maxTags && value.length >= maxTags) return;

    onChange([...value, normalizedTag]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // 쉼표가 포함되면 태그 추가
    if (val.includes(',')) {
      const parts = val.split(',');
      parts.forEach((part, index) => {
        if (index < parts.length - 1) {
          addTag(part);
        } else {
          setInputValue(part);
        }
      });
    } else {
      setInputValue(val);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className={className}>
      <div
        onClick={handleContainerClick}
        className={`min-h-[42px] px-3 py-2 border rounded-xl transition-colors cursor-text ${
          error
            ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-100 focus-within:border-red-500'
            : 'border-gray-300 focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-500'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
      >
        <div className="flex flex-wrap gap-2">
          {/* 태그 목록 */}
          {value.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
            >
              {prefix && !tag.startsWith(prefix) ? `${prefix}${tag}` : tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(index);
                  }}
                  className="p-0.5 rounded hover:bg-primary-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {/* 입력 필드 */}
          {(!maxTags || value.length < maxTags) && !disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={() => inputValue && addTag(inputValue)}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={disabled}
              className="flex-1 min-w-[120px] outline-none text-sm bg-transparent placeholder:text-gray-400"
            />
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* 힌트 */}
      {maxTags && (
        <p className="mt-1 text-xs text-gray-500">
          {value.length}/{maxTags}개
        </p>
      )}
    </div>
  );
}

// 해시태그 전용 컴포넌트
interface HashtagInputProps extends Omit<TagInputProps, 'prefix'> {}

export function HashtagInput(props: HashtagInputProps) {
  return <TagInput {...props} prefix="#" />;
}

// 멘션 전용 컴포넌트
interface MentionInputProps extends Omit<TagInputProps, 'prefix'> {}

export function MentionInput(props: MentionInputProps) {
  return <TagInput {...props} prefix="@" />;
}
