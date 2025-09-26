// 쿠키에서 값을 읽는 함수
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// JWT 토큰 디코딩 함수
export const decodeJWT = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 디코딩 실패:', error);
    return null;
  }
};

// 토큰 만료 확인 함수
export const isTokenExpired = (token) => {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

// 만료된 토큰 제거 함수
export const removeExpiredToken = () => {
  sessionStorage.removeItem('access_token');
  localStorage.removeItem('access_token');
  sessionStorage.removeItem('user');
  localStorage.removeItem('user');

  // 쿠키도 제거
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

// 유효한 로그인 상태 확인 함수 (개선됨)
export const isValidLogin = () => {
  const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
  const accessToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || getCookie('access_token');

  console.log('isValidLogin 확인 중...');
  console.log('userData:', userData);
  console.log('accessToken:', accessToken);

  // 토큰이 있으면 만료 여부 확인
  if (accessToken) {
    if (isTokenExpired(accessToken)) {
      console.log('토큰이 만료되었습니다. 로그아웃 처리합니다.');
      removeExpiredToken();
      return false;
    }
    console.log('유효한 토큰이 있습니다.');
    return true;
  }

  // 토큰은 없지만 user 데이터가 있으면 로그인 상태로 간주
  const hasUser = !!userData;
  console.log('토큰 없음, 사용자 데이터만으로 판단:', hasUser);
  return hasUser;
};

// 로그아웃 함수
export const logout = () => {
  removeExpiredToken();
  // 페이지 새로고침으로 상태 초기화
  window.location.reload();
};
