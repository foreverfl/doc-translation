# 📜 ドキュメント翻訳ボット

[🇬🇧 English Version](README.md) | [🇰🇷 한국어 버전](README_ko.md)

## 🚀 概要
**ドキュメント翻訳ボット**は、OpenAI APIを使用してドキュメントを自動翻訳するツールです。  
大量の翻訳をサポートし、**カスタム用語集**を利用して翻訳の一貫性を維持します。

## 🛠 インストール

### 1️⃣ 事前準備
- Node.js (v18以上推奨)
- OpenAI APIキー

### 2️⃣ 設定
1. このリポジトリをクローンします。
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd translation-bot
   ```

2. パッケージをインストールします。
   ```sh
   npm install
   ```

3. `.env`ファイルを作成します。
   ```sh
   cp .env.example .env
   ```

4. `.env`ファイルにOpenAI APIキーを入力します。
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 使い方

### 1️⃣ 単一ファイルの翻訳
```sh
npm run translate file_path
```
例:
```sh
npm run translate ./docs/sample.md
```

### 2️⃣ フォルダー全体の翻訳 (バッチ処理)
```sh
npm run translate-folder folder_path
```
例:
```sh
npm run translate-folder ./docs/
```

### 3️⃣ ファインチューニングモデルの作成
```sh
npm run create-model
```

## 📂 プロジェクト構成
```
translation-bot/
│── src/
│   ├── translate.js              # 単一ファイルの翻訳
│   ├── translateFolder.js        # フォルダー全体の翻訳
│   ├── createFineTunedModel.js   # ファインチューニングモデルの作成
│   ├── utils.js                  # ユーティリティ関数 (ファイル処理など)
│── terms/                        # カスタム用語集
│── .env.example                  # 環境変数のサンプル
│── package.json                   # npmスクリプト
│── README.md                      # 英語バージョン
│── README_ko.md                    # 韓国語バージョン
│── README_ja.md                    # 日本語バージョン
```

## 📜 ライセンス
このプロジェクトはMITライセンスの下で提供されています。