import React, { useState, useEffect } from 'react';
import { getDraftList, deleteDraft, getDraftStats } from '../api/draft';
import './DraftList.css';

function DraftList({ onSelectDraft, selectedBoard = null, refreshTrigger = 0 }) {
  const [drafts, setDrafts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // 새로고침 함수 (외부에서 호출 가능)
  const refreshDrafts = async () => {
    await loadDrafts(false);
    await loadStats();
  };

  // 임시저장 목록 로드
  const loadDrafts = async (loadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = loadMore ? page : 0;
      const result = await getDraftList(selectedBoard, 20, currentPage * 20);

      if (result.success) {
        if (loadMore) {
          setDrafts(prev => [...prev, ...result.data.drafts]);
        } else {
          setDrafts(result.data.drafts);
        }
        setHasMore(result.data.has_more);
        setPage(currentPage + 1);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('임시저장 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 통계 로드
  const loadStats = async () => {
    try {
      const result = await getDraftStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('통계 로드 실패:', err);
    }
  };

  // 임시저장 삭제
  const handleDeleteDraft = async (draftId, draftTitle) => {
    const confirmed = window.confirm(`"${draftTitle}" 임시저장을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      const result = await deleteDraft(draftId);
      if (result.success) {
        setDrafts(prev => prev.filter(draft => draft.id !== draftId));
        loadStats(); // 통계 업데이트
        alert('임시저장이 삭제되었습니다.');
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  // 시간 형식화 (시간대 정보 포함된 ISO 문자열 처리)
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);

    // 시간 차이 계산
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    // 시간 계산 완료

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString('ko-KR');
  };

  // 파일 크기 형식화
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    loadDrafts();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBoard]);

  // refreshTrigger가 변경될 때 목록 새로고침
  useEffect(() => {
    if (refreshTrigger > 0) {
      refreshDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  if (loading && drafts.length === 0) {
    return (
      <div className="draft-list">
        <div className="draft-list-header">
          <h3>📝 임시저장</h3>
        </div>
        <div className="draft-loading">
          <div className="loading-spinner"></div>
          <p>임시저장 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="draft-list">
        <div className="draft-list-header">
          <h3>📝 임시저장</h3>
        </div>
        <div className="draft-error">
          <p>❌ {error}</p>
          <button onClick={() => loadDrafts()} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="draft-list">
      <div className="draft-list-header">
        <h3>📝 임시저장</h3>
        {stats && (
          <div className="draft-stats">
            <span className="stat-item">
              총 {stats.total_drafts}개
            </span>
            {stats.storage_used_mb > 0 && (
              <span className="stat-item">
                {formatFileSize(stats.storage_used_mb * 1024 * 1024)} 사용
              </span>
            )}
          </div>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className="draft-empty">
          <div className="empty-icon">📄</div>
          <p>저장된 임시글이 없습니다.</p>
          <small>
            글 작성 중 자동으로 임시저장됩니다.<br/>
            임시저장된 글은 7일 후 자동 삭제됩니다.
          </small>
        </div>
      ) : (
        <>
          <div className="draft-items">
            {drafts.map((draft) => (
              <div key={draft.id} className="draft-item">
                <div className="draft-content" onClick={() => onSelectDraft && onSelectDraft(draft)}>
                  <div className="draft-title">
                    {draft.title || '제목 없음'}
                  </div>
                  <div className="draft-preview">
                    {draft.content.replace(/<[^>]*>/g, '').substring(0, 100) || '내용 없음'}
                    {draft.content.length > 100 && '...'}
                  </div>
                  <div className="draft-meta">
                    <span className="draft-board">{draft.board}</span>
                    <span className="draft-time">{formatTimeAgo(draft.updated_at)}</span>
                    {draft.attachment_count > 0 && (
                      <span className="draft-attachments">
                        📎 {draft.attachment_count}개
                      </span>
                    )}
                    {draft.is_private && (
                      <span className="draft-private">🔒 비공개</span>
                    )}
                  </div>
                </div>
                <button
                  className="draft-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDraft(draft.id, draft.title || '제목 없음');
                  }}
                  title="임시저장 삭제"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="draft-load-more">
              <button
                onClick={() => loadDrafts(true)}
                disabled={loading}
                className="load-more-button"
              >
                {loading ? '로딩 중...' : '더 보기'}
              </button>
            </div>
          )}
        </>
      )}

      {stats && stats.oldest_draft_days > 5 && (
        <div className="draft-warning">
          ⚠️ {stats.oldest_draft_days}일 된 임시저장이 있습니다.
          곧 자동 삭제될 수 있으니 빠른 시일 내에 발행해주세요.
        </div>
      )}
    </div>
  );
}

export default DraftList;
