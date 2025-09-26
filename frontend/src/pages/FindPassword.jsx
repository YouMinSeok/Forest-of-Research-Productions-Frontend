import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './FindPassword.css';
import logoImg from '../assets/logo.png';
import api from '../services/api';

function FindPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: 정보입력, 2: 인증번호, 3: 새비밀번호
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    student_number: '',
    code: '',
    new_password: '',
    confirm_password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 1단계: 회원정보 확인 및 인증번호 발송
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/auth/request-password-reset', {
        name: formData.name,
        email: formData.email,
        student_number: formData.student_number
      });

      alert(response.data.message);
      setStep(2);
    } catch (error) {
      console.error("비밀번호 찾기 요청 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "요청에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 2단계: 인증번호 확인
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/auth/verify-reset-code', {
        email: formData.email,
        code: formData.code
      });

      alert(response.data.message);
      setStep(3);
    } catch (error) {
      console.error("인증번호 확인 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "인증번호 확인에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 3단계: 새 비밀번호 설정
  const handleStep3Submit = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.new_password.length < 6) {
      alert("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/reset-password', {
        email: formData.email,
        code: formData.code,
        new_password: formData.new_password
      });

      alert(response.data.message);
      navigate('/login');
    } catch (error) {
      console.error("비밀번호 재설정 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "비밀번호 재설정에 실패했습니다.";
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleStep1Submit} className="find-password-form">
      <div className="step-indicator">
        <div className="step active">1</div>
        <div className="step-line"></div>
        <div className="step">2</div>
        <div className="step-line"></div>
        <div className="step">3</div>
      </div>

      <h3 className="step-title">회원정보 확인</h3>
      <p className="step-description">가입시 입력한 정보를 정확히 입력해주세요.</p>

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
        <label htmlFor="email">이메일</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="이메일을 입력하세요"
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
        className="find-password-btn"
        disabled={loading}
      >
        {loading ? '처리 중...' : '인증번호 발송'}
      </button>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleStep2Submit} className="find-password-form">
      <div className="step-indicator">
        <div className="step completed">✓</div>
        <div className="step-line completed"></div>
        <div className="step active">2</div>
        <div className="step-line"></div>
        <div className="step">3</div>
      </div>

      <h3 className="step-title">인증번호 확인</h3>
      <p className="step-description">
        {formData.email}로 발송된 인증번호를 입력해주세요.
      </p>

      <div className="input-group">
        <label htmlFor="code">인증번호</label>
        <input
          type="text"
          id="code"
          name="code"
          value={formData.code}
          onChange={handleChange}
          placeholder="인증번호 6자리를 입력하세요"
          maxLength="6"
          required
        />
      </div>

      <div className="button-group">
        <button
          type="button"
          className="find-password-btn secondary"
          onClick={() => setStep(1)}
        >
          이전
        </button>
        <button
          type="submit"
          className="find-password-btn"
          disabled={loading}
        >
          {loading ? '확인 중...' : '인증번호 확인'}
        </button>
      </div>
    </form>
  );

  const renderStep3 = () => (
    <form onSubmit={handleStep3Submit} className="find-password-form">
      <div className="step-indicator">
        <div className="step completed">✓</div>
        <div className="step-line completed"></div>
        <div className="step completed">✓</div>
        <div className="step-line completed"></div>
        <div className="step active">3</div>
      </div>

      <h3 className="step-title">새 비밀번호 설정</h3>
      <p className="step-description">새로운 비밀번호를 설정해주세요.</p>

      <div className="input-group">
        <label htmlFor="new_password">새 비밀번호</label>
        <input
          type="password"
          id="new_password"
          name="new_password"
          value={formData.new_password}
          onChange={handleChange}
          placeholder="새 비밀번호를 입력하세요"
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="confirm_password">비밀번호 확인</label>
        <input
          type="password"
          id="confirm_password"
          name="confirm_password"
          value={formData.confirm_password}
          onChange={handleChange}
          placeholder="비밀번호를 다시 입력하세요"
          required
        />
      </div>

      <div className="button-group">
        <button
          type="button"
          className="find-password-btn secondary"
          onClick={() => setStep(2)}
        >
          이전
        </button>
        <button
          type="submit"
          className="find-password-btn"
          disabled={loading}
        >
          {loading ? '처리 중...' : '비밀번호 변경'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="find-password-page-container">
      <div className="block-container">
        <div className="find-password-box">
          <div className="find-password-box-left">
            <img src={logoImg} alt="연구의숲 로고" className="find-password-box-logo" />
            <p className="find-password-box-subtext">
              "사소한 생각들이 모여<br />무성한 연구의 숲을 만든다"
            </p>
          </div>
          <div className="find-password-box-right">
            <h2 className="find-password-title">비밀번호 찾기</h2>

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="find-password-links">
              <Link to="/login" className="back-to-login">
                로그인으로 돌아가기
              </Link>
              <Link to="/find-username" className="find-username-link">
                아이디 찾기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FindPassword;
