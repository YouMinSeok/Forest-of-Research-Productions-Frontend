import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getCurrentUser } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useOptimizedSkeleton } from '../utils/skeletonHooks';
import { SkeletonProfile, SkeletonListItem } from '../components/Skeleton';
import './MyMenu.css';

function MyMenu() {
  const { user } = useAuth(); // AuthContext에서 사용자 정보 가져오기
  const [userInfo, setUserInfo] = useState(null);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    recentPosts: [],
    recentComments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // 최적화된 skeleton 훅들 - 조건부 로직 이전으로 이동
  const profileSkeleton = useOptimizedSkeleton(loading, [{}], {
    smartOptions: { minDisplayTime: 1000, fadeInDelay: 0 },
    progressiveOptions: { enableStagger: false },
    transitionOptions: { duration: 300, enableScale: true }
  });

  const statsSkeleton = useOptimizedSkeleton(loading, Array(4).fill(null), {
    smartOptions: { minDisplayTime: 1000, fadeInDelay: 0 },
    progressiveOptions: { staggerDelay: 150, enableStagger: true },
    transitionOptions: { duration: 300, enableSlide: true }
  });

  const fetchUserStats = useCallback(async (user) => {
    try {
      console.log('🔍 MyMenu fetchUserStats - 사용자 정보:', user);
      console.log('🔍 user._id:', user._id);
      console.log('🔍 user.id:', user.id);

      // 최근 게시글 조회
      const postsResponse = await api.get('/api/board/?page=1&limit=100');
      console.log('🔍 게시글 API 응답:', postsResponse.data);
      console.log('🔍 posts 배열:', postsResponse.data.posts);

      const userPosts = postsResponse.data.posts?.filter(post => {
        console.log('🔍 게시글 필터링 체크:', {
          post_writer_id: post.writer_id,
          user_id: user._id || user.id,
          match: post.writer_id === (user._id || user.id)
        });
        return post.writer_id === user._id || post.writer_id === user.id;
      }) || [];

      console.log('🔍 필터링된 사용자 게시글:', userPosts);

      // 최근 댓글 조회
      const commentsResponse = await api.get('/api/activity/recent-comments?limit=100');
      const userComments = commentsResponse.data?.filter(comment =>
        comment.author === user.name
      ) || [];

      setStats({
        totalPosts: userPosts.length,
        totalComments: userComments.length,
        recentPosts: userPosts.slice(0, 5),
        recentComments: userComments.slice(0, 5)
      });
    } catch (err) {
      console.error('통계 정보 조회 실패:', err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // 사용자 정보 조회
      const userResponse = await getCurrentUser();
      setUserInfo(userResponse.user);

      // 사용자 활동 통계 조회
      await fetchUserStats(userResponse.user);

      setError(null);
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
      setError('사용자 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchUserStats]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [fetchUserData, user]);

  // 로그인하지 않은 경우 안내 컴포넌트 표시
  if (!user) {
    return (
      <div className="mymenu-container">
        <div className="login-required-notice">
          <div className="notice-content">
            <div className="notice-icon">🔐</div>
            <h3>로그인이 필요한 서비스입니다</h3>
            <p>마이메뉴를 이용하시려면 먼저 로그인해주세요.</p>
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

  const handlePostClick = (post) => {
    console.log('🔍 MyMenu handlePostClick - 전체 post 객체:', post);
    console.log('🔍 post._id:', post._id);
    console.log('🔍 post.id:', post.id);

    let basePath = '/board';
    const boardName = post.board;
    const postId = post._id || post.id; // _id가 없으면 id 사용

    console.log('🔍 boardName:', boardName);
    console.log('🔍 최종 postId:', postId);

    if (!postId) {
      console.error('❌ postId가 없습니다!', post);
      alert('게시글 ID를 찾을 수 없습니다.');
      return;
    }

    if (['자유게시판', '음식게시판', '질문과답변', '학회공모전'].includes(boardName)) {
      basePath = '/community';
    } else if (['연구자료', '제출자료', '제안서', '논문게시판'].includes(boardName)) {
      basePath = '/research';
    }

    const targetPath = `${basePath}/${boardName}/detail/${postId}`;
    console.log('🔍 최종 targetPath:', targetPath);
    navigate(targetPath);
  };

  const handleCommentClick = (comment) => {
    let basePath = '/board';
    const boardName = comment.board;

    if (['자유게시판', '음식게시판', '질문과답변', '학회공모전'].includes(boardName)) {
      basePath = '/community';
    } else if (['연구자료', '제출자료', '제안서', '논문게시판'].includes(boardName)) {
      basePath = '/research';
    }

    navigate(`${basePath}/${boardName}/detail/${comment.post_id}#comment-${comment.comment_id}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading || profileSkeleton.showSkeleton || statsSkeleton.showSkeleton) {
    return (
      <div className="mymenu-page">
        <div className="mymenu-skeleton skeleton-loader">
          {(loading || profileSkeleton.showSkeleton) && (
            <div {...profileSkeleton.skeletonProps}>
              <SkeletonProfile
                className="profile-skeleton"
                animation="shimmer"
                staggerDelay={100}
              />
            </div>
          )}

          {(loading || statsSkeleton.showSkeleton) && (
            <div className="stats-skeleton" {...statsSkeleton.skeletonProps}>
              {Array.from({ length: 4 }).map((_, index) => {
                const isVisible = loading || statsSkeleton.getItemVisibility(index);
                const delay = statsSkeleton.getItemDelay(index);

                return (
                  <div
                    key={`stats-skeleton-${index}`}
                    className="stats-item-skeleton"
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(15px) scale(0.95)',
                      transition: `all 400ms ease-out ${delay}ms`,
                      marginBottom: '12px',
                      backgroundColor: '#f8f9fa',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <SkeletonListItem
                      showAvatar={false}
                      showMeta={true}
                      className="stats-item-skeleton"
                      animation="shimmer"
                      staggerDelay={0}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mymenu-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchUserData} className="retry-btn">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mymenu-page">
      <div className="mymenu-header">
        <h1>마이메뉴</h1>
        <p className="welcome-message">
          안녕하세요, <strong>{userInfo?.name || '사용자'}</strong>님!
          연구실 활동을 관리해보세요.
        </p>
      </div>

      {/* 메인 네비게이션 카드들 */}
      <div className="menu-cards-container">
        <div className="menu-cards">
          <Link to="/mymenu/profile" className="menu-card profile-card">
            <div className="card-icon">👤</div>
            <div className="card-content">
              <h3>내 프로필</h3>
              <p>개인 정보 및 계정 설정 관리</p>
              <div className="card-stats">
                <span className={`status-badge ${userInfo?.is_active ? 'active' : 'inactive'}`}>
                  {userInfo?.is_active ? '활성 계정' : '비활성 계정'}
                </span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <Link to="/mymenu/posts" className="menu-card posts-card">
            <div className="card-icon">📝</div>
            <div className="card-content">
              <h3>내 게시글</h3>
              <p>작성한 게시글 조회 및 관리</p>
              <div className="card-stats">
                <span className="stat-number">{stats.totalPosts}</span>
                <span className="stat-label">개의 게시글</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>

          <Link to="/mymenu/comments" className="menu-card comments-card">
            <div className="card-icon">💬</div>
            <div className="card-content">
              <h3>내 댓글</h3>
              <p>작성한 댓글 조회 및 관리</p>
              <div className="card-stats">
                <span className="stat-number">{stats.totalComments}</span>
                <span className="stat-label">개의 댓글</span>
              </div>
            </div>
            <div className="card-arrow">→</div>
          </Link>
        </div>
      </div>

      {/* 최근 활동 요약 */}
      <div className="activity-summary">
        <div className="activity-section">
          <div className="section-header">
            <h3>최근 게시글</h3>
            <Link to="/mymenu/posts" className="view-all-link">모두 보기</Link>
          </div>
          <div className="activity-list">
            {stats.recentPosts.length > 0 ? (
              stats.recentPosts.map((post, index) => (
                <div
                  key={post._id || index}
                  className="activity-item"
                  onClick={() => handlePostClick(post)}
                >
                  <div className="activity-content">
                    <span className="board-name">[{post.board}]</span>
                    <span className="activity-title">{post.title}</span>
                  </div>
                  <div className="activity-date">{formatDate(post.date)}</div>
                </div>
              ))
            ) : (
              <div className="no-activity">작성한 게시글이 없습니다</div>
            )}
          </div>
        </div>

        <div className="activity-section">
          <div className="section-header">
            <h3>최근 댓글</h3>
            <Link to="/mymenu/comments" className="view-all-link">모두 보기</Link>
          </div>
          <div className="activity-list">
            {stats.recentComments.length > 0 ? (
              stats.recentComments.map((comment, index) => (
                <div
                  key={comment.comment_id || index}
                  className="activity-item"
                  onClick={() => handleCommentClick(comment)}
                >
                  <div className="activity-content">
                    <span className="board-name">[{comment.board}]</span>
                    <span className="activity-title">
                      {comment.content.substring(0, 30)}
                      {comment.content.length > 30 ? '...' : ''}
                    </span>
                  </div>
                  <div className="activity-date">{formatDate(comment.date)}</div>
                </div>
              ))
            ) : (
              <div className="no-activity">작성한 댓글이 없습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyMenu;
