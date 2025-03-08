import { queryDB } from "@db/connect.js";
import logger from "@utils/logger.js";

export async function getUntrainedWordsForFineTuning(limit = 100) {
    const query = `SELECT english, korean, japanese FROM translation_terms WHERE is_trained = FALSE LIMIT $1`;
    try {
        const result = await queryDB(query, [limit]);
        return {
            english: result.map(row => row.english),
            korean: result.map(row => row.korean),
            japanese: result.map(row => row.japanese)
        };
    } catch (error) {
        logger.error("🚨 Error fetching untrained words for fine-tuning:", error);
        return { english: [], korean: [], japanese: [] };
    }
}