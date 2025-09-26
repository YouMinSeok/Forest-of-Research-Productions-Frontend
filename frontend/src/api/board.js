// api/board.js
import api from '../services/api';

// 게시판 글 목록 가져오기 API - 독립성 보장
export const fetchBoardPosts = async (boardType, page = 1, limit = 30, forceRefresh = false) => {
  try {
    // 삭제 타임스탬프 확인 - 최근 삭제가 있었다면 강제 새로고침
    const lastDeleteTimestamp = localStorage.getItem('last_delete_timestamp');
    const lastFetchKey = `last_fetch_${boardType}`;
    const lastFetchTime = localStorage.getItem(lastFetchKey);

    const shouldForceRefresh = forceRefresh ||
      (lastDeleteTimestamp && lastFetchTime &&
       parseInt(lastDeleteTimestamp) > parseInt(lastFetchTime));

    // 캐시 무효화를 위한 타임스탬프 추가
    const params = {
      category: boardType,
      page: page.toString(),
      limit: limit.toString()
    };

    // 강제 새로고침이 필요한 경우 타임스탬프 추가
    if (shouldForceRefresh) {
      params._t = Date.now().toString();
      console.log(`🔄 강제 새로고침 감지: ${boardType} (삭제 감지: ${!!lastDeleteTimestamp})`);
    }

    console.log(`🔍 API 호출: ${boardType} 게시판 (페이지: ${page}, 강제새로고침: ${shouldForceRefresh})`);

    // 현재 fetch 시간 기록
    localStorage.setItem(lastFetchKey, Date.now().toString());

    const response = await api.get('/api/board/', { params });

    const data = response.data;

    // 응답 데이터 구조 검증
    if (data.posts && Array.isArray(data.posts)) {
      console.log(`✅ ${boardType} 게시판 데이터 로드 성공: ${data.posts.length}개 게시물`);
      return {
        posts: data.posts,
        pagination: data.pagination || {
          totalPosts: data.posts.length,
          currentPage: page,
          totalPages: Math.ceil(data.posts.length / limit)
        }
      };
    } else if (Array.isArray(data)) {
      // 구형 API 응답 형식 호환
      console.log(`✅ ${boardType} 게시판 데이터 로드 성공 (구형): ${data.length}개 게시물`);
      return {
        posts: data,
        pagination: {
          totalPosts: data.length,
          currentPage: page,
          totalPages: Math.ceil(data.length / limit)
        }
      };
    } else {
      console.warn(`⚠️ ${boardType} 게시판 응답 형식 오류:`, data);
      return { posts: [], pagination: null };
    }
  } catch (error) {
    console.error(`❌ ${boardType} 게시판 로딩 실패:`, error.response?.data || error.message);

    // 네트워크 오류 vs 서버 오류 구분
    if (error.response?.status === 404) {
      throw new Error(`${boardType} 게시판을 찾을 수 없습니다.`);
    } else if (error.response?.status >= 500) {
      throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('네트워크 연결을 확인해주세요.');
    } else {
      throw error;
    }
  }
};

// 새 게시글 생성 (로그인 필요)
export const createBoardPost = async (boardType, postData) => {
  try {
    const response = await api.post('/api/board/create', {
      board: boardType,
      ...postData,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating board post:", error.response?.data || error.message);
    throw error;
  }
};

// 단일 게시글 조회 (postId로)
export const fetchBoardPost = async (postId) => {
  try {
    const response = await api.get(`/api/board/${postId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching single board post:", error.response?.data || error.message);
    throw error;
  }
};

// 조회수 증가
export const incrementBoardView = async (postId) => {
  try {
    const response = await api.post(`/api/board/${postId}/view`);
    return response.data;
  } catch (error) {
    console.error("Error incrementing view count:", error.response?.data || error.message);
    throw error;
  }
};

// 좋아요 증가
export const likeBoardPost = async (postId) => {
  try {
    const response = await api.post(`/api/board/${postId}/like`);
    const data = response.data;

    // 백엔드에서 로그인이 필요한 경우
    if (data.require_login || data.likeStatus === 'login_required') {
      return {
        success: false,
        requireLogin: true,
        message: data.message || "좋아요 기능을 사용하려면 로그인이 필요합니다.",
        likeStatus: data.likeStatus
      };
    }

    // 성공적인 좋아요/좋아요 취소
    return {
      success: true,
      likeStatus: data.likeStatus,
      message: data.message,
      requireLogin: false
    };
  } catch (error) {
    console.error("Error liking board post:", error.response?.data || error.message);

    // 403 에러인 경우 로그인 필요로 처리
    if (error.response?.status === 403) {
      return {
        success: false,
        requireLogin: true,
        message: "좋아요 기능을 사용하려면 로그인이 필요합니다.",
        likeStatus: 'login_required'
      };
    }

    throw error;
  }
};

// 게시글 수정
export const updateBoardPost = async (postId, updateData) => {
  try {
    const response = await api.put(`/api/board/${postId}`, updateData);
    return response.data;
  } catch (error) {
    console.error("Error updating board post:", error.response?.data || error.message);
    throw error;
  }
};

// 게시글 삭제
export const deleteBoardPost = async (postId) => {
  try {
    console.log(`🗑️ 게시글 삭제 시작: ${postId}`);
    const response = await api.delete(`/api/board/${postId}`);

    // 삭제 성공 시 모든 관련 캐시 무효화
    try {
      // localStorage에서 게시판 관련 캐시 제거
      const localKeys = Object.keys(localStorage);
      localKeys.forEach(key => {
        if (key.includes('board_posts') ||
            key.includes('board_cache') ||
            key.includes('_postsPerPage') ||
            key.includes('_sortOrder') ||
            key.includes('api_cache_board')) {
          localStorage.removeItem(key);
          console.log(`🧹 localStorage 캐시 제거: ${key}`);
        }
      });

      // sessionStorage에서 게시판 관련 캐시 제거
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('board_posts') ||
            key.includes('board_cache') ||
            key.includes('api_cache_board')) {
          sessionStorage.removeItem(key);
          console.log(`🧹 sessionStorage 캐시 제거: ${key}`);
        }
      });

      // API 캐시 헤더 무효화를 위한 타임스탬프 업데이트
      localStorage.setItem('last_delete_timestamp', Date.now().toString());

      console.log(`✅ 게시글 삭제 및 캐시 무효화 완료: ${postId}`);
    } catch (cacheError) {
      console.warn('⚠️ 캐시 무효화 중 오류 (삭제는 성공):', cacheError);
    }

    return response.data;
  } catch (error) {
    console.error("❌ 게시글 삭제 실패:", error.response?.data || error.message);
    throw error;
  }
};

// ===== Draft Post 시스템 =====

// Draft 게시글 생성
export const createDraftPost = async (boardType, draftData = {}) => {
  try {
    console.log(`📝 Draft 게시글 생성: ${boardType}`);
    const response = await api.post('/api/board/draft', {
      board: boardType,
      ...draftData
    });
    console.log(`✅ Draft 생성 성공: ${response.data.post_id}`);
    return response.data;
  } catch (error) {
    console.error("❌ Draft 게시글 생성 실패:", error.response?.data || error.message);
    throw error;
  }
};

// Draft 게시글을 발행 상태로 변경
export const publishDraftPost = async (postId, postData) => {
  try {
    console.log(`📤 Draft 게시글 발행: ${postId}`);
    const response = await api.patch(`/api/board/${postId}/publish`, postData);
    console.log(`✅ 게시글 발행 성공: ${response.data.post_number}`);
    return response.data;
  } catch (error) {
    console.error("❌ 게시글 발행 실패:", error.response?.data || error.message);
    throw error;
  }
};

// Draft 게시글 삭제
export const deleteDraftPost = async (postId) => {
  try {
    console.log(`🗑️ Draft 게시글 삭제: ${postId}`);
    const response = await api.delete(`/api/board/${postId}/draft`);
    console.log(`✅ Draft 삭제 성공`);
    return response.data;
  } catch (error) {
    console.error("❌ Draft 게시글 삭제 실패:", error.response?.data || error.message);
    throw error;
  }
};

// 사용자의 Draft 게시글 목록 조회
export const fetchUserDrafts = async () => {
  try {
    console.log(`📋 사용자 Draft 목록 조회`);
    const response = await api.get('/api/board/drafts');
    console.log(`✅ Draft 목록 조회 성공: ${response.data.count}개`);
    return response.data;
  } catch (error) {
    console.error("❌ Draft 목록 조회 실패:", error.response?.data || error.message);
    throw error;
  }
};
