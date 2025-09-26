import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserManagement.css';




const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const navigate = useNavigate();

  const USERS_PER_PAGE = 10;

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: USERS_PER_PAGE,
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('사용자 데이터를 가져올 수 없습니다');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleUserEdit = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleUserUpdate = async (userId, updateData) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error('사용자 정보 업데이트에 실패했습니다');
      }

      await fetchUsers();
      setShowUserModal(false);
      setSelectedUser(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUserActivation = async (userId, isActive) => {
    try {
      const endpoint = isActive ? 'activate' : 'deactivate';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`사용자 ${isActive ? '활성화' : '비활성화'}에 실패했습니다`);
      }

      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadgeClass = (role) => {
    const roleClasses = {
      admin: 'role-admin',
      professor: 'role-professor',
      student: 'role-student',
      guest: 'role-guest'
    };
    return roleClasses[role] || 'role-default';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">사용자 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-management">
        <div className="error">
          <h3>오류가 발생했습니다</h3>
          <p>{error}</p>
          <button onClick={fetchUsers}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="back-btn">
          ← 대시보드로 돌아가기
        </button>
        <h1>사용자 관리</h1>
      </div>

      {/* 필터 및 검색 */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select value={roleFilter} onChange={handleRoleFilter} className="role-filter">
            <option value="">모든 역할</option>
            <option value="admin">관리자</option>
            <option value="professor">교수</option>
            <option value="student">학생</option>
            <option value="guest">게스트</option>
          </select>
        </div>
      </div>

      {/* 사용자 테이블 */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>사용자</th>
              <th>역할</th>
              <th>상태</th>
              <th>가입일</th>
              <th>마지막 로그인</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {user.role}
                    {user.is_admin && <span className="admin-indicator">👑</span>}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="date-cell">
                  {formatDate(user.created_at)}
                </td>
                <td className="date-cell">
                  {formatDate(user.last_login)}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => handleUserEdit(user)}
                      className="edit-btn"
                      title="편집"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleUserActivation(user.id, !user.is_active)}
                      className={`toggle-btn ${user.is_active ? 'deactivate' : 'activate'}`}
                      title={user.is_active ? '비활성화' : '활성화'}
                    >
                      {user.is_active ? '⏸️' : '▶️'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="page-btn"
          >
            이전
          </button>

          <span className="page-info">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="page-btn"
          >
            다음
          </button>
        </div>
      )}

      {/* 사용자 편집 모달 */}
      {showUserModal && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onSave={handleUserUpdate}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

// 사용자 편집 모달 컴포넌트
const UserEditModal = ({ user, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    is_admin: user.is_admin
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>사용자 정보 편집</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-group">
            <label>이름</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>역할</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="student">학생</option>
              <option value="professor">교수</option>
              <option value="admin">관리자</option>
              <option value="guest">게스트</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              계정 활성화
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                name="is_admin"
                checked={formData.is_admin}
                onChange={handleChange}
              />
              관리자 권한
            </label>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              취소
            </button>
            <button type="submit" className="save-btn">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
