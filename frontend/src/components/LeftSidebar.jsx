// src/components/LeftSidebar.jsx
import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faFlask,
  faCoffee,
  faUsers,
  faUser,
  faNewspaper,
  faBullhorn,
  faDatabase,
  faFileUpload,
  faClipboard,
  faComments,
  faTimes,
  faBars,
  faUtensils,
  faQuestionCircle,
  faCalendarAlt,
  faTrophy
} from '@fortawesome/free-solid-svg-icons';
import './LeftSidebar.css';

function LeftSidebar({ sidebarType = 'main' }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 모바일 메뉴를 열고 닫는 함수
  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  // 경로가 바뀌면 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // 메뉴 링크 선택 시 모바일 메뉴 닫기
  const handleLinkClick = () => {
    setMobileOpen(false);
  };

  /* 메뉴 타입에 따른 UI 결정 */
  let menuContent;

  switch (sidebarType) {
    case 'cafe':
      menuContent = (
        <>
          <div className="sidebar-header">게시판</div>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/research/연구자료" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faDatabase} />
                연구자료 게시판
              </NavLink>
            </li>
            <li>
              <NavLink to="/research/제출자료" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faFileUpload} />
                제출자료 게시판
              </NavLink>
            </li>
            <li>
              <NavLink to="/research/제안서" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faClipboard} />
                제안서 게시판
              </NavLink>
            </li>
            <li>
              <NavLink to="/research/논문게시판" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faNewspaper} />
                논문게시판
              </NavLink>
            </li>

            <li className="sidebar-subtitle">커뮤니티</li>
            <li>
              <NavLink to="/community/자유게시판" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faComments} />
                자유게시판
              </NavLink>
            </li>
            <li>
              <NavLink to="/community/음식게시판" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUtensils} />
                음식게시판
              </NavLink>
            </li>
            <li>
              <NavLink to="/community/질문과답변" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faQuestionCircle} />
                질문과답변
              </NavLink>
            </li>
            <li>
              <NavLink to="/community/학회공모전" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faTrophy} />
                학회/공모전
              </NavLink>
            </li>
          </ul>
        </>
      );
      break;

    case 'ourstory':
      menuContent = (
        <>
          <div className="sidebar-header">우리들이야기</div>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/ourstory/lab-introduction" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUsers} />
                연구실 소개
              </NavLink>
            </li>
            <li>
              <NavLink to="/ourstory/members" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUser} />
                구성원 소개
              </NavLink>
            </li>
            <li>
              <NavLink to="/ourstory/photos" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUsers} />
                활동 사진
              </NavLink>
            </li>
          </ul>
        </>
      );
      break;

    case 'result':
      menuContent = (
        <>
          <div className="sidebar-header">연구성과</div>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/result/papers" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faNewspaper} />
                논문 성과
              </NavLink>
            </li>
            <li>
              <NavLink to="/result/projects" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faFlask} />
                연구 프로젝트
              </NavLink>
            </li>
            <li>
              <NavLink to="/result/awards" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faCoffee} />
                수상 실적
              </NavLink>
            </li>
          </ul>
        </>
      );
      break;

    case 'mymenu':
      menuContent = (
        <>
          <div className="sidebar-header">마이메뉴</div>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/mymenu/profile" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faUser} />
                내 프로필
              </NavLink>
            </li>
            <li>
              <NavLink to="/mymenu/posts" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faClipboard} />
                내 게시글
              </NavLink>
            </li>
            <li>
              <NavLink to="/mymenu/comments" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faComments} />
                내 댓글
              </NavLink>
            </li>
          </ul>
        </>
      );
      break;

    default: // 'main'
      menuContent = (
        <>
          <div className="sidebar-header">메인 메뉴</div>
          <ul className="sidebar-menu">
            <li>
              <NavLink to="/" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faHome} />
                홈
              </NavLink>
            </li>
            <li>
              <NavLink to="/board/공지사항" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faBullhorn} />
                공지사항
              </NavLink>
            </li>
            <li>
              <NavLink to="/board/뉴스" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faNewspaper} />
                뉴스
              </NavLink>
            </li>
            <li>
              <NavLink to="/board/회의기록" onClick={handleLinkClick}>
                <FontAwesomeIcon icon={faCalendarAlt} />
                회의기록
              </NavLink>
            </li>
          </ul>
        </>
      );
  }

  return (
    <>
      {/* 모바일 사이드바 오버레이 */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={toggleMobileMenu}
      ></div>

      {/* 사이드바 */}
      <div className={`left-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {menuContent}
      </div>

      {/* 모바일 토글 버튼 */}
      <button className="sidebar-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={mobileOpen ? faTimes : faBars} />
      </button>
    </>
  );
}

export default LeftSidebar;
