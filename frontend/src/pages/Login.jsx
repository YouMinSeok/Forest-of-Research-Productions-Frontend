// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import logoImg from '../assets/logo.png';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// ⬇️ 추가: 로그인 상태 저장 + 자동 리프레시 스케줄러
import { saveLoginState, scheduleAutoRefresh } from '../services/auth';

function Login() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const data = response.data;
      alert('로그인 성공!');

      // 백엔드가 refresh_token을 함께 주면 같이 저장됨
      // (없어도 saveLoginState가 알아서 처리)
      saveLoginState(data.access_token, data.user, data.refresh_token);

      // 자동 리프레시 예약(백그라운드 루프)
      scheduleAutoRefresh();

      // AuthContext에 사용자 정보 업데이트 알림
      await loadUser();

      // 커스텀 이벤트 발생으로 AuthContext에 알림
      window.dispatchEvent(new Event('authChange'));

      navigate('/');
    } catch (error) {
      console.error('로그인 요청 중 오류 발생:', error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        '로그인 실패';
      alert(errorMessage);
    }
  };

  return (
    <div className="login-page-container">
      <div className="block-container">
        <div className="login-box">
          <div className="login-box-left">
            <img src={logoImg} alt="연구의숲 로고" className="login-box-logo" />
            <p className="login-box-subtext">
              "사소한 생각들이 모여<br />무성한 연구의 숲을 만든다"
            </p>
          </div>
          <div className="login-box-right">
            <h2 className="login-title">로그인</h2>
            <div className="login-form-wrapper">
              <form onSubmit={handleSubmit} className="login-form">
                <div className="login-field">
                  <label>이메일</label>
                  <input
                    type="email"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="login-field">
                  <label>비밀번호</label>
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <button type="submit" className="login-btn">로그인</button>
              </form>
              <div className="login-links">
                <div className="login-find">
                  <Link to="/find-username">아이디 찾기</Link> | <Link to="/find-password">비밀번호 찾기</Link>
                </div>
                <div className="login-extra">
                  <span>아직 계정이 없으신가요?</span>
                  <Link to="/signup" className="signup-link">회원가입</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
