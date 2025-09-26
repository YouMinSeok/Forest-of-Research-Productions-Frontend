// src/components/TopNav.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faTimes,
  faUser,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import './TopNav.css';


// 환경변수 기반 API URL 설정 (api.js와 동일한 방식)
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

  // 로컬 개발용 호스트+포트 조합 (fallback)
  const hostIp = process.env.REACT_APP_HOST_IP;
  const port = process.env.REACT_APP_API_PORT || '8080';

  if (!hostIp) {
    // 기본값으로 localhost 사용
    console.warn('환경변수가 설정되지 않았습니다. 기본값 localhost:8000을 사용합니다.');
    return 'http://localhost:8000';
  }

  const protocol = port === '443' || port === '80' ? 'https' : 'http';
  const portSuffix = (port === '443' || port === '80') ? '' : `:${port}`;

  return `${protocol}://${hostIp}${portSuffix}`;
};

const backendUrl = getApiBaseUrl();

function TopNav({ onSidebarTypeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // JWT 토큰으로 사용자 정보 로드
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.log("사용자 인증 검증 실패 - 오프라인 또는 서버 연결 문제");
        }
        setUser(null);
      }
    };

    fetchUser();
  }, [location.pathname]); // 페이지 이동 시마다 사용자 정보 확인

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setUserMenuOpen(false);
  };

  // 모바일 메뉴 클릭 시 메뉴 닫기
  const handleMobileNavClick = (type, path) => {
    handleTabClick(type, path);
    setMobileMenuOpen(false);
  };

  // 사용자 메뉴 토글
  const toggleUserMenu = (e) => {
    e.stopPropagation();
    setUserMenuOpen(!userMenuOpen);
  };

  // 클릭 시 메뉴 닫기
  useEffect(() => {
    const closeUserMenu = () => setUserMenuOpen(false);
    document.addEventListener('click', closeUserMenu);
    return () => document.removeEventListener('click', closeUserMenu);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      // 서버 응답과 관계없이 클라이언트에서 토큰 제거
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('user');
      localStorage.removeItem('user');

      if (res.ok) {
        setUser(null);
        navigate("/");
      } else {
        // 서버 로그아웃 실패해도 클라이언트 토큰은 이미 제거했으므로 홈으로 이동
        setUser(null);
        navigate("/");
        alert("로그아웃에 실패했지만 클라이언트에서 로그아웃 처리했습니다.");
      }
    } catch (error) {
      // 네트워크 오류여도 클라이언트 토큰은 이미 제거했으므로 홈으로 이동
      setUser(null);
      navigate("/");

      // 개발 모드에서만 콘솔에 표시
      if (process.env.NODE_ENV === 'development') {
        console.log("로그아웃 요청 중 오류 발생 - 오프라인 또는 서버 연결 문제");
      }
    }
  };

  // 탭 클릭 시 sidebarType 업데이트 후 경로 이동
  const handleTabClick = (type, path) => {
    onSidebarTypeChange(type);
    navigate(path);
  };

  // 현재 활성화된 탭 확인
  const isActiveTab = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="topnav">
      <div className="topnav-top">
        <div className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} />
        </div>
        <div className="center-logo">
          <NavLink
            to="/"
            className="site-logo"
            onClick={() => handleTabClick('main', '/')}
          >
            <div className="logo-text">연구의숲</div>
          </NavLink>
        </div>
      </div>
      <div className={`topnav-lower ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="lower-center">
          <nav className="topnav-menu">
            <ul>
              <li>
                <NavLink
                  to="/"
                  className={isActiveTab('/') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('main', '/')}
                >
                  홈
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/result"
                  className={isActiveTab('/result') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('result', '/result')}
                >
                  연구성과
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/cafe"
                  className={isActiveTab('/cafe') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('cafe', '/cafe')}
                >
                  연구카페
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/ourstory"
                  className={isActiveTab('/ourstory') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('ourstory', '/ourstory')}
                >
                  우리들이야기
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/mymenu"
                  className={isActiveTab('/mymenu') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('mymenu', '/mymenu')}
                >
                  마이메뉴
                </NavLink>
              </li>
              <li className="auth-nav-item">
                {user ? (
                  <div className="user-menu-container" onClick={toggleUserMenu}>
                    <button className="user-btn">
                      <div className="user-icon">
                        <FontAwesomeIcon icon={faUser} />
                      </div>
                      <span className="user-name">{user.name}</span>
                    </button>
                    {userMenuOpen && (
                      <div className="user-dropdown">
                        <NavLink to="/mymenu" className="dropdown-item" onClick={() => handleMobileNavClick('mymenu', '/mymenu')}>
                          <FontAwesomeIcon icon={faUser} />
                          마이페이지
                        </NavLink>
                        <button onClick={handleLogout} className="dropdown-item logout-item">
                          <FontAwesomeIcon icon={faSignOutAlt} className="logout-icon" />
                          로그아웃
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="auth-links">
                    <NavLink to="/login" className="auth-link" onClick={() => setMobileMenuOpen(false)}>
                      로그인
                    </NavLink>
                    <span className="auth-divider">|</span>
                    <NavLink to="/signup" className="auth-link" onClick={() => setMobileMenuOpen(false)}>
                      회원가입
                    </NavLink>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
