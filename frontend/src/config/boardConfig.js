/**
 * 게시판 통합 설정 파일
 * 새로운 게시판 추가 시 이 파일에만 추가하면 됩니다.
 * 네이버 카페와 같은 확장 가능한 구조
 */

export const BOARD_CONFIG = {
  // 자유게시판 카테고리
  '자유게시판': {
    name: '자유게시판',
    title: '자유게시판',
    description: '자유롭게 이야기를 나누는 공간입니다.',
    apiCategory: '자유게시판',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/community/자유게시판',
    detailPath: '/community/자유게시판/detail',
    editPath: '/community/자유게시판/edit'
  },

  // 음식게시판
  '음식게시판': {
    name: '음식게시판',
    title: '음식게시판',
    description: '맛있는 음식 정보를 공유하는 공간입니다.',
    apiCategory: '음식게시판',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/community/음식게시판',
    detailPath: '/community/음식게시판/detail',
    editPath: '/community/음식게시판/edit'
  },

  // 연구자료게시판
  '연구자료': {
    name: '연구자료',
    title: '연구자료 게시판',
    description: '연구 자료를 공유하는 공간입니다.',
    apiCategory: '연구자료',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/research/연구자료',
    detailPath: '/research/연구자료/detail',
    editPath: '/research/연구자료/edit'
  },

  // 제출자료게시판
  '제출자료': {
    name: '제출자료',
    title: '제출자료 게시판',
    description: '과제 및 보고서를 제출하는 공간입니다.',
    apiCategory: '제출자료',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/research/제출자료',
    detailPath: '/research/제출자료/detail',
    editPath: '/research/제출자료/edit'
  },

  // 제안서게시판
  '제안서': {
    name: '제안서',
    title: '제안서 게시판',
    description: '연구 제안서를 공유하는 공간입니다.',
    apiCategory: '제안서',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/research/제안서',
    detailPath: '/research/제안서/detail',
    editPath: '/research/제안서/edit'
  },

  // 공지사항
  '공지사항': {
    name: '공지사항',
    title: '공지사항',
    description: '중요한 공지사항을 확인하는 공간입니다.',
    apiCategory: '공지사항',
    hasFileColumn: true,
    allowAnonymous: true,
    features: {
      write: false, // 관리자만
      comment: true,
      like: false,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'content'],
    routePath: '/board/공지사항',
    detailPath: '/board/공지사항/detail',
    editPath: '/board/공지사항/edit'
  },

  // 뉴스
  '뉴스': {
    name: '뉴스',
    title: '뉴스',
    description: '최신 뉴스를 확인하는 공간입니다.',
    apiCategory: '뉴스',
    hasFileColumn: true,
    allowAnonymous: true,
    features: {
      write: false, // 관리자만
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'content'],
    routePath: '/board/뉴스',
    detailPath: '/board/뉴스/detail',
    editPath: '/board/뉴스/edit'
  },

  // 논문게시판
  '논문게시판': {
    name: '논문게시판',
    title: '논문게시판',
    description: '논문 관련 자료를 공유하고 관리하는 공간입니다.',
    apiCategory: '논문게시판',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/research/논문게시판',
    detailPath: '/research/논문게시판/detail',
    editPath: '/research/논문게시판/edit'
  },

  // Q&A 게시판
  '질문과답변': {
    name: '질문과답변',
    title: '질문과 답변',
    description: '궁금한 것을 자유롭게 질문하고 답변하는 공간입니다.',
    apiCategory: '질문과답변',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/community/질문과답변',
    detailPath: '/community/질문과답변/detail',
    editPath: '/community/질문과답변/edit',
    // Q&A 전용 말머리 설정
    prefixes: ['[질문합니다]', '[도와주세요]', '[궁금합니다]', '[공유해요]', '[해결됨]'],
    prefixDescriptions: {
      '[질문합니다]': '일반적인 질문(연구실 규칙, 장비 사용법, 정보 요청)',
      '[도와주세요]': '급한 상황/문제 해결 요청',
      '[궁금합니다]': '단순 호기심, 토론 주제',
      '[공유해요]': '답변 대신 유용한 정보나 팁 공유',
      '[해결됨]': '질문 해결 후 글쓴이가 직접 말머리 변경'
    }
  },

  // 회의기록 게시판
  '회의기록': {
    name: '회의기록',
    title: '회의기록 게시판',
    description: '연구실 회의 및 미팅 기록을 관리하는 공간입니다.',
    apiCategory: '회의기록',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: false,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/board/회의기록',
    detailPath: '/board/회의기록/detail',
    editPath: '/board/회의기록/edit',
    // 회의기록 전용 말머리 설정
    prefixes: ['[정기회의]', '[프로젝트회의]', '[논문회의]', '[세미나/스터디]', '[긴급회의]'],
    prefixDescriptions: {
      '[정기회의]': '연구실 정기 미팅 기록(주간/월간 정기 보고)',
      '[프로젝트회의]': '과제, 프로젝트별 진행 회의(특정 연구과제 진행상황 기록)',
      '[논문회의]': '논문 관련 회의(초안 피드백, 진행 상황)',
      '[세미나/스터디]': '스터디, 세미나 관련 논의 기록',
      '[긴급회의]': '급하게 소집된 회의 기록'
    }
  },

  // 학회/공모전 정보 게시판
  '학회공모전': {
    name: '학회공모전',
    title: '학회/공모전 정보',
    description: '학회 정보와 공모전 소식을 공유하는 공간입니다.',
    apiCategory: '학회공모전',
    hasFileColumn: true,
    allowAnonymous: false,
    features: {
      write: true,
      comment: true,
      like: true,
      search: true,
      attachment: true
    },
    searchFilters: ['all', 'title', 'writer', 'content'],
    routePath: '/community/학회공모전',
    detailPath: '/community/학회공모전/detail',
    editPath: '/community/학회공모전/edit',
    // 학회/공모전 전용 말머리 설정
    prefixes: ['[학회정보]', '[공모전정보]', '[투고마감임박]', '[참석후기]', '[자료공유]'],
    prefixDescriptions: {
      '[학회정보]': '국내·국제 학회 일정, 발표 관련',
      '[공모전정보]': '논문 공모전, 연구 경진대회 소식',
      '[투고마감임박]': '학회/저널 제출 마감 임박 알림(시급성 강조)',
      '[참석후기]': '학회/공모전 참석 후기, 경험 공유',
      '[자료공유]': '학회 발표 자료, 공모전 준비 팁 공유'
    }
  }
};

/**
 * 게시판 타입으로 설정 조회
 * @param {string} boardType - 게시판 타입
 * @returns {Object|null} 게시판 설정
 */
export const getBoardConfig = (boardType) => {
  return BOARD_CONFIG[boardType] || null;
};

/**
 * 모든 게시판 목록 조회
 * @returns {Array} 게시판 목록
 */
export const getAllBoards = () => {
  return Object.keys(BOARD_CONFIG);
};

/**
 * 카테고리별 게시판 그룹 조회
 * @returns {Object} 카테고리별 게시판 그룹
 */
export const getBoardsByCategory = () => {
  return {
    community: ['자유게시판', '음식게시판', '질문과답변', '학회공모전'],
    research: ['연구자료', '제출자료', '제안서', '논문게시판'],
    notice: ['공지사항', '뉴스', '회의기록']
  };
};
