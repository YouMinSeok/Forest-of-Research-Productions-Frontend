import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchBoardPost, updateBoardPost } from '../../api/board';
import { uploadFile } from '../../api/attachment';
import {
  secureDeleteAttachment,
  downloadFileHelper
} from '../../api/secureAttachment';
import FileAttachment from '../../components/FileAttachment';
import { setupAITextClipboard } from '../../utils/textFormatter';
import './BoardEdit.css';

/* 커스텀 폰트 등록 */
const Font = Quill.import('formats/font');
Font.whitelist = ['notoSansKR', 'nanumGothic', 'nanumMyeongjo', 'nanumSquare'];
Quill.register(Font, true);

/* 글자 크기(size) 커스텀 */
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px'];
Quill.register(Size, true);

function BoardEdit() {
  const { category, postId } = useParams();
  const navigate = useNavigate();

  // 모든 게시판 말머리 옵션
  const prefixOptions = {
    공지사항: ['필독', '공지', '업데이트'],
    먹거리게시판: ['맛집추천', '레시피', '배달주문', '요리팁', '후기', '기타'],
    논문게시판: ['연구주제', '논문요약', '논문자료', '초안업로드'],
    질문과답변: ['질문합니다', '도와주세요', '궁금합니다', '공유해요', '해결됨'],
    회의기록: ['정기회의', '프로젝트회의', '논문회의', '세미나/스터디', '긴급회의'],
    학회공모전: ['학회정보', '공모전정보', '투고마감임박', '참석후기', '자료공유']
  };

  // 제안서의 2차 말머리 옵션
  const secondPrefixOptions = [
    { value: '', label: '선택안함' },
    { value: '초안', label: '초안' },
    { value: '1차 피드백 요청', label: '1차 피드백 요청' },
    { value: '2차 피드백 요청', label: '2차 피드백 요청' },
    { value: '수정중', label: '수정중' },
    { value: '최종안', label: '최종안' },
    { value: '완료', label: '완료' },
    { value: '보류', label: '보류' }
  ];

  const [post, setPost] = useState(null);
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [selectedSecondPrefix, setSelectedSecondPrefix] = useState('');
  const [title, setTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [deletingFiles, setDeletingFiles] = useState(new Set());

  // 프라이버시 옵션 상태 추가
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // Quill ref
  const quillRef = useRef(null);

  // 기존 게시글 데이터 로드
  useEffect(() => {
    async function loadPost() {
      try {
        const data = await fetchBoardPost(postId);
        setPost(data);
        setTitle(data.title || '');
        setEditorContent(data.content || '');
        setSelectedPrefix(data.prefix || '');

        // 프라이버시 옵션 로드
        setIsPrivate(data.is_private || false);
        setAllowComments(data.allow_comments !== false);

        // 말머리 파싱 (게시판별 처리)
        if (data.prefix) {
          if (data.board === '제안서') {
            // 제안서: "제안서 초안" 형태
            setSelectedPrefix('제안서');
            const prefixParts = data.prefix.split(' ');
            if (prefixParts.length >= 2 && prefixParts[0] === '제안서') {
              setSelectedSecondPrefix(prefixParts.slice(1).join(' '));
            } else {
              setSelectedSecondPrefix('');
            }
          } else if (data.board === '논문게시판') {
            // 논문게시판: "연구주제 신규" 형태
            const prefixParts = data.prefix.split(' ');
            if (prefixParts.length >= 2) {
              setSelectedPrefix(prefixParts[0]);
              setSelectedSecondPrefix(prefixParts.slice(1).join(' '));
            } else {
              setSelectedPrefix(data.prefix);
            }
          } else if (data.board === '질문과답변') {
            // 질문과답변: "[질문합니다]" 형태
            const cleanPrefix = data.prefix.replace(/[[\]]/g, '');
            setSelectedPrefix(cleanPrefix);
          } else if (data.board === '회의기록') {
            // 회의기록: "[정기회의]" 형태
            const cleanPrefix = data.prefix.replace(/[[\]]/g, '');
            setSelectedPrefix(cleanPrefix);
          } else if (data.board === '학회공모전') {
            // 학회공모전: "[학회정보]" 형태
            const cleanPrefix = data.prefix.replace(/[[\]]/g, '');
            setSelectedPrefix(cleanPrefix);
          } else {
            // 기타 게시판: 단순 말머리
            setSelectedPrefix(data.prefix);
          }
        }

        // FileAttachment 컴포넌트가 자체적으로 첨부파일을 로드하므로 여기서는 초기화만
        setAttachments([]);
      } catch (error) {
        console.error('게시글 로딩 에러:', error);
        alert('게시글을 불러오는 데 실패했습니다.');
        navigate(-1);
      }
    }
    loadPost();
  }, [postId, navigate]);

  // Quill 에디터에 AI 텍스트 클립보드 처리 기능 추가
  useEffect(() => {
    return setupAITextClipboard(quillRef);
  }, []);

  // Quill modules & formats (툴바 구성)
  const modules = useMemo(() => ({
    toolbar: {
      container: '#custom-toolbar'
    },
    clipboard: {
      // Word/한글 문서 서식 보존을 위한 설정
      matchVisual: true,
      // Word, 한글 등에서 HTML 서식 허용
      matchers: [
        // Word/한글의 기본 포맷 매처 허용
        ['b, strong', function(node, delta) {
          return delta.compose(new (Quill.import('delta'))().retain(delta.length(), { bold: true }));
        }],
        ['i, em', function(node, delta) {
          return delta.compose(new (Quill.import('delta'))().retain(delta.length(), { italic: true }));
        }],
        ['u', function(node, delta) {
          return delta.compose(new (Quill.import('delta'))().retain(delta.length(), { underline: true }));
        }],
        // Word/한글 들여쓰기 처리
        ['p, div', function(node, delta) {
          const style = node.getAttribute('style') || '';
          let indentLevel = 0;

          // margin-left 스타일에서 들여쓰기 레벨 계산
          const marginMatch = style.match(/margin-left:\s*(\d+(?:\.\d+)?)(pt|px|em)/);
          if (marginMatch) {
            const value = parseFloat(marginMatch[1]);
            const unit = marginMatch[2];

            // 단위별 들여쓰기 레벨 계산 (36pt = 1레벨로 가정)
            if (unit === 'pt') {
              indentLevel = Math.round(value / 36);
            } else if (unit === 'px') {
              indentLevel = Math.round(value / 48); // 48px = 1레벨
            } else if (unit === 'em') {
              indentLevel = Math.round(value / 2); // 2em = 1레벨
            }
          }

          // text-indent 스타일도 확인
          const textIndentMatch = style.match(/text-indent:\s*(\d+(?:\.\d+)?)(pt|px|em)/);
          if (textIndentMatch && indentLevel === 0) {
            const value = parseFloat(textIndentMatch[1]);
            const unit = textIndentMatch[2];

            if (unit === 'pt') {
              indentLevel = Math.round(value / 36);
            } else if (unit === 'px') {
              indentLevel = Math.round(value / 48);
            } else if (unit === 'em') {
              indentLevel = Math.round(value / 2);
            }
          }

          // 들여쓰기 레벨을 최대 8로 제한
          indentLevel = Math.min(Math.max(indentLevel, 0), 8);

          if (indentLevel > 0) {
            return delta.compose(new (Quill.import('delta'))().retain(delta.length(), { indent: indentLevel }));
          }

          return delta;
        }]
      ]
    }
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'align', 'color', 'background'
  ];

  // 보안 파일 업로드 핸들러
  const handleFileUpload = async (file) => {
    try {
      // 중복 파일 체크
      const isDuplicate = attachments.some(att =>
        att.filename === file.name || att.original_filename === file.name
      );

      if (isDuplicate) {
        alert(`이미 같은 이름의 파일이 업로드되어 있습니다: ${file.name}`);
        return;
      }

      // 이미 업로드 중인 파일인지 체크
      if (uploadingFiles.includes(file.name)) {
        console.log('⚠️ 이미 업로드 중인 파일:', file.name);
        return;
      }

      setUploadingFiles(prev => [...prev, file.name]);
      console.log('🔒 보안 파일 업로드 시작:', file.name);

      const uploadResult = await uploadFile(postId, file);
      console.log('🔒 업로드 완료 (전체 응답):', uploadResult);

      // 업로드 응답에서 실제 첨부파일 데이터 추출
      const uploadedFile = uploadResult.attachment || uploadResult;
      console.log('🔒 추출된 첨부파일 데이터:', uploadedFile);

      // FileAttachment 컴포넌트가 onAttachmentsUpdate를 통해 상태를 자동으로 업데이트하므로
      // 여기서는 setAttachments를 직접 호출하지 않습니다.
      alert(`${file.name} 파일이 안전하게 업로드되었습니다.`);
    } catch (error) {
      console.error('보안 파일 업로드 에러:', error);
      if (error.response?.status === 403) {
        alert('Google Drive 인증이 필요합니다.\n관리자에게 다음 링크로 OAuth 인증을 요청하세요:\nhttp://localhost:8000/api/google/start');
      } else if (error.response?.status === 400) {
        alert(error.response.data.detail || '보안 파일 업로드에 실패했습니다.');
      } else {
        alert('보안 파일 업로드에 실패했습니다.');
      }
    } finally {
      setUploadingFiles(prev => prev.filter(name => name !== file.name));
    }
  };

  // 보안 파일 삭제 핸들러
  const handleFileDelete = async (attachmentId) => {
    try {
      // 이미 삭제 중인 파일인지 확인
      if (deletingFiles.has(attachmentId)) {
        console.log('⚠️ 이미 삭제 처리 중인 파일:', attachmentId);
        return;
      }

      if (!window.confirm('이 파일을 삭제하시겠습니까?')) {
        return;
      }

      // 삭제 중 상태로 추가
      setDeletingFiles(prev => new Set([...prev, attachmentId]));

      console.log('🔒 보안 파일 삭제 시작:', attachmentId);
      await secureDeleteAttachment(attachmentId, '사용자 요청');

      setAttachments(prev => prev.filter(att => att.id !== attachmentId));
      alert('파일이 안전하게 삭제되었습니다.');
    } catch (error) {
      console.error('보안 파일 삭제 에러:', error);
      if (error.response?.status === 403) {
        alert('파일 업로더만 삭제할 수 있습니다.');
      } else if (error.response?.status === 404) {
        alert('삭제할 파일을 찾을 수 없습니다.');
      } else {
        alert('보안 파일 삭제에 실패했습니다.');
      }
    } finally {
      // 삭제 상태에서 제거
      setDeletingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(attachmentId);
        return newSet;
      });
    }
  };

  // 보안 파일 다운로드 핸들러
  const handleFileDownload = async (attachment) => {
    try {
      console.log('🔒 보안 파일 다운로드 시작:', attachment);
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

  // 수정 완료 처리
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }
    if (!editorContent.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let finalPrefix = selectedPrefix;

      // 게시판별 말머리 처리
      if (post.board === '제안서') {
        // 제안서: "제안서" 또는 "제안서 초안" 형태
        finalPrefix = selectedSecondPrefix ? `제안서 ${selectedSecondPrefix}` : '제안서';
      } else if (post.board === '논문게시판') {
        // 논문게시판: "연구주제" 또는 "연구주제 신규" 형태
        finalPrefix = selectedSecondPrefix ? `${selectedPrefix} ${selectedSecondPrefix}` : selectedPrefix;
      } else if (post.board === '질문과답변' && selectedPrefix) {
        // 질문과답변: "[질문합니다]" 형태
        finalPrefix = `[${selectedPrefix}]`;
      } else if (post.board === '회의기록' && selectedPrefix) {
        // 회의기록: "[정기회의]" 형태
        finalPrefix = `[${selectedPrefix}]`;
      } else if (post.board === '학회공모전' && selectedPrefix) {
        // 학회공모전: "[학회정보]" 형태
        finalPrefix = `[${selectedPrefix}]`;
      }

      const updateData = {
        title: title.trim(),
        content: editorContent,
        prefix: finalPrefix,
        is_private: isPrivate,
        allow_comments: allowComments
      };

      await updateBoardPost(postId, updateData);
      alert('게시글이 수정되었습니다.');
      navigate(`/community/${category}/detail/${postId}`);
    } catch (error) {
      console.error('수정 에러:', error);
      if (error.response?.status === 403) {
        alert('본인이 작성한 게시글만 수정할 수 있습니다.');
      } else if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
      } else {
        alert('게시글 수정에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 취소 처리
  const handleCancel = () => {
    if (window.confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
      navigate(-1);
    }
  };

  if (!post) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="board-edit-container">
      <div className="edit-header">
        <h1>게시글 수정</h1>
      </div>

      <div className="write-form">
        {/* 말머리 선택 (공지사항, 먹거리게시판, 질문과답변) */}
        {(post.board === '공지사항' || post.board === '먹거리게시판' || post.board === '질문과답변') && (
          <div className="form-group">
            <label>말머리</label>
            <select
              value={selectedPrefix}
              onChange={(e) => setSelectedPrefix(e.target.value)}
            >
              <option value="">선택안함</option>
              {prefixOptions[post.board]?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )}

        {/* 논문게시판 말머리 */}
        {post.board === '논문게시판' && (
          <>
            <div className="form-group">
              <label>1차 말머리 (내용 성격)</label>
              <select
                value={selectedPrefix}
                onChange={(e) => setSelectedPrefix(e.target.value)}
              >
                <option value="">선택안함</option>
                {prefixOptions['논문게시판']?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>2차 말머리 (변경 유형, 선택)</label>
              <select
                value={selectedSecondPrefix}
                onChange={(e) => setSelectedSecondPrefix(e.target.value)}
              >
                <option value="">선택안함</option>
                <option value="신규">신규</option>
                <option value="수정">수정</option>
                <option value="재업로드">재업로드</option>
                <option value="추가">추가</option>
              </select>
            </div>
          </>
        )}

        {/* 제안서 말머리 */}
        {post.board === '제안서' && (
          <>
            <div className="form-group">
              <label>1차 말머리</label>
              <input type="text" value="제안서" readOnly />
            </div>
            <div className="form-group">
              <label>2차 말머리 (선택)</label>
              <select
                value={selectedSecondPrefix}
                onChange={(e) => setSelectedSecondPrefix(e.target.value)}
              >
                {secondPrefixOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* 회의기록 말머리 */}
        {post.board === '회의기록' && (
          <div className="form-group">
            <label>회의 유형 선택</label>
            <select
              value={selectedPrefix}
              onChange={(e) => setSelectedPrefix(e.target.value)}
            >
              <option value="">회의 유형을 선택해 주세요</option>
              {prefixOptions['회의기록']?.map(option => (
                <option key={option} value={option}>[{option}]</option>
              ))}
            </select>
          </div>
        )}

        {/* 학회공모전 말머리 */}
        {post.board === '학회공모전' && (
          <div className="form-group">
            <label>정보 유형 선택</label>
            <select
              value={selectedPrefix}
              onChange={(e) => setSelectedPrefix(e.target.value)}
            >
              <option value="">정보 유형을 선택해 주세요</option>
              {prefixOptions['학회공모전']?.map(option => (
                <option key={option} value={option}>[{option}]</option>
              ))}
            </select>
          </div>
        )}

        {/* 프라이버시 옵션 섹션 추가 */}
        <div className="privacy-options">
          <h4>게시글 설정</h4>
          <div className="privacy-group">
            <div className="privacy-item">
              <label>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                🔒 비공개 게시글 (나만 볼 수 있음)
              </label>
            </div>
            <div className="privacy-item">
              <label>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                />
                💬 댓글 허용
              </label>
            </div>
          </div>
          {isPrivate && (
            <div className="privacy-notice">
              ⚠️ 비공개 게시글은 작성자만 볼 수 있으며, 다른 사용자에게는 "비공개 게시글입니다"로 표시됩니다.
            </div>
          )}
        </div>

        {/* 제목 */}
        <div className="form-group">
          <label>제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
          />
        </div>

        {/* 에디터 툴바 */}
        <div id="custom-toolbar">
          <span className="ql-formats">
            <select className="ql-header">
              <option value="">일반</option>
              <option value="1">제목1</option>
              <option value="2">제목2</option>
              <option value="3">제목3</option>
            </select>
            <select className="ql-font">
              <option value="">기본폰트</option>
              <option value="notoSansKR">Noto Sans KR</option>
              <option value="nanumGothic">나눔고딕</option>
              <option value="nanumMyeongjo">나눔명조</option>
              <option value="nanumSquare">나눔스퀘어</option>
            </select>
            <select className="ql-size">
              <option value="10px">10px</option>
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
            </select>
          </span>

          <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
            <button className="ql-strike"></button>
          </span>

          <span className="ql-formats">
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
            <button className="ql-indent" value="-1"></button>
            <button className="ql-indent" value="+1"></button>
          </span>

          <span className="ql-formats">
            <select className="ql-align">
              <option value=""></option>
              <option value="center"></option>
              <option value="right"></option>
              <option value="justify"></option>
            </select>
          </span>

          <span className="ql-formats">
            <select className="ql-color"></select>
            <select className="ql-background"></select>
          </span>

          <span className="ql-formats">
            <button className="ql-link"></button>
            <button className="ql-image"></button>
          </span>
        </div>

        {/* 에디터 */}
        <div className="form-group">
          <ReactQuill
            ref={quillRef}
            value={editorContent}
            onChange={setEditorContent}
            modules={modules}
            formats={formats}
            theme="snow"
            placeholder="내용을 입력하세요..."
            style={{ height: '400px', marginBottom: '50px' }}
          />
        </div>

        {/* 첨부파일 영역 */}
        <div className="form-group attachment-section">
          <label>첨부파일</label>
          <FileAttachment
            postId={postId}
            attachments={attachments}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
            onFileDownload={handleFileDownload}
            onAttachmentsUpdate={(updatedAttachments) => setAttachments(updatedAttachments)}
            allowUpload={true}
            allowDelete={true}
            useSecureMode={true}
            isDraftCreating={false}
          />
          {uploadingFiles.length > 0 && (
            <div className="uploading-files">
              {uploadingFiles.map(fileName => (
                <div key={fileName} className="uploading-file">
                  📤 {fileName} 업로드 중...
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼들 */}
        <div className="form-buttons" style={{ marginTop: '50px' }}>
          <button
            onClick={handleCancel}
            className="cancel-btn"
            disabled={loading}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BoardEdit;
