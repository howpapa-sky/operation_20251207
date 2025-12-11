import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  overflow?: 'hidden' | 'visible' | 'auto';
  onClick?: () => void;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const overflowClasses = {
  hidden: 'overflow-hidden',
  visible: 'overflow-visible',
  auto: 'overflow-auto',
};

export default function Card({
  children,
  className = '',
  hover = false,
  padding = 'md',
  overflow = 'hidden',
  onClick,
}: CardProps) {
  const baseClasses =
    'bg-white rounded-2xl shadow-elegant border border-gray-100/50';
  const hoverClasses = hover
    ? 'hover:shadow-elegant-lg hover:border-gray-200 transition-all duration-300 cursor-pointer'
    : '';

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${paddingClasses[padding]} ${overflowClasses[overflow]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Card Header
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
