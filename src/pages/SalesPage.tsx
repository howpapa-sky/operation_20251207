import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  Store,
  Package,
  Calendar,
  BarChart2,
  Download,
  Upload,
  Megaphone,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { useSalesStore, channelLabels } from '../store/useSalesStore';
import { useProductMasterStore } from '../store/useProductMasterStore';
import { SalesChannel, SalesRecord } from '../types';
import { formatNumber, brandLabels } from '../utils/helpers';

const channelOptions: SalesChannel[] = ['cafe24', 'naver_smartstore', 'coupang', 'other'];

const channelColors: Record<SalesChannel, string> = {
  cafe24: '#3B82F6',
  naver_smartstore: '#10B981',
  coupang: '#F59E0B',
  other: '#6B7280',
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

type ViewTab = 'overview' | 'by-channel' | 'by-product' | 'by-period';

export default function SalesPage() {
  const {
    products: salesProducts,
    salesRecords,
    isLoading,
    selectedMonth,
    setSelectedMonth,
    fetchProducts,
    fetchSalesRecords,
    addSalesRecord,
    updateSalesRecord,
    deleteSalesRecord,
    getMonthlySummary,
    getSeedingMarketingCost,
    seedingMarketingCost,
  } = useSalesStore();

  const { products: masterProducts } = useProductMasterStore();

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formChannel, setFormChannel] = useState<SalesChannel>('cafe24');
  const [formProductId, setFormProductId] = useState('');
  const [formProductName, setFormProductName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchProducts();
    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-31`;
    fetchSalesRecords(startDate, endDate);
    getSeedingMarketingCost(startDate, endDate);
  }, [selectedMonth, fetchProducts, fetchSalesRecords, getSeedingMarketingCost]);

  const summary = getMonthlySummary(selectedMonth);

  // 제품별 매출 요약
  const productSummary = useMemo(() => {
    const productMap: Record<string, {
      name: string;
      revenue: number;
      profit: number;
      quantity: number;
      count: number;
    }> = {};

    salesRecords.forEach((r) => {
      const key = r.productName;
      if (!productMap[key]) {
        productMap[key] = { name: key, revenue: 0, profit: 0, quantity: 0, count: 0 };
      }
      productMap[key].revenue += r.totalRevenue;
      productMap[key].profit += r.profit;
      productMap[key].quantity += r.quantity;
      productMap[key].count += 1;
    });

    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }, [salesRecords]);

  // 채널별 데이터
  const channelChartData = channelOptions.map((ch) => ({
    name: channelLabels[ch],
    channel: ch,
    매출: summary.byChannel[ch]?.revenue || 0,
    이익: summary.byChannel[ch]?.profit || 0,
    건수: summary.byChannel[ch]?.count || 0,
  }));

  // 제품별 매출 파이차트 데이터
  const productPieData = productSummary.slice(0, 5).map((p, i) => ({
    name: p.name,
    value: p.revenue,
    color: COLORS[i % COLORS.length],
  }));

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormChannel('cafe24');
    setFormProductId('');
    setFormProductName('');
    setFormQuantity(1);
    setFormUnitPrice(0);
    setFormCostPrice(0);
    setFormNotes('');
    setEditingRecord(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (record: SalesRecord) => {
    setEditingRecord(record);
    setFormDate(record.date);
    setFormChannel(record.channel);
    setFormProductId(record.productId);
    setFormProductName(record.productName);
    setFormQuantity(record.quantity);
    setFormUnitPrice(record.unitPrice);
    setFormCostPrice(record.costPrice);
    setFormNotes(record.notes || '');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recordData = {
      date: formDate,
      channel: formChannel,
      productId: formProductId,
      productName: formProductName,
      quantity: formQuantity,
      unitPrice: formUnitPrice,
      costPrice: formCostPrice,
      notes: formNotes,
    };

    if (editingRecord) {
      await updateSalesRecord(editingRecord.id, recordData);
    } else {
      await addSalesRecord(recordData);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteSalesRecord(id);
    setShowDeleteConfirm(null);
  };

  const handleProductSelect = (productId: string) => {
    // 먼저 제품 마스터에서 찾기
    const masterProduct = masterProducts.find((p) => p.id === productId);
    if (masterProduct) {
      setFormProductId(productId);
      setFormProductName(masterProduct.name);
      setFormCostPrice(masterProduct.costPrice);
      setFormUnitPrice(masterProduct.sellingPrice);
      return;
    }

    // 없으면 기존 제품에서 찾기
    const salesProduct = salesProducts.find((p) => p.id === productId);
    if (salesProduct) {
      setFormProductId(productId);
      setFormProductName(salesProduct.name);
      setFormCostPrice(salesProduct.costPrice);
      setFormUnitPrice(salesProduct.sellingPrice);
    }
  };

  const tabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: '전체 현황', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'by-channel', label: '채널별', icon: <Store className="w-4 h-4" /> },
    { id: 'by-product', label: '제품별', icon: <Package className="w-4 h-4" /> },
    { id: 'by-period', label: '기간별', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">매출 관리</h1>
            <p className="text-gray-500">채널별, 제품별, 기간별 매출을 확인하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field w-40"
          />
          <button className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" />
            가져오기
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            내보내기
          </button>
          <button onClick={handleOpenAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            매출 등록
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 매출</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(summary.totalRevenue)}원
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 비용</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(summary.totalCost + seedingMarketingCost)}원
              </p>
              <p className="text-xs text-gray-400">
                원가 {formatNumber(summary.totalCost)} + 시딩 {formatNumber(seedingMarketingCost)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Megaphone className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">시딩 마케팅비</p>
              <p className="text-xl font-bold text-orange-600">
                {formatNumber(seedingMarketingCost)}원
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">순이익</p>
              <p className="text-xl font-bold text-green-600">
                {formatNumber(summary.totalProfit - seedingMarketingCost)}원
              </p>
              <p className="text-xs text-gray-400">
                이익률 {summary.totalRevenue > 0 ? (((summary.totalProfit - seedingMarketingCost) / summary.totalRevenue) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">주문 건수</p>
              <p className="text-xl font-bold text-gray-900">
                {formatNumber(summary.orderCount)}건
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 매출 추이</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.slice(8)}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 10000}만`} />
                  <Tooltip
                    formatter={(value: number) => `${formatNumber(value)}원`}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="매출"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="이익"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">채널별 매출</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value / 10000}만`} />
                  <Tooltip formatter={(value: number) => `${formatNumber(value)}원`} />
                  <Legend />
                  <Bar dataKey="매출" fill="#3B82F6" />
                  <Bar dataKey="이익" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'by-channel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {channelChartData.map((ch) => (
              <Card key={ch.channel} className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2 rounded-xl"
                    style={{ backgroundColor: `${channelColors[ch.channel]}20` }}
                  >
                    <Store className="w-5 h-5" style={{ color: channelColors[ch.channel] }} />
                  </div>
                  <span className="font-semibold text-gray-900">{ch.name}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">매출</span>
                    <span className="font-medium">{formatNumber(ch.매출)}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">이익</span>
                    <span className="font-medium text-green-600">{formatNumber(ch.이익)}원</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">건수</span>
                    <span className="font-medium">{ch.건수}건</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">채널별 매출 내역</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="table-header">채널</th>
                    <th className="table-header text-right">매출</th>
                    <th className="table-header text-right">원가</th>
                    <th className="table-header text-right">이익</th>
                    <th className="table-header text-right">이익률</th>
                    <th className="table-header text-right">건수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelChartData.map((ch) => (
                    <tr key={ch.channel} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: channelColors[ch.channel] }}
                          />
                          {ch.name}
                        </div>
                      </td>
                      <td className="table-cell text-right font-medium">{formatNumber(ch.매출)}원</td>
                      <td className="table-cell text-right">{formatNumber(summary.byChannel[ch.channel]?.cost || 0)}원</td>
                      <td className="table-cell text-right text-green-600 font-medium">{formatNumber(ch.이익)}원</td>
                      <td className="table-cell text-right">
                        {ch.매출 > 0 ? ((ch.이익 / ch.매출) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="table-cell text-right">{ch.건수}건</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'by-product' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">제품별 매출 순위</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">순위</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">제품명</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500">매출</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500">이익</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500">판매량</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {productSummary.slice(0, 10).map((p, index) => (
                      <tr key={p.name} className="hover:bg-gray-50">
                        <td className="py-3 text-sm">
                          <Badge variant={index < 3 ? 'primary' : 'gray'}>{index + 1}</Badge>
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900">{p.name}</td>
                        <td className="py-3 text-sm text-right font-medium">{formatNumber(p.revenue)}원</td>
                        <td className="py-3 text-sm text-right text-green-600">{formatNumber(p.profit)}원</td>
                        <td className="py-3 text-sm text-right">{formatNumber(p.quantity)}개</td>
                      </tr>
                    ))}
                    {productSummary.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          매출 데이터가 없습니다
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">제품별 매출 비중</h3>
              {productPieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {productPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${formatNumber(value)}원`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  데이터가 없습니다
                </div>
              )}
              <div className="mt-4 space-y-2">
                {productPieData.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-gray-600 truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'by-period' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedMonth} 일별 매출
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.slice(8)}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${value / 10000}만`} />
                  <Tooltip
                    formatter={(value: number) => `${formatNumber(value)}원`}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="매출" fill="#3B82F6" />
                  <Bar dataKey="profit" name="이익" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">일별 매출 상세</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="table-header">날짜</th>
                    <th className="table-header text-right">매출</th>
                    <th className="table-header text-right">이익</th>
                    <th className="table-header text-right">이익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.dailyData.map((d) => (
                    <tr key={d.date} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{d.date}</td>
                      <td className="table-cell text-right">{formatNumber(d.revenue)}원</td>
                      <td className="table-cell text-right text-green-600">{formatNumber(d.profit)}원</td>
                      <td className="table-cell text-right">
                        {d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                  {summary.dailyData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="table-cell text-center text-gray-500">
                        데이터가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Sales Records Table - Always shown */}
      <Card>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">매출 내역</h3>
          <Badge variant="gray">{salesRecords.length}건</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="table-header">날짜</th>
                <th className="table-header">채널</th>
                <th className="table-header">제품명</th>
                <th className="table-header text-right">수량</th>
                <th className="table-header text-right">판매가</th>
                <th className="table-header text-right">원가</th>
                <th className="table-header text-right">매출</th>
                <th className="table-header text-right">이익</th>
                <th className="table-header text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : salesRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-cell text-center text-gray-500">
                    매출 데이터가 없습니다
                  </td>
                </tr>
              ) : (
                salesRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="table-cell">{record.date}</td>
                    <td className="table-cell">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${channelColors[record.channel]}20`,
                          color: channelColors[record.channel],
                        }}
                      >
                        <Store className="w-3 h-3" />
                        {channelLabels[record.channel]}
                      </span>
                    </td>
                    <td className="table-cell font-medium">{record.productName}</td>
                    <td className="table-cell text-right">{formatNumber(record.quantity)}</td>
                    <td className="table-cell text-right">{formatNumber(record.unitPrice)}원</td>
                    <td className="table-cell text-right">{formatNumber(record.costPrice)}원</td>
                    <td className="table-cell text-right font-medium">
                      {formatNumber(record.totalRevenue)}원
                    </td>
                    <td className="table-cell text-right font-medium text-green-600">
                      {formatNumber(record.profit)}원
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(record.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={editingRecord ? '매출 수정' : '매출 등록'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">날짜 *</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">채널 *</label>
              <select
                value={formChannel}
                onChange={(e) => setFormChannel(e.target.value as SalesChannel)}
                className="select-field"
                required
              >
                {channelOptions.map((ch) => (
                  <option key={ch} value={ch}>
                    {channelLabels[ch]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 제품 마스터에서 선택 */}
          {masterProducts.length > 0 && (
            <div>
              <label className="label">제품 마스터에서 선택</label>
              <select
                onChange={(e) => handleProductSelect(e.target.value)}
                className="select-field"
                value={formProductId}
              >
                <option value="">직접 입력</option>
                {masterProducts.filter(p => p.isActive).map((p) => (
                  <option key={p.id} value={p.id}>
                    [{brandLabels[p.brand]}] {p.name} ({formatNumber(p.sellingPrice)}원)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">제품명 *</label>
            <input
              type="text"
              value={formProductName}
              onChange={(e) => setFormProductName(e.target.value)}
              className="input-field"
              placeholder="제품명을 입력하세요"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">수량 *</label>
              <input
                type="number"
                value={formQuantity}
                onChange={(e) => setFormQuantity(Number(e.target.value))}
                className="input-field"
                min={1}
                required
              />
            </div>
            <div>
              <label className="label">판매 단가 *</label>
              <input
                type="number"
                value={formUnitPrice}
                onChange={(e) => setFormUnitPrice(Number(e.target.value))}
                className="input-field"
                min={0}
                required
              />
            </div>
            <div>
              <label className="label">원가 *</label>
              <input
                type="number"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(Number(e.target.value))}
                className="input-field"
                min={0}
                required
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">예상 매출:</span>
              <span className="font-medium">{formatNumber(formQuantity * formUnitPrice)}원</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">예상 원가:</span>
              <span className="font-medium">{formatNumber(formQuantity * formCostPrice)}원</span>
            </div>
            <div className="flex justify-between text-sm mt-1 pt-2 border-t border-gray-200">
              <span className="text-gray-500">예상 이익:</span>
              <span className="font-semibold text-green-600">
                {formatNumber(formQuantity * (formUnitPrice - formCostPrice))}원
              </span>
            </div>
          </div>

          <div>
            <label className="label">메모</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="메모를 입력하세요 (선택사항)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="btn-secondary"
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              {editingRecord ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="매출 기록 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">이 매출 기록을 삭제하시겠습니까?</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">
            취소
          </button>
          <button
            onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            className="btn-danger"
          >
            삭제
          </button>
        </div>
      </Modal>
    </div>
  );
}
