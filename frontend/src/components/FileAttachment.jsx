/* eslint-disable no-console */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import './FileAttachment.css';
import {
  uploadFileDirect,

  downloadFile,
  deleteAttachment,
  getPostAttachments,
  validateFileUpload,
  getFileTypeIcon,
  formatFileSize,
  uploadMultipleFiles
} from '../api/attachment';

const FileAttachment = ({
  postId,
  attachments = [],
  onFileUpload,
  onFileDelete,
  onFileDownload,
  allowUpload = false,
  allowDelete = false,
  onAttachmentsUpdate,
  isDraftCreating = false,
  onCreateDraft = null
}) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]); // 업로드 진행 상황 추적
  const [currentAttachments, setCurrentAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingIds, setDeletingIds] = useState(new Set());

  // 첨부파일 로드
  const loadAttachments = useCallback(async () => {
    try {
      setLoading(true);
      setError(''); // 이전 에러 상태 초기화

      // postId가 유효한 MongoDB ObjectId 형식인지 검사
      if (!postId || typeof postId !== 'string' || postId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(postId)) {
        // 유효하지 않은 postId일 경우 조용히 반환
        setCurrentAttachments([]);
        return;
      }

      const data = await getPostAttachments(postId);

      // 새로운 API 응답 구조에 맞게 처리
      const attachmentsList = data.attachments || data || [];
      console.log('📎 첨부파일 로딩 완료:', {
        'postId': postId,
        '총 개수': attachmentsList.length,
        'API 응답': data,
        '첨부파일 목록': attachmentsList,
        '첫 번째 첨부파일 구조': attachmentsList[0] || null
      });
      setCurrentAttachments(attachmentsList);

    } catch (error) {
      console.warn('첨부파일 로드 중 오류 발생:', error);
      // 서버 오류 시 조용히 처리 (사용자에게는 에러 메시지 표시하지 않음)
      setCurrentAttachments([]);
      // setError('첨부파일을 불러오는데 실패했습니다.'); // 주석 처리하여 에러 메시지 숨김
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // currentAttachments가 변경될 때 부모 컴포넌트에 알림 (onAttachmentsUpdate를 의존성에서 제거하여 무한루프 방지)
  useEffect(() => {
    if (onAttachmentsUpdate) {
      onAttachmentsUpdate(currentAttachments);
    }
  }, [currentAttachments]);

  // attachments props가 변경될 때 currentAttachments 동기화
  useEffect(() => {
    if (attachments && attachments.length > 0) {
      setCurrentAttachments(attachments);
    }
  }, [attachments]);

  useEffect(() => {
    // Draft 생성 중이거나 postId가 없는 경우 로딩하지 않음
    if (!postId || isDraftCreating) {
      console.log('🔄 첨부파일 로딩 스킵:', { postId, isDraftCreating });
      return;
    }

    // 게시글 수정 모드에서는 즉시 로딩, 새 작성 모드에서는 약간 대기
    const delay = attachments.length > 0 ? 0 : 300; // 기존 첨부파일이 있으면 즉시 로딩

    console.log(`🔄 첨부파일 로딩 시작 (${delay}ms 후):`, postId);
    const timer = setTimeout(() => {
      loadAttachments();
    }, delay);

    return () => clearTimeout(timer);
  }, [postId, isDraftCreating, loadAttachments]);

  // 파일 타입별 FontAwesome 아이콘 반환
  const getFileIcon = (filename) => {
    if (!filename) return 'fas fa-file';
    const ext = filename.split('.').pop()?.toLowerCase();

    const icons = {
      'pdf': 'fas fa-file-pdf',
      'doc': 'fas fa-file-word',
      'docx': 'fas fa-file-word',
      'xls': 'fas fa-file-excel',
      'xlsx': 'fas fa-file-excel',
      'ppt': 'fas fa-file-powerpoint',
      'pptx': 'fas fa-file-powerpoint',
      'hwp': 'fas fa-file-alt',
      'txt': 'fas fa-file-alt',
      'jpg': 'fas fa-file-image',
      'jpeg': 'fas fa-file-image',
      'png': 'fas fa-file-image',
      'gif': 'fas fa-file-image',
      'webp': 'fas fa-file-image',
      'mp4': 'fas fa-file-video',
      'avi': 'fas fa-file-video',
      'mov': 'fas fa-file-video',
      'mp3': 'fas fa-file-audio',
      'wav': 'fas fa-file-audio',
      'zip': 'fas fa-file-archive',
      'rar': 'fas fa-file-archive',
      '7z': 'fas fa-file-archive'
    };
    return icons[ext] || 'fas fa-file';
  };

  // 파일 타입별 색상 반환
  const getFileColor = (fileType) => {
    const colors = {
      'pdf': '#e74c3c',
      'document': '#2980b9',
      'spreadsheet': '#27ae60',
      'presentation': '#e67e22',
      'text': '#34495e',
      'image': '#f39c12',
      'video': '#e91e63',
      'audio': '#673ab7',
      'archive': '#795548',
      'other': '#95a5a6'
    };
    return colors[fileType] || colors['other'];
  };

  // 파일 선택 핸들러
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 1) {
      await handleSingleUpload(files[0]);
    } else if (files.length > 1) {
      await handleMultipleUploads(files);
    }

    // input 초기화
    event.target.value = '';
  };

  // 단일 파일 업로드
  const handleSingleUpload = async (file) => {
    // onFileUpload 콜백이 있으면 직접 업로드하지 않고 콜백만 호출
    if (onFileUpload) {
      try {
        console.log('📤 부모 컴포넌트 업로드 핸들러로 위임:', file.name);

        // 🔧 업로드 중인 파일을 미리보기에 임시 추가
        const tempAttachment = {
          id: Date.now() + Math.random(), // 임시 숫자 ID
          original_filename: file.name,
          filename: file.name,
          file_size: file.size,
          file_type: file.name.split('.').pop().toLowerCase(),
          uploading: true,
          temp: true // 임시 파일 표시
        };

        setCurrentAttachments(prev => {
          const updated = [tempAttachment, ...prev];
          console.log('⏳ 임시 업로드 중인 파일 미리보기 추가:', file.name);

          // 임시 파일 추가 시에는 onAttachmentsUpdate를 호출하지 않음
          // 실제 업로드 완료 후 useEffect에서 한 번만 호출됨

          return updated;
        });
        await onFileUpload(file);
        return;
      } catch (error) {
        console.error('부모 컴포넌트 업로드 실패:', error);
        setError('파일 업로드에 실패했습니다.');
        setTimeout(() => setError(''), 5000);

        // 🔧 업로드 실패 시 임시 파일 제거
        setCurrentAttachments(prev => {
          const updated = prev.filter(att => !(att.temp && att.original_filename === file.name));
          // currentAttachments 변경으로 useEffect에서 onAttachmentsUpdate가 호출되므로
          // 여기서는 중복 호출하지 않음
          return updated;
        });
        return;
      }
    }
    const uploadId = `${Date.now()}_${Math.random()}`;

    try {
      // 1. postId 확인 및 자동 생성
      let currentPostId = postId;
      if (!currentPostId && onCreateDraft) {
        console.log('📎 첨부파일 업로드를 위해 임시저장 생성 중...');
        setError('임시저장을 생성하는 중입니다...');

        try {
          currentPostId = await onCreateDraft();
          setError(''); // 성공하면 에러 메시지 제거
          console.log('✅ 첨부파일용 임시저장 생성 완료:', currentPostId);
        } catch (createError) {
          console.error('❌ 첨부파일용 임시저장 생성 실패:', createError);
          setError('임시저장 생성에 실패했습니다. 다시 시도해주세요.');
          setTimeout(() => setError(''), 5000);
          return;
        }
      }

      if (!currentPostId) {
        setError('게시글을 준비하는 중입니다. 제목이나 내용을 입력한 후 다시 시도해주세요.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      // 2. 파일 검증
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        setTimeout(() => setError(''), 5000);
        return;
      }

      // 3. 업로드 시작
      addUploadItem(uploadId, file.name, file.size, 'uploading');

      // 4. 진행률 콜백
      const onProgress = (progress) => {
        updateUploadProgress(uploadId, progress);
      };

      // 5. 파일 업로드 실행 (🚀 직접 업로드로 속도 개선)
      const result = await uploadFileDirect(currentPostId, file, onProgress);

      // 6. 업로드 완료
      updateUploadStatus(uploadId, 'completed');

      // 7. 중복 파일 경고
      if (result.is_duplicate) {
        setError(`동일한 파일이 이미 존재합니다: ${result.original_filename}`);
        setTimeout(() => setError(''), 5000);
      }

      // 8. 성공 메시지 및 데이터 추출
      console.log('=== 업로드 성공 데이터 ===');
      console.log('전체 result:', result);

      // 업로드 응답에서 실제 첨부파일 데이터 추출
      const attachmentData = result.attachment || result;
      console.log('추출된 attachment 데이터:', attachmentData);
      console.log('attachment_id:', attachmentData.attachment_id);
      console.log('_id:', attachmentData._id);
      console.log('id:', attachmentData.id);
      console.log('=========================');

      // 9. 📌 즉시 UI 상태 업데이트 (핵심 수정사항)
      const newAttachment = {
        attachment_id: attachmentData.attachment_id,
        _id: attachmentData.id || attachmentData._id,
        id: attachmentData.id || attachmentData._id,
        original_filename: attachmentData.original_filename || file.name,
        file_size: attachmentData.file_size || file.size,
        file_type: attachmentData.file_type,
        mime_type: attachmentData.mime_type,
        upload_date: attachmentData.upload_date || new Date().toISOString(),
        uploader_id: attachmentData.uploader_id,
        file_hash_short: attachmentData.file_hash_short,
        is_duplicate: attachmentData.is_duplicate || false,
        is_draft_attachment: attachmentData.is_draft_attachment || false,
        post_status: attachmentData.post_status || 'published'
      };

      // 즉시 currentAttachments에 새 파일 추가 및 부모 컴포넌트 알림
      setCurrentAttachments(prev => {
        const updated = [newAttachment, ...prev];
        console.log('🔄 즉시 UI 업데이트:', updated);

        // currentAttachments 변경으로 useEffect에서 onAttachmentsUpdate가 호출되므로
        // 여기서는 중복 호출하지 않음

        return updated;
      });

      // 10. 📌 백그라운드에서 서버 데이터 동기화 (검증 목적)
      setTimeout(async () => {
        try {
          await loadAttachments();
          console.log('✅ 백그라운드 동기화 완료');
        } catch (reloadError) {
          console.warn('백그라운드 동기화 실패:', reloadError);
        }
      }, 100);


    } catch (error) {
      console.error('파일 업로드 실패:', error);
      updateUploadStatus(uploadId, 'failed', error.message);

      let errorMessage = '파일 업로드에 실패했습니다.';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  // 다중 파일 업로드
  const handleMultipleUploads = async (files) => {
    try {
      if (!postId) {
        setError('게시글을 준비하는 중입니다. 잠시 후 다시 시도해주세요.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      // 진행률 콜백
      const onProgress = (fileIndex, progress, totalFiles) => {
        // 각 파일별 진행률 업데이트 로직
        console.log(`파일 ${fileIndex + 1}/${totalFiles}: ${progress}%`);
      };

      const results = await uploadMultipleFiles(postId, files, onProgress);

      console.log('다중 파일 업로드 결과:', results);

      if (results.failCount > 0) {
        setError(`${results.failCount}개 파일 업로드 실패. ${results.successCount}개 성공.`);
        setTimeout(() => setError(''), 5000);
      }

      // 📌 성공한 파일들을 즉시 UI에 추가
      if (results.successful && results.successful.length > 0) {
        const newAttachments = results.successful.map(result => {
          // 업로드 응답에서 실제 첨부파일 데이터 추출
          const attachmentData = result.attachment || result;
          return {
            attachment_id: attachmentData.attachment_id,
            _id: attachmentData.id || attachmentData._id,
            id: attachmentData.id || attachmentData._id,
            original_filename: attachmentData.original_filename,
            file_size: attachmentData.file_size,
            file_type: attachmentData.file_type,
            mime_type: attachmentData.mime_type,
            upload_date: attachmentData.upload_date || new Date().toISOString(),
            uploader_id: attachmentData.uploader_id,
            file_hash_short: attachmentData.file_hash_short,
            is_duplicate: attachmentData.is_duplicate || false,
            is_draft_attachment: attachmentData.is_draft_attachment || false,
            post_status: attachmentData.post_status || 'published'
          };
        });

        // 즉시 currentAttachments에 새 파일들 추가 및 부모 컴포넌트 알림
        setCurrentAttachments(prev => {
          const updated = [...newAttachments, ...prev];
          console.log('🔄 다중 파일 즉시 UI 업데이트:', updated);

          // currentAttachments 변경으로 useEffect에서 onAttachmentsUpdate가 호출되므로
          // 여기서는 중복 호출하지 않음

          return updated;
        });
      }

      // 📌 백그라운드에서 서버 데이터 동기화
      setTimeout(async () => {
        try {
          await loadAttachments();
          console.log('✅ 다중 파일 백그라운드 동기화 완료');
        } catch (reloadError) {
          console.warn('다중 파일 백그라운드 동기화 실패:', reloadError);
        }
      }, 100);

    } catch (error) {
      console.error('다중 파일 업로드 실패:', error);
      setError('다중 파일 업로드에 실패했습니다.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // 업로드 목록 관리
  const addUploadItem = (id, fileName, fileSize, status) => {
    setUploads(prev => [...prev, {
      id,
      fileName,
      fileSize,
      status,
      progress: 0,
      error: null
    }]);
  };

  const updateUploadProgress = (id, progress) => {
    setUploads(prev => prev.map(upload =>
      upload.id === id ? { ...upload, progress, status: 'uploading' } : upload
    ));
  };

  const updateUploadStatus = (id, status, error = null) => {
    setUploads(prev => prev.map(upload =>
      upload.id === id ? { ...upload, status, error } : upload
    ));
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 1) {
      await handleSingleUpload(files[0]);
    } else if (files.length > 1) {
      await handleMultipleUploads(files);
    }
  };

  // 파일 다운로드 핸들러
  const handleDownload = async (attachment) => {
    try {
      await downloadFile(attachment.attachment_id || attachment.id, attachment.original_filename);

      // 기존 콜백 호출 (호환성)
      if (onFileDownload) {
        onFileDownload(attachment);
      }
    } catch (error) {
      console.warn('파일 다운로드 실패 (임시저장 파일일 수 있음):', error.response?.status || error.message);

      // 404 오류(임시저장 파일)는 조용히 처리, 다른 오류만 사용자에게 알림
      if (error.response?.status !== 404) {
        setError('파일 다운로드에 실패했습니다.');
        setTimeout(() => setError(''), 5000);
      }
    }
  };

  // 파일 삭제 핸들러
  const handleFileDelete = async (attachmentId) => {
    // 이미 삭제 중인 파일인지 확인
    if (deletingIds.has(attachmentId)) {
      console.log('⚠️ 이미 삭제 처리 중인 파일:', attachmentId);
      return;
    }

    // onFileDelete 콜백이 있으면 직접 삭제하지 않고 콜백만 호출
    if (onFileDelete) {
      try {
        console.log('🗑️ 부모 컴포넌트 삭제 핸들러로 위임:', attachmentId);
        setDeletingIds(prev => new Set([...prev, attachmentId]));
        await onFileDelete(attachmentId);
        // 🔧 부모 컴포넌트에서 상태 업데이트하므로 로컬 상태 업데이트 제거 (무한루프 방지)
      } catch (error) {
        console.error('부모 컴포넌트 삭제 실패:', error);
        setError('파일 삭제에 실패했습니다.');
        setTimeout(() => setError(''), 5000);
      } finally {
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(attachmentId);
          return newSet;
        });
      }
      return;
    }

    // onFileDelete 콜백이 없을 때만 확인 대화상자 표시 및 직접 삭제
    if (!window.confirm('이 파일을 삭제하시겠습니까?')) {
      return;
    }

    // 삭제 중 상태로 추가
    setDeletingIds(prev => new Set([...prev, attachmentId]));

    try {
      console.log('🗑️ 파일 삭제 시도:', attachmentId);
      console.log('🗑️ 삭제할 ID 유형 검증:', {
        'attachmentId': attachmentId,
        'isUUID': attachmentId && attachmentId.includes('-'),
        'isObjectId': attachmentId && attachmentId.length === 24,
        'isNumber': !isNaN(attachmentId),
        'attachmentId 타입': typeof attachmentId,
        'attachmentId 길이': attachmentId ? attachmentId.length : 0
      });

      // 잘못된 ID 형태 체크를 더 관대하게 수정
      if (!attachmentId || typeof attachmentId !== 'string') {
        console.error('❌ 첨부파일 ID가 없거나 문자열이 아님:', attachmentId, typeof attachmentId);
        setError('잘못된 파일 ID입니다. 페이지를 새로고침해주세요.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      // UUID 또는 ObjectId 형태인지 확인 (더 관대한 검증)
      const isValidId = attachmentId.includes('-') || attachmentId.length === 24;
      if (!isValidId) {
        console.error('❌ 잘못된 첨부파일 ID 형태:', {
          attachmentId,
          길이: attachmentId.length,
          'UUID형태인가': attachmentId.includes('-'),
          'ObjectId길이인가': attachmentId.length === 24
        });
        setError('잘못된 파일 ID 형식입니다. 페이지를 새로고침해주세요.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      console.log('✅ ID 검증 통과, API 호출 시작:', attachmentId);

      // API 호출로 파일 삭제
      await deleteAttachment(attachmentId);

      console.log('✅ 백엔드 삭제 완료:', attachmentId);

      // 🔧 삭제된 파일을 즉시 UI에서 제거
      setCurrentAttachments(prev => {
        const filtered = prev.filter(att => {
          const currentId = att.attachment_id || att._id || att.id;
          return currentId !== attachmentId;
        });
        console.log('🔄 UI에서 제거 완료:', attachmentId);
        return filtered;
      });

      // 🔧 백그라운드 동기화 (필요시에만)
      setTimeout(async () => {
        try {
          await loadAttachments();
          console.log('✅ 삭제 후 동기화 완료');
        } catch (reloadError) {
          console.warn('삭제 후 동기화 실패:', reloadError);
        }
      }, 100);

      console.log('✅ 파일 삭제 및 UI 업데이트 완료:', attachmentId);

    } catch (error) {
      console.error('❌ 파일 삭제 실패:', error);
      setError('파일 삭제에 실패했습니다.');
      setTimeout(() => setError(''), 5000);
    } finally {
      // 삭제 중 상태에서 제거
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachmentId);
        return newSet;
      });
    }
  };

  // 업로드 완료된 항목 정리
  const clearCompletedUploads = () => {
    setUploads(prev => prev.filter(upload => upload.status === 'uploading'));
  };

  // 🔧 최적화된 첨부파일 목록 (중복 렌더링 방지)
  const displayAttachments = useMemo(() => {
    console.log('🔍 displayAttachments 계산:', {
      '전체': currentAttachments.length,
      '첫번째 파일': currentAttachments[0]?.original_filename || currentAttachments[0]?.filename
    });
    return currentAttachments;
  }, [currentAttachments]);

  const totalAttachments = displayAttachments.length;

  return (
    <div className="file-attachment-container">
      {/* 오류 메시지 */}
      {error && (
        <div className="error-message" style={ {
          background: '#fee',
          color: '#c33',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '10px',
          border: '1px solid #fcc'
        }} >
          {error}
        </div>
      )}

      {/* 파일 업로드 영역 */}
      {allowUpload && (
        <div className="file-upload-area">
          <div
            className={`file-drop-zone ${dragOver ? 'drag-over' : ''} ${isDraftCreating ? 'disabled' : ''}`}
            onDragOver={!isDraftCreating ? handleDragOver : undefined}
            onDragLeave={!isDraftCreating ? handleDragLeave : undefined}
            onDrop={!isDraftCreating ? handleDrop : undefined}
            onClick={!isDraftCreating ? () => fileInputRef.current?.click() : undefined}
            style={{ cursor: isDraftCreating ? 'not-allowed' : 'pointer', opacity: isDraftCreating ? 0.6 : 1 }}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">
                {isDraftCreating ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-cloud-upload-alt"></i>
                )}
              </div>
              <p>{isDraftCreating ? '게시글 준비 중...' : '파일을 드래그하거나 클릭하여 업로드'}</p>
              <p className="upload-info">
                최대 50MB • 보안 검증 및 중복 방지 • 옵션 B 디렉터리 스키마
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".txt,.csv,.md,.rtf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg,.mp4,.avi,.mov,.wmv,.flv,.mkv,.mp3,.wav,.flac,.ogg,.aac,.zip,.rar,.7z,.tar,.gz"
          />
        </div>
      )}

      {/* 업로드 진행 상황 */}
      {uploads.length > 0 && (
        <div className="upload-progress-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4>업로드 진행 상황</h4>
            <button
              onClick={clearCompletedUploads}
              style={ {
                background: '#f0f0f0',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              완료된 항목 정리
            </button>
          </div>
          {uploads.map((upload) => (
            <div key={upload.id} className="upload-item" style={ {
              background: '#f9f9f9',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '5px',
              border: '1px solid #ddd'
            }} >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} >
                <span style={{ fontWeight: 'bold' }}>{upload.fileName}</span>
                <span style={ {
                  color: upload.status === 'completed' ? '#27ae60' :
                         upload.status === 'failed' ? '#e74c3c' : '#3498db'
                }} >
                  {upload.status === 'uploading' ? `${upload.progress}%` :
                   upload.status === 'completed' ? '완료' :
                   upload.status === 'failed' ? '실패' : upload.status}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div style={ {
                  width: '100%',
                  height: '4px',
                  background: '#ddd',
                  borderRadius: '2px',
                  marginTop: '5px'
                }} >
                  <div style={ {
                    width: `${upload.progress}%`,
                    height: '100%',
                    background: '#3498db',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              )}
              {upload.error && (
                <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '5px' }}>
                  오류: {upload.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 첨부파일 목록 */}
      {(totalAttachments > 0 || loading) && (
        <div className="attachments-list">
          <h4 className="attachments-title">
            <i className="fas fa-paperclip"></i>
            {loading ? '첨부파일 로딩 중...' : `첨부파일 (${totalAttachments}개)`}
          </h4>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
              로딩 중...
            </div>
          ) : (
            <div className="attachments-grid">
              {displayAttachments
                .sort((a, b) => new Date(b.upload_date || b.created_at) - new Date(a.upload_date || a.created_at))
                .map((attachment, index) => {
                  const uniqueKey = attachment.attachment_id ||
                                   attachment._id ||
                                   attachment.id ||
                                   attachment.file_id ||
                                   `attachment-${index}-${attachment.filename || attachment.original_filename}`;

                  return (
                    <AttachmentItem
                      key={uniqueKey}
                      attachment={attachment}
                      onDownload={handleDownload}
                      onDelete={handleFileDelete}
                      allowDelete={allowDelete}
                      getFileIcon={getFileIcon}
                      getFileColor={getFileColor}
                      deletingIds={deletingIds}
                    />
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 첨부파일 아이템 컴포넌트
const AttachmentItem = (props) => {
  const attachment = props.attachment;

  // 🚨 방어 로직: 유효하지 않은 첨부파일만 제외
  if (!attachment) {
    console.log('🚫 빈 첨부파일 스킵:', attachment);
    return null;
  }

  // 🔧 업로딩 중인 파일은 항상 표시
  if (attachment.uploading) {
    console.log('⏳ 업로딩 중인 파일 표시:', attachment.original_filename || attachment.filename);
  } else {
    // 업로딩 완료된 파일은 유효한 ID와 파일명이 있어야 함
    const hasValidId = attachment.attachment_id || attachment._id || attachment.id;
    const hasValidFilename = attachment.original_filename || attachment.filename || attachment.name;

    if (!hasValidId || !hasValidFilename) {
      console.log('🚫 유효하지 않은 업로드 완료 파일 스킵:', {
        'hasValidId': !!hasValidId,
        'hasValidFilename': !!hasValidFilename
      });
      return null;
    }
  }

  console.log('✅ 유효한 첨부파일 렌더링:', {
    'attachment_id': attachment.attachment_id,
    '_id': attachment._id,
    'id': attachment.id,
    'filename': attachment.original_filename || attachment.filename,
    'uploading': attachment.uploading
  });

  // 🔧 첨부파일 ID 추출 - 업로딩 중인 파일 포함
  const attachmentId = attachment.attachment_id || attachment._id || attachment.id || attachment.file_id;

  console.log('🎯 최종 선택된 attachmentId:', attachmentId);

  // 업로딩 중이 아닌 파일에서 ID가 없으면 스킵
  if (!attachment.uploading && !attachmentId) {
    console.warn('🚫 유효한 ID가 없는 첨부파일 스킵:', attachment);
    return null;
  }

  // 파일 이름 안전하게 추출
  const fileName = (() => {
    const name = attachment.original_filename ||
                 attachment.filename ||
                 attachment.name;

    if (!name || name.trim() === '' || name === 'undefined' || name === 'null') {
      return 'Unknown File';
    }

    return name.trim();
  })();

  // 드래프트 여부는 시각적 표시용으로만 사용 (삭제는 모두 가능)
  const isDraftFile = attachment.is_draft || attachment.is_draft_attachment || false;

  const isDeleting = props.deletingIds?.has(attachmentId);

  console.log('🚀 AttachmentItem 렌더링:', {
    'fileName': fileName,
    'attachmentId': attachmentId,
    'attachmentId 유효': !!attachmentId,
    'isDeleting': isDeleting,
    'isDraftFile': isDraftFile,
    'attachment keys': Object.keys(attachment)
  });

  return (
    <div
      className={`attachment-item ${isDeleting ? 'deleting' : ''} ${isDraftFile ? 'draft-file' : 'published-file'}`}
      onClick={() => !isDeleting && props.onDownload(attachment)}
      title={`${fileName} - ${formatFileSize(attachment.file_size || 0)} ${isDraftFile ? '(임시저장 파일)' : '(정식 파일)'}`}
      style={ {
        opacity: isDeleting ? 0.5 : 1,
        pointerEvents: isDeleting ? 'none' : 'auto',
        border: isDraftFile ? '2px dashed #ffa500' : '2px solid #4CAF50',
        display: 'block', // 강제로 표시
        visibility: 'visible', // 강제로 보이기
        minHeight: '100px', // 최소 높이 보장
        backgroundColor: isDraftFile ? '#fff9e6' : '#f0f8ff'
      }}
    >
      <div className="attachment-content">
        <div className="file-icon">
          <i className={props.getFileIcon(fileName)}></i>
        </div>
        <div className="file-info">
          <div className="file-name" title={fileName}>
            {fileName}
          </div>
          {/* 상태 뱃지들을 별도 줄로 분리 */}
          <div className="file-status-badges">
            {attachment.is_duplicate && (
              <span className="status-badge duplicate-badge">
                중복
              </span>
            )}
            {isDraftFile ? (
              <span className="status-badge draft-badge">
                임시저장
              </span>
            ) : (
              <span className="status-badge published-badge">
                정식
              </span>
            )}
            {attachment.is_draft_attachment && (
              <span className="status-badge draft-attachment-badge">
                DRAFT
              </span>
            )}
          </div>
          <div className="file-meta">
            <span className="file-size">
              {formatFileSize(attachment.file_size || attachment.size || 0)}
            </span>
            <span className="file-type-badge">
              {(() => {
                const filename = attachment.original_filename || attachment.filename || attachment.name || '';
                if (!filename) return 'FILE';
                const ext = filename.split('.').pop();
                return (ext || 'FILE').toUpperCase();
              })()}
            </span>
            <span style={ {
              fontSize: '12px',
              color: '#64748b',
              background: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '8px',
              fontWeight: '500'
            }} >
              {getFileTypeIcon(attachment.file_type || 'other')}
            </span>
          </div>
        </div>
        {props.allowDelete && (
          <button
            className={`delete-btn ${isDeleting ? 'deleting' : ''}`}
            onClick={(e) => {
              e.stopPropagation(); // 이벤트 버블링 방지 (다운로드 실행 방지)
              if (!isDeleting) {
                props.onDelete(attachmentId);
              }
            }}
            title={isDeleting ? "삭제 중..." : "파일 삭제"}
            disabled={isDeleting}
            style={ {
              opacity: isDeleting ? 0.6 : 1,
              cursor: isDeleting ? 'not-allowed' : 'pointer'
            }}
          >
            {isDeleting ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i className="fas fa-trash"></i>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default FileAttachment;
