import { useState, useMemo } from 'react';
import { Mail, Copy, Check, RefreshCw, Sparkles, Download, Send } from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { SamplingProject } from '../../types';
import { brandLabels } from '../../utils/helpers';

interface SamplingEmailGeneratorProps {
  project: SamplingProject;
}

export default function SamplingEmailGenerator({ project }: SamplingEmailGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailType, setEmailType] = useState<'feedback' | 'approval' | 'revision'>('feedback');

  // Calculate overall rating status
  const ratingStatus = useMemo(() => {
    if (!project.ratings || project.ratings.length === 0) {
      return { status: 'none', average: 0 };
    }
    const avg = project.averageRating || 0;
    if (avg >= 4) return { status: 'excellent', average: avg };
    if (avg >= 3) return { status: 'good', average: avg };
    if (avg >= 2) return { status: 'needs_improvement', average: avg };
    return { status: 'poor', average: avg };
  }, [project.ratings, project.averageRating]);

  const generateEmail = () => {
    setIsGenerating(true);

    // Simulate AI generation with a structured template
    setTimeout(() => {
      const brandName = brandLabels[project.brand];
      const ratings = project.ratings || [];
      const avgRating = project.averageRating?.toFixed(1) || 'N/A';
      const currentDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Build rating details
      const ratingDetails = ratings
        .map((r) => `  - ${r.criteriaName}: ${r.score}/5점${r.comment ? ` (${r.comment})` : ''}`)
        .join('\n');

      // Generate different email types
      let subject = '';
      let body = '';

      if (emailType === 'feedback') {
        subject = `[${brandName}] ${project.title} 샘플 평가 피드백 (${project.round}차)`;
        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플에 대한 평가 결과를 공유드립니다.

■ 샘플 정보
- 제품명: ${project.title}
- 카테고리: ${project.category}
- 샘플 코드: ${project.sampleCode || 'N/A'}
- 평가 회차: ${project.round}차

■ 종합 평가
- 평균 점수: ${avgRating}점 / 5점
- 평가 항목별 상세:
${ratingDetails || '  - 평가 항목 없음'}

■ 추가 의견
${project.notes || '별도 의견 없음'}

${
  ratingStatus.status === 'excellent' || ratingStatus.status === 'good'
    ? '전반적으로 만족스러운 품질입니다. 몇 가지 세부 사항만 조정해주시면 감사하겠습니다.'
    : '몇 가지 개선이 필요한 부분이 있어 상세 피드백을 공유드립니다. 검토 후 수정된 샘플을 요청드립니다.'
}

확인 부탁드리며, 문의사항이 있으시면 연락주세요.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else if (emailType === 'approval') {
        subject = `[${brandName}] ${project.title} 샘플 승인 요청`;
        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플 평가가 완료되었습니다.

■ 샘플 정보
- 제품명: ${project.title}
- 카테고리: ${project.category}
- 샘플 코드: ${project.sampleCode || 'N/A'}
- 평가 회차: ${project.round}차
- 평균 점수: ${avgRating}점 / 5점

■ 승인 결과
본 샘플을 승인합니다. 양산 단계로 진행해주시기 바랍니다.

${project.notes ? `■ 참고 사항\n${project.notes}\n` : ''}
양산 일정 협의를 위해 연락 부탁드립니다.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else {
        subject = `[${brandName}] ${project.title} 샘플 수정 요청 (${project.round}차)`;

        // Find low-rated items for revision request
        const lowRatedItems = ratings.filter((r) => r.score <= 3);
        const revisionPoints = lowRatedItems
          .map((r) => `  - ${r.criteriaName}: ${r.comment || '개선 필요'}`)
          .join('\n');

        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플 평가 결과, 일부 수정이 필요하여 연락드립니다.

■ 샘플 정보
- 제품명: ${project.title}
- 카테고리: ${project.category}
- 샘플 코드: ${project.sampleCode || 'N/A'}
- 현재 회차: ${project.round}차
- 평균 점수: ${avgRating}점 / 5점

■ 수정 요청 사항
${revisionPoints || '  - 전반적인 품질 개선 필요'}

■ 상세 피드백
${project.notes || '상세 피드백은 추후 전달드리겠습니다.'}

수정된 ${project.round + 1}차 샘플 전달 일정을 알려주시면 감사하겠습니다.

궁금한 점이 있으시면 연락주세요.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      }

      setEmailContent(`제목: ${subject}\n\n${body}`);
      setIsGenerating(false);
    }, 1000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([emailContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title}_이메일_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    if (!emailContent) {
      generateEmail();
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="btn-secondary flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        AI 이메일 생성
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="제조사 이메일 자동 생성"
        size="lg"
      >
        <div className="space-y-4">
          {/* Email Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">이메일 유형</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEmailType('feedback');
                  setEmailContent('');
                }}
                className={`px-4 py-2 rounded-xl border transition-colors ${
                  emailType === 'feedback'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                평가 피드백
              </button>
              <button
                onClick={() => {
                  setEmailType('approval');
                  setEmailContent('');
                }}
                className={`px-4 py-2 rounded-xl border transition-colors ${
                  emailType === 'approval'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                샘플 승인
              </button>
              <button
                onClick={() => {
                  setEmailType('revision');
                  setEmailContent('');
                }}
                className={`px-4 py-2 rounded-xl border transition-colors ${
                  emailType === 'revision'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                수정 요청
              </button>
            </div>
          </div>

          {/* Sample Info Summary */}
          <Card className="p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">샘플 정보 요약</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">제품명:</span>{' '}
                <span className="text-gray-900">{project.title}</span>
              </div>
              <div>
                <span className="text-gray-500">브랜드:</span>{' '}
                <span className="text-gray-900">{brandLabels[project.brand]}</span>
              </div>
              <div>
                <span className="text-gray-500">제조사:</span>{' '}
                <span className="text-gray-900">{project.manufacturer}</span>
              </div>
              <div>
                <span className="text-gray-500">회차:</span>{' '}
                <span className="text-gray-900">{project.round}차</span>
              </div>
              <div>
                <span className="text-gray-500">평균 평점:</span>{' '}
                <span className={`font-medium ${
                  ratingStatus.status === 'excellent' || ratingStatus.status === 'good'
                    ? 'text-green-600'
                    : ratingStatus.status === 'needs_improvement'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {ratingStatus.average.toFixed(1)}/5점
                </span>
              </div>
              <div>
                <span className="text-gray-500">평가 항목:</span>{' '}
                <span className="text-gray-900">{project.ratings?.length || 0}개</span>
              </div>
            </div>
          </Card>

          {/* Generated Email */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">생성된 이메일</label>
              <button
                onClick={generateEmail}
                disabled={isGenerating}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                다시 생성
              </button>
            </div>
            {isGenerating ? (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-center">
                  <Sparkles className="w-8 h-8 text-primary-500 animate-pulse mx-auto mb-2" />
                  <p className="text-gray-500">이메일 생성 중...</p>
                </div>
              </div>
            ) : (
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                className="input-field min-h-[300px] font-mono text-sm"
                placeholder="이메일 내용이 여기에 생성됩니다..."
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!emailContent || isGenerating}
                className="btn-secondary flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    복사
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!emailContent || isGenerating}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn-primary"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
