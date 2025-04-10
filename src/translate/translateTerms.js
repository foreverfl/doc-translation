import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import logger from "@utils/logger.js";
import nlp from "compromise";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const openai = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.2,
});

export async function translateWords(wordsObject) {

    if (!wordsObject || !wordsObject.english || wordsObject.english.length === 0) {
        logger.info("⚠️ No words to translate.");
        return { english: [], korean: [], japanese: [] };
    }

    try {
        // ✅ 1. Load prompt template
        const promptTemplateStr = await fs.readFile(path.resolve("prompts/terms.txt"), "utf-8");

        // ✅ 2. Inject word list into prompt
        const prompt = new PromptTemplate({
            template: promptTemplateStr,
            inputVariables: ["WORDS_ARRAY"],
        });

        const formattedPrompt = await prompt.format({
            WORDS_ARRAY: JSON.stringify(wordsObject.english),
        });

        // ✅ 3. Call OpenAI API
        const response = await openai.invoke(formattedPrompt);

        // logger.info("🔍 Raw OpenAI Response:\n", response.content);

        let translatedText = response.content.trim();

        // ✅ 4. Ensure JSON parsing is safe
        let translatedWords = { english: [], korean: [], japanese: [] };
        try {
            translatedText = translatedText.replace(/^```json\n|\n```$/g, "").trim(); // ✅ JSON 코드 블록 제거
            translatedWords = JSON.parse(translatedText);

            // ✅ Validate JSON structure
            if (!Array.isArray(translatedWords.english) || !Array.isArray(translatedWords.korean) || !Array.isArray(translatedWords.japanese)) {
                throw new Error("Invalid JSON format");
            }
        } catch (parseError) {
            logger.error("❌ Failed to parse JSON response, falling back to manual parsing...");
            translatedWords = {
                english: wordsObject.english,
                korean: wordsObject.english.map(() => null),
                japanese: wordsObject.english.map(() => null),
            };
        }

        return translatedWords;
    } catch (error) {
        logger.error("❌ Error translating words:", error);
        return { english: wordsObject.english, korean: wordsObject.english.map(() => null), japanese: wordsObject.english.map(() => null) };
    }
}

export async function extractFrequentNouns(content, minCount = 5) {
    // read stopwords-en.json file and parse it
    const data = await readFile('./stopwords-en.json', 'utf-8');
    const stopwords = JSON.parse(data);
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
        logger.info("⚠️ No frequent nouns found.");
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
