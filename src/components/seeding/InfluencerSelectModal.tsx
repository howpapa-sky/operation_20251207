import { useState, useEffect, useMemo } from 'react';
import { X, Search, Users, Check, ExternalLink } from 'lucide-react';
import { SeedingInfluencer, SeedingProject, seedingStatusLabels } from '../../types';
import { useSeedingStore } from '../../store/seedingStore';

interface InfluencerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (influencer: SeedingInfluencer, project: SeedingProject | null) => void;
}

export default function InfluencerSelectModal({
  isOpen,
  onClose,
  onSelect,
}: InfluencerSelectModalProps) {
  const { projects, influencers, fetchProjects, fetchInfluencers } = useSeedingStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInfluencer, setSelectedInfluencer] = useState<SeedingInfluencer | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen, fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchInfluencers(selectedProjectId);
    }
  }, [selectedProjectId, fetchInfluencers]);

  // 프로젝트 선택 시 첫 번째 프로젝트 자동 선택
  useEffect(() => {
    if (isOpen && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [isOpen, projects, selectedProjectId]);

  // 필터링된 인플루언서
  const filteredInfluencers = useMemo(() => {
    if (!searchQuery) return influencers;
    const query = searchQuery.toLowerCase();
    return influencers.filter(
      (inf) =>
        inf.account_id.toLowerCase().includes(query) ||
        inf.account_name?.toLowerCase().includes(query)
    );
  }, [influencers, searchQuery]);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || null;

  const handleSelect = () => {
    if (selectedInfluencer) {
      onSelect(selectedInfluencer, currentProject);
      onClose();
      // Reset state
      setSelectedInfluencer(null);
      setSearchQuery('');
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedInfluencer(null);
    setSearchQuery('');
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">인플루언서 선택</h2>
                <p className="text-sm text-gray-500">변수를 치환할 인플루언서를 선택하세요</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Project Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.brand === 'howpapa' ? '하우파파' : '누씨오'})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="계정 또는 이름 검색..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
            </div>

            {/* Influencer List */}
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl">
              {filteredInfluencers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">인플루언서가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredInfluencers.map((influencer) => (
                    <button
                      key={influencer.id}
                      onClick={() => setSelectedInfluencer(influencer)}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                        selectedInfluencer?.id === influencer.id
                          ? 'bg-primary-50 border-l-4 border-primary-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {influencer.account_id.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            @{influencer.account_id.replace('@', '')}
                          </span>
                          {influencer.profile_url && (
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {influencer.account_name && (
                            <span>{influencer.account_name}</span>
                          )}
                          <span>•</span>
                          <span>{formatFollowers(influencer.follower_count)} 팔로워</span>
                          <span>•</span>
                          <span className={`${
                            influencer.status === 'completed' ? 'text-green-600' :
                            influencer.status === 'rejected' ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {seedingStatusLabels[influencer.status]}
                          </span>
                        </div>
                      </div>

                      {/* Selected Check */}
                      {selectedInfluencer?.id === influencer.id && (
                        <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-between">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              취소
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedInfluencer}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              선택하고 복사
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
