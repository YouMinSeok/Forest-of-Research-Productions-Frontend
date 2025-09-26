import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import api from '../services/api';

/**
 * 연구실용 React 성능 최적화 유틸리티
 * 대규모 동시 사용자 환경에서의 성능 개선
 */

// 디바운스 훅 - 검색, 입력 최적화
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// 쓰로틀 훅 - 스크롤, 리사이즈 이벤트 최적화
export const useThrottle = (value, limit) => {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// 무한 스크롤 최적화 훅
export const useInfiniteScroll = (callback, hasMore = true, threshold = 1.0) => {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef(null);
  const targetRef = useRef(null);

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !isFetching) {
      setIsFetching(true);
      callback().finally(() => setIsFetching(false));
    }
  }, [callback, hasMore, isFetching]);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold,
      rootMargin: '50px'
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold]);

  return [targetRef, isFetching];
};

// 메모리 효율적인 리스트 렌더링 (가상화)
export const useVirtualizedList = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);


  const visibleItems = useMemo(() => {
    if (!items.length || !itemHeight || !containerHeight) return [];

    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return items.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index,
      offsetY: (startIndex + index) * itemHeight
    }));
  }, [items, itemHeight, containerHeight, scrollTop]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
};

// 컴포넌트 성능 모니터링 훅
export const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current += 1;

    // 개발환경에서만 성능 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [${componentName}] 렌더링 횟수: ${renderCount.current}`);

      if (renderCount.current > 10) {
        console.warn(`⚠️ [${componentName}] 과도한 리렌더링 감지! (${renderCount.current}회)`);
      }
    }
  });

  const measureRenderTime = useCallback((callback) => {
    const start = performance.now();
    const result = callback();
    const end = performance.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ [${componentName}] 렌더링 시간: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  }, [componentName]);

  return { renderCount: renderCount.current, measureRenderTime };
};

// API 요청 최적화 (중복 요청 방지)
export const useApiCache = () => {
  const cache = useRef(new Map());
  const pendingRequests = useRef(new Map());

  const cachedFetch = useCallback(async (url, options = {}) => {
    const cacheKey = `${url}_${JSON.stringify(options)}`;

    // 캐시된 결과가 있으면 반환
    if (cache.current.has(cacheKey)) {
      const cachedData = cache.current.get(cacheKey);
      if (Date.now() - cachedData.timestamp < 300000) { // 5분 캐시
        return cachedData.data;
      }
    }

    // 동일한 요청이 진행 중이면 기다림
    if (pendingRequests.current.has(cacheKey)) {
      return pendingRequests.current.get(cacheKey);
    }

    // axios 인스턴스를 사용한 새로운 요청 실행
    const request = api.get(url, options)
      .then(response => response.data)
      .then(data => {
        cache.current.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        pendingRequests.current.delete(cacheKey);
        return data;
      })
      .catch(error => {
        pendingRequests.current.delete(cacheKey);
        throw error;
      });

    pendingRequests.current.set(cacheKey, request);
    return request;
  }, []);

  const clearCache = useCallback(() => {
    cache.current.clear();
    pendingRequests.current.clear();
  }, []);

  return { cachedFetch, clearCache };
};

// 이미지 지연 로딩 훅
export const useLazyImage = (src, placeholder = '/placeholder.jpg') => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };
            img.onerror = () => {
              setIsError(true);
              setIsLoading(false);
            };
            img.src = src;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imgRef, imageSrc, isLoading, isError };
};

// 로컬 스토리지 최적화 훅
export const useOptimizedLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`로컬 스토리지 읽기 오류: ${key}`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`로컬 스토리지 쓰기 오류: ${key}`, error);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`로컬 스토리지 삭제 오류: ${key}`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

// 메모리 사용량 모니터링 (개발용)
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState(null);

  useEffect(() => {
    if (performance.memory && process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        setMemoryInfo({
          used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2), // MB
          total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2), // MB
          limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) // MB
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  return memoryInfo;
};

// 배치 업데이트 최적화
export const useBatchedUpdates = () => {
  const [updates, setUpdates] = useState([]);
  const timeoutRef = useRef(null);

  const addUpdate = useCallback((update) => {
    setUpdates(prev => [...prev, update]);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setUpdates([]);
    }, 100); // 100ms 내 업데이트를 배치 처리
  }, []);

  return { updates, addUpdate };
};
