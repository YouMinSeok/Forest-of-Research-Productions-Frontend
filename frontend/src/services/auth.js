// src/services/auth.js
// 토큰/유저 상태 & 자동 리프레시 유틸 (쿠키 미사용)

/////////////////////////////
// (선택) 쿠키 유틸 - 미사용 //
/////////////////////////////
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

//////////////////////////
// base64url / JWT 유틸 //
//////////////////////////
const base64UrlDecode = (str) => {
  try {
    const pad = (s) => s + '='.repeat((4 - (s.length % 4)) % 4);
    const b64 = pad(str.replace(/-/g, '+').replace(/_/g, '/'));
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.warn('base64UrlDecode 실패:', e);
    return null;
  }
};

export const decodeJWT = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payloadJson = base64UrlDecode(parts[1]);
  if (!payloadJson) return null;
  try {
    return JSON.parse(payloadJson);
  } catch (e) {
    console.warn('JWT JSON 파싱 실패:', e);
    return null;
  }
};

// exp(초) vs Date.now()(ms) + 시계 오차 허용
export const isTokenExpired = (token, clockSkewSec = 120) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  const nowMs = Date.now();
  const expMs = payload.exp * 1000;
  const skewMs = clockSkewSec * 1000;
  return nowMs >= (expMs - skewMs);
};

//////////////////////
// 스토리지 헬퍼들  //
//////////////////////
const syncStorage = (key) => {
  const s = sessionStorage.getItem(key);
  const l = localStorage.getItem(key);
  if (s && !l) localStorage.setItem(key, s);
  if (l && !s) sessionStorage.setItem(key, l);
};

export const getAccessToken = () => {
  syncStorage('access_token');
  return sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || null;
};

export const getRefreshToken = () => {
  syncStorage('refresh_token');
  return sessionStorage.getItem('refresh_token') || localStorage.getItem('refresh_token') || null;
};

export const getStoredUser = () => {
  syncStorage('user');
  const raw = sessionStorage.getItem('user') || localStorage.getItem('user') || null;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveLoginState = (accessToken, user, refreshToken) => {
  try {
    if (accessToken) {
      sessionStorage.setItem('access_token', accessToken);
      localStorage.setItem('access_token', accessToken);
    }
    if (refreshToken) {
      sessionStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
    if (user) {
      const s = JSON.stringify(user);
      sessionStorage.setItem('user', s);
      localStorage.setItem('user', s);
    }
    // 새로 받은 토큰 기준으로 자동 리프레시 예약
    scheduleAutoRefresh();
  } catch (e) {
    console.warn('로그인 상태 저장 중 오류:', e);
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
    // 쿠키 인증은 안 쓰지만 혹시 남아있다면 제거
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  } catch (e) {
    console.warn('토큰 제거 중 오류:', e);
  } finally {
    clearAutoRefresh();
  }
};

/////////////////////////////
// 로그인 상태 판단 / 보조 //
/////////////////////////////
export const isValidLogin = () => {
  const accessToken = getAccessToken();
  const user = getStoredUser();

  console.log('isValidLogin 확인 중...');
  console.log('userData:', user ? JSON.stringify(user) : null);
  console.log('accessToken:', accessToken || null);

  if (!accessToken) {
    console.log('❌ 토큰 없음 - 로그인 상태 아님');
    return false;
  }

  if (isTokenExpired(accessToken)) {
    console.log('❌ 토큰 만료됨 - 자동 정리');
    removeExpiredToken(); // 만료된 토큰 즉시 제거
    return false;
  }

  if (!user) {
    console.log('❌ 사용자 정보 없음 - 로그인 상태 아님');
    return false;
  }

  console.log('✅ 유효한 로그인 상태');
  return true;
};

// 비동기 보조: 만료 임박/만료이면 자동 갱신 시도 후 true/false
export const ensureFreshToken = async () => {
  const accessToken = getAccessToken();
  if (!accessToken) return false;
  if (!isTokenExpired(accessToken)) return true;

  // 만료/임박 → 리프레시 시도
  const ok = await refreshAccessToken();
  return ok;
};

export const logout = () => {
  removeExpiredToken();
  window.location.reload();
};

// 강제 로그아웃 - 모든 인증 데이터 완전 삭제
export const forceLogout = () => {
  console.log('🚪 강제 로그아웃 수행');

  // 모든 스토리지 정리
  try {
    sessionStorage.clear();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');

    // 쿠키도 정리
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // 자동 리프레시 타이머 정리
    clearAutoRefresh();

    console.log('✅ 모든 인증 데이터 정리 완료');
  } catch (e) {
    console.warn('강제 로그아웃 중 오류:', e);
  }

  // 로그인 페이지로 이동
  window.location.href = '/login';
};

// 디버그용 - 모든 인증 상태 확인
export const debugAuthState = () => {
  console.log('🔍 === 인증 상태 디버그 ===');

  // 스토리지 확인
  console.log('📦 SessionStorage:');
  console.log('  - access_token:', sessionStorage.getItem('access_token'));
  console.log('  - refresh_token:', sessionStorage.getItem('refresh_token'));
  console.log('  - user:', sessionStorage.getItem('user'));

  console.log('💾 LocalStorage:');
  console.log('  - access_token:', localStorage.getItem('access_token'));
  console.log('  - refresh_token:', localStorage.getItem('refresh_token'));
  console.log('  - user:', localStorage.getItem('user'));

  // 쿠키 확인
  console.log('🍪 Cookies:', document.cookie);

  // 함수 호출 결과
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  const user = getStoredUser();

  console.log('🔧 함수 결과:');
  console.log('  - getAccessToken():', accessToken);
  console.log('  - getRefreshToken():', refreshToken);
  console.log('  - getStoredUser():', user);
  console.log('  - isTokenExpired():', accessToken ? isTokenExpired(accessToken) : 'N/A');
  console.log('  - isValidLogin():', isValidLogin());

  // 모든 스토리지 내용 출력
  console.log('🗂️ 전체 SessionStorage:');
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    console.log(`  - ${key}:`, sessionStorage.getItem(key));
  }

  console.log('🗂️ 전체 LocalStorage:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`  - ${key}:`, localStorage.getItem(key));
  }

  console.log('=== 디버그 끝 ===');

  return {
    sessionStorage: {
      access_token: sessionStorage.getItem('access_token'),
      refresh_token: sessionStorage.getItem('refresh_token'),
      user: sessionStorage.getItem('user')
    },
    localStorage: {
      access_token: localStorage.getItem('access_token'),
      refresh_token: localStorage.getItem('refresh_token'),
      user: localStorage.getItem('user')
    },
    cookies: document.cookie,
    functions: {
      accessToken,
      refreshToken,
      user,
      isTokenExpired: accessToken ? isTokenExpired(accessToken) : null,
      isValidLogin: isValidLogin()
    }
  };
};

// 글로벌에 디버그 함수 노출 (개발용)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.debugAuthState = debugAuthState;
  window.forceLogout = forceLogout;
}

/////////////////////////////////////
// 리프레시: fetch로 직접 호출 (no axios)
/////////////////////////////////////

// api baseURL 계산(쿠키/withCredentials 안 씀)
const getApiBaseUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL;
  if (backendUrl) return backendUrl;
  if (apiBaseUrl) return apiBaseUrl;

  const hostIp = process.env.REACT_APP_HOST_IP;
  const port = process.env.REACT_APP_API_PORT || '8080';
  if (!hostIp) throw new Error('백엔드 URL이 설정되지 않았습니다. REACT_APP_BACKEND_URL 또는 REACT_APP_HOST_IP를 설정해주세요.');

  const protocol = (port === '443' || port === '80') ? 'https' : 'http';
  const portSuffix = (port === '443' || port === '80') ? '' : `:${port}`;
  return `${protocol}://${hostIp}${portSuffix}`;
};

// 자동 리프레시 타이머
let _autoRefreshTimer = null;

export const clearAutoRefresh = () => {
  if (_autoRefreshTimer) {
    clearTimeout(_autoRefreshTimer);
    _autoRefreshTimer = null;
  }
};

// 액세스 토큰 만료 1분 전(스큐 고려) 자동 갱신 예약
export const scheduleAutoRefresh = () => {
  clearAutoRefresh();

  const accessToken = getAccessToken();
  if (!accessToken) return;

  const payload = decodeJWT(accessToken);
  if (!payload || !payload.exp) return;

  const nowMs = Date.now();
  const expMs = payload.exp * 1000;
  // 1분(60000ms) + 시계오차(120초) 조금 더 여유를 둠
  const leadMs = 60_000 + 120_000;
  let wait = expMs - nowMs - leadMs;

  // 너무 짧으면 최소 5초 뒤에 시도
  if (wait < 5000) wait = 5000;

  _autoRefreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch (e) {
      console.warn('자동 리프레시 실패:', e);
    } finally {
      // 다음 예약(성공 시 새 토큰 기준으로 다시 예약됨)
      scheduleAutoRefresh();
    }
  }, wait);
};

// 실제 리프레시 호출
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.log('리프레시 토큰 없음 → 갱신 불가');
    return false;
  }

  const baseURL = getApiBaseUrl();

  try {
    const res = await fetch(`${baseURL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 쿠키 안 씀 → credentials: 'omit'
      credentials: 'omit',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      console.warn('refresh 실패 상태코드:', res.status);
      // 401/403 등 → 로그인 만료 처리
      removeExpiredToken();
      return false;
    }

    const data = await res.json();
    // 기대 응답: { access_token, refresh_token?, user? }
    const newAccess = data.access_token;
    const newRefresh = data.refresh_token || refreshToken; // 새 리프레시 없으면 기존 것 유지
    const user = data.user || getStoredUser();

    if (!newAccess) {
      console.warn('refresh 응답에 access_token 없음');
      removeExpiredToken();
      return false;
    }

    saveLoginState(newAccess, user, newRefresh);
    console.log('🔄 액세스 토큰 갱신 성공');
    return true;
  } catch (e) {
    console.error('refresh 요청 에러:', e);
    removeExpiredToken();
    return false;
  }
};

// 앱 부팅 시 한 번 호출하면 자동예약이 켜짐
export const initAuthAutoRefresh = () => {
  const access = getAccessToken();
  if (!access) return;
  scheduleAutoRefresh();
};
