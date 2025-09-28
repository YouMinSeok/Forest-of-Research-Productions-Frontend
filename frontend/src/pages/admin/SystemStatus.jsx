import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './SystemStatus.css';

// api.js를 사용하여 일관된 인증 방식 적용

const SystemStatus = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    fetchSystemHealth();

    // 30초마다 자동 새로고침
    const interval = setInterval(fetchSystemHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/system/health');

      setSystemHealth(response.data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || '시스템 상태를 가져올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '#27ae60';
      case 'warning':
        return '#f39c12';
      case 'unhealthy':
      case 'disconnected':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'unhealthy':
      case 'disconnected':
        return '❌';
      default:
        return '❓';
    }
  };

  const parseUsage = (usage) => {
    if (typeof usage === 'string') {
      return parseInt(usage.replace('%', ''));
    }
    return usage;
  };

  const getUsageColor = (usage) => {
    const numUsage = parseUsage(usage);
    if (numUsage >= 90) return '#e74c3c';
    if (numUsage >= 70) return '#f39c12';
    return '#27ae60';
  };

  if (loading && !systemHealth) {
    return (
      <div className="system-status">
        <div className="loading">시스템 상태를 확인하는 중...</div>
      </div>
    );
  }

  return (
    <div className="system-status">
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="back-btn">
          ← 대시보드로 돌아가기
        </button>
        <h1>시스템 상태</h1>
        <div className="refresh-info">
          <button onClick={fetchSystemHealth} className="refresh-btn" disabled={loading}>
            {loading ? '새로고침 중...' : '새로고침'}
          </button>
          <span className="last-refresh">
            마지막 업데이트: {lastRefresh.toLocaleTimeString('ko-KR')}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchSystemHealth}>다시 시도</button>
        </div>
      )}

      {systemHealth && (
        <>
          {/* 전체 시스템 상태 */}
          <div className="status-overview">
            <div className="status-card main-status">
              <div className="status-header">
                <h2>전체 시스템 상태</h2>
                <div
                  className="status-indicator"
                  style={{ color: getStatusColor(systemHealth.status) }}
                >
                  {getStatusIcon(systemHealth.status)} {systemHealth.status}
                </div>
              </div>
              <div className="uptime-info">
                <div className="uptime-item">
                  <span className="uptime-label">업타임</span>
                  <span className="uptime-value">{systemHealth.uptime || 'N/A'}</span>
                </div>
                <div className="uptime-item">
                  <span className="uptime-label">마지막 백업</span>
                  <span className="uptime-value">
                    {systemHealth.last_backup
                      ? new Date(systemHealth.last_backup).toLocaleString('ko-KR')
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 개별 서비스 상태 */}
          <div className="services-grid">
            <div className="service-card">
              <div className="service-header">
                <h3>데이터베이스</h3>
                <div
                  className="service-status"
                  style={{ color: getStatusColor(systemHealth.database) }}
                >
                  {getStatusIcon(systemHealth.database)} {systemHealth.database}
                </div>
              </div>
              <div className="service-details">
                <p>MongoDB 연결 상태</p>
                <div className="status-dot-container">
                  <div
                    className={`status-dot ${systemHealth.database === 'connected' ? 'connected' : 'disconnected'}`}
                  ></div>
                  <span>
                    {systemHealth.database === 'connected' ? '정상 연결됨' : '연결 끊어짐'}
                  </span>
                </div>
              </div>
            </div>

            <div className="service-card">
              <div className="service-header">
                <h3>메모리 사용량</h3>
                <div className="usage-percentage">
                  {systemHealth.memory_usage}
                </div>
              </div>
              <div className="service-details">
                <div className="usage-bar">
                  <div
                    className="usage-fill"
                    style={{
                      width: systemHealth.memory_usage,
                      backgroundColor: getUsageColor(systemHealth.memory_usage)
                    }}
                  ></div>
                </div>
                <p>RAM 사용량</p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-header">
                <h3>CPU 사용량</h3>
                <div className="usage-percentage">
                  {systemHealth.cpu_usage}
                </div>
              </div>
              <div className="service-details">
                <div className="usage-bar">
                  <div
                    className="usage-fill"
                    style={{
                      width: systemHealth.cpu_usage,
                      backgroundColor: getUsageColor(systemHealth.cpu_usage)
                    }}
                  ></div>
                </div>
                <p>프로세서 사용량</p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-header">
                <h3>디스크 사용량</h3>
                <div className="usage-percentage">
                  {systemHealth.disk_usage}
                </div>
              </div>
              <div className="service-details">
                <div className="usage-bar">
                  <div
                    className="usage-fill"
                    style={{
                      width: systemHealth.disk_usage,
                      backgroundColor: getUsageColor(systemHealth.disk_usage)
                    }}
                  ></div>
                </div>
                <p>저장공간 사용량</p>
              </div>
            </div>
          </div>

          {/* 시스템 정보 */}
          <div className="system-info">
            <h2>시스템 정보</h2>
            <div className="info-grid">
              {systemHealth.system_info && (
                <>
                  <div className="info-item">
                    <span className="info-label">운영체제</span>
                    <span className="info-value">
                      {systemHealth.system_info.platform} {systemHealth.system_info.platform_release}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">아키텍처</span>
                    <span className="info-value">{systemHealth.system_info.architecture}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">프로세서</span>
                    <span className="info-value">{systemHealth.system_info.processor}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">총 메모리</span>
                    <span className="info-value">{systemHealth.system_info.ram_total_gb} GB</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">총 디스크</span>
                    <span className="info-value">{systemHealth.system_info.disk_total_gb} GB</span>
                  </div>
                </>
              )}
              <div className="info-item">
                <span className="info-label">데이터베이스</span>
                <span className="info-value">MongoDB Atlas</span>
              </div>
              <div className="info-item">
                <span className="info-label">웹서버</span>
                <span className="info-value">FastAPI + Uvicorn</span>
              </div>
              <div className="info-item">
                <span className="info-label">자동 새로고침</span>
                <span className="info-value">30초마다</span>
              </div>
            </div>
          </div>

          {/* 실시간 상태 정보 */}
          <div className="status-history">
            <h2>실시간 상태 정보</h2>
            <div className="history-list">
              <div className="history-item">
                <div className="history-time">
                  {systemHealth.timestamp ? new Date(systemHealth.timestamp).toLocaleString('ko-KR') : new Date().toLocaleString('ko-KR')}
                </div>
                <div className="history-event">
                  <span className="event-icon">
                    {systemHealth.status === 'healthy' ? '✅' : systemHealth.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                  시스템 상태: {systemHealth.status === 'healthy' ? '정상' : systemHealth.status === 'warning' ? '주의' : '오류'}
                </div>
              </div>
              <div className="history-item">
                <div className="history-time">
                  {lastRefresh.toLocaleString('ko-KR')}
                </div>
                <div className="history-event">
                  <span className="event-icon">🔄</span>
                  마지막 상태 점검 완료
                </div>
              </div>
              <div className="history-item">
                <div className="history-time">
                  {systemHealth.last_backup ? new Date(systemHealth.last_backup).toLocaleString('ko-KR') : 'N/A'}
                </div>
                <div className="history-event">
                  <span className="event-icon">💾</span>
                  마지막 백업 시간
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemStatus;
