import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { ChromePicker } from 'react-color';
import 'react-quill/dist/quill.snow.css';
import './MemoBoardFigmaLike.css';

function MemoBoardFigmaLike() {
  // ------------------------------------------------------
  // [1] 상태
  // ------------------------------------------------------
  // 도구: select, pen, eraser, shape, text, richText
  const [tool, setTool] = useState('select');

  // **Pen/Eraser** 설정
  const [lineColor, setLineColor] = useState('#000000'); // 펜 색
  const [lineWidth, setLineWidth] = useState(3);         // 펜 두께
  const [eraserWidth, setEraserWidth] = useState(10);    // 지우개 두께

  // **Shapes** 설정 (라인, 화살표, 사각형, 타원)
  const [shapeType, setShapeType] = useState('arrow');   // 기본 화살표
  const [shapeStrokeColor, setShapeStrokeColor] = useState('#000000');
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(3);
  const [shapeFillColor, setShapeFillColor] = useState('transparent');

  // 펜 드로잉
  const [lines, setLines] = useState([]); // [{ color, width, points: [{x,y}, ...] }]
  const [currentLine, setCurrentLine] = useState(null);

  // 도형
  const [shapes, setShapes] = useState([]);
  // shape 예: {
  //   id, type: 'line'|'arrow'|'rectangle'|'ellipse',
  //   startX, startY, endX, endY,
  //   strokeColor, strokeWidth, fillColor
  // }
  const [currentShape, setCurrentShape] = useState(null);

  // 텍스트/리치텍스트
  const [items, setItems] = useState([]);
  // item 예: {
  //   id, type: 'text'|'richText', x,y,w,h,
  //   content, title, color, isEditing
  // }
  const [tempShape, setTempShape] = useState(null); // 텍스트 드래그 박스
  const [selectedId, setSelectedId] = useState(null);

  // 리치텍스트 모달
  const [showModal, setShowModal] = useState(false);
  const [rtTitle, setRtTitle] = useState('');
  const [rtContent, setRtContent] = useState('');
  const [rtColor, setRtColor] = useState('#ffffff');

  // Undo/Redo
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // 보드 참조
  const boardRef = useRef(null);
  const canvasRef = useRef(null);

  // ------------------------------------------------------
  // [2] 화면좌표 → 보드좌표 변환
  // ------------------------------------------------------
  const screenToBoard = (clientX, clientY) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // ------------------------------------------------------
  // [3] Undo/Redo
  // ------------------------------------------------------
  const pushHistory = () => {
    const state = {
      lines: JSON.parse(JSON.stringify(lines)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      items: JSON.parse(JSON.stringify(items))
    };
    setUndoStack((prev) => [...prev, state]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const current = {
      lines: JSON.parse(JSON.stringify(lines)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      items: JSON.parse(JSON.stringify(items))
    };
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, current]);
    setLines(prevState.lines);
    setShapes(prevState.shapes);
    setItems(prevState.items);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const current = {
      lines: JSON.parse(JSON.stringify(lines)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      items: JSON.parse(JSON.stringify(items))
    };
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, current]);
    setLines(nextState.lines);
    setShapes(nextState.shapes);
    setItems(nextState.items);
  };

  // ------------------------------------------------------
  // [4] 펜/도형 그리기
  // ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 펜(또는 지우개) 라인들
    lines.forEach((line) => drawLine(ctx, line));
    if (currentLine) drawLine(ctx, currentLine);

    // 도형들
    shapes.forEach((shape) => drawShape(ctx, shape));
    if (currentShape) drawShape(ctx, currentShape);
  }, [lines, currentLine, shapes, currentShape]);

  // 펜/지우개 라인
  const drawLine = (ctx, line) => {
    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    line.points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();
  };

  // 도형(라인, 화살표, 사각형, 타원)
  const drawShape = (ctx, shape) => {
    const {
      type, startX, startY, endX, endY, strokeColor, strokeWidth, fillColor
    } = shape;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor || 'transparent';

    if (type === 'line') {
      // 직선
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (type === 'arrow') {
      // 화살표
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      // 화살표 머리
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLen = 15 + strokeWidth;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(endX, endY);
      ctx.fillStyle = strokeColor;
      ctx.fill();
    } else if (type === 'rectangle') {
      // 사각형
      const rx = Math.min(startX, endX);
      const ry = Math.min(startY, endY);
      const rw = Math.abs(endX - startX);
      const rh = Math.abs(endY - startY);
      ctx.beginPath();
      ctx.rect(rx, ry, rw, rh);
      ctx.fill();
      ctx.stroke();
    } else if (type === 'ellipse') {
      // 타원
      const rx = (startX + endX) / 2;
      const ry = (startY + endY) / 2;
      const rw = Math.abs(endX - startX) / 2;
      const rh = Math.abs(endY - startY) / 2;
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  };

  // ------------------------------------------------------
  // [5] 보드 마우스 이벤트
  // ------------------------------------------------------
  const handleBoardMouseDown = (e) => {
    if (e.button === 2) return; // 우클릭 무시
    e.preventDefault();
    pushHistory();

    const { x, y } = screenToBoard(e.clientX, e.clientY);

    // Pen/Eraser
    if (tool === 'pen') {
      setCurrentLine({
        color: lineColor,
        width: lineWidth,
        points: [{ x, y }]
      });
    } else if (tool === 'eraser') {
      setCurrentLine({
        color: '#ffffff',
        width: eraserWidth,
        points: [{ x, y }]
      });
    }
    // 도형
    else if (tool === 'shape') {
      setCurrentShape({
        id: Date.now(),
        type: shapeType,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        strokeColor: shapeStrokeColor,
        strokeWidth: shapeStrokeWidth,
        fillColor: shapeFillColor
      });
    }
    // 텍스트
    else if (tool === 'text') {
      setTempShape({
        type: 'text',
        startX: x,
        startY: y,
        x,
        y,
        w: 0,
        h: 0
      });
    }
  };

  const handleBoardMouseMove = (e) => {
    if (e.buttons !== 1) return;
    e.preventDefault();
    const { x, y } = screenToBoard(e.clientX, e.clientY);

    // Pen/Eraser
    if (currentLine) {
      setCurrentLine((prev) => ({
        ...prev,
        points: [...prev.points, { x, y }]
      }));
    }
    // Shape
    if (currentShape) {
      setCurrentShape((prev) => ({
        ...prev,
        endX: x,
        endY: y
      }));
    }
    // Text
    if (tempShape) {
      const { startX, startY } = tempShape;
      setTempShape({
        ...tempShape,
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        w: Math.abs(x - startX),
        h: Math.abs(y - startY)
      });
    }
  };

  const handleBoardMouseUp = (_e) => {
    // Pen/Eraser
    if (currentLine) {
      setLines((prev) => [...prev, currentLine]);
      setCurrentLine(null);
    }
    // Shape
    if (currentShape) {
      setShapes((prev) => [...prev, currentShape]);
      setCurrentShape(null);
    }
    // Text
    if (tempShape) {
      const { x, y, w, h } = tempShape;
      if (w > 5 && h > 5) {
        const newText = {
          id: Date.now(),
          type: 'text',
          x, y, w, h,
          content: '',
          isEditing: false
        };
        setItems((prev) => [...prev, newText]);
      }
      setTempShape(null);
      // 자동으로 select로 전환 (무한 텍스트 생성 방지)
      setTool('select');
    }
  };

  // ------------------------------------------------------
  // [6] 아이템(텍스트/리치텍스트) 이동/삭제
  // ------------------------------------------------------
  const handleItemMouseDown = (e, id) => {
    if (tool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    pushHistory();

    setSelectedId(id);
    const item = items.find((it) => it.id === id);
    if (!item) return;

    const startPos = screenToBoard(e.clientX, e.clientY);
    const offsetX = startPos.x - item.x;
    const offsetY = startPos.y - item.y;

    const onMouseMove = (ev) => {
      ev.preventDefault();
      const { x, y } = screenToBoard(ev.clientX, ev.clientY);
      const newX = x - offsetX;
      const newY = y - offsetY;
      setItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, x: newX, y: newY } : it
        )
      );
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleItemContextMenu = (e, id) => {
    if (tool !== 'select') return;
    e.preventDefault();
    e.stopPropagation();
    pushHistory();
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId(null);
  };

  const handleTextDblClick = (id) => {
    if (tool !== 'select') return;
    pushHistory();
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, isEditing: true } : it
      )
    );
  };

  const handleTextKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTextBlur(id);
    }
  };

  const handleTextChange = (id, val) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, content: val } : it
      )
    );
  };

  const handleTextBlur = (id) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, isEditing: false } : it
      )
    );
  };

  // ------------------------------------------------------
  // [7] RichText 모달
  // ------------------------------------------------------
  const openRichModal = () => {
    setShowModal(true);
    setTool('richText');
    setRtTitle('');
    setRtContent('');
    setRtColor('#ffffff');
  };

  const closeRichModal = () => {
    setShowModal(false);
    setTool('select');
  };

  const handleCreateRichText = () => {
    pushHistory();
    let x = 200,
      y = 200;
    const richs = items.filter((it) => it.type === 'richText');
    if (richs.length > 0) {
      const last = richs[richs.length - 1];
      x = last.x + 50;
      y = last.y + 50;
    }
    const newItem = {
      id: Date.now(),
      type: 'richText',
      title: rtTitle,
      content: rtContent,
      color: rtColor,
      x,
      y
    };
    setItems((prev) => [...prev, newItem]);
    closeRichModal();
  };

  // ------------------------------------------------------
  // [8] Reset
  // ------------------------------------------------------
  const handleReset = () => {
    pushHistory();
    setLines([]);
    setShapes([]);
    setItems([]);
    setSelectedId(null);
  };

  // ------------------------------------------------------
  // [9] 커서
  // ------------------------------------------------------
  const getCursorStyle = () => {
    if (tool === 'pen' || tool === 'eraser' || tool === 'shape') return 'crosshair';
    if (tool === 'text') return 'text';
    return 'default';
  };

  // ------------------------------------------------------
  // [10] UI: 펜/지우개/도형 설정
  // ------------------------------------------------------
  const [showPenConfig, setShowPenConfig] = useState(false);
  const [showEraserConfig, setShowEraserConfig] = useState(false);
  const [showShapeConfig, setShowShapeConfig] = useState(false);

  const handlePenClick = () => {
    setTool('pen');
    setShowPenConfig((p) => !p);
    setShowEraserConfig(false);
    setShowShapeConfig(false);
  };
  const handleEraserClick = () => {
    setTool('eraser');
    setShowEraserConfig((p) => !p);
    setShowPenConfig(false);
    setShowShapeConfig(false);
  };
  const handleShapeClick = () => {
    setTool('shape');
    setShowShapeConfig((p) => !p);
    setShowPenConfig(false);
    setShowEraserConfig(false);
  };

  return (
    <div className="memo-board-figma-container">
      {/* 리치텍스트 모달 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={closeRichModal}>
              닫기
            </button>
            <h3>리치 텍스트 작성</h3>
            <div className="form-row">
              <label>제목</label>
              <input
                type="text"
                placeholder="제목 입력"
                value={rtTitle}
                onChange={(e) => setRtTitle(e.target.value)}
              />
            </div>
            <div className="form-row">
              <label>내용</label>
              <ReactQuill
                theme="snow"
                value={rtContent}
                onChange={setRtContent}
                placeholder="내용 입력"
              />
            </div>
            <div className="form-row">
              <label>배경 색상</label>
              <ChromePicker
                color={rtColor}
                onChangeComplete={(c) => setRtColor(c.hex)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="submit-btn" onClick={handleCreateRichText}>
                추가
              </button>
              <button className="submit-btn" onClick={closeRichModal}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 툴바 */}
      <div className="toolbar">
        {/* Undo/Redo */}
        <button className="tool-btn" onClick={handleUndo}>⟲</button>
        <button className="tool-btn" onClick={handleRedo}>⟳</button>

        {/* Select */}
        <button
          className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
          onClick={() => {
            setTool('select');
            setShowPenConfig(false);
            setShowEraserConfig(false);
            setShowShapeConfig(false);
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 4 L20 12 L4 20 z" fill="currentColor" />
          </svg>
        </button>

        {/* Pen */}
        <div className="tool-with-dropdown">
          <button
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={handlePenClick}
          >
            <svg viewBox="0 0 24 24">
              <path d="M2 22 L6 22 L22 6 L18 2 z" fill="currentColor" />
            </svg>
          </button>
          {showPenConfig && (
            <div className="dropdown-panel">
              <div className="dropdown-row">
                <label>펜 색상</label>
                <ChromePicker
                  color={lineColor}
                  onChangeComplete={(c) => setLineColor(c.hex)}
                />
              </div>
              <div className="dropdown-row">
                <label>두께</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                />
                <span>{lineWidth}px</span>
              </div>
            </div>
          )}
        </div>

        {/* Eraser */}
        <div className="tool-with-dropdown">
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={handleEraserClick}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 15 L9 9 L15 15 L9 21 z" fill="currentColor" />
            </svg>
          </button>
          {showEraserConfig && (
            <div className="dropdown-panel">
              <div className="dropdown-row">
                <label>지우개 두께</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={eraserWidth}
                  onChange={(e) => setEraserWidth(parseInt(e.target.value))}
                />
                <span>{eraserWidth}px</span>
              </div>
            </div>
          )}
        </div>

        {/* Shape */}
        <div className="tool-with-dropdown">
          <button
            className={`tool-btn ${tool === 'shape' ? 'active' : ''}`}
            onClick={handleShapeClick}
          >
            {/* 기본 사각형 아이콘 */}
            <svg viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          {showShapeConfig && (
            <div className="dropdown-panel">
              <div className="dropdown-row">
                <label>도형 종류</label>
                <select
                  value={shapeType}
                  onChange={(e) => setShapeType(e.target.value)}
                >
                  <option value="line">직선</option>
                  <option value="arrow">화살표</option>
                  <option value="rectangle">사각형</option>
                  <option value="ellipse">타원</option>
                </select>
              </div>
              <div className="dropdown-row">
                <label>선 색상</label>
                <ChromePicker
                  color={shapeStrokeColor}
                  onChangeComplete={(c) => setShapeStrokeColor(c.hex)}
                />
              </div>
              <div className="dropdown-row">
                <label>두께</label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={shapeStrokeWidth}
                  onChange={(e) => setShapeStrokeWidth(parseInt(e.target.value))}
                />
                <span>{shapeStrokeWidth}px</span>
              </div>
              <div className="dropdown-row">
                <label>채우기 색상</label>
                <ChromePicker
                  color={shapeFillColor}
                  onChangeComplete={(c) => setShapeFillColor(c.hex)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Text */}
        <button
          className={`tool-btn ${tool === 'text' ? 'active' : ''}`}
          onClick={() => {
            setTool('text');
            setShowPenConfig(false);
            setShowEraserConfig(false);
            setShowShapeConfig(false);
          }}
        >
          <svg viewBox="0 0 24 24">
            <text x="3" y="18" fontSize="16" fill="currentColor">T</text>
          </svg>
        </button>

        {/* RichText */}
        <button
          className="tool-btn"
          onClick={openRichModal}
        >
          <svg viewBox="0 0 24 24">
            <path d="M2 2 H22 V22 H2 Z M6 6 H18 M6 10 H18 M6 14 H12" stroke="currentColor" fill="none" strokeWidth="2"/>
          </svg>
        </button>

        {/* Reset */}
        <button
          className="tool-btn"
          onClick={handleReset}
          style={{ marginLeft: 'auto' }}
        >
          Reset
        </button>
      </div>

      {/* 보드 */}
      <div
        className="board-wrapper"
        ref={boardRef}
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* 드로잉 Canvas */}
        <canvas
          ref={canvasRef}
          width={2000}
          height={2000}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            background: '#ffffff',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)' /* 약간의 그림자 */
          }}
        />

        {/* 텍스트 드래그 시점 */}
        {tempShape && (
          <div
            className="temp-shape"
            style={{
              left: tempShape.x,
              top: tempShape.y,
              width: tempShape.w,
              height: tempShape.h
            }}
          />
        )}

        {/* 텍스트/리치텍스트 아이템 */}
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          if (item.type === 'text') {
            return (
              <div
                key={item.id}
                className={`shape-text ${isSelected ? 'selected' : ''}`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.w,
                  height: item.h
                }}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                onContextMenu={(e) => handleItemContextMenu(e, item.id)}
                onDoubleClick={() => handleTextDblClick(item.id)}
              >
                {item.isEditing ? (
                  <textarea
                    className="text-editor"
                    style={{ width: '100%', height: '100%' }}
                    value={item.content}
                    autoFocus
                    onBlur={() => handleTextBlur(item.id)}
                    onChange={(ev) => handleTextChange(item.id, ev.target.value)}
                    onKeyDown={(ev) => handleTextKeyDown(ev, item.id)}
                  />
                ) : (
                  <div className="text-display">
                    {item.content || '더블클릭하여 편집'}
                  </div>
                )}
              </div>
            );
          } else if (item.type === 'richText') {
            return (
              <div
                key={item.id}
                className={`shape-richtext ${isSelected ? 'selected' : ''}`}
                style={{
                  left: item.x,
                  top: item.y,
                  backgroundColor: item.color
                }}
                onMouseDown={(e) => handleItemMouseDown(e, item.id)}
                onContextMenu={(e) => handleItemContextMenu(e, item.id)}
              >
                <strong>{item.title || '제목 없음'}</strong>
                <div
                  className="richtext-content"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default MemoBoardFigmaLike;
