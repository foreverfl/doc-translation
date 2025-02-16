# 📜 Document Translation Bot

[🇰🇷 한국어 버전](README_ko.md) | [🇯🇵 日本語バージョン](README_ja.md)

## 🚀 Introduction
The **Document Translation Bot** is an automated tool that translates documents using the OpenAI API.  
It supports batch translation and maintains a **custom terminology dictionary** to ensure translation consistency.

## 🛠 Installation

### 1️⃣ Prerequisites
- Node.js (v18+ recommended)
- An OpenAI API Key

### 2️⃣ Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd translation-bot
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create a `.env` file:
   ```sh
   cp .env.example .env
   ```

4. Add your OpenAI API key in `.env`:
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 Usage

### 1️⃣ Translate a single file
```sh
npm run translate file_path
```
Example:
```sh
npm run translate ./docs/sample.md
```

### 2️⃣ Translate a folder (batch processing)
```sh
npm run translate-folder folder_path
```
Example:
```sh
npm run translate-folder ./docs/
```

### 3️⃣ Create a fine-tuned model
```sh
npm run create-model
```

## 📂 Project Structure
```
translation-bot/
│── src/
│   ├── translate.js              # Translate a single file
│   ├── translateFolder.js        # Translate an entire folder
│   ├── createFineTunedModel.js   # Create fine-tuned models
│   ├── utils.js                  # Utility functions (file handling, etc.)
│── terms/                        # Custom terminology dictionary
│── .env.example                  # Sample environment variables
│── package.json                   # npm scripts
│── README.md                      # English version
│── README_ko.md                    # Korean version
│── README_ja.md                    # Japanese version
```

## 📜 License
This project is licensed under the MIT License.