import React from 'react';
import { Link } from 'react-router-dom';
import './TopNav.css';

function TopNav() {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        {/* 사이트명 */}
        <div className="topnav-left">
          <h1 className="site-title">연구의숲</h1>
        </div>

        {/* 상단 탭 (홈, 연구프로젝트, 아이디어 창고, 마이메뉴) */}
        <nav className="topnav-menu">
          <ul>
            <li><Link to="/">홈</Link></li>
            <li><Link to="/research-project">연구프로젝트</Link></li>
            <li><Link to="/idea">아이디어 창고</Link></li>
            <li><Link to="/my-menu">마이메뉴</Link></li>
          </ul>
        </nav>

        {/* 로그인/회원가입 */}
        <div className="topnav-right">
          <Link to="/login" className="login-btn">로그인</Link>
          <Link to="/signup" className="signup-btn">회원가입</Link>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
