import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import './ChatRoomList.css';
import GroupChatCreateModal from './GroupChatCreateModal';

function ChatRoomList({ onRoomSelect, onClose }) {
  const { user } = useAuth(); // AuthContext 사용
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      setError(null);

      // api.js의 통합 클라이언트 사용
      const response = await api.get('/api/chat/rooms/all');
      console.log('📋 채팅방 목록 로드됨:', response.data);
      setChatRooms(response.data || []);
    } catch (error) {
      console.error('채팅방 목록 로딩 오류:', error);
      setError('채팅방 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그인하지 않은 경우 안내 메시지
  if (!user) {
    return (
      <div className="chat-room-list">
        <div className="chat-header">
          <h3>채팅</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="login-required-notice">
          <p>채팅 기능을 사용하려면 로그인해주세요.</p>
        </div>
      </div>
    );
  }

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const handleRoomClick = (room) => {
    if (room.is_group) {
      // 그룹 채팅인 경우
      onRoomSelect({
        id: room.room_id,
        name: room.name,
        isGroup: true,
        members: room.members,
        member_names: room.member_names
      }, room.room_id);
    } else {
      // 개인 채팅인 경우
      onRoomSelect({
        id: room.other_user_id,
        name: room.other_user_name,
        isGroup: false
      }, room.room_id);
    }
  };

  const handleCreateGroup = () => {
    setShowGroupModal(true);
  };

  const handleGroupModalClose = () => {
    setShowGroupModal(false);
  };

  const handleCreateGroupChat = async (groupData) => {
    try {
      const response = await api.post('/api/chat/groups/create', groupData);
      console.log('그룹 채팅 생성됨:', response.data);

      // 채팅방 목록 새로고침
      loadChatRooms();

      // 새로 생성된 그룹 채팅방 열기
      onRoomSelect({
        id: response.data.room_id,
        name: response.data.name,
        isGroup: true
      }, response.data.room_id);

    } catch (error) {
      console.error('그룹 채팅 생성 오류:', error);
      throw error;
    }
  };

  return (
    <>
      <div className="chat-room-list-overlay">
        <div className="chat-room-list">
          <div className="chat-room-list-header">
            <h3>💬 채팅 목록</h3>
            <div className="header-controls">
              <button
                className="create-group-btn"
                onClick={handleCreateGroup}
                title="그룹 채팅 만들기"
              >
                <i className="fas fa-plus"></i>
              </button>
              <button className="close-btn" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className="chat-room-list-content">
            {loading && (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i>
                <span>채팅방을 불러오는 중...</span>
              </div>
            )}

            {error && (
              <div className="error-state">
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
                <button onClick={loadChatRooms} className="retry-btn">
                  다시 시도
                </button>
              </div>
            )}

            {!loading && !error && chatRooms.length === 0 && (
              <div className="empty-state">
                <i className="fas fa-comment-slash"></i>
                <span>아직 채팅방이 없습니다</span>
                <p>게시글에서 다른 사용자와 채팅을 시작해보세요!</p>
              </div>
            )}

            {!loading && !error && chatRooms.length > 0 && (
              <div className="room-list">
                {chatRooms.map((room, index) => (
                  <div
                    key={room.room_id || index}
                    className={`room-item ${room.is_group ? 'group-chat' : ''}`}
                    onClick={() => handleRoomClick(room)}
                  >
                    <div className="room-avatar">
                      {room.is_group ? (
                        <i className="fas fa-users"></i>
                      ) : (
                        <i className="fas fa-user-circle"></i>
                      )}
                    </div>

                    <div className="room-info">
                      <div className="room-header">
                        <span className="room-name">
                          {room.is_group ? room.name : room.other_user_name}
                          {room.is_group && (
                            <span className="group-indicator"> ({room.member_names?.length || 0}명)</span>
                          )}
                        </span>
                        <span className="room-time">
                          {formatLastMessageTime(room.last_message_at)}
                        </span>
                      </div>

                      <div className="room-last-message">
                        {room.last_message ? (
                          <span className="message-text">
                            {room.last_message.length > 30
                              ? room.last_message.substring(0, 30) + '...'
                              : room.last_message
                            }
                          </span>
                        ) : (
                          <span className="no-message">메시지가 없습니다</span>
                        )}

                        {room.unread_count > 0 && (
                          <span className="unread-badge">
                            {room.unread_count > 99 ? '99+' : room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="chat-room-list-footer">
            <button className="refresh-btn" onClick={loadChatRooms}>
              <i className="fas fa-sync-alt"></i>
              새로고침
            </button>
          </div>
        </div>
      </div>

      <GroupChatCreateModal
        isOpen={showGroupModal}
        onClose={handleGroupModalClose}
        currentUser={user}
        onCreateGroup={handleCreateGroupChat}
      />
    </>
  );
}

export default ChatRoomList;
