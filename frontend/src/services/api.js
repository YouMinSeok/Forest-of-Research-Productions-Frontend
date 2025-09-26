// services/api
import axios from 'axios';
import { getCookie, isTokenExpired, removeExpiredToken } from './auth';

// 환경변수 기반 API URL 설정
const getApiBaseUrl = () => {
  // 우선순위: REACT_APP_BACKEND_URL > REACT_APP_API_BASE_URL > 호스트+포트 조합
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  if (backendUrl) {
    return backendUrl;
  }

  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  // 로컬 개발용 호스트+포트 조합
  const hostIp = process.env.REACT_APP_HOST_IP;
  const port = process.env.REACT_APP_API_PORT || '8080';

  if (!hostIp) {
    throw new Error('백엔드 URL이 설정되지 않았습니다. REACT_APP_BACKEND_URL 또는 REACT_APP_HOST_IP를 설정해주세요.');
  }

  const protocol = port === '443' || port === '80' ? 'https' : 'http';
  const portSuffix = (port === '443' || port === '80') ? '' : `:${port}`;

  return `${protocol}://${hostIp}${portSuffix}`;
};

const API_BASE_URL = getApiBaseUrl();

console.log("API_BASE_URL:", API_BASE_URL); // 실제 값 확인
console.log("NODE_ENV:", process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // JWT 토큰 자동 첨부 (우선순위: sessionStorage > localStorage > cookie)
    const token = sessionStorage.getItem('access_token') ||
                  localStorage.getItem('access_token') ||
                  getCookie('access_token');

    if (token) {
      // 토큰 만료 확인
      if (isTokenExpired(token)) {
        console.log('토큰이 만료되었습니다. 로그아웃 처리합니다.');

        // 게시판 조회 관련 API는 로그인 없이도 접근 가능하도록 허용
        const publicReadOnlyAPIs = [
          '/api/board/',           // 게시글 목록
          '/api/activity/recent',  // 최근 활동들
        ];

        const requestUrl = config.url || '';
        const isPublicReadAPI = publicReadOnlyAPIs.some(api => requestUrl.includes(api)) ||
                               requestUrl.match(/^\/api\/board\/[^\/]+$/) ||           // GET /api/board/{id}
                               requestUrl.match(/^\/api\/board\/[^\/]+\/view$/) ||     // POST /api/board/{id}/view
                               requestUrl.match(/^\/api\/board\/[^\/]+\/comments$/);   // GET /api/board/{id}/comments

        if (!isPublicReadAPI) {
          removeExpiredToken();
          // 토큰이 만료된 경우 로그인 페이지로 리다이렉트
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(new Error('토큰이 만료되었습니다.'));
        } else {
          console.log('📖 공개 읽기 API - 만료된 토큰 무시하고 계속 진행');
          // 만료된 토큰은 제거하되 요청은 계속 진행
          removeExpiredToken();
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      console.log('토큰이 없어서 Authorization 헤더를 추가하지 않습니다.');
    }

    // FormData 처리
    if (config.data instanceof FormData) {
      console.log('🔧 FormData 감지: Content-Type 헤더 제거');
      console.log('📋 FormData 내용:');
      for (const pair of config.data.entries()) {
        if (pair[1] instanceof File) {
          console.log(`  ${pair[0]}:`, {
            name: pair[1].name,
            size: pair[1].size,
            type: pair[1].type
          });
        } else {
          console.log(`  ${pair[0]}:`, pair[1]);
        }
      }
      // Content-Type 헤더 삭제하여 브라우저가 자동으로 설정하도록 함
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    const url = error.config?.url || '';
    const isDraftAPI = url.includes('/api/draft/');
    const isAttachmentAPI = url.includes('/api/attachment/');

    // 임시저장이나 첨부파일 API 오류는 경고 레벨로 처리
    if (isDraftAPI || isAttachmentAPI) {
      console.warn('⚠️ API 요청 실패:', {
        url: url,
        status: error.response?.status,
        method: error.config?.method
      });
    } else {
      // 기타 중요한 API 오류는 에러 레벨로 처리
      console.error('🚨 응답 인터셉터 에러 감지:');
      console.error('  - 상태 코드:', error.response?.status);
      console.error('  - 응답 데이터:', error.response?.data);
      console.error('  - 요청 URL:', error.config?.url);
      console.error('  - 요청 방법:', error.config?.method);
    }

    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized
      if (status === 401) {
        console.log('🔐 인증 오류 감지 - 토큰 재확인');

        // 게시판 조회 관련 API는 로그인 없이도 접근 가능하도록 허용
        const publicReadOnlyAPIs = [
          '/api/board/',           // 게시글 목록
          '/api/activity/recent',  // 최근 활동들
        ];

        const requestUrl = error.config?.url || '';
        const isPublicReadAPI = publicReadOnlyAPIs.some(api => requestUrl.includes(api)) ||
                               requestUrl.match(/^\/api\/board\/[^\/]+$/) ||           // GET /api/board/{id}
                               requestUrl.match(/^\/api\/board\/[^\/]+\/view$/) ||     // POST /api/board/{id}/view
                               requestUrl.match(/^\/api\/board\/[^\/]+\/comments$/);   // GET /api/board/{id}/comments

        if (!isPublicReadAPI) {
          // 토큰 제거 및 로그인 페이지로 리다이렉트
          removeExpiredToken();

          // 현재 페이지가 로그인 페이지가 아니면 리다이렉트
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } else {
          console.log('📖 공개 읽기 API - 로그인 리다이렉트 없이 계속 진행');
        }

        console.error('  - 에러 메시지:', data?.detail || data?.message);
        console.error('  - 전체 응답:', JSON.stringify(data, null, 2));
      }

      // 403 Forbidden
      if (status === 403) {
        console.error('🚫 권한 오류:', data?.detail || '접근 권한이 없습니다.');
      }

      // 500 Internal Server Error - 임시저장/첨부파일이 아닌 경우만 에러 표시
      if (status === 500 && !isDraftAPI && !isAttachmentAPI) {
        console.error('💥 서버 오류:', data?.detail || '서버에서 오류가 발생했습니다.');
      }
    } else if (error.request) {
      console.error('📡 네트워크 오류: 서버에 연결할 수 없습니다.');
    } else {
      console.error('⚙️ 요청 설정 오류:', error.message);
    }

    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    // 성공 응답 로깅 (필요시)
    if (response.config.url?.includes('secure-upload')) {
      console.log('✅ 파일 업로드 성공 응답:', response.data);
    }
    return response;
  },
  (error) => {
    const url = error.config?.url || '';
    const isDraftAPI = url.includes('/api/draft/');
    const isAttachmentAPI = url.includes('/api/attachment/');

    // 임시저장이나 첨부파일 API 오류는 경고 레벨로 처리
    if (isDraftAPI || isAttachmentAPI) {
      console.warn('⚠️ API 응답 오류:', {
        url: url,
        status: error.response?.status,
        method: error.config?.method
      });
    } else {
      // 기타 중요한 API 오류는 에러 레벨로 처리
      console.error('🚨 응답 인터셉터 에러 감지:');
      console.error('  - 상태 코드:', error.response?.status);
      console.error('  - 응답 데이터:', error.response?.data);
      console.error('  - 요청 URL:', error.config?.url);
      console.error('  - 요청 방법:', error.config?.method);
    }

    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized
      if (status === 401) {
        console.log('🔐 인증 오류 감지 - 토큰 재확인');

        // 게시판 조회 관련 API는 로그인 없이도 접근 가능하도록 허용
        const publicReadOnlyAPIs = [
          '/api/board/',           // 게시글 목록
          '/api/activity/recent',  // 최근 활동들
        ];

        const requestUrl = error.config?.url || '';
        const isPublicReadAPI = publicReadOnlyAPIs.some(api => requestUrl.includes(api)) ||
                               requestUrl.match(/^\/api\/board\/[^\/]+$/) ||           // GET /api/board/{id}
                               requestUrl.match(/^\/api\/board\/[^\/]+\/view$/) ||     // POST /api/board/{id}/view
                               requestUrl.match(/^\/api\/board\/[^\/]+\/comments$/);   // GET /api/board/{id}/comments

        if (!isPublicReadAPI) {
          // 토큰 제거 및 로그인 페이지로 리다이렉트
          removeExpiredToken();

          // 현재 페이지가 로그인 페이지가 아니면 리다이렉트
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } else {
          console.log('📖 공개 읽기 API - 로그인 리다이렉트 없이 계속 진행');
        }

        console.error('  - 에러 메시지:', data?.detail || data?.message);
        console.error('  - 전체 응답:', JSON.stringify(data, null, 2));
      }

      // 403 Forbidden
      if (status === 403) {
        console.error('🚫 권한 오류:', data?.detail || '접근 권한이 없습니다.');
      }

      // 500 Internal Server Error - 임시저장/첨부파일이 아닌 경우만 에러 표시
      if (status === 500 && !isDraftAPI && !isAttachmentAPI) {
        console.error('💥 서버 오류:', data?.detail || '서버에서 오류가 발생했습니다.');
      }
    } else if (error.request) {
      console.error('📡 네트워크 오류: 서버에 연결할 수 없습니다.');
    } else {
      console.error('⚙️ 요청 설정 오류:', error.message);
    }

    return Promise.reject(error);
  }
);

// 게시글 관련 API
export const fetchBoardPosts = async (boardType) => {
  try {
    const response = await api.get('/api/board/', {
      params: { category: boardType },
    });
    return response.data;
  } catch (error) {
    console.error("게시글 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const createBoardPost = async (boardType, postData) => {
  try {
    const response = await api.post('/api/board/create', {
      board: boardType,
      ...postData,
    });
    return response.data;
  } catch (error) {
    console.error("게시글 생성 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const fetchBoardPost = async (postId) => {
  try {
    const response = await api.get(`/api/board/${postId}`);
    return response.data;
  } catch (error) {
    console.error("단일 게시글 조회 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const incrementBoardView = async (postId) => {
  try {
    const response = await api.post(`/api/board/${postId}/view`);
    return response.data;
  } catch (error) {
    console.error("조회수 증가 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const likeBoardPost = async (postId) => {
  try {
    const response = await api.post(`/api/board/${postId}/like`);
    const data = response.data;

    // 백엔드에서 로그인이 필요한 경우
    if (data.require_login || data.likeStatus === 'login_required') {
      return {
        success: false,
        requireLogin: true,
        message: data.message || "좋아요 기능을 사용하려면 로그인이 필요합니다.",
        likeStatus: data.likeStatus
      };
    }

    // 성공적인 좋아요/좋아요 취소
    return {
      success: true,
      likeStatus: data.likeStatus,
      message: data.message,
      requireLogin: false
    };
  } catch (error) {
    console.error("좋아요 처리 실패:", error.response?.data || error.message);

    // 403 에러인 경우 로그인 필요로 처리
    if (error.response?.status === 403) {
      return {
        success: false,
        requireLogin: true,
        message: "좋아요 기능을 사용하려면 로그인이 필요합니다.",
        likeStatus: 'login_required'
      };
    }

    throw error;
  }
};

// 댓글 관련 API
export const fetchComments = async (postId) => {
  try {
    const response = await api.get(`/api/board/${postId}/comments`);
    return response.data;
  } catch (error) {
    console.error("댓글 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const createComment = async (postId, commentData) => {
  try {
    const response = await api.post(`/api/board/${postId}/comments/create`, commentData);
    return response.data;
  } catch (error) {
    console.error("댓글 작성 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteComment = async (postId, commentId) => {
  try {
    const response = await api.delete(`/api/board/${postId}/comments/${commentId}`);
    return response.data;
  } catch (error) {
    console.error("댓글 삭제 실패:", error.response?.data || error.message);
    throw error;
  }
};

export const updateComment = async (postId, commentId, commentData) => {
  try {
    const response = await api.put(`/api/board/${postId}/comments/${commentId}`, commentData);
    return response.data;
  } catch (error) {
    console.error("댓글 수정 실패:", error.response?.data || error.message);
    throw error;
  }
};

/**
 * 현재 로그인된 사용자 정보 가져오기 (/api/auth/me)
 */
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data; // 예: { user: { _id, name, email, ... } }
  } catch (error) {
    console.error("사용자 정보 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

// 최근 활동 관련 API
export const fetchRecentActivities = async (limit = 10) => {
  try {
    const response = await api.get('/api/activity/recent', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("최근 활동 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

// 최근 게시글 활동만 가져오기
export const fetchRecentPosts = async (limit = 10) => {
  try {
    const response = await api.get('/api/activity/recent-posts', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("최근 게시글 활동 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

// 최신 댓글 활동 가져오기
export const fetchRecentComments = async (limit = 10) => {
  try {
    const response = await api.get('/api/activity/recent-comments', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("최신 댓글 활동 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

// 최근 가입 활동 가져오기
export const fetchRecentSignups = async (limit = 10) => {
  try {
    const response = await api.get('/api/activity/recent-signups', {
      params: { limit },
    });
    return response.data;
  } catch (error) {
    console.error("최근 가입 활동 가져오기 실패:", error.response?.data || error.message);
    throw error;
  }
};

export default api;
