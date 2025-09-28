import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { getCurrentUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './MyMenuComments.css';

function MyMenuComments() {
  const { user } = useAuth(); // AuthContext에서 사용자 정보 가져오기
  const [comments, setComments] = useState([]);
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

  const fetchMyComments = useCallback(async () => {
    // currentUser가 없으면 함수 실행하지 않음
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/api/activity/recent-comments?limit=50`);

      if (response.data) {
        const myComments = response.data.filter(comment => {
          // comment가 null이거나 undefined인 경우 처리
          if (!comment || !comment.author) {
            return false;
          }
          return comment.author === currentUser.name || comment.author === currentUser._id;
        });

        if (page === 1) {
          setComments(myComments);
        } else {
          setComments(prev => [...prev, ...myComments]);
        }

        setHasMore(myComments.length === 50);
      }
      setError(null);
    } catch (err) {
      console.error('댓글 조회 실패:', err);
      setError('댓글을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, page]);

  useEffect(() => {
    if (user) {
      fetchCurrentUser();
    }
  }, [fetchCurrentUser, user]);

  // currentUser가 설정된 후에 댓글을 가져옴
  useEffect(() => {
    if (currentUser) {
      fetchMyComments();
    }
  }, [fetchMyComments, currentUser]);

  // 로그인하지 않은 경우 안내 컴포넌트 표시
  if (!user) {
    return (
      <div className="comments-container">
        <div className="login-required-notice">
          <div className="notice-content">
            <div className="notice-icon">💬</div>
            <h3>로그인이 필요한 서비스입니다</h3>
            <p>내 댓글을 확인하시려면 먼저 로그인해주세요.</p>
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

  const handleCommentClick = (comment) => {
    let basePath = '/board';
    const boardName = comment.board;

    if (['자유게시판', '음식게시판', '질문과답변', '학회공모전'].includes(boardName)) {
      basePath = '/community';
    }
    else if (['연구자료', '제출자료', '제안서', '논문게시판'].includes(boardName)) {
      basePath = '/research';
    }
    else {
      basePath = '/board';
    }

    navigate(`${basePath}/${boardName}/detail/${comment.post_id}#comment-${comment.comment_id}`);
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

  const getCommentTypeInfo = (comment) => {
    if (comment.parent_comment_id) {
      return { label: 'Reply', icon: '↳' };
    }
    return { label: 'Comment', icon: '💬' };
  };

  if (loading && page === 1) {
    return (
      <div className="mymenu-comments">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>댓글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mymenu-comments">
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
    <div className="mymenu-comments">
      <div className="comments-header">
        <div className="header-content">
          <h1>내 댓글</h1>
          <p className="header-subtitle">작성한 댓글을 한눈에 확인하세요</p>
        </div>
        <div className="comments-stats">
          <div className="stat-card">
            <span className="stat-number">{comments.length}</span>
            <span className="stat-label">총 댓글</span>
          </div>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <div className="empty-icon">💭</div>
            <h3>작성한 댓글이 없습니다</h3>
            <p>다양한 게시글에 댓글을 달아 소통해보세요</p>
            <button
              onClick={() => navigate('/community/자유게시판')}
              className="action-btn primary"
            >
              게시판 둘러보기
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="comments-grid">
            {comments.map((comment) => {
              const category = getBoardCategory(comment.board);
              const commentType = getCommentTypeInfo(comment);
              return (
                <article
                  key={comment.comment_id}
                  className="comment-card"
                  onClick={() => handleCommentClick(comment)}
                >
                  <div className="comment-header">
                    <div className="comment-meta">
                      <span className={`board-badge ${category.color}`}>
                        {category.label}
                      </span>
                      <span className="comment-type-badge">
                        <span className="comment-icon">{commentType.icon}</span>
                        {commentType.label}
                      </span>
                      {comment.prefix && (
                        <span className="prefix-badge">
                          [{comment.prefix}]
                        </span>
                      )}
                    </div>
                    <time className="comment-date" dateTime={comment.date}>
                      {formatDate(comment.date)}
                    </time>
                  </div>

                  <div className="comment-content">
                    <h4 className="post-reference">
                      <span className="post-indicator">게시글:</span>
                      {comment.title}
                    </h4>
                    <div className="comment-text">
                      {comment.content}
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

export default MyMenuComments;
