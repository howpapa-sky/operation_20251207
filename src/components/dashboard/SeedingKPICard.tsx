import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SeedingKPICardProps {
  brand: 'howpapa' | 'nucio';
  targetListup: number;      // 목표 리스트업 수
  targetAcceptance: number;  // 목표 수락 수
  actualListup: number;      // 실제 리스트업 수
  actualAcceptance: number;  // 실제 수락 수
}

// 상태 아이콘 및 색상 결정
function getStatusIcon(percentage: number): { icon: string; color: string; bgColor: string } {
  if (percentage >= 80) {
    return { icon: '✅', color: 'text-green-600', bgColor: 'bg-green-500' };
  } else if (percentage >= 50) {
    return { icon: '⚠️', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
  } else {
    return { icon: '🔴', color: 'text-red-600', bgColor: 'bg-red-500' };
  }
}

interface KPIRowProps {
  label: string;
  actual: number;
  target: number;
}

function KPIRow({ label, actual, target }: KPIRowProps) {
  const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
  const { icon, bgColor } = getStatusIcon(percentage);
  const progressWidth = Math.min(percentage, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">
          {actual}/{target} ({percentage}%) {icon}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', bgColor)}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function SeedingKPICard({
  brand,
  targetListup,
  targetAcceptance,
  actualListup,
  actualAcceptance,
}: SeedingKPICardProps) {
  const navigate = useNavigate();
  const isHowpapa = brand === 'howpapa';
  const brandName = isHowpapa ? 'HOWPAPA' : 'NUCCIO';
  const brandEmoji = isHowpapa ? '🧡' : '💚';
  const brandColor = isHowpapa ? 'border-orange-400' : 'border-green-400';
  const brandBgColor = isHowpapa ? 'bg-orange-50' : 'bg-green-50';
  const brandTextColor = isHowpapa ? 'text-orange-600' : 'text-green-600';

  return (
    <div
      className={cn('rounded-xl border-2 p-4 cursor-pointer transition-shadow hover:shadow-md', brandColor, brandBgColor)}
      onClick={() => navigate('/seeding')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{brandEmoji}</span>
        <span className={cn('font-bold text-lg', brandTextColor)}>{brandName}</span>
      </div>

      {/* KPIs */}
      <div className="space-y-4">
        <KPIRow label="리스트업" actual={actualListup} target={targetListup} />
        <KPIRow label="수락" actual={actualAcceptance} target={targetAcceptance} />
      </div>
    </div>
  );
}
