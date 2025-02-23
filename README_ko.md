# 📜 문서 번역 CLI

[🇬🇧 English Version](README.md) | [🇯🇵 日本語バージョン](README_ja.md)

## 🚀 소개
**문서 번역 CLI**은 OpenAI API를 사용하여 문서를 자동으로 번역하는 도구입니다.  
배치 번역을 지원하며, **커스텀 용어 사전**을 유지하여 번역 일관성을 보장합니다.

## 🛠 설치

### 1️⃣ 필수 사항
- Node.js (v18+ 권장)
- Docker (선택 사항, 모델 튜닝을 위한 옵션)
- OpenAI API 키

### 2️⃣ 설정
1. 이 저장소를 클론합니다:
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd doc-translation
   ```

2. Docker 설정 (선택 사항):
   ```sh
   docker compose up -d
   ```
   - 이는 커스텀 용어를 저장할 PostgreSQL 데이터베이스를 생성합니다.

2. 종속성 설치:
   ```sh
   npm install
   ```

3. `.env` 파일을 생성합니다:
   ```sh
   touch .env
   ```

4. `.env` 파일에 OpenAI API 키를 추가합니다:
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 사용법

### 번역 비용 예측
```sh
npm run predict folder_path
```
예시:
```sh
npm run predict ./docs/
```

### 단일 파일 번역
```sh
npm run translate-file file_path
```
예시:
```sh
npm run translate ~/docs/sample.md
```

### 폴더 번역 (배치 처리)
```sh
npm run translate-folder folder_path
```
예시:
```sh
npm run translate-folder ./docs/
```

## 이 프로젝트로 번역된 문서들

- [PostgreSQL Documentation - 한국어](https://postgresql.mogumogu.dev/)

## 📜 라이선스
이 프로젝트는 MIT 라이선스를 따릅니다.