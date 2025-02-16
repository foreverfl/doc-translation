# 📜 문서 번역 봇

[🇬🇧 English Version](README.md) | [🇯🇵 日本語バージョン](README_ja.md)

## 🚀 소개
**문서 번역 봇**은 OpenAI API를 활용하여 문서를 자동 번역하는 도구입니다.  
대량 번역을 지원하며, **사용자 지정 용어집**을 사용하여 번역 일관성을 유지합니다.

## 🛠 설치

### 1️⃣ 사전 준비
- Node.js (v18 이상 권장)
- OpenAI API 키

### 2️⃣ 설정
1. 이 저장소를 클론합니다.
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd translation-bot
   ```

2. 패키지를 설치합니다.
   ```sh
   npm install
   ```

3. `.env` 파일을 생성합니다.
   ```sh
   cp .env.example .env
   ```

4. `.env` 파일에 OpenAI API 키를 입력합니다.
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 사용법

### 1️⃣ 단일 파일 번역
```sh
npm run translate file_path
```
예제:
```sh
npm run translate ./docs/sample.md
```

### 2️⃣ 폴더 전체 번역 (대량 번역)
```sh
npm run translate-folder folder_path
```
예제:
```sh
npm run translate-folder ./docs/
```

### 3️⃣ 파인 튜닝 모델 생성
```sh
npm run create-model
```

## 📂 프로젝트 구조
```
translation-bot/
│── src/
│   ├── translate.js              # 단일 파일 번역
│   ├── translateFolder.js        # 폴더 전체 번역
│   ├── createFineTunedModel.js   # 파인 튜닝 모델 생성
│   ├── utils.js                  # 유틸리티 함수 (파일 처리 등)
│── terms/                        # 사용자 지정 용어집
│── .env.example                  # 환경 변수 예제 파일
│── package.json                   # npm 스크립트
│── README.md                      # 영어 버전
│── README_ko.md                    # 한국어 버전
│── README_ja.md                    # 일본어 버전
```

## 📜 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다.
```