# 최신 Node.js 이미지 사용
FROM node:latest

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# package.json 및 package-lock.json 복사 후 의존성 설치
COPY package*.json ./
RUN npm install

# 모든 소스 코드 복사
COPY . .

# 컨테이너가 종료되지 않도록 대기 상태 유지
CMD ["tail", "-f", "/dev/null"]
