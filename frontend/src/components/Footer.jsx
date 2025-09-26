import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebookF, faTwitter, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';
import logoImg from '../assets/logo.png';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-logo">
            <img src={logoImg} alt="연구의숲 로고" />
            <span className="footer-logo-text">연구의숲</span>
          </div>
          <div className="footer-info">
            <p>연구의숲은 연구자들을 위한 지식 공유 및 소통 플랫폼입니다.</p>
            <p>주소: 대전 서구 배재로 155-40</p>
            <p>연락처: 02-123-4567 | 이메일: forest@example.com</p>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-links">
            <h3>바로가기</h3>
            <ul>
              <li><Link to="/">홈</Link></li>
              <li><Link to="/result">연구성과</Link></li>
              <li><Link to="/cafe">연구카페</Link></li>
              <li><Link to="/ourstory">우리들이야기</Link></li>
              <li><Link to="/academic-schedule">학술 일정</Link></li>
            </ul>
          </div>

          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="페이스북">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="트위터">
              <FontAwesomeIcon icon={faTwitter} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="인스타그램">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="유튜브">
              <FontAwesomeIcon icon={faYoutube} />
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} 연구의숲. All rights reserved. |
            <Link to="/privacy"> 개인정보처리방침</Link> |
            <Link to="/terms"> 이용약관</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
