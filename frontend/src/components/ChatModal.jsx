import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { SkeletonChatMessage } from './Skeleton';
import { useOptimizedSkeleton } from '../utils/skeletonHooks';
import './ChatModal.css';

function ChatModal({ targetUser, roomId, onClose, onMinimize, isMinimized }) {
  const { user: currentUser } = useAuth(); // AuthContext 사용

  // 첫 번째 렌더링만 로그 출력
  const isFirstRender = useRef(true);
  if (isFirstRender.current) {
    console.log('🎯 ChatModal 컴포넌트 첫 렌더링:', { targetUser, currentUser, roomId, isMinimized });
    isFirstRender.current = false;
  }

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [websocket, setWebsocket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({
    x: Math.max(window.innerWidth - 420, 50),
    y: Math.min(50, Math.max(50, window.innerHeight - 450))
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 스크롤 관련 상태 추가
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // 최적화된 skeleton 훅
  const chatSkeleton = useOptimizedSkeleton(loading, Array(5).fill(null), {
    smartOptions: { minDisplayTime: 300, fadeInDelay: 100 },
    progressiveOptions: { staggerDelay: 120, enableStagger: true },
    transitionOptions: { duration: 200, enableSlide: true }
  });

  // 스크롤 위치 확인 함수
  const checkScrollPosition = () => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const threshold = 50; // 50px 이내면 맨 아래로 간주
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    setIsAtBottom(isNearBottom);

    // 맨 아래로 스크롤했을 때 새 메시지 카운트 리셋
    if (isNearBottom) {
      setNewMessageCount(0);
    }
  };

  // 스마트 스크롤 함수
  const scrollToBottomIfNeeded = (force = false) => {
    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setNewMessageCount(0);
    }
  };

  useEffect(() => {
    if (roomId && currentUser) {
      console.log('🔌 WebSocket 및 메시지 로딩 시작:', { roomId, currentUser });
      initializeWebSocket();
      loadMessages();
    }

    // 모달이 열릴 때 body 스크롤 방지 (옵션)
    // document.body.style.overflow = 'hidden';

    return () => {
      if (websocket) {
        console.log('🔌 WebSocket 연결 종료 중...');
        websocket.close();
      }
      // body 스크롤 복원
      // document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentUser]);

  // 메시지 변경 시 스마트 스크롤 적용
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = lastMessageCountRef.current;

    // 새 메시지가 추가된 경우
    if (currentMessageCount > previousMessageCount) {
      const newMessagesAdded = currentMessageCount - previousMessageCount;

      // 맨 아래에 있을 때만 자동 스크롤 (내 메시지든 상대방 메시지든 상관없이)
      if (isAtBottom) {
        scrollToBottomIfNeeded(true);
      } else {
        // 위로 스크롤한 상태에서 새 메시지가 오면 카운트 증가
        setNewMessageCount(prev => prev + newMessagesAdded);
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [messages, currentUser.id, isAtBottom]);

  const initializeWebSocket = () => {
    const hostIp = process.env.REACT_APP_HOST_IP;

    if (!hostIp) {
      throw new Error('REACT_APP_HOST_IP 환경변수가 설정되지 않았습니다. .env 파일에서 IP를 설정해주세요.');
    }

    // HTTPS 환경에서는 WSS 사용, HTTP 환경에서는 WS 사용
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const backendUrl = `https://${hostIp}`;
    const wsUrl = `${protocol}://${hostIp}`;

    console.log('🌐 Backend URL:', backendUrl);
    console.log('🌐 WebSocket URL:', wsUrl);

    const token = localStorage.getItem('access_token');
    const fullWsUrl = `${wsUrl}/ws/chat/${roomId}?token=${token}`;

    console.log('🔌 WebSocket 연결 시도:', fullWsUrl);

    const ws = new WebSocket(fullWsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket 연결 성공');
      setError(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 WebSocket 메시지 수신:', data);

      switch (data.type) {
        case 'user_joined':
          console.log('👤 사용자 채팅방 참가:', data.user_name);
          break;

        case 'new_message':
          setMessages(prev => [...prev, data]);
          break;

        case 'user_typing':
          if (data.user_id !== currentUser.id) {
            setOtherUserTyping(data.typing);
            if (data.typing) {
              setTimeout(() => setOtherUserTyping(false), 3000);
            }
          }
          break;

        case 'user_left':
          console.log('👋 사용자 채팅방 나감:', data.user_name);
          break;

        default:
          console.log('❓ 알 수 없는 메시지 타입:', data.type);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket 에러:', error);
      setError('채팅 연결에 문제가 발생했습니다.');
    };

    ws.onclose = (event) => {
      console.log('🔌 WebSocket 연결 종료:', event.code, event.reason);
      if (event.code !== 1000) {
        setError('채팅 연결이 끊어졌습니다.');
      }
    };

    setWebsocket(ws);
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log('📥 메시지 로딩 시도:', `/api/chat/room/${roomId}/messages`);

      // api.js의 통합 클라이언트 사용
      const response = await api.get(`/api/chat/room/${roomId}/messages`);
      console.log('📥 메시지 로딩 성공:', response.data.length, '개');
      setMessages(response.data);
      // 메시지 로딩 후에는 무조건 맨 아래로 스크롤
      setTimeout(() => scrollToBottomIfNeeded(true), 100);
    } catch (error) {
      console.error('❌메시지 로딩 에러:', error);
      setError('메시지를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !websocket || websocket.readyState !== WebSocket.OPEN) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      console.log('📤 메시지 전송:', messageText);
      websocket.send(JSON.stringify({
        type: 'send_message',
        message: messageText
      }));

      // 내가 메시지를 보낸 직후 아래로 스크롤
      setTimeout(() => {
        scrollToBottomIfNeeded(true);
      }, 100);

      stopTyping();
    } catch (error) {
      console.error('❌ 메시지 전송 에러:', error);
      setError('메시지 전송에 실패했습니다.');
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping && websocket && websocket.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      websocket.send(JSON.stringify({
        type: 'typing_start'
      }));
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    if (isTyping && websocket && websocket.readyState === WebSocket.OPEN) {
      setIsTyping(false);
      websocket.send(JSON.stringify({
        type: 'typing_stop'
      }));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleScrollToBottom = () => {
    scrollToBottomIfNeeded(true);
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // 드래그 기능 개선
  const handleMouseDown = (e) => {
    if (e.target.closest('.chat-header') && !e.target.closest('.chat-controls')) {
      console.log('🖱️ 드래그 시작');
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // viewport 경계 체크
      const modalWidth = 380;
      const modalHeight = isMinimized ? 45 : 500;
      const maxX = window.innerWidth - modalWidth;
      const maxY = window.innerHeight - modalHeight;

      const constrainedPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };

      setPosition(constrainedPosition);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      console.log('🖱️ 드래그 종료');
      setIsDragging(false);
    }
  };

  useEffect(() => {
    if (isDragging) {
      const handleDocumentMouseMove = (e) => handleMouseMove(e);
      const handleDocumentMouseUp = () => handleMouseUp();

      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
      document.body.style.userSelect = 'none'; // 드래그 중 텍스트 선택 방지

      return () => {
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
        document.body.style.userSelect = '';
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset.x, dragOffset.y, position.x, position.y]);

  // 로그인하지 않은 경우 채팅 모달을 표시하지 않음
  if (!currentUser) {
    return null;
  }

  if (!targetUser || !currentUser) {
    console.log('❌ ChatModal 렌더링 중단 - 필요한 데이터 누락:', { targetUser, currentUser });
    return null;
  }

  return createPortal(
    <div
      className={`chat-modal ${isMinimized ? 'minimized' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        zIndex: 10000
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 헤더 */}
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="user-avatar">
            {targetUser.isGroup ? (
              <i className="fas fa-users"></i>
            ) : (
              <i className="fas fa-user-circle"></i>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">
              {targetUser.name}
              {targetUser.isGroup && targetUser.member_names && (
                <span className="group-member-count"> ({targetUser.member_names.length}명)</span>
              )}
            </span>
            {targetUser.isGroup && targetUser.member_names && (
              <span className="group-members">
                {targetUser.member_names.join(', ')}
              </span>
            )}
            {otherUserTyping && (
              <span className="typing-indicator">
                <i className="fas fa-ellipsis-h"></i> 입력 중...
              </span>
            )}
          </div>
        </div>

        <div className="chat-controls">
          <button
            className="minimize-btn"
            onClick={onMinimize}
            title="최소화"
          >
            <i className="fas fa-minus"></i>
          </button>
          <button
            className="close-btn"
            onClick={onClose}
            title="닫기"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div>
          {/* 메시지 영역 */}
          <div
            className="chat-messages"
            ref={messagesContainerRef}
            onScroll={checkScrollPosition}
          >
            {/* 새 메시지 알림 버튼 */}
            {!isAtBottom && newMessageCount > 0 && (
              <div className="new-message-notification">
                <button
                  className="scroll-to-bottom-btn"
                  onClick={handleScrollToBottom}
                >
                  <i className="fas fa-arrow-down"></i>
                  새 메시지 {newMessageCount}개
                </button>
              </div>
            )}

            {(loading || chatSkeleton.showSkeleton) && (
              <div className="message-list skeleton-loader" {...chatSkeleton.skeletonProps}>
                {Array.from({ length: 5 }).map((_, index) => {
                  const isVisible = loading || chatSkeleton.getItemVisibility(index);
                  const delay = chatSkeleton.getItemDelay(index);
                  const isOwnMessage = index % 3 === 0;

                  return (
                    <div
                      key={`chat-skeleton-${index}`}
                      className="chat-skeleton-item"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible
                          ? 'translateY(0) scale(1)'
                          : 'translateY(10px) scale(0.98)',
                        transition: `all 250ms ease-out ${delay}ms`,
                        marginBottom: '8px'
                      }}
                    >
                      <SkeletonChatMessage
                        isOwnMessage={isOwnMessage}
                        animation="shimmer"
                        staggerDelay={0}
                        className="chat-skeleton"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button onClick={loadMessages} className="retry-btn">
                  다시 시도
                </button>
              </div>
            )}

            {!loading && !error && messages.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-comment"></i>
                <span>첫 메시지를 보내보세요!</span>
              </div>
            )}

            {!loading && !error && messages.length > 0 && (
              <div className="message-list">
                {messages.map((message, index) => (
                  <div
                    key={message._id || index}
                    className={`message ${message.sender_id === currentUser.id ? 'own' : 'other'}`}
                  >
                    <div className="message-content">
                      {/* 발신자 이름 표시 (그룹 채팅이거나 상대방 메시지인 경우) */}
                      {(targetUser.isGroup || message.sender_id !== currentUser.id) && (
                        <div className="message-sender">
                          {message.sender_name || '알 수 없음'}
                        </div>
                      )}
                      <div className="message-bubble">
                        {message.message}
                      </div>
                      <div className="message-time">
                        {formatMessageTime(message.created_at)}
                        {message.sender_id === currentUser.id && (
                          <span className={`read-status ${message.is_read ? 'read' : 'unread'}`}>
                            {message.is_read ? '읽음' : '1'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* 입력 영역 */}
          <div className="chat-input-area">
            {showEmojiPicker && (
              <div className="emoji-picker-container">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={300}
                  height={350}
                />
              </div>
            )}

            <div className="chat-input">
              <button
                className="emoji-btn"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="이모지"
              >
                <i className="fas fa-smile"></i>
              </button>

              <textarea
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요..."
                className="message-input"
                rows="1"
              />

              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                title="전송"
              >
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

export default ChatModal;
