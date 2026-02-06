import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  FileText,
  Search,
  Calendar,
  Download,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SalesChannel, salesChannelLabels } from '@/types/ecommerce';
import { cn } from '@/lib/utils';

const db = supabase as any;

interface OrderRow {
  id: string;
  order_date: string;
  order_id: string;
  order_status: string | null;
  channel: SalesChannel;
  product_name: string | null;
  option_name: string | null;
  unit_price: number;
  total_price: number;
  quantity: number;
}

function deriveBrand(productName: string | null): string {
  if (!productName) return '-';
  const lower = productName.toLowerCase();
  if (lower.includes('하우파파') || lower.includes('howpapa')) return '하우파파';
  if (lower.includes('누치오') || lower.includes('누씨오') || lower.includes('nucio')) return '누씨오';
  return '-';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(value));
}

function getStatusBadge(status: string | null) {
  if (!status) return <Badge variant="secondary">-</Badge>;
  const upper = status.toUpperCase();
  if (upper.includes('CANCEL') || upper.includes('취소')) {
    return <Badge variant="destructive">CANCEL</Badge>;
  }
  if (upper === 'N00' || upper === '정상' || upper.includes('NORMAL')) {
    return <Badge variant="default">정상</Badge>;
  }
  return <Badge variant="secondary">{status}</Badge>;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function OrdersListPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [channelFilter, setChannelFilter] = useState<SalesChannel | 'all'>('all');
  const [searchField, setSearchField] = useState<'product_name' | 'order_id' | 'option_name'>('product_name');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = db
        .from('orders_raw')
        .select('id, order_date, order_id, order_status, channel, product_name, option_name, unit_price, total_price, quantity', { count: 'exact' })
        .gte('order_date', startDate)
        .lte('order_date', endDate)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }

      if (searchTerm) {
        query = query.ilike(searchField, `%${searchTerm}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: err, count } = await query;

      if (err) throw err;

      setOrders(data || []);
      setTotalCount(count ?? 0);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.message || '주문 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}건의 주문을 삭제하시겠습니까?`)) return;

    try {
      const ids = Array.from(selectedIds);
      const { error: err } = await db
        .from('orders_raw')
        .delete()
        .in('id', ids);

      if (err) throw err;

      setSelectedIds(new Set());
      fetchOrders();
    } catch (err: any) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // Excel download (CSV)
  const handleExcelDownload = () => {
    if (orders.length === 0) return;

    const headers = ['날짜', '주문서ID', '주문상태', '브랜드', '채널', '제품명', '옵션명', '매출', '결제', '수량'];
    const rows = orders.map(o => [
      o.order_date,
      o.order_id,
      o.order_status || '정상',
      deriveBrand(o.product_name),
      salesChannelLabels[o.channel] || o.channel,
      o.product_name || '',
      o.option_name || '',
      o.total_price,
      o.total_price,
      o.quantity,
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `주문내역_${startDate}_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-7 h-7 text-purple-500" />
          주문서
        </h1>
        <div className="flex items-center gap-3">
          {/* 채널 필터 */}
          <Select
            value={channelFilter}
            onValueChange={(v) => setChannelFilter(v as SalesChannel | 'all')}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="전체 (연동한 모든 데이터)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 (연동한 모든 데이터)</SelectItem>
              {Object.entries(salesChannelLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 날짜 범위 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-gray-400">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
      </div>

      {/* 검색/액션 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={searchField} onValueChange={(v) => setSearchField(v as typeof searchField)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_name">제품명</SelectItem>
                  <SelectItem value="order_id">주문서ID</SelectItem>
                  <SelectItem value="option_name">옵션명</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="검색 (대, 소문자 구분)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-64"
              />
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-1" />
                검색
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExcelDownload} disabled={orders.length === 0}>
                <Download className="w-4 h-4 mr-1" />
                엑셀 다운로드
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 에러 */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-purple-50">
                  <TableHead className="w-32">날짜</TableHead>
                  <TableHead className="w-36">주문서 ID</TableHead>
                  <TableHead className="w-20">주문상태</TableHead>
                  <TableHead className="w-20">브랜드</TableHead>
                  <TableHead className="w-32">채널</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead>옵션명</TableHead>
                  <TableHead className="w-24 text-right">매출</TableHead>
                  <TableHead className="w-24 text-right">결제</TableHead>
                  <TableHead className="w-16 text-right">수량</TableHead>
                  <TableHead className="w-12 text-center">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedIds.size === orders.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-500">불러오는 중...</p>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                      주문 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="text-sm text-gray-600">
                        {order.order_date}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-gray-700">
                        {order.order_id}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.order_status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {deriveBrand(order.product_name)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {salesChannelLabels[order.channel] || order.channel}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={order.product_name || ''}>
                        {order.product_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate" title={order.option_name || ''}>
                        {order.option_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(order.total_price)}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {formatCurrency(order.total_price)}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          총 {formatCurrency(totalCount)}건
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = startPage + i;
              if (p > totalPages) return null;
              return (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n}개씩 보기</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
