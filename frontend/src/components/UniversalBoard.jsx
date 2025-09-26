import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import BoardCommon from '../pages/boards/BoardCommon';

import { isValidLogin } from '../services/auth';
import { getBoardConfig } from '../config/boardConfig';
import {
  useDebounce,
  useInfiniteScroll,
  usePerformanceMonitor,
  useApiCache,
  useOptimizedLocalStorage
} from '../utils/performance';
import '../pages/boards/BoardCommon.css';

/**
 * 범용 게시판 컴포넌트 (연구실용 대규모 최적화)
 * URL 파라미터에 따라 동적으로 게시판 타입을 결정
 * 네이버 카페와 같은 확장 가능한 구조 + 기업급 성능 최적화
 */
const UniversalBoard = React.memo(() => {
  const { boardType } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 성능 모니터링
  const { measureRenderTime } = usePerformanceMonitor('UniversalBoard');

  // API 캐싱
  const { cachedFetch, clearCache } = useApiCache();

  // 게시판 설정 조회 (메모화)
  const boardConfig = useMemo(() => getBoardConfig(boardType), [boardType]);

  // 상태 관리 - 연구실용 대규모 최적화
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [showWrite, setShowWrite] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // 로컬 스토리지로 사용자 설정 저장
  const [postsPerPage, setPostsPerPage] = useOptimizedLocalStorage(`${boardType}_postsPerPage`, 20);
  const [sortOrder, setSortOrder] = useOptimizedLocalStorage(`${boardType}_sortOrder`, 'latest');

  // loadMorePosts 함수 참조를 위한 ref
  const loadMorePostsRef = useRef(null);

  // 성능 최적화를 위한 refs
  const loadingRef = useRef(false);
  const lastFetchTime = useRef(0);
  const abortControllerRef = useRef(null);

  // 검색어 디바운싱 (500ms)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // 게시판 설정이 없는 경우 404 처리
  useEffect(() => {
    if (!boardConfig) {
      navigate('/404', { replace: true });
      return;
    }
  }, [boardConfig, navigate]);

  // 로그인 상태 확인 (메모화)
  const checkLoginStatus = useCallback(() => {
    setIsLoggedIn(isValidLogin());
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // 게시글 로드 함수 - 성능 최적화
  const loadPosts = useCallback(async (page = 1, isLoadMore = false) => {
    // 중복 요청 방지
    if (loadingRef.current && !isLoadMore) return;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      loadingRef.current = true;
      if (!isLoadMore) {
        setLoading(true);
        setError(null);
      }

      const now = Date.now();
      // 과도한 요청 방지 (100ms 쓰로틀링)
      if (now - lastFetchTime.current < 100) {
        return;
      }
      lastFetchTime.current = now;

      // 캐시된 API 요청
      const url = `/api/board/?category=${boardConfig.apiCategory}&page=${page}&limit=${postsPerPage}&sort=${sortOrder}`;
      const response = await cachedFetch(url, {
        signal: abortControllerRef.current.signal
      });

      const newPosts = response.posts || [];

      if (isLoadMore) {
        // 무한 스크롤: 기존 게시글에 추가
        setPosts(prev => [...prev, ...newPosts]);
        setAllPosts(prev => [...prev, ...newPosts]);
      } else {
        // 새로운 로드: 전체 교체
        setPosts(newPosts);
        setAllPosts(newPosts);
      }

      setPagination(response.pagination);
      setTotalPosts(response.pagination?.total || newPosts.length);
      setHasMore(response.pagination?.hasNext || false);

      // 성공 로깅
      console.log(`✅ [${boardType}] 게시글 로드 완료: ${newPosts.length}개`);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('요청이 취소되었습니다.');
        return;
      }

      console.error(`❌ [${boardType}] 게시글 로드 실패:`, error);
      setError(error.message || '게시글을 불러오는 중 오류가 발생했습니다.');

      // 에러 시 빈 배열로 설정
      if (!isLoadMore) {
        setPosts([]);
        setAllPosts([]);
      }
    } finally {
      loadingRef.current = false;
      if (!isLoadMore) {
        setLoading(false);
      }
    }
  }, [boardConfig, boardType, postsPerPage, sortOrder, cachedFetch]);

  // 게시물 클릭 핸들러 추가
  const handlePostClick = useCallback((post) => {
    console.log('🔥 UniversalBoard handlePostClick 호출:', post.id, post.title);
    navigate(`/community/${boardType}/detail/${post.id}`, { state: { post } });
  }, [navigate, boardType]);

  // 글쓰기 버튼 핸들러 추가
  const handleWriteButton = useCallback(() => {
    if (!isLoggedIn) {
      alert('글 작성을 위해서는 로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    setShowWrite(true);
  }, [isLoggedIn, navigate]);

  // 글쓰기 완료 핸들러 추가
  const handleWriteSubmit = useCallback(async (newPost) => {
    try {
      console.log('🔥 UniversalBoard 글쓰기 완료:', newPost);
      setShowWrite(false);
      // 글 작성 후 전체 목록을 새로 로드 (중복 방지를 위해 isLoadMore = false)
      setCurrentPage(1);
      setHasMore(true);
      clearCache(); // 캐시 클리어로 최신 데이터 보장
      setTimeout(() => loadPosts(1, false), 100);
    } catch (error) {
      console.error('글 작성 실패:', error);
    }
  }, [loadPosts, clearCache]);

  // 검색 핸들러 추가
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      // 검색어가 없으면 전체 목록 표시
      setPosts(allPosts);
      return;
    }
    const filteredPosts = allPosts.filter(post => {
      const query = searchQuery.toLowerCase();
      switch (searchFilter) {
        case 'title':
          return post.title?.toLowerCase().includes(query);
        case 'writer':
          return post.writer?.toLowerCase().includes(query);
        case 'content':
          return post.content?.toLowerCase().includes(query);
        case 'all':
        default:
          return (
            post.title?.toLowerCase().includes(query) ||
            post.writer?.toLowerCase().includes(query) ||
            post.content?.toLowerCase().includes(query)
          );
      }
    });
    setPosts(filteredPosts);
    console.log(`🔍 검색 완료: "${searchQuery}" (${searchFilter}) -> ${filteredPosts.length}개 결과`);
  }, [searchQuery, searchFilter, allPosts]);

  // 무한 스크롤 설정
  const [infiniteScrollTarget, isFetchingMore] = useInfiniteScroll(
    useCallback(async () => {
      if (!hasMore || loading) return;
      if (loadMorePostsRef.current) {
        await loadMorePostsRef.current();
      }
    }, [hasMore, loading]),
    hasMore
  );

  // 더 많은 게시글 로드 (무한 스크롤)
  const loadMorePosts = useCallback(async () => {
    if (!pagination?.has_next || isFetchingMore) return;
    await loadPosts(currentPage + 1, true);
    setCurrentPage(prev => prev + 1);
  }, [pagination, currentPage, loadPosts, isFetchingMore]);

  // loadMorePosts 함수 참조 업데이트
  useEffect(() => {
    loadMorePostsRef.current = loadMorePosts;
  }, [loadMorePosts]);

  // 초기 게시글 로드
  useEffect(() => {
    if (!boardConfig) return;

    setCurrentPage(1);
    setHasMore(true);
    clearCache(); // 게시판 변경 시 캐시 클리어
    loadPosts(1, false);
  }, [boardConfig, loadPosts, clearCache]);

  // 삭제 감지 및 자동 새로고침
  useEffect(() => {
    // URL 파라미터에서 refresh 확인
    const urlParams = new URLSearchParams(location.search);
    const shouldRefresh = urlParams.get('refresh');

    // location.state에서 forceRefresh 확인
    const forceRefresh = location.state?.forceRefresh;
    const deletedPostId = location.state?.deletedPostId;

    if (shouldRefresh || forceRefresh) {
      console.log(`🔄 삭제 후 자동 새로고침: ${boardType} (삭제된 게시물: ${deletedPostId || 'N/A'})`);

      // 모든 캐시 클리어
      clearCache();

      // 강제로 모든 관련 캐시 제거
      const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      allKeys.forEach(key => {
        if (key.includes(boardType) || key.includes('board_posts') || key.includes('board_cache')) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      });

      // 게시물 목록 강제 새로고침
      setCurrentPage(1);
      setHasMore(true);
      setPosts([]);
      setAllPosts([]);

      // 약간의 지연 후 로드 (UI 업데이트 보장)
      setTimeout(() => {
        loadPosts(1, false);
      }, 100);

      // URL 파라미터 정리 (뒤로가기 시 불필요한 새로고침 방지)
      if (shouldRefresh) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // location.state 정리
      if (forceRefresh) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [location, boardType, clearCache, loadPosts]);

  // 검색 처리 - 디바운싱 적용
  const filteredPosts = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return allPosts;
    }

    const query = debouncedSearchQuery.toLowerCase();

    return allPosts.filter(post => {
      switch (searchFilter) {
        case 'title':
          return post.title?.toLowerCase().includes(query);
        case 'writer':
          return post.writer?.toLowerCase().includes(query);
        case 'content':
          return post.content?.toLowerCase().includes(query);
        case 'all':
        default:
          return (
            post.title?.toLowerCase().includes(query) ||
            post.writer?.toLowerCase().includes(query) ||
            post.content?.toLowerCase().includes(query)
          );
      }
    });
  }, [allPosts, debouncedSearchQuery, searchFilter]);

  // 실제 표시할 게시글 (검색 결과 반영)
  useEffect(() => {
    setPosts(filteredPosts);
  }, [filteredPosts]);

  // 검색 초기화
  const handleSearchReset = useCallback(() => {
    setSearchQuery('');
    setSearchFilter('all');
    setPosts(allPosts);
  }, [allPosts]);

  // 새로고침
  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    setHasMore(true);
    clearCache();
    loadPosts(1, false);
  }, [loadPosts, clearCache]);

  // 정렬 변경
  const handleSortChange = useCallback((newSortOrder) => {
    setSortOrder(newSortOrder);
    setCurrentPage(1);
    setHasMore(true);
    // 정렬 변경 시 즉시 로드
    setTimeout(() => loadPosts(1, false), 0);
  }, [loadPosts, setSortOrder]);

  // 페이지당 게시글 수 변경
  const handlePostsPerPageChange = useCallback((newLimit) => {
    setPostsPerPage(newLimit);
    setCurrentPage(1);
    setHasMore(true);
    // 설정 변경 시 즉시 로드
    setTimeout(() => loadPosts(1, false), 0);
  }, [loadPosts, setPostsPerPage]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 성능 측정된 렌더링
  return measureRenderTime(() => (
    <div className="universal-board">
      {/* 에러 표시 */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          borderRadius: '6px',
          margin: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>오류:</strong> {error}
          <button
            onClick={handleRefresh}
            style={{ marginLeft: '10px', padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      )}

      {/* 성능 최적화된 게시판 컴포넌트 */}
      <BoardCommon
        // 기본 props
        boardType={boardType}
        title={boardConfig?.title || `${boardType} 게시판`}
        boardName={boardConfig?.title || `${boardType} 게시판`}
        posts={posts}
        allPosts={allPosts}
        setPosts={setPosts}
        setAllPosts={setAllPosts}
        showWrite={showWrite}
        setShowWrite={setShowWrite}
        isLoggedIn={isLoggedIn}
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        loading={loading}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pagination={pagination}
        totalPosts={totalPosts}

        // 게시물 클릭 핸들러 추가
        handlePostClick={handlePostClick}

        // 카테고리 정보 추가
        category={boardType}

        // 글쓰기 및 검색 핸들러 추가
        handleWriteButton={handleWriteButton}
        handleWriteSubmit={handleWriteSubmit}
        handleSearch={handleSearch}

        // 성능 최적화 props
        onRefresh={handleRefresh}
        onSearchReset={handleSearchReset}
        onSortChange={handleSortChange}
        onPostsPerPageChange={handlePostsPerPageChange}
        postsPerPage={postsPerPage}
        sortOrder={sortOrder}
        hasMore={hasMore}
        isFetchingMore={isFetchingMore}

        // 게시판 설정
        boardConfig={boardConfig}
      />

      {/* 무한 스크롤 트리거 */}
      {hasMore && (
        <div
          ref={infiniteScrollTarget}
          style={{ height: '50px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0' }}>
          {isFetchingMore && (
            <div style={{ width: '20px', height: '20px', border: '2px solid #e1e5e9', borderTop: '2px solid #0366d6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          )}
        </div>
      )}

      {/* 개발환경에서 성능 정보 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', backgroundColor: 'rgba(0,0,0,0.8)', color: 'white', padding: '8px', borderRadius: '4px', fontSize: '12px', zIndex: 9999 }}>
          <div>게시글: {posts.length} / {totalPosts}</div>
          <div>페이지: {currentPage}</div>
          <div>캐시: {debouncedSearchQuery ? '검색중' : '활성'}</div>
        </div>
      )}
    </div>
  ));
});

UniversalBoard.displayName = 'UniversalBoard';

export default UniversalBoard;
