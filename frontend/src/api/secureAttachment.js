import api from '../services/api';

// 고급 보안 파일 업로드
export const secureUploadFile = async (postId, file, description = '', onProgress = null) => {
  const formData = new FormData();
  formData.append('post_id', postId);
  formData.append('file', file);
  formData.append('description', description);

  // FormData 내용 확인을 위한 디버깅 로그
  console.log('🔍 FormData 내용 확인:');
  console.log('  post_id:', postId);
  console.log('  file:', file?.name, file?.size, file?.type);
  console.log('  description:', description);

  const config = {
    headers: {
      // Content-Type을 설정하지 않음 - 브라우저가 자동으로 boundary와 함께 올바른 헤더 설정
    },
  };

  // 진행률 콜백이 있으면 추가
  if (onProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
      onProgress(percentCompleted);
    };
  }

  console.log('📤 파일 업로드 시작:', {
    url: '/api/secure-attachment/secure-upload',
    postId,
    fileName: file?.name,
    fileSize: file?.size
  });

  const response = await api.post(
    '/api/secure-attachment/secure-upload',
    formData,
    config
  );

  console.log('✅ 파일 업로드 응답:', response.data);
  return response.data;
};

// 보안 파일 다운로드
export const secureDownloadFile = async (attachmentId, token = null) => {
  let url = `/api/secure-attachment/secure-download/${attachmentId}`;

  if (token) {
    url += `?token=${token}`;
  }

  const response = await api.get(url, {
    responseType: 'blob',
  });

  return response;
};

// 다운로드 토큰 생성
export const generateDownloadToken = async (attachmentId) => {
  const response = await api.get(
    `/api/secure-attachment/download-token/${attachmentId}`
  );

  return response.data;
};

// 게시글의 버전별 첨부파일 조회
export const getPostAttachmentsWithVersions = async (postId) => {
  try {
    const response = await api.get(
      `/api/secure-attachment/post/${postId}/versions`
    );

    return response.data;
  } catch (error) {
    console.warn('버전별 첨부파일 조회 중 오류 발생:', error);

    // 서버 오류 시 빈 객체 반환 (게스트 사용자 401 포함)
    if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 404 || error.response?.status === 500) {
      return { version_groups: {} };
    }

    // 기타 오류 시 에러 재발생
    throw error;
  }
};

// 보안 파일 삭제
export const secureDeleteAttachment = async (attachmentId, reason = '사용자 요청') => {
  const formData = new FormData();
  formData.append('reason', reason);

  const response = await api.delete(
    `/api/secure-attachment/secure-delete/${attachmentId}`,
    {
      data: formData,
      headers: {
        // Content-Type을 설정하지 않음 - 브라우저가 자동으로 boundary와 함께 설정
      },
    }
  );

  return response.data;
};

// 파일 다운로드 헬퍼 함수
export const downloadFileHelper = async (attachmentId, filename, useToken = false) => {
  try {
    let response;

    if (useToken) {
      // 토큰 방식 다운로드
      const tokenData = await generateDownloadToken(attachmentId);
      response = await secureDownloadFile(attachmentId, tokenData.token);
    } else {
      // 직접 다운로드
      response = await secureDownloadFile(attachmentId);
    }

    // 브라우저에서 파일 다운로드
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, message: '파일이 다운로드되었습니다.' };

  } catch (error) {
    console.error('파일 다운로드 실패:', error);

    // 403 에러이고 토큰 방식을 아직 시도하지 않았다면 토큰 방식으로 재시도
    if (error.response?.status === 403 && !useToken) {
      console.log('🔄 403 에러 발생, 토큰 방식으로 재시도...');
      try {
        return await downloadFileHelper(attachmentId, filename, true);
      } catch (retryError) {
        console.error('토큰 방식 재시도도 실패:', retryError);
        // 토큰 방식도 실패하면 아래 기본 에러 처리로 진행
      }
    }

    let errorMessage = '파일 다운로드에 실패했습니다.';

    if (error.response?.status === 403) {
      errorMessage = '파일 다운로드 권한이 없습니다.';
    } else if (error.response?.status === 404) {
      errorMessage = '파일을 찾을 수 없습니다.';
    } else if (error.response?.status === 500) {
      errorMessage = '서버 오류로 다운로드에 실패했습니다.';
    }

    return { success: false, message: errorMessage };
  }
};

// 파일 크기 포맷 함수
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 파일 타입 검증
export const validateFileType = (file) => {
  const allowedTypes = [
    'text/plain', 'text/csv', 'text/html', 'text/css',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // PowerPoint 관련 MIME 타입들
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/mspowerpoint',
    'application/powerpoint',
    'application/x-mspowerpoint',
    // HWP 관련 MIME 타입들 추가
    'application/vnd.hancom.hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwpx',
    'application/hwpx',
    'application/x-hwp',
    'application/octet-stream', // HWP 파일이 종종 이 타입으로 인식됨
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
    'video/mp4', 'video/avi', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
  ];

  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.sh', '.bash', '.zsh', '.ps1', '.msi', '.deb', '.rpm', '.dmg',
    '.app', '.ipa', '.apk', '.pkg', '.run', '.bin'
  ];

  // 파일 확장자 검사
  const fileName = file.name.toLowerCase();
  const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));

  if (hasDangerousExtension) {
    return {
      isValid: false,
      error: '위험한 파일 확장자입니다. 실행 파일은 업로드할 수 없습니다.'
    };
  }

  // 특별 처리: HWP/PPT 파일의 경우 확장자로 추가 검증
  const isHwpFile = fileName.endsWith('.hwp') || fileName.endsWith('.hwpx');
  const isPptFile = fileName.endsWith('.ppt') || fileName.endsWith('.pptx');

  // MIME 타입 검사
  if (!allowedTypes.includes(file.type)) {
    // HWP 파일이면서 application/octet-stream인 경우 허용
    if (isHwpFile && file.type === 'application/octet-stream') {
      console.log(`✅ HWP 파일 확장자로 허용: ${file.name} (${file.type})`);
    }
    // PPT 파일이면서 application/octet-stream인 경우 허용
    else if (isPptFile && file.type === 'application/octet-stream') {
      console.log(`✅ PPT 파일 확장자로 허용: ${file.name} (${file.type})`);
    }
    else {
      return {
        isValid: false,
        error: `허용되지 않는 파일 형식입니다. (${file.type})`
      };
    }
  }

  // 파일 크기 검사 (50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: '파일 크기는 50MB 이하여야 합니다.'
    };
  }

  return { isValid: true };
};

// 업로드 상태 추적을 위한 클래스
export class UploadManager {
  constructor() {
    this.uploads = new Map(); // attachmentId -> uploadInfo
  }

  startUpload(fileId, fileName, fileSize) {
    this.uploads.set(fileId, {
      fileName,
      fileSize,
      progress: 0,
      status: 'uploading',
      startTime: Date.now(),
      error: null
    });
  }

  updateProgress(fileId, progress) {
    const upload = this.uploads.get(fileId);
    if (upload) {
      upload.progress = progress;
      upload.status = progress === 100 ? 'processing' : 'uploading';
    }
  }

  completeUpload(fileId, attachmentData) {
    const upload = this.uploads.get(fileId);
    if (upload) {
      upload.status = 'completed';
      upload.progress = 100;
      upload.attachmentData = attachmentData;
      upload.endTime = Date.now();
    }
  }

  failUpload(fileId, error) {
    const upload = this.uploads.get(fileId);
    if (upload) {
      upload.status = 'failed';
      upload.error = error;
      upload.endTime = Date.now();
    }
  }

  getUpload(fileId) {
    return this.uploads.get(fileId);
  }

  getAllUploads() {
    return Array.from(this.uploads.entries()).map(([id, upload]) => ({
      id,
      ...upload
    }));
  }

  clearCompleted() {
    for (const [fileId, upload] of this.uploads) {
      if (upload.status === 'completed') {
        this.uploads.delete(fileId);
      }
    }
  }

  clear() {
    this.uploads.clear();
  }
}

// 글로벌 업로드 매니저 인스턴스
export const uploadManager = new UploadManager();
