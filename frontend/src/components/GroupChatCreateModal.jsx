import React, { useState, useEffect, useCallback } from 'react';
import { SkeletonSearchResult } from './Skeleton';
import { useOptimizedSkeleton } from '../utils/skeletonHooks';
import './GroupChatCreateModal.css';

// 토큰 가져오기 함수
const getAccessToken = () =>
  sessionStorage.getItem('access_token') || localStorage.getItem('access_token') || null;

function GroupChatCreateModal({ isOpen, onClose, currentUser, onCreateGroup }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 최적화된 skeleton 훅
  const searchSkeleton = useOptimizedSkeleton(loading, Array(3).fill(null), {
    smartOptions: { minDisplayTime: 200, fadeInDelay: 80 },
    progressiveOptions: { staggerDelay: 100, enableStagger: true },
    transitionOptions: { duration: 200, enableScale: true }
  });

  // 모달이 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedMembers([]);
      setGroupName('');
      setError('');
    }
  }, [isOpen]);

  // 멤버 검색 함수
  const searchMembers = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const hostIp = process.env.REACT_APP_HOST_IP;
      const port = process.env.REACT_APP_API_PORT || '8080';

      if (!hostIp) {
        throw new Error('REACT_APP_HOST_IP 환경변수가 설정되지 않았습니다. .env 파일에서 IP를 설정해주세요.');
      }

      const backendUrl = `http://${hostIp}:${port}`;

      const token = getAccessToken();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${backendUrl}/api/chat/users/search?q=${encodeURIComponent(term)}`, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const users = await response.json();
        // 현재 사용자는 제외하고, 이미 선택된 멤버도 제외
        const filteredUsers = users.filter(user =>
          user.id !== currentUser.id &&
          !selectedMembers.some(member => member.id === user.id)
        );
        setSearchResults(filteredUsers);
      } else {
        throw new Error('멤버 검색에 실패했습니다.');
      }
    } catch (error) {
      console.error('멤버 검색 오류:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, selectedMembers]);

  // 검색어 변경시 디바운싱으로 검색
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      searchMembers(searchTerm);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedMembers, searchMembers]);

  // 멤버 선택/해제
  const toggleMemberSelection = (user) => {
    if (selectedMembers.some(member => member.id === user.id)) {
      // 이미 선택된 경우 제거
      setSelectedMembers(selectedMembers.filter(member => member.id !== user.id));
    } else {
      // 최대 5명까지만 선택 가능
      if (selectedMembers.length >= 5) {
        setError('최대 5명까지만 선택할 수 있습니다.');
        return;
      }
      setSelectedMembers([...selectedMembers, user]);
      setError(''); // 에러 메시지 초기화
    }
  };

  // 선택된 멤버 제거
  const removeMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  // 그룹 채팅 생성
  const handleCreateGroup = async () => {
    if (selectedMembers.length === 0) {
      setError('최소 1명의 멤버를 선택해주세요.');
      return;
    }

    if (!groupName.trim()) {
      setError('그룹 이름을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const memberIds = selectedMembers.map(member => member.id);

      await onCreateGroup({
        name: groupName.trim(),
        memberIds: [...memberIds, currentUser.id] // 현재 사용자도 포함
      });

      onClose();
    } catch (error) {
      console.error('그룹 채팅 생성 오류:', error);
      setError('그룹 채팅 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="group-chat-modal-overlay">
      <div className="group-chat-modal">
        <div className="modal-header">
          <h3>연구의숲 멤버 검색하기</h3>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-content">
          {/* 그룹 이름 입력 */}
          <div className="group-name-section">
            <label>그룹 이름</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="그룹 채팅방 이름을 입력하세요"
              className="group-name-input"
              maxLength={30}
            />
          </div>

          {/* 선택된 멤버 표시 */}
          {selectedMembers.length > 0 && (
            <div className="selected-members-section">
              <label>선택된 멤버 ({selectedMembers.length}/5)</label>
              <div className="selected-members-list">
                {selectedMembers.map(member => (
                  <div key={member.id} className="selected-member-item">
                    <div className="member-info">
                      <i className="fas fa-user-circle"></i>
                      <span>{member.name}</span>
                    </div>
                    <button
                      className="remove-member-btn"
                      onClick={() => removeMember(member.id)}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 멤버 검색 */}
          <div className="member-search-section">
            <label>멤버 검색</label>
            <div className="search-input-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="멤버 이름을 입력하세요"
                className="member-search-input"
              />
              <i className="fas fa-search search-icon"></i>
            </div>
          </div>

          {/* 검색 결과 */}
          <div className="search-results-section">
            {(loading || searchSkeleton.showSkeleton) && (
              <div className="search-results-list skeleton-loader" {...searchSkeleton.skeletonProps}>
                {Array.from({ length: 3 }).map((_, index) => {
                  const isVisible = loading || searchSkeleton.getItemVisibility(index);
                  const delay = searchSkeleton.getItemDelay(index);

                  return (
                    <div
                      key={`search-skeleton-${index}`}
                      className="search-skeleton-item"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible
                          ? 'translateY(0) scale(1)'
                          : 'translateY(8px) scale(0.98)',
                        transition: `all 250ms ease-out ${delay}ms`,
                        marginBottom: '8px'
                      }}
                    >
                      <SkeletonSearchResult
                        className="search-skeleton-item"
                        animation="shimmer"
                        staggerDelay={0}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && searchResults.length === 0 && searchTerm && (
              <div className="empty-state">
                <i className="fas fa-user-slash"></i>
                <span>검색 결과가 없습니다</span>
              </div>
            )}

            {!loading && searchResults.length > 0 && (
              <div className="search-results-list">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="search-result-item"
                    onClick={() => toggleMemberSelection(user)}
                  >
                    <div className="user-info">
                      <i className="fas fa-user-circle"></i>
                      <div className="user-details">
                        <span className="user-name">{user.name}</span>
                        <span className="user-email">{user.email}</span>
                      </div>
                    </div>
                    <button className="add-member-btn">
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="create-group-btn"
            onClick={handleCreateGroup}
            disabled={loading || selectedMembers.length === 0 || !groupName.trim()}
          >
            {loading ? (
              <div>
                <i className="fas fa-spinner fa-spin"></i>
                생성 중...
              </div>
            ) : (
              <div>
                <i className="fas fa-users"></i>
                그룹 채팅 생성
              </div>
            )}
          </button>
          <button className="cancel-btn" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupChatCreateModal;
