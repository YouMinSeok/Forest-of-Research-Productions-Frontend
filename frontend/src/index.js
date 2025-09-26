import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// ReactQuill 관련 경고 필터링
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] &&
    (args[0].includes('findDOMNode is deprecated') ||
     args[0].includes('DOMNodeInserted mutation event'))
  ) {
    return; // ReactQuill 관련 경고는 숨김
  }
  originalWarn.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
