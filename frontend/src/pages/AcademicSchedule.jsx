// src/pages/AcademicSchedule.jsx
import React from 'react';


function AcademicSchedule() {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>학사일정</h2>

      {/* PDF 파일이 제거되어 임시로 메시지 표시 */}
      <div style={{
        padding: '20px',
        textAlign: 'center',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <p>학사일정 PDF가 준비 중입니다.</p>
      </div>
    </div>
  );
}

export default AcademicSchedule;
