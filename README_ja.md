# 📜 ドキュメント翻訳CLI

[🇬🇧 English Version](README.md) | [🇰🇷 한국어 버전](README_ko.md)

## 🚀 はじめに
**ドキュメント翻訳CLI**は、OpenAI APIを使用して文書を自動的に翻訳するツールです。  
バッチ翻訳をサポートし、**カスタム用語辞書**を保持して翻訳の一貫性を保証します。

## 🛠 インストール

### 1️⃣ 必要なもの
- Node.js (v18+ 推奨)
- Docker (オプション、モデルチューニング用)
- OpenAI API キー

### 2️⃣ セットアップ
1. このリポジトリをクローンします:
   ```sh
   git clone https://github.com/your-repo/translation-bot.git
   cd doc-translation
   ```

2. Docker設定 (オプション):
   ```sh
   docker compose up -d
   ```
   - これにより、カスタム用語を保存するためのPostgreSQLデータベースが作成されます。

2. 依存関係をインストール:
   ```sh
   npm install
   ```

3. `.env` ファイルを作成:
   ```sh
   touch .env
   ```

4. `.env` ファイルにOpenAI APIキーを追加:
   ```
   OPENAI_API_KEY=your_api_key
   ```

## 🚀 使用方法

### 翻訳コストの予測
```sh
npm run predict folder_path
```
例:
```sh
npm run predict ./docs/
```

### 単一ファイルの翻訳
```sh
npm run translate-file file_path
```
例:
```sh
npm run translate ~/docs/sample.md
```

### フォルダの翻訳（バッチ処理）
```sh
npm run translate-folder folder_path
```
例:
```sh
npm run translate-folder ./docs/
```

## このプロジェクトで翻訳されたドキュメント

- [PostgreSQL Documentation - 日本語](https://postgresql.mogumogu.dev/)

## 📜 ライセンス
このプロジェクトはMITライセンスの下で公開されています。