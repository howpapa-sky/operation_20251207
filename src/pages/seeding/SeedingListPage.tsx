import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, Filter } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';

export default function SeedingListPage() {
  const { projectId } = useParams();
  const { influencers, projects, isLoading, fetchInfluencers, fetchProjects } = useSeedingStore();

  useEffect(() => {
    fetchProjects();
    fetchInfluencers(projectId);
  }, [projectId, fetchInfluencers, fetchProjects]);

  const currentProject = projectId ? projects.find(p => p.id === projectId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentProject ? currentProject.name : '시딩 리스트'}
            </h1>
            <p className="text-sm text-gray-500">
              {currentProject
                ? `${currentProject.product_name} 시딩 인플루언서 목록`
                : '전체 인플루언서 시딩 현황'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            필터
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="w-4 h-4" />
            인플루언서 추가
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : influencers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 인플루언서가 없습니다</h3>
            <p className="text-gray-500 mb-4">시딩할 인플루언서를 추가하세요.</p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" />
              인플루언서 추가
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {influencers.length}명 인플루언서 (상세 UI 준비 중)
          </div>
        )}
      </div>
    </div>
  );
}
