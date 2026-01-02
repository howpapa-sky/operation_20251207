import { useState, useRef, DragEvent } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string;
  folder?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

export default function ImageUploader({
  value = [],
  onChange,
  bucket = 'images',
  folder = 'uploads',
  maxFiles = 10,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  className = '',
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `지원하지 않는 파일 형식입니다. (${acceptedTypes.map(t => t.split('/')[1]).join(', ')})`;
    }
    if (file.size > maxSizeBytes) {
      return `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`;
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${fileId}.${fileExt}`;

    // 업로드 상태 추가
    setUploading((prev) => [...prev, { id: fileId, name: file.name, progress: 0 }]);

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // 업로드 완료
      setUploading((prev) => prev.filter((u) => u.id !== fileId));

      return publicUrl;
    } catch (err: any) {
      // 업로드 실패
      setUploading((prev) =>
        prev.map((u) =>
          u.id === fileId ? { ...u, progress: 0, error: err.message } : u
        )
      );
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files);

    // 최대 파일 개수 체크
    if (value.length + fileArray.length > maxFiles) {
      setError(`최대 ${maxFiles}개까지 업로드할 수 있습니다.`);
      return;
    }

    // 파일 검증
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // 업로드 시작
    const uploadPromises = fileArray.map((file) => uploadFile(file));
    const results = await Promise.all(uploadPromises);
    const successfulUrls = results.filter((url): url is string => url !== null);

    if (successfulUrls.length > 0) {
      onChange([...value, ...successfulUrls]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemove = async (url: string) => {
    // URL에서 파일 경로 추출
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      if (pathMatch) {
        const filePath = pathMatch[1];
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } catch (err) {
      console.error('Failed to delete file:', err);
    }

    onChange(value.filter((v) => v !== url));
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={className}>
      {/* 드롭존 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          isDragOver
            ? 'border-primary-400 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              클릭 또는 드래그하여 업로드
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {acceptedTypes.map((t) => t.split('/')[1].toUpperCase()).join(', ')} • 최대 {maxSizeMB}MB
            </p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 업로드 중인 파일 */}
      {uploading.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploading.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
            >
              <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
              <span className="text-sm text-gray-700 truncate flex-1">
                {file.name}
              </span>
              {file.error && (
                <span className="text-xs text-red-600">{file.error}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 이미지 미리보기 그리드 */}
      {value.length > 0 && (
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
            >
              <img
                src={url}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => handleRemove(url)}
                  className="absolute top-1 right-1 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 파일 개수 표시 */}
      {maxFiles && (
        <p className="mt-2 text-xs text-gray-500 text-right">
          {value.length}/{maxFiles}개
        </p>
      )}
    </div>
  );
}
