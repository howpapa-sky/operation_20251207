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
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductMasterStore } from '@/store/useProductMasterStore';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function SalesCostInputPage() {
  const navigate = useNavigate();
  const { products, updateProduct, updateOption } = useProductMasterStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // 제품+옵션을 플랫 리스트로 변환
  const costRows = useMemo(() => {
    const rows: Array<{
      productId: string;
      optionId?: string;
      brand: string;
      productName: string;
      optionName: string;
      costPrice: number;
      sellingPrice: number;
      key: string;
    }> = [];

    products
      .filter(p => p.isActive)
      .forEach(product => {
        if (product.options && product.options.length > 0) {
          product.options.forEach(option => {
            rows.push({
              productId: product.id,
              optionId: option.id,
              brand: product.brand,
              productName: product.name,
              optionName: option.name,
              costPrice: product.costPrice,
              sellingPrice: product.sellingPrice + (option.additionalPrice || 0),
              key: `${product.id}::${option.id}`,
            });
          });
        } else {
          rows.push({
            productId: product.id,
            brand: product.brand,
            productName: product.name,
            optionName: '-',
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            key: product.id,
          });
        }
      });

    return rows;
  }, [products]);

  // 필터링
  const filteredRows = useMemo(() => {
    return costRows.filter(row => {
      if (brandFilter !== 'all' && row.brand !== brandFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          row.productName.toLowerCase().includes(term) ||
          row.optionName.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [costRows, brandFilter, searchTerm]);

  const handleCostChange = (key: string, value: string) => {
    const num = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(num) && num >= 0) {
      setEditingCosts(prev => ({ ...prev, [key]: num }));
      setHasChanges(true);
    }
  };

  const handleSaveAll = () => {
    // 제품별로 마지막 수정된 원가를 적용 (옵션 단위 원가는 제품 수준으로 저장)
    const productCosts = new Map<string, number>();
    Object.entries(editingCosts).forEach(([key, cost]) => {
      const productId = key.split('::')[0];
      productCosts.set(productId, cost);
    });
    productCosts.forEach((cost, productId) => {
      updateProduct(productId, { costPrice: cost });
    });
    setEditingCosts({});
    setHasChanges(false);
  };

  const getCostValue = (key: string, original: number): number => {
    return editingCosts[key] ?? original;
  };

  const brandLabels: Record<string, string> = {
    howpapa: '하우파파',
    nuccio: '누치오',
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
            <p className="text-gray-500 mt-1">제품별 옵션별 원가를 입력하여 이익을 정확하게 계산합니다</p>
          </div>
        </div>
        {hasChanges && (
          <Button onClick={handleSaveAll}>
            <Save className="w-4 h-4 mr-2" />
            변경사항 저장
          </Button>
        )}
      </div>

      {/* 필터 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="제품명 또는 옵션명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-32">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 브랜드</SelectItem>
                <SelectItem value="howpapa">하우파파</SelectItem>
                <SelectItem value="nuccio">누치오</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 원가 테이블 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              제품 원가 목록
            </span>
            <Badge variant="secondary">{filteredRows.length}개 항목</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredRows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">브랜드</TableHead>
                    <TableHead>제품명</TableHead>
                    <TableHead>옵션명</TableHead>
                    <TableHead className="w-36 text-right">판매가</TableHead>
                    <TableHead className="w-36 text-right">원가</TableHead>
                    <TableHead className="w-24 text-right">마진율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const cost = getCostValue(row.key, row.costPrice);
                    const margin = row.sellingPrice > 0
                      ? ((row.sellingPrice - cost) / row.sellingPrice) * 100
                      : 0;
                    const isEdited = row.key in editingCosts;

                    return (
                      <TableRow key={row.key}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              row.brand === 'howpapa'
                                ? 'border-orange-300 text-orange-600'
                                : 'border-green-300 text-green-600'
                            )}
                          >
                            {brandLabels[row.brand] || row.brand}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{row.productName}</TableCell>
                        <TableCell className="text-gray-500">{row.optionName}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.sellingPrice)}원
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="text"
                            value={formatCurrency(cost)}
                            onChange={(e) => handleCostChange(row.key, e.target.value)}
                            className={cn(
                              'w-28 text-right ml-auto',
                              isEdited && 'border-blue-400 bg-blue-50'
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            margin >= 30 ? 'text-green-600' :
                            margin >= 15 ? 'text-orange-600' :
                            'text-red-600'
                          )}>
                            {margin.toFixed(1)}%
                          </span>
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
              {products.length === 0 ? (
                <>
                  <p className="font-medium">등록된 제품이 없습니다</p>
                  <p className="text-sm mt-1">
                    제품 관리 페이지에서 제품을 먼저 등록해주세요.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/products')}
                  >
                    제품 관리로 이동
                  </Button>
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
