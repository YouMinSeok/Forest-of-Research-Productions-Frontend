import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import api from '../../services/api';



const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 통계 데이터 가져오기
      const statsResponse = await api.get('/api/admin/dashboard/stats');
      setStats(statsResponse.data);

      // 최근 활동 데이터 가져오기
      const activitiesResponse = await api.get('/api/admin/dashboard/recent-activities');
      setRecentActivities(activitiesResponse.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeAdmin = async () => {
    try {
      console.log('어드민 초기화 요청:', `/api/admin/init-admin`);

      const response = await fetch(`/api/admin/init-admin`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('응답 상태:', response.status);
      console.log('응답 헤더:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('성공 응답:', data);
        alert(`어드민 계정 초기화 완료!\n이메일: ${data.email}\n비밀번호: ${data.password}`);
      } else {
        const errorText = await response.text();
        console.error('실패 응답:', errorText);
        alert(`어드민 초기화 실패\n상태: ${response.status}\n오류: ${errorText}`);
      }
    } catch (error) {
      console.error('네트워크 오류:', error);
      alert(`어드민 초기화 중 오류가 발생했습니다\n오류: ${error.message}\nURL: /api/admin/init-admin`);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error">
          <h3>오류가 발생했습니다</h3>
          <p>{error}</p>
          <button onClick={initializeAdmin} className="init-admin-btn">
            어드민 계정 초기화
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>관리자 대시보드</h1>
        <div className="admin-actions">
          <button
            onClick={() => navigate('/admin/users')}
            className="admin-nav-btn"
          >
            사용자 관리
          </button>
          <button
            onClick={() => navigate('/admin/permissions')}
            className="admin-nav-btn"
          >
            권한 관리
          </button>
          <button
            onClick={() => navigate('/admin/system')}
            className="admin-nav-btn"
          >
            시스템 상태
          </button>
        </div>
      </div>

      {/* 통계 카드들 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon user-icon">👥</div>
          <div className="stat-content">
            <h3>전체 사용자</h3>
            <div className="stat-number">{stats?.total_users || 0}</div>
            <div className="stat-change">활성 사용자: {stats?.active_users || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon post-icon">📝</div>
          <div className="stat-content">
            <h3>전체 게시글</h3>
            <div className="stat-number">{stats?.total_posts || 0}</div>
            <div className="stat-change">이번 주 신규: {stats?.new_users_this_week || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon research-icon">🔬</div>
          <div className="stat-content">
            <h3>연구 자료</h3>
            <div className="stat-number">{stats?.total_research || 0}</div>
            <div className="stat-change">업로드됨</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon session-icon">💻</div>
          <div className="stat-content">
            <h3>활성 세션</h3>
            <div className="stat-number">{stats?.active_sessions || 0}</div>
            <div className="stat-change">현재 접속 중</div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="recent-activities">
        <h2>최근 활동</h2>
        <div className="activities-list">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity, index) => (
              <div key={activity.id || index} className="activity-item">
                <div className="activity-avatar">
                  {activity.user_name.charAt(0)}
                </div>
                <div className="activity-content">
                  <div className="activity-text">
                    <strong>{activity.user_name}</strong>님이 <span className="activity-action">{activity.action}</span>
                  </div>
                  <div className="activity-resource">{activity.resource}</div>
                  <div className="activity-time">
                    {new Date(activity.timestamp).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activities">최근 활동이 없습니다</div>
          )}
        </div>
      </div>

      {/* 시스템 상태 */}
      <div className="system-status">
        <h2>시스템 상태</h2>
        <div className="status-indicator">
          <div className={`status-dot ${stats?.system_health === 'healthy' ? 'healthy' : 'unhealthy'}`}></div>
          <span>시스템 {stats?.system_health === 'healthy' ? '정상' : '오류'}</span>
        </div>
        <div className="last-updated">
          마지막 업데이트: {stats?.last_updated ? new Date(stats.last_updated).toLocaleString('ko-KR') : 'N/A'}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
