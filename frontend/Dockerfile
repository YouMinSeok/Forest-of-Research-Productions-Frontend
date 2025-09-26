FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 종속성 설치
RUN npm ci --only=production

# 애플리케이션 코드 복사
COPY . .

# 환경 변수 설정
ENV REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_AI_SERVICE_URL=http://localhost:8001
ENV NODE_ENV=production

# 포트 노출
EXPOSE 3000

# 개발 서버 시작 (프로덕션에서는 빌드 후 serve 사용)
CMD ["npm", "start"]
