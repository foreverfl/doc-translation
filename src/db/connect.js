import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    user: "user",
    password: "password",
    host: "localhost",
    port: 5432,
    database: "translation_db",
    max: 10, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 2000,
});

export async function connectDB() {
    try {
        const client = await pool.connect();
        console.log("✅ Connected to PostgreSQL");
        client.release(); 
    } catch (error) {
        console.error("🚨 Error connecting to PostgreSQL:", error);
    }
}

export async function queryDB(query, params = []) {
    try {
        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error("🚨 Query Error:", error);
        throw error;
    } 
}

export async function closeDB() {
    await pool.end();
    console.log("🔌 PostgreSQL connection pool closed.");
}

export default pool;
