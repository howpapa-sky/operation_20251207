import { useEffect } from 'react';
import { Package, Truck, Search } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';

export default function ShippingPage() {
  const { influencers, isLoading, fetchInfluencers } = useSeedingStore();

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  // 배송 관련 상태인 인플루언서만 필터링
  const shippingInfluencers = influencers.filter(
    (inf) => inf.status === 'accepted' || inf.status === 'shipped'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">배송 관리</h1>
            <p className="text-sm text-gray-500">제품 발송 및 송장 관리</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="인플루언서 검색..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {influencers.filter((i) => i.status === 'accepted').length}
          </div>
          <div className="text-sm text-gray-500">발송 대기</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-2xl font-bold text-amber-600">
            {influencers.filter((i) => i.status === 'shipped').length}
          </div>
          <div className="text-sm text-gray-500">배송 중</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-2xl font-bold text-green-600">
            {influencers.filter((i) => i.shipping?.delivered_at).length}
          </div>
          <div className="text-sm text-gray-500">배송 완료</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            {influencers.reduce((sum, i) => sum + (i.shipping?.quantity || 0), 0)}
          </div>
          <div className="text-sm text-gray-500">총 발송 수량</div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : shippingInfluencers.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">배송할 항목이 없습니다</h3>
            <p className="text-gray-500">수락된 인플루언서가 있으면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {shippingInfluencers.length}건 배송 관리 (상세 UI 준비 중)
          </div>
        )}
      </div>
    </div>
  );
}
