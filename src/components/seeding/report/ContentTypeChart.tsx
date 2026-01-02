import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface ContentTypeData {
  story: number;
  reels: number;
  feed: number;
  both: number;
}

interface ContentTypeChartProps {
  data: ContentTypeData;
  isLoading?: boolean;
}

const COLORS = {
  story: '#f59e0b',   // 앰버
  reels: '#8b5cf6',   // 퍼플
  feed: '#3b82f6',    // 블루
  both: '#10b981',    // 에메랄드
};

const LABELS = {
  story: '스토리',
  reels: '릴스',
  feed: '피드',
  both: '스토리+릴스',
};

export default function ContentTypeChart({ data, isLoading }: ContentTypeChartProps) {
  // 차트 데이터 변환
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }));

  const total = Object.values(data).reduce((sum, val) => sum + val, 0);

  // 커스텀 라벨
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // 5% 미만은 라벨 숨김

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value}건 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // 커스텀 범례
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
            <span className="text-sm font-medium text-gray-900">
              {chartData.find(d => d.name === entry.value)?.value}건
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">📊 콘텐츠 유형별 성과</h3>
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
          <PieChartIcon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-bold text-gray-900">📊 콘텐츠 유형별 성과</h3>
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
        <PieChartIcon className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-bold text-gray-900">📊 콘텐츠 유형별 성과</h3>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
