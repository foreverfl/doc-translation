import { pool, queryDB } from "./connect.js";

export async function inputWordsWithoutTraining(wordsObject, tableName = "translation_terms") {
    if (!wordsObject.english || wordsObject.english.length === 0) return;

    const insertQuery = `
        INSERT INTO ${tableName} (english, korean, japanese, is_trained)
        VALUES ${wordsObject.english.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}
        ON CONFLICT (english) DO UPDATE SET 
            korean = CASE WHEN EXCLUDED.korean <> translation_terms.korean THEN EXCLUDED.korean ELSE translation_terms.korean END,
            japanese = CASE WHEN EXCLUDED.japanese <> translation_terms.japanese THEN EXCLUDED.japanese ELSE translation_terms.japanese END,
            is_trained = FALSE,
            updated_at = NOW();
    `;

    const values = wordsObject.english.flatMap((word, i) => [
        word, wordsObject.korean[i], wordsObject.japanese[i], false
    ]);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await queryDB(insertQuery, values);
        await client.query("COMMIT");
        console.log("📝 Stored words:", wordsObject.english.map((word, i) => ({
            english: word,
            korean: wordsObject.korean[i],
            japanese: wordsObject.japanese[i]
        })));
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("🚨 Error inserting words into DB:", error);
    }
}

export async function inputWordsWithTraining(words, tableName = "translation_terms") {
    if (!words.english || words.english.length === 0) return;
    if (!words.korean || !words.japanese || words.korean.length !== words.english.length || words.japanese.length !== words.english.length) {
        console.error("🚨 Invalid translation data. English, Korean, and Japanese arrays must have the same length.");
        return;
    }

    const insertQuery = `
        INSERT INTO ${tableName} (english, korean, japanese, is_trained)
        VALUES ${words.english.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(", ")}
        ON CONFLICT (english) DO UPDATE SET 
            korean = EXCLUDED.korean, 
            japanese = EXCLUDED.japanese, 
            is_trained = TRUE,
            updated_at = NOW();
    `;

    const values = words.english.flatMap((word, i) => [
        word, words.korean[i], words.japanese[i], true
    ]);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await queryDB(insertQuery, values);
        await client.query("COMMIT");
        console.log(`✅ ${words.english.length} translated words added/updated in "${tableName}".`);
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("🚨 Error inserting translated words into DB:", error);
    }
}