import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  X,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  MoreHorizontal,
  Edit2,
  Trash2,
  Calendar,
  ArrowRight,
  User,
  Tag,
  MessageSquare,
  ChevronRight,
  Play,
  XCircle,
} from 'lucide-react';
import { useDevRequestStore } from '../store/devRequestStore';
import { useStore } from '../store/useStore';
import {
  DevRequest,
  DevRequestStatus,
  DevRequestPriority,
  DevRequestBrand,
  DevRequestType,
  devRequestStatusLabels,
  devRequestStatusColors,
  devRequestPriorityLabels,
  devRequestPriorityColors,
  devRequestBrandLabels,
  devRequestTypeLabels,
} from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// 상태 탭 컴포넌트
function StatusTabs({
  stats,
  activeStatus,
  onChange,
}: {
  stats: { byStatus: Record<DevRequestStatus, number>; total: number };
  activeStatus: DevRequestStatus | 'all';
  onChange: (status: DevRequestStatus | 'all') => void;
}) {
  const tabs = [
    { key: 'all' as const, label: '전체', count: stats.total, icon: FileText },
    { key: 'pending' as const, label: '대기', count: stats.byStatus.pending, icon: Clock },
    { key: 'in_progress' as const, label: '진행중', count: stats.byStatus.in_progress, icon: Play },
    { key: 'completed' as const, label: '완료', count: stats.byStatus.completed, icon: CheckCircle2 },
    { key: 'on_hold' as const, label: '보류', count: stats.byStatus.on_hold, icon: Pause },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeStatus === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-semibold',
                isActive ? 'bg-white/20' : 'bg-gray-100'
              )}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 상세보기 패널
function DetailPanel({
  request,
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  request: DevRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: DevRequestStatus) => void;
  onDelete: () => void;
}) {
  if (!request) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const statusActions = [
    { status: 'pending' as const, label: '대기로 변경', icon: Clock },
    { status: 'in_progress' as const, label: '진행 시작', icon: Play },
    { status: 'completed' as const, label: '완료 처리', icon: CheckCircle2 },
    { status: 'on_hold' as const, label: '보류 처리', icon: Pause },
  ].filter(action => action.status !== request.status);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl">{request.title}</SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{request.requester}</span>
                <span className="text-gray-300">|</span>
                <Calendar className="w-4 h-4" />
                <span>{formatDate(request.request_date)}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* 상태 & 우선순위 */}
          <div className="flex items-center gap-3">
            <Badge className={cn('text-sm', devRequestStatusColors[request.status])}>
              {devRequestStatusLabels[request.status]}
            </Badge>
            <Badge className={cn('text-sm', devRequestPriorityColors[request.priority])}>
              {devRequestPriorityLabels[request.priority]}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {devRequestBrandLabels[request.brand]}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {devRequestTypeLabels[request.request_type]}
            </Badge>
          </div>

          {/* 빠른 상태 변경 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">빠른 상태 변경</label>
            <div className="flex flex-wrap gap-2">
              {statusActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.status}
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(action.status)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 상세 내용 */}
          {request.description && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                상세 내용
              </label>
              <div className="p-4 bg-gray-50 rounded-lg text-sm whitespace-pre-wrap">
                {request.description}
              </div>
            </div>
          )}

          {/* 일정 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase">희망 완료일</label>
              <p className="text-sm font-medium">{formatDate(request.due_date)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 uppercase">완료일</label>
              <p className="text-sm font-medium">{formatDate(request.completed_at)}</p>
            </div>
          </div>

          {/* 비고 */}
          {request.notes && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">비고</label>
              <div className="p-4 bg-amber-50 rounded-lg text-sm border border-amber-200">
                {request.notes}
              </div>
            </div>
          )}

          {/* 메타 정보 */}
          <div className="pt-4 border-t text-xs text-gray-400 space-y-1">
            <p>생성: {formatDate(request.created_at)}</p>
            <p>수정: {formatDate(request.updated_at)}</p>
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-between">
          <Button variant="destructive" size="sm" onClick={onDelete} className="gap-2">
            <Trash2 className="w-4 h-4" />
            삭제
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Edit2 className="w-4 h-4" />
            수정하기
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 요청서 추가/수정 모달
function DevRequestModal({
  isOpen,
  onClose,
  request,
  onSave,
  currentUserName,
}: {
  isOpen: boolean;
  onClose: () => void;
  request?: DevRequest | null;
  onSave: (data: Omit<DevRequest, 'id' | 'created_at' | 'updated_at'>) => void;
  currentUserName?: string;
}) {
  const [formData, setFormData] = useState({
    request_date: new Date().toISOString().split('T')[0],
    requester: currentUserName || '',
    brand: 'common' as DevRequestBrand,
    request_type: 'feature' as DevRequestType,
    title: '',
    description: '',
    priority: 'normal' as DevRequestPriority,
    due_date: '',
    status: 'pending' as DevRequestStatus,
    notes: '',
  });

  useEffect(() => {
    if (request) {
      setFormData({
        request_date: request.request_date,
        requester: request.requester,
        brand: request.brand,
        request_type: request.request_type,
        title: request.title,
        description: request.description || '',
        priority: request.priority,
        due_date: request.due_date || '',
        status: request.status,
        notes: request.notes || '',
      });
    } else {
      setFormData({
        request_date: new Date().toISOString().split('T')[0],
        requester: currentUserName || '',
        brand: 'common',
        request_type: 'feature',
        title: '',
        description: '',
        priority: 'normal',
        due_date: '',
        status: 'pending',
        notes: '',
      });
    }
  }, [request, isOpen, currentUserName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      due_date: formData.due_date || undefined,
      notes: formData.notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {request ? '요청서 수정' : '새 개발 요청서'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>요청일</Label>
              <Input
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>요청자</Label>
              <Input
                value={formData.requester}
                onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                placeholder="이름"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>브랜드</Label>
              <Select
                value={formData.brand}
                onValueChange={(value) => setFormData({ ...formData, brand: value as DevRequestBrand })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(devRequestBrandLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>요청 유형</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value as DevRequestType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(devRequestTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>요청 제목 *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="간단명료하게 요약"
              required
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>상세 내용</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="구체적인 요청사항, 현재 문제점, 기대 결과 등"
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>우선순위</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as DevRequestPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(devRequestPriorityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>희망 완료일</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>처리 상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as DevRequestStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(devRequestStatusLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>비고</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="추가 메모"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" className="px-8">
              {request ? '수정 완료' : '등록'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DevRequestPage() {
  const { user } = useStore();
  const {
    requests,
    isLoading,
    fetchRequests,
    addRequest,
    updateRequest,
    deleteRequest,
    updateStatus,
    getStats,
  } = useDevRequestStore();

  const [statusFilter, setStatusFilter] = useState<DevRequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [brandFilter, setBrandFilter] = useState<DevRequestBrand | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DevRequestPriority | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DevRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DevRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = useMemo(() => getStats(), [requests, getStats]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (brandFilter !== 'all' && req.brand !== brandFilter) return false;
      if (priorityFilter !== 'all' && req.priority !== priorityFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.title.toLowerCase().includes(query) ||
          req.requester.toLowerCase().includes(query) ||
          req.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [requests, statusFilter, brandFilter, priorityFilter, searchQuery]);

  const handleSave = async (data: Omit<DevRequest, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRequest) {
      await updateRequest(editingRequest.id, data);
    } else {
      await addRequest(data);
    }
    setEditingRequest(null);
  };

  const handleRowClick = (request: DevRequest) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);
  };

  const handleEdit = (request: DevRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingRequest(request);
    setIsModalOpen(true);
    setIsDetailOpen(false);
  };

  const handleDelete = async (request: DevRequest, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(`"${request.title}" 요청을 삭제하시겠습니까?`)) {
      await deleteRequest(request.id);
      setIsDetailOpen(false);
      setSelectedRequest(null);
    }
  };

  const handleStatusChange = async (id: string, status: DevRequestStatus) => {
    await updateStatus(id, status);
    // 상세보기에서 변경된 경우 업데이트
    if (selectedRequest?.id === id) {
      const updated = requests.find(r => r.id === id);
      if (updated) setSelectedRequest({ ...updated, status });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const hasActiveFilters = brandFilter !== 'all' || priorityFilter !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">개발 요청서</h1>
          <p className="text-gray-500 mt-1">하우파파 업무시스템 개발 요청 관리</p>
        </div>
        <Button onClick={() => { setEditingRequest(null); setIsModalOpen(true); }} size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          요청 등록
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">전체 요청</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">대기중</p>
                <p className="text-3xl font-bold mt-1 text-amber-600">{stats.byStatus.pending}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">진행중</p>
                <p className="text-3xl font-bold mt-1 text-blue-600">{stats.byStatus.in_progress}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Play className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">완료</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{stats.byStatus.completed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Tabs */}
      <StatusTabs stats={stats} activeStatus={statusFilter} onChange={setStatusFilter} />

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 요청자, 내용 검색..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters || hasActiveFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                필터
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">ON</span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBrandFilter('all');
                    setPriorityFilter('all');
                    setSearchQuery('');
                    setShowFilters(false);
                  }}
                  className="gap-1 text-gray-500"
                >
                  <X className="w-4 h-4" />
                  초기화
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="flex gap-4 mt-4 pt-4 border-t">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">브랜드</label>
                <Select value={brandFilter} onValueChange={(v) => setBrandFilter(v as DevRequestBrand | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.entries(devRequestBrandLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">우선순위</label>
                <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as DevRequestPriority | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.entries(devRequestPriorityLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">요청일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">요청자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">브랜드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[250px]">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">우선순위</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">희망완료일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">완료일</th>
                  <th className="w-14 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500">로딩중...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">등록된 요청이 없습니다</p>
                      <p className="text-sm mt-1">새로운 개발 요청을 등록해보세요</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req, index) => (
                    <tr
                      key={req.id}
                      onClick={() => handleRowClick(req)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3.5 text-sm text-gray-400 font-medium">{index + 1}</td>
                      <td className="px-4 py-3.5 text-sm">{formatDate(req.request_date)}</td>
                      <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{req.requester}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full',
                          req.brand === 'howpapa' ? 'bg-orange-100 text-orange-700' :
                          req.brand === 'nuccio' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {devRequestBrandLabels[req.brand]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          {devRequestTypeLabels[req.request_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                            {req.description && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{req.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', devRequestPriorityColors[req.priority])}>
                          {devRequestPriorityLabels[req.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{formatDate(req.due_date)}</td>
                      <td className="px-4 py-3.5">
                        <span className={cn('px-2.5 py-1 text-xs font-medium rounded-full', devRequestStatusColors[req.status])}>
                          {devRequestStatusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{formatDate(req.completed_at)}</td>
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(req); }}>
                              <FileText className="w-4 h-4 mr-2" />
                              상세보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleEdit(req, e)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {req.status !== 'in_progress' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, 'in_progress'); }}>
                                <Play className="w-4 h-4 mr-2" />
                                진행 시작
                              </DropdownMenuItem>
                            )}
                            {req.status !== 'completed' && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(req.id, 'completed'); }}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                완료 처리
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(req, e)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Result Count */}
      {!isLoading && filteredRequests.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          {filteredRequests.length === requests.length
            ? `총 ${filteredRequests.length}건의 요청`
            : `${filteredRequests.length}건 / 총 ${requests.length}건`}
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        request={selectedRequest}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedRequest(null); }}
        onEdit={() => selectedRequest && handleEdit(selectedRequest)}
        onStatusChange={(status) => selectedRequest && handleStatusChange(selectedRequest.id, status)}
        onDelete={() => selectedRequest && handleDelete(selectedRequest)}
      />

      {/* Modal */}
      <DevRequestModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRequest(null); }}
        request={editingRequest}
        onSave={handleSave}
        currentUserName={user?.name}
      />
    </div>
  );
}
