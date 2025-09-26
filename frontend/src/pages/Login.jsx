import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import logoImg from '../assets/logo.png';
import api from '../services/api';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password
      });

      const data = response.data;
      alert("로그인 성공!");

      // 응답받은 토큰과 사용자 정보를 localStorage에 저장
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      navigate("/");
    } catch (error) {
      console.error("로그인 요청 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "로그인 실패";
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
