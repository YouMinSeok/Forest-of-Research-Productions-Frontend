import React, { memo, useMemo } from 'react';
import './Skeleton.css';

// 기본 Skeleton 컴포넌트 - 최적화됨
export const Skeleton = memo(({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
  delay = 0,
  style = {}
}) => {
  const computedStyle = useMemo(() => ({
    width,
    height,
    animationDelay: `${delay}ms`,
    ...style
  }), [width, height, delay, style]);

  const combinedClassName = useMemo(() => {
    const baseClasses = 'skeleton-base';
    const variantClasses = {
      rectangular: 'skeleton-rectangular',
      circular: 'skeleton-circular',
      text: 'skeleton-text'
    };

    const animationClasses = {
      pulse: 'skeleton-pulse',
      wave: 'skeleton-wave',
      shimmer: 'skeleton-shimmer',
      fade: 'skeleton-fade',
      none: ''
    };

    return `${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`.trim();
  }, [variant, animation, className]);

  return (
    <div
      className={combinedClassName}
      style={computedStyle}
      aria-label="로딩 중..."
      role="status"
    />
  );
});

// 텍스트 라인 Skeleton - 최적화됨
export const SkeletonText = memo(({
  lines = 1,
  spacing = '0.5rem',
  className = '',
  animation = 'pulse',
  staggerDelay = 100
}) => {
  const textLines = useMemo(() =>
    Array.from({ length: lines }).map((_, index) => ({
      key: index,
      width: index === lines - 1 ? '70%' : '100%',
      delay: index * staggerDelay,
      marginBottom: index < lines - 1 ? spacing : 0
    })), [lines, spacing, staggerDelay]
  );

  return (
    <div className={`skeleton-text-container ${className}`}>
      {textLines.map(({ key, width, delay, marginBottom }) => (
        <Skeleton
          key={key}
          height="1rem"
          width={width}
          variant="text"
          animation={animation}
          delay={delay}
          style={{ marginBottom }}
        />
      ))}
    </div>
  );
});

// 아바타 Skeleton - 최적화됨
export const SkeletonAvatar = memo(({
  size = '40px',
  className = '',
  animation = 'pulse',
  delay = 0
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      variant="circular"
      animation={animation}
      delay={delay}
      className={className}
    />
  );
});

// 카드 Skeleton - 최적화됨
export const SkeletonCard = memo(({
  showAvatar = true,
  showImage = true,
  textLines = 3,
  className = '',
  animation = 'pulse',
  staggerDelay = 150
}) => {
  return (
    <div className={`skeleton-card ${className}`}>
      {showImage && (
        <Skeleton
          height="200px"
          className="skeleton-card-image"
          animation={animation}
          delay={0}
        />
      )}
      <div className="skeleton-card-content">
        {showAvatar && (
          <div className="skeleton-card-header">
            <SkeletonAvatar
              size="40px"
              animation={animation}
              delay={staggerDelay}
            />
            <div className="skeleton-card-header-text">
              <Skeleton
                width="120px"
                height="1rem"
                animation={animation}
                delay={staggerDelay * 2}
              />
              <Skeleton
                width="80px"
                height="0.875rem"
                animation={animation}
                delay={staggerDelay * 3}
              />
            </div>
          </div>
        )}
        <SkeletonText
          lines={textLines}
          animation={animation}
          staggerDelay={staggerDelay}
        />
      </div>
    </div>
  );
});

// 리스트 아이템 Skeleton - 최적화됨
export const SkeletonListItem = memo(({
  showAvatar = true,
  showMeta = true,
  className = '',
  animation = 'pulse',
  staggerDelay = 100
}) => {
  return (
    <div className={`skeleton-list-item ${className}`}>
      {showAvatar && (
        <SkeletonAvatar
          size="48px"
          animation={animation}
          delay={0}
        />
      )}
      <div className="skeleton-list-content">
        <Skeleton
          width="200px"
          height="1.125rem"
          className="skeleton-list-title"
          animation={animation}
          delay={staggerDelay}
        />
        <SkeletonText
          lines={2}
          animation={animation}
          staggerDelay={staggerDelay}
        />
        {showMeta && (
          <div className="skeleton-list-meta">
            <Skeleton
              width="80px"
              height="0.875rem"
              animation={animation}
              delay={staggerDelay * 3}
            />
            <Skeleton
              width="60px"
              height="0.875rem"
              animation={animation}
              delay={staggerDelay * 4}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// 게시판 테이블 Skeleton - 최적화됨
export const SkeletonTable = memo(({
  rows = 5,
  columns = 4,
  className = '',
  animation = 'pulse',
  staggerDelay = 80
}) => {
  const tableRows = useMemo(() =>
    Array.from({ length: rows }).map((_, rowIndex) => ({
      key: `row-${rowIndex}`,
      delay: rowIndex * staggerDelay,
      columns: Array.from({ length: columns }).map((_, colIndex) => ({
        key: `cell-${rowIndex}-${colIndex}`,
        width: colIndex === 0 ? '40%' : '15%',
        delay: (rowIndex * columns + colIndex) * (staggerDelay / 2)
      }))
    })), [rows, columns, staggerDelay]
  );

  const headerColumns = useMemo(() =>
    Array.from({ length: columns }).map((_, colIndex) => ({
      key: `header-${colIndex}`,
      width: colIndex === 0 ? '40%' : '15%',
      delay: colIndex * (staggerDelay / 2)
    })), [columns, staggerDelay]
  );

  return (
    <div className={`skeleton-table ${className}`}>
      {/* 테이블 헤더 */}
      <div className="skeleton-table-header">
        {headerColumns.map(({ key, width, delay }) => (
          <Skeleton
            key={key}
            height="2rem"
            width={width}
            animation={animation}
            delay={delay}
          />
        ))}
      </div>

      {/* 테이블 바디 */}
      {tableRows.map(({ key, columns: rowColumns }) => (
        <div key={key} className="skeleton-table-row">
          {rowColumns.map(({ key: cellKey, width, delay }) => (
            <Skeleton
              key={cellKey}
              height="3rem"
              width={width}
              animation={animation}
              delay={delay}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

// 프로필 Skeleton - 최적화됨
export const SkeletonProfile = memo(({
  className = '',
  animation = 'pulse',
  staggerDelay = 150
}) => {
  return (
    <div className={`skeleton-profile ${className}`}>
      <SkeletonAvatar
        size="120px"
        className="skeleton-profile-avatar"
        animation={animation}
        delay={0}
      />
      <div className="skeleton-profile-info">
        <Skeleton
          width="200px"
          height="1.5rem"
          className="skeleton-profile-name"
          animation={animation}
          delay={staggerDelay}
        />
        <Skeleton
          width="150px"
          height="1rem"
          className="skeleton-profile-title"
          animation={animation}
          delay={staggerDelay * 2}
        />
        <SkeletonText
          lines={3}
          className="skeleton-profile-bio"
          animation={animation}
          staggerDelay={staggerDelay}
        />
      </div>
    </div>
  );
});

// 채팅 메시지 Skeleton - 최적화됨
export const SkeletonChatMessage = memo(({
  isOwnMessage = false,
  className = '',
  animation = 'pulse',
  staggerDelay = 100
}) => {
  return (
    <div className={`skeleton-chat-message ${isOwnMessage ? 'own' : 'other'} ${className}`}>
      {!isOwnMessage && (
        <SkeletonAvatar
          size="32px"
          className="skeleton-message-avatar"
          animation={animation}
          delay={0}
        />
      )}
      <div className="skeleton-message-content">
        {!isOwnMessage && (
          <Skeleton
            width="80px"
            height="0.875rem"
            className="skeleton-message-sender"
            animation={animation}
            delay={staggerDelay}
          />
        )}
        <div className="skeleton-message-bubble">
          <Skeleton
            width={isOwnMessage ? "70%" : "60%"}
            height="1rem"
            className="skeleton-message-text"
            animation={animation}
            delay={staggerDelay * 2}
          />
          <Skeleton
            width="40px"
            height="0.75rem"
            className="skeleton-message-time"
            animation={animation}
            delay={staggerDelay * 3}
          />
        </div>
      </div>
    </div>
  );
});

// 검색 결과 Skeleton - 최적화됨
export const SkeletonSearchResult = memo(({
  className = '',
  animation = 'pulse',
  staggerDelay = 100
}) => {
  return (
    <div className={`skeleton-search-result ${className}`}>
      <SkeletonAvatar
        size="40px"
        animation={animation}
        delay={0}
      />
      <div className="skeleton-search-info">
        <Skeleton
          width="120px"
          height="1rem"
          className="skeleton-search-name"
          animation={animation}
          delay={staggerDelay}
        />
        <Skeleton
          width="80px"
          height="0.875rem"
          className="skeleton-search-role"
          animation={animation}
          delay={staggerDelay * 2}
        />
      </div>
    </div>
  );
});

// 다중 스켈레톤 래퍼 - 점진적 로딩 지원
export const SkeletonGroup = memo(({
  children,
  count = 1,
  staggerDelay = 150,
  animation = 'pulse',
  className = ''
}) => {
  const items = useMemo(() =>
    Array.from({ length: count }).map((_, index) => ({
      key: index,
      delay: index * staggerDelay
    })), [count, staggerDelay]
  );

  return (
    <div className={`skeleton-group ${className}`}>
      {items.map(({ key, delay }) => (
        <div
          key={key}
          style={{
            animationDelay: `${delay}ms`,
            opacity: 0,
            animation: `skeleton-fade-in 300ms ease-out ${delay}ms forwards`
          }}
        >
          {React.cloneElement(children, { animation, delay: 0 })}
        </div>
      ))}
    </div>
  );
});

// Display names for debugging
Skeleton.displayName = 'Skeleton';
SkeletonText.displayName = 'SkeletonText';
SkeletonAvatar.displayName = 'SkeletonAvatar';
SkeletonCard.displayName = 'SkeletonCard';
SkeletonListItem.displayName = 'SkeletonListItem';
SkeletonTable.displayName = 'SkeletonTable';
SkeletonProfile.displayName = 'SkeletonProfile';
SkeletonChatMessage.displayName = 'SkeletonChatMessage';
SkeletonSearchResult.displayName = 'SkeletonSearchResult';
SkeletonGroup.displayName = 'SkeletonGroup';

export default Skeleton;
