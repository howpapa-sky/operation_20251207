import { Calendar, ChevronDown } from 'lucide-react';
import { SeedingProject, Brand } from '../../../types';

interface DateRange {
  start: string;
  end: string;
}

interface ReportFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedProjectId: string | 'all';
  onProjectChange: (projectId: string | 'all') => void;
  selectedBrand: Brand | 'all';
  onBrandChange: (brand: Brand | 'all') => void;
  projects: SeedingProject[];
}

export default function ReportFilters({
  dateRange,
  onDateRangeChange,
  selectedProjectId,
  onProjectChange,
  selectedBrand,
  onBrandChange,
  projects,
}: ReportFiltersProps) {
  // 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (타임존 안전)
  const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Quick date range presets
  const setPresetRange = (preset: 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear') => {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (preset) {
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        break;
    }

    onDateRangeChange({
      start: toLocalDateString(start),
      end: toLocalDateString(end),
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="bg-transparent text-sm text-gray-700 border-none focus:outline-none"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="bg-transparent text-sm text-gray-700 border-none focus:outline-none"
            />
          </div>

          {/* Quick Presets */}
          <div className="flex gap-1">
            <button
              onClick={() => setPresetRange('thisMonth')}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              이번 달
            </button>
            <button
              onClick={() => setPresetRange('lastMonth')}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              지난 달
            </button>
            <button
              onClick={() => setPresetRange('last3Months')}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              3개월
            </button>
          </div>
        </div>

        <div className="flex-1" />

        {/* Project Filter */}
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value as string | 'all')}
            className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">전체 프로젝트</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Brand Filter */}
        <div className="flex gap-1">
          <button
            onClick={() => onBrandChange('all')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedBrand === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onBrandChange('howpapa')}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedBrand === 'howpapa'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🧡 하우파파
          </button>
          <button
            onClick={() => onBrandChange('nucio')}
            className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedBrand === 'nucio'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💚 누씨오
          </button>
        </div>
      </div>
    </div>
  );
}
