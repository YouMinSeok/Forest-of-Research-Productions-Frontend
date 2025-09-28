// src/services/api.js
import axios from 'axios';

// ✅ 전역 기본값을 확실히 끈다 (쿠키 미사용)
axios.defaults.withCredentials = false;

// ===========================
// 내부 스토리지 유틸
// ===========================
const getAccessToken = () =>
  sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || null;

const getRefreshToken = () =>
  sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token') || null;

const saveTokens = (accessToken, refreshToken) => {
  try {
    if (accessToken) {
      sessionStorage.setItem('access_token', accessToken);
      localStorage.setItem('access_token', accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
  } catch (e) {
    console.warn('토큰 저장 중 오류:', e);
  }
};

export const removeExpiredToken = () => {
  try {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('user');
    // 쿠키 인증은 쓰지 않지만 혹시 남아있다면 제거
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  } catch (e) {
    console.warn('토큰 제거 중 오류:', e);
  }
};

// ===========================
// 안전한 base64url 디코딩 & JWT 도우미
// ===========================
const base64UrlDecode = (str) => {
  try {
    const pad = (s) => s + '='.repeat((4 - (s.length % 4)) % 4);
    const b64 = pad(str.replace(/-/g, '+').replace(/_/g, '/'));
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

const decodeJWT = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payloadJson = base64UrlDecode(parts[1]);
  if (!payloadJson) return null;
  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
};

export const isTokenExpired = (token, clockSkewSec = 120) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const nowMs = Date.now();
  const expMs = payload.exp * 1000;
  return nowMs >= (expMs - clockSkewSec * 1000); // 120초 시계 오차 허용
};

// 디버깅용: 토큰 상태 확인 (개발 환경에서만)
export const debugTokenStatus = () => {
  // 프로덕션 환경에서는 디버깅 정보를 출력하지 않음
  if (process.env.NODE_ENV !== 'development') {
    return { accessToken: null, refreshToken: null };
  }

  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  console.log('=== 토큰 상태 디버깅 ===');
  console.log('Access Token:', accessToken ? '있음' : '없음');
  console.log('Refresh Token:', refreshToken ? '있음' : '없음');

  if (accessToken) {
    const payload = decodeJWT(accessToken);
    if (payload) {
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      const timeLeft = exp - now;
      console.log('Access Token 만료까지:', timeLeft > 0 ? `${timeLeft}초 남음` : `${Math.abs(timeLeft)}초 전 만료`);
      console.log('Access Token 만료 시간:', new Date(exp * 1000).toLocaleString());
      console.log('현재 시간:', new Date().toLocaleString());
      console.log('토큰 만료 여부:', isTokenExpired(accessToken));
    } else {
      console.log('Access Token 디코딩 실패');
    }
  }

  if (refreshToken) {
    const payload = decodeJWT(refreshToken);
    if (payload) {
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      const timeLeft = exp - now;
      console.log('Refresh Token 만료까지:', timeLeft > 0 ? `${timeLeft}초 남음` : `${Math.abs(timeLeft)}초 전 만료`);
      console.log('Refresh Token 만료 시간:', new Date(exp * 1000).toLocaleString());
      console.log('Refresh Token 만료 여부:', isTokenExpired(refreshToken));
    } else {
      console.log('Refresh Token 디코딩 실패');
    }
  }

  return { accessToken, refreshToken };
};

// 강제 토큰 정리 및 로그인 페이지 이동
export const forceLogout = (message = '로그인이 만료되었습니다. 다시 로그인해주세요.') => {
  console.log('🚪 강제 로그아웃 실행');
  removeExpiredToken();
  alert(message);
  window.location.href = '/login';
};

// ===========================
// API 베이스 URL
// ===========================
const getApiBaseUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;

  if (backendUrl) return backendUrl;
  if (apiBaseUrl) return apiBaseUrl;

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

// 개발 환경에서만 디버그 정보 출력
if (process.env.NODE_ENV === 'development') {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
}

// 개발 환경에서만 디버그 정보 출력
if (process.env.NODE_ENV === 'development') {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('NODE_ENV:', process.env.NODE_ENV);
}

// ===========================
// Axios 인스턴스
// ===========================
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // 쿠키 미사용(헤더 토큰만 사용)
  headers: { 'Content-Type': 'application/json' },
});

// ===========================
// 토큰 자동 리프레시(중복 요청 억제)
// - refresh_token 있으면 바디로 /api/auth/refresh
// - 없으면 Authorization(구 access) 헤더로 /api/auth/refresh
// ===========================
let refreshPromise = null;

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise; // 이미 진행 중이면 그 Promise 재사용

  const refresh_token = getRefreshToken();
  const oldAccess = getAccessToken();

  if (!refresh_token && !oldAccess) {
    throw new Error('리프레시에 사용할 토큰이 없습니다.');
  }

  // 별도 axios로 호출 (인스턴스 인터셉터 영향 배제)
  refreshPromise = (async () => {
    try {
      let res;
      if (refresh_token) {
        // 1) refresh_token 방식
        res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refresh_token },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: false,
          }
        );
      } else {
        // 2) Authorization(구 access) 방식
        res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          {
            headers: { Authorization: `Bearer ${oldAccess}` },
            withCredentials: false,
          }
        );
      }

      const { access_token, refresh_token: newRefresh } = res.data || {};
      if (!access_token) throw new Error('새 access_token이 응답에 없습니다.');
      // 새 토큰 저장 (refresh_token이 오면 갱신)
      saveTokens(access_token, newRefresh || refresh_token || null);
      return access_token;
    } catch (err) {
      // 리프레시 실패 → 완전 로그아웃
      removeExpiredToken();
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// ===========================
// 요청 인터셉터
// ===========================
api.interceptors.request.use(
  (config) => {
    // 요청 단위로도 withCredentials 확실히 차단
    config.withCredentials = false;

    // Authorization 헤더 첨부
    const token = getAccessToken();
    console.log('🔍 토큰 확인:', {
      sessionToken: sessionStorage.getItem('access_token') ? '있음' : '없음',
      localToken: localStorage.getItem('access_token') ? '있음' : '없음',
      cookieToken: '사용안함',
      selectedToken: token ? '선택됨' : '없음',
      tokenValue: token ? token.slice(0, 20) + '...' : 'null'
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('토큰이 없어서 Authorization 헤더를 추가하지 않습니다.');
    }

    // FormData 처리 → 브라우저가 boundary 포함해서 자동 설정
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 공개/상태 체크 API (여기서는 401이어도 리다이렉트/리프레시 트리거 X)
const isPublicReadAPI = (url = '') => {
  const list = ['/api/board/', '/api/activity/recent', '/api/banner/', '/api/auth/me', '/api/attachment/'];
  return (
    list.some((p) => url.includes(p)) ||
    /^\/api\/board\/[^/]+$/.test(url) ||
    /^\/api\/board\/[^/]+\/view$/.test(url) ||
    /^\/api\/board\/[^/]+\/comments$/.test(url) ||
    /^\/api\/attachment\/post\/[^/]+$/.test(url) ||
    /^\/api\/attachment\/secure\/[^/]+$/.test(url)
  );
};

// ===========================
// 응답 인터셉터 (401 처리 핵심)
// ===========================
api.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('secure-upload')) {
      console.log('✅ 파일 업로드 성공 응답:', response.data);
    }
    return response;
  },
  async (error) => {
    const original = error.config || {};
    const url = original.url || '';
    const status = error.response?.status;

    // 네트워크/기타
    if (!status) {
      console.error('📡 네트워크 오류:', error.message);
      return Promise.reject(error);
    }

    // 401 이외는 그대로
    if (status !== 401) {
      console.error('🚨 응답 에러:', status, error.response?.data);
      return Promise.reject(error);
    }

    // 공개 API/상태체크 or 인증 페이지라면 401이어도 리다이렉트 금지
    const authPages = ['/login', '/signup', '/find-password', '/find-username', '/verify-signup'];
    const onAuthPage = authPages.some((p) => window.location.pathname.includes(p));

    console.log('🔍 401 에러 발생:', { url, onAuthPage, isPublic: isPublicReadAPI(url) });

    if (isPublicReadAPI(url) || onAuthPage) {
      console.log('👁️ 공개 API 또는 인증 페이지 → 리다이렉트 건너뜀');
      return Promise.reject(error);
    }

    // 이미 리트라이한 요청이라면 더 이상 시도하지 않음
    if (original._retry) {
      console.log('🔁 재시도 후에도 401');

      // 첨부파일 관련 API는 비치명적으로 처리 (토큰 유지)
      const isAttachmentAPI = url.includes('/api/attachment/') ||
                              (url.includes('/api/boards/') && url.includes('/attachments'));

      if (isAttachmentAPI) {
        console.log('📎 첨부파일 API 401 → 토큰 유지하고 에러만 전달');
        return Promise.reject(error);
      }

      // 다른 API는 기존과 동일하게 로그아웃 처리
      console.log('🔁 토큰 제거');
      removeExpiredToken();
      // 토큰 만료 시 자동으로 로그인 페이지로 이동
      if (!window.location.pathname.includes('/login')) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      }
      return Promise.reject(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'));
    }

    // 여기서 '한 번만' 리프레시 시도
    original._retry = true;
    try {
      console.log('🔄 토큰 리프레시 시도...');
      const refreshSuccess = await refreshAccessToken();

      if (!refreshSuccess) {
        console.log('❌ 리프레시 실패');
        removeExpiredToken();
        // 토큰 만료 시 자동으로 로그인 페이지로 이동
        if (!window.location.pathname.includes('/login')) {
          alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
          window.location.href = '/login';
        }
        return Promise.reject(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'));
      }

      // 리프레시 성공 - 새 토큰으로 원 요청 재시도
      const newToken = getAccessToken();
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newToken}`;
      original.withCredentials = false;

      console.log('✅ 토큰 리프레시 성공, 요청 재시도');
      return api.request(original);
    } catch (e) {
      // 리프레시 실패 → 토큰 제거
      console.warn('리프레시 실패:', e?.message || e);
      removeExpiredToken();
      // 토큰 만료 시 자동으로 로그인 페이지로 이동
      if (!window.location.pathname.includes('/login')) {
        alert('로그인이 만료되었습니다. 다시 로그인해주세요.');
        window.location.href = '/login';
      }
      return Promise.reject(new Error('인증이 만료되었습니다. 다시 로그인해주세요.'));
    }
  }
);

// =============================
// 실제 API 래퍼 함수들
// =============================

// 게시글 관련 API
export const fetchBoardPosts = async (boardType) => {
  const res = await api.get('/api/board/', { params: { category: boardType } });
  return res.data;
};

export const createBoardPost = async (boardType, postData) => {
  const res = await api.post('/api/board/create', { board: boardType, ...postData });
  return res.data;
};

export const fetchBoardPost = async (postId) => {
  const res = await api.get(`/api/board/${postId}`);
  return res.data;
};

export const incrementBoardView = async (postId) => {
  const res = await api.post(`/api/board/${postId}/view`);
  return res.data;
};

export const likeBoardPost = async (postId) => {
  try {
    const res = await api.post(`/api/board/${postId}/like`);
    const data = res.data;

    if (data.require_login || data.likeStatus === 'login_required') {
      return {
        success: false,
        requireLogin: true,
        message: data.message || '좋아요 기능을 사용하려면 로그인이 필요합니다.',
        likeStatus: data.likeStatus,
      };
    }

    return {
      success: true,
      likeStatus: data.likeStatus,
      message: data.message,
      requireLogin: false,
    };
  } catch (error) {
    if (error.response?.status === 403) {
      return {
        success: false,
        requireLogin: true,
        message: '좋아요 기능을 사용하려면 로그인이 필요합니다.',
        likeStatus: 'login_required',
      };
    }
    throw error;
  }
};

// 댓글 관련 API
export const fetchComments = async (postId) => {
  const res = await api.get(`/api/board/${postId}/comments`);
  return res.data;
};

export const createComment = async (postId, commentData) => {
  const res = await api.post(`/api/board/${postId}/comments/create`, commentData);
  return res.data;
};

export const deleteComment = async (postId, commentId) => {
  const res = await api.delete(`/api/board/${postId}/comments/${commentId}`);
  return res.data;
};

export const updateComment = async (postId, commentId, commentData) => {
  const res = await api.put(`/api/board/${postId}/comments/${commentId}`, commentData);
  return res.data;
};

// 현재 로그인된 사용자 정보
export const getCurrentUser = async () => {
  // ✅ 토큰이 아예 없으면 서버를 호출하지 않고 게스트 처리 (초기 401 방지)
  const at = getAccessToken();
  if (!at) {
    return { user: null, guest: true };
  }

  try {
    const res = await api.get('/api/auth/me');
    console.log('🔍 getCurrentUser API 응답:', res.data);

    // 응답 형식을 일관되게 처리
    if (res.data.user) {
      return { user: res.data.user, guest: false };
    } else if (res.data && (res.data.id || res.data._id)) {
      // 응답이 직접 사용자 객체인 경우
      return { user: res.data, guest: false };
    } else {
      console.warn('예상하지 못한 응답 형식:', res.data);
      return { user: null, guest: true };
    }
  } catch (error) {
    console.error('getCurrentUser 실패:', error);
    return { user: null, guest: true };
  }
};

// 최근 활동 관련
export const fetchRecentActivities = async (limit = 10) => {
  const res = await api.get('/api/activity/recent', { params: { limit } });
  return res.data;
};

export const fetchRecentPosts = async (limit = 10) => {
  const res = await api.get('/api/activity/recent-posts', { params: { limit } });
  return res.data;
};

export const fetchRecentComments = async (limit = 10) => {
  const res = await api.get('/api/activity/recent-comments', { params: { limit } });
  return res.data;
};

export const fetchRecentSignups = async (limit = 10) => {
  const res = await api.get('/api/activity/recent-signups', { params: { limit } });
  return res.data;
};

// 로그아웃
export const logoutUser = async () => {
  try {
    await api.post('/api/auth/logout');
  } finally {
    removeExpiredToken(); // 서버 실패해도 클라이언트 토큰은 제거
  }
};

export default api;
