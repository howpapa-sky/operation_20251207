import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  User,
  Clock,
  Star,
  FileText,
} from 'lucide-react';
import { useState } from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import SamplingEmailGenerator from './SamplingEmailGenerator';
import ProjectScheduleManager from './ProjectScheduleManager';
import { Project, SamplingProject } from '../../types';
import { useStore } from '../../store/useStore';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getDdayText,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  brandLabels,
  projectTypeLabels,
  calculateProgress,
} from '../../utils/helpers';

interface ProjectDetailProps {
  project: Project;
}

export default function ProjectDetail({ project }: ProjectDetailProps) {
  const navigate = useNavigate();
  const { deleteProject } = useStore();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    deleteProject(project.id);
    navigate(-1);
  };

  const basePath = `/${project.type.replace('_', '-')}`;
  const progress = calculateProgress(project.startDate, project.targetDate);

  const renderTypeSpecificInfo = () => {
    switch (project.type) {
      case 'sampling': {
        const sampling = project as SamplingProject;
        return (
          <>
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">샘플 정보</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">브랜드</p>
                  <p className="font-medium">{brandLabels[sampling.brand]}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">카테고리</p>
                  <p className="font-medium">{sampling.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">제조사</p>
                  <p className="font-medium">{sampling.manufacturer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">샘플 코드</p>
                  <p className="font-medium">{sampling.sampleCode || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">회차</p>
                  <p className="font-medium">{sampling.round}회</p>
                </div>
                {sampling.averageRating !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500">평균 평점</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <p className="font-medium">{sampling.averageRating.toFixed(1)}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {sampling.ratings.length > 0 && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">평가 항목</h3>
                <div className="space-y-4">
                  {sampling.ratings.map((rating) => (
                    <div key={rating.criteriaId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 font-medium">{rating.criteriaName}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <Star
                                key={score}
                                className={`w-5 h-5 ${
                                  score <= rating.score
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500 w-10">{rating.score}/5</span>
                        </div>
                      </div>
                      {rating.comment && (
                        <p className="text-sm text-gray-500 mt-2 pl-1 border-l-2 border-gray-200">
                          {rating.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        );
      }

      case 'detail_page':
        return (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">상세페이지 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">브랜드</p>
                <p className="font-medium">{brandLabels[project.brand]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">카테고리</p>
                <p className="font-medium">{project.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">제품명</p>
                <p className="font-medium">{project.productName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">제작 업체</p>
                <p className="font-medium">{project.productionCompany || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">업무 구분</p>
                <Badge variant={project.workType === 'new' ? 'primary' : 'info'}>
                  {project.workType === 'new' ? '신규' : '리뉴얼'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">촬영 포함</p>
                <p className="font-medium">{project.includesPhotography ? '예' : '아니오'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">기획 포함</p>
                <p className="font-medium">{project.includesPlanning ? '예' : '아니오'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">예산</p>
                <p className="font-medium">{formatCurrency(project.budget)}</p>
              </div>
            </div>
          </Card>
        );

      case 'influencer':
        return (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">인플루언서 협업 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">협업 유형</p>
                <Badge variant={project.collaborationType === 'sponsorship' ? 'primary' : 'success'}>
                  {project.collaborationType === 'sponsorship' ? '제품 협찬' : '유가 콘텐츠'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">인플루언서</p>
                <p className="font-medium">{project.influencerName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">플랫폼</p>
                <p className="font-medium">{project.platform || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">예산</p>
                <p className="font-medium">{formatCurrency(project.budget)}</p>
              </div>
            </div>
          </Card>
        );

      case 'product_order':
        return (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">제품 발주 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">브랜드</p>
                <p className="font-medium">{brandLabels[project.brand]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">제조사</p>
                <p className="font-medium">{project.manufacturer}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">용기 부자재</p>
                <p className="font-medium">{project.containerMaterial || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">단상자 부자재</p>
                <p className="font-medium">{project.boxMaterial || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">수량</p>
                <p className="font-medium">{project.quantity?.toLocaleString() || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">단가</p>
                <p className="font-medium">{formatCurrency(project.unitPrice ?? 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">총액</p>
                <p className="font-medium text-primary-600">{formatCurrency(project.totalAmount ?? 0)}</p>
              </div>
            </div>
          </Card>
        );

      case 'group_purchase':
        return (
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">공동구매 정보</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">브랜드</p>
                <p className="font-medium">{brandLabels[project.brand]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">셀러</p>
                <p className="font-medium">{project.sellerName || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">매출</p>
                <p className="font-medium">{formatCurrency(project.revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">공헌 이익</p>
                <p className="font-medium text-green-600">{formatCurrency(project.contributionProfit)}</p>
              </div>
              {project.profitMargin !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">이익률</p>
                  <p className="font-medium">{project.profitMargin.toFixed(1)}%</p>
                </div>
              )}
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(basePath)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
          목록으로
        </button>
        <div className="flex items-center gap-3">
          {project.type === 'sampling' && (
            <SamplingEmailGenerator project={project as SamplingProject} />
          )}
          <button
            onClick={() => navigate(`${basePath}/${project.id}/edit`)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            수정
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-danger flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* Title Card */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className={statusColors[project.status]}>
                {statusLabels[project.status]}
              </Badge>
              <Badge className={priorityColors[project.priority]}>
                {priorityLabels[project.priority]}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-500 mt-1">{projectTypeLabels[project.type]}</p>
          </div>
          <Badge
            variant={
              project.status === 'completed'
                ? 'success'
                : getDdayText(project.targetDate).startsWith('D+')
                ? 'danger'
                : 'warning'
            }
            size="md"
          >
            {project.status === 'completed' ? '완료' : getDdayText(project.targetDate)}
          </Badge>
        </div>

        {/* Progress */}
        {project.status !== 'completed' && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">진행률</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill bg-primary-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">시작일</p>
              <p className="text-sm font-medium">{formatDate(project.startDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">목표일</p>
              <p className="text-sm font-medium">{formatDate(project.targetDate)}</p>
            </div>
          </div>
          {project.completedDate && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">완료일</p>
                <p className="text-sm font-medium">{formatDate(project.completedDate)}</p>
              </div>
            </div>
          )}
          {project.assignee && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">담당자</p>
                <p className="text-sm font-medium">{project.assignee}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Type-specific Info */}
      {renderTypeSpecificInfo()}

      {/* 세부 일정 */}
      <ProjectScheduleManager
        projectId={project.id}
        schedules={project.schedules}
      />

      {/* Notes */}
      {project.notes && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">비고</h3>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{project.notes}</p>
        </Card>
      )}

      {/* Timestamps */}
      <div className="flex items-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>생성: {formatDateTime(project.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>수정: {formatDateTime(project.updatedAt)}</span>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="프로젝트 삭제"
        size="sm"
      >
        <p className="text-gray-600 mb-6">
          정말로 "{project.title}" 프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteModal(false)}
            className="btn-secondary"
          >
            취소
          </button>
          <button onClick={handleDelete} className="btn-danger">
            삭제
          </button>
        </div>
      </Modal>
    </div>
  );
}
