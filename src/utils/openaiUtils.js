import OpenAI from "openai";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function fetchAvailableModels() {
    try {
        const models = await openai.models.list();
        return models.data.map((model) => model.id);
    } catch (error) {
        logger.error("❌ Failed to fetch OpenAI models:", error);
        return [];
    }
}

export async function fetchFiles() {
    try {
        const list = await openai.files.list();

        if (!list.data || list.data.length === 0) {
            logger.info("⚠️ No files found.");
            return;
        }

        logger.info("✅ Fetched OpenAI files:");
        for (const file of list.data) {
            logger.info(`📄 File ID: ${file.id} | Name: ${file.filename} | Purpose: ${file.purpose} | Status: ${file.status}`);
        }
    } catch (error) {
        logger.error("❌ Error fetching files:", error);
    }
}

export async function deleteFile(fileId) {
    if (!fileId) {
        logger.error("❌ Please provide a file ID to delete. Usage: node test.js <file_id>");
        process.exit(1);
    }

    try {
        const response = await openai.files.del(fileId);
        logger.info("✅ File deleted successfully:", response);
    } catch (error) {
        logger.error("❌ Failed to delete file:", error);
    }
}

