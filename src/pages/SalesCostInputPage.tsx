import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Search,
  Save,
  ArrowLeft,
  Package,
  Upload,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { SalesChannel, salesChannelLabels } from '@/types/ecommerce';
import { cn } from '@/lib/utils';

const db = supabase as any;

interface CostRow {
  channel: SalesChannel;
  brand: string;
  productName: string;
  optionName: string;
  costPrice: number;
  key: string;
}

interface SKURow {
  id: string;
  sku_code: string;
  product_name: string;
  brand: string;
  cost_price: number;
  selling_price: number;
}

function deriveBrand(productName: string): string {
  const lower = productName.toLowerCase();
  if (lower.includes('하우파파') || lower.includes('howpapa')) return '하우파파';
  if (lower.includes('누치오') || lower.includes('누씨오') || lower.includes('nucio')) return '누씨오';
  return '하우파파';
}

function deriveBrandCode(productName: string): 'howpapa' | 'nuccio' {
  const lower = productName.toLowerCase();
  if (lower.includes('누치오') || lower.includes('누씨오') || lower.includes('nucio') || lower.includes('nuccio')) return 'nuccio';
  return 'howpapa';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function SalesCostInputPage() {
  const navigate = useNavigate();
  const [costRows, setCostRows] = useState<CostRow[]>([]);
  const [skuMap, setSkuMap] = useState<Map<string, SKURow>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'product_name' | 'option_name'>('product_name');
  const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // orders_raw에서 고유 제품+옵션 조합 추출
  const fetchUniqueProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 모든 주문에서 고유 채널+제품명+옵션명 조합 가져오기
      const { data: orders, error: ordersError } = await db
        .from('orders_raw')
        .select('channel, product_name, option_name, cost_price')
        .not('product_name', 'is', null);

      if (ordersError) throw ordersError;

      // 고유 조합 추출
      const uniqueMap = new Map<string, CostRow>();
      for (const o of (orders || [])) {
        const key = `${o.channel}::${o.product_name}::${o.option_name || '-'}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            channel: o.channel,
            brand: deriveBrand(o.product_name),
            productName: o.product_name,
            optionName: o.option_name || '-',
            costPrice: parseFloat(o.cost_price) || 0,
            key,
          });
        }
      }

      setCostRows(Array.from(uniqueMap.values()).sort((a, b) => {
        if (a.channel !== b.channel) return a.channel.localeCompare(b.channel);
        return a.productName.localeCompare(b.productName);
      }));

      // SKU 마스터 데이터도 로드
      const { data: skus } = await db
        .from('sku_master')
        .select('id, sku_code, product_name, brand, cost_price, selling_price')
        .eq('is_active', true);

      if (skus) {
        const map = new Map<string, SKURow>();
        for (const sku of skus) {
          map.set(sku.product_name.toLowerCase(), sku);
        }
        setSkuMap(map);
      }
    } catch (err: any) {
      console.error('Fetch unique products error:', err);
      setError(err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUniqueProducts();
  }, []);

  // 필터링
  const filteredRows = useMemo(() => {
    return costRows.filter(row => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (searchField === 'product_name') {
          return row.productName.toLowerCase().includes(term);
        }
        return row.optionName.toLowerCase().includes(term);
      }
      return true;
    });
  }, [costRows, searchTerm, searchField]);

  const handleCostChange = (key: string, value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      setEditingCosts(prev => ({ ...prev, [key]: num }));
      setHasChanges(true);
    }
  };

  const getCostValue = (key: string, original: number): number => {
    return editingCosts[key] ?? original;
  };

  // 원가 저장: orders_raw의 cost_price 업데이트
  const handleSaveAll = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      const entries = Object.entries(editingCosts);
      let updated = 0;

      for (const [key, cost] of entries) {
        const [channel, productName, optionName] = key.split('::');

        // orders_raw에서 해당 제품+옵션의 cost_price 업데이트
        let query = db
          .from('orders_raw')
          .update({ cost_price: cost })
          .eq('channel', channel)
          .eq('product_name', productName);

        if (optionName && optionName !== '-') {
          query = query.eq('option_name', optionName);
        } else {
          query = query.or('option_name.is.null,option_name.eq.');
        }

        const { error: updateError } = await query;
        if (updateError) {
          console.error(`Update error for ${key}:`, updateError);
        } else {
          updated++;
        }
      }

      // profit 재계산 (total_price - cost_price * quantity)
      const { error: profitError } = await db.rpc('recalculate_order_profits');
      if (profitError) {
        // RPC 함수가 없으면 무시 - 나중에 SQL로 생성 가능
        console.warn('Profit recalculation RPC not available:', profitError.message);
      }

      // 로컬 상태 업데이트
      setCostRows(prev => prev.map(row => {
        const newCost = editingCosts[row.key];
        if (newCost !== undefined) {
          return { ...row, costPrice: newCost };
        }
        return row;
      }));

      setEditingCosts({});
      setHasChanges(false);
      alert(`${updated}개 항목의 원가가 저장되었습니다.`);
    } catch (err: any) {
      alert('저장 실패: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 엑셀 업로드 (CSV)
  const handleExcelUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        alert('파일에 데이터가 없습니다.');
        return;
      }

      // CSV 파싱: 제품명, 옵션명, 원가 컬럼 필요
      const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const productIdx = header.findIndex(h => h.includes('제품') || h.toLowerCase().includes('product'));
      const optionIdx = header.findIndex(h => h.includes('옵션') || h.toLowerCase().includes('option'));
      const costIdx = header.findIndex(h => h.includes('원가') || h.toLowerCase().includes('cost'));

      if (costIdx === -1) {
        alert('원가 컬럼을 찾을 수 없습니다. "원가" 또는 "cost" 컬럼이 필요합니다.');
        return;
      }

      let matched = 0;
      const newEdits: Record<string, number> = {};

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        const productName = productIdx >= 0 ? cols[productIdx] : '';
        const optionName = optionIdx >= 0 ? cols[optionIdx] : '-';
        const cost = parseInt(cols[costIdx]?.replace(/,/g, '') || '0', 10);

        if (!productName || cost <= 0) continue;

        // 매칭되는 행 찾기
        const matchingRow = costRows.find(r =>
          r.productName.includes(productName) &&
          (optionName === '-' || r.optionName.includes(optionName))
        );

        if (matchingRow) {
          newEdits[matchingRow.key] = cost;
          matched++;
        }
      }

      setEditingCosts(prev => ({ ...prev, ...newEdits }));
      setHasChanges(true);
      alert(`${matched}개 항목이 매칭되었습니다. '원가 저장하기'를 눌러 저장해주세요.`);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales-dashboard')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-blue-500" />
              원가 입력
            </h1>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p>- 제품 옵션들의 원가를 입력하고 정확한 공헌이익을 볼 수 있습니다.</p>
            <p>- '엑셀 파일 업로드' 방식으로도 원가를 업데이트할 수 있습니다.</p>
            <p>- 원가를 수정한 후 반드시 '원가 저장하기' 버튼을 눌러야 수정된 원가가 반영됩니다.</p>
          </div>
        </CardContent>
      </Card>

      {/* 검색/액션 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={searchField} onValueChange={(v) => setSearchField(v as typeof searchField)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_name">제품명</SelectItem>
              <SelectItem value="option_name">옵션명</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="입력 후 ENTER"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExcelUpload}>
            <Upload className="w-4 h-4 mr-1" />
            엑셀 파일 업로드
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={!hasChanges || isSaving}
            className={cn(hasChanges && 'bg-purple-600 hover:bg-purple-700')}
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            원가 저장하기
          </Button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 원가 테이블 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">주문 데이터에서 제품 목록을 추출하는 중...</p>
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-purple-50">
                    <TableHead className="w-32">판매채널</TableHead>
                    <TableHead className="w-20">브랜드</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>옵션명</TableHead>
                    <TableHead className="w-36 text-right">원가</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const cost = getCostValue(row.key, row.costPrice);
                    const isEdited = row.key in editingCosts;
                    const skuMatch = skuMap.get(row.productName.toLowerCase());

                    return (
                      <TableRow key={row.key} className="hover:bg-gray-50">
                        <TableCell className="text-sm">
                          {salesChannelLabels[row.channel] || row.channel}
                        </TableCell>
                        <TableCell className="text-sm">
                          {row.brand}
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px]">
                          <span className="truncate block" title={row.productName}>
                            {row.productName}
                          </span>
                          {skuMatch && (
                            <span className="text-xs text-blue-500">
                              SKU: {skuMatch.sku_code} (원가 {formatCurrency(skuMatch.cost_price)}원)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm max-w-[250px]">
                          <span className="truncate block" title={row.optionName}>
                            {row.optionName}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="text"
                            value={cost > 0 ? formatCurrency(cost) : '0'}
                            onChange={(e) => handleCostChange(row.key, e.target.value)}
                            className={cn(
                              'w-28 text-right ml-auto',
                              isEdited && 'border-blue-400 bg-blue-50',
                              cost === 0 && 'text-gray-400'
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              {costRows.length === 0 ? (
                <>
                  <p className="font-medium">주문 데이터가 없습니다</p>
                  <p className="text-sm mt-1">
                    매출 대시보드에서 채널 API를 연동하고 주문을 동기화해주세요.
                  </p>
                </>
              ) : (
                <p>검색 결과가 없습니다.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
