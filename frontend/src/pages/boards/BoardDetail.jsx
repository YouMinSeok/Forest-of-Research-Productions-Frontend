import React, { useState, useEffect } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'react-quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBoardPost, incrementBoardView, likeBoardPost, deleteBoardPost } from '../../api/board';
import { getPostAttachmentsWithVersions, downloadFileHelper } from '../../api/secureAttachment';
import { getPostAttachments } from '../../api/attachment';
import CommentSection from '../../components/CommentSection';
import ChatModal from '../../components/ChatModal';
import UserBadge from '../../components/UserBadge';

import Breadcrumb from '../../components/Breadcrumb';
import { canEditPost, canDeletePost } from '../../utils/permissions';
import { getBoardConfig } from '../../config/boardConfig';

import './BoardDetail.css';

function BoardDetail() {
  const { boardType, postId } = useParams();
  const navigate = useNavigate();

  // boardType이 undefined인 경우 기본값 설정
  const category = boardType || '자유게시판';

  const [post, setPost] = useState(null);
  const [commentCount, setCommentCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPrivatePost, setIsPrivatePost] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  // 첨부파일 관련 상태
  const [secureAttachments, setSecureAttachments] = useState([]);

  // 채팅 관련 상태 추가
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  // 카카오 SDK 초기화
  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      // JavaScript 키가 'aab8e1629ff448d5bd49b2aa9f84380f'로 수정되었습니다.
      window.Kakao.init('aab8e1629ff448d5bd49b2aa9f84380f');
    }
  }, []);

  useEffect(() => {
    async function loadPost() {
      try {
        // 조회수 증가
        await incrementBoardView(postId);
        // 게시글 상세 불러오기
        const data = await fetchBoardPost(postId);
        setPost(data);
        setCommentCount(data.commentCount || 0);
        setIsPrivatePost(data.is_private || false);

        // 첨부파일 목록 불러오기 (일반 첨부파일 우선, 실패 시 버전별 첨부파일 시도)
        try {
          // 1. 먼저 일반 첨부파일 시도
          console.log('📎 일반 첨부파일 조회 시작:', postId);
          const normalAttachmentData = await getPostAttachments(postId);
          console.log('📎 일반 첨부파일 Raw 데이터:', normalAttachmentData);

          if (normalAttachmentData && normalAttachmentData.attachments && normalAttachmentData.attachments.length > 0) {
            console.log('📎 일반 첨부파일 사용:', normalAttachmentData.attachments);
            setSecureAttachments(normalAttachmentData.attachments);
          } else {
            // 2. 일반 첨부파일이 없으면 버전별 첨부파일 시도
            console.log('🔒 버전별 첨부파일 조회 시작');
            const secureAttachmentData = await getPostAttachmentsWithVersions(postId);
            console.log('🔒 보안 첨부파일 Raw 데이터:', secureAttachmentData);

            if (secureAttachmentData && secureAttachmentData.version_groups) {
              // version_groups 객체를 배열로 변환
              const allAttachments = [];
              Object.values(secureAttachmentData.version_groups).forEach(group => {
                if (Array.isArray(group)) {
                  allAttachments.push(...group);
                }
              });

              console.log('🔒 변환된 첨부파일 배열:', allAttachments);
              console.log('🔒 첨부파일 개수:', allAttachments.length);
              setSecureAttachments(allAttachments);
            } else {
              console.log('📎 첨부파일 없음');
              setSecureAttachments([]);
            }
          }
        } catch (attachmentError) {
          console.error('첨부파일 로딩 에러:', attachmentError);
          setSecureAttachments([]);
        }
      } catch (error) {
        console.error('게시글 로딩 에러:', error);

        // 403 에러인 경우 비공개 게시글 처리
        if (error.response?.status === 403) {
          setLoadingError('비공개 게시글입니다. 작성자만 볼 수 있습니다.');
        } else {
          setLoadingError('게시글을 불러올 수 없습니다.');
        }
      }
    }

    // JWT 토큰으로 현재 사용자 정보 가져오기
    async function loadCurrentUser() {
      try {
        const hostIp = process.env.REACT_APP_HOST_IP;
        const port = process.env.REACT_APP_API_PORT || '8080';

        if (!hostIp) {
          throw new Error('REACT_APP_HOST_IP 환경변수가 설정되지 않았습니다. .env 파일에서 IP를 설정해주세요.');
        }

        const backendUrl = `http://${hostIp}:${port}`;
        const response = await fetch(`${backendUrl}/api/auth/me`, {
          method: 'GET',
          credentials: 'include', // 쿠키 포함
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('JWT에서 가져온 사용자 정보:', userData.user);

          // ID 필드 통일: 백엔드에서 사용하는 user["id"]와 맞춤
          const userId = userData.user.id || userData.user._id;

          setCurrentUser({
            id: userId,
            name: userData.user.name,
            email: userData.user.email,
            role: userData.user.role || 'student',
            permissions: userData.user.permissions || [],
            is_admin: userData.user.is_admin || false
          });

          console.log('설정된 currentUser ID:', userId);
          console.log('게시글 writer_id:', post?.writer_id);
        } else {
          console.log('사용자 정보 가져오기 실패 (로그인 안됨)');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('사용자 정보 로딩 에러:', error);
        setCurrentUser(null);
      }
    }

    loadPost();
    loadCurrentUser();
  }, [postId, post?.writer_id]);

  // 1:1 채팅 시작 함수 추가
  const startChat = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (!post || !post.writer_id) {
      alert('게시글 작성자 정보를 찾을 수 없습니다.');
      return;
    }

    if (currentUser.id === post.writer_id) {
      alert('자기 자신과는 채팅할 수 없습니다.');
      return;
    }

    try {
      const hostIp = process.env.REACT_APP_HOST_IP;
      const port = process.env.REACT_APP_API_PORT || '8080';

      if (!hostIp) {
        throw new Error('REACT_APP_HOST_IP 환경변수가 설정되지 않았습니다. .env 파일에서 IP를 설정해주세요.');
      }

      const backendUrl = `http://${hostIp}:${port}`;

      const response = await fetch(`${backendUrl}/api/chat/room/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          target_user_id: post.writer_id,
          target_user_name: post.writer
        })
      });

      if (response.ok) {
        const data = await response.json();

        const targetUser = {
          id: post.writer_id,
          name: post.writer
        };

        console.log('📱 채팅 상태 설정 중...');
        console.log('📱 chatTarget:', targetUser);
        console.log('📱 roomId:', data.room_id);
        console.log('📱 currentUser:', currentUser);

        setChatTarget(targetUser);
        setChatRoomId(data.room_id);
        setShowChatModal(true);
        setIsChatMinimized(false);

        console.log('📱 showChatModal 상태를 true로 설정함');
        console.log('채팅방 생성/조회 성공:', data);
      } else {
        throw new Error('채팅방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅 시작 에러:', error);
      alert('채팅을 시작할 수 없습니다. 다시 시도해주세요.');
    }
  };

  // 채팅창 닫기 함수 추가
  const closeChatModal = () => {
    console.log('📱 채팅 모달 닫기');
    setShowChatModal(false);
    setChatTarget(null);
    setChatRoomId(null);
    setIsChatMinimized(false);
  };

  // 채팅창 최소화 함수 추가
  const minimizeChatModal = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  // 보안 첨부파일 다운로드 핸들러
  const handleSecureFileDownload = async (attachment) => {
    try {
      console.log('🔒 보안 파일 다운로드 시작:', attachment);
      console.log('🔍 다운로드 ID 상세 정보:', {
        'attachment.id': attachment.id,
        'attachment.attachment_id': attachment.attachment_id,
        'attachment._id': attachment._id,
        'ID 타입': typeof attachment.id,
        'ID 길이': attachment.id ? attachment.id.length : 'N/A'
      });
      const result = await downloadFileHelper(attachment.id, attachment.original_filename || attachment.filename);

      if (result.success) {
        console.log('✅ 파일 다운로드 성공:', result.message);
      } else {
        console.error('❌ 파일 다운로드 실패:', result.message);
        alert(result.message);
      }
    } catch (error) {
      console.error('보안 파일 다운로드 에러:', error);
      alert('보안 파일 다운로드에 실패했습니다.');
    }
  };

  // 파일 크기 포맷팅 함수
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 날짜 포맷팅 함수 - 개선된 버전
  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      let date;
      const dateStr = dateString.toString();

      // 'YYYY-MM-DD HH:MM:SS' 형식 (한국 시간대)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        // 한국 시간으로 파싱
        date = new Date(dateStr + ' +09:00');
      }
      // ISO 형식 (T나 Z 포함)
      else if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = new Date(dateStr);
      }
      // 기타 형식
      else {
        date = new Date(dateStr);
      }

      // Date 객체가 유효한지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', dateString);
        return '';
      }

      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('날짜 파싱 오류:', dateString, error);
      return '';
    }
  };

  // 카카오톡 공유 함수
  const handleKakaoShare = () => {
    try {
      if (!window.Kakao) {
        alert('카카오톡 공유 서비스를 사용할 수 없습니다.');
        return;
      }

      if (!window.Kakao.isInitialized()) {
        alert('카카오톡 SDK가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // post 데이터 로딩 확인
      if (!post || !post.title) {
        alert('게시글 데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const plainTitle = stripHtmlTags(post.title);
      const plainContent = stripHtmlTags(post.content);
      const description = plainContent.length > 100 ?
        plainContent.substring(0, 100) + '...' : plainContent;

      const shareUrl = window.location.href;

      console.log('공유 데이터:', {
        title: `${category} - ${plainTitle}`,
        description: description,
        url: shareUrl
      });

      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${category} - ${plainTitle}`,
          description: description,
          imageUrl: 'https://researchforest.netlify.app/logo192.png', // public 폴더의 로고 사용
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        social: {
          likeCount: post.likes || 0,
          commentCount: commentCount,
          viewCount: post.views || 0,
        },
        buttons: [
          {
            title: '게시글 보기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });

    } catch (error) {
      console.error('카카오톡 공유 에러:', error);
      alert(`카카오톡 공유에 실패했습니다: ${error.message}`);
    }
  };

  // 좋아요 처리
  const handleLike = async (event) => {
    // 펄스 애니메이션 효과 추가
    const likeButton = event.currentTarget;
    likeButton.classList.add('pulse');
    setTimeout(() => {
      likeButton.classList.remove('pulse');
    }, 300);

    try {
      const result = await likeBoardPost(postId);

      // 로그인이 필요한 경우
      if (result.requireLogin) {
        const confirmLogin = window.confirm(
          `${result.message}\n로그인하시겠습니까?`
        );
        if (confirmLogin) {
          navigate('/login');
        }
        return;
      }

      // 성공한 경우
      if (result.success) {
        // 좋아요 상태에 따른 알림 메시지 (선택적)
        if (result.message) {
          // 간단한 토스트 알림 (옵션)
          console.log(result.message);
        }

        // 게시글 정보 새로고침하여 좋아요 수 업데이트
        const data = await fetchBoardPost(postId);
        setPost(data);
      }
    } catch (error) {
      // 기존 에러 처리 로직 유지 (fallback)
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        const confirmLogin = window.confirm(
          "이 기능은 연구의숲 회원만 사용 가능합니다.\n로그인하시겠습니까?"
        );
        if (confirmLogin) {
          navigate('/login');
        }
      } else {
        console.error('좋아요 에러:', error);
        alert('좋아요 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  // 수정 버튼 클릭
  const handleEdit = () => {
    setShowDropdown(false);
    // 현재 URL 패턴에서 섹션 추출 (/board, /research, /community)
    const currentPath = window.location.pathname;
    let section = '/community'; // 기본값

    if (currentPath.includes('/board/')) section = '/board';
    else if (currentPath.includes('/research/')) section = '/research';
    else if (currentPath.includes('/community/')) section = '/community';

    navigate(`${section}/${category}/edit/${postId}`);
  };

  // 삭제 버튼 클릭
  const handleDelete = async () => {
    setShowDropdown(false);

    if (!window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return;
    }

    try {
      // 삭제 중 로딩 상태 표시
      const loadingAlert = document.createElement('div');
      loadingAlert.textContent = '게시글을 삭제하는 중...';
      loadingAlert.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 8px;
        z-index: 10000; font-size: 16px;
      `;
      document.body.appendChild(loadingAlert);

      await deleteBoardPost(postId);

      // 로딩 표시 제거
      document.body.removeChild(loadingAlert);

      // 성공 메시지
      alert('게시글이 삭제되었습니다.');

      // 캐시 무효화 - localStorage에서 관련 캐시 제거
      const cacheKeys = Object.keys(localStorage);
      cacheKeys.forEach(key => {
        if (key.includes('board_posts') || key.includes('board_cache') || key.includes(category)) {
          localStorage.removeItem(key);
        }
      });

      // sessionStorage 캐시도 제거
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('board_posts') || key.includes('board_cache') || key.includes(category)) {
          sessionStorage.removeItem(key);
        }
      });

      // 새로운 범용 라우팅 구조로 게시판 목록 이동
      const currentPath = window.location.pathname;
      let section = '/community'; // 기본값

      if (currentPath.includes('/board/')) section = '/board';
      else if (currentPath.includes('/research/')) section = '/research';
      else if (currentPath.includes('/community/')) section = '/community';

      const targetPath = `${section}/${category}`;

      // 강제 새로고침과 함께 이동 - 캐시된 데이터 완전 무효화
      navigate(targetPath, {
        replace: true,
        state: {
          forceRefresh: true,
          deletedPostId: postId,
          timestamp: Date.now()
        }
      });

      // 페이지 이동 후 추가 새로고침 (브라우저 캐시 무효화)
      setTimeout(() => {
        window.location.href = targetPath + '?refresh=' + Date.now();
      }, 100);

    } catch (error) {
      // 로딩 표시가 있다면 제거
      const loadingAlert = document.querySelector('div[style*="position: fixed"]');
      if (loadingAlert) {
        document.body.removeChild(loadingAlert);
      }

      console.error('삭제 에러:', error);
      if (error.response?.status === 403) {
        alert('본인이 작성한 게시글만 삭제할 수 있습니다.');
      } else if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
      } else {
        alert('게시글 삭제에 실패했습니다.');
      }
    }
  };

  // 드롭다운 토글
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.post-menu')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showDropdown]);

  // 작성자인지 확인
  const isAuthor = currentUser && post && (currentUser.id === post.writer_id);

  // 수정/삭제 권한 확인 (작성자 또는 관리자)
  const canEdit = currentUser && post && canEditPost(currentUser, post);
  const canDelete = currentUser && post && canDeletePost(currentUser, post);

  // 디버깅용 로그
  console.log('currentUser:', currentUser);
  console.log('post.writer_id:', post?.writer_id);
  console.log('isAuthor:', isAuthor);

  // 댓글 아이콘 클릭 시 (필요 시 로그인 체크)
  const handleCommentIcon = () => {
    console.log('댓글 아이콘 클릭');
  };

  // 댓글 추가 시 댓글 수 +1
  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  // 댓글 삭제 시 댓글 수 -1
  const handleCommentDeleted = () => {
    setCommentCount(prev => prev - 1);
  };

  // TOP 버튼 클릭 시 상단으로 스크롤
  const handleTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 목록 버튼 클릭 시 해당 게시판 목록 페이지로 이동 - 새로운 범용 라우팅 구조
  const handleList = () => {
    // 현재 URL 패턴에서 섹션 추출 (/board, /research, /community)
    const currentPath = window.location.pathname;
    let section = '/community'; // 기본값

    if (currentPath.includes('/board/')) section = '/board';
    else if (currentPath.includes('/research/')) section = '/research';
    else if (currentPath.includes('/community/')) section = '/community';

    const targetPath = `${section}/${category}`;
    navigate(targetPath);
  };

  // 에러 상태인 경우 에러 메시지 표시
  if (loadingError) {
    return (
      <div className="board-detail-container">
        <div className="error-message">
          <div className="error-icon">🔒</div>
          <h2>{loadingError}</h2>
          <p>이 게시글은 작성자만 볼 수 있는 비공개 게시글입니다.</p>
          <button className="list-btn" onClick={handleList}>목록으로 돌아가기</button>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="loading">로딩 중...</div>;
  }

  // 제목은 plain text 처리
  const stripHtmlTags = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };
  const plainTitle = stripHtmlTags(post.title);

  return (
    <div className="board-detail-container">
      <Breadcrumb />

      {/* 개선된 제목 영역 */}
      <div className="improved-title-section">
        <div className="title-header">
          {/* 첫 번째 줄: 게시판이름 + 말머리 + 메뉴버튼 */}
          <div className="title-first-line">
            <div className="board-and-prefix">
              <span className="board-name">
                {(() => {
                  // post.board 데이터가 있으면 우선 사용
                  if (post && post.board) {
                    const boardConfig = getBoardConfig(post.board);
                    if (boardConfig && boardConfig.title) {
                      return boardConfig.title;
                    }
                    return post.board;
                  }

                  // category로 fallback
                  const boardConfig = getBoardConfig(category);
                  if (boardConfig && boardConfig.title) {
                    return boardConfig.title;
                  }

                  // 최종 fallback
                  return category || '게시판';
                })()}
              </span>
              {post.prefix && post.prefix !== 'undefined' && (
                <span className="title-separator">|</span>
              )}
            </div>

            {/* 메뉴 버튼 */}
            {(canEdit || canDelete) && (
              <div className="post-menu">
                <button className="menu-btn" onClick={toggleDropdown}>
                  <i className="fas fa-ellipsis-v"></i>
                </button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    {canEdit && (
                      <button className="dropdown-item edit-item" onClick={handleEdit}>
                        <i className="fas fa-edit"></i>
                        <span>수정</span>
                      </button>
                    )}
                    {canDelete && (
                      <button className="dropdown-item delete-item" onClick={handleDelete}>
                        <i className="fas fa-trash"></i>
                        <span>삭제</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 두 번째 줄: 제목 */}
          <div className="title-second-line">
            <h1 className="improved-post-title">{plainTitle}</h1>
            {isPrivatePost && <span className="private-indicator">🔒 비공개</span>}
          </div>
        </div>

        {/* 작성자 정보 */}
        <div className="post-meta">
          <div className="author-info">
            <span className="writer">
              {post.writer}
              <UserBadge role={post.writer_role} isAdmin={post.writer_is_admin} size="sm" />
            </span>
            {/* 네이버 카페 스타일 1:1 채팅 버튼 - 작성자가 아닌 경우에만 표시 */}
            {currentUser && post.writer_id !== currentUser.id && (
              <button onClick={startChat} className="naver-chat-btn">
                💬 1:1 채팅
              </button>
            )}
          </div>
          <span className="date">{new Date(post.date).toLocaleString()}</span>
        </div>
      </div>

      {/* Quill 등에서 생성된 HTML을 그대로 표시 */}
      <div
        className="post-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* 첨부파일 목록 */}
      {secureAttachments.length > 0 && (
        <div className="attachments-section">
          <h4>📎 첨부파일 ({secureAttachments.length}개)</h4>
          {secureAttachments.length > 0 && (
            <div className="secure-attachments-list">
              {secureAttachments.map((attachment, index) => {
                // 파일 확장자에 따른 아이콘 결정
                const getFileIcon = (filename) => {
                  if (!filename) return 'fas fa-file';
                  const ext = filename.split('.').pop()?.toLowerCase();
                  switch (ext) {
                    case 'pdf': return 'fas fa-file-pdf';
                    case 'doc':
                    case 'docx': return 'fas fa-file-word';
                    case 'xls':
                    case 'xlsx': return 'fas fa-file-excel';
                    case 'ppt':
                    case 'pptx': return 'fas fa-file-powerpoint';
                    case 'jpg':
                    case 'jpeg':
                    case 'png':
                    case 'gif':
                    case 'webp': return 'fas fa-file-image';
                    case 'mp4':
                    case 'avi':
                    case 'mov':
                    case 'wmv': return 'fas fa-file-video';
                    case 'mp3':
                    case 'wav':
                    case 'flac': return 'fas fa-file-audio';
                    case 'zip':
                    case 'rar':
                    case '7z': return 'fas fa-file-archive';
                    case 'txt': return 'fas fa-file-alt';
                    default: return 'fas fa-file';
                  }
                };

                return (
                  <div key={attachment.id || index} className="secure-attachment-item">
                    <div className="attachment-info">
                      <div className="attachment-header">
                        <div className="attachment-icon">
                          <i className={getFileIcon(attachment.original_filename)}></i>
                        </div>
                        <div className="attachment-details">
                          <div className="attachment-name">
                            {attachment.original_filename || '파일명 없음'}
                          </div>
                          <div className="attachment-meta">
                            <span className="attachment-size">
                              {formatFileSize(attachment.file_size || 0)}
                            </span>
                            <span className="attachment-date">
                              {formatDate(attachment.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className="download-btn"
                      onClick={() => handleSecureFileDownload(attachment)}
                    >
                      <i className="fas fa-download"></i>
                      다운로드
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <hr className="content-divider" />

      <div className="post-icons">
        <div className="icon-item" onClick={handleLike}>
          <i className="fas fa-heart"></i>
          <span>좋아요</span>
          <span className="icon-value">{post.likes || 0}</span>
        </div>
        <div className="icon-item">
          <i className="fas fa-eye"></i>
          <span>조회수</span>
          <span className="icon-value">{post.views || 0}</span>
        </div>
        <div className="icon-item" onClick={handleCommentIcon}>
          <i className="fas fa-comment"></i>
          <span>댓글</span>
          <span className="icon-value">{commentCount}</span>
        </div>
        <div className="icon-item kakao-share-btn" onClick={handleKakaoShare}>
          <i className="fas fa-share-alt"></i>
          <span>공유</span>
        </div>
      </div>

      {/* 댓글 섹션 - 댓글 허용 여부에 따라 UI 변경 */}
      <CommentSection
        postId={post.id}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
        allowComments={post.allow_comments !== false}
      />

      <div className="bottom-buttons">
        <button className="list-btn" onClick={handleList}>목록</button>
        {/* 답글 버튼 제거 */}
        <button className="top-btn" onClick={handleTop}>TOP</button>
      </div>

      {/* 채팅 모달 - Portal로 렌더링되어 다른 요소에 영향 없음 */}
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
    </div>
  );
}

export default BoardDetail;
