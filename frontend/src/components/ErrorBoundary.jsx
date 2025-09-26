import React from 'react';

/**
 * 연구실용 React 에러 바운더리
 * 모든 예상치 못한 오류를 안전하게 처리하여 전체 앱이 중단되지 않도록 합니다.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(_error) {
    // 에러가 발생했을 때 상태를 업데이트
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 에러 정보를 상태에 저장
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // 에러 로깅 (연구실용 모니터링)
    console.error('🚨 React Error Boundary 에러 감지:', {
      errorId,
      error: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // 실제 운영환경에서는 에러 리포팅 서비스로 전송
    this.reportError(error, errorInfo, errorId);
  }

  reportError = async (error, errorInfo, errorId) => {
    try {
      // 에러 정보를 백엔드로 전송 (선택사항)
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId,
          message: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (reportError) {
      console.error('에러 리포팅 실패:', reportError);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            border: '1px solid #e1e5e9'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔧</div>

            <h2 style={{
              color: '#d73a49',
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              일시적인 오류가 발생했습니다
            </h2>

            <p style={{
              color: '#586069',
              marginBottom: '24px',
              lineHeight: '1.5',
              fontSize: '16px'
            }}>
              연구실 게시판 시스템에서 예상치 못한 문제가 발생했습니다.<br />
              잠시 후 다시 시도해 주세요.
            </p>

            {this.state.errorId && (
              <div style={{
                backgroundColor: '#f6f8fa',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px',
                color: '#586069'
              }}>
                <strong>에러 ID:</strong> {this.state.errorId}
                <br />
                <small>문제가 지속되면 관리자에게 이 ID를 전달해 주세요.</small>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#0366d6',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#0256cc'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#0366d6'}
              >
                다시 시도
              </button>

              <button
                onClick={this.handleRefresh}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
              >
                페이지 새로고침
              </button>
            </div>

            {/* 개발 환경에서만 상세 에러 정보 표시 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '20px', textAlign: 'left' }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#d73a49',
                  fontWeight: '500',
                  marginBottom: '10px'
                }}>
                  개발자 정보 (클릭하여 표시)
                </summary>
                <div style={{
                  backgroundColor: '#f6f8fa',
                  padding: '15px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  color: '#24292e',
                  overflow: 'auto',
                  maxHeight: '200px',
                  border: '1px solid #e1e5e9'
                }}>
                  <strong>에러:</strong> {this.state.error.toString()}
                  <br /><br />
                  <strong>스택 트레이스:</strong>
                  <pre style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
                    {this.state.error.stack}
                  </pre>
                  <strong>컴포넌트 스택:</strong>
                  <pre style={{ margin: '8px 0', whiteSpace: 'pre-wrap' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
