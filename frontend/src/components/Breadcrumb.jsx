import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBoardConfig } from '../config/boardConfig';
import './Breadcrumb.css';

const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // URL 경로 분석
  const pathSegments = location.pathname.split('/').filter(segment => segment !== '');

  if (pathSegments.length < 2) return null;

  const [section, encodedBoardType] = pathSegments;
  // URL 디코딩으로 한글 처리 (undefined 방지)
  const boardType = encodedBoardType && encodedBoardType !== 'undefined'
    ? decodeURIComponent(encodedBoardType)
    : '자유게시판';
  const boardConfig = getBoardConfig(boardType);

  // boardConfig를 기반으로 올바른 상위 카테고리 결정
  let parentCategory, parentLink;

  if (boardConfig && boardConfig.routePath) {
    // boardConfig에서 올바른 경로 확인
    const correctSection = boardConfig.routePath.split('/')[1];

    if (correctSection === 'community' || correctSection === 'research') {
      // 연구카페 하위 게시판들
      parentCategory = '연구카페';
      parentLink = '/cafe';
    } else if (correctSection === 'board') {
      // 홈 하위 게시판들
      parentCategory = '홈';
      parentLink = '/';
    } else {
      parentCategory = '홈';
      parentLink = '/';
    }
  } else {
    // fallback: URL 기반으로 결정
    if (section === 'community' || section === 'research') {
      parentCategory = '연구카페';
      parentLink = '/cafe';
    } else if (section === 'board') {
      parentCategory = '홈';
      parentLink = '/';
    } else {
      parentCategory = '홈';
      parentLink = '/';
    }
  }

  const boardName = boardConfig?.title || boardType || '게시판';

  const handleParentClick = () => {
    navigate(parentLink);
  };

  return (
    <div className="breadcrumb-container">
      <nav className="breadcrumb">
        <span
          className="breadcrumb-item clickable"
          onClick={handleParentClick}
        >
          {parentCategory}
        </span>
        <span className="breadcrumb-separator">{'>'}</span>
        <span className="breadcrumb-item">
          {boardName}
        </span>
      </nav>
    </div>
  );
};

export default Breadcrumb;
