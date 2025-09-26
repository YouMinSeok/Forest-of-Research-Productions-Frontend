// src/pages/CafePage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CafePage.css';

function CafePage() {
  const navigate = useNavigate();

  // 전체 게시글 (board='연구') 저장
  const [researchAll, setResearchAll] = useState([]);

  // 처음에 board="연구" 글 전부 가져오기
  useEffect(() => {
    async function fetchResearch() {
      try {
        const response = await api.get('/api/board/', { params: { category: '연구' } });
        // API 응답이 { posts: [...], pagination: {...} } 형태인지 확인
        const data = response.data;
        if (data.posts && Array.isArray(data.posts)) {
          setResearchAll(data.posts);
        } else if (Array.isArray(data)) {
          setResearchAll(data);
        } else {
          setResearchAll([]);
        }
      } catch (error) {
        setResearchAll([]);
      }
    }
    fetchResearch();
  }, []);

  // 모든 게시글 표시 (페이지네이션 없이)
  const currentPosts = Array.isArray(researchAll) ? researchAll : [];

  // 2컬럼 분할 (전체 게시글)
  const leftItems = currentPosts.slice(0, Math.ceil(currentPosts.length / 2));
  const rightItems = currentPosts.slice(Math.ceil(currentPosts.length / 2));

  // 게시글 클릭 → 상세 페이지 이동
  const handlePostClick = (post) => {
    const sc = post.subcategory || '연구자료';
    navigate(`/research/${sc}/detail/${post.id}`, { state: { post } });
  };

  return (
    <div className="cafe-wrapper">
      {/* 2컬럼 게시판 */}
      <div className="board-lr-container">
        <ul className="board-list left">
          {leftItems.map(post => (
            <li
              key={post.id}
              className="board-list-item"
              onClick={() => handlePostClick(post)}
            >
              <span className="board-title">
                {post.prefix ? post.prefix + ' ' : ''}
                {post.title}
              </span>
            </li>
          ))}
        </ul>
        <ul className="board-list right">
          {rightItems.map(post => (
            <li
              key={post.id}
              className="board-list-item"
              onClick={() => handlePostClick(post)}
            >
              <span className="board-title">
                {post.prefix ? post.prefix + ' ' : ''}
                {post.title}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CafePage;
