import React, { useState, useEffect } from 'react';
import './LinkModal.css';

function LinkModal({ isOpen, onClose, onInsert }) {
  const [url, setUrl] = useState('');
  const [previewType, setPreviewType] = useState('none'); // 'youtube', 'vimeo', 'other'
  const [thumbnail, setThumbnail] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setPreviewType('none');
      setThumbnail('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!url) {
      setPreviewType('none');
      setThumbnail('');
      return;
    }
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      setPreviewType('youtube');
      const videoId = extractYoutubeId(url);
      if (videoId) {
        setThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`);
      }
    } else if (url.includes('vimeo.com/')) {
      setPreviewType('vimeo');
      const vimeoId = extractVimeoId(url);
      if (vimeoId) {
        setThumbnail(`https://i.vimeocdn.com/video/${vimeoId}_640.jpg`);
      }
    } else {
      setPreviewType('other');
      setThumbnail('');
    }
  }, [url]);

  const extractYoutubeId = (originalUrl) => {
    if (originalUrl.includes('watch?v=')) {
      return originalUrl.split('watch?v=')[1].split('&')[0];
    } else if (originalUrl.includes('youtu.be/')) {
      return originalUrl.split('youtu.be/')[1].split('?')[0];
    }
    return null;
  };

  const extractVimeoId = (originalUrl) => {
    try {
      const parts = originalUrl.split('vimeo.com/');
      return parts[1].split(/[?/]/)[0];
    } catch (e) {
      return null;
    }
  };

  const handleConfirm = () => {
    onInsert(url);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content link-modal">
        <div className="modal-header">
          <h3>링크 삽입</h3>
          <button className="modal-close-btn" onClick={handleCancel}>×</button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            className="modal-url-input"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          {previewType === 'youtube' && thumbnail && (
            <div className="modal-preview">
              <img src={thumbnail} alt="YouTube 미리보기" />
              <p>YouTube 동영상 미리보기</p>
            </div>
          )}
          {previewType === 'vimeo' && thumbnail && (
            <div className="modal-preview">
              <img src={thumbnail} alt="Vimeo 미리보기" />
              <p>Vimeo 동영상 미리보기</p>
            </div>
          )}
          {previewType === 'other' && url && (
            <div className="modal-preview">
              <p>일반 링크로 삽입됩니다.</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-confirm-btn" onClick={handleConfirm}>확인</button>
          <button className="modal-cancel-btn" onClick={handleCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

export default LinkModal;
