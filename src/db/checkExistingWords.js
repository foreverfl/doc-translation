import { queryDB } from "@db/connect.js";
import logger from "@utils/logger.js";

export async function checkExistingWords(words) {
    if (!words.length) return [];

    const placeholders = words.map((_, i) => `$${i + 1}`).join(", ");
    const query = `SELECT english FROM translation_terms WHERE english IN (${placeholders})`;

    try {
        const result = await queryDB(query, words);
        const existingWords = new Set(result.map(row => row.english));
        return words.filter(word => !existingWords.has(word));
    } catch (error) {
        logger.error("🚨 Error checking existing words:", error);
        return words;
    }
}
