import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CafeWritePost.css';
import LinkModal from './LinkModal';
import FileAttachment from './FileAttachment';
import DraftList from './DraftList';
import { uploadFile } from '../api/attachment';
import { createBoardPost } from '../api/board';
import { saveDraft, getDraft, publishDraft, draftManager } from '../api/draft';
import { setupAITextClipboard } from '../utils/textFormatter';

/* (1) 커스텀 폰트 등록 */
const Font = Quill.import('formats/font');
Font.whitelist = ['notoSansKR', 'nanumGothic', 'nanumMyeongjo', 'nanumSquare'];
Quill.register(Font, true);

/* (2) 글자 크기(size) 커스텀 */
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px'];
Quill.register(Size, true);

function CafeWritePost({ boardList, onSubmit }) {
  // 공지사항 말머리 옵션
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

  // 논문게시판의 2차 말머리 옵션
  const paperSecondPrefixOptions = [
    { value: '', label: '선택안함' },
    { value: '신규', label: '신규' },
    { value: '수정', label: '수정' },
    { value: '재업로드', label: '재업로드' },
    { value: '추가', label: '추가' }
  ];

  const [selectedBoard, setSelectedBoard] = useState('');
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [selectedSecondPrefix, setSelectedSecondPrefix] = useState('');
  const [title, setTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [tags, setTags] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  // 프라이버시 옵션 상태 추가
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  // 첨부파일 관련 상태
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 엔터프라이즈 임시저장 관련 상태
  const [draftId, setDraftId] = useState(null);
  const [isDraftCreated, setIsDraftCreated] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved'); // 'saving', 'saved', 'error'
  const [showDraftList, setShowDraftList] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [refreshDraftList, setRefreshDraftList] = useState(0);

  // 수동 임시저장 생성 (첨부파일 업로드 시 필요)
  const createDraftForFileUpload = async () => {
    if (selectedBoard && !draftId) {
      try {
        // 첨부파일 업로드를 위한 임시저장 생성 중
        const draftResult = await saveDraft({
          board: selectedBoard,
          title: title || '제목 없음',
          content: editorContent || '',
          is_private: isPrivate,
          tags: []
        });

        if (draftResult.success) {
          setDraftId(draftResult.data.id);
          setIsDraftCreated(true);
          draftManager.setDraftId(selectedBoard, draftResult.data.id);
          // 첨부파일용 임시저장 생성 완료

          // 자동저장 시작 (1분 간격)
          draftManager.startAutoSave(draftResult.data.id, () => ({
            title: title,
            content: editorContent
          }), 60000);

          setLastSaved(new Date());
          setAutoSaveStatus('saved');

          // DraftList 새로고침 트리거
          setRefreshDraftList(prev => prev + 1);

          return draftResult.data.id;
        } else {
          throw new Error(draftResult.error || '임시저장 생성 실패');
        }
      } catch (error) {
        console.error('❌ 첨부파일용 임시저장 생성 실패:', error);
        throw error;
      }
    }
    return draftId;
  };

  // Quill ref 및 중복 제출 방지 ref
  const quillRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Quill 에디터에 AI 텍스트 클립보드 처리 기능 추가
  useEffect(() => {
    return setupAITextClipboard(quillRef);
  }, []);

  // 엔터프라이즈 임시저장 자동 생성 (수동 또는 페이지 이탈 시)
  useEffect(() => {
    const loadExistingDraft = async () => {
      // 게시판이 선택되었을 때 기존 임시저장만 확인하고 복원 (자동 생성하지 않음)
      if (selectedBoard && !isDraftCreated && !draftId) {
        try {
          // 기존 임시저장 확인 (같은 게시판)
          const existingDraftId = draftManager.getDraftId(selectedBoard);
          if (existingDraftId) {
            try {
              const existingDraftResult = await getDraft(existingDraftId);
              if (existingDraftResult.success) {
                // 기존 임시저장 복원
                setDraftId(existingDraftId);
                setTitle(existingDraftResult.data.title);
                setEditorContent(existingDraftResult.data.content);
                setIsPrivate(existingDraftResult.data.is_private);
                setIsDraftCreated(true);
                // 기존 임시저장 복원 완료

                // 자동저장 시작
                draftManager.startAutoSave(existingDraftId, () => ({
                  title: title,
                  content: editorContent
                }));
              } else {
                // 기존 임시저장이 유효하지 않으면 제거
                draftManager.removeDraftId(selectedBoard);
              }
            } catch (error) {
              console.warn('임시저장 로드 중 오류 발생:', error);
              // 오류 발생 시 기존 draft ID 제거
              draftManager.removeDraftId(selectedBoard);
            }
          }
        } catch (error) {
          console.error('❌ 임시저장 확인 실패:', error);
        }
      }
    };

    loadExistingDraft();
  }, [selectedBoard, isDraftCreated, draftId, editorContent, title]);

  // 사용자가 타이핑을 시작했을 때 즉시 임시저장 생성
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedBoard && !draftId && (title.trim() || editorContent.trim())) {
        createDraftImmediately();
      }
    }, 2000); // 2초 후 임시저장 생성

    return () => clearTimeout(timer);
  }, [title, editorContent, selectedBoard, draftId]);

  // 즉시 임시저장 생성 (사용자가 작성을 시작했을 때)
  const createDraftImmediately = async () => {
    if (selectedBoard && !draftId) {
      try {
        setAutoSaveStatus('saving');
        const draftResult = await saveDraft({
          board: selectedBoard,
          title: title || '',
          content: editorContent || '',
          is_private: isPrivate,
          tags: []
        });

        if (draftResult.success) {
          setDraftId(draftResult.data.id);
          setIsDraftCreated(true);
          draftManager.setDraftId(selectedBoard, draftResult.data.id);
          console.log(`✅ 즉시 임시저장 생성 완료: ${draftResult.data.id}`);

          // 자동저장 시작 (1분 간격)
          draftManager.startAutoSave(draftResult.data.id, () => ({
            title: title,
            content: editorContent
          }), 60000);

          setLastSaved(new Date());
          setAutoSaveStatus('saved');

          // DraftList 새로고침 트리거
          setRefreshDraftList(prev => prev + 1);

          return draftResult.data.id;
        } else {
          setAutoSaveStatus('error');
          console.error('❌ 즉시 임시저장 생성 실패:', draftResult.error);
        }
      } catch (error) {
        setAutoSaveStatus('error');
        console.error('❌ 즉시 임시저장 생성 실패:', error);
      }
    }
    return draftId;
  };

  // 페이지 이탈 시 임시저장 처리
  const createDraftOnUnload = async () => {
    if (selectedBoard && (title.trim() || editorContent.trim()) && !draftId) {
      try {
        console.log('📝 페이지 이탈 감지 - 임시저장 생성 중...');
        const draftResult = await saveDraft({
          board: selectedBoard,
          title: title,
          content: editorContent,
          is_private: isPrivate,
          tags: []
        });

        if (draftResult.success) {
          setDraftId(draftResult.data.id);
          setIsDraftCreated(true);
          draftManager.setDraftId(selectedBoard, draftResult.data.id);
          console.log(`✅ 페이지 이탈 시 임시저장 완료: ${draftResult.data.id}`);
          return draftResult.data.id;
        }
      } catch (error) {
        console.error('❌ 페이지 이탈 시 임시저장 실패:', error);
      }
    }
    return draftId;
  };

  useEffect(() => {
    let beforeUnloadCleanup = null;

    const setupBeforeUnload = () => {
      // 페이지 이탈 시 임시저장 처리
      const handleBeforeUnload = async (_event) => {
        if (selectedBoard && (title.trim() || editorContent.trim())) {
          // 이미 임시저장이 있으면 업데이트, 없으면 새로 생성
          if (draftId) {
            // 기존 임시저장 업데이트
            try {
              await saveDraft({
                board: selectedBoard,
                title: title,
                content: editorContent,
                is_private: isPrivate,
                tags: []
              });
              console.log('✅ 페이지 이탈 시 임시저장 업데이트 완료');
            } catch (error) {
              console.error('❌ 페이지 이탈 시 임시저장 업데이트 실패:', error);
            }
          } else {
            // 새 임시저장 생성
            await createDraftOnUnload();
          }
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    };

    beforeUnloadCleanup = setupBeforeUnload();

    const handleUnload = () => {
      // 자동저장 타이머 정리
      draftManager.stopAutoSave();

      // 발행된 경우에만 로컬 스토리지에서 draftId 제거
      if (isPublishing && selectedBoard) {
        draftManager.removeDraftId(selectedBoard);
      }
    };

    return () => {
      if (beforeUnloadCleanup) {
        beforeUnloadCleanup();
      }
      handleUnload();
    };
  }, [selectedBoard, title, editorContent, draftId, isPrivate, isPublishing]);

  // 임시저장 선택 처리
  const handleSelectDraft = async (draft) => {
    try {
      setLoadingDraft(true);

      // 현재 작성 중인 내용이 있으면 확인
      if (title.trim() || editorContent.trim()) {
        const confirmed = window.confirm(
          '현재 작성 중인 내용이 있습니다. 임시저장된 글을 불러오시겠습니까?\n(현재 내용은 저장되지 않습니다.)'
        );
        if (!confirmed) {
          setLoadingDraft(false);
          return;
        }
      }

      // 기존 자동저장 중지
      draftManager.stopAutoSave();

      // 임시저장 데이터 로드
      const result = await getDraft(draft.id);
      if (result.success) {
        const draftData = result.data;

        // 폼에 데이터 설정
        setSelectedBoard(draftData.board);
        setTitle(draftData.title);
        setEditorContent(draftData.content);
        setIsPrivate(draftData.is_private);
        setTags(draftData.tags ? draftData.tags.join(' ') : '');

        // 임시저장 상태 설정
        setDraftId(draftData.id);
        setIsDraftCreated(true);
        draftManager.setDraftId(draftData.board, draftData.id);

        // 자동저장 시작
        draftManager.startAutoSave(draftData.id, () => ({
          title: title,
          content: editorContent
        }));

        // 임시저장 목록 닫기
        setShowDraftList(false);

        // console.log(`✅ 임시저장 복원 완료: ${draftData.id}`);
        alert('임시저장된 글을 불러왔습니다.');
      } else {
        alert(result.error || '임시저장을 불러오는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      // console.error('임시저장 로드 실패:', error);
      alert('임시저장을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingDraft(false);
    }
  };

  // Quill modules & formats (툴바 구성)
  const modules = useMemo(() => ({
    toolbar: {
      container: '#custom-toolbar',
      handlers: {
        // 링크 버튼 클릭 시 모달을 오픈
        link: () => setLinkModalOpen(true)
      }
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

  const formats = useMemo(
    () => [
      'header', 'font', 'size',
      'bold', 'italic', 'underline', 'strike',
      'blockquote', 'code-block',
      'list', 'script', 'indent', 'direction',
      'color', 'background', 'align',
      'link', 'image', 'video', 'formula',
      'clean'
    ],
    []
  );

  // 게시판/말머리 선택 핸들러
  const handleBoardChange = (e) => {
    const board = e.target.value;
    setSelectedBoard(board);

    if (board === '공지사항') {
      setSelectedPrefix(prefixOptions['공지사항'][0]);
      setSelectedSecondPrefix('');
    } else if (board === '제안서') {
      setSelectedPrefix('제안서');
      setSelectedSecondPrefix('');
    } else if (board === '논문게시판') {
      setSelectedPrefix(prefixOptions['논문게시판'][0]);
      setSelectedSecondPrefix('');
    } else if (board === '질문과답변') {
      setSelectedPrefix(prefixOptions['질문과답변'][0]);
      setSelectedSecondPrefix('');
    } else {
      setSelectedPrefix('');
      setSelectedSecondPrefix('');
    }
  };

  // 파일 업로드 핸들러 (임시 상태로 추가)
  const handleFileUpload = (file) => {
    const tempId = Date.now() + Math.random();

    // 파일 타입 결정 (확장자 기반)
    const getFileTypeFromName = (fileName) => {
      const ext = fileName.split('.').pop().toLowerCase();
      if (['pdf'].includes(ext)) return 'pdf';
      if (['doc', 'docx'].includes(ext)) return 'word';
      if (['xls', 'xlsx'].includes(ext)) return 'excel';
      if (['ppt', 'pptx'].includes(ext)) return 'powerpoint';
      if (['hwp'].includes(ext)) return 'hwp';
      if (['txt'].includes(ext)) return 'text';
      if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return 'image';
      if (['mp4', 'avi', 'mov'].includes(ext)) return 'video';
      if (['mp3', 'wav'].includes(ext)) return 'audio';
      if (['zip', 'rar', '7z'].includes(ext)) return 'archive';
      return 'other';
    };

    const tempAttachment = {
      id: tempId,
      file: file,
      original_filename: file.name,
      file_size: file.size,
      file_type: getFileTypeFromName(file.name),
      uploading: true
    };

    setUploadingFiles(prev => [...prev, tempAttachment]);
  };

  // 파일 삭제 핸들러 (업로드 전)
  const handleFileDelete = (fileId) => {
    setUploadingFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // 등록 버튼 핸들러
  const handleSubmit = async () => {
    if (!selectedBoard) {
      alert('게시판을 선택하세요.');
      return;
    }
    if (!title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    if (!editorContent.trim()) {
      alert('내용을 입력하세요.');
      return;
    }

    // 즉시적인 중복 체크 (ref 사용)
    if (isSubmittingRef.current) {

      return;
    }

    // 추가 상태 체크
    if (isSubmitting) {
      alert('등록 중입니다.');
      return;
    }

    // 중복 제출 방지 플래그 설정
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setIsPublishing(true); // 발행 시작 즉시 설정하여 cleanup 방지

    let finalPrefix = '';
    if (selectedBoard === '공지사항') {
      if (!selectedPrefix) {
        alert('말머리를 선택하세요.');
        return;
      }
      finalPrefix = selectedPrefix;
    } else if (selectedBoard === '제안서') {
      finalPrefix = '제안서';
      if (selectedSecondPrefix) {
        finalPrefix += ` ${selectedSecondPrefix}`;
      }
    } else if (selectedBoard === '논문게시판') {
      if (!selectedPrefix) {
        alert('1차 말머리를 선택하세요.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      finalPrefix = selectedPrefix;
      if (selectedSecondPrefix) {
        finalPrefix += ` ${selectedSecondPrefix}`;
      }
    } else if (selectedBoard === '질문과답변') {
      if (!selectedPrefix) {
        alert('말머리를 선택하세요.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      finalPrefix = `[${selectedPrefix}]`;
    } else if (selectedBoard === '회의기록') {
      if (!selectedPrefix) {
        alert('회의 유형을 선택하세요.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      finalPrefix = `[${selectedPrefix}]`;
    } else if (selectedBoard === '학회공모전') {
      if (!selectedPrefix) {
        alert('정보 유형을 선택하세요.');
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      finalPrefix = `[${selectedPrefix}]`;
    }

    const tagArr = tags
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t);

    try {
      // 임시저장이 있으면 발행, 없으면 기존 방식으로 게시글 생성
      let createdPost;
      setIsPublishing(true);

      if (draftId && isDraftCreated) {
        // 🎯 엔터프라이즈 임시저장 발행 방식
        // console.log(`📤 엔터프라이즈 임시저장 발행: ${draftId}`);

        // 자동저장 중지
        draftManager.stopAutoSave();

        const publishData = {
          final_title: title,
          final_content: editorContent,
          final_is_private: isPrivate,
          final_tags: tagArr
        };

        const publishResult = await publishDraft(draftId, publishData);

        if (publishResult.success) {
          createdPost = {
            id: publishResult.data.post_id,
            title: title,
            content: editorContent,
            board: selectedBoard,
            is_private: isPrivate,
            tags: tagArr
          };

          // console.log(`✅ 엔터프라이즈 임시저장 발행 성공: ${publishResult.data.post_id}`);

          // 발행 성공 후 로컬 스토리지에서 임시저장 ID 제거
          draftManager.removeDraftId(selectedBoard);

          // 상태 정리
          setIsDraftCreated(false);
          setDraftId(null);
        } else {
          throw new Error(publishResult.error);
        }

        // 🔒 엔터프라이즈 임시저장 발행 후 첨부파일 업로드 처리
        if (uploadingFiles.length > 0 && createdPost?.id) {
          console.log(`📎 엔터프라이즈 발행 후 보안 첨부파일 업로드 진행: ${uploadingFiles.length}개`);

          let uploadFailures = 0;
          for (const file of uploadingFiles) {
            try {
              await uploadFile(createdPost.id, file.file);
              console.log(`✅ 파일 업로드 성공: ${file.original_filename}`);
            } catch (error) {
              console.error('파일 업로드 실패:', error);
              uploadFailures++;
            }
          }

          if (uploadFailures > 0) {
            alert(`${uploadFailures}개의 파일 업로드에 실패했습니다. 게시글은 생성되었습니다.`);
          } else {
            console.log('✅ 모든 파일 업로드 완료');
          }
        }
      } else {
        // 🔄 기존 방식 (임시저장 생성 실패 시 폴백)
        // console.log(`📝 기존 방식으로 게시글 생성`);

        const postData = {
          prefix: finalPrefix,
          title,
          content: editorContent,
          tags: tagArr,
          is_private: isPrivate,
          allow_comments: allowComments
        };

        createdPost = await createBoardPost(selectedBoard, postData);

        // 보안 첨부파일 업로드 진행
        if (uploadingFiles.length > 0) {
          console.log(`📎 보안 첨부파일 업로드 진행: ${uploadingFiles.length}개`);

          let uploadFailures = 0;
          for (const file of uploadingFiles) {
            try {
              await uploadFile(createdPost.id, file.file);
              console.log(`✅ 파일 업로드 성공: ${file.original_filename}`);
            } catch (error) {
              console.error('파일 업로드 실패:', error);
              uploadFailures++;
            }
          }

          if (uploadFailures > 0) {
            alert(`${uploadFailures}개의 파일 업로드에 실패했습니다. 게시글은 생성되었습니다.`);
          } else {
            console.log('✅ 모든 파일 업로드 완료');
          }
        }
      }

      // 성공 메시지
      alert('게시글이 등록되었습니다.');

      // 기존 onSubmit 호출 (부모 컴포넌트에서 페이지 이동 등 처리)
      if (onSubmit) {
        onSubmit(createdPost);
      }

      // 폼 초기화
      setSelectedBoard('');
      setSelectedPrefix('');
      setSelectedSecondPrefix('');
      setTitle('');
      setEditorContent('');
      setTags('');
      setUploadingFiles([]);
      setIsPrivate(false);
      setAllowComments(true);

      // 임시저장 상태 초기화
      setDraftId(null);
      setIsDraftCreated(false);
      setLastSaved(null);
      setAutoSaveStatus('saved');

      // 자동저장 중지
      draftManager.stopAutoSave();
      setIsPublishing(false);

    } catch (error) {

      alert('게시글 등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      // 중복 제출 방지 플래그 해제
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // 링크 삽입 핸들러 (유튜브, 비메오 자동 임베드 포함)
  const handleInsertLink = (url) => {
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();
    const range = editor.getSelection() || { index: editor.getLength(), length: 0 };

    if (range.length > 0) {
      editor.deleteText(range.index, range.length);
    }
    // 유튜브, 비메오 자동 임베드
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.includes('watch?v=')
        ? url.split('watch?v=')[1].split('&')[0]
        : url.split('youtu.be/')[1].split('?')[0];
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const embedHtml = `<iframe width="560" height="315" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
      editor.clipboard.dangerouslyPasteHTML(range.index, embedHtml);
    } else if (url.includes('vimeo.com/')) {
      const vimeoId = url.split('vimeo.com/')[1].split(/[?/]/)[0];
      const embedUrl = `https://player.vimeo.com/video/${vimeoId}`;
      const embedHtml = `<iframe width="560" height="315" src="${embedUrl}" frameborder="0" allowfullscreen></iframe>`;
      editor.clipboard.dangerouslyPasteHTML(range.index, embedHtml);
    } else {
      // 일반 링크
      editor.insertText(range.index, url, 'link', url);
      editor.setSelection(range.index + url.length, 0);
    }
  };

  return (
    <div className="cafe-write-container">
      {/* 헤더 */}
      <div className="header-bar">
        <div className="header-left">
          <span>글쓰기</span>
          {isDraftCreated && (
            <span className="draft-indicator">
              📝 임시저장됨
              {autoSaveStatus === 'saving' && <span className="saving">저장 중...</span>}
              {autoSaveStatus === 'saved' && lastSaved && (
                <span className="saved">마지막 저장: {new Date(lastSaved).toLocaleTimeString()}</span>
              )}
            </span>
          )}
        </div>
        <div className="header-right">
          <button
            type="button"
            className="draft-list-btn"
            onClick={() => setShowDraftList(!showDraftList)}
            title="임시저장 목록"
          >
            📄 임시저장
          </button>
          <button
            type="button"
            className="header-submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || loadingDraft}
          >
            {isSubmitting ? '등록 중...' : loadingDraft ? '불러오는 중...' : '등록'}
          </button>
        </div>
      </div>
      <hr className="header-line" />

      {/* 임시저장 목록 */}
      {showDraftList && (
        <div className="draft-list-container">
          <DraftList
            onSelectDraft={handleSelectDraft}
            selectedBoard={selectedBoard}
            refreshTrigger={refreshDraftList}
          />
        </div>
      )}

      {/* 폼 영역 */}
      <div className="cafe-write-form">
        {/* 상단 영역: 게시판, 말머리, 제목 */}
        <div className="top-area">
          <div className="board-prefix-wrap">
            <div className="input-group board-select">
              <label>게시판 선택</label>
              <select value={selectedBoard} onChange={handleBoardChange} required>
                <option value="">게시판을 선택해 주세요.</option>
                {boardList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {selectedBoard === '공지사항' && (
              <div className="input-group prefix-select">
                <label>말머리 선택</label>
                <select
                  value={selectedPrefix}
                  onChange={(e) => setSelectedPrefix(e.target.value)}
                  required
                >
                  {prefixOptions['공지사항'].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBoard === '제안서' && (
              <>
                <div className="input-group prefix-input">
                  <label>1차 말머리</label>
                  <input type="text" value="제안서" readOnly />
                </div>
                <div className="input-group prefix-select">
                  <label>2차 말머리 (선택)</label>
                  <select
                    value={selectedSecondPrefix}
                    onChange={(e) => setSelectedSecondPrefix(e.target.value)}
                  >
                    {secondPrefixOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {selectedBoard === '논문게시판' && (
              <>
                <div className="input-group prefix-select">
                  <label>1차 말머리 (내용 성격)</label>
                  <select
                    value={selectedPrefix}
                    onChange={(e) => setSelectedPrefix(e.target.value)}
                    required
                  >
                    {prefixOptions['논문게시판'].map((opt) => (
                      <option key={opt} value={opt}>
                        [{opt}]
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group prefix-select">
                  <label>2차 말머리 (변경 유형, 선택)</label>
                  <select
                    value={selectedSecondPrefix}
                    onChange={(e) => setSelectedSecondPrefix(e.target.value)}
                  >
                    {paperSecondPrefixOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {selectedBoard === '질문과답변' && (
              <div className="input-group prefix-select">
                <label>말머리 선택</label>
                <select
                  value={selectedPrefix}
                  onChange={(e) => setSelectedPrefix(e.target.value)}
                  required
                >
                  {prefixOptions['질문과답변'].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBoard === '회의기록' && (
              <div className="input-group prefix-select">
                <label>회의 유형 선택</label>
                <select
                  value={selectedPrefix}
                  onChange={(e) => setSelectedPrefix(e.target.value)}
                  required
                >
                  <option value="">회의 유형을 선택해 주세요</option>
                  {prefixOptions['회의기록'].map((opt) => (
                    <option key={opt} value={opt}>
                      [{opt}]
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedBoard === '학회공모전' && (
              <div className="input-group prefix-select">
                <label>정보 유형 선택</label>
                <select
                  value={selectedPrefix}
                  onChange={(e) => setSelectedPrefix(e.target.value)}
                  required
                >
                  <option value="">정보 유형을 선택해 주세요</option>
                  {prefixOptions['학회공모전'].map((opt) => (
                    <option key={opt} value={opt}>
                      [{opt}]
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

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

          <div className="title-box">
            <input
              type="text"
              placeholder="제목을 입력해 주세요."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        {/* 커스텀 툴바 - 1차 도구와 2차 도구로 그룹화 */}
        <div id="custom-toolbar">
          {/* 1차 도구 (기본 인라인 스타일 및 링크 커스텀) */}
          <div className="toolbar-line file-tools">
            <span className="ql-formats">
              <select className="ql-font" defaultValue="notoSansKR">
                <option value="notoSansKR">기본서체</option>
                <option value="nanumGothic">나눔고딕</option>
                <option value="nanumMyeongjo">나눔명조</option>
                <option value="nanumSquare">나눔스퀘어</option>
              </select>
              <select className="ql-size" defaultValue="14px">
                <option value="10px">10pt</option>
                <option value="12px">12pt</option>
                <option value="14px">14pt</option>
                <option value="16px">16pt</option>
                <option value="18px">18pt</option>
                <option value="20px">20pt</option>
              </select>
              <select className="ql-header" defaultValue="">
                <option value="">본문</option>
                <option value="1">제목1</option>
                <option value="2">제목2</option>
              </select>
              <button className="ql-bold" />
              <button className="ql-italic" />
              <button className="ql-underline" />
              <button className="ql-strike" />
              <button className="ql-link" />
            </span>
          </div>

          {/* 2차 도구 (본문 관련 추가 서식) */}
          <div className="toolbar-line text-tools">
            <span className="ql-formats">
              <button className="ql-blockquote" />
              <button className="ql-code-block" />
              <button className="ql-list" value="ordered" />
              <button className="ql-list" value="bullet" />
              <button className="ql-script" value="sub" />
              <button className="ql-script" value="super" />
              <button className="ql-indent" value="-1" />
              <button className="ql-indent" value="+1" />
              <select className="ql-direction" />
              <select className="ql-color" />
              <select className="ql-background" />
              <select className="ql-align" />
              <button className="ql-image" />
              <button className="ql-video" />
              <button className="ql-formula" />
              <button className="ql-clean" />
            </span>
          </div>
        </div>

        {/* 본문(ReactQuill) 영역 + 태그 영역 */}
        <div className="quill-wrap">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={editorContent}
            onChange={setEditorContent}
            modules={modules}
            formats={formats}
            placeholder="내용을 입력하세요."
          />

          <div className="tag-area">
            <label>태그 (예: #태그1 #태그2)</label>
            <input
              type="text"
              placeholder="#태그 입력 (공백으로 구분)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* 첨부파일 영역 */}
          <div className="attachment-area">
            <FileAttachment
              postId={draftId} // 👈 Draft ID 전달
              attachments={uploadingFiles.map(file => ({
                id: file.id,
                original_filename: file.original_filename,
                file_size: file.file_size,
                file_type: file.file_type,
                uploading: file.uploading
              }))}
              onFileUpload={handleFileUpload}
              onFileDelete={handleFileDelete}
              allowUpload={true}
              isDraftCreating={selectedBoard && !draftId} // 👈 Draft ID가 없을 때만 생성 중으로 표시
              onCreateDraft={createDraftForFileUpload} // 👈 임시저장 생성 함수 전달
              allowDelete={true}
              useSecureMode={true} // 보안 모드 활성화
            />
          </div>
        </div>
      </div>

      {/* Link Modal (링크 커스텀 유지) */}
      <LinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onInsert={handleInsertLink}
      />
    </div>
  );
}

export default CafeWritePost;
