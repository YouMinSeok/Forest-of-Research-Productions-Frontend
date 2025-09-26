// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud } from '@fortawesome/free-solid-svg-icons';
import { getBoardConfig } from '../config/boardConfig';
import TopNav from './TopNav';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Footer from './Footer';
import AIModal from './AIModal';
import './Layout.css';

function Layout({ children }) {
  const location = useLocation();

  // 사이드바 타입 결정 함수
  const getSidebarType = (pathname) => {
    const pathSegments = pathname.split('/').filter(segment => segment !== '');
    const pathSegment = pathSegments[0];

    // 게시판 경로인 경우 boardConfig 확인
    if (pathSegments.length >= 2 && ['community', 'research', 'board'].includes(pathSegment)) {
      const encodedBoardType = pathSegments[1];
      const boardType = decodeURIComponent(encodedBoardType);
      const boardConfig = getBoardConfig(boardType);

      if (boardConfig && boardConfig.routePath) {
        const correctSection = boardConfig.routePath.split('/')[1];
        if (correctSection === 'community' || correctSection === 'research') {
          return 'cafe'; // 연구카페 사이드바
        } else if (correctSection === 'board') {
          return 'main'; // 홈 사이드바
        }
      }

      // fallback: URL 기반으로 결정
      if (pathSegment === 'community' || pathSegment === 'research') {
        return 'cafe';
      } else if (pathSegment === 'board') {
        return 'main';
      }
    }

    // 홈 경로
    if (pathname === '/') {
      return 'main';
    }

    // 기존 직접 경로들
    if (['cafe', 'ourstory', 'result', 'mymenu'].includes(pathSegment)) {
      return pathSegment;
    }

    return 'main'; // 기본값
  };

  // 초기 sidebarType은 URL에서 결정
  const initialSidebarType = getSidebarType(location.pathname);

  // sidebarType 상태로 관리하여 TopNav에서 변경 가능하도록 함
  const [sidebarType, setSidebarType] = useState(initialSidebarType);

  // AI 사이드바 상태
  const [showAISidebar, setShowAISidebar] = useState(false);


  // 매번 location이 바뀔 때, URL에 따라 자동 업데이트
  useEffect(() => {
    const newSidebarType = getSidebarType(location.pathname);
    setSidebarType(newSidebarType);
  }, [location.pathname]);

  // AI 사이드바 핸들러
  const toggleAISidebar = () => {
    setShowAISidebar(!showAISidebar);

  };

  const closeAISidebar = () => {
    setShowAISidebar(false);

  };



  return (
    <div className="layout-container">
      {/* 상단바에 sidebarType 변경 함수를 props로 전달 */}
      <TopNav onSidebarTypeChange={setSidebarType} />

      {/* 가운데 (왼쪽 + 중앙 + 오른쪽) 영역 */}
      <div className="layout-main">
        {/* 좌측 사이드바는 상태값을 props로 전달 */}
        <LeftSidebar sidebarType={sidebarType} />

        {/* 중앙 컨텐츠 */}
        <div className="layout-center">
          {children}
        </div>

        {/* 우측 사이드바 */}
        <RightSidebar />
      </div>

      {/* 하단 푸터 */}
      <Footer />

      {/* GamsGo 스타일 AI 사이드바 토글 버튼 (베타 스타일 유지) */}
      {!showAISidebar && (
        <div className="gamsgo-ai-container">
          <button
            className="gamsgo-ai-toggle"
            onClick={toggleAISidebar}
            title="구름이AI - 차세대 AI 어시스턴트 (베타)"
          >
            <div className="ai-button-content">
              <FontAwesomeIcon icon={faCloud} className="ai-button-icon" />
              <span className="ai-button-title">구름 AI</span>
            </div>
            <div className="ai-button-ripple"></div>
          </button>
          <div className="ai-beta-badge">
            <span>BETA</span>
          </div>
        </div>
      )}

      {/* AI 사이드바 */}
      <AIModal
        isOpen={showAISidebar}
        onClose={closeAISidebar}
      />
      )}
    </div>
  );
}

export default Layout;
