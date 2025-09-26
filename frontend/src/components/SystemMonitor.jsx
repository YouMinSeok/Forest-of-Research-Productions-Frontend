import React, { useState, useEffect, useCallback } from 'react';
import { useMemoryMonitor } from '../utils/performance';

/**
 * 연구실용 실시간 시스템 모니터링 컴포넌트
 * 백엔드와 프론트엔드의 상태를 실시간으로 모니터링
 */
const SystemMonitor = ({ isVisible = false, onToggle }) => {
  const [systemStats, setSystemStats] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 프론트엔드 메모리 모니터링
  const memoryInfo = useMemoryMonitor();

  // 시스템 상태 조회
  const fetchSystemStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 백엔드 헬스 체크
      const healthResponse = await fetch('/api/health');
      const healthData = await healthResponse.json();
      setBackendHealth(healthData);

      // 상세 시스템 통계 (관리자용)
      const statsResponse = await fetch('/api/system/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setSystemStats(statsData);
      }

    } catch (err) {
      console.error('시스템 모니터링 데이터 조회 실패:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 자동 새로고침
  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 5000); // 5초마다

    return () => clearInterval(interval);
  }, [isVisible, autoRefresh, fetchSystemStats]);

  // 초기 로드
  useEffect(() => {
    if (isVisible) {
      fetchSystemStats();
    }
  }, [isVisible, fetchSystemStats]);

  // 상태 색상 결정
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#28a745';
      case 'warning': return '#ffc107';
      case 'unhealthy': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // 메모리 사용률 색상
  const getMemoryColor = (percent) => {
    if (percent < 70) return '#28a745';
    if (percent < 85) return '#ffc107';
    return '#dc3545';
  };

  // CPU 사용률 색상
  const getCpuColor = (percent) => {
    if (percent < 60) return '#28a745';
    if (percent < 80) return '#ffc107';
    return '#dc3545';
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '400px',
      maxHeight: '80vh',
      backgroundColor: 'white',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e1e5e9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          🔍 시스템 모니터링
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            자동새로고침
          </label>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div style={{
        padding: '16px',
        maxHeight: '70vh',
        overflowY: 'auto'
      }}>
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            오류: {error}
          </div>
        )}

        {/* 백엔드 상태 */}
        {backendHealth && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🖥️ 백엔드 상태
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(backendHealth.status)
              }}></span>
            </h4>

            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>상태:</strong> {backendHealth.status}
              </div>

              {backendHealth.system && (
                <>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>메모리:</strong>{' '}
                    <span style={{ color: getMemoryColor(backendHealth.system.memory_usage_percent) }}>
                      {backendHealth.system.memory_usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>CPU:</strong>{' '}
                    <span style={{ color: getCpuColor(backendHealth.system.cpu_usage_percent) }}>
                      {backendHealth.system.cpu_usage_percent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>디스크:</strong>{' '}
                    <span style={{ color: getMemoryColor(backendHealth.system.disk_usage_percent) }}>
                      {backendHealth.system.disk_usage_percent.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}

              {backendHealth.database && (
                <div style={{ marginTop: '8px' }}>
                  <strong>데이터베이스:</strong>
                  <div style={{ marginLeft: '8px' }}>
                    <div>MongoDB: {backendHealth.database.mongodb.status}</div>
                    <div>SQLite: {backendHealth.database.sqlite.status}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 프론트엔드 상태 */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            💻 프론트엔드 상태
          </h4>

          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            {memoryInfo ? (
              <>
                <div style={{ marginBottom: '4px' }}>
                  <strong>JS 메모리 사용:</strong> {memoryInfo.used}MB / {memoryInfo.total}MB
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>메모리 한계:</strong> {memoryInfo.limit}MB
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>사용률:</strong>{' '}
                  <span style={{
                    color: getMemoryColor((parseFloat(memoryInfo.used) / parseFloat(memoryInfo.total)) * 100)
                  }}>
                    {((parseFloat(memoryInfo.used) / parseFloat(memoryInfo.total)) * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <div>메모리 정보 사용 불가</div>
            )}

            <div style={{ marginTop: '8px' }}>
              <div><strong>User Agent:</strong> {navigator.userAgent.split(' ')[0]}</div>
              <div><strong>온라인 상태:</strong> {navigator.onLine ? '온라인' : '오프라인'}</div>
              <div><strong>연결 타입:</strong> {navigator.connection?.effectiveType || '알 수 없음'}</div>
            </div>
          </div>
        </div>

        {/* 데이터베이스 통계 */}
        {systemStats?.database && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              📊 데이터베이스 통계
            </h4>

            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              {systemStats.database.mongodb && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>MongoDB:</strong>
                  <div style={{ marginLeft: '8px' }}>
                    <div>컬렉션: {systemStats.database.mongodb.collections}</div>
                    <div>문서: {systemStats.database.mongodb.objects?.toLocaleString()}</div>
                    <div>데이터 크기: {(systemStats.database.mongodb.dataSize / 1024 / 1024).toFixed(1)}MB</div>
                    <div>인덱스 크기: {(systemStats.database.mongodb.indexSize / 1024 / 1024).toFixed(1)}MB</div>
                  </div>
                </div>
              )}

              {systemStats.database.collections && (
                <div>
                  <strong>컬렉션별 문서 수:</strong>
                  <div style={{ marginLeft: '8px' }}>
                    {Object.entries(systemStats.database.collections).map(([name, count]) => (
                      <div key={name}>{name}: {count.toLocaleString()}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 시스템 정보 */}
        {systemStats?.system && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              ⚙️ 시스템 정보
            </h4>

            <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>CPU 코어:</strong> {systemStats.system.cpu.count}개
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>전체 메모리:</strong> {(systemStats.system.memory.total / 1024 / 1024 / 1024).toFixed(1)}GB
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>사용 가능:</strong> {(systemStats.system.memory.available / 1024 / 1024 / 1024).toFixed(1)}GB
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>업타임:</strong> {Math.floor(systemStats.system.uptime / 86400)}일 {Math.floor((systemStats.system.uptime % 86400) / 3600)}시간
              </div>
            </div>
          </div>
        )}

        {/* 새로고침 버튼 */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={fetchSystemStats}
            disabled={isLoading}
            style={{
              backgroundColor: '#0366d6',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? '⏳ 로딩중...' : '🔄 새로고침'}
          </button>
        </div>

        {/* 타임스탬프 */}
        {backendHealth && (
          <div style={{
            fontSize: '10px',
            color: '#6c757d',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            마지막 업데이트: {new Date(backendHealth.timestamp * 1000).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemMonitor;
