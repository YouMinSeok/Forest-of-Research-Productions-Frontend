import React, { useState, useEffect } from 'react';
import './CommentSection.css';
import { fetchComments, createComment, deleteComment, updateComment, getCurrentUser } from '../services/api';
import { canDeleteComment } from '../utils/permissions';

function CommentSection({ postId, onCommentAdded, onCommentDeleted, allowComments = true }) {
  const [comments, setComments] = useState([]);
  const [userName, setUserName] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);

  // "어떤 댓글"의 드롭다운이 열려 있는지 추적 (commentId)
  const [openDropdownCommentId, setOpenDropdownCommentId] = useState(null);

  // 답글 관련 상태
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyPreviewImage, setReplyPreviewImage] = useState(null);

  // 댓글 수정 관련 상태
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editPreviewImage, setEditPreviewImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null); // 원본 이미지
  const [imageToDelete, setImageToDelete] = useState(false); // 이미지 삭제 여부
  const [showEditHistory, setShowEditHistory] = useState({}); // 수정 히스토리 표시 상태

  // 댓글 목록 불러오기
  useEffect(() => {
    const loadComments = async () => {
      try {
        const data = await fetchComments(postId);
        setComments(data);
      } catch (error) {
        console.error("댓글을 불러오지 못했습니다.", error);
        // 403 에러인 경우 댓글 비허용으로 처리
        if (error.response?.status === 403) {
          console.log("댓글이 허용되지 않는 게시글입니다.");
        }
      }
    };
    loadComments();
  }, [postId]);

  // 현재 로그인된 사용자 정보 불러오기 (/api/auth/me)
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const data = await getCurrentUser();
        setUserName(data.user.name);
        setCurrentUserId(data.user._id || data.user.id);
        setCurrentUser({
          id: data.user._id || data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role || 'student',
          permissions: data.user.permissions || [],
          is_admin: data.user.is_admin || false
        });
        setIsLoggedIn(true);
      } catch (error) {
        console.log("로그인된 사용자 정보를 가져오지 못했습니다.", error);
        setUserName("Guest");
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    };
    loadCurrentUser();
  }, []);

  // 이미지 파일 선택 -> 미리보기
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!allowComments) {
      alert("이 게시글은 댓글을 허용하지 않습니다.");
      return;
    }
    if (!isLoggedIn) {
      alert("댓글 기능은 연구의숲 회원만 가능합니다.");
      return;
    }
    if (!newCommentText.trim() && !previewImage) return;

    const commentData = {
      content: newCommentText,
      image: previewImage,
    };

    try {
      const newComment = await createComment(postId, commentData);
      setComments([...comments, newComment]);
      setNewCommentText("");
      setPreviewImage(null);
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("댓글 등록에 실패했습니다.", error);
      if (error.response?.status === 401) {
        alert("로그인이 필요합니다.");
      } else if (error.response?.status === 403) {
        const errorDetail = error.response?.data?.detail || "";
        if (errorDetail.includes("authenticated") || errorDetail.includes("로그인")) {
          alert("로그인이 필요합니다.");
        } else {
          alert("댓글 작성 권한이 없습니다.");
        }
      } else {
        alert("댓글 등록에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  // 답글 작성
  const handleSubmitReply = async (parentCommentId) => {
    if (!allowComments) {
      alert("이 게시글은 댓글을 허용하지 않습니다.");
      return;
    }
    if (!isLoggedIn) {
      alert("답글 기능은 연구의숲 회원만 가능합니다.");
      return;
    }
    if (!replyText.trim() && !replyPreviewImage) return;

    const replyData = {
      content: replyText,
      image: replyPreviewImage,
      parent_comment_id: parentCommentId,
    };

    try {
      await createComment(postId, replyData);
      // 댓글 목록 새로고침
      const updatedComments = await fetchComments(postId);
      setComments(updatedComments);
      setReplyText("");
      setReplyPreviewImage(null);
      setReplyingTo(null);
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("답글 등록에 실패했습니다.", error);
      if (error.response?.status === 403) {
        alert("이 게시글은 댓글을 허용하지 않습니다.");
      }
    }
  };

  // 답글 시작
  const startReply = (commentId, writerName) => {
    if (!allowComments) {
      alert("이 게시글은 댓글을 허용하지 않습니다.");
      return;
    }
    setReplyingTo(commentId);
    setReplyText(`@${writerName} `);
  };

  // 답글 취소
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyText("");
    setReplyPreviewImage(null);
  };

  // 드롭다운 열고 닫기
  const toggleDropdown = (commentId) => {
    setOpenDropdownCommentId((prev) => (prev === commentId ? null : commentId));
  };

  // "수정" 버튼 클릭 - 수정 모드로 전환
  const handleEditComment = (commentId, currentContent, currentImage = null) => {
    setEditingCommentId(commentId);
    setEditCommentText(currentContent);
    setEditPreviewImage(currentImage);
    setOriginalImage(currentImage);
    setImageToDelete(false);
    setOpenDropdownCommentId(null);
  };

  // 댓글 수정 취소
  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText("");
    setEditPreviewImage(null);
    setOriginalImage(null);
    setImageToDelete(false);
  };

  // 댓글 수정 완료
  const handleUpdateComment = async (commentId) => {
    if (!editCommentText.trim() && !editPreviewImage && !originalImage) {
      alert("댓글 내용을 입력해주세요.");
      return;
    }

    const updateData = {
      content: editCommentText,
    };

    // 이미지 처리 로직
    if (imageToDelete) {
      updateData.image = null; // 이미지 삭제
    } else if (editPreviewImage) {
      updateData.image = editPreviewImage; // 새 이미지 업로드
    } else if (originalImage) {
      updateData.image = originalImage; // 기존 이미지 유지
    }

    try {
      await updateComment(postId, commentId, updateData);

      // 댓글 목록 새로고침
      const updatedComments = await fetchComments(postId);
      setComments(updatedComments);

      // 수정 모드 종료
      setEditingCommentId(null);
      setEditCommentText("");
      setEditPreviewImage(null);
      setOriginalImage(null);
      setImageToDelete(false);

      if (onCommentAdded) {
        onCommentAdded(); // 게시글의 댓글 수 업데이트 등
      }
    } catch (error) {
      console.error("댓글 수정 실패:", error);
      if (error.response?.status === 403) {
        alert("댓글을 수정할 권한이 없습니다.");
      } else {
        alert("댓글 수정에 실패했습니다. 다시 시도해주세요.");
      }
    }
  };

  // 수정용 이미지 파일 선택
  const handleEditImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPreviewImage(reader.result);
        setImageToDelete(false); // 새 이미지를 선택하면 삭제 상태 해제
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 삭제 함수
  const handleDeleteEditImage = () => {
    setEditPreviewImage(null);
    setImageToDelete(true);
  };

  // 기존 이미지 복원 함수
  const handleRestoreOriginalImage = () => {
    setEditPreviewImage(originalImage);
    setImageToDelete(false);
  };

  // 수정 히스토리 토글 함수
  const toggleEditHistory = (commentId) => {
    setShowEditHistory(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  // 댓글 삭제 핸들러
  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(postId, commentId);

      // 중첩된 구조에서 댓글을 재귀적으로 찾아서 삭제
      const removeCommentFromList = (commentList) => {
        return commentList.filter(comment => {
          if (comment.id === commentId) {
            return false; // 해당 댓글 삭제
          }
          if (comment.replies && comment.replies.length > 0) {
            comment.replies = removeCommentFromList(comment.replies);
          }
          return true;
        });
      };

      setComments(prev => removeCommentFromList(prev));
      setOpenDropdownCommentId(null);

      if (onCommentDeleted) {
        onCommentDeleted();
      }
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
    }
  };

  // 댓글 렌더링 함수 (재귀)
  const renderComment = (comment, depth = 0) => {
    const isMyComment = (comment.writer_id === currentUserId);
    const canDeleteThisComment = currentUser && canDeleteComment(currentUser, comment);

    // 답글 클래스 결정 - 네이버처럼 적당한 들여쓰기
    let replyClass = '';
    if (depth === 1 || depth === 2) {
      replyClass = 'reply-item';
    } else if (depth >= 3) {
      replyClass = 'deep-reply';
    }

    return (
      <div key={comment.id} className={`comment-item ${isMyComment ? 'my-comment' : ''} ${replyClass}`}>
        <div className="comment-header">
          <div>
            <span className="comment-writer">{comment.writer}</span>
            <span className="comment-date">
              {new Date(comment.date).toLocaleString()}
            </span>
          </div>

          <div className="comment-actions">
            {/* 답글 버튼 */}
            {isLoggedIn && allowComments && (
              <button
                className="reply-btn"
                onClick={() => startReply(comment.id, comment.writer)}
              >
                💬 답글
              </button>
            )}

            {/* 드롭다운 아이콘: 작성자 또는 관리자만 표시 */}
            {isLoggedIn && (isMyComment || canDeleteThisComment) && (
              <>
                <i
                  className="fas fa-ellipsis-h"
                  onClick={() => toggleDropdown(comment.id)}
                />
                {openDropdownCommentId === comment.id && (
                  <div className="dropdown-menu">
                    {isMyComment && (
                      <div
                        className="dropdown-item"
                        onClick={() => handleEditComment(comment.id, comment.content, comment.image)}
                      >
                        수정
                      </div>
                    )}
                    {canDeleteThisComment && (
                      <div
                        className="dropdown-item"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        삭제
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="comment-content">
          {editingCommentId === comment.id ? (
            // 수정 모드일 때
            <div className="edit-comment-container">
              <div className="edit-input-header">{userName}</div>
              <textarea
                className="edit-comment-textarea"
                placeholder="댓글을 수정하세요"
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
              />

              {/* 이미지 관리 영역 */}
              <div className="edit-image-section">
                {/* 기존 이미지가 있고 삭제되지 않은 경우 */}
                {originalImage && !imageToDelete && !editPreviewImage && (
                  <div className="current-image-preview">
                    <div className="image-label">현재 이미지:</div>
                    <div className="image-container">
                      <img src={originalImage} alt="현재 이미지" />
                      <button
                        className="image-delete-btn"
                        onClick={handleDeleteEditImage}
                        title="이미지 삭제"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* 새 이미지 미리보기 */}
                {editPreviewImage && (
                  <div className="new-image-preview">
                    <div className="image-label">새 이미지:</div>
                    <div className="image-container">
                      <img src={editPreviewImage} alt="새 이미지 미리보기" />
                      <button
                        className="image-delete-btn"
                        onClick={() => setEditPreviewImage(null)}
                        title="새 이미지 제거"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    {originalImage && (
                      <button
                        className="restore-image-btn"
                        onClick={handleRestoreOriginalImage}
                      >
                        <i className="fas fa-undo"></i> 기존 이미지로 되돌리기
                      </button>
                    )}
                  </div>
                )}

                {/* 이미지가 삭제된 상태 */}
                {imageToDelete && !editPreviewImage && (
                  <div className="deleted-image-notice">
                    <i className="fas fa-image-slash"></i>
                    <span>이미지가 삭제됩니다</span>
                    {originalImage && (
                      <button
                        className="restore-image-btn"
                        onClick={handleRestoreOriginalImage}
                      >
                        <i className="fas fa-undo"></i> 되돌리기
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="edit-footer">
                <div className="edit-footer-left">
                  <label htmlFor={`edit-image-upload-${comment.id}`} className="comment-icon">
                    <i className="fas fa-camera"></i>
                  </label>
                  <input
                    id={`edit-image-upload-${comment.id}`}
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="edit-actions">
                  <span className="edit-cancel" onClick={cancelEditComment}>취소</span>
                  <span className="edit-submit" onClick={() => handleUpdateComment(comment.id)}>수정</span>
                </div>
              </div>
            </div>
          ) : (
            // 일반 모드일 때
            <>
              <p dangerouslySetInnerHTML={{
                __html: comment.content.replace(/@(\w+)/g, '<span class="mention">@$1</span>')
              }}></p>
              {comment.image && (
                <img src={comment.image} alt="댓글 이미지" className="comment-image" />
              )}
              {comment.is_modified && (
                <div className="edit-history-section">
                  <span
                    className="modified-indicator clickable"
                    onClick={() => toggleEditHistory(comment.id)}
                  >
                    <i className="fas fa-edit"></i>
                    수정됨
                    {comment.edit_count && ` (${comment.edit_count}회)`}
                    <i className={`fas fa-chevron-${showEditHistory[comment.id] ? 'up' : 'down'}`}></i>
                  </span>

                  {showEditHistory[comment.id] && (
                    <div className="edit-history-details">
                      <div className="edit-history-header">
                        <i className="fas fa-history"></i>
                        수정 이력
                      </div>
                      <div className="edit-history-list">
                        {comment.last_modified && (
                          <div className="edit-history-item">
                            <i className="fas fa-clock"></i>
                            <span className="edit-time">
                              마지막 수정: {new Date(comment.last_modified).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {comment.created_at && comment.last_modified &&
                         new Date(comment.created_at).getTime() !== new Date(comment.last_modified).getTime() && (
                          <div className="edit-history-item">
                            <i className="fas fa-plus-circle"></i>
                            <span className="edit-time">
                              작성일: {new Date(comment.created_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {comment.edit_count && comment.edit_count > 1 && (
                          <div className="edit-history-item">
                            <i className="fas fa-edit"></i>
                            <span className="edit-count">
                              총 {comment.edit_count}회 수정됨
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 답글 입력 폼 - 댓글 허용일 때만 */}
        {replyingTo === comment.id && allowComments && (
          <div className="reply-input-container">
            <div className="reply-input-header">{userName}</div>
            <textarea
              className="reply-input-textarea"
              placeholder={`@${comment.writer}님에게 답글을 남겨보세요`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <div className="reply-footer">
              <div className="reply-footer-left">
                <label htmlFor="reply-image-upload" className="comment-icon">
                  <i className="fas fa-camera"></i>
                </label>
                <input
                  id="reply-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setReplyPreviewImage(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>
              <div className="reply-actions">
                <span className="reply-cancel" onClick={cancelReply}>취소</span>
                <span className="reply-submit" onClick={() => handleSubmitReply(comment.id)}>등록</span>
              </div>
            </div>
            {replyPreviewImage && (
              <div className="image-preview">
                <img src={replyPreviewImage} alt="미리보기" />
              </div>
            )}
          </div>
        )}

        {/* 답글들 렌더링 */}
        {comment.replies && comment.replies.map(reply => renderComment(reply, depth + 1))}
      </div>
    );
  };

  return (
    <div className="comment-section">
      <h2>댓글</h2>

      {/* 댓글 목록 */}
      <div className="comment-list">
        {comments.map((comment) => renderComment(comment))}
      </div>

      {/* 댓글 작성 영역 */}
      <div className="comment-input-container">
        {!allowComments ? (
          <div className="comment-disabled-notice">
            <div className="comment-disabled-icon">
              <i className="fas fa-comment-slash"></i>
            </div>
            <div className="comment-disabled-text">
              <strong>댓글 작성이 제한되었습니다</strong>
              <p>작성자가 이 게시글의 댓글을 허용하지 않았습니다.</p>
            </div>
          </div>
        ) : isLoggedIn ? (
          <>
            <div className="comment-input-header">{userName}</div>
            <textarea
              className="comment-input-textarea"
              placeholder="댓글을 남겨보세요"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />
            <div className="comment-footer">
              <div className="comment-footer-left">
                <label htmlFor="comment-image-upload" className="comment-icon">
                  <i className="fas fa-camera"></i>
                </label>
                <input
                  id="comment-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <i className="far fa-smile comment-icon"></i>
              </div>
              <span className="comment-submit-text" onClick={handleSubmitComment}>
                등록
              </span>
            </div>
            {previewImage && (
              <div className="image-preview">
                <img src={previewImage} alt="미리보기" />
              </div>
            )}
          </>
        ) : (
          <div className="comment-notice">
            댓글 기능은 연구의숲 회원만 가능합니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentSection;
