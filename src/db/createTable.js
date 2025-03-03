import { queryDB } from "./connect.js";
import logger from "../utils/logger.js";

export async function createTable(tableName) {
    if (!tableName) {
        logger.error("🚨 Table name is required!");
        return;
    }

    const query = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id SERIAL PRIMARY KEY,
            english TEXT NOT NULL UNIQUE,
            korean TEXT NOT NULL,
            japanese TEXT NOT NULL,
            is_trained BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `;

    try {
        await queryDB(query);
        logger.info(`✅ Table "${tableName}" created successfully.`);
    } catch (error) {
        logger.error(`🚨 Error creating table "${tableName}":`, error);
    }
}