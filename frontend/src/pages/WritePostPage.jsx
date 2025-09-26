import React from 'react';
import { useNavigate } from 'react-router-dom';
import CafeWritePost from '../components/CafeWritePost';

function WritePostPage() {
  const navigate = useNavigate();

  // 전체 게시판 목록
  const allBoardList = [
    '공지사항',
    '뉴스',
    '회의기록',
    '연구자료',
    '제출자료',
    '제안서',
    '자유게시판',
    '음식게시판',
    '논문게시판',
    '질문과답변',
    '학회공모전'
  ];

  const handleWriteSubmit = async (newPost) => {
    try {
      // CafeWritePost에서 이미 게시글을 생성했으므로 여기서는 페이지 이동만 처리

      // 작성 완료 후 해당 게시판으로 이동
      if (newPost.board === '공지사항') {
        navigate('/board/공지사항');
      } else if (newPost.board === '뉴스') {
        navigate('/board/뉴스');
      } else if (newPost.board === '회의기록') {
        navigate('/board/회의기록');
      } else if (newPost.board === '연구자료') {
        navigate('/research/연구자료');
      } else if (newPost.board === '제출자료') {
        navigate('/research/제출자료');
      } else if (newPost.board === '제안서') {
        navigate('/research/제안서');
      } else if (newPost.board === '자유게시판') {
        navigate('/community/자유게시판');
      } else if (newPost.board === '음식게시판') {
        navigate('/community/음식게시판');
      } else if (newPost.board === '논문게시판') {
        navigate('/research/논문게시판');
      } else if (newPost.board === '질문과답변') {
        navigate('/community/질문과답변');
      } else if (newPost.board === '학회공모전') {
        navigate('/community/학회공모전');
      }

    } catch (error) {
      alert('글 작성에 실패했습니다.');
    }
  };

  return (
    <div className="write-post-page">
      <CafeWritePost
        boardList={allBoardList}
        onSubmit={handleWriteSubmit}
      />
    </div>
  );
}

export default WritePostPage;
