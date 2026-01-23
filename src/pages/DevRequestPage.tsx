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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    { key: 'in_progress' as const, label: '진행중', count: stats.byStatus.in_progress, icon: AlertCircle },
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
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            )}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs',
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
          <DialogTitle>{request ? '요청서 수정' : '새 개발 요청서'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>요청일</Label>
              <Input
                type="date"
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                required
              />
            </div>
            <div>
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
            <div>
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
            <div>
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

          <div>
            <Label>요청 제목</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="간단명료하게 요약"
              required
            />
          </div>

          <div>
            <Label>상세 내용</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="구체적인 요청사항, 현재 문제점, 기대 결과 등"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
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
            <div>
              <Label>희망 완료일</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
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

          <div>
            <Label>비고</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="추가 메모"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">
              {request ? '수정' : '등록'}
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
    getStats,
  } = useDevRequestStore();

  const [statusFilter, setStatusFilter] = useState<DevRequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [brandFilter, setBrandFilter] = useState<DevRequestBrand | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DevRequestPriority | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DevRequest | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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

  const handleEdit = (request: DevRequest) => {
    setEditingRequest(request);
    setIsModalOpen(true);
    setMenuOpenId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      await deleteRequest(id);
    }
    setMenuOpenId(null);
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
        <Button onClick={() => { setEditingRequest(null); setIsModalOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          요청 등록
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">전체 요청</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">대기중</p>
                <p className="text-2xl font-bold text-amber-600">{stats.byStatus.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">진행중</p>
                <p className="text-2xl font-bold text-blue-600">{stats.byStatus.in_progress}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">완료</p>
                <p className="text-2xl font-bold text-green-600">{stats.byStatus.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 요청자 검색..."
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
                <label className="text-xs font-medium text-gray-500 mb-1 block">브랜드</label>
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
                <label className="text-xs font-medium text-gray-500 mb-1 block">우선순위</label>
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
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">요청일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">요청자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">브랜드</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">제목</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">우선순위</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">희망완료일</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">완료일</th>
                  <th className="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      로딩중...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>등록된 요청이 없습니다</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-gray-50 group">
                      <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(req.request_date)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{req.requester}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-0.5 text-xs rounded',
                          req.brand === 'howpapa' ? 'bg-orange-100 text-orange-700' :
                          req.brand === 'nuccio' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {devRequestBrandLabels[req.brand]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {devRequestTypeLabels[req.request_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <p className="text-sm font-medium truncate">{req.title}</p>
                          {req.description && (
                            <p className="text-xs text-gray-500 truncate">{req.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 text-xs rounded', devRequestPriorityColors[req.priority])}>
                          {devRequestPriorityLabels[req.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(req.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-0.5 text-xs rounded', devRequestStatusColors[req.status])}>
                          {devRequestStatusLabels[req.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(req.completed_at)}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === req.id ? null : req.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {menuOpenId === req.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border py-1 z-20">
                                <button
                                  onClick={() => handleEdit(req)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDelete(req.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  삭제
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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
      {!isLoading && (
        <div className="text-sm text-gray-500 text-center">
          {filteredRequests.length === requests.length
            ? `총 ${filteredRequests.length}건의 요청`
            : `${filteredRequests.length}건 / 총 ${requests.length}건`}
        </div>
      )}

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
