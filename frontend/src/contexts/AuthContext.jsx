// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';
import { getAccessToken, isTokenExpired } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 사용자 정보 로드
  const loadUser = async () => {
    try {
      console.log('🔍 AuthContext: 사용자 정보 로드 시도');

      // 토큰 체크
      const token = getAccessToken();
      if (!token || isTokenExpired(token)) {
        console.log('❌ AuthContext: 토큰 없음 또는 만료됨');
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      const userResponse = await getCurrentUser();
      console.log('🔍 AuthContext: getCurrentUser 응답:', userResponse);

      if (userResponse && userResponse.user && !userResponse.guest) {
        console.log('✅ AuthContext: 유효한 사용자 정보 설정:', userResponse.user);

        // ID 필드 통일
        const userId = userResponse.user.id || userResponse.user._id;
        const userData = {
          id: userId,
          name: userResponse.user.name,
          email: userResponse.user.email,
          role: userResponse.user.role || 'student',
          permissions: userResponse.user.permissions || [],
          is_admin: userResponse.user.is_admin || false,
          is_active: userResponse.user.is_active !== false
        };

        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log('👤 AuthContext: 게스트 상태 또는 사용자 정보 없음');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('⚠️ AuthContext: 사용자 인증 검증 실패:', error?.message || error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    // 실제 로그아웃 로직은 api.js의 logoutUser 사용
  };

  // 로그인 후 사용자 정보 업데이트
  const updateUser = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // 초기 로드
  useEffect(() => {
    loadUser();
  }, []);

  // 토큰 변경 감지 (로그인/로그아웃 시)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'access_token' || e.key === 'user') {
        loadUser();
      }
    };

    // 커스텀 이벤트로 같은 탭에서의 로그인도 감지
    const handleAuthChange = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    loadUser,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
