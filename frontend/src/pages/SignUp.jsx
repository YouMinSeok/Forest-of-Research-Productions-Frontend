import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './SignUp.css';
import api from '../services/api';

function SignUp() {
  const navigate = useNavigate();

  // 통합된 회원가입 필드
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentNumber: '',
    role: 'student' // 기본값은 학생으로 설정
  });

  const [errors, setErrors] = useState({});

  // 중복검사 상태
  const [checkStatus, setCheckStatus] = useState({
    email: null,
    name: null,
    studentNumber: null
  });

  // 정규식 패턴
  const patterns = {
    name: /^[A-Za-z가-힣\s]{2,}$/,
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  };

  // 폼 필드 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 변경 시 해당 필드의 오류 초기화
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // 역할 변경 핸들러
  const handleRoleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      role: e.target.value
    }));
  };

  // 입력 필드 유효성 검사
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return '이름을 입력해주세요.';
        if (!patterns.name.test(value)) return '이름은 2자 이상의 알파벳, 한글, 공백만 허용됩니다.';
        return null;
      case 'studentNumber':
        if (formData.role === 'student' && !value.trim()) return '학번을 입력해주세요.';
        return null;
      case 'email':
        if (!value.trim()) return '이메일을 입력해주세요.';
        if (!patterns.email.test(value)) return '유효한 이메일 주소를 입력해주세요.';
        return null;
      case 'password':
        if (!value.trim()) return '비밀번호를 입력해주세요.';
        if (!patterns.password.test(value)) return '비밀번호는 대문자, 소문자, 숫자, 특수문자를 포함한 8자 이상이어야 합니다.';
        return null;
      case 'confirmPassword':
        if (!value.trim()) return '비밀번호를 다시 입력해주세요.';
        if (value !== formData.password) return '비밀번호가 일치하지 않습니다.';
        return null;
      default:
        return null;
    }
  };

  // 전체 폼 유효성 검사
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // 각 필드 유효성 검사
    Object.keys(formData).forEach(field => {
      if (field === 'studentNumber' && formData.role !== 'student') {
        return; // 학생이 아니면 학번 검사 생략
      }
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // 중복검사 함수
  const checkDuplicate = async (field, value) => {
    if (!value.trim()) {
      setCheckStatus(prev => ({ ...prev, [field]: null }));
      return;
    }

    try {
      await api.post('/api/auth/check-duplicate', {
        field: field,
        value: value
      });

      setCheckStatus(prev => ({
        ...prev,
        [field]: { isDuplicate: false, message: '사용 가능합니다.' }
      }));
    } catch (error) {
      if (error.response?.status === 400) {
        setCheckStatus(prev => ({
          ...prev,
          [field]: { isDuplicate: true, message: error.response?.data?.error || '이미 사용중입니다.' }
        }));
      }
    }
  };

  // 입력값 변경 시 중복검사 (디바운싱)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email) {
        checkDuplicate('email', formData.email);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        checkDuplicate('name', formData.name);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.name]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.studentNumber && formData.role === 'student') {
        checkDuplicate('student_number', formData.studentNumber);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.studentNumber, formData.role]);

  // 백엔드 오류 메시지 커스텀 변환
  const formatBackendError = (detail) => {
    if (typeof detail !== "string") {
      return "회원가입에 실패했습니다.";
    }
    if (detail.includes("이미 사용중인 이메일입니다.")) {
      return "이미 사용 중인 이메일입니다. 다른 이메일을 사용해주세요.";
    }
    if (detail.includes("이미 사용중인 이름입니다.")) {
      return "이미 사용 중인 이름입니다. 다른 이름을 사용해주세요.";
    }
    if (detail.includes("이미 사용중인 학번입니다.")) {
      return "이미 사용 중인 학번입니다. 다른 학번을 입력해주세요.";
    }
    if (detail.includes("이름은 알파벳, 한글, 공백만 허용됩니다.")) {
      return "이름 형식이 올바르지 않습니다. (알파벳, 한글, 공백만 허용 2자 이상)";
    }
    if (detail.includes("비밀번호에 최소 하나의 대문자가 필요합니다.")) {
      return "비밀번호 형식이 올바르지 않습니다. (대문자 최소 1개)";
    }
    return "회원가입에 실패했습니다.";
  };

  // 회원가입 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 폼 유효성 검사
    if (!validateForm()) {
      return;
    }

    // 중복검사 결과 확인
    if (checkStatus.email?.isDuplicate) {
      alert('이메일이 중복되었습니다. 다른 이메일을 사용해주세요.');
      return;
    }
    if (checkStatus.name?.isDuplicate) {
      alert('이름이 중복되었습니다. 다른 이름을 사용해주세요.');
      return;
    }
    if (formData.role === 'student' && checkStatus.studentNumber?.isDuplicate) {
      alert('학번이 중복되었습니다. 다른 학번을 사용해주세요.');
      return;
    }

    // API 요청 데이터 구성
    // eslint-disable-next-line no-unused-vars
    const { confirmPassword: _confirmPassword, ...apiData } = formData;
    if (formData.role !== 'student') {
      delete apiData.studentNumber;
    } else {
      // 백엔드 호환성을 위해 필드명 변경
      apiData.student_number = apiData.studentNumber;
      delete apiData.studentNumber;
    }

    try {
      const response = await api.post('/api/auth/signup', apiData);
      const data = response.data;

      alert(data.message || "회원가입이 완료되었습니다. 이메일 인증을 진행해주세요.");
      // 인증 단계로 이동
      navigate('/signup/verify', { state: { role: formData.role, email: formData.email } });
    } catch (error) {
      console.error("회원가입 요청 중 오류 발생:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || "회원가입에 실패했습니다.";
      const customMsg = formatBackendError(errorMessage);
      alert(customMsg);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1 className="signup-title">연구의숲 회원가입</h1>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="이름"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
            {checkStatus.name && (
              <span className={`check-text ${checkStatus.name.isDuplicate ? 'error' : 'success'}`}>
                {checkStatus.name.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
            {checkStatus.email && (
              <span className={`check-text ${checkStatus.email.isDuplicate ? 'error' : 'success'}`}>
                {checkStatus.email.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="8자 이상, 영문 대/소문자, 숫자, 특수문자 포함"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="비밀번호 다시 입력"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group">
            <label>회원 구분</label>
            <div className="role-selector">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={handleRoleChange}
                />
                <span>학생</span>
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="professor"
                  checked={formData.role === 'professor'}
                  onChange={handleRoleChange}
                />
                <span>교수</span>
              </label>
            </div>
          </div>

          {formData.role === 'student' && (
            <div className="form-group">
              <label htmlFor="studentNumber">학번</label>
              <input
                id="studentNumber"
                name="studentNumber"
                type="text"
                placeholder="학번"
                value={formData.studentNumber}
                onChange={handleChange}
                className={errors.studentNumber ? 'error' : ''}
              />
              {errors.studentNumber && <span className="error-text">{errors.studentNumber}</span>}
              {checkStatus.studentNumber && (
                <span className={`check-text ${checkStatus.studentNumber.isDuplicate ? 'error' : 'success'}`}>
                  {checkStatus.studentNumber.message}
                </span>
              )}
            </div>
          )}

          <button type="submit" className="signup-btn">회원가입</button>
        </form>

        <div className="signup-extra">
          <span>이미 계정이 있으신가요?</span>
          <Link to="/login" className="signup-link">로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
