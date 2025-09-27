// src/api/draft.js
import api from '../services/api';

/**
 * 임시저장 API 클라이언트
 * 엔터프라이즈 파일 시스템과 연동된 안전한 임시저장 기능
 */

// 임시저장 생성 또는 업데이트
export const saveDraft = async (draftData) => {
  try {
    const response = await api.post('/api/draft/save', draftData);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('임시저장 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '임시저장 중 오류가 발생했습니다.'
    };
  }
};

// 자동 저장 (1분마다 호출)
export const autoSaveDraft = async (draftId, title, content) => {
  try {
    const response = await api.post('/api/draft/auto-save', {
      draft_id: draftId,
      title: title || '',
      content: content || '',
      save_type: 'auto'
    });
    return {
      success: true,
      saved_at: response.data.saved_at
    };
  } catch (error) {
    console.error('자동저장 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '자동저장 실패'
    };
  }
};

// 사용자 임시저장 목록 조회
export const getDraftList = async (board = null, limit = 20, offset = 0) => {
  try {
    const params = { limit, offset };
    if (board) params.board = board;

    const response = await api.get('/api/draft/list', { params });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('임시저장 목록 조회 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '목록 조회 중 오류가 발생했습니다.'
    };
  }
};

// 특정 임시저장 조회
export const getDraft = async (draftId) => {
  try {
    // draftId 유효성 검사
    if (!draftId || typeof draftId !== 'string' || draftId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(draftId)) {
      console.warn('유효하지 않은 draft ID:', draftId);
      return {
        success: false,
        error: '유효하지 않은 임시저장 ID입니다.'
      };
    }

    const response = await api.get(`/api/draft/${draftId}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.warn('임시저장 조회 중 오류 발생:', error);

    // 서버 오류 타입에 따른 적절한 메시지 반환
    if (error.response?.status === 500) {
      return {
        success: false,
        error: '서버 오류로 인해 임시저장을 불러올 수 없습니다.'
      };
    } else if (error.response?.status === 404) {
      return {
        success: false,
        error: '임시저장된 글을 찾을 수 없습니다.'
      };
    } else {
      return {
        success: false,
        error: error.response?.data?.detail || '임시저장을 불러오는 중 오류가 발생했습니다.'
      };
    }
  }
};

// 임시저장에 파일 업로드 (엔터프라이즈 파일 시스템)
export const uploadFileToDraft = async (draftId, file, onProgress = null) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await api.post(`/api/draft/${draftId}/upload-file`, formData, config);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('드래프트 파일 업로드 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '파일 업로드 중 오류가 발생했습니다.'
    };
  }
};

// 임시저장 삭제
export const deleteDraft = async (draftId) => {
  try {
    const response = await api.delete(`/api/draft/${draftId}`);
    return {
      success: true,
      message: response.data.message
    };
  } catch (error) {
    console.error('임시저장 삭제 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '삭제 중 오류가 발생했습니다.'
    };
  }
};

// 임시저장을 정식 게시글로 발행
export const publishDraft = async (draftId, publishData = {}) => {
  try {
    const response = await api.post(`/api/draft/${draftId}/publish`, publishData);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('게시글 발행 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '게시글 발행 중 오류가 발생했습니다.'
    };
  }
};

// 임시저장 통계
export const getDraftStats = async () => {
  try {
    const response = await api.get('/api/draft/stats/summary');
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('임시저장 통계 조회 실패:', error);
    return {
      success: false,
      error: error.response?.data?.detail || '통계 조회 중 오류가 발생했습니다.'
    };
  }
};

// 임시저장 상태 관리를 위한 헬퍼 함수들
export const draftManager = {
  // 로컬 스토리지에서 임시저장 ID 관리
  getDraftId: (board) => {
    return localStorage.getItem(`draft_${board}`);
  },

  setDraftId: (board, draftId) => {
    localStorage.setItem(`draft_${board}`, draftId);
  },

  removeDraftId: (board) => {
    localStorage.removeItem(`draft_${board}`);
  },

  // 자동저장 타이머 관리
  autoSaveTimer: null,

  startAutoSave: (draftId, getTitleAndContent, interval = 60000) => {
    if (draftManager.autoSaveTimer) {
      clearInterval(draftManager.autoSaveTimer);
    }

    draftManager.autoSaveTimer = setInterval(async () => {
      const { title, content } = getTitleAndContent();

      // 제목이나 내용이 있을 때만 자동저장
      if (title.trim() || content.trim()) {
        const result = await autoSaveDraft(draftId, title, content);
        if (result.success) {
          // console.log('자동저장 완료:', result.saved_at);
        }
      }
    }, interval);
  },

  stopAutoSave: () => {
    if (draftManager.autoSaveTimer) {
      clearInterval(draftManager.autoSaveTimer);
      draftManager.autoSaveTimer = null;
    }
  },

  // 페이지 이탈 감지 및 임시저장
  setupBeforeUnload: (draftId, getTitleAndContent) => {
    const handleBeforeUnload = (event) => {
      const { title, content } = getTitleAndContent();

      if (title.trim() || content.trim()) {
        // 동기적 자동저장 시도 (fetch with keepalive)
        try {
          const token = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
          const apiBaseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

          fetch(`${apiBaseUrl}/api/draft/auto-save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({
              draft_id: draftId,
              title,
              content,
              save_type: 'before_unload'
            }),
            keepalive: true
          }).catch(err => console.warn('페이지 이탈 시 저장 실패:', err));
        } catch (error) {
          console.warn('페이지 이탈 시 저장 실패:', error);
        }

        event.preventDefault();
        event.returnValue = '작성 중인 내용이 임시저장됩니다.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // 정리 함수 반환
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
};

// 임시저장 관련 상수
export const DRAFT_CONFIG = {
  AUTO_SAVE_INTERVAL: 60000, // 1분
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_LENGTH: 50000,
  SUPPORTED_FILE_TYPES: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ],
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  TTL_DAYS: 7 // 7일 후 자동 삭제
};

const draftAPI = {
  saveDraft,
  autoSaveDraft,
  getDraftList,
  getDraft,
  uploadFileToDraft,
  deleteDraft,
  publishDraft,
  getDraftStats,
  draftManager,
  DRAFT_CONFIG
};

export default draftAPI;
