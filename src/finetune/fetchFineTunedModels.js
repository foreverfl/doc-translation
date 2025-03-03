import dotenv from "dotenv";
import OpenAI from "openai";
import logger from "../utils/logger.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function fetchFineTunedModels() {
    try {
        const list = await openai.fineTuning.jobs.list();

        if (!list.data || list.data.length === 0) {
            logger.info("⚠️ No fine-tuned models found.");
            return;
        }

        logger.info("✅ Fetched fine-tuned models:");
        for (const fineTune of list.data) {
            logger.info(`🆔 ID: ${fineTune.id} | Status: ${fineTune.status} | Created: ${new Date(fineTune.created_at * 1000).toISOString()}`);
        }
    } catch (error) {
        logger.error("❌ Error fetching fine-tuned models:", error);
    }
}

fetchFineTunedModels();
