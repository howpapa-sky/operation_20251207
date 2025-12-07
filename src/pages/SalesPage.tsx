import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Store,
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
} from 'recharts';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import { useSalesStore, channelLabels } from '../store/useSalesStore';
import { SalesChannel, SalesRecord } from '../types';
import { formatNumber } from '../utils/helpers';

const channelOptions: SalesChannel[] = ['cafe24', 'naver_smartstore', 'coupang', 'other'];

const channelColors: Record<SalesChannel, string> = {
  cafe24: '#3B82F6',
  naver_smartstore: '#10B981',
  coupang: '#F59E0B',
  other: '#6B7280',
};

export default function SalesPage() {
  const {
    products,
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
  } = useSalesStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formChannel, setFormChannel] = useState<SalesChannel>('cafe24');
  const [formProductName, setFormProductName] = useState('');
  const [formQuantity, setFormQuantity] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState(0);
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    fetchProducts();
    // 현재 월의 데이터 가져오기
    const startDate = `${selectedMonth}-01`;
    const endDate = `${selectedMonth}-31`;
    fetchSalesRecords(startDate, endDate);
  }, [selectedMonth, fetchProducts, fetchSalesRecords]);

  const summary = getMonthlySummary(selectedMonth);

  const resetForm = () => {
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormChannel('cafe24');
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
      productId: '',
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
    const product = products.find((p) => p.id === productId);
    if (product) {
      setFormProductName(product.name);
      setFormCostPrice(product.costPrice);
      setFormUnitPrice(product.sellingPrice);
    }
  };

  // 채널별 데이터 for chart
  const channelChartData = channelOptions.map((ch) => ({
    name: channelLabels[ch],
    매출: summary.byChannel[ch]?.revenue || 0,
    이익: summary.byChannel[ch]?.profit || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 관리</h1>
          <p className="text-gray-500 mt-1">일별/월별 매출 현황을 확인하세요</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input-field w-40"
          />
          <button onClick={handleOpenAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            매출 등록
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 매출</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(summary.totalRevenue)}원
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">총 매입가</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(summary.totalCost)}원
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">순이익</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(summary.totalProfit)}원
              </p>
              <p className="text-xs text-gray-400">
                이익률 {summary.profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">주문 수</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(summary.orderCount)}건
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
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

        {/* Channel Distribution */}
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

      {/* Sales Records Table */}
      <Card>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">매출 내역</h3>
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
                <th className="table-header text-right">매입가</th>
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

          {products.length > 0 && (
            <div>
              <label className="label">등록된 제품에서 선택 (선택사항)</label>
              <select
                onChange={(e) => handleProductSelect(e.target.value)}
                className="select-field"
              >
                <option value="">직접 입력</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatNumber(p.sellingPrice)}원)
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
              <label className="label">매입 단가 *</label>
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
              <span className="text-gray-500">예상 매입가:</span>
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
