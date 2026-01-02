import { useEffect } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';

export default function SeedingProjectsPage() {
  const { projects, isLoading, fetchProjects } = useSeedingStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시딩 프로젝트</h1>
            <p className="text-sm text-gray-500">제품별 인플루언서 시딩 캠페인 관리</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-4 h-4" />
          새 프로젝트
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 프로젝트가 없습니다</h3>
            <p className="text-gray-500 mb-4">첫 번째 시딩 프로젝트를 만들어보세요.</p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Plus className="w-4 h-4" />
              프로젝트 만들기
            </button>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {projects.length}개 프로젝트 (상세 UI 준비 중)
          </div>
        )}
      </div>
    </div>
  );
}
