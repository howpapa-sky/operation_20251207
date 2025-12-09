import { useState, useMemo } from 'react';
import { Mail, Copy, Check, RefreshCw, Sparkles, Download, Send, Loader2 } from 'lucide-react';
import Card from '../common/Card';
import Modal from '../common/Modal';
import { SamplingProject } from '../../types';
import { brandLabels } from '../../utils/helpers';
import { sendSamplingEmail } from '../../lib/sendEmail';

interface SamplingEmailGeneratorProps {
  project: SamplingProject;
}

export default function SamplingEmailGenerator({ project }: SamplingEmailGeneratorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailType, setEmailType] = useState<'feedback' | 'approval' | 'revision'>('feedback');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // 평가 분석 결과
  const ratingAnalysis = useMemo(() => {
    const ratings = project.ratings || [];
    if (ratings.length === 0) return null;

    const highScores = ratings.filter(r => r.score >= 4);
    const mediumScores = ratings.filter(r => r.score >= 3 && r.score < 4);
    const lowScores = ratings.filter(r => r.score < 3);

    // 항목별로 그룹화하여 평균 계산
    const criteriaMap = new Map<string, { scores: number[]; comments: string[] }>();
    ratings.forEach(r => {
      const existing = criteriaMap.get(r.criteriaName) || { scores: [], comments: [] };
      existing.scores.push(r.score);
      if (r.comment) existing.comments.push(r.comment);
      criteriaMap.set(r.criteriaName, existing);
    });

    const criteriaAverages = Array.from(criteriaMap.entries()).map(([name, data]) => ({
      name,
      avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      evaluatorCount: data.scores.length,
      comments: data.comments,
    }));

    return {
      highScores,
      mediumScores,
      lowScores,
      criteriaAverages,
      totalEvaluations: ratings.length,
    };
  }, [project.ratings]);

  const generateEmail = () => {
    setIsGenerating(true);

    // Simulate AI generation with a structured template
    setTimeout(() => {
      const brandName = brandLabels[project.brand];
      const ratings = project.ratings || [];
      const avgRating = project.averageRating?.toFixed(2) || 'N/A';
      const currentDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Build comprehensive rating details
      let ratingDetails = '';
      if (ratingAnalysis) {
        ratingDetails = ratingAnalysis.criteriaAverages
          .sort((a, b) => b.avgScore - a.avgScore)
          .map((r) => {
            const scoreBar = '★'.repeat(Math.round(r.avgScore)) + '☆'.repeat(5 - Math.round(r.avgScore));
            const commentsText = r.comments.length > 0
              ? `\n      └ 의견: ${r.comments.join(' / ')}`
              : '';
            return `  • ${r.name}: ${r.avgScore.toFixed(1)}점 ${scoreBar} (${r.evaluatorCount}명 평가)${commentsText}`;
          })
          .join('\n');
      }

      // 종합 의견 생성
      const generateSummary = () => {
        if (!ratingAnalysis) return '';

        const { highScores, mediumScores, lowScores, criteriaAverages } = ratingAnalysis;
        const strongPoints = criteriaAverages.filter(c => c.avgScore >= 4).map(c => c.name);
        const weakPoints = criteriaAverages.filter(c => c.avgScore < 3).map(c => c.name);
        const avgScore = project.averageRating || 0;

        let summary = '';

        if (avgScore >= 4) {
          summary = `전체적으로 우수한 품질의 샘플입니다.`;
          if (strongPoints.length > 0) {
            summary += ` 특히 ${strongPoints.slice(0, 3).join(', ')} 항목에서 높은 평가를 받았습니다.`;
          }
          if (weakPoints.length > 0) {
            summary += ` 다만, ${weakPoints.join(', ')} 항목은 추가 검토가 필요합니다.`;
          }
        } else if (avgScore >= 3) {
          summary = `전반적으로 양호한 수준이나 일부 개선이 필요합니다.`;
          if (strongPoints.length > 0) {
            summary += ` ${strongPoints.join(', ')} 항목은 만족스럽습니다.`;
          }
          if (weakPoints.length > 0) {
            summary += ` ${weakPoints.join(', ')} 항목의 개선을 요청드립니다.`;
          }
        } else {
          summary = `품질 개선이 필요한 상태입니다.`;
          if (weakPoints.length > 0) {
            summary += ` 특히 ${weakPoints.join(', ')} 항목에서 낮은 점수를 받았으며, 전면적인 검토가 필요합니다.`;
          }
        }

        return summary;
      };

      // Generate different email types
      let subject = '';
      let body = '';

      if (emailType === 'feedback') {
        subject = `[${brandName}] ${project.title} 샘플 평가 피드백 (${project.round}차)`;
        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플에 대한 종합 평가 결과를 공유드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${project.title}
  • 카테고리: ${project.category}
  • 샘플 코드: ${project.sampleCode || 'N/A'}
  • 평가 회차: ${project.round}차

■ 종합 평가 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 평균 점수: ${avgRating}점 / 5점
  • 총 평가 항목: ${ratingAnalysis?.totalEvaluations || 0}개

■ 항목별 세부 평가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

■ 종합 의견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${generateSummary()}

${project.notes ? `■ 추가 코멘트\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${project.notes}\n` : ''}
확인 부탁드리며, 문의사항이 있으시면 연락주세요.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else if (emailType === 'approval') {
        subject = `[${brandName}] ${project.title} 샘플 승인 안내 (${project.round}차)`;
        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플 평가가 완료되어 승인 결과를 안내드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${project.title}
  • 카테고리: ${project.category}
  • 샘플 코드: ${project.sampleCode || 'N/A'}
  • 평가 회차: ${project.round}차
  • 최종 평균 점수: ${avgRating}점 / 5점

■ 승인 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 본 샘플을 승인합니다.
  ✓ 양산 단계로 진행 가능합니다.

■ 최종 평가 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

${project.notes ? `■ 참고 사항\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${project.notes}\n` : ''}
양산 일정 협의를 위해 연락 부탁드립니다.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else {
        subject = `[${brandName}] ${project.title} 샘플 수정 요청 (${project.round}차)`;

        // Find low-rated items for revision request
        const lowRatedCriteria = ratingAnalysis?.criteriaAverages.filter(c => c.avgScore < 3) || [];
        const revisionPoints = lowRatedCriteria
          .map((r) => {
            const commentsText = r.comments.length > 0
              ? `\n      └ 평가 의견: ${r.comments.join(' / ')}`
              : '';
            return `  • ${r.name}: 현재 ${r.avgScore.toFixed(1)}점 → 개선 필요${commentsText}`;
          })
          .join('\n');

        body = `안녕하세요, ${project.manufacturer} 담당자님.

${brandName}의 ${project.title} 관련 ${project.round}차 샘플 평가 결과, 수정이 필요하여 연락드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${project.title}
  • 카테고리: ${project.category}
  • 샘플 코드: ${project.sampleCode || 'N/A'}
  • 현재 회차: ${project.round}차
  • 평균 점수: ${avgRating}점 / 5점

■ 수정 요청 사항 (3점 미만 항목)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${revisionPoints || '  • 전반적인 품질 개선 필요'}

■ 전체 평가 항목
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

■ 종합 의견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${generateSummary()}

${project.notes ? `■ 추가 피드백\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${project.notes}\n` : ''}
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
    setSendStatus(null);
    if (!emailContent) {
      generateEmail();
    }
  };

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setSendStatus({ type: 'error', message: '받는 사람 이메일 주소를 입력해주세요.' });
      return;
    }

    if (!emailContent) {
      setSendStatus({ type: 'error', message: '이메일 내용을 먼저 생성해주세요.' });
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setSendStatus({ type: 'error', message: '올바른 이메일 주소 형식이 아닙니다.' });
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      // 제목 제거하고 본문만 추출
      const bodyContent = emailContent.replace(/^제목:.*\n\n/, '');

      const result = await sendSamplingEmail(
        recipientEmail,
        project.title,
        emailType,
        bodyContent
      );

      if (result.success) {
        setSendStatus({ type: 'success', message: '이메일이 성공적으로 발송되었습니다!' });
      } else {
        setSendStatus({ type: 'error', message: result.error || '이메일 발송에 실패했습니다.' });
      }
    } catch (error) {
      setSendStatus({
        type: 'error',
        message: error instanceof Error ? error.message : '이메일 발송 중 오류가 발생했습니다.'
      });
    } finally {
      setIsSending(false);
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

          {/* Recipient Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              받는 사람 이메일
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="manufacturer@example.com"
                  className="input-field pl-10"
                />
              </div>
              <button
                onClick={handleSendEmail}
                disabled={!emailContent || isGenerating || isSending || !recipientEmail}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    이메일 발송
                  </>
                )}
              </button>
            </div>
            {/* Send Status Message */}
            {sendStatus && (
              <div className={`mt-2 p-3 rounded-lg text-sm ${
                sendStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {sendStatus.type === 'success' ? '✓ ' : '✕ '}
                {sendStatus.message}
              </div>
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
              className="btn-secondary"
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
