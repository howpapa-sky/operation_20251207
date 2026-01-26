import { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart3, FileDown, Loader2 } from 'lucide-react';
import { useSeedingStore } from '../../store/seedingStore';
import { Brand } from '../../types';
import ReportFilters from '../../components/seeding/report/ReportFilters';
import ReportSummaryCards from '../../components/seeding/report/ReportSummaryCards';
import ReportCostCards from '../../components/seeding/report/ReportCostCards';
import DailyPostingChart from '../../components/seeding/report/DailyPostingChart';
import ContentTypeChart from '../../components/seeding/report/ContentTypeChart';
import SeedingTypeChart from '../../components/seeding/report/SeedingTypeChart';
import TopInfluencersTable from '../../components/seeding/report/TopInfluencersTable';
import ProductSeedingTable from '../../components/seeding/report/ProductSeedingTable';

// 날짜 범위 타입
interface DateRange {
  start: string;
  end: string;
}

// 기본 날짜 범위 (이번 달)
function getDefaultDateRange(): DateRange {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: firstDay.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

export default function SeedingReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { projects, influencers, isLoading, fetchProjects, fetchInfluencers } = useSeedingStore();

  // 필터 상태
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [selectedBrand, setSelectedBrand] = useState<Brand | 'all'>('all');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchInfluencers();
  }, [fetchProjects, fetchInfluencers]);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    let filteredInfluencers = influencers;
    let filteredProjects = projects;

    // 브랜드 필터
    if (selectedBrand !== 'all') {
      filteredProjects = filteredProjects.filter((p) => p.brand === selectedBrand);
      const projectIds = new Set(filteredProjects.map((p) => p.id));
      filteredInfluencers = filteredInfluencers.filter((i) => projectIds.has(i.project_id));
    }

    // 프로젝트 필터
    if (selectedProjectId !== 'all') {
      filteredInfluencers = filteredInfluencers.filter((i) => i.project_id === selectedProjectId);
      filteredProjects = filteredProjects.filter((p) => p.id === selectedProjectId);
    }

    // 날짜 필터 (created_at 기준)
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      filteredInfluencers = filteredInfluencers.filter((i) => {
        const createdAt = new Date(i.created_at);
        return createdAt >= startDate && createdAt <= endDate;
      });
    }

    return { influencers: filteredInfluencers, projects: filteredProjects };
  }, [influencers, projects, selectedBrand, selectedProjectId, dateRange]);

  // 요약 통계 계산
  const summaryData = useMemo(() => {
    const { influencers: filtered } = filteredData;

    const totalSeedings = filtered.length;
    const postedInfluencers = filtered.filter(
      (i) => i.status === 'posted' || i.status === 'completed'
    );
    const postingCount = postedInfluencers.length;
    const postingRate = totalSeedings > 0 ? (postingCount / totalSeedings) * 100 : 0;

    let totalReach = 0;
    let totalEngagement = 0;

    filtered.forEach((inf) => {
      if (inf.performance) {
        totalReach += (inf.performance.views || 0) + (inf.performance.story_views || 0);
        totalEngagement +=
          (inf.performance.likes || 0) +
          (inf.performance.comments || 0) +
          (inf.performance.saves || 0) +
          (inf.performance.shares || 0);
      }
    });

    return {
      totalSeedings,
      postingCount,
      postingRate,
      totalReach,
      totalEngagement,
      // 전월 대비는 별도 계산 필요 - 여기서는 샘플 값
      seedingChange: undefined,
      postingChange: undefined,
      reachChange: undefined,
      engagementChange: undefined,
    };
  }, [filteredData]);

  // 비용 통계 계산 (발송완료 상태만)
  const costData = useMemo(() => {
    const { influencers: filtered, projects: filteredProjects } = filteredData;

    // 발송 완료 이후 상태 (비용 계산 대상)
    const shippedStatuses = ['shipped', 'guide_sent', 'posted', 'completed'];

    let totalSeedingCost = 0;
    let totalFee = 0;
    let shippedCount = 0;

    filtered.forEach((inf) => {
      // 발송완료 상태인 건만 비용 계산
      if (shippedStatuses.includes(inf.status)) {
        const project = filteredProjects.find((p) => p.id === inf.project_id);
        const quantity = inf.shipping?.quantity || 1;
        // 인플루언서별 product_price 우선, 없으면 프로젝트 cost_price 사용
        const productPrice = inf.product_price || project?.cost_price || 0;
        totalSeedingCost += quantity * productPrice;
        totalFee += inf.fee || 0;
        shippedCount++;

        // 디버깅: 비용 계산 내역
        console.log(`[Cost Debug] ${inf.account_id}: status=${inf.status}, qty=${quantity}, price=${productPrice} (inf.product_price=${inf.product_price}, project.cost_price=${project?.cost_price}), subtotal=${quantity * productPrice}`);
      }
    });

    console.log(`[Cost Summary] ${shippedCount}건 발송완료, 총 비용: ₩${totalSeedingCost.toLocaleString()}`);

    return {
      totalSeedingCost,
      totalFee,
      totalReach: summaryData.totalReach,
    };
  }, [filteredData, summaryData.totalReach]);

  // 일별 포스팅 데이터 계산
  const dailyPostingData = useMemo(() => {
    const { influencers: filtered } = filteredData;

    // 날짜별 그룹화
    const dailyMap = new Map<string, { postings: number; reach: number }>();

    filtered
      .filter((inf) => inf.status === 'posted' || inf.status === 'completed')
      .forEach((inf) => {
        const date = inf.posted_at
          ? inf.posted_at.split('T')[0]
          : inf.created_at.split('T')[0];

        const existing = dailyMap.get(date) || { postings: 0, reach: 0 };
        const reach = inf.performance
          ? (inf.performance.views || 0) + (inf.performance.story_views || 0)
          : 0;

        dailyMap.set(date, {
          postings: existing.postings + 1,
          reach: existing.reach + reach,
        });
      });

    // 날짜순 정렬
    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // 콘텐츠 유형 데이터
  const contentTypeData = useMemo(() => {
    const { influencers: filtered } = filteredData;
    const data = { story: 0, reels: 0, feed: 0, both: 0 };

    filtered
      .filter((inf) => inf.status === 'posted' || inf.status === 'completed')
      .forEach((inf) => {
        data[inf.content_type]++;
      });

    return data;
  }, [filteredData]);

  // 시딩 유형 데이터
  const seedingTypeData = useMemo(() => {
    const { influencers: filtered, projects: filteredProjects } = filteredData;

    let freeCount = 0;
    let paidCount = 0;
    let freeCost = 0;
    let paidCost = 0;

    filtered.forEach((inf) => {
      const project = filteredProjects.find((p) => p.id === inf.project_id);
      const quantity = inf.shipping?.quantity || 1;
      const cost = project ? quantity * project.cost_price : 0;

      if (inf.seeding_type === 'free') {
        freeCount++;
        freeCost += cost;
      } else {
        paidCount++;
        paidCost += cost + (inf.fee || 0);
      }
    });

    return { free: freeCount, paid: paidCount, freeCost, paidCost };
  }, [filteredData]);

  // PDF 다운로드 (프린트 방식)
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // 프린트 스타일 적용하여 PDF로 저장
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 print:space-y-4" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">시딩 성과 리포트</h1>
            <p className="text-sm text-gray-500">인플루언서 시딩 성과 분석</p>
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          PDF 다운로드
        </button>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">시딩 성과 리포트</h1>
        <p className="text-sm text-gray-500">
          {dateRange.start} ~ {dateRange.end}
        </p>
      </div>

      {/* Filters */}
      <div className="print:hidden">
        <ReportFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          selectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
          projects={projects}
        />
      </div>

      {/* Summary Cards */}
      <ReportSummaryCards data={summaryData} isLoading={isLoading} />

      {/* Cost Cards */}
      <ReportCostCards data={costData} isLoading={isLoading} />

      {/* Daily Posting Chart */}
      <DailyPostingChart data={dailyPostingData} isLoading={isLoading} />

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentTypeChart data={contentTypeData} isLoading={isLoading} />
        <SeedingTypeChart data={seedingTypeData} isLoading={isLoading} />
      </div>

      {/* Top Influencers Table */}
      <TopInfluencersTable influencers={filteredData.influencers} isLoading={isLoading} />

      {/* Product Seeding Table */}
      <ProductSeedingTable
        projects={filteredData.projects}
        influencers={filteredData.influencers}
        isLoading={isLoading}
      />

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
        }
      `}</style>
    </div>
  );
}
