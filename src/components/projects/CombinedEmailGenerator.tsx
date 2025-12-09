import { useState, useMemo } from 'react';
import { Mail, Copy, Check, RefreshCw, Sparkles, Send, Loader2, X } from 'lucide-react';
import Modal from '../common/Modal';
import { SamplingProject, SampleRating } from '../../types';
import { brandLabels } from '../../utils/helpers';
import { sendSamplingEmail } from '../../lib/sendEmail';

interface CombinedEmailGeneratorProps {
  projects: SamplingProject[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CombinedEmailGenerator({ projects, isOpen, onClose }: CombinedEmailGeneratorProps) {
  const [emailContent, setEmailContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailType, setEmailType] = useState<'feedback' | 'approval' | 'revision'>('feedback');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 모든 프로젝트의 평가를 통합
  const combinedAnalysis = useMemo(() => {
    if (projects.length === 0) return null;

    // 모든 평가 항목 수집
    const allRatings: SampleRating[] = [];
    const allNotes: string[] = [];

    projects.forEach(p => {
      if (p.ratings) allRatings.push(...p.ratings);
      if (p.notes) allNotes.push(p.notes);
    });

    // 평가자 수 (프로젝트 수로 추정)
    const evaluatorCount = projects.length;

    // 항목별 평균 계산
    const criteriaMap = new Map<string, { scores: number[]; comments: string[] }>();
    allRatings.forEach(r => {
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

    // 전체 평균 점수
    const totalAvgRating = projects.reduce((sum, p) => sum + (p.averageRating || 0), 0) / projects.length;

    // 대표 프로젝트 정보
    const firstProject = projects[0];

    return {
      brand: firstProject.brand,
      category: firstProject.category,
      manufacturer: firstProject.manufacturer,
      round: firstProject.round,
      sampleCode: firstProject.sampleCode,
      title: firstProject.title,
      evaluatorCount,
      totalAvgRating,
      criteriaAverages,
      allNotes,
      totalRatings: allRatings.length,
    };
  }, [projects]);

  const generateEmail = () => {
    if (!combinedAnalysis) return;
    setIsGenerating(true);

    setTimeout(() => {
      const { brand, category, manufacturer, round, sampleCode, title, evaluatorCount, totalAvgRating, criteriaAverages, allNotes } = combinedAnalysis;
      const brandName = brandLabels[brand];
      const avgRating = totalAvgRating.toFixed(2);
      const currentDate = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // 항목별 상세 평가
      const ratingDetails = criteriaAverages
        .sort((a, b) => b.avgScore - a.avgScore)
        .map((r) => {
          const scoreBar = '★'.repeat(Math.round(r.avgScore)) + '☆'.repeat(5 - Math.round(r.avgScore));
          const commentsText = r.comments.length > 0
            ? `\n      └ 의견: ${r.comments.slice(0, 3).join(' / ')}${r.comments.length > 3 ? ' 외 ' + (r.comments.length - 3) + '건' : ''}`
            : '';
          return `  • ${r.name}: ${r.avgScore.toFixed(1)}점 ${scoreBar} (${r.evaluatorCount}명 평가)${commentsText}`;
        })
        .join('\n');

      // 종합 의견 생성
      const strongPoints = criteriaAverages.filter(c => c.avgScore >= 4).map(c => c.name);
      const weakPoints = criteriaAverages.filter(c => c.avgScore < 3).map(c => c.name);

      let summary = '';
      if (totalAvgRating >= 4) {
        summary = `${evaluatorCount}명의 평가자가 참여한 결과, 전체적으로 우수한 품질의 샘플입니다.`;
        if (strongPoints.length > 0) summary += ` 특히 ${strongPoints.slice(0, 3).join(', ')} 항목에서 높은 평가를 받았습니다.`;
        if (weakPoints.length > 0) summary += ` 다만, ${weakPoints.join(', ')} 항목은 추가 검토가 필요합니다.`;
      } else if (totalAvgRating >= 3) {
        summary = `${evaluatorCount}명의 평가자가 참여한 결과, 전반적으로 양호하나 일부 개선이 필요합니다.`;
        if (strongPoints.length > 0) summary += ` ${strongPoints.join(', ')} 항목은 만족스럽습니다.`;
        if (weakPoints.length > 0) summary += ` ${weakPoints.join(', ')} 항목의 개선을 요청드립니다.`;
      } else {
        summary = `${evaluatorCount}명의 평가자가 참여한 결과, 품질 개선이 필요한 상태입니다.`;
        if (weakPoints.length > 0) summary += ` 특히 ${weakPoints.join(', ')} 항목에서 낮은 점수를 받았습니다.`;
      }

      // 종합 의견 모음
      const notesSection = allNotes.length > 0
        ? `■ 평가자별 의견\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${allNotes.map((n, i) => `  [평가자 ${i + 1}] ${n}`).join('\n')}\n\n`
        : '';

      let subject = '';
      let body = '';

      if (emailType === 'feedback') {
        subject = `[${brandName}] ${title} 샘플 종합 평가 피드백 (${round}차, ${evaluatorCount}명 평가)`;
        body = `안녕하세요, ${manufacturer} 담당자님.

${brandName}의 ${title} 관련 ${round}차 샘플에 대한 종합 평가 결과를 공유드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 기본 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${title}
  • 카테고리: ${category}
  • 샘플 코드: ${sampleCode || 'N/A'}
  • 평가 회차: ${round}차

■ 종합 평가 결과 (${evaluatorCount}명 참여)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 평균 점수: ${avgRating}점 / 5점
  • 총 평가 항목: ${combinedAnalysis.totalRatings}개

■ 항목별 세부 평가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

■ 종합 의견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary}

${notesSection}확인 부탁드리며, 문의사항이 있으시면 연락주세요.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else if (emailType === 'approval') {
        subject = `[${brandName}] ${title} 샘플 승인 안내 (${round}차)`;
        body = `안녕하세요, ${manufacturer} 담당자님.

${brandName}의 ${title} 관련 ${round}차 샘플에 대한 ${evaluatorCount}명의 종합 평가가 완료되어 승인 결과를 안내드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${title}
  • 카테고리: ${category}
  • 샘플 코드: ${sampleCode || 'N/A'}
  • 평가 회차: ${round}차
  • 최종 평균 점수: ${avgRating}점 / 5점 (${evaluatorCount}명 평가)

■ 승인 결과
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ 본 샘플을 승인합니다.
  ✓ 양산 단계로 진행 가능합니다.

■ 최종 평가 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

${notesSection}양산 일정 협의를 위해 연락 부탁드립니다.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      } else {
        const lowRatedCriteria = criteriaAverages.filter(c => c.avgScore < 3);
        const revisionPoints = lowRatedCriteria
          .map((r) => {
            const commentsText = r.comments.length > 0
              ? `\n      └ 평가 의견: ${r.comments.slice(0, 2).join(' / ')}`
              : '';
            return `  • ${r.name}: 현재 ${r.avgScore.toFixed(1)}점 → 개선 필요${commentsText}`;
          })
          .join('\n');

        subject = `[${brandName}] ${title} 샘플 수정 요청 (${round}차, ${evaluatorCount}명 평가)`;
        body = `안녕하세요, ${manufacturer} 담당자님.

${brandName}의 ${title} 관련 ${round}차 샘플에 대한 ${evaluatorCount}명의 종합 평가 결과, 수정이 필요하여 연락드립니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 샘플 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • 브랜드: ${brandName}
  • 제품명: ${title}
  • 카테고리: ${category}
  • 샘플 코드: ${sampleCode || 'N/A'}
  • 현재 회차: ${round}차
  • 평균 점수: ${avgRating}점 / 5점

■ 수정 요청 사항 (3점 미만 항목)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${revisionPoints || '  • 전반적인 품질 개선 필요'}

■ 전체 평가 항목
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${ratingDetails || '  • 평가 항목 없음'}

■ 종합 의견
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${summary}

${notesSection}수정된 ${round + 1}차 샘플 전달 일정을 알려주시면 감사하겠습니다.

감사합니다.

${currentDate}
${brandName} 담당자 드림`;
      }

      setEmailContent(`제목: ${subject}\n\n${body}`);
      setIsGenerating(false);
    }, 800);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !emailContent || !combinedAnalysis) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setSendStatus({ type: 'error', message: '올바른 이메일 주소 형식이 아닙니다.' });
      return;
    }

    setIsSending(true);
    setSendStatus(null);

    try {
      const bodyContent = emailContent.replace(/^제목:.*\n\n/, '');
      const result = await sendSamplingEmail(recipientEmail, combinedAnalysis.title, emailType, bodyContent);

      if (result.success) {
        setSendStatus({ type: 'success', message: '이메일이 성공적으로 발송되었습니다!' });
      } else {
        setSendStatus({ type: 'error', message: result.error || '이메일 발송에 실패했습니다.' });
      }
    } catch (error) {
      setSendStatus({ type: 'error', message: '이메일 발송 중 오류가 발생했습니다.' });
    } finally {
      setIsSending(false);
    }
  };

  // 모달 열릴 때 이메일 생성
  if (isOpen && !emailContent && !isGenerating && combinedAnalysis) {
    generateEmail();
  }

  if (!combinedAnalysis) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="종합 평가 이메일 발송" size="lg">
      <div className="space-y-4">
        {/* 샘플 정보 요약 */}
        <div className="p-4 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl border border-primary-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900">{combinedAnalysis.title}</h4>
            <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
              {combinedAnalysis.evaluatorCount}명 평가 통합
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><span className="text-gray-500">브랜드:</span> {brandLabels[combinedAnalysis.brand]}</div>
            <div><span className="text-gray-500">카테고리:</span> {combinedAnalysis.category}</div>
            <div><span className="text-gray-500">제조사:</span> {combinedAnalysis.manufacturer}</div>
            <div><span className="text-gray-500">회차:</span> {combinedAnalysis.round}차</div>
            <div><span className="text-gray-500">샘플코드:</span> {combinedAnalysis.sampleCode || '-'}</div>
            <div>
              <span className="text-gray-500">평균 평점:</span>{' '}
              <span className={`font-bold ${combinedAnalysis.totalAvgRating >= 4 ? 'text-green-600' : combinedAnalysis.totalAvgRating >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {combinedAnalysis.totalAvgRating.toFixed(2)}점
              </span>
            </div>
          </div>
        </div>

        {/* 이메일 유형 선택 */}
        <div className="flex gap-2">
          {(['feedback', 'approval', 'revision'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setEmailType(type); setEmailContent(''); }}
              className={`px-4 py-2 rounded-xl border transition-colors ${
                emailType === type
                  ? type === 'feedback' ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : type === 'approval' ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {type === 'feedback' ? '평가 피드백' : type === 'approval' ? '샘플 승인' : '수정 요청'}
            </button>
          ))}
        </div>

        {/* 이메일 내용 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">생성된 이메일</label>
            <button onClick={generateEmail} disabled={isGenerating} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              다시 생성
            </button>
          </div>
          {isGenerating ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border">
              <Sparkles className="w-8 h-8 text-primary-500 animate-pulse" />
            </div>
          ) : (
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              className="w-full min-h-[280px] p-3 border border-gray-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          )}
        </div>

        {/* 이메일 발송 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">받는 사람 이메일</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="manufacturer@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>
            <button
              onClick={handleSendEmail}
              disabled={!emailContent || isSending || !recipientEmail}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? '발송 중...' : '이메일 발송'}
            </button>
          </div>
          {sendStatus && (
            <div className={`mt-2 p-3 rounded-lg text-sm ${sendStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {sendStatus.type === 'success' ? '✓ ' : '✕ '}{sendStatus.message}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between pt-4 border-t">
          <button onClick={handleCopy} disabled={!emailContent} className="btn-secondary flex items-center gap-2">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? '복사됨' : '복사'}
          </button>
          <button onClick={onClose} className="btn-secondary">닫기</button>
        </div>
      </div>
    </Modal>
  );
}
