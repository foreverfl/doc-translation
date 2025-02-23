# 📜 Document Translation CLI

[🇰🇷 한국어 버전](README_ko.md) | [🇯🇵 日本語バージョン](README_ja.md)

## 🚀 Introduction
The **Document Translation CLI** is an automated tool that translates documents using the OpenAI API.  
It supports batch translation and maintains a **custom terminology dictionary** to ensure translation consistency.

## 🛠 Installation

### 1️⃣ Prerequisites
- Node.js (v18+ recommended)
- Docker (optional, for creating fine-tuned models)
- An OpenAI API Key

### 2️⃣ Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd doc-translation
   ```

2. Docker setup (optional):
   ```sh
   docker compose up -d
   ```
   - This will create a PostgreSQL database for storing custom terminology.

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file:
   ```sh
   touch .env
   ```

4. Add your OpenAI API key in `.env`:
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 Usage

### Predict the cost of translation
```sh
npm run predict folder_path
```
Example:
```sh
npm run predict ./docs/
```

### Translate a single file
```sh
npm run translate-file file_path
```
Example:
```sh
npm run translate ~/docs/sample.md
```

### Translate a folder (batch processing)
```sh
npm run translate-folder folder_path
```
Example:
```sh
npm run translate-folder ./docs/
```

## Documentation translated by this project

- [PostgreSQL Documentation - Korean](https://postgresql.mogumogu.dev/)

## 📜 License
This project is licensed under the MIT License.