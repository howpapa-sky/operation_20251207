import { Wallet, Receipt, BarChart3 } from 'lucide-react';

interface CostData {
  totalSeedingCost: number;  // 총 시딩 원가
  totalFee: number;          // 총 원고비
  totalReach: number;        // 총 도달 (CPM 계산용)
}

interface ReportCostCardsProps {
  data: CostData;
  isLoading?: boolean;
}

// 금액 포맷팅
function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return amount.toLocaleString();
}

interface CostCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subLabel?: string;
  isLoading?: boolean;
}

function CostCard({ icon, iconBg, label, value, subLabel, isLoading }: CostCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-500 mb-0.5">{label}</div>
          <div className="text-2xl font-bold text-gray-900 truncate">
            {isLoading ? '-' : value}
          </div>
          {subLabel && (
            <div className="text-xs text-gray-400 mt-0.5">{subLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportCostCards({ data, isLoading }: ReportCostCardsProps) {
  // CPM 계산 (1000 도달당 비용)
  const totalCost = data.totalSeedingCost + data.totalFee;
  const cpm = data.totalReach > 0 ? (totalCost / data.totalReach) * 1000 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CostCard
        icon={<Wallet className="w-6 h-6 text-amber-600" />}
        iconBg="bg-amber-100"
        label="💰 총 시딩 원가"
        value={`₩${formatCurrency(data.totalSeedingCost)}`}
        subLabel="제품 원가 × 수량"
        isLoading={isLoading}
      />

      <CostCard
        icon={<Receipt className="w-6 h-6 text-blue-600" />}
        iconBg="bg-blue-100"
        label="💵 총 원고비"
        value={`₩${formatCurrency(data.totalFee)}`}
        subLabel="유가 시딩 비용"
        isLoading={isLoading}
      />

      <CostCard
        icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}
        iconBg="bg-indigo-100"
        label="📊 CPM (1000도달당)"
        value={`₩${formatCurrency(Math.round(cpm))}`}
        subLabel="(원가+원고비) ÷ 도달 × 1000"
        isLoading={isLoading}
      />
    </div>
  );
}
