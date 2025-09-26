import React from 'react';
import {
  FaCrown,
  FaUserGraduate,
  FaUser,
  FaShieldAlt
} from 'react-icons/fa';
import './UserBadge.css';

const UserBadge = ({ role, isAdmin = false, size = 'sm' }) => {
  // 관리자가 최우선
  if (isAdmin) {
    return (
      <span className={`user-badge admin ${size}`}>
        <FaShieldAlt className="badge-icon" />
        <span className="badge-text">관리자</span>
      </span>
    );
  }

  // role에 따른 뱃지 설정
  const getBadgeConfig = (role) => {
    switch (role?.toLowerCase()) {
      case 'professor':
        return {
          icon: FaCrown,
          text: '교수',
          className: 'professor'
        };
      case 'student':
        return {
          icon: FaUserGraduate,
          text: '학생',
          className: 'student'
        };
      case 'guest':
        return {
          icon: FaUser,
          text: '게스트',
          className: 'guest'
        };
      default:
        return {
          icon: FaUser,
          text: '사용자',
          className: 'default'
        };
    }
  };

  const config = getBadgeConfig(role);
  const IconComponent = config.icon;

  return (
    <span className={`user-badge ${config.className} ${size}`}>
      <IconComponent className="badge-icon" />
      <span className="badge-text">{config.text}</span>
    </span>
  );
};

export default UserBadge;
