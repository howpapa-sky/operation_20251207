import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface SeedingTypeData {
  free: number;
  paid: number;
  freeCost: number;
  paidCost: number;
}

interface SeedingTypeChartProps {
  data: SeedingTypeData;
  isLoading?: boolean;
}

const COLORS = {
  free: '#22c55e',   // 그린
  paid: '#3b82f6',   // 블루
};

export default function SeedingTypeChart({ data, isLoading }: SeedingTypeChartProps) {
  const chartData = [
    {
      name: '무가',
      count: data.free,
      color: COLORS.free,
    },
    {
      name: '유가',
      count: data.paid,
      color: COLORS.paid,
    },
  ];

  const total = data.free + data.paid;

  // 금액 포맷팅
  const formatCurrency = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
      const cost = item.payload.name === '무가' ? data.freeCost : data.paidCost;

      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900 mb-1">{item.payload.name} 시딩</p>
          <p className="text-sm text-gray-600">
            {item.value}건 ({percentage}%)
          </p>
          <p className="text-sm text-gray-600">
            비용: {formatCurrency(cost)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">📊 무가/유가 비교</h3>
        </div>
        <div className="h-[250px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">📊 무가/유가 비교</h3>
        </div>
        <div className="h-[250px] flex items-center justify-center text-gray-400">
          데이터가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold text-gray-900">📊 무가/유가 비교</h3>
      </div>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 14, fill: '#374151', fontWeight: 500 }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary below chart */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">무가</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{data.free}건</div>
          <div className="text-xs text-gray-500">{formatCurrency(data.freeCost)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">유가</span>
          </div>
          <div className="text-lg font-bold text-gray-900">{data.paid}건</div>
          <div className="text-xs text-gray-500">{formatCurrency(data.paidCost)}</div>
        </div>
      </div>
    </div>
  );
}
