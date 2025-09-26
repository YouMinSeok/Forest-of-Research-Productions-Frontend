// src/components/RightSidebar.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faBars,
  faChevronLeft,
  faChevronRight,
  faCalendarAlt,
  faComment,
  faComments,
  faPen
} from '@fortawesome/free-solid-svg-icons';
import './RightSidebar.css';
import ChatRoomList from './ChatRoomList';
import ChatModal from './ChatModal';


function RightSidebar() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mobileOpen, setMobileOpen] = useState(false);



  // 채팅 관련 상태
  const [showChatRoomList, setShowChatRoomList] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 채팅창 상태
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // 현재 사용자 정보 로드
  const loadCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  };

  // 글쓰기 버튼 클릭
  const handleWriteClick = () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    navigate('/write-post');
  };

  // 채팅하기 버튼 클릭
  const handleChatClick = () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }
    setShowChatRoomList(true);
  };

  // 채팅방 선택 핸들러
  const handleRoomSelect = (targetUser, roomId) => {
    setChatTarget(targetUser);
    setChatRoomId(roomId);
    setShowChatModal(true);
    setShowChatRoomList(false);
    setIsChatMinimized(false);
  };

  // 채팅창 닫기
  const closeChatModal = () => {
    setShowChatModal(false);
    setChatTarget(null);
    setChatRoomId(null);
  };

  // 채팅창 최소화
  const minimizeChatModal = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  // 모바일 메뉴를 열고 닫는 함수
  const toggleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };



  // 컴포넌트 마운트 시 사용자 정보 로드
  useEffect(() => {
    loadCurrentUser();
  }, []);



  // 달력 관련 계산
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // 샘플 이벤트
  const events = [
    { date: new Date(currentYear, currentMonth, 15), title: '논문 발표 마감일' },
    { date: new Date(currentYear, currentMonth, 22), title: '학술 세미나' },
  ];

  // 이벤트가 있는 날짜인지 확인
  const hasEvent = (day) => {
    return events.some(event =>
      event.date.getDate() === day &&
      event.date.getMonth() === currentMonth &&
      event.date.getFullYear() === currentYear
    );
  };

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // 날짜를 문자열로 변환
  const formatDate = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };



  // 달력 렌더링을 위한 배열 생성
  const createCalendarDays = () => {
    const days = [];

    // 이전 달의 마지막 날짜들
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        currentMonth: false,
        hasEvent: false
      });
    }

    // 현재 달의 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        currentMonth: true,
        hasEvent: hasEvent(i),
        isToday: i === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear()
      });
    }

    // 남은 칸 채우기 (다음 달의 날짜들)
    const remainingDays = 42 - days.length; // 6주 표시를 위해
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        currentMonth: false,
        hasEvent: false
      });
    }

    return days;
  };



  return (
    <>
      {/* 모바일 사이드바 오버레이 */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
      ></div>

      {/* 오른쪽 사이드바 */}
      <aside className={`right-sidebar ${mobileOpen ? 'mobile-open active' : ''}`}>
        {/* 글쓰기 & 채팅하기 버튼 */}
        <div className="right-sidebar-block">
          <button
            className="write-main-btn"
            onClick={handleWriteClick}
            disabled={!currentUser}
          >
            <FontAwesomeIcon icon={faPen} />
            <span>글쓰기</span>
          </button>
          <button
            className="chat-main-btn"
            onClick={handleChatClick}
            disabled={!currentUser}
          >
            <FontAwesomeIcon icon={faComments} />
            <span>채팅하기</span>
            {currentUser && (
              <div className="chat-indicator">
                <FontAwesomeIcon icon={faComment} />
              </div>
            )}
          </button>
        </div>



        {/* 학술 일정 (미니 캘린더) */}
        <div className="right-sidebar-block">
          <h2 className="right-sidebar-title">
            <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.5rem' }} />
            학술 일정
          </h2>
          <div className="mini-calendar">
            <div className="calendar-header">
              <button onClick={prevMonth} className="btn-sm btn-outline">
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <span>{formatDate(currentDate)}</span>
              <button onClick={nextMonth} className="btn-sm btn-outline">
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
            <div className="calendar-days">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="calendar-day-label">{day}</div>
              ))}

              {createCalendarDays().map((day, _index) => (
                <div
                  key={`${day.month}-${day.day}-${day.currentMonth}`}
                  className={`calendar-day ${!day.currentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''} ${day.hasEvent ? 'has-event' : ''}`}
                  title={day.hasEvent ? events.find(e => e.date.getDate() === day.day)?.title : ''}
                >
                  {day.day}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 모바일 토글 버튼 */}
      <button className="sidebar-toggle right" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={mobileOpen ? faTimes : faBars} />
      </button>

      {/* 채팅방 목록 모달 */}
      {showChatRoomList && (
        <ChatRoomList
          currentUser={currentUser}
          onRoomSelect={handleRoomSelect}
          onClose={() => setShowChatRoomList(false)}
        />
      )}

      {/* 채팅 모달 */}
      {showChatModal && chatTarget && chatRoomId && (
        <ChatModal
          targetUser={chatTarget}
          currentUser={currentUser}
          roomId={chatRoomId}
          onClose={closeChatModal}
          onMinimize={minimizeChatModal}
          isMinimized={isChatMinimized}
        />
      )}
    </>
  );
}

export default RightSidebar;
