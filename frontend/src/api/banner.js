// api/banner.js
import api from '../services/api';

const BANNER_API_BASE = '/api/banner';

// 배너 목록 조회
export const fetchBanners = async (activeOnly = true) => {
  try {
    const response = await api.get(`${BANNER_API_BASE}/`, {
      params: { active_only: activeOnly }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching banners:", error.response?.data || error.message);
    throw error;
  }
};

// 특정 배너 조회
export const fetchBanner = async (bannerId) => {
  try {
    const response = await api.get(`${BANNER_API_BASE}/${bannerId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching banner:", error.response?.data || error.message);
    throw error;
  }
};

// 새 배너 생성
export const createBanner = async (bannerData) => {
  try {
    const formData = new FormData();

    // 텍스트 필드들 추가
    formData.append('title', bannerData.title);
    formData.append('description', bannerData.description);

    if (bannerData.image_url) {
      formData.append('image_url', bannerData.image_url);
    }
    if (bannerData.link_url) {
      formData.append('link_url', bannerData.link_url);
    }

    // 스타일 필드들 추가
    formData.append('background_color', bannerData.background_color || '#f8f9fa');
    formData.append('text_color', bannerData.text_color || '#333333');
    formData.append('button_color', bannerData.button_color || '#007bff');
    formData.append('button_text', bannerData.button_text || '자세히 보기');
    formData.append('is_active', bannerData.is_active !== false);
    formData.append('display_order', bannerData.display_order || 0);

    // 이미지 파일 추가
    if (bannerData.image_file) {
      formData.append('image_file', bannerData.image_file);
    }

    const response = await api.post(`${BANNER_API_BASE}/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error creating banner:", error.response?.data || error.message);
    throw error;
  }
};

// 배너 수정
export const updateBanner = async (bannerId, bannerData) => {
  try {
    const formData = new FormData();

    // 변경된 필드들만 추가
    if (bannerData.title !== undefined) {
      formData.append('title', bannerData.title);
    }
    if (bannerData.description !== undefined) {
      formData.append('description', bannerData.description);
    }
    if (bannerData.image_url !== undefined) {
      formData.append('image_url', bannerData.image_url);
    }
    if (bannerData.link_url !== undefined) {
      formData.append('link_url', bannerData.link_url);
    }
    if (bannerData.background_color !== undefined) {
      formData.append('background_color', bannerData.background_color);
    }
    if (bannerData.text_color !== undefined) {
      formData.append('text_color', bannerData.text_color);
    }
    if (bannerData.button_color !== undefined) {
      formData.append('button_color', bannerData.button_color);
    }
    if (bannerData.button_text !== undefined) {
      formData.append('button_text', bannerData.button_text);
    }
    if (bannerData.is_active !== undefined) {
      formData.append('is_active', bannerData.is_active);
    }
    if (bannerData.display_order !== undefined) {
      formData.append('display_order', bannerData.display_order);
    }

    // 이미지 파일 추가
    if (bannerData.image_file) {
      formData.append('image_file', bannerData.image_file);
    }

    // 이미지 삭제 플래그
    if (bannerData.remove_image) {
      formData.append('remove_image', bannerData.remove_image);
    }

    const response = await api.put(`${BANNER_API_BASE}/${bannerId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error("Error updating banner:", error.response?.data || error.message);
    throw error;
  }
};

// 배너 삭제
export const deleteBanner = async (bannerId) => {
  try {
    const response = await api.delete(`${BANNER_API_BASE}/${bannerId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting banner:", error.response?.data || error.message);
    throw error;
  }
};

// 배너 순서 변경
export const reorderBanners = async (bannerOrders) => {
  try {
    const response = await api.post(`${BANNER_API_BASE}/reorder`, bannerOrders);
    return response.data;
  } catch (error) {
    console.error("Error reordering banners:", error.response?.data || error.message);
    throw error;
  }
};

// 배너 이미지 URL 생성
export const getBannerImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // 절대 경로인 경우 그대로 반환
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // 서버에 업로드된 파일인 경우 - 백슬래시를 슬래시로 정규화
  const normalizedPath = imagePath.replace(/\\/g, '/');
  // 환경변수에서 base URL 구성
  const hostIp = process.env.REACT_APP_HOST_IP;
  const port = process.env.REACT_APP_API_PORT || '8080';
  const baseUrl = `http://${hostIp}:${port}`;

  // uploads 폴더 기반 경로 시도 (일반적인 업로드 구조)
  return `${baseUrl}/uploads/${normalizedPath}`;
};
