import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './PermissionManagement.css';

// api.js를 사용하여 일관된 인증 방식 적용



const PermissionManagement = () => {
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('roles');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // 권한 목록 가져오기
      try {
        const permissionsResponse = await api.get('/api/admin/permissions');
        setPermissions(permissionsResponse.data);
      } catch (error) {
        console.error('권한 목록 로드 실패:', error);
      }

      // 역할 목록 가져오기
      try {
        const rolesResponse = await api.get('/api/admin/roles');
        setRoles(rolesResponse.data);
      } catch (error) {
        console.error('역할 목록 로드 실패:', error);
      }

      // 사용자 목록 가져오기
      try {
        const usersResponse = await api.get('/api/admin/users?limit=50');
        setUsers(usersResponse.data.users || []);
      } catch (error) {
        console.error('사용자 목록 로드 실패:', error);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async (userId, permission) => {
    try {
      console.log('🔍 권한 추가 요청:', { userId, permission });

      // api 모듈을 사용하여 일관성 유지
      const response = await api.post(`/api/admin/users/${userId}/permissions`, {
        permission
      });

      console.log('✅ 권한 추가 성공:', response.data);
      await fetchData();
      alert('권한이 성공적으로 추가되었습니다');
    } catch (err) {
      console.error('❌ 권한 추가 오류:', err);
      const errorMessage = err.response?.data?.message || err.message || '권한 추가에 실패했습니다';
      alert(errorMessage);
    }
  };

  const handleRemovePermission = async (userId, permission) => {
    try {
      console.log('🔍 권한 제거 요청:', { userId, permission });

      // api 모듈을 사용하여 일관성 유지
      await api.delete(`/api/admin/users/${userId}/permissions/${permission}`);

      console.log('✅ 권한 제거 성공');
      await fetchData();
      alert('권한이 성공적으로 제거되었습니다');
    } catch (err) {
      console.error('❌ 권한 제거 오류:', err);
      const errorMessage = err.response?.data?.message || err.message || '권한 제거에 실패했습니다';
      alert(errorMessage);
    }
  };

  const getPermissionDescription = (permissionType) => {
    const descriptions = {
      read: '읽기 권한',
      write: '쓰기 권한',
      delete: '삭제 권한',
      admin: '관리자 권한',
      manage_users: '사용자 관리',
      manage_boards: '게시판 관리',
      manage_banners: '배너 관리',
      manage_research: '연구자료 관리'
    };
    return descriptions[permissionType] || permissionType;
  };

  if (loading) {
    return (
      <div className="permission-management">
        <div className="loading">권한 데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="permission-management">
        <div className="error">
          <h3>오류가 발생했습니다</h3>
          <p>{error}</p>
          <button onClick={fetchData}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div className="permission-management">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="back-btn">
          ← 대시보드로 돌아가기
        </button>
        <h1>권한 관리</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          역할별 권한
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          사용자별 권한
        </button>
        <button
          className={`tab-btn ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          전체 권한 목록
        </button>
      </div>

      {/* 역할별 권한 탭 */}
      {activeTab === 'roles' && (
        <div className="roles-section">
          <h2>역할별 기본 권한</h2>
          <div className="roles-grid">
            {roles.map(role => (
              <div key={role.role} className="role-card">
                <div className="role-header">
                  <h3>{role.role}</h3>
                  <span className="permissions-count">
                    {role.default_permissions.length}개 권한
                  </span>
                </div>
                <div className="role-permissions">
                  {role.default_permissions.map(permission => (
                    <span key={permission} className="permission-tag">
                      {getPermissionDescription(permission)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용자별 권한 탭 */}
      {activeTab === 'users' && (
        <div className="users-permissions-section">
          <h2>사용자별 개별 권한</h2>
          <div className="users-permissions-list">
            {users.map(user => (
              <div key={user.id} className="user-permission-card">
                <div className="user-info">
                  <div className="user-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-details">
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <div className="user-permissions">
                  <div className="permissions-header">
                    <span>개별 권한 ({user.permissions?.length || 0}개)</span>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowPermissionModal(true);
                      }}
                      className="manage-permissions-btn"
                    >
                      권한 관리
                    </button>
                  </div>

                  <div className="permissions-list">
                    {user.permissions && user.permissions.length > 0 ? (
                      user.permissions.map(permission => (
                        <div key={permission} className="user-permission-item">
                          <span>{getPermissionDescription(permission)}</span>
                          <button
                            onClick={() => handleRemovePermission(user.id, permission)}
                            className="remove-permission-btn"
                            title="권한 제거"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="no-permissions">개별 권한 없음</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 권한 목록 탭 */}
      {activeTab === 'permissions' && (
        <div className="permissions-section">
          <h2>시스템 권한 목록</h2>
          <div className="permissions-grid">
            {permissions.map(permission => (
              <div key={permission.type} className="permission-card">
                <div className="permission-icon">🔐</div>
                <div className="permission-info">
                  <h4>{getPermissionDescription(permission.type)}</h4>
                  <p>{permission.description}</p>
                  <code>{permission.type}</code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 권한 관리 모달 */}
      {showPermissionModal && selectedUser && (
        <PermissionModal
          user={selectedUser}
          permissions={permissions}
          onAddPermission={handleAddPermission}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

// 권한 관리 모달 컴포넌트
const PermissionModal = ({ user, permissions, onAddPermission, onClose }) => {
  const [selectedPermission, setSelectedPermission] = useState('');

  const handleAddPermissionClick = () => {
    if (selectedPermission && !user.permissions.includes(selectedPermission)) {
      onAddPermission(user.id, selectedPermission);
      setSelectedPermission('');
    }
  };

  const availablePermissions = permissions.filter(
    p => !user.permissions.includes(p.type)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{user.name}님의 권한 관리</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          <div className="current-permissions">
            <h4>현재 권한</h4>
            <div className="permissions-list">
              {user.permissions && user.permissions.length > 0 ? (
                user.permissions.map(permission => (
                  <span key={permission} className="permission-tag current">
                    {permission}
                  </span>
                ))
              ) : (
                <span className="no-permissions">개별 권한 없음</span>
              )}
            </div>
          </div>

          <div className="add-permission">
            <h4>권한 추가</h4>
            <div className="add-permission-form">
              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value)}
                className="permission-select"
              >
                <option value="">권한을 선택하세요</option>
                {availablePermissions.map(permission => (
                  <option key={permission.type} value={permission.type}>
                    {permission.type} - {permission.description}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddPermissionClick}
                disabled={!selectedPermission}
                className="add-btn"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagement;
