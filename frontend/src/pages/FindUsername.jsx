import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './FindUsername.css';
import logoImg from '../assets/logo.png';
import api from '../services/api';

function FindUsername() {
  const [formData, setFormData] = useState({
    name: '',
    student_number: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/auth/find-username', formData);
      setResult(response.data);
    } catch (error) {
      console.error("아이디 찾기 요청 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "아이디 찾기에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="find-username-page-container">
      <div className="block-container">
        <div className="find-username-box">
          <div className="find-username-box-left">
            <img src={logoImg} alt="연구의숲 로고" className="find-username-box-logo" />
            <p className="find-username-box-subtext">
              "사소한 생각들이 모여<br />무성한 연구의 숲을 만든다"
            </p>
          </div>
          <div className="find-username-box-right">
            <h2 className="find-username-title">아이디 찾기</h2>

            {!result ? (
              <form onSubmit={handleSubmit} className="find-username-form">
                <div className="input-group">
                  <label htmlFor="name">이름</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="이름을 입력하세요"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="student_number">학번</label>
                  <input
                    type="text"
                    id="student_number"
                    name="student_number"
                    value={formData.student_number}
                    onChange={handleChange}
                    placeholder="학번을 입력하세요"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="find-username-btn"
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '아이디 찾기'}
                </button>
              </form>
            ) : (
              <div className="find-username-result">
                <div className="result-icon">✅</div>
                <p className="result-message">{result.message}</p>
                <div className="result-actions">
                  <Link to="/login" className="login-link-btn">
                    로그인하기
                  </Link>
                  <Link to="/find-password" className="find-password-link">
                    비밀번호 찾기
                  </Link>
                </div>
              </div>
            )}

            <div className="find-username-links">
              <Link to="/login" className="back-to-login">
                로그인으로 돌아가기
              </Link>
              {!result && (
                <Link to="/find-password" className="find-password-link">
                  비밀번호 찾기
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindUsername;
