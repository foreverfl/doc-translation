import logger from "@utils/logger.js";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function rollbackFineTunedModel() {
    try {
        const list = await openai.fineTuning.jobs.list();

        if (!list.data || list.data.length === 0) {
            logger.info("⚠️ No fine-tuned models found.");
            return;
        }

        logger.info("✅ Checking fine-tuned models...");
        let previousSucceededModel = null;

        for (const fineTune of list.data) {
            logger.info(`🆔 ID: ${fineTune.id} | Status: ${fineTune.status} | Created: ${new Date(fineTune.created_at * 1000).toISOString()}`);

            if (fineTune.status === "succeeded") {
                previousSucceededModel = fineTune.id;
                break;
            }
        }

        if (!previousSucceededModel) {
            logger.info("❌ No successful fine-tuned models available for rollback.");
            return;
        }

        logger.info(`🔄 Rolling back to previous successful model: ${previousSucceededModel}`);

        // .env 파일을 업데이트 (기존 MODEL_ID 변경)
        const envPath = ".env";
        let envContent = fs.readFileSync(envPath, "utf-8");

        // 기존 MODEL_ID 값을 새로운 모델 ID로 변경
        envContent = envContent.replace(/MODEL_ID=.*/g, `MODEL_ID=${previousSucceededModel}`);
        fs.writeFileSync(envPath, envContent);

        logger.info(`✅ Successfully rolled back to model: ${previousSucceededModel}`);

    } catch (error) {
        logger.error("❌ Error during rollback:", error);
    }
}

rollbackFineTunedModel();