import { ReactNode } from 'react';

export interface StatusTab<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: ReactNode;
  color?: string; // Tailwind color class (e.g., 'blue', 'green', 'red')
}

interface StatusTabsProps<T extends string = string> {
  tabs: StatusTab<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  variant?: 'pills' | 'underline';
}

export default function StatusTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  size = 'md',
  variant = 'pills',
}: StatusTabsProps<T>) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
  };

  const getActiveClasses = (tab: StatusTab<T>) => {
    const color = tab.color || 'primary';
    const colorMap: Record<string, string> = {
      primary: 'bg-primary-600 text-white',
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      red: 'bg-red-500 text-white',
      amber: 'bg-amber-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      gray: 'bg-gray-900 text-white',
    };
    return colorMap[color] || colorMap.primary;
  };

  if (variant === 'underline') {
    return (
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`flex items-center gap-2 pb-3 border-b-2 font-medium transition-colors ${
                value === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    value === tab.value
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-2 rounded-lg font-medium transition-colors ${sizeClasses[size]} ${
            value === tab.value
              ? getActiveClasses(tab)
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs ${
                value === tab.value
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
