// src/pages/MainHome.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faPlus, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { fetchBoardPosts } from '../api/board';
import { fetchBanners, createBanner, updateBanner, deleteBanner, getBannerImageUrl } from '../api/banner';
import { isValidLogin } from '../services/auth';
import { canManageBanners, getCurrentUser } from '../utils/permissions';
import BannerModal from '../components/BannerModal';
import { SkeletonListItem } from '../components/Skeleton';
import { useOptimizedSkeleton } from '../utils/skeletonHooks';
import UserBadge from '../components/UserBadge';
import './MainHome.css';

function MainHome() {
  const [newsData, setNewsData] = useState([]);
  const [noticeData, setNoticeData] = useState([]);
  const [meetingData, setMeetingData] = useState([]);
  const [bannerData, setBannerData] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [canManageBannersPermission, setCanManageBannersPermission] = useState(false);



  // 최적화된 skeleton 훅들
  const newsSkeleton = useOptimizedSkeleton(isLoading, Array(5).fill(null), {
    smartOptions: { minDisplayTime: 1000, fadeInDelay: 0 }, // 딜레이 제거, 최소 시간 증가
    progressiveOptions: { staggerDelay: 120, enableStagger: true },
    transitionOptions: { duration: 250, enableSlide: true }
  });

  const noticeSkeleton = useOptimizedSkeleton(isLoading, Array(5).fill(null), {
    smartOptions: { minDisplayTime: 1000, fadeInDelay: 0 }, // 딜레이 제거, 최소 시간 증가
    progressiveOptions: { staggerDelay: 100, enableStagger: true },
    transitionOptions: { duration: 250, enableSlide: true }
  });

  const meetingSkeleton = useOptimizedSkeleton(isLoading, Array(5).fill(null), {
    smartOptions: { minDisplayTime: 1000, fadeInDelay: 0 }, // 딜레이 제거, 최소 시간 증가
    progressiveOptions: { staggerDelay: 140, enableStagger: true },
    transitionOptions: { duration: 250, enableSlide: true }
  });

  // 로그인 상태 및 권한 체크
  useEffect(() => {
    const loggedIn = isValidLogin();
    setIsLoggedIn(loggedIn);

    if (loggedIn) {
      const user = getCurrentUser();
      setCanManageBannersPermission(canManageBanners(user));
    } else {
      setCanManageBannersPermission(false);
    }
  }, []);

  // 배너 자동 슬라이드 효과
  useEffect(() => {
    if (bannerData.length > 0) {
      const interval = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % bannerData.length);
      }, 5000); // 5초마다 변경

      return () => clearInterval(interval);
    }
  }, [bannerData.length]);

  // 이전 배너로 이동
  const prevBanner = () => {
    setCurrentBanner(prev =>
      prev === 0 ? bannerData.length - 1 : prev - 1
    );
  };

  // 다음 배너로 이동
  const nextBanner = () => {
    setCurrentBanner(prev =>
      (prev + 1) % bannerData.length
    );
  };

  // 뉴스, 공지사항, 배너 데이터 가져오기
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      try {
        // 병렬로 모든 데이터 가져오기
        const [newsResponse, noticeResponse, meetingResponse, bannersResponse] = await Promise.all([
          fetchBoardPosts('뉴스').catch(() => []),
          fetchBoardPosts('공지사항').catch(() => []),
          fetchBoardPosts('회의기록').catch(() => []),
          fetchBanners().catch(() => [])
        ]);

        // 뉴스 데이터 설정 (최신 5개)
        const newsArray = Array.isArray(newsResponse) ? newsResponse : (newsResponse?.posts || []);
        const latestNews = newsArray.slice(0, 5);
        setNewsData(latestNews);

        // 공지사항 데이터 설정 (최신 5개)
        const noticeArray = Array.isArray(noticeResponse) ? noticeResponse : (noticeResponse?.posts || []);
        const latestNotices = noticeArray.slice(0, 5);
        setNoticeData(latestNotices);

        // 회의기록 데이터 설정 (최신 5개)
        const meetingArray = Array.isArray(meetingResponse) ? meetingResponse : (meetingResponse?.posts || []);
        const latestMeetings = meetingArray.slice(0, 5);
        setMeetingData(latestMeetings);

        // 배너 데이터 설정
        const bannerArray = Array.isArray(bannersResponse) ? bannersResponse : (bannersResponse?.banners || bannersResponse?.data || []);
        setBannerData(bannerArray);

      } catch (error) {
        console.error('데이터 로드 오류:', error);
        // API 호출 실패 시 빈 배열로 설정
        setNewsData([]);
        setNoticeData([]);
        setMeetingData([]);
        setBannerData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // 배너 저장 함수
  const handleBannerSave = async (bannerInfo) => {
    try {
      let savedBanner;

      if (editingBanner) {
        // 기존 배너 수정
        savedBanner = await updateBanner(editingBanner.id, bannerInfo);
        setBannerData(prev =>
          prev.map(banner =>
            banner.id === editingBanner.id ? savedBanner : banner
          )
        );
      } else {
        // 새 배너 추가
        savedBanner = await createBanner(bannerInfo);
        setBannerData(prev => [...prev, savedBanner]);
      }

      setShowBannerModal(false);
      setEditingBanner(null);

      alert(editingBanner ? '배너가 수정되었습니다.' : '배너가 추가되었습니다.');
    } catch (error) {
      console.error('배너 저장 오류:', error);
      alert('배너 저장 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message));
    }
  };

  // 배너 삭제 함수
  const handleBannerDelete = async (bannerId) => {
    if (!window.confirm('배너를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteBanner(bannerId);
      setBannerData(prev => prev.filter(banner => banner.id !== bannerId));

      // 현재 보고 있던 배너가 삭제된 경우 인덱스 조정
      if (currentBanner >= bannerData.length - 1) {
        setCurrentBanner(Math.max(0, bannerData.length - 2));
      }

      alert('배너가 삭제되었습니다.');
    } catch (error) {
      console.error('배너 삭제 오류:', error);
      alert('배너 삭제 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || error.message));
    }
  };

  // 배너 이미지 URL 가져오기
  const getBannerImage = (banner) => {
    if (banner.image_file_path) {
      const imageUrl = getBannerImageUrl(banner.image_file_path);
      console.log('Banner image URL:', imageUrl); // 디버깅용
      return imageUrl;
    } else if (banner.image_url) {
      return banner.image_url;
    }
    return null; // 이미지가 없을 때는 null 반환
  };

  // 이미지 로딩 실패 시 대체 경로들 시도
  const handleImageError = (e, banner) => {
    const img = e.target;
    const currentSrc = img.src;

    console.error('배너 이미지 로딩 실패:', currentSrc);

    // 대체 경로들 시도
    const normalizedPath = banner.image_file_path.replace(/\\/g, '/');
    const filename = normalizedPath.split('/').pop();
    const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL;

    const alternatePaths = [
      `${baseUrl}/api/banner/image/${filename}`,
      `${baseUrl}/static/${normalizedPath}`,
      `${baseUrl}/files/${normalizedPath}`
    ];

    // 현재 실패한 URL이 아닌 다음 대체 경로 시도
    const nextPath = alternatePaths.find(path => path !== currentSrc);

    if (nextPath && !img.dataset.retried) {
      img.dataset.retried = 'true';
      img.src = nextPath;
      console.log('대체 경로 시도:', nextPath);
    } else {
      // 모든 경로 실패 시 이미지 숨김
      img.style.display = 'none';
    }
  };

  // 배너 링크 처리
  const handleBannerClick = (banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith('http')) {
        window.open(banner.link_url, '_blank');
      } else {
        window.location.href = banner.link_url;
      }
    }
  };

  // 날짜 포맷 함수 - 개선된 버전
  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      let date;
      const dateStr = dateString.toString();

      // 'YYYY-MM-DD HH:MM:SS' 형식 (한국 시간대)
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        // 한국 시간으로 파싱
        date = new Date(dateStr + ' +09:00');
      }
      // ISO 형식 (T나 Z 포함)
      else if (dateStr.includes('T') || dateStr.includes('Z')) {
        date = new Date(dateStr);
      }
      // 기타 형식
      else {
        date = new Date(dateStr);
      }

      // Date 객체가 유효한지 확인
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜:', dateString);
        return '';
      }

      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.warn('날짜 파싱 오류:', dateString, error);
      return '';
    }
  };

  return (
    <div className="main-home">


      {/* 배너 슬라이더 섹션 */}
      <section className="banner-slider-section">
        <div className="banner-slider-container">
          {bannerData.length > 0 ? (
            <>
              <div
                className="banner-slider"
                style={{ transform: `translateX(-${currentBanner * 100}%)` }}
              >
                {bannerData.map((banner, _index) => (
                  <div
                    className="banner-slide"
                    key={banner.id}
                    style={{
                      backgroundColor: banner.background_color,
                      color: banner.text_color
                    }}
                  >
                    <div
                      className="banner-link"
                      onClick={() => handleBannerClick(banner)}
                      style={{ cursor: banner.link_url ? 'pointer' : 'default' }}
                    >
                      {getBannerImage(banner) && (
                        <img
                          src={getBannerImage(banner)}
                          alt={banner.title}
                          className="banner-image"
                          onError={(e) => handleImageError(e, banner)}
                        />
                      )}
                      <div className="banner-content">
                        <h2 className="banner-title">{banner.title}</h2>
                        <p className="banner-description">{banner.description}</p>
                        {banner.link_url && (
                          <button
                            className="banner-button"
                            style={{ backgroundColor: banner.button_color }}
                          >
                            {banner.button_text}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 배너 관리 도구 (교수 이상만) */}
                    {isLoggedIn && canManageBannersPermission && (
                      <div className="banner-admin-tools">
                        <button
                          className="admin-btn edit-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBanner(banner);
                            setShowBannerModal(true);
                          }}
                          title="배너 수정"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className="admin-btn delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBannerDelete(banner.id);
                          }}
                          title="배너 삭제"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 배너 컨트롤 */}
              {bannerData.length > 1 && (
                <>
                  <button className="banner-control prev" onClick={prevBanner}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                  <button className="banner-control next" onClick={nextBanner}>
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>

                  {/* 배너 인디케이터 */}
                  <div className="banner-indicators">
                    {bannerData.map((_, index) => (
                      <button
                        key={index}
                        className={`indicator ${index === currentBanner ? 'active' : ''}`}
                        onClick={() => setCurrentBanner(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="no-banner-placeholder">
              <div className="placeholder-content">
                <h2>연구실 소식을 여기에 추가하세요</h2>
                <p>중요한 공지사항이나 이벤트를 배너로 표시할 수 있습니다</p>
                {isLoggedIn && canManageBannersPermission && (
                  <button
                    className="add-banner-btn"
                    onClick={() => {
                      setEditingBanner(null);
                      setShowBannerModal(true);
                    }}
                  >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>배너 추가</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 배너 추가 버튼 (교수 이상만) */}
          {isLoggedIn && canManageBannersPermission && bannerData.length > 0 && (
            <button
              className="floating-add-banner-btn"
              onClick={() => {
                setEditingBanner(null);
                setShowBannerModal(true);
              }}
              title="배너 추가"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          )}
        </div>
      </section>

      {/* 공지사항 섹션 */}
      <section className="notice-section">
        <div className="section-header">
          <h2>공지사항</h2>
          <Link to="/board/공지사항" className="more-link">더보기</Link>
        </div>

        <div className="notice-list">
          {noticeSkeleton.showSkeleton || isLoading ? (
            <div className="skeleton-container skeleton-loader" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`notice-skeleton-${index}`}
                  style={{
                    marginBottom: '16px',
                    opacity: 1,
                    transform: 'translateY(0)',
                    transition: `all 300ms ease-out ${index * 100}ms`
                  }}
                >
                  <SkeletonListItem
                    showAvatar={false}
                    showMeta={true}
                    className="notice-skeleton"
                    animation="shimmer"
                    staggerDelay={0}
                  />
                </div>
              ))}
            </div>
          ) : noticeData.length > 0 ? (
            noticeData.map((notice, _index) => (
              <Link
                to={`/board/공지사항/detail/${notice.id}`}
                key={notice.id}
                className="notice-item"
              >
                <div className="notice-content">
                  <h3 className="notice-title">{notice.title}</h3>
                  <div className="notice-meta">
                    <span className="notice-author">
                      {notice.writer}
                      <UserBadge role={notice.writer_role} isAdmin={notice.writer_is_admin} size="sm" />
                    </span>
                    <span className="notice-date">{formatDate(notice.date)}</span>
                    <span className="notice-views">조회 {notice.views}</span>
                    <span className="notice-comments">댓글 {notice.commentCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-data">등록된 공지사항이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 회의기록 섹션 */}
      <section className="meeting-section">
        <div className="section-header">
          <h2>회의기록</h2>
          <Link to="/board/회의기록" className="more-link">더보기</Link>
        </div>

        <div className="meeting-list">
          {meetingSkeleton.showSkeleton || isLoading ? (
            <div className="skeleton-container skeleton-loader" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`meeting-skeleton-${index}`}
                  style={{
                    marginBottom: '16px',
                    opacity: 1,
                    transform: 'translateY(0)',
                    transition: `all 300ms ease-out ${index * 100}ms`
                  }}
                >
                  <SkeletonListItem
                    showAvatar={false}
                    showMeta={true}
                    className="meeting-skeleton"
                    animation="shimmer"
                    staggerDelay={0}
                  />
                </div>
              ))}
            </div>
          ) : meetingData.length > 0 ? (
            meetingData.map((meeting, _index) => (
              <Link
                to={`/board/회의기록/detail/${meeting.id}`}
                key={meeting.id}
                className="meeting-item"
              >
                <div className="meeting-content">
                  <h3 className="meeting-title">
                    {meeting.prefix && <span className="meeting-prefix">{meeting.prefix}</span>}
                    {meeting.title}
                  </h3>
                  <div className="meeting-meta">
                    <span className="meeting-author">
                      {meeting.writer}
                      <UserBadge role={meeting.writer_role} isAdmin={meeting.writer_is_admin} size="sm" />
                    </span>
                    <span className="meeting-date">{formatDate(meeting.date)}</span>
                    <span className="meeting-views">조회 {meeting.views}</span>
                    <span className="meeting-comments">댓글 {meeting.commentCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-data">등록된 회의기록이 없습니다.</div>
          )}
        </div>
      </section>

      {/* 뉴스 섹션 */}
      <section className="news-section">
        <div className="section-header">
          <h2>뉴스</h2>
          <Link to="/board/뉴스" className="more-link">더보기</Link>
        </div>

        <div className="news-list">
          {newsSkeleton.showSkeleton || isLoading ? (
            <div className="skeleton-container skeleton-loader" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`news-skeleton-${index}`}
                  style={{
                    marginBottom: '16px',
                    opacity: 1,
                    transform: 'translateY(0)',
                    transition: `all 300ms ease-out ${index * 100}ms`
                  }}
                >
                  <SkeletonListItem
                    showAvatar={false}
                    showMeta={true}
                    className="news-skeleton"
                    animation="shimmer"
                    staggerDelay={0}
                  />
                </div>
              ))}
            </div>
          ) : newsData.length > 0 ? (
            newsData.map((news, _index) => (
              <Link
                to={`/board/뉴스/detail/${news.id}`}
                key={news.id}
                className="news-item"
              >
                <div className="news-content">
                  <h3 className="news-title">{news.title}</h3>
                  <div className="news-meta">
                    <span className="news-author">
                      {news.writer}
                      <UserBadge role={news.writer_role} isAdmin={news.writer_is_admin} size="sm" />
                    </span>
                    <span className="news-date">{formatDate(news.date)}</span>
                    <span className="news-views">조회 {news.views}</span>
                    <span className="news-comments">댓글 {news.commentCount || 0}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="no-data">등록된 뉴스가 없습니다.</div>
          )}
        </div>
      </section>

      {/* 배너 모달 */}
      <BannerModal
        isOpen={showBannerModal}
        onClose={() => {
          setShowBannerModal(false);
          setEditingBanner(null);
        }}
        onSave={handleBannerSave}
        editingBanner={editingBanner}
      />
    </div>
  );
}

export default MainHome;
