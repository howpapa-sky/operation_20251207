import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  History,
  Link2,
  X,
  Save,
  Filter,
  Download,
  Upload,
  DollarSign,
  BarChart3,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import Card, { CardHeader } from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useSKUMasterStore } from '../store/skuMasterStore';
import { SKUMaster, SalesChannel, salesChannelLabels } from '../types/ecommerce';
import { cn } from '../lib/utils';

// CSV 파싱 유틸리티
function parseCSV(text: string): string[][] {
  const lines = text.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// CSV 생성 유틸리티
function generateCSV(headers: string[], rows: string[][]): string {
  const escapeField = (field: string) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const headerLine = headers.map(escapeField).join(',');
  const dataLines = rows.map(row => row.map(escapeField).join(','));

  return [headerLine, ...dataLines].join('\n');
}

const brandOptions = [
  { value: 'howpapa', label: '하우파파', color: 'orange' },
  { value: 'nuccio', label: '누치오', color: 'green' },
];

const categoryOptions = [
  '크림', '패드', '로션', '스틱', '앰플', '세럼', '미스트', '클렌저', '선크림', '마스크팩', '기타'
];

const channelOptions: SalesChannel[] = ['smartstore', 'coupang', 'coupang_rocket', 'cafe24', 'qoo10'];

export default function SKUMasterPage() {
  const {
    skus,
    costHistory,
    channelMappings,
    isLoading,
    fetchSKUs,
    addSKU,
    addSKUsBulk,
    updateSKU,
    deleteSKU,
    updateCostPrice,
    fetchCostHistory,
    fetchChannelMappings,
    addChannelMapping,
    deleteChannelMapping,
    getStats,
  } = useSKUMasterStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Modal states
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKUMaster | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showCostModal, setShowCostModal] = useState<SKUMaster | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<SKUMaster | null>(null);
  const [showMappingModal, setShowMappingModal] = useState<SKUMaster | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    skuCode: '',
    productName: '',
    brand: 'howpapa' as 'howpapa' | 'nuccio',
    category: '',
    costPrice: 0,
    sellingPrice: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    barcode: '',
    supplier: '',
    minStock: 0,
    currentStock: 0,
    isActive: true,
    notes: '',
  });

  // Cost update form
  const [costFormData, setCostFormData] = useState({
    newCost: 0,
    reason: '',
  });

  // Mapping form
  const [mappingFormData, setMappingFormData] = useState({
    channel: 'smartstore' as SalesChannel,
    optionName: '',
    channelProductId: '',
    channelOptionId: '',
  });

  // Excel upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);
  const [uploadPreview, setUploadPreview] = useState<Omit<SKUMaster, 'id' | 'createdAt' | 'updatedAt'>[]>([]);

  useEffect(() => {
    fetchSKUs();
  }, [fetchSKUs]);

  // Excel 다운로드 (템플릿)
  const handleDownloadTemplate = () => {
    const headers = ['SKU코드', '제품명', '브랜드', '카테고리', '원가', '판매가', '적용일', '바코드', '공급업체', '최소재고', '현재재고', '활성', '메모'];
    const sampleRow = ['SKU001', '샘플제품', 'howpapa', '크림', '5000', '15000', '2026-01-27', '', '', '10', '100', 'Y', ''];

    const csv = generateCSV(headers, [sampleRow]);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '제품_등록_템플릿.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Excel 다운로드 (현재 데이터)
  const handleDownloadData = () => {
    const headers = ['SKU코드', '제품명', '브랜드', '카테고리', '원가', '판매가', '적용일', '바코드', '공급업체', '최소재고', '현재재고', '활성', '메모'];
    const rows = skus.map(sku => [
      sku.skuCode,
      sku.productName,
      sku.brand,
      sku.category || '',
      sku.costPrice.toString(),
      sku.sellingPrice.toString(),
      sku.effectiveDate,
      sku.barcode || '',
      sku.supplier || '',
      (sku.minStock || 0).toString(),
      (sku.currentStock || 0).toString(),
      sku.isActive ? 'Y' : 'N',
      sku.notes || '',
    ]);

    const csv = generateCSV(headers, rows);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `제품_목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Excel 파일 읽기
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);

      // 헤더 제외하고 파싱
      const dataRows = rows.slice(1).filter(row => row[0] && row[0].trim());

      const parsed: Omit<SKUMaster, 'id' | 'createdAt' | 'updatedAt'>[] = dataRows.map(row => ({
        skuCode: row[0]?.trim() || '',
        productName: row[1]?.trim() || '',
        brand: (row[2]?.trim().toLowerCase() === 'nuccio' ? 'nuccio' : 'howpapa') as 'howpapa' | 'nuccio',
        category: row[3]?.trim() || undefined,
        costPrice: parseFloat(row[4]) || 0,
        sellingPrice: parseFloat(row[5]) || 0,
        effectiveDate: row[6]?.trim() || new Date().toISOString().split('T')[0],
        barcode: row[7]?.trim() || undefined,
        supplier: row[8]?.trim() || undefined,
        minStock: parseInt(row[9]) || 0,
        currentStock: parseInt(row[10]) || 0,
        isActive: row[11]?.trim().toUpperCase() !== 'N',
        notes: row[12]?.trim() || undefined,
      })).filter(sku => sku.skuCode && sku.productName);

      setUploadPreview(parsed);
      setShowUploadModal(true);
      setUploadResult(null);
    };
    reader.readAsText(file, 'UTF-8');

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 업로드 실행
  const handleConfirmUpload = async () => {
    if (uploadPreview.length === 0) return;

    const result = await addSKUsBulk(uploadPreview);
    setUploadResult(result);
  };

  // Filtered SKUs
  const filteredSKUs = skus.filter((sku) => {
    if (showActiveOnly && !sku.isActive) return false;
    if (filterBrand && sku.brand !== filterBrand) return false;
    if (filterCategory && sku.category !== filterCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        sku.skuCode.toLowerCase().includes(query) ||
        sku.productName.toLowerCase().includes(query) ||
        sku.barcode?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = getStats();

  // Handlers
  const openSKUModal = (sku?: SKUMaster) => {
    if (sku) {
      setEditingSKU(sku);
      setFormData({
        skuCode: sku.skuCode,
        productName: sku.productName,
        brand: sku.brand,
        category: sku.category || '',
        costPrice: sku.costPrice,
        sellingPrice: sku.sellingPrice,
        effectiveDate: sku.effectiveDate,
        barcode: sku.barcode || '',
        supplier: sku.supplier || '',
        minStock: sku.minStock || 0,
        currentStock: sku.currentStock || 0,
        isActive: sku.isActive,
        notes: sku.notes || '',
      });
    } else {
      setEditingSKU(null);
      setFormData({
        skuCode: '',
        productName: '',
        brand: 'howpapa',
        category: '',
        costPrice: 0,
        sellingPrice: 0,
        effectiveDate: new Date().toISOString().split('T')[0],
        barcode: '',
        supplier: '',
        minStock: 0,
        currentStock: 0,
        isActive: true,
        notes: '',
      });
    }
    setShowSKUModal(true);
  };

  const handleSaveSKU = async () => {
    if (!formData.skuCode || !formData.productName) {
      alert('SKU 코드와 제품명은 필수입니다.');
      return;
    }

    if (editingSKU) {
      await updateSKU(editingSKU.id, formData);
    } else {
      await addSKU(formData);
    }
    setShowSKUModal(false);
  };

  const handleDeleteSKU = async (id: string) => {
    await deleteSKU(id);
    setShowDeleteModal(null);
  };

  const openCostModal = (sku: SKUMaster) => {
    setShowCostModal(sku);
    setCostFormData({
      newCost: sku.costPrice,
      reason: '',
    });
  };

  const handleUpdateCost = async () => {
    if (showCostModal && costFormData.newCost !== showCostModal.costPrice) {
      await updateCostPrice(showCostModal.id, costFormData.newCost, costFormData.reason);
    }
    setShowCostModal(null);
  };

  const openHistoryModal = async (sku: SKUMaster) => {
    setShowHistoryModal(sku);
    await fetchCostHistory(sku.id);
  };

  const openMappingModal = async (sku: SKUMaster) => {
    setShowMappingModal(sku);
    await fetchChannelMappings(sku.id);
    setMappingFormData({
      channel: 'smartstore',
      optionName: '',
      channelProductId: '',
      channelOptionId: '',
    });
  };

  const handleAddMapping = async () => {
    if (!showMappingModal || !mappingFormData.optionName) return;

    await addChannelMapping({
      skuId: showMappingModal.id,
      channel: mappingFormData.channel,
      optionName: mappingFormData.optionName,
      channelProductId: mappingFormData.channelProductId || undefined,
      channelOptionId: mappingFormData.channelOptionId || undefined,
      isActive: true,
    });

    setMappingFormData({
      channel: 'smartstore',
      optionName: '',
      channelProductId: '',
      channelOptionId: '',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">제품 관리</h1>
            <p className="text-gray-500">제품별 원가/판매가 관리 및 채널 매핑</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 엑셀 다운로드 드롭다운 */}
          <div className="relative group">
            <button className="btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" />
              다운로드
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={handleDownloadTemplate}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                템플릿 다운로드
              </button>
              <button
                onClick={handleDownloadData}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                현재 데이터 다운로드
              </button>
            </div>
          </div>
          {/* 엑셀 업로드 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            엑셀 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          {/* 개별 등록 */}
          <button
            onClick={() => openSKUModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            제품 등록
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 SKU</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">하우파파</p>
              <p className="text-2xl font-bold text-orange-600">{stats.byBrand.howpapa}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">누치오</p>
              <p className="text-2xl font-bold text-green-600">{stats.byBrand.nuccio}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">재고 원가</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCostValue)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="SKU 코드, 제품명, 바코드 검색..."
                className="input-field pl-10"
              />
            </div>
          </div>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="select-field w-40"
          >
            <option value="">모든 브랜드</option>
            {brandOptions.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="select-field w-40"
          >
            <option value="">모든 카테고리</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <span className="text-sm text-gray-600">활성 SKU만</span>
          </label>
        </div>
      </Card>

      {/* SKU List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">SKU 코드</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">제품명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">브랜드</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">카테고리</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">원가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">판매가</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">마진율</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">상태</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">액션</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredSKUs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    등록된 제품이 없습니다. 새 제품을 등록해주세요.
                  </td>
                </tr>
              ) : (
                filteredSKUs.map((sku) => {
                  const marginRate = sku.sellingPrice > 0
                    ? ((sku.sellingPrice - sku.costPrice) / sku.sellingPrice * 100).toFixed(1)
                    : '0.0';

                  return (
                    <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-900">{sku.skuCode}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{sku.productName}</p>
                        {sku.barcode && (
                          <p className="text-xs text-gray-400">{sku.barcode}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={sku.brand === 'howpapa' ? 'warning' : 'success'}>
                          {sku.brand === 'howpapa' ? '하우파파' : '누치오'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {sku.category || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openCostModal(sku)}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {formatCurrency(sku.costPrice)}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                        {formatCurrency(sku.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={cn(
                          "text-sm font-medium",
                          parseFloat(marginRate) >= 50 ? "text-green-600" :
                          parseFloat(marginRate) >= 30 ? "text-blue-600" : "text-red-600"
                        )}>
                          {marginRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={sku.isActive ? 'success' : 'gray'}>
                          {sku.isActive ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openHistoryModal(sku)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="원가 이력"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openMappingModal(sku)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="채널 매핑"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openSKUModal(sku)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(sku.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          총 {filteredSKUs.length}개의 SKU
        </div>
      </Card>

      {/* SKU Modal */}
      <Modal
        isOpen={showSKUModal}
        onClose={() => setShowSKUModal(false)}
        title={editingSKU ? '제품 수정' : '새 제품 등록'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">SKU 코드 *</label>
              <input
                type="text"
                value={formData.skuCode}
                onChange={(e) => setFormData({ ...formData, skuCode: e.target.value })}
                className="input-field"
                placeholder="예: 116787"
              />
            </div>
            <div>
              <label className="label">브랜드 *</label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value as 'howpapa' | 'nuccio' })}
                className="select-field"
              >
                {brandOptions.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">제품명 *</label>
            <input
              type="text"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="input-field"
              placeholder="예: 하우파파 마스크팩 300ml"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">카테고리</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="select-field"
              >
                <option value="">선택하세요</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">바코드</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="input-field"
                placeholder="바코드 번호"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">원가 (VAT 포함) *</label>
              <input
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">판매가 *</label>
              <input
                type="number"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="input-field"
                placeholder="0"
              />
            </div>
            <div>
              <label className="label">적용일</label>
              <input
                type="date"
                value={formData.effectiveDate}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">공급업체</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="input-field"
                placeholder="공급업체명"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">최소 재고</label>
                <input
                  type="number"
                  value={formData.minStock}
                  onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">현재 재고</label>
                <input
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">메모</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="추가 메모"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">활성 상태</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowSKUModal(false)} className="btn-secondary">
            취소
          </button>
          <button onClick={handleSaveSKU} className="btn-primary">
            {editingSKU ? '수정' : '등록'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="제품 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          이 제품을 삭제하시겠습니까? 연결된 채널 매핑과 원가 이력도 함께 삭제됩니다.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setShowDeleteModal(null)} className="btn-secondary">
            취소
          </button>
          <button onClick={() => handleDeleteSKU(showDeleteModal!)} className="btn-danger">
            삭제
          </button>
        </div>
      </Modal>

      {/* Cost Update Modal */}
      <Modal
        isOpen={!!showCostModal}
        onClose={() => setShowCostModal(null)}
        title="원가 변경"
        size="sm"
      >
        {showCostModal && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">현재 원가</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(showCostModal.costPrice)}</p>
            </div>

            <div>
              <label className="label">새 원가 *</label>
              <input
                type="number"
                value={costFormData.newCost}
                onChange={(e) => setCostFormData({ ...costFormData, newCost: parseFloat(e.target.value) || 0 })}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">변경 사유</label>
              <input
                type="text"
                value={costFormData.reason}
                onChange={(e) => setCostFormData({ ...costFormData, reason: e.target.value })}
                className="input-field"
                placeholder="예: 원자재 가격 인상"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCostModal(null)} className="btn-secondary">
                취소
              </button>
              <button onClick={handleUpdateCost} className="btn-primary">
                변경
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cost History Modal */}
      <Modal
        isOpen={!!showHistoryModal}
        onClose={() => setShowHistoryModal(null)}
        title="원가 변경 이력"
        size="md"
      >
        {showHistoryModal && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{showHistoryModal.productName}</p>
              <p className="text-sm text-gray-500">SKU: {showHistoryModal.skuCode}</p>
            </div>

            {costHistory.length === 0 ? (
              <p className="text-center py-8 text-gray-500">변경 이력이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {costHistory.map((history, index) => (
                  <div key={history.id} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {history.previousCost !== undefined && (
                          <>
                            <span className="text-gray-400 line-through">
                              {formatCurrency(history.previousCost)}
                            </span>
                            <span className="text-gray-400">→</span>
                          </>
                        )}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(history.newCost)}
                        </span>
                        {index === 0 && (
                          <Badge variant="primary" size="sm">현재</Badge>
                        )}
                      </div>
                      {history.changeReason && (
                        <p className="text-sm text-gray-500 mt-1">{history.changeReason}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-400">
                      {new Date(history.effectiveDate).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Channel Mapping Modal */}
      <Modal
        isOpen={!!showMappingModal}
        onClose={() => setShowMappingModal(null)}
        title="채널별 옵션명 매핑"
        size="lg"
      >
        {showMappingModal && (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{showMappingModal.productName}</p>
              <p className="text-sm text-gray-500">SKU: {showMappingModal.skuCode}</p>
            </div>

            {/* Add new mapping */}
            <div className="mb-6 p-4 border border-dashed border-gray-300 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">새 매핑 추가</h4>
              <div className="grid grid-cols-4 gap-3">
                <select
                  value={mappingFormData.channel}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, channel: e.target.value as SalesChannel })}
                  className="select-field"
                >
                  {channelOptions.map((ch) => (
                    <option key={ch} value={ch}>{salesChannelLabels[ch]}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={mappingFormData.optionName}
                  onChange={(e) => setMappingFormData({ ...mappingFormData, optionName: e.target.value })}
                  className="input-field col-span-2"
                  placeholder="채널에서 사용하는 옵션명"
                />
                <button
                  onClick={handleAddMapping}
                  className="btn-primary"
                  disabled={!mappingFormData.optionName}
                >
                  추가
                </button>
              </div>
            </div>

            {/* Existing mappings */}
            <div className="space-y-2">
              {channelMappings.filter((m) => m.skuId === showMappingModal.id).length === 0 ? (
                <p className="text-center py-8 text-gray-500">등록된 채널 매핑이 없습니다.</p>
              ) : (
                channelMappings
                  .filter((m) => m.skuId === showMappingModal.id)
                  .map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="gray">{salesChannelLabels[mapping.channel]}</Badge>
                        <span className="text-gray-900">{mapping.optionName}</span>
                      </div>
                      <button
                        onClick={() => deleteChannelMapping(mapping.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  각 채널에서 사용하는 옵션명을 등록하면, 주문 데이터에서 자동으로 이 SKU로 매칭됩니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadPreview([]);
          setUploadResult(null);
        }}
        title="엑셀 일괄 업로드"
        size="lg"
      >
        <div>
          {uploadResult ? (
            // 결과 화면
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">업로드 완료</h3>
              <p className="text-gray-600 mb-4">
                성공: <span className="font-bold text-green-600">{uploadResult.success}건</span>
                {uploadResult.failed > 0 && (
                  <> / 실패: <span className="font-bold text-red-600">{uploadResult.failed}건</span></>
                )}
              </p>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadPreview([]);
                  setUploadResult(null);
                }}
                className="btn-primary"
              >
                확인
              </button>
            </div>
          ) : (
            // 미리보기 화면
            <>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  총 <span className="font-bold">{uploadPreview.length}개</span>의 SKU가 업로드됩니다.
                  동일한 SKU 코드가 있으면 업데이트됩니다.
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">SKU코드</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">제품명</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-500">브랜드</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">원가</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">판매가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreview.slice(0, 50).map((sku, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="py-2 px-3 font-mono text-xs">{sku.skuCode}</td>
                        <td className="py-2 px-3">{sku.productName}</td>
                        <td className="py-2 px-3">
                          <Badge variant={sku.brand === 'howpapa' ? 'warning' : 'success'} size="sm">
                            {sku.brand === 'howpapa' ? '하우파파' : '누치오'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right">{formatCurrency(sku.costPrice)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(sku.sellingPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {uploadPreview.length > 50 && (
                  <div className="text-center py-2 text-sm text-gray-500 bg-gray-50">
                    외 {uploadPreview.length - 50}개...
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadPreview([]);
                  }}
                  className="btn-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmUpload}
                  className="btn-primary flex items-center gap-2"
                  disabled={isLoading}
                >
                  {isLoading ? '업로드 중...' : `${uploadPreview.length}개 업로드`}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
