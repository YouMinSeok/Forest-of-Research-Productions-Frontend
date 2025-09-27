// 프로덕션 환경에서 console.log를 비활성화하는 로거 유틸리티

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const disableConsole = process.env.REACT_APP_DISABLE_CONSOLE === 'true';

export const logger = {
  log: (...args) => {
    if (isDevelopment && !disableConsole) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isDevelopment && !disableConsole) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // 에러는 프로덕션에서도 표시 (필요에 따라 조정 가능)
    console.error(...args);
  },
  info: (...args) => {
    if (isDevelopment && !disableConsole) {
      console.info(...args);
    }
  },
  debug: (...args) => {
    if (isDevelopment && !disableConsole) {
      console.debug(...args);
    }
  }
};

// 전역 console 객체를 오버라이드 (프로덕션 환경에서)
if (isProduction || disableConsole) {
  window.console.log = () => {};
  window.console.info = () => {};
  window.console.debug = () => {};
  window.console.warn = () => {};
  // console.error는 유지 (중요한 에러는 프로덕션에서도 볼 수 있도록)
}

export default logger;
