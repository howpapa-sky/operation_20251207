import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Package,
  FileText,
  FlaskConical,
  Link as LinkIcon,
  ExternalLink,
  Check,
  X,
  Copy,
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { ProductMaster } from '../../types';
import { brandLabels, formatDate } from '../../utils/helpers';
import { useState } from 'react';

interface ProductMasterDetailProps {
  product: ProductMaster;
}

export default function ProductMasterDetail({ product }: ProductMasterDetailProps) {
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const renderCodeField = (label: string, value: string | undefined, fieldKey: string) => {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{value}</span>
          <button
            onClick={() => copyToClipboard(value, fieldKey)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="복사"
          >
            {copiedField === fieldKey ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/product-master')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-4">
            {product.thumbnailUrl ? (
              <img
                src={product.thumbnailUrl}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={product.brand === 'howpapa' ? 'primary' : 'warning'}>
                  {brandLabels[product.brand]}
                </Badge>
                <Badge variant="gray">{product.category}</Badge>
                <Badge variant={product.isActive ? 'success' : 'gray'}>
                  {product.isActive ? '활성' : '비활성'}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/product-master/${product.id}/edit`)}
          className="btn-primary flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          수정
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 기본 정보 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-100 rounded-xl">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-gray-500">브랜드</span>
                <p className="font-medium text-gray-900 mt-1">{brandLabels[product.brand]}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">카테고리</span>
                <p className="font-medium text-gray-900 mt-1">{product.category}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">제조사</span>
                <p className="font-medium text-gray-900 mt-1">{product.manufacturer}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">공장 위치</span>
                <p className="font-medium text-gray-900 mt-1">{product.factoryLocation || '-'}</p>
              </div>
            </div>

            {product.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <span className="text-sm text-gray-500">제품 설명</span>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </Card>

          {/* 코드 정보 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">코드 정보</h2>
            </div>

            <div className="space-y-1">
              {renderCodeField('SKU ID', product.skuId, 'skuId')}
              {renderCodeField('자재번호', product.materialCode, 'materialCode')}
              {renderCodeField('약호', product.abbreviation, 'abbreviation')}
              {renderCodeField('앰넘버', product.ampNumber, 'ampNumber')}
              {renderCodeField('모크리코드', product.mockupCode, 'mockupCode')}
              {renderCodeField('바코드', product.barcode, 'barcode')}
              {!product.skuId && !product.materialCode && !product.abbreviation &&
               !product.ampNumber && !product.mockupCode && !product.barcode && (
                <p className="text-center text-gray-500 py-4">등록된 코드 정보가 없습니다.</p>
              )}
            </div>
          </Card>

          {/* 임상 정보 */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 rounded-xl">
                <FlaskConical className="w-5 h-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">임상 정보</h2>
              {product.clinicalTests.length > 0 && (
                <Badge variant="warning">{product.clinicalTests.length}건</Badge>
              )}
            </div>

            {product.clinicalTests.length === 0 ? (
              <p className="text-center text-gray-500 py-4">등록된 임상 정보가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {product.clinicalTests.map((clinical) => (
                  <div
                    key={clinical.id}
                    className="p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{clinical.title}</h3>
                        {clinical.institution && (
                          <p className="text-sm text-gray-500 mt-1">{clinical.institution}</p>
                        )}
                        {clinical.testDate && (
                          <p className="text-sm text-gray-500">시험일: {clinical.testDate}</p>
                        )}
                      </div>
                      {clinical.attachmentUrl && (
                        <a
                          href={clinical.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {clinical.attachmentName || '첨부파일'}
                        </a>
                      )}
                    </div>
                    {clinical.description && (
                      <p className="text-sm text-gray-700 mt-3">{clinical.description}</p>
                    )}
                    {clinical.results && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700">시험 결과</p>
                        <p className="text-sm text-gray-600 mt-1">{clinical.results}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 옵션 정보 */}
          {product.options.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">옵션 정보</h2>
                <Badge variant="info">{product.options.length}개</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">옵션명</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">옵션값</th>
                      <th className="text-right py-3 text-sm font-semibold text-gray-500">추가가격</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">SKU</th>
                      <th className="text-left py-3 text-sm font-semibold text-gray-500">바코드</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {product.options.map((option) => (
                      <tr key={option.id}>
                        <td className="py-3 text-sm text-gray-900">{option.name}</td>
                        <td className="py-3 text-sm text-gray-900">{option.value}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">
                          {option.additionalPrice ? `+₩${formatPrice(option.additionalPrice)}` : '-'}
                        </td>
                        <td className="py-3 text-sm text-gray-600">{option.sku || '-'}</td>
                        <td className="py-3 text-sm text-gray-600">{option.barcode || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* URL 정보 */}
          {(product.productUrl || product.detailPageUrl) && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-100 rounded-xl">
                  <LinkIcon className="w-5 h-5 text-cyan-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">링크</h2>
              </div>

              <div className="space-y-3">
                {product.productUrl && (
                  <a
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-blue-600 hover:underline truncate">
                      제품 페이지
                    </span>
                  </a>
                )}
                {product.detailPageUrl && (
                  <a
                    href={product.detailPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-blue-600 hover:underline truncate">
                      상세페이지
                    </span>
                  </a>
                )}
              </div>
            </Card>
          )}

          {/* 메모 */}
          {product.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">메모</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.notes}</p>
            </Card>
          )}
        </div>

        {/* 우측 영역 */}
        <div className="space-y-6">
          {/* 가격 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">가격 정보</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">원가 (매입가)</span>
                <span className="font-medium text-gray-900">₩{formatPrice(product.costPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">판매가</span>
                <span className="font-bold text-xl text-gray-900">₩{formatPrice(product.sellingPrice)}</span>
              </div>
              {product.supplyPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">공급가</span>
                  <span className="font-medium text-gray-900">₩{formatPrice(product.supplyPrice)}</span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">예상 이익</span>
                  <span className="font-semibold text-green-600">
                    ₩{formatPrice(product.sellingPrice - product.costPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-500">이익률</span>
                  <span className="font-semibold text-green-600">
                    {((product.sellingPrice - product.costPrice) / product.sellingPrice * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 인증 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">인증 정보</h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">비건 인증</span>
                {product.certifications.vegan ? (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    인증
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    <X className="w-3 h-3 mr-1" />
                    없음
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">더마테스트</span>
                {product.certifications.dermaTest ? (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    인증
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    <X className="w-3 h-3 mr-1" />
                    없음
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">안전화학</span>
                {product.certifications.safetyChemical ? (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    인증
                  </Badge>
                ) : (
                  <Badge variant="gray">
                    <X className="w-3 h-3 mr-1" />
                    없음
                  </Badge>
                )}
              </div>

              {product.certifications.ewgGrade && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">EWG 등급</span>
                  <Badge variant="info">{product.certifications.ewgGrade}</Badge>
                </div>
              )}
            </div>
          </Card>

          {/* 등록/수정 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">등록 정보</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">등록일</span>
                <span className="text-gray-900">{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">최종 수정일</span>
                <span className="text-gray-900">{formatDate(product.updatedAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
