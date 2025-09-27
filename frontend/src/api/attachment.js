import api from '../services/api';

// 🚀 구글 드라이브 직접 업로드 (속도 개선)
export const uploadFileDirect = async (postId, file, onProgress = null) => {
  try {
    // 1. 백엔드에서 업로드 세션 생성
    const sessionFormData = new FormData();
    sessionFormData.append('post_id', postId);
    sessionFormData.append('filename', file.name);
    sessionFormData.append('mime_type', file.type || 'application/octet-stream');
    sessionFormData.append('file_size', file.size.toString());

    const sessionResponse = await api.post('/api/attachment/start-direct-upload', sessionFormData);
    const { upload_url, access_token, chunk_size } = sessionResponse.data;

    console.log('🚀 직접 업로드 세션 생성됨:', { upload_url, chunk_size });

    // 2. 브라우저에서 구글 드라이브로 직접 업로드 (청크 단위)
    const CHUNK_SIZE = chunk_size || 32 * 1024 * 1024; // 32MB
    let start = 0;
    let uploadedBytes = 0;

    while (start < file.size) {
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const headers = {
        'Authorization': `Bearer ${access_token}`,
        'Content-Length': chunk.size.toString(),
        'Content-Range': `bytes ${start}-${end-1}/${file.size}`
      };

      const response = await fetch(upload_url, {
        method: 'PUT',
        headers: headers,
        body: chunk
      });

      // 진행률 업데이트
      uploadedBytes += chunk.size;
      if (onProgress) {
        const percentCompleted = Math.round((uploadedBytes * 100) / file.size);
        onProgress(percentCompleted);
      }

      // 업로드 완료 확인
      if (response.status === 200 || response.status === 201) {
        // 업로드 완료
        const result = await response.json();
        console.log('✅ 직접 업로드 완료:', result);

        // 3. 백엔드에 업로드 완료 통보
        const completeFormData = new FormData();
        completeFormData.append('post_id', postId);
        completeFormData.append('filename', file.name);
        completeFormData.append('file_id', result.id);
        completeFormData.append('file_size', file.size.toString());

        const completeResponse = await api.post('/api/attachment/complete-direct-upload', completeFormData);
        return completeResponse.data;

      } else if (response.status === 308) {
        // 계속 업로드 (resumable)
        start = end;
        console.log(`📤 청크 업로드 중: ${Math.round((uploadedBytes * 100) / file.size)}%`);
      } else {
        throw new Error(`업로드 실패: ${response.status} ${response.statusText}`);
      }
    }

  } catch (error) {
    console.error('직접 업로드 실패:', error);
    // 실패 시 기존 방식으로 폴백
    console.log('🔄 기존 업로드 방식으로 폴백...');
    return await uploadFile(postId, file, onProgress);
  }
};

// 파일 업로드 (고급 시스템)
export const uploadFile = async (postId, file, onProgress = null) => {
  const formData = new FormData();
  formData.append('post_id', postId);
  formData.append('file', file);

  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };

  // 업로드 진행률 콜백이 있으면 추가
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress(percentCompleted);
    };
  }

  const response = await api.post(
    '/api/attachment/upload',
    formData,
    config
  );

  return response.data;
};

// 게시글의 첨부파일 목록 조회 (개선됨)
export const getPostAttachments = async (postId) => {
  try {
    // postId 유효성 검사
    if (!postId || typeof postId !== 'string' || postId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(postId)) {
      console.warn('유효하지 않은 post ID:', postId);
      return { attachments: [] };
    }

    const response = await api.get(
      `/api/attachment/post/${postId}`
    );

    return response.data;
  } catch (error) {
    console.warn('첨부파일 조회 중 오류 발생:', error);

    // 서버 오류 시 빈 배열 반환 (게스트 사용자 401 포함)
    if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 500) {
      return { attachments: [] };
    }

    // 기타 오류 시 에러 재발생
    throw error;
  }
};

// 파일 다운로드 (보안 강화)
export const downloadFile = async (attachmentId, filename) => {
  try {
    const response = await api.get(
      `/api/attachment/download/${attachmentId}`,
      {
        responseType: 'blob',
      }
    );

    // 브라우저에서 파일 다운로드
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, data: response.data };
  } catch (error) {
    console.error('파일 다운로드 실패:', error);
    throw error;
  }
};

// 첨부파일 삭제 (보안 강화)
export const deleteAttachment = async (attachmentId) => {
  const response = await api.delete(
    `/api/attachment/${attachmentId}`
  );

  return response.data;
};

// 첨부파일 상세 정보 조회 (개선됨)
export const getAttachmentInfo = async (attachmentId) => {
  const response = await api.get(
    `/api/attachment/info/${attachmentId}`
  );

  return response.data;
};

// 사용자 저장소 정보 조회 (신규)
export const getUserStorageInfo = async (userId) => {
  const response = await api.get(
    `/api/attachment/user/${userId}/storage`
  );

  return response.data;
};

// 파일 업로드 상태 확인 (신규)
export const checkFileStatus = async (attachmentId) => {
  try {
    const info = await getAttachmentInfo(attachmentId);
    return {
      exists: true,
      isVerified: info.security_status === 'verified',
      isDuplicate: info.is_duplicate || false,
      fileType: info.file_type,
      size: info.file_size,
      uploadDate: info.upload_date
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

// Google Drive 연결 상태 확인 (신규)
export const getGoogleDriveStatus = async () => {
  try {
    const response = await api.get('/api/attachment/google-drive/status');
    return response.data;
  } catch (error) {
    console.error('Google Drive 상태 확인 실패:', error);
    return {
      status: 'error',
      error: error.message,
      message: 'Google Drive 상태를 확인할 수 없습니다.'
    };
  }
};

// Google Drive 연결 테스트 (관리자용)
export const testGoogleDriveConnection = async () => {
  try {
    const response = await api.get('/api/attachment/google-drive/test');
    return response.data;
  } catch (error) {
    console.error('Google Drive 연결 테스트 실패:', error);
    throw error;
  }
};

// 저장소 마이그레이션 상태 확인 (관리자용)
export const getStorageMigrationStatus = async () => {
  try {
    const response = await api.get('/api/attachment/storage-migration/status');
    return response.data;
  } catch (error) {
    console.error('마이그레이션 상태 확인 실패:', error);
    throw error;
  }
};

// 파일 타입별 아이콘 반환 (유틸리티)
export const getFileTypeIcon = (fileType, _mimeType) => {
  const iconMap = {
    'image': '🖼️',
    'video': '🎬',
    'audio': '🎵',
    'pdf': '📄',
    'document': '📝',
    'spreadsheet': '📊',
    'presentation': '📱',
    'archive': '📦',
    'text': '📰',
    'other': '📄'
  };

  return iconMap[fileType] || iconMap['other'];
};

// 파일 크기 포맷팅 (유틸리티)
export const formatFileSize = (bytes) => {
  // undefined, null, NaN 값들을 안전하게 처리
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes < 0) {
    return '0 Bytes';
  }

  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 파일 업로드 가능 여부 검사 (클라이언트측 사전 검증)
export const validateFileUpload = (file) => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedExtensions = [
    // 텍스트/문서
    '.txt', '.csv', '.md', '.rtf', '.json', '.xml',
    // MS Office & 호환 문서
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // 한글 문서 (구버전 + 신버전)
    '.hwp', '.hwpx',
    // LibreOffice 문서
    '.odt', '.ods', '.odp',
    // 이미지
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico',
    // 비디오
    '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v',
    // 오디오
    '.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma',
    // 압축파일
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    // 기타 자주 사용되는 형식
    '.epub', '.mobi'
  ];

  const errors = [];

  // 파일 크기 검사
  if (file.size > maxSize) {
    errors.push(`파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxSize)}까지 허용됩니다.`);
  }

  // 확장자 검사
  const fileExt = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(fileExt)) {
    errors.push(`허용되지 않는 파일 형식입니다: ${fileExt}`);
  }

  // 파일명 길이 검사
  if (file.name.length > 255) {
    errors.push('파일명이 너무 깁니다. 255자 이하로 해주세요.');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    fileInfo: {
      name: file.name,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      type: file.type,
      extension: fileExt
    }
  };
};

// 다중 파일 업로드 (신규)
export const uploadMultipleFiles = async (postId, files, onProgress = null) => {
  const results = [];
  const totalFiles = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      // 개별 파일 검증
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        results.push({
          file: file.name,
          success: false,
          errors: validation.errors
        });
        continue;
      }

      // 파일 업로드
      const progressCallback = onProgress ?
        (percent) => onProgress(i, percent, totalFiles) : null;

      const result = await uploadFileDirect(postId, file, progressCallback);

      results.push({
        file: file.name,
        success: true,
        data: result
      });

    } catch (error) {
      results.push({
        file: file.name,
        success: false,
        error: error.message || '업로드 실패'
      });
    }
  }

  return {
    totalFiles: totalFiles,
    successCount: results.filter(r => r.success).length,
    failCount: results.filter(r => !r.success).length,
    results: results
  };
};

// 첨부파일 미리보기 URL 생성 (이미지용)
export const getPreviewUrl = (attachmentId) => {
  const baseUrl = process.env.REACT_APP_API_URL || '';
  return `${baseUrl}/api/attachment/download/${attachmentId}`;
};

// 안전한 파일명 생성 (클라이언트측)
export const sanitizeFilename = (filename) => {
  // 위험한 문자 제거
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
};
