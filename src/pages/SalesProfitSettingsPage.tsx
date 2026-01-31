import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  ArrowLeft,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calculator,
  Receipt,
  Wallet,
  Save,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfitSettingsStore } from '@/store/profitSettingsStore';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

export default function SalesProfitSettingsPage() {
  const navigate = useNavigate();
  const {
    settings,
    setVatEnabled,
    setVatRate,
    addVariableCost,
    updateVariableCost,
    removeVariableCost,
    addFixedCost,
    updateFixedCost,
    removeFixedCost,
    setFixedCostVatEnabled,
  } = useProfitSettingsStore();

  // New variable cost form
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<'rate' | 'fixed_per_order'>('rate');
  const [newVarValue, setNewVarValue] = useState('');

  // New fixed cost form
  const [newFixedName, setNewFixedName] = useState('');
  const [newFixedAmount, setNewFixedAmount] = useState('');

  const handleAddVariableCost = () => {
    if (!newVarName || !newVarValue) return;
    addVariableCost({
      name: newVarName,
      type: newVarType,
      value: parseFloat(newVarValue),
      isActive: true,
    });
    setNewVarName('');
    setNewVarValue('');
  };

  const handleAddFixedCost = () => {
    if (!newFixedName || !newFixedAmount) return;
    addFixedCost({
      name: newFixedName,
      monthlyAmount: parseInt(newFixedAmount.replace(/,/g, ''), 10),
      isActive: true,
    });
    setNewFixedName('');
    setNewFixedAmount('');
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sales-dashboard')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7 text-orange-500" />
            이익 설정
          </h1>
          <p className="text-gray-500 mt-1">3단계 이익 분석을 위한 VAT, 변동비, 고정비를 설정합니다</p>
        </div>
      </div>

      <Tabs defaultValue="vat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vat" className="flex items-center gap-1">
            <Receipt className="w-4 h-4" />
            부가세 설정
          </TabsTrigger>
          <TabsTrigger value="variable" className="flex items-center gap-1">
            <Calculator className="w-4 h-4" />
            변동판관비
          </TabsTrigger>
          <TabsTrigger value="fixed" className="flex items-center gap-1">
            <Wallet className="w-4 h-4" />
            고정판관비
          </TabsTrigger>
        </TabsList>

        {/* === VAT 설정 === */}
        <TabsContent value="vat">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" />
                부가세 (VAT) 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* VAT 활성화 토글 */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">부가세 적용</p>
                  <p className="text-sm text-gray-500 mt-1">
                    매출총이익 계산 시 결제금액에서 부가세를 차감합니다
                  </p>
                </div>
                <button
                  onClick={() => setVatEnabled(!settings.vatEnabled)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors',
                    settings.vatEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {settings.vatEnabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  {settings.vatEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* VAT Rate */}
              {settings.vatEnabled && (
                <div className="flex items-center gap-4">
                  <Label className="w-32">부가세율 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">
                    (VAT = 결제금액 x {settings.vatRate}% / (100% + {settings.vatRate}%))
                  </span>
                </div>
              )}

              {/* 고정비 VAT */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">고정비 VAT</p>
                  <p className="text-sm text-gray-500 mt-1">
                    고정판관비에 대한 부가세를 순이익 계산에 반영합니다
                  </p>
                </div>
                <button
                  onClick={() => setFixedCostVatEnabled(!settings.fixedCostVatEnabled)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors',
                    settings.fixedCostVatEnabled
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                  )}
                >
                  {settings.fixedCostVatEnabled ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  {settings.fixedCostVatEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* 계산 공식 */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-700 mb-2">매출총이익 계산 공식</p>
                <p className="text-sm text-blue-600 font-mono">
                  매출총이익 = 결제금액 - 매출원가{settings.vatEnabled ? ' - 부가세' : ''}
                </p>
                {settings.vatEnabled && (
                  <p className="text-xs text-blue-500 mt-1">
                    부가세 = 결제금액 x {settings.vatRate} / (100 + {settings.vatRate})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 변동판관비 === */}
        <TabsContent value="variable">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-500" />
                변동판관비 항목
                <Badge variant="secondary">{settings.variableCosts.length}개</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기존 항목 */}
              {settings.variableCosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <button
                    onClick={() => updateVariableCost(item.id, { isActive: !item.isActive })}
                    className={cn(
                      'flex-shrink-0',
                      item.isActive ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {item.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <Input
                    value={item.name}
                    onChange={(e) => updateVariableCost(item.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <Badge variant="outline" className="flex-shrink-0">
                    {item.type === 'rate' ? '매출 비율' : '건당 금액'}
                  </Badge>
                  <Input
                    type="number"
                    step="0.1"
                    value={item.value}
                    onChange={(e) => updateVariableCost(item.id, { value: parseFloat(e.target.value) || 0 })}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-gray-500 w-8">
                    {item.type === 'rate' ? '%' : '원'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariableCost(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* 새 항목 추가 */}
              <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg">
                <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="항목명 (예: 포장비)"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  className="flex-1"
                />
                <Select value={newVarType} onValueChange={(v) => setNewVarType(v as 'rate' | 'fixed_per_order')}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rate">매출 비율</SelectItem>
                    <SelectItem value="fixed_per_order">건당 금액</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="값"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  className="w-24 text-right"
                />
                <span className="text-sm text-gray-500 w-8">
                  {newVarType === 'rate' ? '%' : '원'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddVariableCost}
                  disabled={!newVarName || !newVarValue}
                >
                  추가
                </Button>
              </div>

              {/* 계산 공식 */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-2">공헌이익 계산 공식</p>
                <p className="text-sm text-green-600 font-mono">
                  공헌이익 = 매출총이익 - 배송비 - 수수료 - 광고비 - 변동판관비
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === 고정판관비 === */}
        <TabsContent value="fixed">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-orange-500" />
                고정판관비 항목
                <Badge variant="secondary">{settings.fixedCosts.length}개</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 기존 항목 */}
              {settings.fixedCosts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <button
                    onClick={() => updateFixedCost(item.id, { isActive: !item.isActive })}
                    className={cn(
                      'flex-shrink-0',
                      item.isActive ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {item.isActive ? (
                      <ToggleRight className="w-5 h-5" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  <Input
                    value={item.name}
                    onChange={(e) => updateFixedCost(item.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    value={formatCurrency(item.monthlyAmount)}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/,/g, ''), 10);
                      if (!isNaN(num)) updateFixedCost(item.id, { monthlyAmount: num });
                    }}
                    className="w-36 text-right"
                  />
                  <span className="text-sm text-gray-500">원/월</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFixedCost(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {/* 새 항목 추가 */}
              <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg">
                <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <Input
                  placeholder="항목명 (예: 임대료, 인건비)"
                  value={newFixedName}
                  onChange={(e) => setNewFixedName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="text"
                  placeholder="월 금액"
                  value={newFixedAmount}
                  onChange={(e) => setNewFixedAmount(e.target.value)}
                  className="w-36 text-right"
                />
                <span className="text-sm text-gray-500">원/월</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddFixedCost}
                  disabled={!newFixedName || !newFixedAmount}
                >
                  추가
                </Button>
              </div>

              {/* 월 합계 */}
              {settings.fixedCosts.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-sm font-medium text-orange-700">월 고정비 합계</span>
                  <span className="text-lg font-bold text-orange-700">
                    {formatCurrency(
                      settings.fixedCosts
                        .filter(f => f.isActive)
                        .reduce((sum, f) => sum + f.monthlyAmount, 0)
                    )}원
                  </span>
                </div>
              )}

              {/* 계산 공식 */}
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-700 mb-2">순이익 계산 공식</p>
                <p className="text-sm text-orange-600 font-mono">
                  순이익 = 공헌이익 - 고정판관비(일할) - 고정비VAT
                </p>
                <p className="text-xs text-orange-500 mt-1">
                  일할 = 월 고정비 / 30 x 조회기간 일수
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
