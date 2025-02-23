import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
    user: "user",
    password: "password",
    host: "localhost",
    port: 5432,
    database: "translation_db",
    max: 10, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000,
});

let isPoolClosed = false; 

export async function connectDB() {
    if (isPoolClosed) {
        console.warn("⚠️ Connection pool is closed. Reinitializing...");
        return;
    }

    try {
        const client = await pool.connect();
        console.log("✅ Connected to PostgreSQL");
        client.release(); 
    } catch (error) {
        console.error("🚨 Error connecting to PostgreSQL:", error);
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
        console.error("🚨 Query Error:", error);
        throw error;
    } 
}

export async function closeDB() {
    if (!isPoolClosed) {
        await pool.end();
        isPoolClosed = true;
        console.log("🔌 PostgreSQL connection pool closed.");
    } else {
        console.log("⚠️ Connection pool already closed.");
    }
}
