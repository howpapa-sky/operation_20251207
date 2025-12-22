import { useState, useMemo } from 'react';
import { Search, Copy, Calendar, Tag, ChevronRight, Sparkles, FolderOpen } from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { useStore } from '../../store/useStore';
import { Project, ProjectType } from '../../types';
import {
  formatDate,
  statusLabels,
  statusColors,
  projectTypeLabels,
} from '../../utils/helpers';

interface ProjectImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectType: ProjectType;
  onImport: (project: Project) => void;
}

export default function ProjectImportModal({
  isOpen,
  onClose,
  projectType,
  onImport,
}: ProjectImportModalProps) {
  const { projects } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAllTypes, setShowAllTypes] = useState(false);

  // 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // 타입 필터링 (같은 타입만 또는 전체)
    if (!showAllTypes) {
      filtered = filtered.filter((p) => p.type === projectType);
    }

    // 검색어 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          ('brand' in p && p.brand?.toLowerCase().includes(query)) ||
          ('category' in p && p.category?.toLowerCase().includes(query)) ||
          ('productName' in p && p.productName?.toLowerCase().includes(query))
      );
    }

    // 최신순 정렬
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [projects, projectType, searchQuery, showAllTypes]);

  const handleImport = () => {
    if (selectedProject) {
      onImport(selectedProject);
      onClose();
      setSelectedProject(null);
      setSearchQuery('');
    }
  };

  const getProjectSubInfo = (project: Project) => {
    const info: string[] = [];
    if ('brand' in project && project.brand) {
      info.push(project.brand === 'howpapa' ? '하우파파' : '누씨오');
    }
    if ('category' in project && project.category) {
      info.push(project.category);
    }
    if ('productName' in project && project.productName) {
      info.push(project.productName);
    }
    if ('manufacturer' in project && project.manufacturer) {
      info.push(project.manufacturer);
    }
    return info.join(' · ');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="이전 프로젝트 가져오기"
      size="lg"
    >
      <div className="space-y-4">
        {/* 헤더 설명 */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 rounded-xl border border-primary-100">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">빠른 프로젝트 생성</p>
            <p className="text-xs text-gray-500 mt-0.5">
              이전에 등록한 프로젝트의 정보를 가져와서 새 프로젝트를 빠르게 생성하세요.
              <br />
              ID, 날짜, 상태 등은 제외하고 상세 정보만 복사됩니다.
            </p>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="프로젝트명, 브랜드, 카테고리로 검색..."
              className="input-field pl-10"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={showAllTypes}
              onChange={(e) => setShowAllTypes(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 whitespace-nowrap">모든 유형 보기</span>
          </label>
        </div>

        {/* 프로젝트 목록 */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">프로젝트가 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchQuery
                    ? '검색 조건을 변경해보세요'
                    : '먼저 프로젝트를 등록해주세요'}
                </p>
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const subInfo = getProjectSubInfo(project);

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`group relative p-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary-50 border-l-4 border-l-primary-500'
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* 선택 체크 */}
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? 'bg-primary-500 border-primary-500'
                            : 'border-gray-300 group-hover:border-primary-400'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* 프로젝트 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {showAllTypes && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                              {projectTypeLabels[project.type]}
                            </span>
                          )}
                          <span
                            className={`font-medium text-sm ${
                              isSelected ? 'text-primary-700' : 'text-gray-900'
                            }`}
                          >
                            {project.title}
                          </span>
                        </div>

                        {subInfo && (
                          <p className="text-xs text-gray-500 truncate mb-2">{subInfo}</p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${statusColors[project.status]} text-xs`}>
                            {statusLabels[project.status]}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {formatDate(project.createdAt)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        className={`w-5 h-5 flex-shrink-0 transition-all ${
                          isSelected
                            ? 'text-primary-500 translate-x-1'
                            : 'text-gray-300 group-hover:text-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 선택된 프로젝트 미리보기 */}
        {selectedProject && (
          <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
            <div className="flex items-center gap-2 mb-2">
              <Copy className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">가져올 프로젝트</span>
            </div>
            <p className="text-sm text-gray-700 font-medium">{selectedProject.title}</p>
            <p className="text-xs text-gray-500 mt-1">{getProjectSubInfo(selectedProject)}</p>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            취소
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedProject}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-4 h-4" />
            가져오기
          </button>
        </div>
      </div>
    </Modal>
  );
}
