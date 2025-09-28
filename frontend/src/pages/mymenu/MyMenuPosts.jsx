import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getCurrentUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './MyMenuPosts.css';

function MyMenuPosts() {
  const { user } = useAuth(); // AuthContext에서 사용자 정보 가져오기
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setCurrentUser(response.user);
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
      setError('사용자 정보를 불러올 수 없습니다.');
    }
  }, []);

  const fetchMyPosts = useCallback(async () => {
    // currentUser가 없으면 함수 실행하지 않음
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/board/?page=${page}&limit=50`);

      console.log('🔍 MyMenuPosts API 응답:', response.data);

      if (response.data && response.data.posts) {
        console.log('🔍 전체 posts:', response.data.posts);

        const myPosts = response.data.posts.filter(post => {
          // post가 null이거나 undefined인 경우 처리
          if (!post || !post.writer_id) {
            return false;
          }
          return post.writer_id === currentUser._id || post.writer_id === currentUser.id;
        });

        console.log('🔍 필터링된 내 게시글들:', myPosts);
        console.log('🔍 첫 번째 게시글 상세:', myPosts[0]);

        if (page === 1) {
          setPosts(myPosts);
        } else {
          setPosts(prev => [...prev, ...myPosts]);
        }

        setHasMore(myPosts.length === 50);
      }
      setError(null);
    } catch (err) {
      console.error('게시글 조회 실패:', err);
      setError('게시글을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, page]);

  useEffect(() => {
    if (user) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser, user]);

  // currentUser가 설정된 후에 게시글을 가져옴
  useEffect(() => {
    if (currentUser) {
      fetchMyPosts();
    }
  }, [fetchMyPosts, currentUser]);

  // 로그인하지 않은 경우 안내 컴포넌트 표시
  if (!user) {
    return (
      <div className="posts-container">
        <div className="login-required-notice">
          <div className="notice-content">
            <div className="notice-icon">📝</div>
            <h3>로그인이 필요한 서비스입니다</h3>
            <p>내 게시글을 확인하시려면 먼저 로그인해주세요.</p>
            <div className="notice-actions">
              <Link to="/login" className="login-btn">
                로그인하기
              </Link>
              <Link to="/signup" className="signup-btn">
                회원가입
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const handlePostClick = (post) => {
    // 디버깅을 위한 로그 추가
    console.log('🔍 MyMenuPosts handlePostClick - 전체 post 객체:', post);
    console.log('🔍 post._id:', post._id);
    console.log('🔍 post.id:', post.id);

    const boardName = post.board;
    const postId = post._id || post.id;

    console.log('🔍 boardName:', boardName);
    console.log('🔍 최종 postId:', postId);

    if (!postId) {
      console.error('❌ postId가 없습니다!', post);
      alert('게시글 ID를 찾을 수 없습니다.');
      return;
    }

    let targetPath;

    // 게시판별 경로 매핑 (모든 게시판을 community 경로로 통일)
    switch (boardName) {
      case '연구자료':
        targetPath = `/community/연구자료/detail/${postId}`;
        break;
      case '제출자료':
        targetPath = `/community/제출자료/detail/${postId}`;
        break;
      case '제안서':
        targetPath = `/community/제안서/detail/${postId}`;
        break;
      case '자유':
      case '자유게시판':
        targetPath = `/community/자유/detail/${postId}`;
        break;
      case '공지사항':
        targetPath = `/community/공지사항/detail/${postId}`;
        break;
      case '뉴스':
        targetPath = `/community/뉴스/detail/${postId}`;
        break;
      case '음식게시판':
        targetPath = `/community/음식게시판/detail/${postId}`;
        break;
      case '질문과답변':
        targetPath = `/community/질문과답변/detail/${postId}`;
        break;
      case '학회공모전':
        targetPath = `/community/학회공모전/detail/${postId}`;
        break;
      case '논문게시판':
        targetPath = `/community/논문게시판/detail/${postId}`;
        break;
      default:
        // 기타 게시판은 기본 community 경로 사용
        targetPath = `/community/${encodeURIComponent(boardName)}/detail/${postId}`;
    }

    console.log('🔍 최종 targetPath:', targetPath);
    navigate(targetPath);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      let date;
      const dateStr = dateString.toString();

      // 'YYYY-MM-DD HH:MM:SS' 형식 (한국 시간대)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        // 한국 시간으로 파싱
        date = new Date(dateStr + ' +09:00');
      }
      // ISO 형식 (T나 Z 포함)
      else if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = new Date(dateStr);
      }
      // 기타 형식
      else {
        date = new Date(dateStr);
      }

      // Date 객체가 유효한지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', dateString);
        return '';
      }

      const now = new Date();
      const diff = now - date;
      const diffMinutes = Math.floor(diff / (1000 * 60));
      const diffHours = Math.floor(diff / (1000 * 60 * 60));
      const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return '방금 전';
      if (diffMinutes < 60) return `${diffMinutes}분 전`;
      if (diffHours < 24) return `${diffHours}시간 전`;
      if (diffDays < 7) return `${diffDays}일 전`;

      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn('날짜 파싱 오류:', dateString, error);
      return '';
    }
  };

  const getBoardCategory = (board) => {
    const categories = {
      '공지사항': { label: 'Notice', color: 'notice' },
      '뉴스': { label: 'News', color: 'news' },
      '회의기록': { label: 'Meeting', color: 'meeting' },
      '자유게시판': { label: 'Community', color: 'community' },
      '음식게시판': { label: 'Food', color: 'food' },
      '질문과답변': { label: 'Q&A', color: 'qa' },
      '학회공모전': { label: 'Contest', color: 'contest' },
      '연구자료': { label: 'Research', color: 'research' },
      '제출자료': { label: 'Submit', color: 'submit' },
      '제안서': { label: 'Proposal', color: 'proposal' },
      '논문게시판': { label: 'Paper', color: 'paper' }
    };
    return categories[board] || { label: 'General', color: 'general' };
  };

  if (loading && page === 1) {
    return (
      <div className="mymenu-posts">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mymenu-posts">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mymenu-posts">
      <div className="posts-header">
        <div className="header-content">
          <h1>내 게시글</h1>
          <p className="header-subtitle">작성한 게시글을 한눈에 확인하세요</p>
        </div>
        <div className="posts-stats">
          <div className="stat-card">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">총 게시글</span>
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">✏️</div>
            <h3>작성한 게시글이 없습니다</h3>
            <p>다양한 게시판에서 첫 번째 게시글을 작성해보세요</p>
            <button
              onClick={() => navigate('/community/자유게시판')}
              className="action-btn primary"
            >
              게시글 작성하기
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map((post, index) => {
              const category = getBoardCategory(post.board);
              return (
                <article
                  key={post._id || post.id || `post-${index}`}
                  className="post-card"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="post-header">
                    <div className="post-meta">
                      <span className={`board-badge ${category.color}`}>
                        {category.label}
                      </span>
                      {post.subcategory && (
                        <span className="subcategory-badge">
                          {post.subcategory}
                        </span>
                      )}
                      {post.is_private && (
                        <span className="private-badge">비공개</span>
                      )}
                    </div>
                    <time className="post-date" dateTime={post.date}>
                      {formatDate(post.date)}
                    </time>
                  </div>

                  <div className="post-content">
                    <h3 className="post-title">
                      {post.prefix && (
                        <span className="post-prefix">[{post.prefix}]</span>
                      )}
                      {post.title}
                    </h3>
                    <p className="post-excerpt">
                      {post.content.replace(/<[^>]*>/g, '').substring(0, 120)}
                      {post.content.replace(/<[^>]*>/g, '').length > 120 ? '...' : ''}
                    </p>
                  </div>

                  <div className="post-stats">
                    <div className="stat-item">
                      <span className="stat-value">{post.views || 0}</span>
                      <span className="stat-label">조회</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{post.likes || 0}</span>
                      <span className="stat-label">좋아요</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-value">{post.comment_count || 0}</span>
                      <span className="stat-label">댓글</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="load-more-container">
              <button
                onClick={loadMore}
                disabled={loading}
                className="load-more-btn"
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyMenuPosts;
