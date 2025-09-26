import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * 스마트 스켈레톤 훅 - 로딩 시간에 따른 적응형 skeleton 표시
 * @param {boolean} isLoading - 로딩 상태
 * @param {Object} options - 설정 옵션
 * @returns {Object} skeleton 상태 및 제어 함수
 */
export const useSmartSkeleton = (isLoading, options = {}) => {
  const {
    minDisplayTime = 800,    // 최소 표시 시간 (ms) - 300에서 800으로 증가
    maxDisplayTime = 10000,  // 최대 표시 시간 (ms)
    fadeInDelay = 50,        // 페이드인 딜레이 (ms) - 100에서 50으로 감소
    fadeOutDuration = 200,   // 페이드아웃 지속시간 (ms)
    enableFadeTransition = true, // 페이드 전환 활성화
  } = options;

  const [showSkeleton, setShowSkeleton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const timeoutRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const maxTimeoutRef = useRef(null);

  useEffect(() => {
    // 로딩 시작
    if (isLoading && !showSkeleton) {
      const currentTime = Date.now();
      setStartTime(currentTime);

      // 즉시 skeleton 표시 (딜레이 최소화)
      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(true);
        setIsTransitioning(true);

        // 페이드인 완료 후 전환 상태 해제
        if (enableFadeTransition) {
          setTimeout(() => setIsTransitioning(false), fadeInDelay);
        } else {
          setIsTransitioning(false);
        }
      }, fadeInDelay);

      // 최대 표시 시간 제한
      maxTimeoutRef.current = setTimeout(() => {
        if (showSkeleton) {
          console.warn('Skeleton 최대 표시 시간 초과, 강제 숨김');
          setShowSkeleton(false);
          setIsTransitioning(false);
        }
      }, maxDisplayTime);
    }

    // 로딩 완료
    else if (!isLoading && showSkeleton) {
      const elapsedTime = Date.now() - (startTime || 0);
      const remainingMinTime = Math.max(0, minDisplayTime - elapsedTime);

      // 최소 표시 시간 보장
      const hideDelay = remainingMinTime + (enableFadeTransition ? fadeOutDuration : 0);

      if (enableFadeTransition) {
        setIsTransitioning(true);
      }

      transitionTimeoutRef.current = setTimeout(() => {
        setShowSkeleton(false);
        setIsTransitioning(false);
        setStartTime(null);
      }, hideDelay);
    }

    // 클린업
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, [isLoading, showSkeleton, startTime, minDisplayTime, maxDisplayTime, fadeInDelay, fadeOutDuration, enableFadeTransition]);

  // 컴포넌트 언마운트 시 타이머 클리어
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
    };
  }, []);

  return {
    showSkeleton,
    isTransitioning,
    skeletonStyle: enableFadeTransition ? {
      opacity: isTransitioning ? 0.5 : 1,
      transition: `opacity ${fadeOutDuration}ms ease-in-out`
    } : {}
  };
};

/**
 * 점진적 로딩 훅 - 순차적 skeleton 표시
 * @param {Array} items - 로딩할 아이템 배열
 * @param {Object} options - 설정 옵션
 * @returns {Object} 점진적 로딩 상태
 */
export const useProgressiveLoading = (items, options = {}) => {
  const {
    staggerDelay = 150,      // 각 아이템 간 지연 시간 (ms)
    maxConcurrent = 3,       // 동시 표시 최대 개수
    enableStagger = true,    // 단계적 표시 활성화
  } = options;

  const [visibleCount, setVisibleCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const timeoutRefs = useRef([]);
  const totalItems = Array.isArray(items) ? items.length : 0;

  const resetProgress = useCallback(() => {
    // 모든 타이머 클리어
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
    setVisibleCount(0);
    setLoadingProgress(0);
  }, []);

  const startProgressiveLoading = useCallback(() => {
    if (!enableStagger || totalItems === 0) {
      setVisibleCount(totalItems);
      setLoadingProgress(100);
      return;
    }

    resetProgress();

    // 점진적으로 아이템 표시
    for (let i = 0; i < totalItems; i++) {
      const timeout = setTimeout(() => {
        setVisibleCount(prev => {
          const newCount = Math.min(prev + 1, totalItems);
          setLoadingProgress((newCount / totalItems) * 100);
          return newCount;
        });
      }, i * staggerDelay);

      timeoutRefs.current.push(timeout);
    }
  }, [totalItems, staggerDelay, enableStagger, resetProgress]);

  useEffect(() => {
    if (totalItems > 0) {
      startProgressiveLoading();
    }

    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [totalItems, startProgressiveLoading]);

  const getItemVisibility = useCallback((index) => {
    if (!enableStagger) return true;
    return index < visibleCount;
  }, [visibleCount, enableStagger]);

  const getItemDelay = useCallback((index) => {
    if (!enableStagger) return 0;
    return Math.min(index, maxConcurrent - 1) * staggerDelay;
  }, [staggerDelay, maxConcurrent, enableStagger]);

  return {
    visibleCount,
    loadingProgress,
    totalItems,
    isComplete: visibleCount >= totalItems,
    getItemVisibility,
    getItemDelay,
    resetProgress,
    startProgressiveLoading
  };
};

/**
 * 스켈레톤 전환 효과 훅
 * @param {boolean} isVisible - 표시 상태
 * @param {Object} options - 전환 옵션
 * @returns {Object} 전환 상태 및 스타일
 */
export const useSkeletonTransition = (isVisible, options = {}) => {
  const {
    duration = 300,          // 전환 지속시간 (ms)
    easing = 'ease-in-out',  // 전환 easing
    transformOrigin = 'top', // 변환 원점
    enableScale = false,     // 스케일 효과 활성화
    enableSlide = false,     // 슬라이드 효과 활성화
  } = options;

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // 다음 프레임에서 전환 시작
      requestAnimationFrame(() => {
        setIsTransitioning(false);
      });
    } else {
      setIsTransitioning(true);
      // 전환 완료 후 언마운트
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsTransitioning(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const transitionStyle = useMemo(() => {
    const baseStyle = {
      transition: `all ${duration}ms ${easing}`,
      transformOrigin
    };

    if (!shouldRender) {
      return { ...baseStyle, display: 'none' };
    }

    if (isTransitioning) {
      const transforms = [];

      if (enableScale) transforms.push('scale(0.95)');
      if (enableSlide) transforms.push('translateY(-10px)');

      return {
        ...baseStyle,
        opacity: 0,
        transform: transforms.join(' ') || 'scale(1)',
      };
    }

    return {
      ...baseStyle,
      opacity: 1,
      transform: 'scale(1) translateY(0)',
    };
  }, [isTransitioning, shouldRender, duration, easing, transformOrigin, enableScale, enableSlide]);

  return {
    shouldRender,
    isTransitioning,
    transitionStyle
  };
};

/**
 * 통합 스켈레톤 관리 훅
 * @param {boolean} isLoading - 로딩 상태
 * @param {Array} items - 아이템 배열 (선택적)
 * @param {Object} options - 통합 설정
 * @returns {Object} 통합 스켈레톤 상태
 */
export const useOptimizedSkeleton = (isLoading, items = [], options = {}) => {
  const {
    smartOptions = {},
    progressiveOptions = {},
    transitionOptions = {}
  } = options;

  const smartSkeleton = useSmartSkeleton(isLoading, smartOptions);
  const progressiveLoading = useProgressiveLoading(items, progressiveOptions);
  const transition = useSkeletonTransition(smartSkeleton.showSkeleton, transitionOptions);

  const skeletonProps = useMemo(() => ({
    style: {
      ...smartSkeleton.skeletonStyle,
      ...transition.transitionStyle
    },
    'data-skeleton-state': {
      loading: isLoading,
      visible: smartSkeleton.showSkeleton,
      transitioning: smartSkeleton.isTransitioning || transition.isTransitioning,
      progress: progressiveLoading.loadingProgress
    }
  }), [
    smartSkeleton.skeletonStyle,
    transition.transitionStyle,
    isLoading,
    smartSkeleton.showSkeleton,
    smartSkeleton.isTransitioning,
    transition.isTransitioning,
    progressiveLoading.loadingProgress
  ]);

  return {
    // 스마트 스켈레톤
    showSkeleton: smartSkeleton.showSkeleton && transition.shouldRender,
    isTransitioning: smartSkeleton.isTransitioning || transition.isTransitioning,

    // 점진적 로딩
    ...progressiveLoading,

    // 통합 프로퍼티
    skeletonProps,

    // 유틸리티 함수
    reset: () => {
      progressiveLoading.resetProgress();
    }
  };
};

/**
 * 성능 최적화된 스켈레톤 렌더러
 * @param {Object} props - 렌더러 속성
 * @returns {Function} 최적화된 렌더 함수
 */
export const createOptimizedSkeletonRenderer = (defaultOptions = {}) => {
  return (SkeletonComponent, items, isLoading, customOptions = {}) => {
    const options = { ...defaultOptions, ...customOptions };
    const skeleton = useOptimizedSkeleton(isLoading, items, options);

    if (!skeleton.showSkeleton) return null;

    return Array.from({ length: skeleton.totalItems || 1 }).map((_, index) => {
      const isVisible = skeleton.getItemVisibility(index);
      const delay = skeleton.getItemDelay(index);

      return (
        <div
          key={`skeleton-${index}`}
          {...skeleton.skeletonProps}
          style={{
            ...skeleton.skeletonProps.style,
            animationDelay: `${delay}ms`,
            opacity: isVisible ? 1 : 0,
            transition: `opacity 200ms ease-in-out ${delay}ms`
          }}
        >
          <SkeletonComponent />
        </div>
      );
    });
  };
};
