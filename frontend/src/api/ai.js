import api from '../services/api';
import { getCookie } from '../services/auth';

const AI_BASE_URL = '/api/ai';

export const aiApi = {
  // AI 채팅
  chat: async (message, conversationId = null) => {
    try {
      const response = await api.post(`${AI_BASE_URL}/chat`, {
        message,
        conversation_id: conversationId
      });
      return response.data;
    } catch (error) {
      console.error('AI 채팅 요청 실패:', error);
      throw error;
    }
  },

  // AI 스트리밍 채팅 (Server-Sent Events)
  chatStream: async (message, conversationId = null, onToken, onComplete, onError) => {
    try {
      // 토큰 가져오기 (api.js와 동일한 방식)
      const token = sessionStorage.getItem('access_token') ||
                    localStorage.getItem('access_token') ||
                    getCookie('access_token');

      if (!token) {
        throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
      }

      // 상대 경로 사용 (nginx 프록시를 통해 접근)

      const response = await fetch(`${AI_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          conversation_id: conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE 데이터 파싱
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 마지막 불완전한 라인은 buffer에 보관

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  onError?.(data.error);
                  return;
                }

                if (data.token) {
                  // 토큰별 스트리밍
                  onToken?.(data.token, data.message, data);
                } else if (data.done) {
                  // 완료
                  onComplete?.(data);
                  return;
                }
              } catch (parseError) {
                console.error('SSE 데이터 파싱 오류:', parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('AI 스트리밍 채팅 요청 실패:', error);
      onError?.(error.message);
      throw error;
    }
  },

  // 지식베이스 게시글 검색
  searchKnowledgeBase: async (query = '', limit = 10) => {
    try {
      const response = await api.get(`${AI_BASE_URL}/knowledge-base/posts`, {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      console.error('지식베이스 검색 실패:', error);
      throw error;
    }
  },

  // 지식베이스 요약 정보
  getKnowledgeBaseSummary: async () => {
    try {
      const response = await api.get(`${AI_BASE_URL}/knowledge-base/summary`);
      return response.data;
    } catch (error) {
      console.error('지식베이스 요약 조회 실패:', error);
      throw error;
    }
  },

  // AI 질문 제안
  getSuggestions: async () => {
    try {
      const response = await api.get(`${AI_BASE_URL}/suggestions`);
      return response.data;
    } catch (error) {
      console.error('AI 제안 조회 실패:', error);
      throw error;
    }
  }
};
