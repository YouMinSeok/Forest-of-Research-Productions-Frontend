import React, { useState, useEffect, useCallback, memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faSearch, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import './BoardCommon.css';
import CafeWritePost from '../../components/CafeWritePost';
import { Skeleton } from '../../components/Skeleton';
import { useOptimizedSkeleton } from '../../utils/skeletonHooks';
import UserBadge from '../../components/UserBadge';
import { getCurrentUser, canWriteToBoard } from '../../utils/permissions';

/**
 * 안전한 날짜 포맷팅 함수
 * @param {string|Date} dateValue - 날짜 값
 * @returns {string} 포맷된 날짜 문자열 또는 기본값
 */
const formatSafeDate = (dateValue) => {
  if (!dateValue) return '-';

  try {
    let date;

    // 이미 Date 객체인 경우
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // 문자열인 경우 다양한 형식 처리
      const dateStr = dateValue.toString();

      // 'YYYY-MM-DD HH:MM:SS' 형식 (한국 시간대)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        // 한국 시간으로 파싱
        date = new Date(dateStr + ' +09:00');
      }
      // ISO 형식 (T나 Z 포함)
      else if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = new Date(dateStr);
      }
      // 'YYYY-MM-DD' 형식이나 기타 형식 처리
      else {
        date = new Date(dateStr);
      }
    }

    // Date 객체가 유효한지 확인
    if (isNaN(date.getTime())) {
      console.warn('유효하지 않은 날짜:', dateValue);
      return '-';
    }

    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('날짜 파싱 오류:', dateValue, error);
    return '-';
  }
};

/**
 * 게시판 공통 컴포넌트 - 기업급 안정성과 독립성 보장
 */
const BoardCommon = memo(({
  title,
  boardName,
  posts = [],
  totalPosts = 0,
  showWrite = false,
  isLoggedIn = false,
  loading = false,
  searchFilter,
  setSearchFilter,
  searchQuery,
  setSearchQuery,
  onSearch,
  handleSearch,
  onWriteClick,
  handleWriteButton,
  onWriteSubmit,
  handleWriteSubmit,
  onPostClick,
  handlePostClick,
  onRefresh,
  boardType,
  hasFileColumn = true,
  customTitle = null,
  category,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // 최적화된 skeleton 훅
  const tableSkeleton = useOptimizedSkeleton(loading, Array(10).fill(null), {
    smartOptions: { minDisplayTime: 400, fadeInDelay: 50 },
    progressiveOptions: { staggerDelay: 80, enableStagger: true },
    transitionOptions: { duration: 200, enableSlide: false }
  });
  const postsPerPage = 20;

  // Props 검증 및 기본값 설정
  console.log('🔥 BoardCommon props:', {
    boardName,
    title,
    customTitle,
    category,
    handlePostClick: typeof handlePostClick,
    handleWriteButton: typeof handleWriteButton,
    handleSearch: typeof handleSearch,
    onPostClick: typeof onPostClick,
    onWriteClick: typeof onWriteClick,
    onSearch: typeof onSearch
  });

  const finalTitle = customTitle || boardName || title || '게시판';
  const finalPosts = Array.isArray(posts) ? posts : [];
  const finalTotalPosts = totalPosts || finalPosts.length;

  // 안전한 함수 래핑 - handleSearch와 onSearch 둘 다 지원
  const finalOnSearch = useCallback(() => {
    try {
      console.log('🔥 검색 버튼 클릭됨');
      console.log('🔥 handleSearch:', typeof handleSearch);
      console.log('🔥 onSearch:', typeof onSearch);
      const searchFunction = handleSearch || onSearch;
      if (typeof searchFunction === 'function') {
        console.log('🔥 검색 함수 호출');
        searchFunction();
      } else {
        console.error('❌ 검색 함수가 없습니다:', { handleSearch, onSearch });
      }
    } catch (error) {
      console.error(`❌ ${boardType} 검색 오류:`, error);
    }
  }, [handleSearch, onSearch, boardType]);

  // handleWriteButton과 onWriteClick 둘 다 지원
  const finalOnWriteClick = useCallback(() => {
    try {
      console.log('🔥 글쓰기 버튼 클릭됨');
      console.log('🔥 handleWriteButton:', typeof handleWriteButton);
      console.log('🔥 onWriteClick:', typeof onWriteClick);
      const writeFunction = handleWriteButton || onWriteClick;
      if (typeof writeFunction === 'function') {
        console.log('🔥 글쓰기 함수 호출');
        writeFunction();
      } else {
        console.error('❌ 글쓰기 함수가 없습니다:', { handleWriteButton, onWriteClick });
      }
    } catch (error) {
      console.error(`❌ ${boardType} 글쓰기 오류:`, error);
    }
  }, [handleWriteButton, onWriteClick, boardType]);

  // handlePostClick과 onPostClick 둘 다 지원
  const finalOnPostClick = useCallback((post) => {
    try {
      console.log('🔥 게시물 클릭됨:', post);
      console.log('🔥 handlePostClick:', typeof handlePostClick);
      console.log('🔥 onPostClick:', typeof onPostClick);
      const postClickFunction = handlePostClick || onPostClick;
      if (typeof postClickFunction === 'function') {
        console.log('🔥 게시물 클릭 함수 호출:', post.id, post.title);
        postClickFunction(post);
      } else {
        console.error('❌ 게시물 클릭 함수가 없습니다:', { handlePostClick, onPostClick });
      }
    } catch (error) {
      console.error(`❌ ${boardType} 게시물 클릭 오류:`, error);
    }
  }, [handlePostClick, onPostClick, boardType]);

  const finalOnRefresh = useCallback(() => {
    try {
      console.log(`🔄 ${boardType} 게시판 새로고침 요청`);
      if (typeof onRefresh === 'function') {
        onRefresh();
      }
    } catch (error) {
      console.error(`❌ ${boardType} 새로고침 오류:`, error);
    }
  }, [onRefresh, boardType]);

  // handleWriteSubmit과 onWriteSubmit 둘 다 지원
  const finalOnWriteSubmit = useCallback((newPost) => {
    try {
      const submitFunction = handleWriteSubmit || onWriteSubmit;
      if (typeof submitFunction === 'function') {
        submitFunction(newPost);
      }
    } catch (error) {
      console.error(`❌ ${boardType} 글 작성 제출 오류:`, error);
    }
  }, [handleWriteSubmit, onWriteSubmit, boardType]);

  // 페이지네이션 계산
  const totalPages = Math.ceil(finalTotalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const currentPosts = finalPosts.slice(startIndex, startIndex + postsPerPage);

  // 페이지 변경 시 맨 위로 스크롤
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // 게시물 목록이 변경되면 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [finalPosts.length]);

  // 페이지 버튼 생성 로직
  const renderPageButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 5;

    let startPage, endPage;
    if (totalPages <= maxVisibleButtons) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const middlePage = Math.floor(maxVisibleButtons / 2);

      if (currentPage <= middlePage) {
        startPage = 1;
        endPage = maxVisibleButtons;
      } else if (currentPage + middlePage >= totalPages) {
        startPage = totalPages - maxVisibleButtons + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - middlePage;
        endPage = currentPage + middlePage;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
          disabled={loading}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  // "이전" 버튼 핸들러
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // "다음" 버튼 핸들러
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="board-page">
      <h2>{finalTitle}</h2>

      {/* 글 작성 폼이 아닐 때만 검색/목록 표시 */}
      {!showWrite && (
        <>
          <div className="board-top-bar">
            <div className="board-info">
              총 게시물 <strong>{finalTotalPosts}</strong>건
              {typeof onRefresh === 'function' && (
                <button
                  className="refresh-btn"
                  title="새로고침"
                  onClick={finalOnRefresh}
                  disabled={loading}
                  style={{ marginLeft: 8 }}
                >
                  <FontAwesomeIcon icon={faSyncAlt} spin={loading} />
                </button>
              )}
            </div>
            <div className="board-search-area">
              <select
                className="board-filter"
                value={searchFilter}
                onChange={(e) => setSearchFilter && setSearchFilter(e.target.value)}
              >
                <option value="all">전체</option>
                <option value="title">제목</option>
                <option value="writer">작성자</option>
                <option value="content">내용</option>
              </select>
              <input
                type="text"
                className="board-search-input"
                placeholder="검색어 입력"
                value={searchQuery}
                onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && finalOnSearch()}
              />
              <button className="board-search-btn" onClick={finalOnSearch} disabled={loading}>
                <FontAwesomeIcon icon={faSearch} />
                <span className="hide-mobile">검색</span>
              </button>
              {isLoggedIn && canWriteToBoard(getCurrentUser(), boardName) && (
                <button className="write-btn" onClick={finalOnWriteClick} disabled={loading}>
                  <FontAwesomeIcon icon={faPencilAlt} />
                  <span className="hide-mobile">글 작성</span>
                </button>
              )}
            </div>
          </div>

          <div className="board-table-container">
            <table className="board-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>번호</th>
                  <th>제목</th>
                  <th style={{ width: '100px' }}>작성자</th>
                  <th style={{ width: '120px' }}>날짜</th>
                  <th style={{ width: '60px' }}>조회</th>
                  {hasFileColumn && <th style={{ width: '60px' }}>파일</th>}
                </tr>
              </thead>
              <tbody>
                {loading || tableSkeleton.showSkeleton ? (
                  // 최적화된 Skeleton UI로 로딩 상태 표시
                  Array.from({ length: 10 }).map((_, index) => {
                    const isVisible = loading || tableSkeleton.getItemVisibility(index);
                    const delay = tableSkeleton.getItemDelay(index);

                    return (
                      <tr
                        key={`skeleton-${index}`}
                        className="skeleton-row"
                        style={{
                          opacity: isVisible ? 1 : 0,
                          transform: isVisible ? 'translateY(0)' : 'translateY(5px)',
                          transition: `all 200ms ease-out ${delay}ms`,
                          backgroundColor: '#f8f9fa'
                        }}
                      >
                        <td style={{ padding: '12px 8px' }}>
                          <Skeleton width="30px" height="16px" animation="shimmer" delay={delay} />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Skeleton width="75%" height="16px" animation="shimmer" delay={delay + 20} />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Skeleton width="60px" height="16px" animation="shimmer" delay={delay + 40} />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Skeleton width="80px" height="16px" animation="shimmer" delay={delay + 60} />
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          <Skeleton width="30px" height="16px" animation="shimmer" delay={delay + 80} />
                        </td>
                        {hasFileColumn && (
                          <td style={{ padding: '12px 8px' }}>
                            <Skeleton width="20px" height="16px" animation="shimmer" delay={delay + 100} />
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : currentPosts.length > 0 ? (
                  currentPosts.map((post, index) => {
                    // 페이지 기반 번호 계산 (전체 게시글 수에서 내림차순)
                    const displayNumber = totalPosts - ((currentPage - 1) * postsPerPage + index);

                    return (
                      <tr
                        key={post.id || post.post_number || post._id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => finalOnPostClick(post)}
                      >
                        <td>{post.post_number || displayNumber}</td>
                      <td className="post-title">
                        {post.prefix && (
                          <span className="post-prefix">{post.prefix.replace(/\[|\]/g, '')} </span>
                        )}
                        {post.title}
                        {post.commentCount > 0 &&
                          <span className="comment-count"> [{post.commentCount}]</span>
                        }
                      </td>
                      <td>
                        <div className="writer-with-badge">
                          {post.writer || post.author || '-'}
                          {(post.writer || post.author) && (
                            <UserBadge
                              role={post.writer_role}
                              isAdmin={post.writer_is_admin}
                              size="sm"
                            />
                          )}
                        </div>
                      </td>
                      <td>{formatSafeDate(post.date || post.createdAt)}</td>
                      <td>{post.views || post.viewCount || 0}</td>
                      {hasFileColumn && (
                        <td>
                          {post.hasAttachment && post.attachmentCount > 0 ? (
                            <span className="file-indicator" title={`첨부파일 ${post.attachmentCount}개`}>
                              📎 {post.attachmentCount}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={hasFileColumn ? 6 : 5} className="no-data">
                      게시글이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 영역 */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="page-btn"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || loading}
              >
                이전
              </button>
              {renderPageButtons()}
              <button
                className="page-btn"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || loading}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 글 작성 폼 표시 */}
      {showWrite && (
        <CafeWritePost boardList={category ? [category] : []} onSubmit={finalOnWriteSubmit} />
      )}
    </div>
  );
});

export default BoardCommon;
