const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 환경변수에서 HOST_IP 가져오기
  const hostIp = process.env.REACT_APP_HOST_IP;
  const port = process.env.REACT_APP_API_PORT || '8080';

  if (!hostIp) {
    console.error('REACT_APP_HOST_IP 환경변수가 설정되지 않았습니다. .env 파일에서 IP를 설정해주세요.');
    return;
  }

  const targetUrl = `http://${hostIp}:${port}`;
  console.log(`프록시 설정: /api -> ${targetUrl}`);

  app.use(
    '/api',
    createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );
};
