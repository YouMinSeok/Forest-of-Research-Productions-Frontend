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
import { logoutUser } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './TopNav.css';

function TopNav({ onSidebarTypeChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
      await logoutUser();
      logout(); // AuthContext의 logout 사용
      navigate("/");
    } catch (error) {
      // 네트워크 오류여도 클라이언트 토큰은 이미 제거했으므로 홈으로 이동
      logout(); // AuthContext의 logout 사용
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
                  to="/research/연구자료"
                  className={isActiveTab('/research') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('research', '/research/연구자료')}
                >
                  연구카페
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
                  to="/ourstory"
                  className={isActiveTab('/ourstory') ? 'active' : ''}
                  onClick={() => handleMobileNavClick('ourstory', '/ourstory')}
                >
                  우리들이야기
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
