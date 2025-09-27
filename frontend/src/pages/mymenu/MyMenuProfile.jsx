import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonProfile, SkeletonListItem } from '../../components/Skeleton';
import './MyMenuProfile.css';

function MyMenuProfile() {
  const { user } = useAuth(); // AuthContext에서 사용자 정보 가져오기
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: ''
  });

  // fetchUserInfo 함수 정의
  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const response = await getCurrentUser();
      setUserInfo(response.user);
      setEditForm({
        name: response.user.name || ''
      });
      setError(null);
    } catch (err) {
      console.error('사용자 정보 조회 실패:', err);
      setError('사용자 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // useEffect - 조건부 로직 이전으로 이동
  useEffect(() => {
    if (user) {
      fetchUserInfo();
    }
  }, [user]);

  // 로그인하지 않은 경우 안내 컴포넌트 표시
  if (!user) {
    return (
      <div className="profile-container">
        <div className="login-required-notice">
          <div className="notice-content">
            <div className="notice-icon">👤</div>
            <h3>로그인이 필요한 서비스입니다</h3>
            <p>프로필 정보를 확인하시려면 먼저 로그인해주세요.</p>
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

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditForm({
        name: userInfo.name || ''
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // 실제 API 호출하여 서버에 업데이트
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '프로필 업데이트에 실패했습니다.');
      }

      const data = await response.json();

      // 성공적으로 업데이트된 사용자 정보로 상태 업데이트
      setUserInfo(data.user);
      setIsEditing(false);
      alert(data.message || '프로필이 업데이트되었습니다.');
    } catch (err) {
      console.error('프로필 업데이트 실패:', err);
      alert(err.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '정보 없음';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mymenu-profile">
        <div className="profile-skeleton-container">
          <SkeletonProfile
            className="profile-skeleton"
            animation="shimmer"
            staggerDelay={150}
          />
          <div className="additional-skeleton" style={{ marginTop: '20px' }}>
            {Array.from({ length: 3 }, (_, index) => index).map((item) => (
              <div
                key={`profile-info-skeleton-${item}`}
                style={{
                  marginBottom: '12px',
                  backgroundColor: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <SkeletonListItem
                  showAvatar={false}
                  showMeta={false}
                  animation="shimmer"
                  className="profile-info-skeleton"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mymenu-profile">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={fetchUserInfo} className="retry-btn">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mymenu-profile">
      <div className="profile-header">
        <h1>내 프로필</h1>
        <button
          onClick={handleEditToggle}
          className={`edit-btn ${isEditing ? 'cancel' : 'edit'}`}
        >
          {isEditing ? '취소' : '수정'}
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-section">
          <h3>기본 정보</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>이름</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                  className="edit-input"
                />
              ) : (
                <span>{userInfo?.name || '정보 없음'}</span>
              )}
            </div>

            <div className="info-item">
              <label>이메일</label>
              <span>{userInfo?.email || '정보 없음'}</span>
            </div>

            <div className="info-item">
              <label>역할</label>
              <span>{userInfo?.role || '정보 없음'}</span>
            </div>

            <div className="info-item">
              <label>계정 상태</label>
              <span className={`status ${userInfo?.is_active ? 'active' : 'inactive'}`}>
                {userInfo?.is_active ? '활성' : '비활성'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3>계정 정보</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>가입일</label>
              <span>{formatDate(userInfo?.created_at)}</span>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="edit-actions">
            <button onClick={handleSave} className="save-btn">
              저장
            </button>
            <button onClick={handleEditToggle} className="cancel-btn">
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyMenuProfile;
