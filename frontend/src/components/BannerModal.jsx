import React, { useState, useEffect, useRef } from 'react';
import './BannerModal.css';

const BannerModal = ({ isOpen, onClose, onSave, editingBanner }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    image_file: null,
    link_url: '',
    background_color: '#f8f9fa',
    text_color: '#333333',
    button_color: '#007bff',
    button_text: '자세히 보기',
    is_active: true,
    display_order: 0
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [imageType, setImageType] = useState('url'); // 'url' 또는 'file'
  const fileInputRef = useRef(null);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (editingBanner) {
      setFormData({
        title: editingBanner.title || '',
        description: editingBanner.description || '',
        image_url: editingBanner.image_url || '',
        image_file: null,
        link_url: editingBanner.link_url || '',
        background_color: editingBanner.background_color || '#f8f9fa',
        text_color: editingBanner.text_color || '#333333',
        button_color: editingBanner.button_color || '#007bff',
        button_text: editingBanner.button_text || '자세히 보기',
        is_active: editingBanner.is_active !== false,
        display_order: editingBanner.display_order || 0
      });

      // 기존 이미지 미리보기 설정
      if (editingBanner.image_file_path) {
        const filename = editingBanner.image_file_path.split('/').pop();
        const imageUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/banner/image/${filename}`;
        setImagePreview(imageUrl);
        setImageType('file');
      } else if (editingBanner.image_url) {
        setImagePreview(editingBanner.image_url);
        setImageType('url');
      }
    } else {
      setFormData({
        title: '',
        description: '',
        image_url: '',
        image_file: null,
        link_url: '',
        background_color: '#f8f9fa',
        text_color: '#333333',
        button_color: '#007bff',
        button_text: '자세히 보기',
        is_active: true,
        display_order: 0
      });
      setImagePreview(null);
      setImageType('url');
    }
  }, [editingBanner]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageTypeChange = (type) => {
    setImageType(type);
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      image_url: '',
      image_file: null
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 파일 크기 검증 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('파일 크기는 10MB 이하여야 합니다.');
        return;
      }

      // 파일 형식 검증
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('지원하는 이미지 형식: JPG, PNG, GIF, WebP');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image_file: file
      }));

      // 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({
      ...prev,
      image_url: url
    }));

    if (url && url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!formData.description.trim()) {
      alert('설명을 입력해주세요.');
      return;
    }

    // 이미지 검증 (선택사항이지만 하나는 있어야 함)
    if (!formData.image_url && !formData.image_file && !editingBanner?.image_file_path) {
      if (!window.confirm('이미지가 없습니다. 계속 진행하시겠습니까?')) {
        return;
      }
    }

    onSave(formData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      image_url: '',
      image_file: null,
      remove_image: true
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="banner-modal-overlay" onClick={handleOverlayClick}>
      <div className="banner-modal">
        <div className="banner-modal-header">
          <h2>{editingBanner ? '배너 수정' : '배너 추가'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="banner-modal-form">
          {/* 기본 정보 */}
          <div className="form-section">
            <h3>기본 정보</h3>

            <div className="form-group">
              <label htmlFor="title">제목 *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="배너 제목을 입력하세요"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">설명 *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="배너 설명을 입력하세요"
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="link_url">링크 URL</label>
              <input
                type="url"
                id="link_url"
                name="link_url"
                value={formData.link_url}
                onChange={handleInputChange}
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* 이미지 설정 */}
          <div className="form-section">
            <h3>이미지 설정</h3>

            <div className="image-type-selector">
              <label>
                <input
                  type="radio"
                  name="imageType"
                  value="url"
                  checked={imageType === 'url'}
                  onChange={() => handleImageTypeChange('url')}
                />
                이미지 URL
              </label>
              <label>
                <input
                  type="radio"
                  name="imageType"
                  value="file"
                  checked={imageType === 'file'}
                  onChange={() => handleImageTypeChange('file')}
                />
                파일 업로드
              </label>
            </div>

            {imageType === 'url' ? (
              <div className="form-group">
                <label htmlFor="image_url">이미지 URL</label>
                <input
                  type="url"
                  id="image_url"
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleImageUrlChange}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="image_file">이미지 파일</label>
                <input
                  type="file"
                  id="image_file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div className="file-help">
                  지원 형식: JPG, PNG, GIF, WebP (최대 10MB)
                </div>
              </div>
            )}

            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="미리보기" />
                <button type="button" className="remove-image-btn" onClick={removeImage}>
                  이미지 제거
                </button>
              </div>
            )}
          </div>

          {/* 스타일 설정 */}
          <div className="form-section">
            <h3>스타일 설정</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="background_color">배경색</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="background_color"
                    name="background_color"
                    value={formData.background_color}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    value={formData.background_color}
                    onChange={handleInputChange}
                    name="background_color"
                    placeholder="#f8f9fa"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="text_color">텍스트 색상</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="text_color"
                    name="text_color"
                    value={formData.text_color}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    value={formData.text_color}
                    onChange={handleInputChange}
                    name="text_color"
                    placeholder="#333333"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="button_color">버튼 색상</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    id="button_color"
                    name="button_color"
                    value={formData.button_color}
                    onChange={handleInputChange}
                  />
                  <input
                    type="text"
                    value={formData.button_color}
                    onChange={handleInputChange}
                    name="button_color"
                    placeholder="#007bff"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="button_text">버튼 텍스트</label>
                <input
                  type="text"
                  id="button_text"
                  name="button_text"
                  value={formData.button_text}
                  onChange={handleInputChange}
                  placeholder="자세히 보기"
                />
              </div>
            </div>
          </div>

          {/* 기타 설정 */}
          <div className="form-section">
            <h3>기타 설정</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="display_order">표시 순서</label>
                <input
                  type="number"
                  id="display_order"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  활성화
                </label>
              </div>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="form-section">
            <h3>미리보기</h3>
            <div
              className="banner-preview"
              style={{
                backgroundColor: formData.background_color,
                color: formData.text_color
              }}
            >
              {imagePreview && (
                <div className="preview-image">
                  <img src={imagePreview} alt="배너 이미지" />
                </div>
              )}
              <div className="preview-content">
                <h4>{formData.title || '배너 제목'}</h4>
                <p>{formData.description || '배너 설명'}</p>
                {formData.link_url && (
                  <button
                    type="button"
                    className="preview-button"
                    style={{ backgroundColor: formData.button_color }}
                  >
                    {formData.button_text}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="banner-modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="save-btn">
              {editingBanner ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BannerModal;
