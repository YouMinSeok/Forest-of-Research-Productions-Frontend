// src/App.jsx
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './components/Skeleton.css'; // 스켈레톤 CSS 임포트 추가
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { isTokenExpired, removeExpiredToken, scheduleAutoRefresh, getAccessToken } from './services/auth';
import { usePerformanceMonitor } from './utils/performance';
import { AuthProvider } from './contexts/AuthContext';

// 코드 스플리팅으로 번들 크기 최적화
const MainHome = lazy(() => import('./pages/MainHome'));
const OurStoryPage = lazy(() => import('./pages/OurStoryPage'));
const ResearchResultPage = lazy(() => import('./pages/ResearchResultPage'));
const MyMenu = lazy(() => import('./pages/MyMenu'));
const MyMenuProfile = lazy(() => import('./pages/mymenu/MyMenuProfile'));
const MyMenuPosts = lazy(() => import('./pages/mymenu/MyMenuPosts'));
const MyMenuComments = lazy(() => import('./pages/mymenu/MyMenuComments'));

// 범용 게시판 컴포넌트 (네이버 카페식 통합 구조)
const UniversalBoard = lazy(() => import('./components/UniversalBoard'));

// 공통 상세 페이지 및 수정 페이지 (URL 파라미터로 category와 postId 전달)
const BoardDetail = lazy(() => import('./pages/boards/BoardDetail'));
const BoardEdit = lazy(() => import('./pages/boards/BoardEdit'));
const WritePostPage = lazy(() => import('./pages/WritePostPage'));

// 추가 페이지들
const MemoBoardFigmaLike = lazy(() => import('./components/MemoBoardFigmaLike'));
const AcademicSchedule = lazy(() => import('./pages/AcademicSchedule'));
const NotFound = lazy(() => import('./pages/NotFound'));

// 인증 및 기타 페이지
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const VerifySignUp = lazy(() => import('./pages/VerifySignUp'));
const FindUsername = lazy(() => import('./pages/FindUsername'));
const FindPassword = lazy(() => import('./pages/FindPassword'));

// 어드민 페이지들
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const PermissionManagement = lazy(() => import('./pages/admin/PermissionManagement'));
const SystemStatus = lazy(() => import('./pages/admin/SystemStatus'));

// 로딩 컴포넌트 - 성능 최적화된 스피너
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: '#f8f9fa'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #e1e5e9',
      borderTop: '4px solid #0366d6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <style>
      {`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}
    </style>
  </div>
);

function App() {
  // 성능 모니터링
  const { measureRenderTime } = usePerformanceMonitor('App');

  // 앱 시작 시 만료된 토큰 자동 제거 + 자동 리프레시 예약 및 인증 상태 점검
  useEffect(() => {
    const initializeAuth = () => {
      console.log('🚀 앱 초기화: 인증 상태 점검 시작');

      // 현재 저장된 토큰들 확인
      const sessionToken = sessionStorage.getItem('access_token');
      const localToken = localStorage.getItem('access_token');
      const storedUser = sessionStorage.getItem('user') || localStorage.getItem('user');

      console.log('🔍 저장된 인증 정보:', {
        sessionToken: sessionToken ? '있음' : '없음',
        localToken: localToken ? '있음' : '없음',
        storedUser: storedUser ? '있음' : '없음'
      });

      // 토큰이 있는 경우 유효성 검사
      const accessToken = getAccessToken();
      if (accessToken) {
        if (isTokenExpired(accessToken)) {
          console.log('⚠️ 만료된 토큰 발견 - 자동 정리');
          removeExpiredToken();
        } else {
          console.log('✅ 유효한 토큰 - 자동 리프레시 예약');
          scheduleAutoRefresh();
        }
      } else {
        console.log('ℹ️ 토큰 없음 - 게스트 상태');
        // 혹시 남은 찌꺼기 정리
        removeExpiredToken();
      }
    };

    // 1) 즉시 한 번 초기화
    initializeAuth();

    // 2) 5분마다 토큰 상태 확인 (유효성 보조 체크)
    const interval = setInterval(() => {
      const accessToken = getAccessToken();
      if (accessToken && isTokenExpired(accessToken)) {
        console.log('🔄 주기적 체크: 만료된 토큰 정리');
        removeExpiredToken();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // 전역 에러 핸들링
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('🚨 처리되지 않은 Promise 거부:', event.reason);
      // 실제 운영환경에서는 에러 리포팅 서비스로 전송
    };

    const handleError = (event) => {
      console.error('🚨 전역 JavaScript 에러:', event.error);
      // 실제 운영환경에서는 에러 리포팅 서비스로 전송
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return measureRenderTime(() => (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <div className="App">
          <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* 인증 관련 페이지 (Layout 없음) */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/signup/verify" element={<VerifySignUp />} />
                <Route path="/find-username" element={<FindUsername />} />
                <Route path="/find-password" element={<FindPassword />} />

                {/* Layout으로 감싸진 일반 페이지들 */}
                <Route
                  path="/"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MainHome />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 연구카페 리다이렉트 */}
                <Route
                  path="/cafe"
                  element={<Navigate to="/research/연구자료" replace />}
                />



                <Route
                  path="/our-story"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <OurStoryPage />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/research-result"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <ResearchResultPage />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/mymenu"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MyMenu />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 마이메뉴 개별 라우트들 */}
                <Route
                  path="/mymenu/profile"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MyMenuProfile />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/mymenu/posts"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MyMenuPosts />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/mymenu/comments"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MyMenuComments />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* === 새로운 통합 게시판 구조 (네이버 카페식) === */}

                {/* 커뮤니티 게시판들 */}
                <Route
                  path="/community/:boardType"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <UniversalBoard />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 연구 게시판들 */}
                <Route
                  path="/research/:boardType"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <UniversalBoard />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 일반 게시판들 */}
                <Route
                  path="/board/:boardType"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <UniversalBoard />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 게시글 상세보기 - 모든 게시판 공통 */}
                <Route
                  path="/community/:boardType/detail/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardDetail />
                      </Layout>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/research/:boardType/detail/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardDetail />
                      </Layout>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/board/:boardType/detail/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardDetail />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 게시글 수정 - 모든 게시판 공통 */}
                <Route
                  path="/community/:boardType/edit/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardEdit />
                      </Layout>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/research/:boardType/edit/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardEdit />
                      </Layout>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/board/:boardType/edit/:postId"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <BoardEdit />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 게시글 작성 페이지 */}
                <Route
                  path="/write-post"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <WritePostPage />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 기타 페이지들 */}
                <Route
                  path="/memo-board"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <MemoBoardFigmaLike />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/academic-schedule"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <AcademicSchedule />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 관리자 페이지들 */}
                <Route
                  path="/admin"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <AdminDashboard />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/admin/users"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <UserManagement />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/admin/permissions"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <PermissionManagement />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                <Route
                  path="/admin/system"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <SystemStatus />
                      </Layout>
                    </ErrorBoundary>
                  }
                />

                {/* 404 페이지 */}
                <Route
                  path="*"
                  element={
                    <ErrorBoundary>
                      <Layout>
                        <NotFound />
                      </Layout>
                    </ErrorBoundary>
                  }
                />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </Router>
      </AuthProvider>
    </ErrorBoundary>
  ));
}

export default App;
