import nlp from "compromise";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function translateWords(words) {
    if (words.length === 0) {
        console.log("⚠️ No words to translate.");
        return {};
    }

    try {
        console.log("🔍 Translating words:", words);
        const prompt = `
            Translate the following technical terms into Korean as a JSON object. Example:
            {
            "AI": "인공지능",
            "Machine Learning": "기계 학습",
            "Data": "데이터"
            }
            Translate these words:
            ${JSON.stringify(words)}
            `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
        });
        let translatedText = response.choices[0]?.message?.content || "";3
        translatedText = translatedText.replace(/^```json\n|\n```$/g, "").trim();
        console.log("📜 Raw Translated Text:", translatedText);

        let translations = {};
        try {
            translations = JSON.parse(translatedText);
        } catch (parseError) {
            console.error("❌ Failed to parse JSON response, falling back to manual parsing...");
            translations = translatedText
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.includes("-"))
                .reduce((acc, line) => {
                    const [eng, kor] = line.split("-").map(str => str.trim());
                    acc[eng] = kor;
                    return acc;
                }, {});
        }

        console.log("✅ Parsed Translations:", translations);
        return translations;
    } catch (error) {
        console.error("❌ Error translating words:", error);
        return {};
    }
}

export async function extractFrequentNouns(content, minCount = 5) {
    const doc = nlp(content);
    let words = doc.nouns().out("array");

    words = words.map(word => word.replace(/[^\w\s-]/g, "").trim()).filter(word => word);
    console.log("🔎 Extracted Nouns:", words);

    const wordCounts = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {});
    console.log("📊 Word Counts:", wordCounts);

    const frequentNouns = Object.entries(wordCounts)
        .filter(([_, count]) => count >= minCount)
        .map(([word, count]) => ({ word, count }));

    if (frequentNouns.length === 0) {
        console.log("⚠️ No frequent nouns found.");
        return {};
    }

    const wordsToTranslate = frequentNouns.map(item => item.word);
    const translations = await translateWords(wordsToTranslate);

    const result = frequentNouns.reduce((acc, item) => {
        acc[item.word] = {
            count: item.count,
            translated: translations[item.word] || "번역 없음",
        };
        return acc;
    }, {});

    console.log("🎯 Final Result:", result);
}