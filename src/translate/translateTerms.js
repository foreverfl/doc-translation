import nlp from "compromise";
import dotenv from "dotenv";
import fs from "fs/promises";
import OpenAI from "openai";
import path from "path";
import stopwords from "stopwords-iso" assert { type: "json" };

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function translateWords(wordsObject) {
    if (!wordsObject || !wordsObject.english || wordsObject.english.length === 0) {
        console.log("⚠️ No words to translate.");
        return { english: [], korean: [], japanese: [] };
    }

    try {
        console.log("🔍 Translating words:", wordsObject.english);

        // ✅ 1. Load prompt template
        const promptTemplate = await fs.readFile(path.resolve("prompts/terms.txt"), "utf-8");

        // ✅ 2. Inject word list into prompt
        const prompt = promptTemplate.replace("{WORDS_ARRAY}", JSON.stringify(wordsObject.english));

        // ✅ 3. Call OpenAI API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional translator specializing in technical terms." },
                { role: "user", content: prompt }
            ],
            temperature: 0.2,
        });

        let translatedText = response.choices[0]?.message?.content?.trim() || "";

        // ✅ 4. Ensure JSON parsing is safe
        let translations = { english: [], korean: [], japanese: [] };
        try {
            translatedText = translatedText.replace(/^```json\n|\n```$/g, "").trim(); // ✅ JSON 코드 블록 제거
            translations = JSON.parse(translatedText);

            // ✅ Validate JSON structure
            if (!Array.isArray(translations.english) || !Array.isArray(translations.korean) || !Array.isArray(translations.japanese)) {
                throw new Error("Invalid JSON format");
            }
        } catch (parseError) {
            console.error("❌ Failed to parse JSON response, falling back to manual parsing...");
            translations = {
                english: wordsObject.english,
                korean: wordsObject.english.map(() => "번역 오류"),
                japanese: wordsObject.english.map(() => "翻訳エラー"),
            };
        }

        console.log("✅ Parsed Translations:", translations);
        return translations;
    } catch (error) {
        console.error("❌ Error translating words:", error);
        return { english: wordsObject.english, korean: wordsObject.english.map(() => "번역 오류"), japanese: wordsObject.english.map(() => "翻訳エラー") };
    }
}

export function extractFrequentNouns(content, minCount = 5) {
    const STOPWORDS = new Set(stopwords.en); // 영어 불용어 목록

    const doc = nlp(content);
    let words = doc.nouns().out("array");

    words = words
        .map(word => word.replace(/[^\w\s-]/g, "").trim()) // 특수문자 제거
        .flatMap(word => word.split(/\s+/)) // ✅ 띄어쓰기 포함된 단어 분리 ("the tests" → ["the", "tests"])
        .map(word => word.toLowerCase()) // ✅ 대소문자 구분 제거
        .filter(word => word && !STOPWORDS.has(word)); // ✅ 불용어 필터 적용

    const wordCounts = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {});

    const frequentNouns = Object.keys(wordCounts).filter(word => wordCounts[word] >= minCount);

    if (frequentNouns.length === 0) {
        console.log("⚠️ No frequent nouns found.");
        return [];
    }

    return frequentNouns;
}

export function filterContent(content) {
    // 1. Remove HTML tags (e.g., `<html>`, `<div>`, `</p>`, etc.)
    const withoutHtmlTags = content.replace(/<[^>]*>/g, "");

    // 2. Remove code blocks and comments (e.g., ```code```, `/* comment */`)
    const withoutCodeBlocks = withoutHtmlTags
        .replace(/```[\s\S]*?```/g, "") // Remove code blocks enclosed in triple backticks (```)
        .replace(/\/\*[\s\S]*?\*\//g, "") // Remove C-style block comments (/* ... */)
        .replace(/\/\/[^\n]*/g, "") // Remove single-line comments in JavaScript (// ...)
        .replace(/<!--[\s\S]*?-->/g, ""); // Remove HTML comments (<!-- ... -->)

    return withoutCodeBlocks.trim();
}
