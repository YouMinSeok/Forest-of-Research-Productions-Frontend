/* AI 텍스트를 HTML로 변환하는 함수 */
export const convertAITextToHTML = (text) => {
  let hasFormatting = false;

  // 줄 단위로 분할
  const lines = text.split('\n');
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 빈 줄 처리
    if (line.trim() === '') {
      formattedLines.push('<p><br></p>');
      continue;
    }

    // 들여쓰기 감지 (공백 또는 탭)
    const indentMatch = line.match(/^(\s+)/);
    let indentLevel = 0;
    if (indentMatch) {
      // 공백 4개 또는 탭 1개를 들여쓰기 레벨 1로 계산
      const spaces = indentMatch[1].replace(/\t/g, '    ').length;
      indentLevel = Math.min(Math.floor(spaces / 4), 8);
    }

    // 글머리 기호 감지 및 변환
    const bulletPatterns = [
      /^(\s*)[-*•·▪▫‣⁃] (.+)$/, // 기본 글머리 기호
      /^(\s*)(\d+)\.(\s+)(.+)$/, // 번호 매기기
      /^(\s*)([a-zA-Z])\.(\s+)(.+)$/, // 알파벳 매기기
      /^(\s*)([ivxlcdm]+)\.(\s+)(.+)$/i, // 로마 숫자
    ];

    let matched = false;

    // 글머리 기호 패턴 확인
    for (const pattern of bulletPatterns) {
      const match = line.match(pattern);
      if (match) {
        hasFormatting = true;
        matched = true;

        if (pattern === bulletPatterns[0]) {
          // 일반 글머리 기호
          const content = match[2];
          const formattedLine = `<p class="${indentLevel > 0 ? `ql-indent-${indentLevel}` : ''}">• ${content}</p>`;
          formattedLines.push(formattedLine);
        } else if (pattern === bulletPatterns[1]) {
          // 숫자 매기기
          const number = match[2];
          const content = match[4];
          const formattedLine = `<p class="${indentLevel > 0 ? `ql-indent-${indentLevel}` : ''}">${number}. ${content}</p>`;
          formattedLines.push(formattedLine);
        } else {
          // 기타 매기기
          const marker = match[2];
          const content = match[4];
          const formattedLine = `<p class="${indentLevel > 0 ? `ql-indent-${indentLevel}` : ''}">${marker}. ${content}</p>`;
          formattedLines.push(formattedLine);
        }
        break;
      }
    }

    if (!matched) {
      // 마크다운 스타일 헤딩 감지
      const headingMatch = line.match(/^(\s*)(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        hasFormatting = true;
        const level = headingMatch[2].length;
        const content = headingMatch[3];
        const fontSize = level === 1 ? '20px' : level === 2 ? '18px' : '16px';
        const weight = level <= 2 ? 'bold' : 'normal';
        formattedLines.push(`<p style="font-size: ${fontSize}; font-weight: ${weight}; margin-bottom: 10px;">${content}</p>`);
      } else if (indentLevel > 0) {
        // 단순 들여쓰기
        hasFormatting = true;
        formattedLines.push(`<p class="ql-indent-${indentLevel}">${line.trim()}</p>`);
      } else {
        // 일반 텍스트
        formattedLines.push(`<p>${line}</p>`);
      }
    }
  }

  // 마크다운 스타일 강조 처리
  let finalHTML = formattedLines.join('');

  // **굵은 글씨** 처리
  finalHTML = finalHTML.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  hasFormatting = hasFormatting || finalHTML.includes('<strong>');

  // *기울임* 처리
  finalHTML = finalHTML.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  hasFormatting = hasFormatting || finalHTML.includes('<em>');

  // `코드` 처리
  finalHTML = finalHTML.replace(/`([^`]+)`/g, '<code>$1</code>');
  hasFormatting = hasFormatting || finalHTML.includes('<code>');

  return hasFormatting ? finalHTML : text;
};

/* Quill 에디터에 AI 텍스트 클립보드 처리 기능을 추가하는 함수 */
export const setupAITextClipboard = (quillRef) => {
  const quill = quillRef.current?.getEditor();
  if (!quill) return () => {}; // 빈 함수 반환으로 에러 방지

  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;

    // HTML 데이터 우선 시도 (Word/한글 서식 보존)
    const pastedHTML = clipboardData.getData('text/html');
    const pastedText = clipboardData.getData('text/plain');

    if (pastedHTML || pastedText) {
      e.preventDefault();

      const range = quill.getSelection() || { index: quill.getLength(), length: 0 };

      if (pastedHTML) {
        // HTML 서식이 있으면 서식을 보존하여 삽입
        // Word/한글의 굵은 글씨, 들여쓰기 등 서식 보존

        // Word/한글 들여쓰기 전처리
        let processedHTML = pastedHTML;

        // Word의 margin-left를 들여쓰기로 변환
        processedHTML = processedHTML.replace(
          /style="[^"]*margin-left:\s*(\d+(?:\.\d+)?)(pt|px)[^"]*"/g,
          (match, value, unit) => {
            const numValue = parseFloat(value);
            let indentLevel = 0;

            if (unit === 'pt') {
              indentLevel = Math.round(numValue / 36);
            } else if (unit === 'px') {
              indentLevel = Math.round(numValue / 48);
            }

            indentLevel = Math.min(Math.max(indentLevel, 0), 8);

            if (indentLevel > 0) {
              return `class="ql-indent-${indentLevel}"`;
            }
            return '';
          }
        );

        // text-indent도 처리
        processedHTML = processedHTML.replace(
          /style="[^"]*text-indent:\s*(\d+(?:\.\d+)?)(pt|px)[^"]*"/g,
          (match, value, unit) => {
            const numValue = parseFloat(value);
            let indentLevel = 0;

            if (unit === 'pt') {
              indentLevel = Math.round(numValue / 36);
            } else if (unit === 'px') {
              indentLevel = Math.round(numValue / 48);
            }

            indentLevel = Math.min(Math.max(indentLevel, 0), 8);

            if (indentLevel > 0) {
              return `class="ql-indent-${indentLevel}"`;
            }
            return '';
          }
        );

        quill.clipboard.dangerouslyPasteHTML(range.index, processedHTML);
      } else if (pastedText) {
        // AI 텍스트 패턴 감지 및 포맷팅 적용
        const formattedHTML = convertAITextToHTML(pastedText);
        if (formattedHTML !== pastedText) {
          // 포맷팅이 적용된 경우 HTML로 삽입
          quill.clipboard.dangerouslyPasteHTML(range.index, formattedHTML);
        } else {
          // 일반 텍스트로 삽입
          quill.insertText(range.index, pastedText, 'user');
        }
      }

      // 적절한 위치로 커서 이동
      setTimeout(() => {
        const newLength = quill.getLength();
        quill.setSelection(Math.min(range.index + (pastedHTML ? pastedHTML.length : pastedText.length), newLength));
      }, 10);
    }
  };

  // Quill 에디터 DOM 요소에 직접 이벤트 리스너 추가
  const editorElement = quill.root;
  editorElement.addEventListener('paste', handlePaste);

  // 컴포넌트 언마운트 시 이벤트 리스너 제거를 위한 cleanup 함수 반환
  return () => {
    editorElement.removeEventListener('paste', handlePaste);
  };
};
