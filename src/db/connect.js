import pkg from "pg";
import logger from "../utils/logger.js";
const { Pool } = pkg;

export const pool = new Pool({
    user: "user",
    password: "password",
    host: "localhost",
    port: 5432,
    database: "translation_db",
    max: 30,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
});

let isPoolClosed = false;

export async function connectDB() {
    if (isPoolClosed) {
        logger.warn("⚠️ Connection pool is closed. Reinitializing...");
        return;
    }

    try {
        const client = await pool.connect();
        logger.info("✅ Connected to PostgreSQL");
        client.release();
    } catch (error) {
        logger.error("🚨 Error connecting to PostgreSQL:", error);
    }
}

export async function queryDB(query, params = []) {
    if (isPoolClosed) {
        throw new Error("❌ Cannot execute query: Connection pool is closed.");
    }

    try {
        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        logger.error("🚨 Query Error:", error);
        throw error;
    }
}

export async function closeDB() {
    if (!isPoolClosed) {
        await pool.end();
        isPoolClosed = true;
        logger.info("🔌 PostgreSQL connection pool closed.");
    } else {
        logger.info("⚠️ Connection pool already closed.");
    }
}
