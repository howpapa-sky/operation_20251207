import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'button';
  className?: string;
  onCopy?: () => void;
  showToast?: boolean;
}

export default function CopyButton({
  text,
  label = '복사',
  size = 'md',
  variant = 'button',
  className = '',
  onCopy,
  showToast = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showToastMessage, setShowToastMessage] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();

      if (showToast) {
        setShowToastMessage(true);
        setTimeout(() => setShowToastMessage(false), 1500);
      }

      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const sizeClasses = {
    sm: variant === 'icon' ? 'p-1.5' : 'px-2 py-1 text-xs',
    md: variant === 'icon' ? 'p-2' : 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleCopy}
          className={`rounded-lg transition-all ${sizeClasses[size]} ${
            copied
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
          } ${className}`}
          title={copied ? '복사됨!' : label}
        >
          {copied ? (
            <Check className={iconSizes[size]} />
          ) : (
            <Copy className={iconSizes[size]} />
          )}
        </button>

        {/* Toast */}
        {showToastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl shadow-xl text-sm">
              <Check className="w-4 h-4 text-green-400" />
              복사되었습니다
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleCopy}
        className={`flex items-center gap-1.5 rounded-lg font-medium transition-all ${sizeClasses[size]} ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
      >
        {copied ? (
          <>
            <Check className={iconSizes[size]} />
            복사됨
          </>
        ) : (
          <>
            <Copy className={iconSizes[size]} />
            {label}
          </>
        )}
      </button>

      {/* Toast */}
      {showToastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl shadow-xl text-sm">
            <Check className="w-4 h-4 text-green-400" />
            복사되었습니다
          </div>
        </div>
      )}
    </>
  );
}
