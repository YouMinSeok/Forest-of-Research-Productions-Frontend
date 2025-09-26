// 사용자 권한 체크 유틸리티

export const PermissionType = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
  MANAGE_USERS: 'manage_users',
  MANAGE_BOARDS: 'manage_boards',
  MANAGE_BANNERS: 'manage_banners',
  MANAGE_RESEARCH: 'manage_research'
};

export const UserRole = {
  ADMIN: 'admin',
  PROFESSOR: 'professor',
  STUDENT: 'student',
  GUEST: 'guest'
};

// 역할별 기본 권한
const DEFAULT_PERMISSIONS = {
  [UserRole.ADMIN]: [
    PermissionType.READ,
    PermissionType.WRITE,
    PermissionType.DELETE,
    PermissionType.ADMIN,
    PermissionType.MANAGE_USERS,
    PermissionType.MANAGE_BOARDS,
    PermissionType.MANAGE_BANNERS,
    PermissionType.MANAGE_RESEARCH
  ],
  [UserRole.PROFESSOR]: [
    PermissionType.READ,
    PermissionType.WRITE,
    PermissionType.MANAGE_RESEARCH,
    PermissionType.MANAGE_BOARDS
  ],
  [UserRole.STUDENT]: [
    PermissionType.READ,
    PermissionType.WRITE
  ],
  [UserRole.GUEST]: [
    PermissionType.READ
  ]
};

/**
 * 간단한 권한 체크를 위한 헬퍼 함수 (백엔드와 일치)
 * @param {object} user - 사용자 객체
 * @returns {object} 권한 정보
 */
export const checkSimplePermissions = (user) => {
  if (!user) {
    return {
      is_admin: false,
      has_manage_boards: false,
      has_manage_users: false,
      can_write: false,
      can_read: true
    };
  }

  const is_admin = (
    user.is_admin ||
    (user.role && user.role.toLowerCase() === 'admin')
  );

  const user_role = user.role ? user.role.toLowerCase() : 'student';
  const has_manage_boards = ['admin', 'professor'].includes(user_role) || is_admin;
  const has_manage_users = ['admin'].includes(user_role) || is_admin;
  const can_write = ['admin', 'professor', 'student'].includes(user_role) || is_admin;

  return {
    is_admin,
    has_manage_boards,
    has_manage_users,
    can_write,
    can_read: true
  };
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 * @param {object} user - 사용자 객체
 * @param {string} permission - 확인할 권한
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;

  // 어드민은 모든 권한을 가짐
  if (user.is_admin) return true;

  // 역할 기반 기본 권한 확인
  const defaultPermissions = DEFAULT_PERMISSIONS[user.role] || [];
  if (defaultPermissions.includes(permission)) return true;

  // 개별 권한 확인
  const userPermissions = user.permissions || [];
  return userPermissions.includes(permission);
};

/**
 * 게시글을 수정할 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @param {object} post - 게시글 객체
 * @returns {boolean}
 */
export const canEditPost = (user, post) => {
  if (!user || !post) return false;

  const perms = checkSimplePermissions(user);
  const is_author = (post.writer_id === user.id);

  return is_author || perms.has_manage_boards || perms.is_admin;
};

/**
 * 게시글을 삭제할 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @param {object} post - 게시글 객체
 * @returns {boolean}
 */
export const canDeletePost = (user, post) => {
  if (!user || !post) return false;

  const perms = checkSimplePermissions(user);
  const is_author = (post.writer_id === user.id);

  return is_author || perms.has_manage_boards || perms.is_admin;
};

/**
 * 댓글을 삭제할 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @param {object} comment - 댓글 객체
 * @returns {boolean}
 */
export const canDeleteComment = (user, comment) => {
  if (!user || !comment) return false;

  const perms = checkSimplePermissions(user);
  const is_author = (comment.writer_id === user.id);

  return is_author || perms.has_manage_boards || perms.is_admin;
};

/**
 * 비공개 게시글에 접근할 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @param {object} post - 게시글 객체
 * @returns {boolean}
 */
export const canAccessPrivatePost = (user, post) => {
  if (!user || !post) return false;

  // 공개 게시글은 누구나 접근 가능
  if (!post.is_private) return true;

  const perms = checkSimplePermissions(user);
  const is_author = (post.writer_id === user.id);

  return is_author || perms.has_manage_boards || perms.is_admin;
};

/**
 * 댓글 작성 권한 확인 및 상세 정보 반환 (백엔드와 일치)
 * @param {object} user - 현재 사용자
 * @param {object} post - 게시글 객체
 * @returns {object} 권한 정보와 메시지
 */
export const canCommentOnPost = (user, post) => {
  if (!user || !post) {
    return {
      can_comment: false,
      reason: "로그인이 필요합니다.",
      error_code: "LOGIN_REQUIRED"
    };
  }

  const is_author = (user.id === post.writer_id);
  const perms = checkSimplePermissions(user);

  // 1. 게시판 설정 우선 체크 - 댓글이 허용되지 않으면 모든 사용자 차단
  if (!post.allow_comments) {
    return {
      can_comment: false,
      reason: "이 게시글은 댓글을 허용하지 않습니다.",
      error_code: "COMMENTS_DISABLED"
    };
  }

  // 2. 비공개 게시글 체크 (댓글이 허용된 경우에만)
  if (post.is_private) {
    const can_access_private = (
      is_author ||
      perms.has_manage_boards ||
      perms.is_admin
    );
    if (!can_access_private) {
      return {
        can_comment: false,
        reason: "비공개 게시글에는 작성자 또는 관리자만 댓글을 작성할 수 있습니다.",
        error_code: "PRIVATE_POST_ACCESS_DENIED"
      };
    }
  }

  // 3. 기본적으로 로그인된 사용자는 댓글 작성 가능 (게시판 설정이 허용하는 경우)
  return {
    can_comment: true,
    reason: "",
    error_code: ""
  };
};

/**
 * 사용자 관리 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @returns {boolean}
 */
export const canManageUsers = (user) => {
  if (!user) return false;

  return (
    hasPermission(user, PermissionType.MANAGE_USERS) ||
    user.is_admin
  );
};

/**
 * 게시판 관리 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @returns {boolean}
 */
export const canManageBoards = (user) => {
  if (!user) return false;

  return (
    hasPermission(user, PermissionType.MANAGE_BOARDS) ||
    user.is_admin
  );
};

/**
 * 배너 관리 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @returns {boolean}
 */
export const canManageBanners = (user) => {
  if (!user) return false;

  return (
    hasPermission(user, PermissionType.MANAGE_BANNERS) ||
    user.is_admin
  );
};

/**
 * 현재 사용자 정보 가져오기
 * @returns {object|null} 사용자 객체 또는 null
 */
export const getCurrentUser = () => {
  try {
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('사용자 정보 파싱 오류:', error);
    return null;
  }
};

/**
 * 특정 게시판에 글 작성 권한이 있는지 확인
 * @param {object} user - 현재 사용자
 * @param {string} boardName - 게시판 이름
 * @returns {boolean}
 */
export const canWriteToBoard = (user, boardName) => {
  if (!user) return false;

  // 공지사항과 뉴스는 교수 이상만 작성 가능
  if (boardName === '공지사항' || boardName === '뉴스') {
    return hasPermission(user, PermissionType.MANAGE_BOARDS) || user.is_admin;
  }

  // 기타 게시판은 일반 작성 권한만 있으면 됨
  const perms = checkSimplePermissions(user);
  return perms.can_write;
};

/**
 * 권한 설명 텍스트 반환
 * @param {string} permissionType - 권한 타입
 * @returns {string}
 */
export const getPermissionDescription = (permissionType) => {
  const descriptions = {
    [PermissionType.READ]: '읽기 권한',
    [PermissionType.WRITE]: '쓰기 권한',
    [PermissionType.DELETE]: '삭제 권한',
    [PermissionType.ADMIN]: '관리자 권한',
    [PermissionType.MANAGE_USERS]: '사용자 관리',
    [PermissionType.MANAGE_BOARDS]: '게시판 관리',
    [PermissionType.MANAGE_BANNERS]: '배너 관리',
    [PermissionType.MANAGE_RESEARCH]: '연구자료 관리'
  };
  return descriptions[permissionType] || permissionType;
};
